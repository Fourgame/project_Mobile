import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useCart } from "../context/CartContext";

export default function ProductDetail({ navigation, route }) {
  const item = route.params?.item;
  const { addToCart } = useCart();

  const imageUri = item?.picture || "";
  const price = item?.price;
  const detail = item?.detail ?? "";
  const name = item?.name ?? "";

  const handleAddToCart = () => {
    if (!item) return;
    addToCart(item);
    Alert.alert("เพิ่มในตะกร้าแล้ว", "ดูสินค้าในตะกร้าได้ทันที");
    navigation.navigate("MainDrawer", { screen: "Cart" });
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

        <View style={styles.textBlock}>
          <Text style={styles.name}>{name || "Unnamed item"}</Text>
          <Text style={styles.price}>
            {price !== undefined && price !== null ? `฿ ${price}` : "-"}
          </Text>
          {!!detail && <Text style={styles.detail}>{detail}</Text>}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cartButton} onPress={handleAddToCart}>
          <Ionicons name="cart-outline" size={22} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.buyButton}>
          <Text style={styles.buyButtonText}>Buy now</Text>
        </TouchableOpacity>
      </View>
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
  textBlock: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "#d6d6d6",
    paddingTop: 16,
  },
  name: {
    fontSize: 20,
    fontWeight: "700",
    color: "#222",
    marginBottom: 8,
  },
  price: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0C7FDA",
    marginBottom: 12,
  },
  detail: {
    fontSize: 15,
    color: "#444",
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
});
