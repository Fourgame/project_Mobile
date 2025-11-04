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
} from "firebase/firestore";

const STATUS_COLOR = {
  pending: "#F5A623",
  paid: "#2EC27E",
  canceled: "#FF4C4C",
};

const STATUS_LABEL = {
  pending: "รอดำเนินการชำระเงิน",
  paid: "ชำระเงินแล้ว",
  canceled: "ยกเลิก",
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
    const label = STATUS_LABEL[status] || "รอดำเนินการชำระเงิน";
    const color = STATUS_COLOR[status] || STATUS_COLOR.pending;
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
        <Text style={styles.title}>คำสั่งซื้อของฉัน</Text>
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#0C7FDA" />
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={42} color="#748AAD" />
            <Text style={styles.emptyText}>ยังไม่มีคำสั่งซื้อ</Text>
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
                style={styles.orderCard}
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
                        {item.name || "สินค้า"}
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
                  <Text style={styles.totalLabel}>ยอดรวม</Text>
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
    backgroundColor: "#fff",
  },
  content: {
    padding: 20,
    gap: 16,
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
    backgroundColor: "rgba(95, 115, 138, 0.85)",
    borderRadius: 16,
    padding: 16,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  orderHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  orderId: {
    color: "#fff",
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
    color: "#9FB2D3",
    fontSize: 14,
  },
  totalValue: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
