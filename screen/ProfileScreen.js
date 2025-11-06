import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  TextInput,
  Modal,
  FlatList,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { auth, db } from "../firebase/firebaseConfig";
import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { signOut } from "firebase/auth";

const GEO_DATA = require("../geo/geography.json");

const PRIMARY_BLUE = "#0C7FDA";
const CARD_BG = "#ffffff";
const INPUT_BG = "#E9EBEF";
const CLOUDINARY_CLOUD_NAME = "di854zkud";
const CLOUDINARY_UNSIGNED_PRESET = "mobile_unsigned";

const SelectField = ({ label, value, placeholder, onPress, disabled }) => (
  <View style={styles.inputBlock}>
    <Text style={styles.inputLabel}>{label}</Text>
    <TouchableOpacity
      style={[styles.selectBox, disabled && styles.selectBoxDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      <Text
        style={[
          styles.selectText,
          !value && { color: "#999" },
          disabled && { color: "#bbb" },
        ]}
        numberOfLines={1}
      >
        {value || placeholder}
      </Text>
      <Ionicons
        name="chevron-down-outline"
        size={16}
        color={disabled ? "#bbb" : "#333"}
      />
    </TouchableOpacity>
  </View>
);

const OptionModal = ({ visible, onClose, onSelect, title, options }) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={styles.modalBackdrop}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={20} color="#333" />
          </TouchableOpacity>
        </View>
        <FlatList
          data={options}
          keyExtractor={(item) => String(item.code)}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => onSelect(item)}
            >
              <Text style={styles.modalOptionText}>{item.name}</Text>
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={styles.modalSeparator} />}
          ListEmptyComponent={
            <View style={styles.modalEmpty}>
              <Text style={{ color: "#888" }}>No options</Text>
            </View>
          }
        />
      </View>
    </View>
  </Modal>
);

const uploadToCloudinary = async (asset) => {
  const file = {
    uri: asset.uri,
    type: asset.mimeType || "image/jpeg",
    name: asset.fileName || `avatar_${Date.now()}.jpg`,
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
    throw new Error(data?.error?.message || "Upload failed");
  }
  return {
    url: data.secure_url,
    publicId: data.public_id,
  };
};

export default function ProfileScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [profile, setProfile] = useState({
    username: "",
    email: "",
    photoUrl: "",
    photoPublicId: "",
    phone: "",
  });
  const [address, setAddress] = useState({
    provinceCode: null,
    provinceName: "",
    districtCode: null,
    districtName: "",
    subdistrictCode: null,
    subdistrictName: "",
    postalCode: "",
    detail: "",
  });

  const [pickerState, setPickerState] = useState({
    visible: false,
    type: null,
    options: [],
    title: "",
  });
  const [phoneError, setPhoneError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          navigation.replace("Login");
          return;
        }

        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          setProfile({
            username: data.username ?? "",
            email: data.email ?? user.email ?? "",
            photoUrl: data.photoUrl ?? "",
            photoPublicId: data.photoPublicId ?? "",
            phone: data.phone ? String(data.phone) : "",
          });

          if (data.address) {
            const addr = data.address;
            setAddress({
              provinceCode: addr.provinceCode ?? null,
              provinceName: addr.provinceNameTh ?? "",
              districtCode: addr.districtCode ?? null,
              districtName: addr.districtNameTh ?? "",
              subdistrictCode: addr.subdistrictCode ?? null,
              subdistrictName: addr.subdistrictNameTh ?? "",
              postalCode: addr.postalCode ? String(addr.postalCode) : "",
              detail: addr.detail ?? "",
            });
          }
        } else {
          setProfile((prev) => ({
            ...prev,
            email: user.email ?? "",
          }));
        }
      } catch (error) {
        Alert.alert("Error", "Failed to load profile.");
      } finally {
        setLoading(false);
      }
    })();
  }, [navigation]);

  const provinces = useMemo(() => {
    const map = new Map();
    GEO_DATA.forEach((item) => {
      if (!map.has(item.provinceCode)) {
        map.set(item.provinceCode, {
          code: item.provinceCode,
          name: item.provinceNameTh,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "th")
    );
  }, []);

  const districts = useMemo(() => {
    if (!address.provinceCode) return [];
    const map = new Map();
    GEO_DATA.forEach((item) => {
      if (item.provinceCode === address.provinceCode) {
        if (!map.has(item.districtCode)) {
          map.set(item.districtCode, {
            code: item.districtCode,
            name: item.districtNameTh,
          });
        }
      }
    });
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "th")
    );
  }, [address.provinceCode]);

  const subdistricts = useMemo(() => {
    if (!address.provinceCode || !address.districtCode) return [];
    return GEO_DATA.filter(
      (item) =>
        item.provinceCode === address.provinceCode &&
        item.districtCode === address.districtCode
    )
      .map((item) => ({
        code: item.subdistrictCode,
        name: item.subdistrictNameTh,
        postalCode: item.postalCode,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "th"));
  }, [address.provinceCode, address.districtCode]);

  const openPicker = (type) => {
    let options = [];
    let title = "";
    if (type === "province") {
      options = provinces;
      title = "เลือกจังหวัด";
    } else if (type === "district") {
      options = districts;
      title = "เลือกอำเภอ";
    } else if (type === "subdistrict") {
      options = subdistricts;
      title = "เลือกตำบล";
    }
    setPickerState({
      visible: true,
      type,
      options,
      title,
    });
  };

  const closePicker = () =>
    setPickerState((prev) => ({ ...prev, visible: false }));

  const handleSelectOption = (item) => {
    if (pickerState.type === "province") {
      setAddress((prev) => ({
        provinceCode: item.code,
        provinceName: item.name,
        districtCode: null,
        districtName: "",
        subdistrictCode: null,
        subdistrictName: "",
        postalCode: "",
        detail: prev.detail,
      }));
    } else if (pickerState.type === "district") {
      setAddress((prev) => ({
        ...prev,
        districtCode: item.code,
        districtName: item.name,
        subdistrictCode: null,
        subdistrictName: "",
        postalCode: "",
      }));
    } else if (pickerState.type === "subdistrict") {
      setAddress((prev) => ({
        ...prev,
        subdistrictCode: item.code,
        subdistrictName: item.name,
        postalCode: item.postalCode ? String(item.postalCode) : "",
      }));
    }
    closePicker();
  };

  const handlePickAvatar = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission needed", "Please allow photo library access.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      setAvatarUploading(true);
      const uploaded = await uploadToCloudinary(result.assets[0]);
      setProfile((prev) => ({
        ...prev,
        photoUrl: uploaded.url,
        photoPublicId: uploaded.publicId,
      }));
    } catch (error) {
      Alert.alert("Upload failed", "Could not change photo. Please try again.");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      const parentNav = navigation.getParent?.();
      const rootNav = parentNav?.getParent?.() ?? parentNav;
      if (rootNav?.reset) {
        rootNav.reset({
          index: 0,
          routes: [{ name: "Login" }],
        });
      } else if (navigation.replace) {
        navigation.replace("Login");
      } else if (navigation.navigate) {
        navigation.navigate("Login");
      }
    } catch {
      Alert.alert("Error", "Cannot sign out now.");
    }
  };

  const handleSave = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        navigation.replace("Login");
        return;
      }

      const trimmedPhone = (profile.phone || "").replace(/\D/g, "");
      if (!/^\d{10}$/.test(trimmedPhone)) {
        setPhoneError("Phone number must be 10 digits");
        return;
      }
      setPhoneError("");

      setSaving(true);
      const docRef = doc(db, "users", user.uid);
      const payload = {
        photoUrl: profile.photoUrl ?? "",
        photoPublicId: profile.photoPublicId ?? "",
        phone: trimmedPhone,
        updatedAt: serverTimestamp(),
        address: {
          provinceCode: address.provinceCode,
          provinceNameTh: address.provinceName,
          districtCode: address.districtCode,
          districtNameTh: address.districtName,
          subdistrictCode: address.subdistrictCode,
          subdistrictNameTh: address.subdistrictName,
          postalCode: address.postalCode || "",
          detail: address.detail,
        },
      };

      try {
        await updateDoc(docRef, payload);
      } catch (error) {
        await setDoc(docRef, payload, { merge: true });
      }
      setProfile((prev) => ({ ...prev, phone: trimmedPhone }));
      Alert.alert("Saved", "Profile updated successfully.");
    } catch (error) {
      Alert.alert("Save failed", "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  const initials =
    (profile.username && profile.username.charAt(0).toUpperCase()) ||
    (profile.email && profile.email.charAt(0).toUpperCase()) ||
    "?";

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.loadingContainer]}>
        <StatusBar backgroundColor="#f5f7fa" barStyle="dark-content" />
        <ActivityIndicator size="large" color={PRIMARY_BLUE} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#f5f7fa" barStyle="dark-content" />
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.avatarWrapper}
              activeOpacity={0.85}
              onPress={handlePickAvatar}
            >
              <View style={styles.avatarCircle}>
                {profile.photoUrl ? (
                  <Image
                    source={{ uri: profile.photoUrl }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Text style={styles.avatarText}>{initials}</Text>
                )}
                {avatarUploading && (
                  <View style={styles.avatarOverlay}>
                    <ActivityIndicator color="#fff" />
                  </View>
                )}
              </View>
              <Text style={styles.avatarHint}>
                {avatarUploading ? "Uploading..." : "Tap to change photo"}
              </Text>
            </TouchableOpacity>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>User name</Text>
              <View style={styles.readonlyBox}>
                <Text style={styles.readonlyText}>
                  {profile.username || "-"}
                </Text>
              </View>
            </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Email</Text>
            <View style={styles.readonlyBox}>
              <Text style={styles.readonlyText}>{profile.email || "-"}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Phone</Text>
            <TextInput
              style={[styles.textInput, phoneError && styles.inputError]}
              keyboardType="number-pad"
              maxLength={10}
              value={profile.phone}
              onChangeText={(text) =>
                setProfile((prev) => ({
                  ...prev,
                  phone: text.replace(/[^0-9]/g, ""),
                }))
              }
              placeholder="Enter phone number"
            />
            {!!phoneError && <Text style={styles.errorText}>{phoneError}</Text>}
          </View>

          <View style={[styles.section, { marginTop: 20 }]}>
              <Text style={styles.sectionHeader}>Address</Text>
              <View style={styles.selectRow}>
                <SelectField
                  label="Province"
                  value={address.provinceName}
                  placeholder="Select province"
                  onPress={() => openPicker("province")}
                />
                <SelectField
                  label="District"
                  value={address.districtName}
                  placeholder="Select district"
                  onPress={() => openPicker("district")}
                  disabled={!address.provinceCode}
                />
              </View>
              <View style={styles.selectRow}>
                <SelectField
                  label="Subdistrict"
                  value={address.subdistrictName}
                  placeholder="Select subdistrict"
                  onPress={() => openPicker("subdistrict")}
                  disabled={!address.districtCode}
                />
                <View style={styles.inputBlock}>
                  <Text style={styles.inputLabel}>Postal code</Text>
                  <View style={styles.readonlyBox}>
                    <Text style={styles.readonlyText}>
                      {address.postalCode || "-"}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.inputBlock}>
                <Text style={styles.inputLabel}>Address details</Text>
                <TextInput
                  style={styles.multilineInput}
                  value={address.detail}
                  onChangeText={(text) =>
                    setAddress((prev) => ({ ...prev, detail: text }))
                  }
                  placeholder="House number, alley, village, road"
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.buttonBar}>
          <TouchableOpacity
            style={[styles.primaryButton, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Save</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={handleSignOut}>
            <Text style={styles.secondaryButtonText}>Log out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <OptionModal
        visible={pickerState.visible}
        options={pickerState.options}
        title={pickerState.title}
        onSelect={handleSelectOption}
        onClose={closePicker}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingBottom: 120,
    paddingTop: 8,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 18,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  avatarWrapper: {
    alignItems: "center",
    marginBottom: 20,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: PRIMARY_BLUE,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarText: {
    fontSize: 40,
    color: "#fff",
    fontWeight: "700",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarHint: {
    marginTop: 8,
    fontSize: 13,
    color: "#666",
  },
  section: {
    marginBottom: 18,
  },
  sectionLabel: {
    fontSize: 14,
    color: "#555",
    marginBottom: 6,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  readonlyBox: {
    backgroundColor: "#eff2f7",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#d6dbe5",
  },
  readonlyText: {
    color: "#6c7280",
    fontSize: 15,
  },
  textInput: {
    backgroundColor: INPUT_BG,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#333",
  },
  inputError: {
    borderWidth: 1,
    borderColor: "#d32f2f",
  },
  errorText: {
    marginTop: 6,
    color: "#d32f2f",
    fontSize: 12,
  },
  selectRow: {
    flexDirection: "row",
    gap: 14,
  },
  inputBlock: {
    flex: 1,
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 14,
    color: "#555",
    marginBottom: 6,
  },
  selectBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: INPUT_BG,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  selectBoxDisabled: {
    backgroundColor: "#e4e6ea",
  },
  selectText: {
    fontSize: 15,
    color: "#333",
    flex: 1,
    marginRight: 8,
  },
  multilineInput: {
    backgroundColor: INPUT_BG,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 80,
    textAlignVertical: "top",
    color: "#333",
  },
  primaryButton: {
    flex: 1,
    backgroundColor: PRIMARY_BLUE,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#d95050",
  },
  secondaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "100%",
    maxHeight: "70%",
    paddingBottom: 10,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#e1e5ea",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  modalOption: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  modalOptionText: {
    fontSize: 15,
    color: "#333",
  },
  modalSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#e7e9ed",
  },
  modalEmpty: {
    paddingVertical: 24,
    alignItems: "center",
  },
  buttonBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: "#f5f7fa",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "#dbe0e6",
    flexDirection: "row",
    gap: 12,
  },
});
