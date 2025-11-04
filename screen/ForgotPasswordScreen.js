import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StatusBar,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase/firebaseConfig";
import { styles } from "../styles/ForgotPasswordScreenStyle";

export default function ForgotPasswordScreen({ navigation }) {
  const LOGO_IMG = require("../assets/logo.png");
  const [email, setEmail] = useState("");

  const handleSendReset = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      Alert.alert("Missing email", "Please enter your email.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, trimmed);
      Alert.alert(
        "Email sent",
        "A password reset link has been sent to your email. Please check your inbox (and spam).",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (e) {
      const code = e?.code || "";
      if (code === "auth/invalid-email") {
        Alert.alert("Invalid email", "Please enter a valid email address.");
      } else if (code === "auth/user-not-found") {
        Alert.alert("Not found", "No account found with that email.");
      } else if (code === "auth/network-request-failed") {
        Alert.alert("Network error", "Please check your connection.");
      } else {
        Alert.alert("Failed", "Could not send reset email. Try again later.");
      }
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

          <Text style={styles.title}>Forgot Password?</Text>

          <TextInput
            placeholder="Enter your email"
            placeholderTextColor="#97A4BA"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
          />

          <TouchableOpacity style={styles.btn} onPress={handleSendReset}>
            <Text style={styles.btnText}>Send Reset Link</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backToLoginButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backToLoginText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}
