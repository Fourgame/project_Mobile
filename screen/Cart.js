import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StatusBar,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Swipeable } from "react-native-gesture-handler";
import { useCart } from "../context/CartContext";

export default function CartScreen({ navigation }) {
  const { cartItems, removeFromCart, updateCartQuantity } = useCart();
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

  const getStockForItem = useCallback((item) => {
    const numeric = Number(item.quantity);
    if (Number.isFinite(numeric) && numeric >= 0) {
      return numeric;
    }
    return null;
  }, []);

  useEffect(() => {
    cartItems.forEach((item) => {
      const stock = getStockForItem(item);
      const current = Number.isFinite(item.cartQuantity)
        ? item.cartQuantity
        : 1;
      if (stock === 0 && current !== 0) {
        updateCartQuantity(item.cartId, 0);
      } else if (stock !== null && stock > 0 && current > stock) {
        updateCartQuantity(item.cartId, stock);
      } else if (stock !== 0 && current < 1) {
        updateCartQuantity(item.cartId, 1);
      }
    });
  }, [cartItems, getStockForItem, updateCartQuantity]);

  const increaseQuantity = (item) => {
    const stock = getStockForItem(item);
    if (stock === 0) return;
    const current = Number.isFinite(item.cartQuantity)
      ? item.cartQuantity
      : 1;
    const next = current + 1;
    if (stock !== null && next > stock) return;
    updateCartQuantity(item.cartId, next);
  };

  const decreaseQuantity = (item) => {
    const stock = getStockForItem(item);
    const current = Number.isFinite(item.cartQuantity)
      ? item.cartQuantity
      : stock === 0
      ? 0
      : 1;
    if (current <= 1 && stock !== 0) return;
    const next = Math.max(stock === 0 ? 0 : 1, current - 1);
    updateCartQuantity(item.cartId, next);
  };

  const { totalPrice, selectedCount } = useMemo(() => {
    let count = 0;
    let total = 0;
    cartItems.forEach((item) => {
      if (selected[item.cartId]) {
        const quantity = Number.isFinite(item.cartQuantity)
          ? item.cartQuantity
          : 1;
        if (!(quantity > 0)) {
          return;
        }
        count += 1;
        const numericPrice = Number(item.price);
        total += Number.isFinite(numericPrice)
          ? numericPrice * quantity
          : 0;
      }
    });
    return { totalPrice: total, selectedCount: count };
  }, [cartItems, selected]);

  const selectedItems = useMemo(
    () =>
      cartItems.filter((item) => {
        if (!selected[item.cartId]) return false;
        if (Number.isFinite(item.cartQuantity)) {
          return item.cartQuantity > 0;
        }
        return true;
      }),
    [cartItems, selected]
  );

  const paymentDisabled = selectedItems.length === 0;

  const handlePayment = () => {
    if (paymentDisabled) {
      Alert.alert("ยังไม่ได้เลือกสินค้า", "กรุณาเลือกสินค้าที่ต้องการชำระ");
      return;
    }

    const payloadItems = selectedItems
      .map((product) => {
        const numericQuantity = Number(product.cartQuantity);
        const quantity = Number.isFinite(numericQuantity)
          ? Math.max(1, Math.floor(numericQuantity))
          : 1;
        if (quantity <= 0) {
          return null;
        }
        return {
          item: product,
          quantity,
        };
      })
      .filter(Boolean);

    if (payloadItems.length === 0) {
      Alert.alert("จำนวนสินค้าไม่ถูกต้อง", "กรุณาตรวจสอบจำนวนสินค้าก่อนชำระ");
      return;
    }

    const parentNav = navigation?.getParent?.();
    if (parentNav) {
      parentNav.navigate("OrderSummary", { items: payloadItems });
    } else if (navigation?.navigate) {
      navigation.navigate("OrderSummary", { items: payloadItems });
    }
  };

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
            {cartItems.map((item) => {
              const stock = getStockForItem(item);
              const remainingText =
                stock === null ? "คงเหลือ - ชิ้น" : `คงเหลือ ${stock} ชิ้น`;
              const quantity =
                Number.isFinite(item.cartQuantity) && item.cartQuantity >= 0
                  ? item.cartQuantity
                  : stock === 0
                  ? 0
                  : 1;
              const decreaseDisabled =
                (stock === 0 && quantity <= 0) ||
                (stock !== 0 && quantity <= 1);
              const increaseDisabled =
                stock === 0 ||
                (stock !== null && quantity >= stock);

              return (
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

                    <View style={styles.itemActions}>
                      <Text style={styles.rowPrice}>
                        ฿{" "}
                        {Number(item.price || 0).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </Text>
                      <Text style={styles.stockText}>{remainingText}</Text>
                      <View style={styles.quantityRow}>
                        <TouchableOpacity
                          style={[
                            styles.quantityButton,
                            decreaseDisabled && styles.quantityButtonDisabled,
                          ]}
                          onPress={() => decreaseQuantity(item)}
                          disabled={decreaseDisabled}
                        >
                          <Ionicons name="remove" size={16} color="#000" />
                        </TouchableOpacity>
                        <Text style={styles.quantityValue}>{quantity}</Text>
                        <TouchableOpacity
                          style={[
                            styles.quantityButton,
                            increaseDisabled && styles.quantityButtonDisabled,
                          ]}
                          onPress={() => increaseQuantity(item)}
                          disabled={increaseDisabled}
                        >
                          <Ionicons name="add" size={16} color="#000" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </Swipeable>
              );
            })}
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

        <TouchableOpacity
          style={[
            styles.paymentButton,
            paymentDisabled && styles.paymentButtonDisabled,
          ]}
          activeOpacity={0.9}
          onPress={handlePayment}
          disabled={paymentDisabled}
        >
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
  itemActions: {
    alignItems: "flex-end",
    justifyContent: "center",
    minWidth: 120,
    gap: 6,
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
  stockText: {
    fontSize: 12,
    color: "#666",
  },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#c9d5e2",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  quantityButtonDisabled: {
    opacity: 0.4,
  },
  quantityValue: {
    minWidth: 28,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "600",
    color: "#222",
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
  paymentButtonDisabled: {
    opacity: 0.5,
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
