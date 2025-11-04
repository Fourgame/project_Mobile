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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
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
const CARD_BG = "#ffffffff";
const INPUT_BG = "#E9EBEF";

const SelectField = ({ label, value, placeholder, onPress, disabled }) => (
  <View style={styles.inputBlock}>
    <Text style={styles.inputLabel}>{label}</Text>
    <TouchableOpacity
      style={[styles.selectBox, disabled && styles.selectBoxDisabled]}
      onPress={onPress}
      disabled={disabled}
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

export default function ProfileScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    username: "",
    email: "",
    photoUrl: "",
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
          } else {
            setAddress((prev) => ({
              ...prev,
              detail: "",
            }));
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

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigation.replace("Splash");
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

      setSaving(true);
      const docRef = doc(db, "users", user.uid);
      const payload = {
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
      } catch (e) {
        await setDoc(docRef, payload, { merge: true });
      }
      Alert.alert("สำเร็จ", "บันทึกข้อมูลเรียบร้อย");
    } catch (error) {
      Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกข้อมูลได้");
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
      <SafeAreaView style={[styles.safeArea, { justifyContent: "center" }]}>
        <StatusBar backgroundColor="#f5f7fa" barStyle="dark-content" />
        <ActivityIndicator size="large" color={PRIMARY_BLUE} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#f5f7fa" barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.card}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </View>

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
            <Text style={styles.secondaryButtonText}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

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
  scrollContainer: {
    padding: 16,
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
    marginBottom: 24,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: PRIMARY_BLUE,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 40,
    color: "#fff",
    fontWeight: "700",
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
    backgroundColor: INPUT_BG,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  readonlyText: {
    color: "#333",
    fontSize: 15,
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
    backgroundColor: PRIMARY_BLUE,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#cbd2da",
  },
  secondaryButtonText: {
    color: "#333",
    fontSize: 15,
    fontWeight: "500",
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
});
