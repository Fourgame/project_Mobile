const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const Stripe = require("stripe");
const admin = require("firebase-admin");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({
  path: path.resolve(__dirname, "../private/.env"),
});

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

if (!STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable");
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2024-04-10",
});
const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));

app.post(
  "/webhook",
  bodyParser.raw({ type: "application/json" }),
  async (req, res) => {
    if (!STRIPE_WEBHOOK_SECRET) {
      return res.status(500).send("Webhook secret not configured");
    }

    const signature = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        STRIPE_WEBHOOK_SECRET
      );
    } catch (error) {
      console.error("Webhook signature verification failed:", error.message);
      return res.status(400).send(`Webhook Error: ${error.message}`);
    }

    try {
      switch (event.type) {
        case "payment_intent.succeeded":
          await handlePaymentSucceeded(event.data.object);
          break;
        case "payment_intent.payment_failed":
          await handlePaymentFailed(event.data.object);
          break;
        default:
          break;
      }
    } catch (error) {
      console.error("Webhook handling error:", error);
      return res.status(500).send("Webhook handler failed");
    }

    res.json({ received: true });
  }
);

app.use(bodyParser.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/create-payment-intent", async (req, res) => {
  try {
    const { userId, orderId } = req.body || {};
    if (!userId || !orderId) {
      return res.status(400).json({ error: "userId and orderId are required" });
    }

    const userDocRef = db.doc(`users/${userId}`);
    const userSnap = await userDocRef.get();
    if (!userSnap.exists) {
      return res.status(404).json({ error: "User not found" });
    }
    const userData = userSnap.data();
    const userEmail = userData?.email;
    if (!userEmail) {
      return res.status(400).json({
        error: "No email found in profile. Please add an email before making a payment.",
      });
    }

    const orderRef = db.doc(`users/${userId}/orders/${orderId}`);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) {
      return res.status(404).json({ error: "Order not found" });
    }

    const orderData = orderSnap.data();
    const totalPrice = Number(orderData.totalPrice) || 0;
    const amount = Math.round(totalPrice * 100);

    if (amount <= 0) {
      return res
        .status(400)
        .json({ error: "Order amount must be greater than zero" });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "thb",
      payment_method_types: ["promptpay"],
      payment_method_data: {
        type: "promptpay",
        billing_details: {
          email: userEmail,
        },
      },
      confirm: true,
      metadata: {
        userId,
        orderId,
      },
    });

    const qrCode =
      paymentIntent.next_action?.promptpay_display_qr_code || null;
    const qrImageUrl =
      qrCode?.image_url_png ||
      qrCode?.image_url_svg ||
      qrCode?.downloadable?.url ||
      null;

    await orderRef.update({
      status: "pending",
      paymentIntentId: paymentIntent.id,
      paymentClientSecret: paymentIntent.client_secret,
      paymentQr: qrCode
        ? {
            data: qrCode.data || null,
            imageUrl: qrImageUrl || null,
            imageType: qrCode.image_type || (qrImageUrl ? "url" : "png"),
            expiresAt: qrCode.expires_at || null,
          }
        : null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      amount,
      currency: paymentIntent.currency,
      qrCode: qrCode
        ? {
            data: qrCode.data,
            imageType: qrCode.image_type,
            expiresAt: qrCode.expires_at,
          }
        : null,
    });
  } catch (error) {
    console.error("create-payment-intent error:", error);
    res.status(500).json({
      error:
        error?.message || "Unable to create payment intent. Please try again.",
    });
  }
});

const handlePaymentSucceeded = async (paymentIntent) => {
  const { userId, orderId } = paymentIntent.metadata || {};
  if (!userId || !orderId) {
    console.warn("Missing metadata on payment intent");
    return;
  }

  const orderRef = db.doc(`users/${userId}/orders/${orderId}`);
  await db.runTransaction(async (transaction) => {
    const orderSnap = await transaction.get(orderRef);
    if (!orderSnap.exists) {
      console.warn("Order not found for payment success update");
      return;
    }

    const orderData = orderSnap.data();
    if (orderData.status === "paid") {
      return;
    }

    const items = Array.isArray(orderData.items) ? orderData.items : [];
    for (const item of items) {
      const ownerId = item?.ownerId;
      const category = item?.category;
      const productId = item?.productId;
      const quantity = Number(item?.quantity) || 0;
      if (!ownerId || !category || !productId || quantity <= 0) {
        continue;
      }

      const productRef = db.doc(`users/${ownerId}/${category}/${productId}`);
      const productSnap = await transaction.get(productRef);
      if (!productSnap.exists) continue;

      const currentQty = Number(productSnap.data().quantity) || 0;
      const newQty = Math.max(0, currentQty - quantity);
      transaction.update(productRef, { quantity: newQty });
    }

    transaction.update(orderRef, {
      status: "paid",
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      paymentIntentId: paymentIntent.id,
      paymentMethod: paymentIntent.payment_method_types?.[0] || "promptpay",
      amountReceived: (paymentIntent.amount_received || 0) / 100,
      currency: paymentIntent.currency,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
};

const handlePaymentFailed = async (paymentIntent) => {
  const { userId, orderId } = paymentIntent.metadata || {};
  if (!userId || !orderId) {
    console.warn("Missing metadata on payment intent");
    return;
  }

  const orderRef = db.doc(`users/${userId}/orders/${orderId}`);
  await orderRef.update({
    status: "failed",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
};

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Stripe server listening on port ${PORT}`);
});
