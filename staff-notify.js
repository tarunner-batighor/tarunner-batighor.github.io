// @ts-nocheck
/* ============================================================
   তারুণ্যের বাতিঘর — Staff Notification
   নতুন পোস্ট সাবমিশন আসলে → সব Staff (Admin + Moderator)-কে
   in-site notification (bell-এ) যায়

   MECHANISM:
   - config/staffList: { uids: [...], names: {...} }
     (Admin Panel update করে: admin login-এ + moderators
      tab খুললে — admin.js)
   - fan-out: users/{staffUid}/notifications doc
   - type: 'approved' + submission: true
     (main.js-এ approved → ✅ icon + click-এ পোস্ট খোলে)
   - নিজে যে সাবমিশন করে, তার নিজেকে notification যায় না
   - Security: firestore.rules v5.2 — শুধু staff target,
     authorUid = নিজের uid, shape চেক
   - এই module শুধু admin.js-এর submission flow-এ call হয়;
     ব্যর্থ হলেও submission ভাঙবে না (try/catch সেখানে)
============================================================ */

import { getApps, initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD97ZB_1H6JcZ6MzTHj39uJic3gFqJnH6o",
  authDomain: "tarunner-batighor.firebaseapp.com",
  projectId: "tarunner-batighor",
  storageBucket: "tarunner-batighor.firebasestorage.app",
  messagingSenderId: "494925974714",
  appId: "1:4949259714:web:7f2ec193de3c8ee03b0683",
  measurementId: "G-Y9L1BG62BL"
};

/* আগে initializeApp হয়ে গেলে সেই app reuse (duplicate-app error রোধ) */
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

/* সব staff-কে in-site notification পাঠাও
   (submitter-কে ব্যক্তিত্ব রাখা হয় — নিজে নিজেকে পাঠায় না) */
export async function notifyStaffOfSubmission({
  postId,
  title,
  authorUid,
  authorName,
  category
}) {
  const cfgSnap = await getDoc(doc(db, "config", "staffList"));
  if (!cfgSnap.exists()) {
    return { notified: 0, reason: "staffList not found" };
  }

  const cfg = cfgSnap.data();
  const uids = Array.isArray(cfg.uids) ? cfg.uids : [];
  const targets = uids.filter(function (u) {
    return u && u !== authorUid;
  });

  const safeTitle = String(title || "").slice(0, 150);
  const msg =
    "📥 নতুন লিখা জমা হয়েছে: «" + safeTitle + "»" +
    (authorName ? " — " + String(authorName).slice(0, 60) : "");

  let notified = 0;
  for (const uid of targets) {
    try {
      await addDoc(collection(db, "users", uid, "notifications"), {
        type: "approved",
        submission: true,
        message: msg,
        postId: postId,
        postTitle: String(title || "").slice(0, 300),
        authorUid: authorUid || "",
        category: String(category || ""),
        read: false,
        createdAt: serverTimestamp()
      });
      notified += 1;
    } catch (e) {
      console.warn("staff-notify failed for " + uid + ":", e.message);
    }
  }

  return { notified: notified };
}
