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
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
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

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
  if (!firstName || !lastName || !studentId || !email || !password) {
    Alert.alert("กรอกข้อมูลไม่ครบ", "กรุณากรอกทุกช่องให้ครบถ้วน");
    return;
  }

  try {
    setLoading(true);

    // 1) สมัคร user บน Firebase Auth
    const cred = await createUserWithEmailAndPassword(
      auth,
      email.trim(),
      password
    );
    const uid = cred.user.uid;

    // 2) พยายามเขียนข้อมูลผู้ใช้ลง Firestore
    //    แต่ไม่ block flow หลัก (ไม่ await)
    setDoc(doc(db, "users", uid), {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      studentId: studentId.trim(),
      email: email.trim().toLowerCase(),
      createdAt: serverTimestamp(),
    })
      .then(() => {
        console.log("Profile saved to Firestore");
      })
      .catch((err) => {
        console.log("Firestore write failed:", err);
      });

    // 3) ผู้ใช้ถือว่าสมัครสำเร็จแล้ว ณ จุดนี้
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
            placeholder="First Name"
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
          />
          <InputBox
            placeholder="Last Name"
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
          />
          <InputBox
            placeholder="Student ID"
            value={studentId}
            onChangeText={setStudentId}
            keyboardType="number-pad"
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

          <Btn text="Register" onPress={handleRegister} disabled={loading} />
          <Btn text="Cancel" onPress={() => navigation.goBack()} />
        </View>
      </View>
    </SafeAreaView>
  );
}
