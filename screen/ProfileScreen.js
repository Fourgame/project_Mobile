import React, { useEffect, useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  ScrollView,
  Text,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import Constants from "expo-constants";
import { styles } from "../styles/ProfileScreenStyle";
import { auth, db } from "../firebase/firebaseConfig";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { signOut } from "firebase/auth";

export default function ProfileScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    studentId: "",
    email: "",
    photoUrl: "",
  });

  // แบบร่างที่ใช้ตอนแก้ไข
  const [draft, setDraft] = useState({
    firstName: "",
    lastName: "",
    studentId: "",
  });

  useEffect(() => {
    (async () => {
      try {
        const user = auth.currentUser;
        if (!user) return navigation.replace("Login");

        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const d = snap.data();
          const loaded = {
            firstName: d.firstName ?? "",
            lastName: d.lastName ?? "",
            studentId: d.studentId ?? "",
            email: d.email ?? user.email ?? "",
            photoUrl: d.photoUrl ?? "",
          };
          setProfile(loaded);
          setDraft({
            firstName: loaded.firstName,
            lastName: loaded.lastName,
            studentId: String(loaded.studentId ?? ""),
          });
        } else {
          setProfile((p) => ({ ...p, email: user.email ?? "" }));
          setDraft({ firstName: "", lastName: "", studentId: "" });
        }
      } catch (e) {
        Alert.alert("Error", "Failed to load profile.");
      } finally {
        setLoading(false);
      }
    })();
  }, [navigation]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigation.replace("Splash");
    } catch {
      Alert.alert("Error", "Cannot sign out now.");
    }
  };

  const handleGoToSplash = () => {
    navigation.navigate("Splash", { from: "Profile" });
  };

  const startEdit = () => {
    setDraft({
      firstName: profile.firstName,
      lastName: profile.lastName,
      studentId: String(profile.studentId ?? ""),
    });
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
  };

  const saveEdit = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return navigation.replace("Login");

      // ตรวจเบื้องต้น
      const f = draft.firstName.trim();
      const l = draft.lastName.trim();
      const s = String(draft.studentId || "").trim();

      if (!f || !l) {
        Alert.alert("Invalid", "Please fill in first name and last name.");
        return;
      }

      setSaving(true);

      await updateDoc(doc(db, "users", user.uid), {
        firstName: f,
        lastName: l,
        studentId: s,
        updatedAt: serverTimestamp(),
      });

      // อัปเดต state หลัก
      setProfile((p) => ({
        ...p,
        firstName: f,
        lastName: l,
        studentId: s,
      }));

      setEditing(false);
      Alert.alert("Saved", "Profile updated.");
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const pickAndUploadAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Please allow photo library access.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
        base64: true,
      });

      if (result.canceled) return;

      setUploading(true);

      const base64 = result.assets?.[0]?.base64;
      if (!base64) {
        setUploading(false);
        Alert.alert("Error", "Could not read image.");
        return;
      }

      const url = await uploadToImgbb(base64);

      const user = auth.currentUser;
      if (!user) throw new Error("No user");
      await updateDoc(doc(db, "users", user.uid), { photoUrl: url, updatedAt: serverTimestamp() });

      setProfile((p) => ({ ...p, photoUrl: url }));
      Alert.alert("Success", "Profile picture updated!");
    } catch (err) {
      console.log(err);
      Alert.alert("Upload failed", "Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const uploadToImgbb = async (base64Image) => {
    const API_KEY = "2f3234056c596077891ff9513647bd85";
      Constants.expoConfig?.extra?.IMGBB_API_KEY || "PUT_YOUR_IMGBB_API_KEY";
    const endpoint = `https://api.imgbb.com/1/upload?key=${API_KEY}`;

    const form = new FormData();
    form.append("image", base64Image);

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: form,
    });

    const json = await res.json();
    if (!json.success) {
      throw new Error(json?.error?.message || "imgbb upload error");
    }
    return json.data.url;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar backgroundColor="#3A5A1B" barStyle="light-content" />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#3A5A1B" barStyle="light-content" />
      <KeyboardAvoidingKeyboardWrap>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            {/* Avatar + Change Photo */}
            <View style={{ alignItems: "center", marginBottom: 16 }}>
              <Image
                source={
                  profile.photoUrl
                    ? { uri: profile.photoUrl }
                    : { uri: "https://i.ibb.co/9bQf3rW/placeholder-profile.png" }
                }
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  borderWidth: 1,
                  borderColor: "#ccc",
                }}
              />
              <TouchableOpacity
                style={[styles.btnGreen, { marginTop: 12, minWidth: 160 }]}
                onPress={pickAndUploadAvatar}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator />
                ) : (
                  <Text style={styles.btnGreenText}>Change Photo</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Fields */}
            <LabeledBox label="First name">
              <TextInput
                value={editing ? draft.firstName : profile.firstName}
                onChangeText={(t) =>
                  editing && setDraft((p) => ({ ...p, firstName: t }))
                }
                editable={editing}
                autoCapitalize="words"
              />
            </LabeledBox>

            <LabeledBox label="Last name">
              <TextInput
                value={editing ? draft.lastName : profile.lastName}
                onChangeText={(t) =>
                  editing && setDraft((p) => ({ ...p, lastName: t }))
                }
                editable={editing}
                autoCapitalize="words"
              />
            </LabeledBox>

            <LabeledBox label="Student ID">
              <TextInput
                value={editing ? draft.studentId : String(profile.studentId || "")}
                onChangeText={(t) =>
                  editing && setDraft((p) => ({ ...p, studentId: t }))
                }
                editable={editing}
                keyboardType="number-pad"
              />
            </LabeledBox>

            <LabeledBox label="Email">
              <TextInput editable={false} value={profile.email} />
            </LabeledBox>

            {/* Buttons */}
            {!editing ? (
              <>
                <TouchableOpacity style={styles.btnGreen} onPress={startEdit}>
                  <Text style={styles.btnGreenText}>Edit Profile</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.btnGray} onPress={handleSignOut}>
                  <Text style={styles.btnGrayText}>Sign out</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.btnGreen} onPress={handleGoToSplash}>
                  <Text style={styles.btnGreenText}>Go to Splash</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={{ gap: 10 }}>
                <TouchableOpacity
                  style={[styles.btnGreen, { opacity: saving ? 0.7 : 1 }]}
                  onPress={saveEdit}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.btnGreenText}>Save</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.btnGray} onPress={cancelEdit}>
                  <Text style={styles.btnGrayText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingKeyboardWrap>
    </SafeAreaView>
  );
}

/** ---------- Helpers (UI wrappers) ---------- */
function KeyboardAvoidingKeyboardWrap({ children }) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: "padding", android: undefined })}
      keyboardVerticalOffset={Platform.select({ ios: 64, android: 0 })}
      style={{ flex: 1 }}
    >
      {children}
    </KeyboardAvoidingView>
  );
}

function LabeledBox({ label, children }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ marginBottom: 6, color: "#3A5A1B", fontWeight: "600" }}>
        {label}
      </Text>
      <View style={styles.displayBox}>{children}</View>
    </View>
  );
}
