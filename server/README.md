### Stripe PromptPay server

This Express service connects Stripe with your Firestore database so orders can be paid via PromptPay QR codes.

#### Prerequisites

1. Node.js 18+
2. Stripe credentials (live or test):
   - `STRIPE_SECRET_KEY` (starts with `sk_`)
   - `STRIPE_WEBHOOK_SECRET` (starts with `whsec_`; generated when you create a webhook endpoint in the Stripe Dashboard)
3. Firebase service account credentials with access to the same project used by the app. Export the path via `GOOGLE_APPLICATION_CREDENTIALS` or update the initialization as needed.

#### Environment variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cd server
cp .env.example .env
```

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
PORT=4000
```

Make sure you also export your Firebase credentials, for example:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/serviceAccount.json
```

#### Install & run

```bash
cd server
npm install
npm run start   # or `npm run dev` with nodemon installed
```

Expose the server on the public internet (e.g. `ngrok http 4000`) so Stripe can reach `/webhooks/stripe`, then configure that URL and the corresponding signing secret inside the Stripe Dashboard.

#### Endpoints

- `POST /create-payment-intent` – creates and confirms a PromptPay PaymentIntent for a Firestore order and stores the QR code data back onto the order document.
- `POST /webhooks/stripe` – Stripe webhook endpoint. Listens for `payment_intent.succeeded` (marks the order as paid and deducts stock) and `payment_intent.payment_failed`.
- `GET /health` – simple health check.

#### Front-end configuration

Point the Expo app at your server by setting `EXPO_PUBLIC_API_URL`, for example:

```bash
EXPO_PUBLIC_API_URL=https://your-ngrok-url.ngrok.io
```

The Payment screen will show the Stripe-generated QR code and automatically update when the webhook flips the order status to `paid`.
