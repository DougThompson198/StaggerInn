import { initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  setPersistence,
  signInAnonymously,
  signOut,
} from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  updateDoc,
} from "firebase/firestore";

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
export const db = getFirestore(app);

setPersistence(auth, browserLocalPersistence);

export async function signInWithPassword(password) {
  if (password !== "Temagami198") {
    throw new Error("Incorrect password");
  }
  const result = auth.currentUser
    ? { user: auth.currentUser }
    : await signInAnonymously(auth);
  const token = await result.user.getIdToken();
  localStorage.setItem("cabin_token", token);
  return { user: result.user, token };
}

export async function signOutPassword() {
  localStorage.removeItem("cabin_token");
  await signOut(auth);
}

function bookingFromDoc(snapshot) {
  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

export async function listBookings() {
  const snapshot = await getDocs(collection(db, "bookings"));
  return snapshot.docs
    .map(bookingFromDoc)
    .sort((a, b) => (a.check_in || "").localeCompare(b.check_in || ""));
}

export async function createBooking(payload) {
  const now = new Date().toISOString();
  const docRef = await addDoc(collection(db, "bookings"), {
    ...payload,
    created_at: now,
    updated_at: now,
  });
  return { id: docRef.id, ...payload, created_at: now, updated_at: now };
}

export async function updateBooking(id, payload) {
  const updated_at = new Date().toISOString();
  await updateDoc(doc(db, "bookings", id), { ...payload, updated_at });
  return { id, ...payload, updated_at };
}

export async function deleteBooking(id) {
  await deleteDoc(doc(db, "bookings", id));
}
