import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCsLdpgvfeAohf104yyLFHif8OXyVLpmzg",
  authDomain: "raid-soft-reserves.firebaseapp.com",
  projectId: "raid-soft-reserves",
  storageBucket: "raid-soft-reserves.firebasestorage.app",
  messagingSenderId: "367543706711",
  appId: "1:367543706711:web:9c03ee8c7459d1a8492f12",
  measurementId: "G-YNT908134X"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

signInAnonymously(auth)
  .catch(err => console.error("Auth error:", err));
