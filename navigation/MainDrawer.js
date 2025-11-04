import React from "react";
import {
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Text,
} from "react-native";
import { Ionicons } from "@expo/vector-icons"; // ✅ ใช้แบบ named import เดียวกัน
import { signOut } from "firebase/auth";
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItemList,
} from "@react-navigation/drawer";

import HomeScreen from "../screen/HomeScreen";
import CartScreen from "../screen/Cart";
import ProfileScreen from "../screen/ProfileScreen";
import { auth } from "../firebase/firebaseConfig";

const Drawer = createDrawerNavigator();

export default function MainDrawer() {
  const LOGO_IMG = { uri: "https://i.ibb.co/yyzQ43h/KU-Logo-PNG.png" };

  const CustomDrawerContent = (props) => {
    const handleLogout = async () => {
      try {
        await signOut(auth);
      } catch (error) {
        // no-op: navigation still proceeds even if already signed out
      }
      props.navigation.closeDrawer();
      const rootNavigation = props.navigation.getParent();
      if (rootNavigation) {
        rootNavigation.reset({
          index: 0,
          routes: [{ name: "Login" }],
        });
      } else {
        props.navigation.navigate("Login");
      }
    };

    return (
      <View style={styles.drawerContainer}>
        <DrawerContentScrollView
          {...props}
          contentContainerStyle={styles.drawerContent}
        >
          <View style={styles.logoContainer}>
            <Image source={LOGO_IMG} style={styles.logo} />
          </View>
          <DrawerItemList {...props} />
        </DrawerContentScrollView>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="exit-outline" size={22} color="#fff" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      <Drawer.Navigator
        initialRouteName="Home"
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={({ navigation }) => ({
          headerStyle: { backgroundColor: "#fff" },
          headerTintColor: "#0C7FDA",
          headerTitleAlign: "center",
          headerTitleStyle: { color: "#0C7FDA" },
          drawerActiveTintColor: "#fff",
          drawerInactiveTintColor: "#fff",
          drawerActiveBackgroundColor: "rgba(255, 255, 255, 0.15)",
          drawerLabelStyle: { fontSize: 16 },
          drawerItemStyle: {
            borderRadius: 8,
            marginHorizontal: 12,
            paddingHorizontal: 4,
          },
          drawerStyle: {
            width: 220,
            backgroundColor: "#031C30",
          },
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => navigation.toggleDrawer()}
              style={{ marginLeft: 16 }}
            >
              <Ionicons name="menu" size={26} color="#0C7FDA" />
            </TouchableOpacity>
          ),
        })}
      >
        <Drawer.Screen
          name="Home"
          component={HomeScreen}
          options={{
            drawerIcon: ({ color, size, focused }) => (
              <Ionicons
                name="home"
                size={focused ? size + 2 : size}
                color={color}
              />
            ),
          }}
        />

        <Drawer.Screen
          name="Cart"
          component={CartScreen}
          options={{
            drawerIcon: ({ color, size, focused }) => (
              <Ionicons
                name="cart"
                size={focused ? size + 2 : size}
                color={color}
              />
            ),
          }}
        />

        <Drawer.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          drawerIcon: ({ color, size, focused }) => (
            <Ionicons
                name="person"
                size={focused ? size + 2 : size}
                color={color}
              />
          ),
          }}
        />

      </Drawer.Navigator>
    </>
  );
}

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    backgroundColor: "#031C30",
    paddingBottom: 24,
  },
  drawerContent: {
    flexGrow: 1,
    paddingTop: 0,
    backgroundColor: "#031C30",
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 50,
    marginBottom: 10,
  },
  logo: {
    width: 90,
    height: 90,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "rgba(133, 151, 171, 0.9)",
  },
  logoutText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
    marginLeft: 12,
  },
});
