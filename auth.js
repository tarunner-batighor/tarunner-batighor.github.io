// @ts-nocheck
/* =========================
   তারুণ্যের বাতিঘর — Auth Module
   Google Login + User Identity
   (admin.js-এর email/password admin system
    অক্ষত — এইটা সাধারণ user-এর জন্য)
========================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD97ZB_1H6JcZ6MzTHj39uJic3gFqJnH6o",
  authDomain: "tarunner-batighor.firebaseapp.com",
  projectId: "tarunner-batighor",
  storageBucket: "tarunner-batighor.firebasestorage.app",
  messagingSenderId: "494925974714",
  appId: "1:494925974714:web:7f2ec193de3c8ee03b0683",
  measurementId: "G-Y9L1BG62BL"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

/* ---------------- State ---------------- */

const state = {
  user: null,
  ready: false,
  listeners: new Set()
};

onAuthStateChanged(auth, function (user) {
  state.user = user;
  state.ready = true;
  state.listeners.forEach(function (cb) { try { cb(user); } catch (e) { console.error(e); } });

  /* প্রথম লগইনে profile document তৈরি/আপডেট (merge) */
  if (user) {
    setDoc(
      doc(db, "users", user.uid),
      {
        name: user.displayName || "",
        email: user.email || "",
        photoURL: user.photoURL || "",
        updatedAt: serverTimestamp()
      },
      { merge: true }
    ).catch(function (err) {
      console.warn("Profile upsert failed:", err.message);
    });
  }
});

/* ---------------- Public API ---------------- */

export function currentUser() {
  return state.user;
}

export function authReady() {
  return state.ready;
}

export function googleSignIn() {
  return signInWithPopup(auth, googleProvider);
}

export function logout() {
  return signOut(auth);
}

/* listener register -> unsubscribe ফাংশন ফেরত দেয় */
export function onAuthChange(cb) {
  state.listeners.add(cb);
  if (state.ready) {
    try { cb(state.user); } catch (e) { console.error(e); }
  }
  return function () { state.listeners.delete(cb); };
}

export { auth, db };
