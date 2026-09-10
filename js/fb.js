// @ts-nocheck
/* ============================================================
   তারুণ্যের বাতিঘর — Firebase কোর (v2 প্রিমিয়াম সংস্করণ)
   একই Firebase প্রজেক্ট + একই ডেটাবেস কাঠামো (Posts/Users/...)
============================================================ */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "AIzaSyD97ZB_1H6JcZ6MzTHj39uJic3gFqJnH6o",
  authDomain: "tarunner-batighor.firebaseapp.com",
  projectId: "tarunner-batighor",
  storageBucket: "tarunner-batighor.firebasestorage.app",
  messagingSenderId: "494925974714",
  appId: "1:494925974714:web:7f2ec193de3c8ee03b0683",
  measurementId: "G-Y9L1BG62BL"
};

export const ADMIN_EMAIL = "abdulhadibinmasud775@gmail.com";

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

/* ---------------- Auth state ---------------- */

const state = { user: null, role: "none", ready: false, listeners: new Set() };

onAuthStateChanged(auth, async function (user) {
  state.user = user;
  state.ready = true;

  /* role নির্ধারণ: admin email → admin; নইলে users/{uid}.role */
  let role = "none";
  if (user) {
    if (user.email === ADMIN_EMAIL) role = "admin";
    try {
      const { getDoc } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const d = snap.data();
        if (d.role === "moderator" && d.active !== false) role = role === "admin" ? "admin" : "moderator";
      }
    } catch (e) { /* rules ডিনাই করলে none */ }

    /* প্রথম লগইনে profile doc */
    setDoc(
      doc(db, "users", user.uid),
      {
        name: user.displayName || "",
        email: user.email || "",
        photoURL: user.photoURL || "",
        updatedAt: serverTimestamp()
      },
      { merge: true }
    ).catch(function () {});
  }
  state.role = role;

  state.listeners.forEach(function (cb) {
    try { cb(user, role); } catch (e) { console.error(e); }
  });
});

export function currentUser() { return state.user; }
export function currentRole() { return state.role; }
export function isStaff() { return state.role === "admin" || state.role === "moderator"; }
export function isAdmin() { return state.role === "admin"; }

export function onAuthChange(cb) {
  state.listeners.add(cb);
  if (state.ready) {
    try { cb(state.user, state.role); } catch (e) { console.error(e); }
  }
  return function () { state.listeners.delete(cb); };
}

const POPUP_FALLBACK = new Set([
  "auth/popup-blocked",
  "auth/cancelled-popup-request",
  "auth/operation-not-supported-in-this-environment",
  "auth/timeout",
  "auth/internal-error",
  "auth/network-request-failed"
]);

export function googleSignIn() {
  return signInWithPopup(auth, googleProvider).catch(function (err) {
    if (err && err.code && POPUP_FALLBACK.has(err.code)) {
      return signInWithRedirect(auth, googleProvider);
    }
    throw err;
  });
}

export function logout() { return signOut(auth); }

const LOGIN_ERR_HINTS = {
  "auth/unauthorized-domain": "এই ডোমেইনটি Firebase-এ অনুমোদিত নয় — অ্যাডমিনকে জানান।",
  "auth/operation-not-allowed": "Google সাইন-ইন চালু নেই — অ্যাডমিনকে জানান।",
  "auth/popup-blocked": "ব্রাউজার পপ-আপ ব্লক করেছে — পপ-আপ অনুমতি দিন।",
  "auth/cancelled-popup-request": "লগইন উইন্ডো বন্ধ হয়ে গেছে — আবার চেষ্টা করুন।",
  "auth/timeout": "সময় শেষ — আবার চেষ্টা করুন।",
  "auth/network-request-failed": "ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।",
  "auth/too-many-requests": "অনেকবার চেষ্টা হয়েছে — কিছুক্ষণ পর আবার চেষ্টা করুন।",
  "auth/account-exists-with-different-credential": "এই অ্যাকাউন্ট ভিন্নভাবে যুক্ত আছে।",
  "auth/invalid-credential": "তথ্য সঠিক নয় — আবার চেষ্টা করুন।"
};

export function loginErrHint(err) {
  return LOGIN_ERR_HINTS[(err && err.code) || ""] || "আবার চেষ্টা করুন।";
}
