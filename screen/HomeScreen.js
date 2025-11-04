import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StatusBar,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import * as ImagePicker from "expo-image-picker";
import {
  onSnapshot,
  collection,
  doc,
  getDocs,
  query,
  where,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "../firebase/firebaseConfig";

const CATEGORY_LIST = [
  { key: "shirt", label: "Shirt" },
  { key: "glasses", label: "Glasses" },
  { key: "pants", label: "Pants" },
];

const emptyItems = CATEGORY_LIST.reduce(
  (acc, item) => ({ ...acc, [item.key]: [] }),
  {}
);
const CLOUDINARY_CLOUD_NAME = "di854zkud";
const CLOUDINARY_API_KEY = "441543967921158";
const CLOUDINARY_API_SECRET = "6p00fmlLir2kqoM40gPkCb0IWwY";
const CLOUDINARY_UNSIGNED_PRESET = "mobile_unsigned";

export default function HomeScreen({ navigation }) {
  const [itemsByCategory, setItemsByCategory] = useState(emptyItems);
  const [role, setRole] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editDetail, setEditDetail] = useState("");
  const [editImageAsset, setEditImageAsset] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const editPreviewUri = editImageAsset?.uri || editingItem?.picture || "";
  const adminItemsRef = useRef({});
  const uploadToCloudinary = async (asset) => {
    if (!asset?.uri) return null;
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
  const cloudinaryDelete = async (publicId) => {
    if (!publicId) return;
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA1,
        `public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`
      );
      const body = new FormData();
      body.append("public_id", publicId);
      body.append("api_key", CLOUDINARY_API_KEY);
      body.append("timestamp", timestamp.toString());
      body.append("signature", signature);
      await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/destroy`,
        { method: "POST", body }
      );
    } catch (err) {
      console.log("Cloudinary delete error:", err);
    }
  };
  const handleEditQuantityChange = (value) => {
    const digitsOnly = value.replace(/[^0-9]/g, "");
    if (!digitsOnly) {
      setEditQuantity("");
      return;
    }
    const numericValue = Math.min(Number(digitsOnly), 100);
    setEditQuantity(String(numericValue));
  };

  const pickEditImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("ต้องการสิทธิ์", "กรุณาอนุญาตการเข้าถึงรูปภาพ");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });
      if (!result.canceled && result.assets?.length) {
        setEditImageAsset(result.assets[0]);
      }
    } catch (error) {
      console.log("Edit image pick error:", error);
      Alert.alert("ไม่สามารถเลือกรูปได้", "กรุณาลองอีกครั้ง");
    }
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setEditName(item.name ?? "");
    setEditPrice(
      item.price !== undefined && item.price !== null ? String(item.price) : ""
    );
    setEditQuantity(
      item.quantity !== undefined && item.quantity !== null
        ? String(item.quantity)
        : "0"
    );
    setEditDetail(item.detail ?? "");
    setEditImageAsset(null);
    setEditModalVisible(true);
  };

  const closeEditModal = (force = false) => {
    if (editSubmitting && !force) return;
    setEditModalVisible(false);
    setEditingItem(null);
    setEditImageAsset(null);
    setEditName("");
    setEditPrice("");
    setEditQuantity("");
    setEditDetail("");
  };

  const handleEditSave = async () => {
    if (!editingItem) return;
    const trimmedName = editName.trim();
    const trimmedDetail = editDetail.trim();
    if (!trimmedName) {
      Alert.alert("ข้อมูลไม่ครบ", "กรุณากรอกชื่อสินค้า");
      return;
    }
    const numericPrice = Number(editPrice);
    if (!editPrice || Number.isNaN(numericPrice)) {
      Alert.alert("ราคาผิดพลาด", "กรุณากรอกตัวเลขสำหรับราคา");
      return;
    }
    if (editQuantity === "") {
      Alert.alert("จำนวนไม่ถูกต้อง", "กรุณากรอกจำนวนสินค้า");
      return;
    }
    const numericQuantity = Number(editQuantity);
    if (
      Number.isNaN(numericQuantity) ||
      numericQuantity < 0 ||
      numericQuantity > 100
    ) {
      Alert.alert("จำนวนไม่ถูกต้อง", "กรุณากรอกตัวเลข 0 ถึง 100");
      return;
    }

    try {
      setEditSubmitting(true);
      let pictureUrl = editingItem.picture ?? "";
      let publicId = editingItem.publicId ?? "";

      if (editImageAsset?.uri) {
        const uploaded = await uploadToCloudinary(editImageAsset);
        if (!uploaded?.url) {
          throw new Error("ไม่สามารถอัปโหลดรูปภาพได้");
        }
        pictureUrl = uploaded.url;
        if (editingItem.publicId && editingItem.publicId !== uploaded.publicId) {
          await cloudinaryDelete(editingItem.publicId);
        }
        publicId = uploaded.publicId;
      }

      const itemRef = doc(
        db,
        "users",
        editingItem.ownerId,
        editingItem.category,
        editingItem.docId
      );
      await updateDoc(itemRef, {
        name: trimmedName,
        price: numericPrice,
        quantity: numericQuantity,
        detail: trimmedDetail,
        picture: pictureUrl,
        publicId,
      });
      closeEditModal(true);
      Alert.alert("สำเร็จ", "อัปเดตรายการเรียบร้อย");
    } catch (error) {
      console.log("Edit item error:", error);
      Alert.alert("อัปเดตไม่สำเร็จ", "กรุณาลองอีกครั้ง");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteItem = (item) => {
    if (role !== "admin" || item?.ownerId !== userId) return;
    Alert.alert("Delete item", "Do you want to delete this item?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(
              doc(db, "users", item.ownerId, item.category, item.docId)
            );
            if (item.publicId) {
              await cloudinaryDelete(item.publicId);
            }
          } catch (error) {
            Alert.alert("Delete failed", "Unable to delete this item.");
          }
        },
      },
    ]);
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (!user || role === null) {
      return undefined;
    }

    adminItemsRef.current = {};
    setItemsByCategory(
      CATEGORY_LIST.reduce((acc, item) => ({ ...acc, [item.key]: [] }), {})
    );
    setLoading(true);

    let isMounted = true;
    let unsubscribeFunctions = [];

    const rebuildFromCache = () => {
      const combined = CATEGORY_LIST.reduce((acc, category) => {
        const aggregated = [];
        Object.values(adminItemsRef.current).forEach((categoryMap) => {
          if (categoryMap?.[category.key]) {
            aggregated.push(...categoryMap[category.key]);
          }
        });
        acc[category.key] = aggregated;
        return acc;
      }, {});
      setItemsByCategory(combined);
      setLoading(false);
    };

    const attachListenersForOwner = (ownerId) => {
      CATEGORY_LIST.forEach(({ key }) => {
       const productsRef = collection(
         db,
         "users",
         ownerId,
          key
        );
        const unsubscribe = onSnapshot(
          productsRef,
          (snapshot) => {
            adminItemsRef.current = {
              ...adminItemsRef.current,
              [ownerId]: {
                ...(adminItemsRef.current[ownerId] || {}),
              [key]: snapshot.docs.map((docSnap) => ({
                id: `${ownerId}_${docSnap.id}`,
                ownerId,
                docId: docSnap.id,
                category: key,
                ...docSnap.data(),
              })),
              },
            };
            rebuildFromCache();
          },
          (error) => {
            console.log("Home items error:", error);
            setLoading(false);
          }
        );
        unsubscribeFunctions.push(unsubscribe);
      });
    };

    const setupListeners = async () => {
      try {
        if (role === "admin") {
          attachListenersForOwner(user.uid);
        } else {
          const adminQuery = query(
            collection(db, "users"),
            where("role", "==", "admin")
          );
          const adminSnapshot = await getDocs(adminQuery);
          if (!isMounted) {
            return;
          }
          const adminIds = adminSnapshot.docs.map((docSnap) => docSnap.id);
          if (adminIds.length === 0) {
            setItemsByCategory(
              CATEGORY_LIST.reduce(
                (acc, item) => ({ ...acc, [item.key]: [] }),
                {}
              )
            );
            setLoading(false);
            return;
          }
          adminIds.forEach((adminId) => attachListenersForOwner(adminId));
        }
      } catch (error) {
        console.log("Home admin fetch error:", error);
        setLoading(false);
      }
    };

    setupListeners();

    return () => {
      isMounted = false;
      unsubscribeFunctions.forEach((fn) => fn && fn());
    };
  }, [role]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      navigation.replace("Login");
      return;
    }

    const userDocRef = doc(db, "users", user.uid);
    setUserId(user.uid);
    const unsubscribeUser = onSnapshot(userDocRef, (snap) => {
      const data = snap.data();
      setRole(data?.role ?? "customer");
    });

    return () => unsubscribeUser();
  }, [navigation]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      <View style={{ flex: 1 }}>
        {loading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#0C7FDA" />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {CATEGORY_LIST.map((category) => {
              const entries = itemsByCategory[category.key] ?? [];
              return (
                <View key={category.key} style={styles.categorySection}>
                  <Text style={styles.categoryTitle}>{category.label}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.horizontalList}>
                    {entries.length === 0 ? (
                      <View style={styles.emptyCard}>
                        <Text style={styles.emptyText}>No items yet</Text>
                      </View>
                    ) : (
                      entries.map((item) => (
                        <View key={item.id} style={styles.itemCardWrapper}>
                          <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={() => {
                              const parentNav = navigation.getParent();
                              if (parentNav) {
                                parentNav.navigate("ProductDetail", { item });
                              } else {
                                navigation.navigate("ProductDetail", { item });
                              }
                            }}
                          >
                            <View style={styles.itemCard}>
                              {item.picture ? (
                                <Image
                                  source={{ uri: item.picture }}
                                  style={styles.itemImage}
                                />
                              ) : (
                                <View style={styles.placeholderImage}>
                                  <Ionicons
                                    name="image-outline"
                                    size={28}
                                    color="#0C7FDA"
                                  />
                                </View>
                              )}
                              <View style={styles.itemInfo}>
                                <Text style={styles.itemName}>
                                  {item.name || "No name"}
                                </Text>
                                <Text style={styles.itemPrice}>
                                  ฿{item.price ?? "-"}
                                </Text>
                                {!!item.detail && (
                                  <Text style={styles.itemDetail} numberOfLines={2}>
                                    {item.detail}
                                  </Text>
                                )}
                              </View>
                            </View>
                          </TouchableOpacity>
                          {role === "admin" && userId === item.ownerId && (
                            <>
                              <TouchableOpacity
                                style={styles.editButton}
                                onPress={() => openEditModal(item)}
                                activeOpacity={0.85}
                                disabled={editSubmitting}
                              >
                                <Ionicons name="create-outline" size={15} color="#fff" />
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.deleteButton}
                                onPress={() => handleDeleteItem(item)}
                                activeOpacity={0.85}
                              >
                                <Ionicons name="close" size={16} color="#fff" />
                              </TouchableOpacity>
                            </>
                          )}
                        </View>
                      ))
                    )}
                    </View>
                  </ScrollView>
                </View>
              );
            })}
          </ScrollView>
        )}

        {role === "admin" && (
          <TouchableOpacity
            style={styles.fab}
            onPress={() => {
              const parentNav = navigation.getParent();
              if (parentNav) {
                parentNav.navigate("Add");
              } else {
                navigation.navigate("Add");
              }
            }}
          >
            <Ionicons name="add" size={30} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => closeEditModal()}
      >
        <View style={styles.editModalOverlay}>
          <Pressable
            style={styles.editModalBackdrop}
            onPress={() => {
              if (!editSubmitting) {
                closeEditModal();
              }
            }}
          />
          <View style={styles.editModalContainer}>
            <View style={styles.editModalHeader}>
              <Text style={styles.editModalTitle}>Edit Item</Text>
              <TouchableOpacity
                style={styles.editModalClose}
                onPress={() => closeEditModal()}
                disabled={editSubmitting}
              >
                <Ionicons name="close" size={20} color="#0C7FDA" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.editModalScroll}
              contentContainerStyle={styles.editModalContent}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.editCategoryLabel}>
                Category: {editingItem?.category ?? "-"}
              </Text>

              <View style={styles.editImageWrapper}>
                {editPreviewUri ? (
                  <Image
                    source={{ uri: editPreviewUri }}
                    style={styles.editPreviewImage}
                  />
                ) : (
                  <View style={styles.editImagePlaceholder}>
                    <Ionicons name="image-outline" size={28} color="#0C7FDA" />
                  </View>
                )}
                <TouchableOpacity
                  style={styles.editChangeImageButton}
                  onPress={pickEditImage}
                  disabled={editSubmitting}
                >
                  <Text style={styles.editChangeImageText}>Change picture</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.editField}>
                <Text style={styles.editLabel}>Name</Text>
                <TextInput
                  style={styles.editInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Enter product name"
                  editable={!editSubmitting}
                />
              </View>

              <View style={styles.editField}>
                <Text style={styles.editLabel}>Price</Text>
                <TextInput
                  style={styles.editInput}
                  value={editPrice}
                  onChangeText={setEditPrice}
                  placeholder="Enter price"
                  keyboardType="numeric"
                  editable={!editSubmitting}
                />
              </View>

              <View style={styles.editField}>
                <Text style={styles.editLabel}>Quantity</Text>
                <TextInput
                  style={styles.editInput}
                  value={editQuantity}
                  onChangeText={handleEditQuantityChange}
                  placeholder="0"
                  keyboardType="number-pad"
                  maxLength={3}
                  editable={!editSubmitting}
                />
                <Text style={styles.editHelperText}>0 - 100</Text>
              </View>

              <View style={styles.editField}>
                <Text style={styles.editLabel}>Detail</Text>
                <TextInput
                  style={[styles.editInput, styles.editTextArea]}
                  value={editDetail}
                  onChangeText={setEditDetail}
                  placeholder="Enter detail"
                  multiline
                  numberOfLines={4}
                  editable={!editSubmitting}
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.editSaveButton,
                editSubmitting && { opacity: 0.6 },
              ]}
              onPress={handleEditSave}
              disabled={editSubmitting}
            >
              <Text style={styles.editSaveButtonText}>
                {editSubmitting ? "Saving..." : "Save changes"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000000ff",
    marginBottom: 12,
  },
  horizontalList: {
    flexDirection: "row",
    paddingRight: 16,
  },
  itemCard: {
    width: 140,
    borderWidth: 2,
    borderColor: "#0C7FDA",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  itemCardWrapper: {
    marginRight: 12,
    position: "relative",
  },
  itemImage: {
    width: "100%",
    height: 120,
    resizeMode: "cover",
  },
  placeholderImage: {
    width: "100%",
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F8FC",
  },
  itemInfo: {
    padding: 10,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0C7FDA",
    marginBottom: 4,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#222",
    marginBottom: 4,
  },
  itemDetail: {
    fontSize: 13,
    color: "#444",
  },
  emptyCard: {
    width: 140,
    height: 160,
    borderWidth: 2,
    borderColor: "#d0d7dd",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f7fa",
    marginRight: 12,
  },
  emptyText: {
    color: "#999",
  },
  editButton: {
    position: "absolute",
    top: 6,
    left: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#0C7FDA",
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    zIndex: 10,
  },
  deleteButton: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#d32f2f",
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    zIndex: 10,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    backgroundColor: "#0C7FDA",
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  editModalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  editModalBackdrop: {
    flex: 1,
  },
  editModalContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
    maxHeight: "90%",
  },
  editModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0C7FDA",
  },
  editModalClose: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F6FC",
  },
  editModalScroll: {
    maxHeight: 360,
  },
  editModalContent: {
    paddingBottom: 16,
    gap: 16,
  },
  editCategoryLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#222",
  },
  editImageWrapper: {
    alignItems: "center",
    gap: 10,
  },
  editPreviewImage: {
    width: 140,
    height: 140,
    borderRadius: 14,
    resizeMode: "cover",
    borderWidth: 1,
    borderColor: "#0C7FDA",
  },
  editImagePlaceholder: {
    width: 140,
    height: 140,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#0C7FDA",
    backgroundColor: "#F4F8FC",
    alignItems: "center",
    justifyContent: "center",
  },
  editChangeImageButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#0C7FDA",
  },
  editChangeImageText: {
    color: "#0C7FDA",
    fontWeight: "600",
  },
  editField: {
    gap: 6,
  },
  editLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0C7FDA",
  },
  editInput: {
    borderWidth: 1,
    borderColor: "#d0d7dd",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#222",
    backgroundColor: "#fff",
  },
  editHelperText: {
    fontSize: 12,
    color: "#666",
  },
  editTextArea: {
    height: 120,
  },
  editSaveButton: {
    marginTop: 10,
    backgroundColor: "#0C7FDA",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  editSaveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

