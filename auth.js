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
  signInWithRedirect,
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

/* popup-এ সমস্যা হলে (mobile-এ ব্রিটিশ) redirect flow-এ চলে যায়
   — redirect-ই mobile-এ সবচেয়ে reliable */
const POPUP_FALLBACK_CODES = new Set([
  "auth/popup-blocked",
  "auth/cancelled-popup-request",
  "auth/operation-not-supported-in-this-environment",
  "auth/timeout",
  "auth/internal-error",
  "auth/network-request-failed"
]);

export function googleSignIn() {
  return signInWithPopup(auth, googleProvider).catch(function (err) {
    if (err && err.code && POPUP_FALLBACK_CODES.has(err.code)) {
      console.info(
        "Popup failed (" + err.code + ") — redirect flow try korho..."
      );
      return signInWithRedirect(auth, googleProvider);
    }
    throw err;
  });
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

/* Login error hint (Bengali): err.code -> user-friendly message */
const LOGIN_ERR_HINTS = {
  "auth/unauthorized-domain": "এই ডোমেইনটি Firebase-এ authorized নয় - অ্যাডমিনকে জানান।",
  "auth/operation-not-allowed": "এই Firebase project-এ Google Sign-In চালু নেই - অ্যাডমিনকে জানান।",
  "auth/popup-blocked": "ব্রাউজার popup ব্লক করেছে - ব্রাউজার settings-এ popup allow করুন।",
  "auth/cancelled-popup-request": "Login window বন্ধ হয়ে গেছে - আবার চেষ্টা করুন।",
  "auth/timeout": "Login-এর সময় শেষ - আবার চেষ্টা করুন।",
  "auth/network-request-failed": "ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।",
  "auth/too-many-requests": "অনেকবার চেষ্টা হয়েছে - ৫ মিনিট পর আবার চেষ্টা করুন।",
  "auth/account-exists-with-different-credential": "এই Google account আগে অন্যভাবে use হয়েছে।",
  "auth/invalid-credential": "ভুল তথ্য দেওয়া হয়েছে - আবার চেষ্টা করুন।",
  "auth/invalid-api-key": "Firebase config-এ সমস্যা - অ্যাডমিনকে জানান।"
};

export function loginErrHint(err) {
  const code = (err && err.code) || "";
  return LOGIN_ERR_HINTS[code] || "আবার চেষ্টা করুন।";
}

export { auth, db };
