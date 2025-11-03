import React from "react";
import { View, Text, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 16, color: "#333" }}>
          Welcome to Home Screen!
        </Text>
      </View>
    </SafeAreaView>
  );
}
