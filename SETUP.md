# 🔧 তারুণ্যের বাতিঘর — User Account & Notification System: Setup Guide

এই system-টা কাজ করতে হলে Firebase Console-এ **৩টা ছোট কাজ** করতে হবে।
কোডের কাজ সব আগেই সম্পন্ন — নিচের steps অনুসরণ করুন।

---

## Step 1 — Google Login চালু করা (২ মিনিট)

1. এই লিংক খুলুন: **https://console.firebase.google.com/project/tarunner-batighor/authentication/providers**
2. উপরের **Sign-in method** (লগইন পদ্ধতি) tab-এ যান
3. **Google**-এ ক্লিক করুন
4. **Enable** বাটনে ক্লিক করুন
5. "Support email for troubleshooting" ঘরে আপনার email দিন
   → `abdulhadibinmasud775@gmail.com`
6. **Save / Configure** চাপুন

> ⚠️ **সবচেয়ে গুরুত্বপূর্ণ:** Admin হিসেবে login করার সময় **একই email**
> (`abdulhadibinmasud775@gmail.com`) দিয়ে Google login করুন।
> নতুন নিরাপত্তা নিয়মে এই email-ই Admin আছেন — অন্য কোনো email দিয়ে
> Google login করলে admin power কাজ করবে না।

> ℹ️ আপনার email আগে থেকেই project-এর owner, তাই Google app authorization
> দরকার নেই — সরাসরি কাজ করবে।

---

## Step 2 — Web Push certificate তৈরি করা (৩ মিনিট)

এটাই ফোনে notification পাঠানোর " চাবি "।

1. এই লিংক খুলুন: **https://console.firebase.google.com/project/tarunner-batighor/projectsettings/general**
2. নিচে **Cloud Messaging** section খুঁজুন → **Web push certificates** অংশে
   **Generate key pair** বোতাম চাপুন
3. একটি popup আসবে — এখানে দুটো key থাকবে:
   - **Private key** → "Download" করে আপনার ফোনে/PC-তে **সুরক্ষিত জায়গায়
     রাখুন** (যেমন: Notes বা একটি secure file)। কারো সাথে share করবেন না।
   - **Public key** (দীর্ঘ string, `BN...` দিয়ে শুরু হয়) → **Copy** করুন
4. **Copy করা public key-টা আমাকে chat-এ পাঠিয়ে দিন** — আমি সেটা কোডে বসিয়ে
   দেবো। (Public key sensitive নয়, তাই chat-এ পাঠাতে কোনো সমস্যা নেই)

> ✅ Private key Firebase-এই project-এ সেভ থাকে, তাই push server (Cloud
> Function) সেটা নিজে থেকে ব্যবহার করবে — আপনার কিছু করতে হবে না।

---

## Step 3 — Firebase deploy (Rules + Cloud Function)

এখানে দুটো উপায় আছে — যেকোনো একটি বেছে নিন:

### উপায় A — এখানেই করি (সবচেয়ে সহজ, ~৫ মিনিট)

আমি এই environment-এ আপনার জন্য `firebase login` চালিয়ে **একটা লিংক**
পাঠিয়ে দেবো। আপনি:

1. সেটা ব্রাউজারে খুলবেন (Google account দিয়ে)
2. পর্দায় আসা **authorization code** (একটা ছোট string) copy করে
   আমাকে chat-এ paste করে দেবেন
3. আমি বাকি সব (deploy) নিজে করে দেবো

### উপায় B — নিজের কম্পিউটারে (যদি আলাদা করতে চান)

Terminal-এ (Windows-এ PowerShell / Mac-এ Terminal) লিখুন:

```bash
npm install -g firebase-tools
firebase login
cd tarunner-batighor.github.io     # repo folder-এ যান
firebase deploy
```

সব কিছু (security rules + cloud function) live হয়ে যাবে।

---

## ✅ Test করবেন কীভাবে (deploy শেষে)

1. 📱 ফোনে সাইট খুলুন → ডানদোর ফ্লোটিং মেনু → **Profile (👤) icon** →
   **Google দিয়ে লগইন**
2. Profile-এ **🔔 Push Notification চালু করুন** চাপুন → Permission দিলে
   "✅ Push Notification চালু আছে" দেখাবে
3. উপরের **＋** বাটনে ক্লিক করে একটি ছোট পোস্ট জমা দিন
   (এখন পোস্ট দিতে login বাধ্যতামূলক)
4. Profile → **📝 আমার পোস্ট** → পোস্টটা **⏳ Pending** chip সহ দেখা যাবে
5. 🔍 Admin panel-এ গিয়ে (আপনার admin email দিয়ে) পোস্টটি **Publish** করুন
6. এখন দেখুন:
   - 🔔 **Bell-এ** নতুন notification: "আপনার পোস্টটি অনুমোদিত হয়েছে..."
   - 📱 **ফোনে push notification** — সাইট বন্ধ রেখেও
   - Notification-এ চাপলে সরাসরি সেই পোস্টের পেজে নিয়ে যাবে
7. একইভাবে **Reject** করে দেখুন — "দুঃখিত, আপনার পোস্টটি অনুমোদিত
   হয়নি।" message আসবে

### Push কাজ না করলে চেকলিস্ট
- [ ] Step 2-এ Web Push certificate তৈরি হয়েছে?
- [ ] Public key কোডে বসানো হয়েছে? (`push.js` ফাইল — placeholder থাকবে না)
- [ ] ফোনের Settings → Notifications-এ সাইটের জন্য notification চালু?
- [ ] iOS ব্যবহার করলে: ব্রাউজার থেকে **Add to Home Screen** করা হয়েছে?
  (iOS-এ home screen-এ add করলেই push আসে; সাধারণ browser tab-এ না)
- [ ] Android Chrome — সরাসরি কাজ করে, কিছু লাগবে না

---

## 📦 এই release-এ যা যা আছো

| ফিচার | বিবরণ |
|---|---|
| 🔵 Google Login | যেকোনো Google account দিয়ে login/logout |
| 🪪 User Identity | প্রতিটি পোস্টে authorUid+name+email (admin দেখতে পায়) |
| 📝 আমার পোস্ট | নিজের সব পোস্ট + Pending/Published/Rejected status |
| 🔔 Notification Bell | unread count + history + "সব পঠিত করুন" |
| 📲 FCM Web Push | admin accept/reject করলেই ফোনে (site বন্ধ থাকা অবস্থায়ও) |
| 🖥️ Admin Reject | নতুন **🚫 Reject** বাটন + লেখকের নাম/email pending card-এ |
| 🛡️ নতুন Security Rules | কেউ অন্যের post/notification/token পড়তে পারবে না |
| ☁️ Cloud Function | status change detect করে notification + push পাঠায় |

### নিরাপত্তা নোট
- সব sensitive key (VAPID private, service account) server-side —
  frontend-এ **কোনো sensitive কিছু নেই**
- Security rules-এ প্রতিটি user শুধু নিজের data access করে
- Notification লিখতে পারবে শুধু Cloud Function (user নিজে লিখতে পারবে না)
