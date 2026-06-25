import { initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  signInWithPopup,
  signOut,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyB27yvTXac8DUivuj611CD06WIuz8ad9A0",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "staggerinn-bookings.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "staggerinn-bookings",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "staggerinn-bookings.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "279775182024",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:279775182024:web:a94312dba7ac6856b8f9fd",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-ZPRXQ0GHD1",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

setPersistence(auth, browserLocalPersistence);

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  const token = await result.user.getIdToken();
  localStorage.setItem("cabin_token", token);
  return { user: result.user, token };
}

export async function signOutGoogle() {
  localStorage.removeItem("cabin_token");
  await signOut(auth);
}
