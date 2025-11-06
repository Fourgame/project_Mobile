import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../firebase/firebaseConfig";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

const STATUS_COLOR = {
  pending: "#F5A623",
  paid: "#2EC27E",
  canceled: "#FF4C4C",
  failed: "#FF4C4C",
  default: "#3E4A5A",
};

const STATUS_LABEL = {
  pending: "Awaiting payment",
  paid: "Paid",
  canceled: "Cancelled",
  failed: "Payment failed",
};

const ORDER_EXPIRY_MS = 30 * 60 * 1000;

const getTimestampMillis = (value) => {
  if (!value) return null;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  if (typeof value === "number") return value;
  return null;
};

const maybeExpireOrderDoc = async (docSnap, data, now = Date.now()) => {
  const createdMillis = getTimestampMillis(data?.createdAt);
  if (
    data?.status === "pending" &&
    createdMillis &&
    now - createdMillis >= ORDER_EXPIRY_MS
  ) {
    try {
      await updateDoc(docSnap.ref, {
        status: "failed",
        expiredAt: serverTimestamp(),
      });
    } catch (error) {
      console.log("Expire order error:", error);
    }
  }
};

export default function ListScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = useCallback(() => {
    const user = auth.currentUser;
    if (!user) {
      navigation.replace("Login");
      return () => {};
    }
    const ordersRef = collection(db, "users", user.uid, "orders");
    const ordersQuery = query(ordersRef, orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const now = Date.now();
        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data();
          maybeExpireOrderDoc(docSnap, data, now);
        });

        const parsed = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          const createdAt =
            data.createdAt?.toDate?.() ?? new Date(data.createdAt ?? Date.now());
          return {
            id: docSnap.id,
            ...data,
            createdAt,
          };
        });
        setOrders(parsed);
        setLoading(false);
        setRefreshing(false);
      },
      (error) => {
        console.log("Orders fetch error:", error);
        setLoading(false);
        setRefreshing(false);
      }
    );
    return unsubscribe;
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      const unsubscribe = loadOrders();
      return () => {
        unsubscribe && unsubscribe();
      };
    }, [loadOrders])
  );

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  const renderStatus = (status = "pending") => {
    const label = STATUS_LABEL[status] || "Awaiting payment";
    const color =
      STATUS_COLOR[status] ||
      (status === "pending"
        ? STATUS_COLOR.pending
        : STATUS_COLOR.default);
    return (
      <View style={[styles.statusBadge, { backgroundColor: color }]}>
        <Text style={styles.statusText}>{label}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.title}>My Orders</Text>
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#0C7FDA" />
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={42} color="#748AAD" />
            <Text style={styles.emptyText}>No orders yet</Text>
          </View>
        ) : (
          orders.map((order) => {
            const createdAt = order.createdAt
              ? new Date(order.createdAt)
              : new Date();
            const dateString = createdAt.toLocaleString("th-TH", {
              dateStyle: "medium",
              timeStyle: "short",
            });
            const total = Number(order.totalPrice) || 0;
            return (
              <TouchableOpacity
                key={order.id}
                style={[
                  styles.orderCard,
                  order.status === "paid" && styles.orderCardPaid,
                  order.status === "failed" && styles.orderCardFailed,
                ]}
                activeOpacity={0.85}
                onPress={() =>
                  navigation.navigate("Payment", {
                    orderId: order.id,
                    totalPrice: total,
                  })
                }
              >
                <View style={styles.orderHeader}>
                  <Text style={styles.orderId}>Order #{order.id}</Text>
                  {renderStatus(order.status)}
                </View>
                <Text style={styles.orderDate}>{dateString}</Text>
                <View style={styles.itemsContainer}>
                  {(order.items || []).map((item, idx) => (
                    <View key={`${order.id}_item_${idx}`} style={styles.itemRow}>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {item.name || "Unnamed item"}
                      </Text>
                      <Text style={styles.itemQty}>
                        x {item.quantity} · ฿{" "}
                        {Number(item.price || 0).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </Text>
                    </View>
                  ))}
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>
                    ฿{" "}
                    {total.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#000000ff",
  },
  loader: {
    marginTop: 40,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    color: "#9FB2D3",
    fontSize: 16,
  },
  orderCard: {
    backgroundColor: "rgba(28, 44, 64, 0.95)",
    borderRadius: 18,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  orderCardPaid: {
    borderColor: "rgba(46, 194, 126, 0.4)",
    backgroundColor: "rgba(17, 41, 34, 0.9)",
  },
  orderCardFailed: {
    borderColor: "rgba(255, 80, 80, 0.35)",
    backgroundColor: "rgba(52, 22, 24, 0.9)",
  },
  orderHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  orderId: {
    color: "#F8FAFF",
    fontSize: 16,
    fontWeight: "600",
  },
  orderDate: {
    color: "#9FB2D3",
    fontSize: 13,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  itemsContainer: {
    gap: 6,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  itemName: {
    flex: 1,
    color: "#E6EEFF",
    fontSize: 14,
    fontWeight: "500",
    marginRight: 8,
  },
  itemQty: {
    color: "#B8C9E6",
    fontSize: 13,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.15)",
    paddingTop: 10,
  },
  totalLabel: {
    color: "#AABAD4",
    fontSize: 14,
  },
  totalValue: {
    color: "#F1F4FA",
    fontSize: 16,
    fontWeight: "700",
  },
});
