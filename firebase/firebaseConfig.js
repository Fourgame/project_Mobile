// Import the functions you need from the SDKs you need
import { getApp, getApps, initializeApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBx_YA8BJV662-9TblV3_FerIh9NLChkkg",
  authDomain: "mobile-2025-9ebe4.firebaseapp.com",
  projectId: "mobile-2025-9ebe4",
  storageBucket: "mobile-2025-9ebe4.firebasestorage.app",
  messagingSenderId: "255215107877",
  appId: "1:255215107877:web:8e67da8fe029271408e4cc"
};




const app = getApps().length ? getApp() : initializeApp(firebaseConfig);


let auth;
try {

  auth = getAuth(app);
} catch (e) {

}
if (!auth || !auth.app) {
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (e) {
    auth = getAuth(app);
  }
}

const db = getFirestore(app);

export { app, auth, db };