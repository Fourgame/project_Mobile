import { getApp, getApps, initializeApp } from "firebase/app";
import {
  initializeAuth,
  getReactNativePersistence,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDd7SMM4Kma0H3wSFArrG3MyrroTewYyQc",
  authDomain: "mobile2025-54503.firebaseapp.com",
  projectId: "mobile2025-54503",
  storageBucket: "mobile2025-54503.firebasestorage.app",
  messagingSenderId: "1070450136759",
  appId: "1:1070450136759:web:9fb9b9834b92981e935f32",
  measurementId: "G-1FVF8BVME4"
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
