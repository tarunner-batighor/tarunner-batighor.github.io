# 🔧 তারুণ্যের বাতিঘর — User Account & Notification System: Setup Guide

## বর্তমান অবস্থা (26 Aug 2026)

| কাজ | অবস্থা |
|---|---|
| Google Login চালু | ✅ হয়ে গেছে |
| Web Push certificate + public key কোডে | ✅ হয়ে গেছে |
| v8 কোড (Bell, Profile, My Posts, Reject) | ✅ লাইভ |
| নতুন Security Rules deploy | ✅ লাইভ |
| GitHub Actions "Push Notifier" (প্রতি ৫ মিনিটে) | ✅ active |
| **Service account key তৈরি** | ⏳ **আপনার কাজ (৩ মিনিট, ফ্রি, কার্ড লাগবে না)** |
| **GitHub secret-এ key বসাতে** | ⏳ **আপনার কাজ (২ মিনিট, ফ্রি)** |

> 💡 এই সেটআপে **Blaze plan লাগবে না, কোনো টাকা লাগবে না, কার্ড লাগবে না।**
> Bell-এ notification **তৎক্ষণাৎ** আসবে, ফোনে push **৫ মিনিটের মধ্যে** আসবে।

---

## আপনার কাজ ১ — Service account key তৈরি (ফ্রি)

1. এই লিংক খুলুন:
   **https://console.firebase.google.com/project/tarunner-batighor/projectsettings/serviceaccounts**
2. নিচে **"Generate new private key"** বোতাম চাপুন
3. একটি **JSON file download** হবে (নাম হবে `tarunner-batighor-XXXXX.json`)
4. সেটা **text editor-এ খুলুন** (Notepad/Any Note app) → **সব select করে copy** করুন
   (copy করলেই হয়, file টা রাখে দরকার নেই — পরে চাইলে ফাইলটাও ডিলিট করতে পারেন)

> ⚠️ এই key টা **secret** — শুধু নিচের কাজ ২-তে ব্যবহার হবে, অন্য কোথাও দিবেন না।

## আপনার কাজ ২ — GitHub secret-এ বসান (ফ্রি)

1. এই লিংক খুলুন:
   **https://github.com/tarunner-batighor/tarunner-batighor.github.io/settings/secrets/actions**
2. **"New repository secret"** বোতাম চাপুন
3. **Name**-এ লিখুন (একদম ঠিক, বড়-ছোট হাত অক্ষর একই):
   ```
   FIREBASE_SERVICE_ACCOUNT
   ```
4. **Value**-এ কাজ ১-এ copy করা JSON টা **paste** করুন
5. **"Add secret"** চাপুন

সম্পন্ন! 🎉

---

## ✅ তারপর টেস্ট করবেন

1. 📱 ফোনে সাইট → Profile → Google login → "🔔 Push Notification চালু করুন"
2. ＋ বাটনে একটা ছোট পোস্ট জমা দিন
3. Admin panel-এ গিয়ে পোস্টটি **Publish** করুন
4. দেখুন:
   - 🔔 **Bell-এ** তৎক্ষণাৎ notification
   - 📱 **ফোনে** push notification (৫ মিনিটের মধ্যে)
5. একইভাবে **Reject** টেস্ট করুন

### Push না আসলে
- [ ] কাজ ১-২ সঠিকভাবে হয়েছে? (Name: `FIREBASE_SERVICE_ACCOUNT` — ঠিক লেখা?)
- [ ] GitHub repo → **Actions** tab-এ "Push Notifier" চলেছে কিনা দেখুন
- [ ] ফোনের Settings-এ সাইটের notification চালু আছে?
- [ ] iOS হলে Add to Home Screen করা হয়েছে?

---

## (ঐচ্ছিক) ভবিষ্যতে: Instant push চাইলে

এখন ফোনে push-এ সর্বোচ্চ **৫ মিনিট** delay থাকতে পারে। এটা **০ মিনিটে** (তৎক্ষণাৎ)
করতে চাইলে Firebase-এ **Blaze plan** নিতে হবে (Cloud Function deploy-এর জন্য)।
কোড পুরোপুরি রেডি আছে (`functions/index.js`) — Blaze নিলে শুধু
`firebase deploy --only functions` করলেই হবে, বাকি কিছু বদলাতে হবে না।

---

## 📦 এই system-এ যা যা আছে

| ফিচার | বিবরণ |
|---|---|
| 🔵 Google Login | যেকোনো Google account |
| 🪪 User Identity | প্রতিটি পোস্টে authorUid+name+email |
| 📝 আমার পোস্ট | Pending/Published/Rejected status |
| 🔔 Notification Bell | unread count + history + সব পঠিত |
| 📲 FCM Web Push | accept/reject করলেই ফোনে (site বন্ধ অবস্থায়ও) |
| 🖥️ Admin | Reject বাটন + লেখকের নাম/email |
| 🛡️ Security Rules | কেউ অন্যের data দেখতে পারবে না |
| ⚙️ Push pipeline | admin write → GitHub Actions → FCM (৫ মিনিট) / Cloud Function (instant, Blaze-এ) |

### নিরাপত্তা নোট
- Service account key শুধু GitHub-এর **encrypted secret**-এ — কোডে, frontend-এ নাকি chat-এ কোথাও না
- VAPID private key শুধু Firebase-এ — frontend-এ শুধু public key
- প্রতিটি user শুধু নিজের data access করে (security rules)

---

# 🛡️ Moderator System (28 Aug 2026 — v4)

এখন আর শুধু Admin-একাই পোস্ট মডারেট করবেন না — **একাধিক Moderator**
যোগ করা যাবে।

## Roles কেমন কাজ করে?

| Role | কী করতে পারবে |
|---|---|
| **Admin** (আপনি) | সবকিছু: পোস্ট edit/publish/reject/delete, comment moderation, **moderator যোগ/বাতিল**, notification |
| **Moderator** | পোস্ট **edit / publish / reject**, comment moderation, notification। **Delete (চিরতরে মুছা) আর moderator ম্যানেজমেন্ট পারবে না** |
| **User** (Google login) | পোস্ট জমা (pending), reaction, comment |

Role Firestore-এর `users/{uid}` doc-এর `role` field-এ থাকে।
**Security:** কেউ নিজে নিজে `role` field বদলাতে বা যুক্ত করতে পারবে না
(rules-এ block) — শুধু Admin Panel-এর Moderators tab থেকে বদলায়।

## নতুন rules লাইভ করা (একবারই, ১ মিনিট)

1. https://console.firebase.google.com/project/tarunner-batighor/firestore/rules খুলুন
2. Rules editor-এর পুরনো rules **সব select করে delete**
3. এই repo-র `firestore.rules` file-এর পুরো contents paste করুন
4. **Publish** চাপুন

> ⚠️ Publish-এর পরপরই নতুন নিয়ম সব device-এ enforce হবে।

## Moderator যোগ করা (Admin login-এ)

1. সাইট-এ 🔐 Admin Panel খুলুন (আপনার email+password দিয়ে login)
2. **👥 Moderators** tab-এ যান
3. "নতুন Moderator যোগ করুন" box-এ তার **email** লিখে 🔎 খুঁজুন
   - ⚠️ ইউজারকে আগে সাইটে **Google দিয়ে একবার login** করতে হবে
4. **✅ মোডারেটর বানান** button চাপুন

## Moderator-এর পুরো flow

1. Moderator সাইটে **Google login** করে (সাধারণ user-দের মতোই)
2. 🔐 Admin Panel button-এ click করলেই — password লাগবে না —
   **🛡️ Moderator Panel** খুলবে
3. Pending পোস্ট-এ ✏️ Edit / ✅ Publish / 🚫 Reject — সব কাজ হবে
4. Published পোস্ট-এর নিচে দেখা যাবে:
   - `🛡️ [যে Moderation-এর হাত দিয়ে publish হয়েছে]`
   - `✏️ [সর্বশেষ edit করেছে]`

## নতুন ডেটা fields (স্বয়ংক্রিয়, কিছু করবেন না)

| Field | কোথায় | কী মানে |
|---|---|---|
| `role` | `users/{uid}` | `"moderator"` (নেই = সাধারণ user) |
| `moderatedBy` | `Posts/{id}` | কার নাম/email-এ publish/reject হলো |
| `lastEditedBy` | `Posts/{id}` | সর্বশেষ edit-এর নাম |
| `lastEditedAt` | `Posts/{id}` | edit-এর সময় |

## Note

- Moderator-এর access বাতিল করলে সে তার device-এ page **refresh**
  করলেই panel বন্ধ হয়ে যাবে (role check প্রতি login-এ হয়)
- `functions/index.js` (Cloud Function) এই feature-এর জন্য **বদলাতে হবে
  না** — সেটা status change trigger-এ push পাঠায়, কীভাবে approval
  হলো তাতে তার ধরবার কিছু নেই

---

# 👥 Team System — v5 (28 Aug 2026)

v4-এর ওপর নতুন ৫টা feature — কোড লাইভ, **কিন্তু নতুন rules-এ
Firebase-এ Publish করতে হবে** (নিচে দেওয়া আছে)।

## নতুন যা যা আছে

| নতুন feature | কীভাবে কাজ করে |
|---|---|
| 🟢🔴 **সক্রিয় / নিষ্ক্রিয়** | Moderators tab-এ প্রতি জনের পাশে **🔴 নিষ্ক্রিয় করুন** button। নিষ্ক্রিয় করলে সে আর Moderator Panel খুলতে পারবে না (refresh-এই বন্ধ)। পরে **🟢 সক্রিয় করুন** চাপলেই আবার চালু। নিজে নিজে আবার চালু করা যাবে না (rules-এ block) |
| 🚫 **Reject-এর কারণ** | Reject চাপলে এখন একটি box আসবে — কারণ **এককথায় লেখা যাবে**। কারণ দিলে লেখকের notification-এ ও পোস্টের `rejectReason`-এ সেটা থাকবে; না দিলে আগের মতোই simple reject |
| ⏳ **কিছু একাধিক Moderator একসাথে কাজ করলে** | কেউ কোনো pending পোস্ট-এ Edit চাপলে সে পোস্টে **⏳ Currently being reviewed by [নাম]** badge দিবে (১০ মিনিটের জন্য)। নিজের হলে নীল: "আপনি এই পোস্টটি review করছেন"। Publish/Reject/Edit শেষে badge বাদ |
| 📜 **History tab** | Admin ও Moderator দুজনেরই panel-এ **📜 History** tab — কারা কবে কোন পোস্ট Publish / Reject / Edit করেছে (সর্বশেষ ৩০টা)। Reject-এর কারণ থাকলে সেটাও দেখা যাবে |
| 🔔 **Admin-কে activity notification** | কোনো Moderator publish/reject/edit করলে Main Admin-এর **Bell-এ** notification যায় ("🛡️ [নাম] Published করেছেন: ...") |

## ⚠️ এখন করুন — নতুন rules Publish (১ মিনিট)

1. https://console.firebase.google.com/project/tarunner-batighor/firestore/rules
2. পুরনো rules সব select করে **delete**
3. **এই raw link-এর** contents paste করুন:
   https://raw.githubusercontent.com/tarunner-batighor/tarunner-batighor.github.io/main/firestore.rules
   (repo-র `firestore.rules` file — v5)
4. **Publish** চাপুন

> ⚠️ Rules **চ্যাট থেকে copy করবেন না** — chat `&&`-কে `&amp;&amp;`
> করে ফেলে, তাহলে rules ভুল হবে। শুধু **raw link** থেকে।

## নতুন ডেটা fields (স্বয়ংক্রিয়)

| Field | কোথায় | কী মানে |
|---|---|---|
| `active` | `users/{uid}` | `false` = নিষ্ক্রিয় moderator (নেই/true = সক্রিয়) |
| `rejectReason` | `Posts/{id}` | reject-এর কারণ (দিলে) |
| `reviewedBy` / `reviewedAt` | `Posts/{id}` | এখন কে review করছে (soft marker) |
| `config/mainAdmin` | `config` | Admin-এর uid/email — activity notification পাঠানোর জন্য |
| `modActivity` | collection | প্রতি publish/reject/edit-এর log entry |

## সীমাবদ্ধতা (জানিয়ে রাখা)

- **ফোনে push notification** Moderator-এর কাজের জন্য যায় না —
  শুধু Admin-এর **Bell-এ** (site-এর ভিতরে) যায়। কারণ: ফোনের push
  title-এ "পোস্ট অনুমোদিত/অনুমোদিত হয়নি" লেখা থাকে (লেখকের জন্য),
  তাই admin activity-তে ভুল title দেখিয়ে যেত। ভবিষ্যতে চাইলে
  আলাদা title type যোগ করা যাবে
- **প্রতি Moderator-এ আলাদা permission** (যেমন: কেউ শুধু Reject
  পারবে) — এখন করা হয়নি। এখন moderator-এর ক্ষমতা সমান (edit +
  publish + reject), সাথে active/inactive switch। চাইলে পরে
  field-ভিত্তিক permission যোগ করা যাবে
- **⏳ review badge** soft hint — ১০ মিনিট পর নিজে থেকে লুকায়,
  দুজনকে একই পোস্ট ধরে রাখার জন্য hard lock নয়
- **History** শেষ ৩০টা activity দেখায় (পুরনোটা log-এই থাকে,
  শুধু তালিকায় ৩০টার বেশি দেখানো হয় না)
