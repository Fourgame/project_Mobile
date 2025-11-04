import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StatusBar,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Swipeable } from "react-native-gesture-handler";
import { useCart } from "../context/CartContext";

export default function CartScreen() {
  const { cartItems, removeFromCart } = useCart();
  const [selected, setSelected] = useState({});

  useEffect(() => {
    setSelected((prev) => {
      const next = {};
      cartItems.forEach((item) => {
        next[item.cartId] = prev[item.cartId] ?? false;
      });
      return next;
    });
  }, [cartItems]);

  const toggleSelect = (cartId) => {
    setSelected((prev) => ({
      ...prev,
      [cartId]: !prev[cartId],
    }));
  };

  const handleDelete = (cartId) => {
    removeFromCart(cartId);
    setSelected((prev) => {
      const next = { ...prev };
      delete next[cartId];
      return next;
    });
  };

  const { totalPrice, selectedCount } = useMemo(() => {
    let count = 0;
    let total = 0;
    cartItems.forEach((item) => {
      if (selected[item.cartId]) {
        count += 1;
        const numericPrice = Number(item.price);
        total += Number.isFinite(numericPrice) ? numericPrice : 0;
      }
    });
    return { totalPrice: total, selectedCount: count };
  }, [cartItems, selected]);

  const formattedTotal = useMemo(
    () =>
      totalPrice.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [totalPrice]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#f5f7fa" barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.content}>
        {cartItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Your cart is empty</Text>
          </View>
        ) : (
          <View style={styles.listCard}>
            {cartItems.map((item) => (
              <Swipeable
                key={item.cartId}
                renderRightActions={() => (
                  <TouchableOpacity
                    style={styles.deleteAction}
                    onPress={() => handleDelete(item.cartId)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="trash" size={18} color="#fff" />
                  </TouchableOpacity>
                )}
              >
                <View style={styles.itemRow}>
                  <TouchableOpacity
                    style={[
                      styles.checkbox,
                      selected[item.cartId] && styles.checkboxSelected,
                    ]}
                    onPress={() => toggleSelect(item.cartId)}
                    activeOpacity={0.8}
                  >
                    {selected[item.cartId] && (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    )}
                  </TouchableOpacity>

                  {item.picture ? (
                    <Image source={{ uri: item.picture }} style={styles.itemImage} />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Ionicons name="image-outline" size={22} color="#0C7FDA" />
                    </View>
                  )}

                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {item.name || "Unnamed item"}
                    </Text>
                    <Text style={styles.itemDetail} numberOfLines={2}>
                      {item.detail || ""}
                    </Text>
                  </View>

                  <Text style={styles.rowPrice}>
                    ฿{" "}
                    {Number(item.price || 0).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                </View>
              </Swipeable>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.tryButton} activeOpacity={0.9}>
          <Ionicons name="sparkles-outline" size={18} color="#fff" />
          <Text style={styles.tryButtonText}>Try-On</Text>
        </TouchableOpacity>

        <View style={styles.footerDivider} />

        <Text style={styles.totalText}>฿ {formattedTotal}</Text>

        <TouchableOpacity style={styles.paymentButton} activeOpacity={0.9}>
          <Text style={styles.paymentText}>Payment ({selectedCount})</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },
  content: {
    padding: 16,
    paddingBottom: 120,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 80,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
  },
  listCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#e0e5ea",
    gap: 12,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#c9d5e2",
    backgroundColor: "#fff",
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#0C7FDA",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    backgroundColor: "#0C7FDA",
  },
  itemImage: {
    width: 70,
    height: 70,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#0C7FDA",
    resizeMode: "cover",
  },
  imagePlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#0C7FDA",
    backgroundColor: "#eef4fb",
    alignItems: "center",
    justifyContent: "center",
  },
  itemInfo: {
    flex: 1,
    gap: 4,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#222",
  },
  itemDetail: {
    fontSize: 13,
    color: "#666",
  },
  rowPrice: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0C7FDA",
    minWidth: 70,
    textAlign: "right",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderColor: "#d9dee4",
    backgroundColor: "#f5f7fa",
  },
  tryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0C7FDA",
    borderRadius: 10,
    paddingHorizontal: 16,
    height: 44,
  },
  tryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  footerDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#111",
  },
  totalText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0C7FDA",
    minWidth: 70,
    textAlign: "center",
  },
  paymentButton: {
    flex: 1,
    backgroundColor: "#0C7FDA",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    height: 44,
  },
  paymentText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  deleteAction: {
    width: 70,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#d32f2f",
    borderRadius: 12,
    marginVertical: 4,
  },
});
