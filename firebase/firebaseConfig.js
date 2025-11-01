import { getApp, getApps, initializeApp } from "firebase/app";
import {
  initializeAuth,
  getReactNativePersistence,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBsy4EDl7fwEHh5K5fn_XaQ0RfMaxTkdsY",
  authDomain: "mobile2025-afc6c.firebaseapp.com",
  projectId: "mobile2025-afc6c",
  storageBucket: "mobile2025-afc6c.firebasestorage.app",
  messagingSenderId: "614711073787",
  appId: "1:614711073787:web:1e4fd068fbd788c13e895e",
  measurementId: "G-PHL6SSQTF1",
};

// ป้องกัน init ซ้ำตอน reload
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// ใช้ initializeAuth แบบเดียว (ไม่มี getAuth ตรงไหนเลย)
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// ใช้ Firestore แบบ long-polling เพื่อกันค้าง
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  useFetchStreams: false,
});

console.log("🔥 Firestore initialized with long-polling");

export { app, auth, db };
