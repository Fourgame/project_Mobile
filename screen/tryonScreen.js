import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { Buffer } from "buffer";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

global.Buffer = global.Buffer || Buffer;

const CLOUD_FN_URL =
  "https://tryon-us-715686729537.us-central1.run.app";

const formatPrice = (value) => {
  if (value === null || value === undefined) return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return `฿ ${numeric.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const buildInitialProducts = (
  productItemsParam,
  productImagesParam,
  productImage,
  productName,
  productPrice
) => {
  const items = [];

  if (Array.isArray(productItemsParam)) {
    productItemsParam.forEach((item, index) => {
      if (!item) return;
      const uri =
        item.uri ||
        item.picture ||
        item.image ||
        item.imageUri ||
        item.photoUrl ||
        null;
      const name =
        typeof item.name === "string" && item.name.trim().length > 0
          ? item.name.trim()
          : "";
      const priceSource =
        item.price ??
        item.productPrice ??
        item.cost ??
        item.salePrice ??
        null;
      const numericPrice = Number(priceSource);
      const id =
        item.id ??
        item.cartId ??
        item.productId ??
        item.key ??
        `cart-${index}`;
      items.push({
        id,
        uri: uri || null,
        name,
        price: Number.isFinite(numericPrice) ? numericPrice : null,
      });
    });
  }

  if (Array.isArray(productImagesParam)) {
    productImagesParam.forEach((uri, index) => {
      if (uri === undefined || uri === null) return;
      items.push({
        id: `param-${index}`,
        uri,
        name: "",
        price: null,
      });
    });
  }

  if (productImage) {
    const exists = items.some((item) => item.uri === productImage);
    if (!exists) {
      items.push({
        id: "single-product",
        uri: productImage,
        name: productName,
        price: Number.isFinite(Number(productPrice))
          ? Number(productPrice)
          : null,
      });
    }
  }

  return items;
};

export default function TryOnScreen({ navigation, route }) {
  const initialProductImage = route?.params?.productImage ?? null;
  const initialProductImagesParam = route?.params?.productImages ?? [];
  const initialProductItemsParam = route?.params?.productItems ?? [];
  const productName = route?.params?.productName ?? "";
  const productPrice = route?.params?.productPrice ?? null;
  const fromCart = route?.params?.origin === "cart";

  const [personImage, setPersonImage] = useState(null);
  const [productImages, setProductImages] = useState(() =>
    buildInitialProducts(
      initialProductItemsParam,
      initialProductImagesParam,
      initialProductImage,
      productName,
      productPrice
    )
  );
  const [resultImage, setResultImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const hasAnyProductImage = useMemo(
    () => productImages.some((item) => !!item?.uri),
    [productImages]
  );

  const totalPrice = useMemo(
    () =>
      productImages.reduce(
        (acc, item) =>
          acc +
          (Number.isFinite(Number(item?.price)) ? Number(item.price) : 0),
        0
      ),
    [productImages]
  );
  const formattedTotalPrice =
    totalPrice > 0 ? formatPrice(totalPrice) : null;

  const canRunTryOn = !!personImage && hasAnyProductImage && !loading;
  const shareEnabled = !!resultImage;
  const downloadEnabled = !!resultImage;
  const canProceedToPayment = productImages.length > 0;

const requestMediaPermission = async () => {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (permission.status !== "granted") {
    Alert.alert(
      "Permission required",
      "Please allow photo library access to continue."
    );
    return false;
  }
  return true;
};

const pickPersonImage = async () => {
  const allowed = await requestMediaPermission();
  if (!allowed) {
    return;
  }
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaType.Images,
    quality: 1,
  });
  if (!res.canceled) {
    setPersonImage(res.assets[0].uri);
      setResultImage(null);
    }
  };

const addProductImage = async () => {
  const allowed = await requestMediaPermission();
  if (!allowed) {
    return;
  }
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaType.Images,
    quality: 1,
  });
    if (!res.canceled) {
      const uri = res.assets[0].uri;
      setProductImages((prev) => [
        ...prev,
        {
          id: `picker-${Date.now().toString(36)}-${Math.random()
            .toString(36)
            .slice(2, 8)}`,
          uri,
          name: "",
          price: null,
        },
      ]);
    }
  };

const updateProductImage = async (index) => {
  const allowed = await requestMediaPermission();
  if (!allowed) {
    return;
  }
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaType.Images,
    quality: 1,
  });
    if (!res.canceled) {
      const uri = res.assets[0].uri;
      setProductImages((prev) =>
        prev.map((item, i) =>
          i === index
            ? {
                ...item,
                uri,
              }
            : item
        )
      );
    }
  };

  const removeProductImage = (index) => {
    setProductImages((prev) => prev.filter((_, i) => i !== index));
  };

  const callTryOnOnce = async (personBase64, productBase64) => {
    const resp = await fetch(CLOUD_FN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personBase64,
        productBase64List: [productBase64],
      }),
    });
    const data = await resp.json();
    if (!resp.ok || data.error) {
      throw new Error(data.error || "Service error");
    }
    const out = data.predictions?.[0]?.bytesBase64Encoded;
    if (!out) {
      throw new Error("No image returned from service");
    }
    return out;
  };

  const tryOnAll = async () => {
    if (!personImage) {
      Alert.alert(
        "Missing customer photo",
        "Please choose a customer photo before running the try-on."
      );
      return;
    }
    if (!hasAnyProductImage) {
      Alert.alert(
        "No product images",
        "Add at least one product image to continue."
      );
      return;
    }

    setLoading(true);
    setResultImage(null);

    try {
      const personResp = await fetch(personImage);
      let currentPersonBase64 = Buffer.from(
        await personResp.arrayBuffer()
      ).toString("base64");

      for (const item of productImages) {
        const uri = item?.uri;
        if (!uri) continue;

        const prodResp = await fetch(uri);
        const productBase64 = Buffer.from(
          await prodResp.arrayBuffer()
        ).toString("base64");
        currentPersonBase64 = await callTryOnOnce(
          currentPersonBase64,
          productBase64
        );
      }

      setResultImage(`data:image/png;base64,${currentPersonBase64}`);
    } catch (error) {
      console.error(error);
      Alert.alert(
        "Try-on failed",
        error.message || "An unexpected error occurred."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleShareResult = async () => {
    if (!resultImage) {
      Alert.alert("No result yet", "Generate a try-on image before sharing.");
      return;
    }
    try {
      const payload = { message: "Check out this try-on result!" };
      if (!resultImage.startsWith("data:")) {
        payload.url = resultImage;
      }
      await Share.share(payload);
    } catch (error) {
      if (error?.code === "dismissedAction") {
        return;
      }
      Alert.alert("Share failed", error.message || "Unable to share right now.");
    }
  };

  const handleDownloadResult = async () => {
    if (!resultImage) {
      Alert.alert("No result yet", "Generate a try-on image before downloading.");
      return;
    }
    try {
      const filename = `tryon-${Date.now()}.png`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      const base64 = resultImage.replace(/^data:image\/\w+;base64,/, "");
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      Alert.alert("Image saved", `Saved to ${fileUri}`);
    } catch (error) {
      Alert.alert("Download failed", error.message || "Unable to save the image.");
    }
  };

  const handleGoToCart = () => {
    const parentNav = navigation.getParent?.();
    if (parentNav) {
      parentNav.navigate("MainDrawer", { screen: "Cart" });
    } else {
      navigation.navigate("MainDrawer", { screen: "Cart" });
    }
  };

const handleProceedToCheckout = () => {
  if (!canProceedToPayment) return;
  const itemsPayload = productImages
    .filter((item) => item?.uri)
    .map((item) => ({
      item: {
        id: item.id,
        name: item.name || "Unnamed item",
        price: Number.isFinite(Number(item.price)) ? Number(item.price) : 0,
        picture: item.uri || "",
      },
      quantity: 1,
    }));

  const parentNav = navigation.getParent?.();
  if (parentNav) {
    parentNav.navigate("OrderSummary", { items: itemsPayload });
  } else {
    navigation.navigate("OrderSummary", { items: itemsPayload });
  }
};

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={22} color="#0C7FDA" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Virtual Try-On</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Items to try on</Text>
            <Text style={styles.helperText}>
              Review the products that will be applied to the customer photo.
            </Text>
            <TouchableOpacity style={styles.button} onPress={addProductImage}>
              <Text style={styles.buttonText}>Add product image</Text>
            </TouchableOpacity>

            {productImages.length > 0 ? (
              <View style={styles.productList}>
                {productImages.map((item, index) => {
                  const formattedPrice = formatPrice(item?.price);
                  return (
                    <View
                      key={`product-${item?.id ?? "item"}-${index}`}
                      style={styles.productCard}
                    >
                      <TouchableOpacity
                        style={styles.productImageWrapper}
                        onPress={() => updateProductImage(index)}
                      >
                        {item?.uri ? (
                          <Image source={{ uri: item.uri }} style={styles.productImage} />
                        ) : (
                          <View style={styles.productPlaceholder}>
                            <Ionicons name="image-outline" size={30} color="#A0AEC0" />
                          </View>
                        )}
                      </TouchableOpacity>
                      <View style={styles.productInfo}>
                        <Text style={styles.productIndex}>
                          {item?.name?.trim()
                            ? item.name
                            : `Product ${index + 1}`}
                        </Text>
                        {formattedPrice ? (
                          <Text style={styles.productPrice}>{formattedPrice}</Text>
                        ) : null}
                        {!item?.uri ? (
                          <Text style={styles.productHint}>
                            No product image yet. Add one to include it in the try-on.
                          </Text>
                        ) : null}
                        <TouchableOpacity
                          style={styles.removeButton}
                          onPress={() => removeProductImage(index)}
                        >
                          <Text style={styles.removeText}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons
                  name="images-outline"
                  size={40}
                  color="#A0AEC0"
                  style={styles.emptyIcon}
                />
                <Text style={styles.emptyText}>No product images yet</Text>
              </View>
            )}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Choose the customer photo</Text>
            <Text style={styles.helperText}>
              Pick an existing photo or capture a new one to use as the base.
            </Text>
            <TouchableOpacity style={styles.button} onPress={pickPersonImage}>
              <Text style={styles.buttonText}>
                {personImage ? "Change customer photo" : "Pick customer photo"}
              </Text>
            </TouchableOpacity>
            {personImage ? (
              <Image
                source={{ uri: personImage }}
                style={styles.mainImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.personPlaceholder}>
                <Ionicons
                  name="person-circle-outline"
                  size={52}
                  color="#A0AEC0"
                />
                <Text style={styles.placeholderText}>No customer photo yet</Text>
              </View>
            )}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Start try-on</Text>
            <Text style={styles.helperText}>
              Once both images are ready, run the try-on to generate a preview.
            </Text>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                !canRunTryOn && styles.primaryButtonDisabled,
              ]}
              onPress={tryOnAll}
              disabled={!canRunTryOn}
            >
              <Text style={styles.primaryButtonText}>
                {loading ? "Processing..." : "Run Try-On"}
              </Text>
            </TouchableOpacity>
            {loading ? (
              <ActivityIndicator
                size="large"
                color="#0C7FDA"
                style={styles.loader}
              />
            ) : null}
          </View>

          {resultImage ? (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Try-on result</Text>
              <Image source={{ uri: resultImage }} style={styles.resultImage} />
            </View>
          ) : null}

          <View style={styles.shareRow}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                !shareEnabled && styles.actionButtonDisabled,
              ]}
              onPress={handleShareResult}
              disabled={!shareEnabled}
            >
              <Ionicons
                name="share-social-outline"
                size={18}
                color={shareEnabled ? "#FFFFFF" : "#DFE8FF"}
              />
              <Text
                style={[
                  styles.actionButtonText,
                  !shareEnabled && styles.actionButtonTextDisabled,
                ]}
              >
                Share
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionButton,
                !downloadEnabled && styles.actionButtonDisabled,
              ]}
              onPress={handleDownloadResult}
              disabled={!downloadEnabled}
            >
              <Ionicons
                name="download-outline"
                size={18}
                color={downloadEnabled ? "#FFFFFF" : "#DFE8FF"}
              />
              <Text
                style={[
                  styles.actionButtonText,
                  !downloadEnabled && styles.actionButtonTextDisabled,
                ]}
              >
                Download
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.checkoutRow}>
            <TouchableOpacity
              style={styles.cartButton}
              onPress={handleGoToCart}
            >
              <Ionicons name="cart-outline" size={18} color="#0C7FDA" />
              <Text style={styles.cartButtonText}>Back to Cart</Text>
            </TouchableOpacity>
            {formattedTotalPrice ? (
              <>
                <View style={styles.checkoutDivider} />
                <Text style={styles.totalPriceText}>{formattedTotalPrice}</Text>
              </>
            ) : null}
            <TouchableOpacity
              style={[
                styles.paymentButton,
                !canProceedToPayment && styles.paymentButtonDisabled,
              ]}
              onPress={handleProceedToCheckout}
              disabled={!canProceedToPayment}
            >
              <Text style={styles.paymentButtonText}>
                Checkout ({Math.max(productImages.length, 1)})
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F4F6FB",
  },
  screen: {
    flex: 1,
  },
  header: {
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingRight: 12,
  },
  backText: {
    color: "#0C7FDA",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#04162A",
  },
  headerSpacer: {
    width: 64,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
    gap: 18,
  },
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A202C",
  },
  helperText: {
    marginTop: 8,
    fontSize: 13,
    color: "#4A5568",
    lineHeight: 18,
  },
  button: {
    marginTop: 14,
    backgroundColor: "#0C7FDA",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  mainImage: {
    marginTop: 16,
    width: "100%",
    height: 260,
    borderRadius: 14,
    backgroundColor: "#E2E8F0",
  },
  personPlaceholder: {
    marginTop: 16,
    height: 220,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#CBD5E0",
    backgroundColor: "#F8FAFF",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    marginTop: 10,
    fontSize: 13,
    color: "#A0AEC0",
  },
  productList: {
    marginTop: 16,
    gap: 12,
  },
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#F7FAFC",
  },
  productImageWrapper: {
    borderRadius: 12,
  },
  productImage: {
    width: 76,
    height: 76,
    borderRadius: 12,
    backgroundColor: "#E2E8F0",
  },
  productPlaceholder: {
    width: 76,
    height: 76,
    borderRadius: 12,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  productInfo: {
    flex: 1,
  },
  productIndex: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2D3748",
  },
  productPrice: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: "600",
    color: "#0C7FDA",
  },
  productHint: {
    marginTop: 6,
    fontSize: 12,
    color: "#718096",
  },
  removeButton: {
    marginTop: 10,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#E2E8F0",
  },
  removeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#E53E3E",
  },
  emptyState: {
    marginTop: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#CBD5E0",
    backgroundColor: "#F8FAFF",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },
  emptyIcon: {
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: "#718096",
  },
  primaryButton: {
    marginTop: 16,
    backgroundColor: "#34C759",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  loader: {
    marginTop: 16,
  },
  resultImage: {
    marginTop: 14,
    width: "100%",
    height: 380,
    borderRadius: 16,
    backgroundColor: "#E2E8F0",
  },
  shareRow: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#74A7F5",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 16,
    minWidth: 120,
    justifyContent: "center",
  },
  actionButtonDisabled: {
    backgroundColor: "#BFD4FF",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  actionButtonTextDisabled: {
    color: "#DFE8FF",
  },
  checkoutRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  cartButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E8F1FF",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  cartButtonText: {
    color: "#0C7FDA",
    fontSize: 15,
    fontWeight: "600",
  },
  checkoutDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#C5D5F5",
  },
  totalPriceText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0C7FDA",
  },
  paymentButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: "#0C7FDA",
  },
  paymentButtonDisabled: {
    opacity: 0.4,
  },
  paymentButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
