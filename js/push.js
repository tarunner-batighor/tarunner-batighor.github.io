// @ts-nocheck
/* ============================================================
   তারুণ্যের বাতিঘর — ওয়েব পুশ (FCM)
   পুরোনো VAPID key + service-worker পাইপলাইন অক্ষত
============================================================ */

import { getMessaging, getToken } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db, onAuthChange, currentUser } from "./fb.js";

const VAPID_PUBLIC_KEY = "BCB7NBxX8S1eQDlXQcvG7Tpb--iz80L2-8Fa7Jm4AOEnmv3dx-4H1hEdfSW4nXpgJLXwBy0449owEFFuVHr7TcY";

let initialized = false;

function supported() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function pushStatus() {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

async function saveToken(token) {
  const user = currentUser();
  if (!user || !token) return;
  await setDoc(doc(db, "users", user.uid, "pushTokens", token), {
    createdAt: new Date().toISOString(),
    lastSeen: new Date().toISOString()
  }, { merge: true });
}

async function grabToken() {
  if (!supported() || initialized) return null;
  const user = currentUser();
  if (!user) return null;
  initialized = true;
  try {
    const reg = await navigator.serviceWorker.ready;
    const messaging = getMessaging();
    const token = await getToken(messaging, { vapidKey: VAPID_PUBLIC_KEY, serviceWorkerRegistration: reg });
    if (token) await saveToken(token);
    return token;
  } catch (e) {
    initialized = false;
    console.warn("push token failed", e);
    return null;
  }
}

export async function enablePush() {
  if (!supported()) return { ok: false, reason: "unsupported" };
  let perm = Notification.permission;
  if (perm === "default") perm = await Notification.requestPermission();
  if (perm !== "granted") return { ok: false, reason: "denied" };
  const token = await grabToken();
  return token ? { ok: true } : { ok: false, reason: "token_failed" };
}

onAuthChange(function (user) {
  if (user && Notification.permission === "granted") grabToken().catch(function () {});
});
