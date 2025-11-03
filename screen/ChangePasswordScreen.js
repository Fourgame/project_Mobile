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
import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { auth } from "../firebase/firebaseConfig";
import { styles } from "../styles/ChangePasswordScreenStyle";

export default function ChangePasswordScreen() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleChangePassword = async () => {
    const user = auth.currentUser;
    if (!user) return Alert.alert("Error", "User not logged in.");

    if (!oldPassword || !newPassword || !confirmPassword) {
      return Alert.alert("Error", "Please fill in all fields.");
    }

    if (newPassword !== confirmPassword) {
      return Alert.alert("Error", "New passwords do not match.");
    }

    try {
      const credential = EmailAuthProvider.credential(user.email, oldPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      Alert.alert("Success", "Password updated successfully!");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      Alert.alert("Failed", "Old password incorrect or network error.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      <View style={styles.container}>
        <Text style={styles.title}>Change Password</Text>

        <TextInput
          placeholder="Enter old password"
          secureTextEntry
          value={oldPassword}
          onChangeText={setOldPassword}
          style={styles.input}
          placeholderTextColor="#777"
        />

        <TextInput
          placeholder="Enter new password"
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
          style={styles.input}
          placeholderTextColor="#777"
        />

        <TextInput
          placeholder="Confirm new password"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          style={styles.input}
          placeholderTextColor="#777"
        />

        <TouchableOpacity style={styles.btn} onPress={handleChangePassword}>
          <Text style={styles.btnText}>Confirm Change</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
