import React from "react";
import { View, Image, StyleSheet, TouchableOpacity, StatusBar } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons"; // ✅ ใช้แบบ named import เดียวกัน
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItemList,
} from "@react-navigation/drawer";

import HomeScreen from "../screen/HomeScreen";
import CartScreen from "../screen/Cart";
import ProfileScreen from "../screen/ProfileScreen";
import FriendScreen from "../screen/FriendScreen";
import ChangePasswordScreen from "../screen/ChangePasswordScreen";

const Drawer = createDrawerNavigator();

export default function MainDrawer() {
  const LOGO_IMG = { uri: "https://i.ibb.co/yyzQ43h/KU-Logo-PNG.png" };

  const CustomDrawerContent = (props) => (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={{ paddingTop: 0, backgroundColor: "#F4F8F2" }}
    >
      <View style={styles.logoContainer}>
        <Image source={LOGO_IMG} style={styles.logo} />
      </View>
      <DrawerItemList {...props} />
    </DrawerContentScrollView>
  );

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
          drawerActiveTintColor: "#3A5A1B",
          drawerInactiveTintColor: "#999",
          drawerActiveBackgroundColor: "#E6F1E1",
          drawerLabelStyle: { fontSize: 16 },
          drawerStyle: {
            width: 220,
            backgroundColor: "#F4F8F2",
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
                color={focused ? "#3A5A1B" : "#999"}
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
                color={focused ? "#3A5A1B" : "#999"}
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
                name="list-circle"
                size={focused ? size + 2 : size}
                color={focused ? "#3A5A1B" : "#999"}
              />
            ),
          }}
        />

        <Drawer.Screen
          name="Change Password"
          component={ChangePasswordScreen}
          options={{
            drawerIcon: ({ color, size, focused }) => (
              <MaterialCommunityIcons
                name="content-save-edit-outline"
                size={focused ? size + 2 : size}
                color={focused ? "#3A5A1B" : "#999"}
              />
            ),
          }}
        />

        <Drawer.Screen
          name="My Friend"
          component={FriendScreen}
          options={{
            drawerIcon: ({ color, size, focused }) => (
              <MaterialCommunityIcons
                name="heart-plus-outline"
                size={focused ? size + 2 : size}
                color={focused ? "#3A5A1B" : "#999"}
              />
            ),
          }}
        />
      </Drawer.Navigator>
    </>
  );
}

const styles = StyleSheet.create({
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
});
