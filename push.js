// @ts-nocheck
/* =========================
   তারুণ্যের বাতিঘর — Push Notification Module
   Firebase Cloud Messaging (Web Push)
   - Device token Firestore-এ সেভ (users/{uid}/pushTokens)
   - এক user-র অনেক device/token handle হয়
   - Site বন্ধ থাকলেও browser notification পৌঁছায় (service worker)

   ⚠️ SETUP: নিচের VAPID_PUBLIC_KEY এ Firebase Console থেকে
   যুগল public key বসাতে হবে (SETUP.md দেখুন)।
   Private key কখনো frontend-এ আসবে না — শুধু Cloud Function-এ।
========================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getMessaging,
  getToken
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db, onAuthChange, currentUser } from "./auth.js";

/* FCM Web Push Certificate-এর PUBLIC key (public — expose সমস্যা নেই)
   Source: Firebase Console → Project settings → Cloud Messaging
   → Web push certificates (26 Aug 2026-এ generated) */
const VAPID_PUBLIC_KEY = "BCB7NBxX8S1eQDlXQcvG7Tpb--iz80L2-8Fa7Jm4AOEnmv3dx-4H1hEdfSW4nXpgJLXwBy0449owEFFuVHr7TcY";

const app = initializeApp({
  apiKey: "AIzaSyD97ZB_1H6JcZ6MzTHj39uJic3gFqJnH6o",
  authDomain: "tarunner-batighor.firebaseapp.com",
  projectId: "tarunner-batighor",
  storageBucket: "tarunner-batighor.firebasestorage.app",
  messagingSenderId: "494925974714",
  appId: "1:494925974714:web:7f2ec193de3c8ee03b0683",
  measurementId: "G-Y9L1BG62BL"
});

let initialized = false;
let swRegistration = null;

function pushSupported() {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    VAPID_PUBLIC_KEY.indexOf("PASTE_") !== 0
  );
}

export function isPushConfigured() {
  return VAPID_PUBLIC_KEY.indexOf("PASTE_") !== 0;
}

async function saveToken(token) {
  const user = currentUser();
  if (!user || !token) return;
  await setDoc(
    doc(db, "users", user.uid, "pushTokens", token),
    {
      createdAt: new Date().toISOString(),
      lastSeen: new Date().toISOString()
    },
    { merge: true }
  );
}

async function grabToken() {
  if (!pushSupported() || initialized) return null;
  const user = currentUser();
  if (!user) return null;
  initialized = true;

  try {
    swRegistration = await navigator.serviceWorker.ready;
  } catch (e) {
    console.warn("SW ready failed:", e.message);
    return null;
  }

  try {
    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey: VAPID_PUBLIC_KEY,
      serviceWorkerRegistration: swRegistration
    });
    if (token) {
      await saveToken(token);
      console.info("Push token registered");
    }

    messaging.onTokenRefresh(function (newToken) {
      saveToken(newToken).catch(function (e) {
        console.warn("Token refresh save failed:", e.message);
      });
    });

    return token;
  } catch (err) {
    console.warn("getToken failed:", err.message);
    initialized = false; /* retry সম্ভব রাখা */
    return null;
  }
}

/* permission চাই + token register করে */
export async function enablePush() {
  if (!("Notification" in window)) return { ok: false, reason: "unsupported" };
  if (VAPID_PUBLIC_KEY.indexOf("PASTE_") === 0) return { ok: false, reason: "not_configured" };

  let perm = Notification.permission;
  if (perm === "default") {
    perm = await Notification.requestPermission();
  }
  if (perm !== "granted") return { ok: false, reason: "denied" };

  const token = await grabToken();
  return token ? { ok: true, token: token } : { ok: false, reason: "token_failed" };
}

/* Notification-এর বর্তমান status (UI-র জন্য) */
export function pushStatus() {
  if (!("Notification" in window)) return "unsupported";
  if (VAPID_PUBLIC_KEY.indexOf("PASTE_") === 0) return "not_configured";
  return Notification.permission; /* granted | denied | default */
}

/* login হলেই silently token register (permission আগে granted থাকলে) */
onAuthChange(function (user) {
  if (user && Notification.permission === "granted") {
    grabToken().catch(function () {});
  }
});
