import 'react-native-gesture-handler';
import 'react-native-reanimated';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from './screen/LoginScreen';
import RegisterScreen from './screen/RegisterScreen';
import MainDrawer from './navigation/MainDrawer'; 
import ForgotPasswordScreen from './screen/ForgotPasswordScreen';
import HomeScreen from './screen/HomeScreen';
import AddScreen from './screen/AddScreen';
import ProductDetail from './screen/ProductDetail';
import OrderSummaryScreen from './screen/OrderSummaryScreen';
import PaymentScreen from './screen/PaymentScreen';
import CategoryItemsScreen from './screen/CategoryItemsScreen';
import { CartProvider } from './context/CartContext';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <CartProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{
              animation: "fade",
              contentStyle: { backgroundColor: "#04162A" },
            }}
          />
          <Stack.Screen
            name="Register"
            component={RegisterScreen}
            options={{
              animation: "fade",
              contentStyle: { backgroundColor: "#04162A" },
            }}
          />
          <Stack.Screen name="MainDrawer" component={MainDrawer} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Add" component={AddScreen} />
          <Stack.Screen name="ProductDetail" component={ProductDetail} />
          <Stack.Screen name="OrderSummary" component={OrderSummaryScreen} />
          <Stack.Screen name="Payment" component={PaymentScreen} />
          <Stack.Screen name="CategoryItems" component={CategoryItemsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </CartProvider>
  );
}
