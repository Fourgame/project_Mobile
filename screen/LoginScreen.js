import React, { useState } from "react";
import {
  View,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "../styles/LoginScreenStyles";
import { signInWithEmailAndPassword } from "firebase/auth";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { auth, db } from "../firebase/firebaseConfig";

function InputBox({
  placeholder,
  secureTextEntry = false,
  value,
  onChangeText,
  keyboardType = "default",
}) {
  return (
    <View style={styles.inputContainer}>
      <TextInput
        placeholder={placeholder}
        style={styles.input}
        placeholderTextColor="#97A4BA"
        secureTextEntry={secureTextEntry}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize="none"
      />
    </View>
  );
}

function Btn({ text, onPress }) {
  return (
    <TouchableOpacity style={styles.btn} onPress={onPress}>
      <Text style={styles.btnText}>{text}</Text>
    </TouchableOpacity>
  );
}

export default function LoginScreen({ navigation }) {
  const LOGO_IMG = require("../assets/logo.png");

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");


  const handleLogin = async () => {
    const trimmedIdentifier = identifier.trim();
    if (!trimmedIdentifier || !password) {
      Alert.alert("Missing fields", "Please enter both username/email and password.");
      return;
    }

    try {
      let emailForAuth;
      if (!trimmedIdentifier.includes("@")) {
        const userSnap = await getDocs(
          query(
            collection(db, "users"),
            where("username", "==", trimmedIdentifier),
            limit(1)
          )
        );
        if (userSnap.empty) {
          Alert.alert("Login Failed", "Wrong username or password");
          return;
        }
        const userData = userSnap.docs[0]?.data();
        if (!userData?.email) {
          Alert.alert("Login Failed", "Account has no email associated.");
          return;
        }
        emailForAuth = userData.email;
      } else {
        emailForAuth = trimmedIdentifier.toLowerCase();
      }

      await signInWithEmailAndPassword(auth, emailForAuth, password);
      navigation.replace("MainDrawer");
    } catch (error) {
      console.log("Login error:", error);
      Alert.alert("Login Failed", "Wrong username or password");
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#04162A" barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Image source={LOGO_IMG} style={styles.logo} />
            <Text style={styles.brandText}>NBF</Text>
          </View>

          <View style={styles.form}>
            <InputBox
              placeholder="Email or Username"
              value={identifier}
              onChangeText={setIdentifier}
            />
            <InputBox
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <Btn text="Sign in" onPress={handleLogin} />
            <Btn text="Sign up" onPress={() => navigation.navigate("Register")} />
          </View>

          <TouchableOpacity
            style={styles.forgotButton}
            onPress={() => navigation.navigate("ForgotPassword")}
          >
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}
