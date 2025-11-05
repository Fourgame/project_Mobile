import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../firebase/firebaseConfig";
import { addDoc, collection, doc, getDoc, serverTimestamp } from "firebase/firestore";

const PRIMARY_BLUE = "#0C7FDA";
const BACKGROUND = "#f1f3f6";
const CARD_BG = "#ffffff";

export default function OrderSummaryScreen({ navigation, route }) {
  const singleItem = route.params?.item;
  const quantityParam = Number(route.params?.quantity);
  const itemsParam = route.params?.items;

  const normalizeQuantity = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 1;
    if (numeric <= 0) return 1;
    return Math.floor(numeric);
  };

  const orderItems = useMemo(() => {
    if (Array.isArray(itemsParam) && itemsParam.length) {
      return itemsParam
        .map((entry) => {
          const product = entry?.item ?? entry;
          if (!product) return null;
          const quantityValue = normalizeQuantity(
            entry?.quantity ?? entry?.cartQuantity
          );
          if (quantityValue <= 0) return null;
          return { item: product, quantity: quantityValue };
        })
        .filter(Boolean);
    }
    if (singleItem) {
      return [
        {
          item: singleItem,
          quantity: normalizeQuantity(quantityParam),
        },
      ];
    }
    return [];
  }, [itemsParam, singleItem, quantityParam]);

  const [address, setAddress] = useState(null);
  const [loadingAddress, setLoadingAddress] = useState(true);
  const [creatingOrder, setCreatingOrder] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      navigation.replace("Login");
      return;
    }

    let isMounted = true;
    const fetchAddress = async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (isMounted) {
          setAddress(snap.data()?.address || null);
        }
      } catch (error) {
        console.log("Order summary address error:", error);
        if (isMounted) {
          setAddress(null);
        }
      } finally {
        if (isMounted) {
          setLoadingAddress(false);
        }
      }
    };

    fetchAddress();

    return () => {
      isMounted = false;
    };
  }, [navigation]);

  const addressText = useMemo(() => {
    if (!address) {
      return "ยังไม่มีข้อมูลที่อยู่";
    }
    const detail = address.detail ? address.detail.trim() : "";
    const areaParts = [
      address.subdistrictNameTh,
      address.districtNameTh,
      address.provinceNameTh,
      address.postalCode,
    ]
      .map((part) => (part ? String(part).trim() : ""))
      .filter(Boolean);
    const lines = [];
    if (detail) lines.push(detail);
    if (areaParts.length) lines.push(areaParts.join(" "));
    return lines.join("\n");
  }, [address]);

  const totalPrice = useMemo(
    () =>
      orderItems.reduce((sum, line) => {
        const linePrice = Number(line?.item?.price) || 0;
        return sum + linePrice * line.quantity;
      }, 0),
    [orderItems]
  );

  const formattedTotal = `฿ ${totalPrice.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const paymentDisabled = orderItems.length === 0;
  const handleCreateOrder = async () => {
    if (paymentDisabled || creatingOrder) {
      return;
    }
    const user = auth.currentUser;
    if (!user) {
      navigation.replace("Login");
      return;
    }
    try {
      setCreatingOrder(true);
      const ordersRef = collection(db, "users", user.uid, "orders");
      const orderDoc = await addDoc(ordersRef, {
        status: "pending",
        totalPrice,
        createdAt: serverTimestamp(),
        items: orderItems.map((line) => ({
          name: line.item?.name ?? "",
          price: Number(line.item?.price) || 0,
          quantity: line.quantity,
          image: line.item?.picture || "",
          productId: line.item?.docId || line.item?.id || "",
          category: line.item?.category || "",
          ownerId: line.item?.ownerId || "",
        })),
      });
      navigation.replace("Payment", {
        orderId: orderDoc.id,
        totalPrice,
      });
    } catch (error) {
      console.log("Order creation error:", error);
      Alert.alert("ไม่สามารถสร้างคำสั่งซื้อ", "กรุณาลองใหม่อีกครั้ง");
    } finally {
      setCreatingOrder(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ทำการสั่งซื้อ</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Ionicons name="location-outline" size={20} color={PRIMARY_BLUE} />
            <Text style={styles.cardTitle}>ที่อยู่จัดส่ง</Text>
          </View>
          {loadingAddress ? (
            <ActivityIndicator size="small" color={PRIMARY_BLUE} />
          ) : (
            <Text style={styles.addressText}>{addressText}</Text>
          )}
        </View>

        {orderItems.length === 0 ? (
          <View style={[styles.card, styles.emptyCard]}>
            <Ionicons
              name="cart-outline"
              size={24}
              color={PRIMARY_BLUE}
              style={{ marginBottom: 6 }}
            />
            <Text style={styles.emptyCardText}>ยังไม่ได้เลือกสินค้า</Text>
          </View>
        ) : (
          orderItems.map((line, index) => {
            const product = line?.item ?? {};
            const key =
              product.docId ??
              product.id ??
              product.cartId ??
              `order-item-${index}`;
            const linePrice = Number(product?.price) || 0;
            const formattedLinePrice = `฿ ${linePrice.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`;
            return (
              <View key={key} style={styles.card}>
                <View style={styles.productRow}>
                  {product?.picture ? (
                    <Image
                      source={{ uri: product.picture }}
                      style={styles.productImage}
                    />
                  ) : (
                    <View style={styles.productPlaceholder}>
                      <Ionicons
                        name="image-outline"
                        size={28}
                        color={PRIMARY_BLUE}
                      />
                    </View>
                  )}
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>
                      {product?.name || "สินค้า"}
                    </Text>
                    <Text style={styles.productPrice}>
                      {formattedLinePrice}
                    </Text>
                  </View>
                  <Text style={styles.quantityLabel}>x {line.quantity}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <View style={styles.summaryBar}>
        <Text style={styles.summaryText}>รวมยอดสั่งซื้อ {formattedTotal}</Text>
        <TouchableOpacity
          style={[
            styles.summaryButton,
            (paymentDisabled || creatingOrder) && styles.summaryButtonDisabled,
          ]}
          onPress={handleCreateOrder}
          disabled={paymentDisabled || creatingOrder}
        >
          <Text style={styles.summaryButtonText}>
            {creatingOrder ? "Processing..." : "Buy now"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#e1e4e8",
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
    color: "#000",
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  emptyCardText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
  },
  addressText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  productImage: {
    width: 72,
    height: 72,
    borderRadius: 12,
    resizeMode: "cover",
  },
  productPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: "#E7EFFA",
    alignItems: "center",
    justifyContent: "center",
  },
  productInfo: {
    flex: 1,
    gap: 6,
  },
  productName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#222",
  },
  productPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: PRIMARY_BLUE,
  },
  quantityLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#444",
  },
  summaryBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "#dcdfe3",
  },
  summaryText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
  },
  summaryButton: {
    backgroundColor: PRIMARY_BLUE,
    borderRadius: 10,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  summaryButtonDisabled: {
    opacity: 0.5,
  },
  summaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
