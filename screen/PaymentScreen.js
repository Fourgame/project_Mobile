import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  ScrollView,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { auth, db } from "../firebase/firebaseConfig";
import { doc, onSnapshot } from "firebase/firestore";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import Constants from "expo-constants";
console.log("appOwnership =", Constants.appOwnership);

export default function PaymentScreen({ navigation, route }) {
  console.log("appOwnership =", Constants.appOwnership);
  const orderId = route.params?.orderId;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingQr, setSavingQr] = useState(false);

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

  const totalPrice = Number(order?.totalPrice || 0);
  const formattedTotal = `฿ ${totalPrice.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  const qrImageData = order?.paymentQr?.data || null;
  const qrImageUrl = order?.paymentQr?.imageUrl || null;
  const qrImageUri =
    qrImageUrl ||
    (qrImageData
      ? `data:image/${order.paymentQr.imageType || "png"};base64,${order.paymentQr.data}`
      : null);
  const qrExpiresAt = order?.paymentQr?.expiresAt
    ? new Date(order.paymentQr.expiresAt * 1000)
    : null;
  const status = order?.status || "pending";
  const items = Array.isArray(order?.items) ? order.items : [];

  const handleBack = () => {
    navigation.navigate("MainDrawer", { screen: "List" });
  };

  const requestMediaPermission = async () => {
    const { status, granted } = await MediaLibrary.requestPermissionsAsync();
    if (status !== "granted" && !granted) {
      Alert.alert(
        "Permission required",
        "Please allow photo library access to save the QR code."
      );
      return false;
    }
    return true;
  };
  // หา writable directory โดยลองทั้ง Directory และ Paths (ทั้งแบบ function/obj)
  const getWritableDirectory = async () => {
  try {
    console.log("FS keys =", Object.keys(FileSystem));
    console.log("Has Directory?", !!FileSystem.Directory);
    console.log("Has Directory.documentDirectory?", !!FileSystem.Directory?.documentDirectory);
    console.log("Has Directory.cacheDirectory?", !!FileSystem.Directory?.cacheDirectory);

    if (FileSystem.Directory?.documentDirectory) {
      const d = await FileSystem.Directory.documentDirectory();
      console.log("Directory.documentDirectory() ->", d);
      if (d) return d;
    }
    if (FileSystem.Directory?.cacheDirectory) {
      const c = await FileSystem.Directory.cacheDirectory();
      console.log("Directory.cacheDirectory() ->", c);
      if (c) return c;
    }
  } catch (e) {
    console.log("Directory API error:", e);
  }

  try {
    console.log("typeof Paths =", typeof FileSystem.Paths);
    const p = typeof FileSystem.Paths === "function"
      ? await FileSystem.Paths()
      : FileSystem.Paths;
    console.log("Paths value ->", p);

    if (p?.documentDirectory) return p.documentDirectory;
    if (p?.cacheDirectory) return p.cacheDirectory;
  } catch (e) {
    console.log("Paths API error:", e);
  }

  return null;
};

const ensureSlash = (p) => (p?.endsWith("/") ? p : p + "/");

  const handleSaveQr = async () => {
  if (!qrImageUri) return;

  const { status, granted } = await MediaLibrary.requestPermissionsAsync();
  if (status !== "granted" && !granted) {
    Alert.alert("Permission required", "Please allow photo library access to save the QR code.");
    return;
  }

  setSavingQr(true);
  try {
    const dir = await getWritableDirectory();
    if (!dir) throw new Error("No writable directory available on this device.");
    const directory = ensureSlash(dir);                       // ✅ normalize
    const fileUri = `${directory}payment-qr-${Date.now()}.png`;

    if (qrImageUri.startsWith("data:")) {
      const base64 = qrImageUri.replace(/^data:image\/\w+;base64,/, "");
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } else {
      const dl = await FileSystem.downloadAsync(qrImageUri, fileUri);
      if (!dl || dl.status !== 200) throw new Error("Unable to download the QR image.");
    }

    await MediaLibrary.saveToLibraryAsync(fileUri);
    Alert.alert("Saved", "QR code saved to your photo library.");
  } catch (e) {
    console.log("SAVE ERROR:", e);
    Alert.alert("Save failed", e?.message || "Unable to save the QR code right now.");
  } finally {
    setSavingQr(false);
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
          <Text style={styles.emptyText}>Order not found</Text>
          <TouchableOpacity style={styles.backButtonGhost} onPress={handleBack}>
            <Text style={styles.backGhostText}>Back to list</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isPending = status === "pending";
  const isPaid = status === "paid";
  const isFailed = status === "failed";
  const statusLabel = isPaid
    ? "Payment completed"
    : isFailed
    ? "Payment failed"
    : "Awaiting payment";
  const statusStyle = isPaid
    ? styles.statusPaid
    : isFailed
    ? styles.statusFailed
    : styles.statusPending;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#04162A" barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Status:</Text>
            <View style={[styles.statusBadge, statusStyle]}>
              <Text style={styles.statusText}>{statusLabel}</Text>
            </View>
          </View>

          <Text style={styles.amountLabel}>Amount due</Text>
          <Text style={styles.amountValue}>{formattedTotal}</Text>

          {isPending ? (
            <>
              <View style={styles.qrWrapper}>
                {qrImageUri ? (
                  <>
                    <Image
                      source={{ uri: qrImageUri }}
                      style={styles.qrImage}
                      resizeMode="contain"
                    />
                    <TouchableOpacity
                      style={[
                        styles.saveButton,
                        savingQr && styles.saveButtonDisabled,
                      ]}
                      onPress={handleSaveQr}
                      disabled={savingQr}
                      activeOpacity={0.85}
                    >
                      {savingQr ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons
                            name="download-outline"
                            size={18}
                            color="#fff"
                          />
                          <Text style={styles.saveButtonText}>
                            Save QR code
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={styles.qrPlaceholder}>
                    <ActivityIndicator size="large" color="#0C7FDA" />
                    <Text style={styles.qrPlaceholderText}>
                      Generating QR code...
                    </Text>
                  </View>
                )}
              </View>
              {qrExpiresAt ? (
                <Text style={styles.promptpayText}>
                  QR expires at:{" "}
                  {qrExpiresAt.toLocaleString("th-TH", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </Text>
              ) : null}
            </>
          ) : (
            <View style={styles.illustrationWrapper}>
              <Ionicons
                name={isPaid ? "checkmark-circle" : "alert-circle"}
                size={120}
                color={isPaid ? "#2EC27E" : "#FF6B6B"}
              />
              <Text style={styles.illustrationText}>
                {isPaid
                  ? "Your order has been paid successfully."
                  : "We could not confirm the payment. Please try again."}
              </Text>
            </View>
          )}
          <Text style={styles.orderId}>Order number: {order.id}</Text>
        </View>

        <View style={styles.itemsCard}>
          <Text style={styles.itemsTitle}>Items</Text>
          {items.map((item, index) => (
            <View key={`${order.id}_item_${index}`} style={styles.itemRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.name || "Unnamed item"}
                </Text>
                <Text style={styles.itemMeta}>Qty {item.quantity}</Text>
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

        {isPending ? (
          <View style={styles.instructions}>
            <Text style={styles.instructionsTitle}>How to pay</Text>
            <Text style={styles.instructionsText}>
              1. Open your banking app that supports PromptPay QR codes.{"\n"}
              2. Scan the QR code above and verify the amount before confirming.{"\n"}
              3. Once the payment is completed, the status will update automatically after Stripe confirms it.
            </Text>
          </View>
        ) : (
          <View style={styles.instructions}>
            <Text style={styles.instructionsTitle}>Order status</Text>
            <Text style={styles.instructionsText}>
              {isPaid
                ? "Payment has been received. We are preparing your order."
                : "Payment has not been confirmed. If you have already been charged, please contact support."}
            </Text>
          </View>
        )}

        {isPending && (
          <View style={styles.waitingNotice}>
            <ActivityIndicator size="small" color="#F5A623" />
            <Text style={styles.waitingText}>
              Waiting for payment confirmation...
            </Text>
          </View>
        )}

        {isPaid && (
          <View style={styles.paidNotice}>
            <Ionicons
              name="checkmark-circle-outline"
              size={22}
              color="#2EC27E"
            />
            <Text style={styles.paidNoticeText}>
              Payment confirmed. Thank you!
            </Text>
          </View>
        )}

        {isFailed && (
          <View style={styles.failedNotice}>
            <Ionicons name="alert-circle" size={22} color="#FF6B6B" />
            <Text style={styles.failedNoticeText}>
              Payment failed. Please try again.
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
  illustrationWrapper: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    width: 220,
    height: 220,
    borderRadius: 20,
    backgroundColor: "rgba(46, 194, 126, 0.08)",
  },
  illustrationText: {
    color: "#E6EEFF",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
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
  statusFailed: {
    backgroundColor: "#FF6B6B",
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
    alignItems: "center",
    gap: 12,
  },
  qrImage: {
    width: 220,
    height: 220,
  },
  qrPlaceholder: {
    width: 220,
    height: 220,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  qrPlaceholderText: {
    color: "#0C7FDA",
    fontSize: 14,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0C7FDA",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
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
    padding: 10,
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
  waitingNotice: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 12,
  },
  waitingText: {
    color: "#F5A623",
    fontSize: 14,
    fontWeight: "600",
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
  failedNotice: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
  },
  failedNoticeText: {
    color: "#FF9B9B",
    fontSize: 14,
    fontWeight: "600",
  },
});
