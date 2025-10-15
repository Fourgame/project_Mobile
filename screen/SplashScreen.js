import React, { useEffect } from "react";
import { View, Text, ImageBackground } from "react-native";
import { styles } from "../styles/SplashScreenStyles";

export default function SplashScreen({ navigation, route }) {
  const BG_IMG = { uri: "https://i.ibb.co/C1L3wSC/13186366-5125962.jpg" };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (route?.params?.from === "Profile") {
        navigation.goBack();
      } else {
        navigation.replace("Login");
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [navigation, route]);

  return (
    <View style={styles.container}>
      <ImageBackground source={BG_IMG} resizeMode="cover" style={styles.image}>
        <Text style={styles.text}>I love</Text>
        <Text style={styles.text}>React-Native</Text>
      </ImageBackground>
    </View>
  );
}
