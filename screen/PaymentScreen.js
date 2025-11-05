import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import QRCode from "react-native-qrcode-svg";
import promptpay from "promptpay-qr";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { auth, db } from "../firebase/firebaseConfig";
import {
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

const PROMPTPAY_ID = "0935493541";

export default function PaymentScreen({ navigation, route }) {
  const orderId = route.params?.orderId;
  const initialTotal = Number(route.params?.totalPrice) || 0;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const user = auth.currentUser;
      if (!user) {
        navigation.replace("Login");
        return () => {};
      }
      if (!orderId) {
        navigation.goBack();
        return () => {};
      }
      const orderRef = doc(db, "users", user.uid, "orders", orderId);
      const unsubscribe = onSnapshot(
        orderRef,
        (snapshot) => {
          if (!snapshot.exists()) {
            setOrder(null);
          } else {
            setOrder({ id: snapshot.id, ...snapshot.data() });
          }
          setLoading(false);
        },
        (error) => {
          console.log("Payment order fetch error:", error);
          setOrder(null);
          setLoading(false);
        }
      );
      return () => unsubscribe();
    }, [navigation, orderId])
  );

  const totalPrice = Number(order?.totalPrice ?? initialTotal) || 0;
  const formattedTotal = `฿ ${totalPrice.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const qrPayload = useMemo(() => {
    const amount = Number(totalPrice.toFixed(2));
    if (!amount || amount <= 0) {
      return promptpay(PROMPTPAY_ID);
    }
    return promptpay(PROMPTPAY_ID, { amount });
  }, [totalPrice]);

  const handleBack = () => {
    navigation.navigate("MainDrawer", { screen: "List" });
  };

  const handleConfirmPayment = async () => {
    if (!order || updating) return;
    const user = auth.currentUser;
    if (!user) {
      navigation.replace("Login");
      return;
    }
    try {
      setUpdating(true);
      const items = order.items || [];
      for (const item of items) {
        const ownerId = item?.ownerId;
        const category = item?.category;
        const productId = item?.productId;
        const quantity = Number(item?.quantity) || 0;
        if (!ownerId || !category || !productId || quantity <= 0) {
          continue;
        }
        const productRef = doc(db, "users", ownerId, category, productId);
        await runTransaction(db, async (transaction) => {
          const productSnap = await transaction.get(productRef);
          if (!productSnap.exists()) {
            return;
          }
          const currentQty = Number(productSnap.data()?.quantity) || 0;
          const newQty = Math.max(0, currentQty - quantity);
          transaction.update(productRef, { quantity: newQty });
        });
      }
      const orderRef = doc(db, "users", user.uid, "orders", order.id);
      await updateDoc(orderRef, {
        status: "paid",
        paidAt: serverTimestamp(),
      });
      Alert.alert("สำเร็จ", "ยืนยันการชำระเงินเรียบร้อยแล้ว", [
        {
          text: "ตกลง",
          onPress: () => navigation.navigate("MainDrawer", { screen: "List" }),
        },
      ]);
    } catch (error) {
      console.log("Confirm payment error:", error);
      Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถยืนยันการชำระเงินได้ กรุณาลองใหม่");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar backgroundColor="#04162A" barStyle="light-content" />
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar backgroundColor="#04162A" barStyle="light-content" />
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={42} color="#9FB2D3" />
          <Text style={styles.emptyText}>ไม่พบคำสั่งซื้อ</Text>
          <TouchableOpacity style={styles.backButtonGhost} onPress={handleBack}>
            <Text style={styles.backGhostText}>กลับไปหน้ารายการ</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isPending = order.status === "pending";
  const items = Array.isArray(order.items) ? order.items : [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#04162A" barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ชำระเงิน</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>สถานะ:</Text>
            <View
              style={[
                styles.statusBadge,
                isPending ? styles.statusPending : styles.statusPaid,
              ]}
            >
              <Text style={styles.statusText}>
                {isPending ? "รอดำเนินการชำระเงิน" : "ชำระเงินแล้ว"}
              </Text>
            </View>
          </View>

          <Text style={styles.amountLabel}>ยอดชำระ</Text>
          <Text style={styles.amountValue}>{formattedTotal}</Text>

          <View style={styles.qrWrapper}>
            <QRCode value={qrPayload} size={220} backgroundColor="#0A1D33" />
          </View>
          <Text style={styles.promptpayText}>PromptPay: {PROMPTPAY_ID}</Text>
          <Text style={styles.orderId}>หมายเลขคำสั่งซื้อ: {order.id}</Text>
        </View>

        <View style={styles.itemsCard}>
          <Text style={styles.itemsTitle}>รายการสินค้า</Text>
          {items.map((item, index) => (
            <View key={`${order.id}_item_${index}`} style={styles.itemRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.name || "สินค้า"}
                </Text>
                <Text style={styles.itemMeta}>
                  จำนวน {item.quantity} ชิ้น
                </Text>
              </View>
              <Text style={styles.itemPrice}>
                ฿{" "}
                {Number(item.price || 0).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>ขั้นตอนการชำระเงิน</Text>
          <Text style={styles.instructionsText}>
            1. เปิดแอปธนาคารที่รองรับการสแกน QR Code{"\n"}
            2. สแกนคิวอาร์ข้างต้น และตรวจสอบยอดก่อนยืนยัน{"\n"}
            3. หลังชำระเงิน กดปุ่มยืนยันการชำระเงินด้านล่างเพื่ออัปเดตสถานะ
          </Text>
        </View>

        {isPending ? (
          <TouchableOpacity
            style={[
              styles.confirmButton,
              updating && { opacity: 0.7 },
            ]}
            onPress={handleConfirmPayment}
            disabled={updating}
          >
            <Text style={styles.confirmButtonText}>
              {updating ? "กำลังยืนยัน..." : "ยืนยันการชำระเงิน"}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.paidNotice}>
            <Ionicons
              name="checkmark-circle-outline"
              size={22}
              color="#2EC27E"
            />
            <Text style={styles.paidNoticeText}>
              สถานะคำสั่งซื้อได้รับการอัปเดตแล้ว
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#04162A",
  },
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: {
    color: "#9FB2D3",
    fontSize: 16,
  },
  backButtonGhost: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  backGhostText: {
    color: "#E0E8F5",
    fontSize: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 20,
  },
  card: {
    width: "100%",
    alignItems: "center",
    backgroundColor: "#0A1D33",
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 18,
    gap: 16,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  statusRow: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusLabel: {
    color: "#B2C4E4",
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusPending: {
    backgroundColor: "#F5A623",
  },
  statusPaid: {
    backgroundColor: "#2EC27E",
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  amountLabel: {
    color: "#B2C4E4",
    fontSize: 16,
  },
  amountValue: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
  },
  qrWrapper: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 20,
  },
  promptpayText: {
    color: "#B2C4E4",
    fontSize: 14,
  },
  orderId: {
    color: "#6AC4F8",
    fontSize: 13,
    fontWeight: "600",
  },
  itemsCard: {
    width: "100%",
    backgroundColor: "#0C223B",
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  itemsTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemName: {
    color: "#E6EEFF",
    fontSize: 14,
    fontWeight: "500",
  },
  itemMeta: {
    color: "#9FB2D3",
    fontSize: 12,
  },
  itemPrice: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  instructions: {
    width: "100%",
    backgroundColor: "#0C223B",
    borderRadius: 20,
    padding: 20,
    gap: 10,
  },
  instructionsTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  instructionsText: {
    color: "#D4E1F5",
    fontSize: 14,
    lineHeight: 22,
  },
  confirmButton: {
    width: "100%",
    backgroundColor: "#F64F4F",
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: "center",
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  paidNotice: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
  },
  paidNoticeText: {
    color: "#9BE3C1",
    fontSize: 14,
    fontWeight: "600",
  },
});
