// @ts-nocheck
/* =========================
   তারুণ্যের বাতিঘর — Notification Module
   users/{uid}/notifications real-time subscribe
   (unread count + history)
========================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  query,
  orderBy,
  limit,
  onSnapshot,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app = initializeApp({
  apiKey: "AIzaSyD97ZB_1H6JcZ6MzTHj39uJic3gFqJnH6o",
  authDomain: "tarunner-batighor.firebaseapp.com",
  projectId: "tarunner-batighor",
  storageBucket: "tarunner-batighor.firebasestorage.app",
  messagingSenderId: "494925974714",
  appId: "1:494925974714:web:7f2ec193de3c8ee03b0683",
  measurementId: "G-Y9L1BG62BL"
});

const db = getFirestore(app);

/* uid-এর notification list subscribe
   onList(list) + onUnread(count) callback
   ফেরত দেয় unsubscribe ফাংশন */
export function subscribeNotifications(uid, onList, onUnread) {
  const q = query(
    collection(db, "users", uid, "notifications"),
    orderBy("createdAt", "desc"),
    limit(50)
  );

  return onSnapshot(
    q,
    function (snap) {
      const list = snap.docs.map(function (d) {
        return { id: d.id, createdAt: d.data().createdAt, ...d.data() };
      });
      try { onList(list); } catch (e) { console.error(e); }
      try { onUnread(list.filter(function (n) { return !n.read; }).length); } catch (e) { console.error(e); }
    },
    function (err) {
      console.error("Notification subscribe error:", err.message);
      try { onList([]); onUnread(0); } catch (e) {}
    }
  );
}

/* একটি notification read */
export function markNotificationRead(uid, notifId) {
  return updateDoc(doc(db, "users", uid, "notifications", notifId), { read: true });
}

/* সব read */
export async function markAllNotificationsRead(uid, list) {
  const unread = list.filter(function (n) { return !n.read; });
  const batch = [] ;
  for (const n of unread) {
    batch.push(updateDoc(doc(db, "users", uid, "notifications", n.id), { read: true }));
  }
  await Promise.all(batch);
}

export { db };
