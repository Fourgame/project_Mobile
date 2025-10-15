import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase/firebaseConfig";
import { styles } from "../styles/ForgotPasswordScreenStyle";

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState("");

  const handleSendReset = async () => {
    const trimmed = email.trim();
    if (!trimmed) return Alert.alert("Missing email", "Please enter your email.");

    try {
      await sendPasswordResetEmail(auth, trimmed);
      Alert.alert(
        "Email sent",
        "A password reset link has been sent to your email. Please check your inbox (and spam).",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (e) {
      const code = e?.code || "";
      if (code === "auth/invalid-email")
        Alert.alert("Invalid email", "Please enter a valid email address.");
      else if (code === "auth/user-not-found")
        Alert.alert("Not found", "No account found with that email.");
      else if (code === "auth/network-request-failed")
        Alert.alert("Network error", "Please check your connection.");
      else
        Alert.alert("Failed", "Could not send reset email. Try again later.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#3A5A1B" barStyle="light-content" />
      <View style={styles.container}>
        <Text style={styles.title}>Forgot Password</Text>

        <TextInput
          placeholder="Enter your email"
          placeholderTextColor="#777"
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
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
