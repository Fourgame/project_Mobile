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
import { auth } from "../firebase/firebaseConfig";

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
        placeholderTextColor="#888"
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
  const LOGO_IMG = {
    uri: "https://i.ibb.co/yyzQ43h/KU-Logo-PNG.png",
  };

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");


  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Missing fields", "Please enter both email and password.");
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      navigation.replace("MainDrawer");
    } catch (error) {
      console.log("Login error:", error);
      Alert.alert("Login Failed", "Wrong username or password");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#EEFCDC" }}>
      <SafeAreaView style={styles.bg}>
        <StatusBar backgroundColor="#EEFCDC" barStyle="dark-content" />
        <View style={styles.box}>
          <Image source={LOGO_IMG} style={styles.logo} />


          <InputBox
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />
          <InputBox
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />


          <Btn text="Sign in" onPress={handleLogin} />
          <Btn text="Sign up" onPress={() => navigation.navigate("Register")} />

          <TouchableOpacity style={styles.forgotText} onPress={() => navigation.navigate("ForgotPassword")}>
            <Text style={styles.forgotText}>Forgot Password ?</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}
