import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Pressable,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useCart } from "../context/CartContext";
import { useFocusEffect } from "@react-navigation/native";
import { auth, db } from "../firebase/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

export default function ProductDetail({ navigation, route }) {
  const item = route.params?.item;
  const { addToCart } = useCart();
  const [buySheetVisible, setBuySheetVisible] = useState(false);
  const [purchaseQuantity, setPurchaseQuantity] = useState("1");
  const [isProfileComplete, setIsProfileComplete] = useState(null);

  const imageUri = item?.picture || "";
  const price = item?.price;
  const detail = item?.detail ?? "";
  const name = item?.name ?? "";
  const quantity = item?.quantity;
  const quantityDisplay =
    typeof quantity === "number" && quantity >= 0 ? quantity : "-";
  const availableQuantity =
    typeof quantity === "number" && quantity > 0 ? quantity : 0;
  const hasStock = availableQuantity > 0;
  const currentPurchaseQuantity = parseInt(purchaseQuantity, 10) || 0;
  const decreaseDisabled = currentPurchaseQuantity <= 1;
  const increaseDisabled =
    !hasStock || currentPurchaseQuantity >= availableQuantity;
  const isPurchaseQuantityValid =
    hasStock &&
    currentPurchaseQuantity > 0 &&
    (availableQuantity === 0 || currentPurchaseQuantity <= availableQuantity);
  const formattedPrice =
    price !== undefined && price !== null
      ? `฿ ${Number(price).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      : "-";
  const description =
    typeof detail === "string" && detail.trim().length > 0
      ? detail.trim()
      : "";
  const navigateToProfile = () => {
    const parentNav = navigation.getParent?.();
    if (parentNav) {
      parentNav.navigate("MainDrawer", { screen: "Profile" });
    } else {
      navigation.navigate("MainDrawer", { screen: "Profile" });
    }
  };

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const fetchProfile = async () => {
        const user = auth.currentUser;
        if (!user) {
          if (isActive) setIsProfileComplete(false);
          return;
        }
        try {
          const snap = await getDoc(doc(db, "users", user.uid));
          if (!isActive) {
            return;
          }
          const data = snap.data();
          const trimmedPhone = (data?.phone || "").replace(/\D/g, "");
          const hasPhone = trimmedPhone.length === 10;
          const address = data?.address;
          const hasAddress =
            !!address &&
            typeof address.detail === "string" &&
            address.detail.trim().length > 0 &&
            address.provinceCode !== undefined &&
            address.provinceCode !== null &&
            address.districtCode !== undefined &&
            address.districtCode !== null &&
            address.subdistrictCode !== undefined &&
            address.subdistrictCode !== null &&
            address.postalCode !== undefined &&
            address.postalCode !== null &&
            String(address.postalCode).trim().length > 0;
          setIsProfileComplete(hasPhone && hasAddress);
        } catch (error) {
          if (isActive) setIsProfileComplete(false);
        }
      };
      fetchProfile();
      return () => {
        isActive = false;
      };
    }, [])
  );

  const handleAddToCart = () => {
    if (!item) return;
    addToCart(item);
    Alert.alert("Added to cart", "You can review it in your cart.");
    navigation.navigate("MainDrawer", { screen: "Cart" });
  };

  const openBuySheet = () => {
    if (!hasStock) {
      Alert.alert("Out of stock", "Sorry, this item is currently unavailable.");
      return;
    }
    setPurchaseQuantity("1");
    setBuySheetVisible(true);
  };

  const closeBuySheet = () => {
    setBuySheetVisible(false);
  };

  const handleQuantityInput = (value) => {
    const digits = value.replace(/[^0-9]/g, "");
    if (!digits) {
      setPurchaseQuantity("");
      return;
    }
    const numericValue = Math.min(parseInt(digits, 10) || 0, availableQuantity);
    if (numericValue <= 0) {
      setPurchaseQuantity("");
      return;
    }
    setPurchaseQuantity(String(numericValue));
  };

  const increaseQuantity = () => {
    if (!hasStock) return;
    const current = parseInt(purchaseQuantity, 10) || 0;
    if (current >= availableQuantity) return;
    setPurchaseQuantity(String(current + 1));
  };

  const decreaseQuantity = () => {
    const current = parseInt(purchaseQuantity, 10) || 0;
    if (current <= 1) return;
    setPurchaseQuantity(String(current - 1));
  };

  const handleProceedToCheckout = () => {
    if (!item) return;
    if (!isPurchaseQuantityValid) {
      Alert.alert("Invalid quantity", "Please select a valid quantity.");
      return;
    }
    if (isProfileComplete === false) {
      closeBuySheet();
      Alert.alert(
        "Profile information required",
        "Please add your phone number and address before placing an order.",
        [
          { text: "Open profile", onPress: navigateToProfile },
          { text: "Cancel", style: "cancel" },
        ]
      );
      return;
    }
    const normalizedQuantity = Math.max(
      1,
      Math.min(currentPurchaseQuantity, availableQuantity || currentPurchaseQuantity)
    );
    closeBuySheet();
    navigation.navigate("OrderSummary", {
      item,
      quantity: normalizedQuantity,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product Detail</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="image-outline" size={40} color="#0C7FDA" />
          </View>
        )}

        <View style={styles.infoSection}>
          <Text style={styles.name}>{name || "Unnamed item"}</Text>

          <View style={styles.priceRow}>
            <Text style={styles.price}>{formattedPrice}</Text>
            <Text
              style={[
                styles.stockInfo,
                !hasStock && styles.stockInfoOut,
              ]}
            >
              {hasStock ? `${quantityDisplay} in stock` : "Out of stock"}
            </Text>
          </View>

          {description ? (
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionLabel}>Product details</Text>
              <Text style={styles.detail}>{description}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cartButton} onPress={handleAddToCart}>
          <Ionicons name="cart-outline" size={22} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.tryButton} onPress={() => {}}>
          <Ionicons
            name="color-wand-outline"
            size={18}
            color="#fff"
            style={styles.tryIcon}
          />
          <Text style={styles.tryButtonText}>Try-On</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.buyButton} onPress={openBuySheet}>
          <Text style={styles.buyButtonText}>Buy now</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={buySheetVisible}
        animationType="slide"
        transparent
        onRequestClose={closeBuySheet}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={closeBuySheet} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.modalImage} />
              ) : (
                <View style={styles.modalImagePlaceholder}>
                  <Ionicons name="image-outline" size={28} color="#0C7FDA" />
                </View>
              )}
              <View style={styles.modalHeaderInfo}>
                <Text style={styles.modalPrice}>
                  {price !== undefined && price !== null ? `฿ ${price}` : "-"}
                </Text>
                <Text style={styles.modalStock}>
                  {availableQuantity} in stock
                </Text>
              </View>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Quantity</Text>
              <View style={styles.quantityControl}>
                <TouchableOpacity
                  style={[
                    styles.quantityButton,
                    decreaseDisabled && styles.quantityButtonDisabled,
                  ]}
                  onPress={decreaseQuantity}
                  disabled={decreaseDisabled}
                >
                  <Ionicons name="remove" size={18} color="#000" />
                </TouchableOpacity>
                <TextInput
                  style={styles.quantityInput}
                  value={purchaseQuantity}
                  placeholder="0"
                  onChangeText={handleQuantityInput}
                  keyboardType="number-pad"
                  maxLength={3}
                />
                <TouchableOpacity
                  style={[
                    styles.quantityButton,
                    increaseDisabled && styles.quantityButtonDisabled,
                  ]}
                  onPress={increaseQuantity}
                  disabled={increaseDisabled}
                >
                  <Ionicons name="add" size={18} color="#000" />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.modalBuyButton,
                !isPurchaseQuantityValid && { opacity: 0.5 },
              ]}
              onPress={handleProceedToCheckout}
              disabled={!isPurchaseQuantityValid}
            >
              <Text style={styles.modalBuyButtonText}>Buy now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#d6d6d6",
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0C7FDA",
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 120,
    gap: 20,
  },
  image: {
    width: 220,
    height: 220,
    resizeMode: "cover",
    borderRadius: 12,
    alignSelf: "center",
  },
  imagePlaceholder: {
    width: 220,
    height: 220,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#0C7FDA",
    backgroundColor: "#F4F8FC",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  infoSection: {
    width: "100%",
    gap: 16,
    alignSelf: "stretch",
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    color: "#222",
  },
  priceRow: {
    alignItems: "flex-end",
    alignSelf: "stretch",
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#E0E6F0",
    paddingBottom: 12,
  },
  price: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0C7FDA",
  },
  stockInfo: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1BBF72",
  },
  stockInfoOut: {
    color: "#DC4B4B",
  },
  descriptionSection: {
    gap: 6,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2A37",
  },
  detail: {
    fontSize: 14,
    lineHeight: 22,
    color: "#4A5568",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "#d6d6d6",
    backgroundColor: "#fff",
  },
  cartButton: {
    width: 54,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#000000ff",
    alignItems: "center",
    justifyContent: "center",
  },
  tryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0C7FDA",
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 18,
  },
  tryIcon: {
    marginRight: 6,
  },
  tryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  buyButton: {
    flex: 1,
    backgroundColor: "#0C7FDA",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    height: 44,
  },
  buyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  modalBackdrop: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
    gap: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  modalImage: {
    width: 70,
    height: 70,
    borderRadius: 12,
    resizeMode: "cover",
    backgroundColor: "#F4F8FC",
  },
  modalImagePlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#0C7FDA",
    backgroundColor: "#F4F8FC",
    alignItems: "center",
    justifyContent: "center",
  },
  modalHeaderInfo: {
    flex: 1,
  },
  modalPrice: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0C7FDA",
    marginBottom: 6,
  },
  modalStock: {
    fontSize: 15,
    color: "#222",
  },
  modalSection: {
    gap: 12,
  },
  modalLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#222",
  },
  quantityControl: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  quantityButton: {
    width: 42,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d6d6d6",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  quantityButtonDisabled: {
    opacity: 0.4,
  },
  quantityInput: {
    width: 70,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d6d6d6",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: "#222",
    paddingVertical: 0,
  },
  modalBuyButton: {
    backgroundColor: "#0C7FDA",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalBuyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
