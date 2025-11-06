import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { addDoc, collection, doc, onSnapshot, serverTimestamp } from "firebase/firestore";

import { auth, db } from "../firebase/firebaseConfig";

const CATEGORY_OPTIONS = [
  { key: "shirts", label: "Shirts" },
  { key: "pants", label: "Pants" },
  { key: "shoes", label: "Shoes" },
];

const CLOUDINARY_CLOUD_NAME = "di854zkud";
const CLOUDINARY_UNSIGNED_PRESET = "mobile_unsigned";

export default function AddScreen({ navigation }) {
  const [selectedCategory, setSelectedCategory] = useState("shirts");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [detail, setDetail] = useState("");
  const [imageAsset, setImageAsset] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const uploadToCloudinary = async (asset) => {
    const file = {
      uri: asset.uri,
      type: asset.mimeType || "image/jpeg",
      name: asset.fileName || `upload_${Date.now()}.jpg`,
    };

    const body = new FormData();
    body.append("file", file);
    body.append("upload_preset", CLOUDINARY_UNSIGNED_PRESET);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body,
      }
    );

    const data = await response.json();
    if (!response.ok) {
      console.log("Cloudinary upload error:", data);
      throw new Error(data?.error?.message || "Upload failed");
    }
    return {
      url: data.secure_url,
      publicId: data.public_id,
    };
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("User not found", "Please sign in again.");
      navigation.replace("Login");
      return;
    }

    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      const data = snap.data();
      if (!data || data.role !== "admin") {
        Alert.alert("Restricted access", "This screen is for administrators only.");
        navigation.goBack();
      }
    });

    return () => unsub();
  }, [navigation]);

  const pickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("Permission required", "Please allow photo library access.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });

      if (!result.canceled && result.assets?.length) {
        setImageAsset(result.assets[0]);
      }
    } catch (error) {
      console.log("Image pick error:", error);
      Alert.alert("Unable to select image", "Please try again.");
    }
  };

  const handleQuantityChange = (value) => {
    const digitsOnly = value.replace(/[^0-9]/g, "");
    if (!digitsOnly) {
      setQuantity("");
      return;
    }
    const numericValue = Number(digitsOnly);
    if (Number.isNaN(numericValue)) {
      return;
    }
    if (numericValue > 100) {
      setQuantity("100");
      return;
    }
    setQuantity(digitsOnly);
  };

  const handleAdd = async () => {
    const trimmedDetail = detail.trim();
    const trimmedName = name.trim();
    const numericPrice = Number(price);
    const numericQuantity = Number(quantity);

    if (!trimmedName) {
      Alert.alert("Invalid product name", "Please enter a product name.");
      return;
    }
    if (!price || Number.isNaN(numericPrice)) {
      Alert.alert("Invalid price", "Please enter a numeric price.");
      return;
    }
    if (numericPrice < 10) {
      Alert.alert("Invalid price", "Minimum price is 10 baht.");
      return;
    }
    if (!quantity) {
      Alert.alert("Invalid quantity", "Please enter a quantity.");
      return;
    }
    if (
      Number.isNaN(numericQuantity) ||
      !Number.isInteger(numericQuantity) ||
      numericQuantity <= 0 ||
      numericQuantity > 100
    ) {
      Alert.alert("Invalid quantity", "Please enter a number between 1 and 100.");
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      Alert.alert("User not found", "Please sign in again.");
      navigation.replace("Login");
      return;
    }

    try {
      setSubmitting(true);
      let uploadedImage = null;

      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert("User not found", "Please sign in again.");
        navigation.replace("Login");
        return;
      }

      if (imageAsset?.uri) {
        uploadedImage = await uploadToCloudinary(imageAsset);
      }

      const productsRef = collection(db, "users", currentUser.uid, selectedCategory);

      await addDoc(productsRef, {
        category: selectedCategory,
        name: trimmedName,
        detail: trimmedDetail,
        price: numericPrice,
        quantity: numericQuantity,
        picture: uploadedImage?.url ?? "",
        publicId: uploadedImage?.publicId ?? "",
        createdAt: serverTimestamp(),
      });

      Alert.alert("Success", "Item added successfully.");
      setName("");
      setQuantity("");
      setPrice("");
      setDetail("");
      setImageAsset(null);
      navigation.goBack();
    } catch (error) {
      console.log("Add item error:", error);
      Alert.alert("Unable to add item", "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#0C7FDA" />
          </TouchableOpacity>
          <Text style={styles.title}>Add Item</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.categoryRow}>
            {CATEGORY_OPTIONS.map((option) => {
              const isSelected = selectedCategory === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.categoryChip,
                    isSelected && styles.categoryChipSelected,
                  ]}
                  onPress={() => setSelectedCategory(option.key)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      isSelected && styles.categoryChipTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter product name"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Quantity</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            value={quantity}
            onChangeText={handleQuantityChange}
            placeholder="Enter quantity (max 100)"
            maxLength={3}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Picture</Text>
          <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
            {imageAsset?.uri ? (
              <Image source={{ uri: imageAsset.uri }} style={styles.previewImage} resizeMode="contain"/>
            ) : (
              <View style={styles.placeholder}>
                <Ionicons name="image-outline" size={32} color="#0C7FDA" />
                <Text style={styles.placeholderText}>Tap to select image</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Price</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={price}
            onChangeText={(value) => {
              const sanitized = value.replace(/[^0-9.]/g, "");
              setPrice(sanitized);
            }}
            placeholder="Enter price (atleast 10 THB)"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Detail</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={detail}
            onChangeText={setDetail}
            placeholder="Enter detail"
            multiline
            numberOfLines={4}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, submitting && { opacity: 0.6 }]}
          onPress={handleAdd}
          disabled={submitting}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? "Adding..." : "Add"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    padding: 20,
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0C7FDA",
  },
  section: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0C7FDA",
    marginBottom: 8,
  },
  categoryRow: {
    flexDirection: "row",
  },
  categoryChip: {
    borderWidth: 1,
    borderColor: "#0C7FDA",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 10,
  },
  categoryChipSelected: {
    backgroundColor: "#0C7FDA",
  },
  categoryChipText: {
    color: "#0C7FDA",
    fontWeight: "600",
  },
  categoryChipTextSelected: {
    color: "#fff",
  },
  imagePicker: {
    height: 160,
    borderWidth: 1,
    borderColor: "#0C7FDA",
    borderRadius: 12,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F4F8FC",
  },
  previewImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  placeholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    color: "#0C7FDA",
    fontWeight: "500",
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: "#fff",
  },
  multilineInput: {
    height: 100,
    textAlignVertical: "top",
  },
  submitButton: {
    backgroundColor: "#0C7FDA",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
