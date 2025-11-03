import React, { useState } from "react";
import {
  View,
  Text,
  StatusBar,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { styles } from "../styles/RegisterScreenStyle";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { auth, db } from "../firebase/firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import {
  doc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  limit,
} from "firebase/firestore";
function InputBox({
  placeholder,
  secureTextEntry = false,
  value,
  onChangeText,
  keyboardType = "default",
  autoCapitalize = "sentences",
}) {
  return (
    <View style={styles.inputContainer}>
      <TextInput
        placeholder={placeholder}
        style={styles.input}
        placeholderTextColor="#888"
        secureTextEntry={secureTextEntry}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

function Btn({ text, onPress, disabled }) {
  return (
    <TouchableOpacity
      style={[styles.btn, disabled && { opacity: 0.6 }]}
      onPress={onPress}
      disabled={disabled}
    >
      {disabled ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.btnText}>{text}</Text>
      )}
    </TouchableOpacity>
  );
}
export default function RegisterScreen({ navigation }) {
  const LOGO_IMG = { uri: "https://i.ibb.co/yyzQ43h/KU-Logo-PNG.png" };

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedUsername || !trimmedEmail || !trimmedPassword || !trimmedConfirm) {
      Alert.alert("กรอกข้อมูลไม่ครบ", "กรุณากรอกทุกช่องให้ครบถ้วน");
      return;
    }

    if (trimmedPassword !== trimmedConfirm) {
      Alert.alert("รหัสผ่านไม่ตรงกัน", "กรุณายืนยันรหัสผ่านให้ตรงกับรหัสผ่านหลัก");
      return;
    }

    try {
      setLoading(true);

      const existing = await getDocs(
        query(
          collection(db, "users"),
          where("username", "==", trimmedUsername),
          limit(1)
        )
      );

      if (!existing.empty) {
        Alert.alert("ชื่อผู้ใช้ซ้ำ", "กรุณาเลือกชื่อผู้ใช้อื่น");
        return;
      }

      const cred = await createUserWithEmailAndPassword(
        auth,
        trimmedEmail,
        trimmedPassword
      );
      const uid = cred.user.uid;

      const role = trimmedUsername.toLowerCase() === "admin" ? "admin" : "customer";

      await setDoc(doc(db, "users", uid), {
        username: trimmedUsername,
        email: trimmedEmail,
        role,
      });

      Alert.alert("สำเร็จ", "สมัครสมาชิกเรียบร้อย");
      navigation.replace("Login");
    } catch (err) {
      console.log("Register error:", err);
      Alert.alert("สมัครไม่สำเร็จ", err?.message ?? "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };


  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#EEFCDC" }}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={26} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Register</Text>
      </View>

      {/* Content */}
      <View style={styles.container}>
        <View style={styles.box}>
          <View style={styles.logoLayout}>
            <Image source={LOGO_IMG} style={styles.logo} />
            <Text style={styles.logoText}>Registration</Text>
          </View>

          <InputBox
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
          <InputBox
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <InputBox
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />
          <InputBox
            placeholder="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          <Btn text="Register" onPress={handleRegister} disabled={loading} />
          <Btn text="Cancel" onPress={() => navigation.goBack()} />
        </View>
      </View>
    </SafeAreaView>
  );
}
