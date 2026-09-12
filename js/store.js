// @ts-nocheck
/* ============================================================
   তারুণ্যের বাতিঘর — ডেটা লেয়ার (v2)
   Posts / Users / Notifications / Moderators / Activity
   পুরোনো Firestore কাঠামোর সঙ্গে ১০০% সামঞ্জস্যপূর্ণ
============================================================ */

import { db } from "./fb.js";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  increment,
  limit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ---------------- ইউটিলিটি ---------------- */

export function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = String(s == null ? "" : s);
  return d.innerHTML;
}

export function bn(n) {
  try { return Number(n || 0).toLocaleString("bn-BD"); }
  catch (e) { return String(n || 0); }
}

export function tsMs(p) {
  if (!p) return 0;
  if (p.seconds) return p.seconds * 1000 + Math.floor((p.nanoseconds || 0) / 1e6);
  if (typeof p === "number") return p;
  if (p instanceof Date) return p.getTime();
  if (typeof p.toDate === "function") return p.toDate().getTime();
  const t = new Date(p).getTime();
  return isNaN(t) ? 0 : t;
}

export function fmtDate(p) {
  const t = tsMs(p);
  if (!t) return "";
  return new Date(t).toLocaleDateString("bn-BD", { year: "numeric", month: "long", day: "numeric" });
}

export function relTime(p) {
  const t = tsMs(p);
  if (!t) return "";
  const diff = Date.now() - t;
  if (diff < 60000) return "এইমাত্র";
  if (diff < 3600000) return bn(Math.floor(diff / 60000)) + " মিনিট আগে";
  if (diff < 86400000) return bn(Math.floor(diff / 3600000)) + " ঘণ্টা আগে";
  if (diff < 2592000000) return bn(Math.floor(diff / 86400000)) + " দিন আগে";
  return fmtDate(t);
}

export function readingMinutes(content) {
  const words = String(content || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export function makeExcerpt(content, len) {
  const t = String(content || "").replace(/\s+/g, " ").trim();
  if (t.length <= (len || 170)) return t;
  return t.slice(0, len || 170) + "…";
}

/* ---------------- পাবলিক পোস্ট ক্যাশে ---------------- */

let _pubCache = null;
let _pubCacheAt = 0;
const PUB_TTL = 45 * 1000;
let _pubInflight = null;

function norm(id, d) {
  return {
    id: id,
    title: d.title || "",
    content: d.content || "",
    category: d.category || "",
    status: d.status || "",
    authorUid: d.authorUid || "",
    authorName: d.authorName || "",
    authorPenName: d.authorPenName || "",
    authorBio: d.authorBio || "",
    authorEmail: d.authorEmail || "",
    authorPhotoURL: d.authorPhotoURL || "",
    viewCount: typeof d.viewCount === "number" ? d.viewCount : 0,
    featured: d.featured === true,
    rejectReason: d.rejectReason || "",
    createdAt: d.createdAt || null,
    _ms: tsMs(d.createdAt),
    tags: Array.isArray(d.tags) ? d.tags : []
  };
}

export async function loadPublished(force) {
  if (!force && _pubCache && Date.now() - _pubCacheAt < PUB_TTL) return _pubCache;
  if (_pubInflight) return _pubInflight;

  _pubInflight = (async function () {
    const snap = await getDocs(query(collection(db, "Posts"), where("status", "==", "published")));
    const arr = [];
    snap.forEach(function (sd) { arr.push(norm(sd.id, sd.data())); });
    arr.sort(function (a, b) { return b._ms - a._ms; });
    _pubCache = arr;
    _pubCacheAt = Date.now();
    return arr;
  })();

  try { return await _pubInflight; }
  finally { _pubInflight = null; }
}

export function invalidateCache() {
  _pubCache = null;
  _pubCacheAt = 0;
}

export async function getPostById(id) {
  const snap = await getDoc(doc(db, "Posts", id));
  if (!snap.exists()) return null;
  return norm(snap.id, snap.data());
}

/* ---------------- নতুন লেখা জমা ---------------- */

export async function submitPost({ title, content, category, user }) {
  const profile = getLocalProfile();
  const penName = (profile.penName || "").trim();
  const ref = await addDoc(collection(db, "Posts"), {
    title: title,
    content: content,
    category: category,
    status: "pending",
    authorUid: user.uid,
    authorName: penName || user.displayName || "",
    authorPenName: penName,
    authorBio: (profile.bio || "").trim().slice(0, 400),
    authorEmail: user.email || "",
    authorPhotoURL: user.photoURL || "",
    createdAt: serverTimestamp()
  });
  return ref.id;
}

/* ---------------- লেখক প্রোফাইল (কলম-নাম + পরিচিতি) ---------------- */

export async function getMyProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : {};
}

export async function saveMyProfile(uid, data) {
  await setDoc(doc(db, "users", uid), {
    penName: (data.penName || "").trim().slice(0, 80),
    bio: (data.bio || "").trim().slice(0, 400),
    updatedAt: serverTimestamp()
  }, { merge: true });
  saveLocalProfile(data);
}

const PROFILE_KEY = "bt-profile";
export function saveLocalProfile(d) {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify({ penName: d.penName || "", bio: d.bio || "" })); } catch (e) {}
}
export function getLocalProfile() {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}"); } catch (e) { return {}; }
}

/* ---------------- সম্পাদকের ফিচার্ড পোস্ট ---------------- */

export async function setFeatured(id, on) {
  const data = { featured: !!on };
  if (on) data.featuredAt = serverTimestamp();
  await updateDoc(doc(db, "Posts", id), data);
  invalidateCache();
}

/* ---------------- দৈনিক বাণী (স্টাফ-পরিচালিত) ---------------- */

function normQuote(id, d) {
  return {
    id: id,
    text: d.text || "",
    author: d.author || "",
    day: typeof d.day === "number" ? d.day : null,
    postId: d.postId || "",
    sourceTitle: d.sourceTitle || "",
    createdByName: (d.createdBy && d.createdBy.name) || "",
    createdAt: d.createdAt || null,
    _ms: tsMs(d.createdAt)
  };
}

let _quoteCache = null;
let _quoteCacheAt = 0;
const QUOTE_TTL = 30 * 1000;
let _quoteInflight = null;

export async function loadQuotes(force) {
  if (!force && _quoteCache && Date.now() - _quoteCacheAt < QUOTE_TTL) return _quoteCache;
  if (_quoteInflight) return _quoteInflight;
  _quoteInflight = (async function () {
    const snap = await getDocs(query(collection(db, "quotes"), orderBy("day", "desc"), limit(500)));
    const arr = [];
    snap.forEach(function (sd) { arr.push(normQuote(sd.id, sd.data())); });
    _quoteCache = arr;
    _quoteCacheAt = Date.now();
    return arr;
  })();
  try { return await _quoteInflight; }
  finally { _quoteInflight = null; }
}

export function invalidateQuoteCache() {
  _quoteCache = null;
  _quoteCacheAt = 0;
}

export async function addQuote({ text, author, day, postId, sourceTitle, staff }) {
  const ref = await addDoc(collection(db, "quotes"), {
    text: String(text || "").trim().slice(0, 1200),
    author: String(author || "").trim().slice(0, 120),
    day: Math.trunc(day),
    postId: postId || "",
    sourceTitle: String(sourceTitle || "").trim().slice(0, 300),
    createdBy: {
      uid: (staff && staff.uid) || "",
      name: (staff && staff.name) || "",
      email: (staff && staff.email) || ""
    },
    createdAt: serverTimestamp()
  });
  invalidateQuoteCache();
  return ref.id;
}

export async function staffUpdateQuote(id, data) {
  const payload = {};
  ["text", "author", "postId", "sourceTitle"].forEach(function (k) {
    if (data[k] != null) payload[k] = k === "text" ? String(data[k]).slice(0, 1200) : String(data[k]);
  });
  if (typeof data.day === "number") payload.day = Math.trunc(data.day);
  await updateDoc(doc(db, "quotes", id), payload);
  invalidateQuoteCache();
}

export async function staffDeleteQuote(id) {
  await deleteDoc(doc(db, "quotes", id));
  invalidateQuoteCache();
}

/* আমার সব লেখা (pending/rejected সহ — rules নিজের লেখা পড়তে দেয়) */
export async function getMyPosts(uid) {
  const snap = await getDocs(query(collection(db, "Posts"), where("authorUid", "==", uid)));
  const arr = [];
  snap.forEach(function (sd) { arr.push(norm(sd.id, sd.data())); });
  arr.sort(function (a, b) { return b._ms - a._ms; });
  return arr;
}

/* ---------------- স্টাফ: মডারেশন ---------------- */

export async function getAllPostsForStaff() {
  const snap = await getDocs(collection(db, "Posts"));
  const arr = [];
  snap.forEach(function (sd) { arr.push(norm(sd.id, sd.data())); });
  arr.sort(function (a, b) { return b._ms - a._ms; });
  return arr;
}

export async function staffUpdatePost(id, data) {
  await updateDoc(doc(db, "Posts", id), data);
}

export async function adminDeletePost(id) {
  await deleteDoc(doc(db, "Posts", id));
}

/* ভিউ কাউন্ট — শুধু viewCount field বদলায় (rules allow) */
const VIEW_COOLDOWN = 60 * 60 * 1000;
export function bumpView(id) {
  try {
    const ss = "bt_viewed:" + id, ls = "bt_lastview:" + id;
    if (sessionStorage.getItem(ss)) return;
    const last = parseInt(localStorage.getItem(ls) || "0", 10);
    if (Date.now() - last < VIEW_COOLDOWN) return;
    sessionStorage.setItem(ss, "1");
    localStorage.setItem(ls, String(Date.now()));
  } catch (e) { return; }
  updateDoc(doc(db, "Posts", id), { viewCount: increment(1) }).catch(function () {});
  if (_pubCache) {
    const p = _pubCache.find(function (x) { return x.id === id; });
    if (p) p.viewCount += 1;
  }
}

/* ---------------- রিয়্যাকশন / কমেন্ট ---------------- */

let currentUid = null;
export function _setCurrentUid(uid) { currentUid = uid; }

export async function getReactions(postId) {
  const snap = await getDocs(collection(db, "Posts", postId, "reactions"));
  const byEmoji = {};
  let mine = null;
  snap.forEach(function (d) {
    const e = d.data().emoji;
    if (e) byEmoji[e] = (byEmoji[e] || 0) + 1;
    if (currentUid && d.id === currentUid) mine = e;
  });
  return { byEmoji: byEmoji, mine: mine };
}

export async function setMyReaction(postId, uid, emoji) {
  const ref = doc(db, "Posts", postId, "reactions", uid);
  if (!emoji) { await deleteDoc(ref); return; }
  await setDoc(ref, {
    emoji: emoji,
    uid: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });
}

export async function getComments(postId) {
  const snap = await getDocs(
    query(collection(db, "Posts", postId, "comments"), orderBy("createdAt", "desc"), limit(200))
  );
  const arr = [];
  snap.forEach(function (d) { arr.push(Object.assign({ id: d.id }, d.data())); });
  return arr;
}

export async function addComment(postId, user, text) {
  let name = (user.displayName || (user.email || "").split("@")[0] || "অতিথি").trim().slice(0, 80);
  await addDoc(collection(db, "Posts", postId, "comments"), {
    authorUid: user.uid,
    authorName: name,
    text: String(text).trim(),
    createdAt: serverTimestamp()
  });
}

export async function deleteComment(postId, cid) {
  await deleteDoc(doc(db, "Posts", postId, "comments", cid));
}

/* ---------------- নোটিফিকেশন ---------------- */

export function notificationsQuery(uid) {
  return query(collection(db, "users", uid, "notifications"), orderBy("createdAt", "desc"), limit(50));
}

export async function markNotifRead(uid, id) {
  await updateDoc(doc(db, "users", uid, "notifications", id), { read: true });
}

/* লেখককে অ্যাপ্রুভ/রিজেক্ট নোটিফিকেশন + পুশ কিউ */
export async function notifyAuthorDecision({ post, decision, reason, staff }) {
  if (!post.authorUid) return;
  const approved = decision === "approved";
  const message = approved
    ? "আপনার লেখাটি প্রকাশিত হয়েছে: «" + post.title + "»"
    : "দুঃখিত, আপনার লেখাটি অনুমোদিত হয়নি।" + (reason ? "\nকারণ: " + reason : "");

  const ref = await addDoc(collection(db, "users", post.authorUid, "notifications"), {
    type: approved ? "approved" : "rejected",
    postId: post.id,
    postTitle: post.title || "",
    message: message,
    read: false,
    pushedAt: null,
    createdAt: serverTimestamp()
  });

  /* GitHub Actions / Cloud Function পুশ পাঠানোর জন্য কিউ (পুরোনো পাইপলাইন অক্ষত:
     scripts/fcm-pusher.js uid/notifId/type/postId/postTitle/message পড়ে) */
  try {
    await addDoc(collection(db, "pushQueue"), {
      uid: post.authorUid,
      notifId: ref.id,
      type: approved ? "approved" : "rejected",
      postId: post.id,
      postTitle: post.title || "",
      message: approved
        ? "আপনার পোস্টটি অনুমোদিত হয়েছে এবং এখন ওয়েবসাইটে প্রকাশিত হয়েছে।"
        : (reason ? "পোস্টটি অনুমোদিত হয়নি। কারণ: " + reason : "আপনার পোস্টটি অনুমোদিত হয়নি।"),
      title: approved ? "আপনার পোস্ট অনুমোদিত হয়েছে" : "পোস্ট অনুমোদিত হয়নি",
      body: approved ? (post.title || "") : (reason || "বিস্তারিত অ্যাকাউন্টে দেখুন"),
      url: "/#/post/" + post.id,
      createdAt: serverTimestamp()
    });
  } catch (e) { /* pushQueue ব্যর্থ হলে মডারেশন ভাঙবে না */ }
}

/* নতুন সাবমিশন → সব স্টাফকে নোটিফিকেশন (পুরোনো staff-notify ফ্লো) */
export async function notifyStaffOfSubmission({ postId, title, authorUid, authorName, category }) {
  try {
    const cfgSnap = await getDoc(doc(db, "config", "staffList"));
    if (!cfgSnap.exists()) return { notified: 0 };
    const uids = Array.isArray(cfgSnap.data().uids) ? cfgSnap.data().uids : [];
    const targets = uids.filter(function (u) { return u && u !== authorUid; });
    const safeTitle = String(title || "").slice(0, 150);
    const msg = "নতুন লেখা জমা হয়েছে: «" + safeTitle + "»" +
      (authorName ? " — " + String(authorName).slice(0, 60) : "");

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
      } catch (e) {}
    }
    return { notified: targets.length };
  } catch (e) { return { notified: 0 }; }
}

/* ---------------- মডারেটর ম্যানেজমেন্ট (অ্যাডমিন) ---------------- */

export async function findUserByEmail(email) {
  /* users লিস্ট শুধু অ্যাডমিন পড়তে পারে (rules) */
  const snap = await getDocs(query(collection(db, "users"), where("email", "==", email), limit(1)));
  let found = null;
  snap.forEach(function (d) { found = { uid: d.id, ...d.data() }; });
  return found;
}

export async function getAllUsers() {
  const snap = await getDocs(collection(db, "users"));
  const arr = [];
  snap.forEach(function (d) { arr.push(Object.assign({ uid: d.id }, d.data())); });
  return arr;
}

export async function setModerator(uid, on, name) {
  await setDoc(doc(db, "users", uid), {
    role: on ? "moderator" : "user",
    active: on ? true : false,
    name: name || ""
  }, { merge: true });
}

/* config/staffList — সাবমিশন নোটিফিকেশন ফ্যান-আউটের জন্য */
export async function syncStaffList(adminUid, adminName, moderators) {
  const uids = [adminUid].concat(moderators.map(function (m) { return m.uid; })).filter(Boolean);
  const names = {};
  names[adminUid] = adminName || "অ্যাডমিন";
  moderators.forEach(function (m) { names[m.uid] = m.name || m.email || "মডারেটর"; });
  await setDoc(doc(db, "config", "staffList"), { uids: uids, names: names }, { merge: true });
  await setDoc(doc(db, "config", "mainAdmin"), { uid: adminUid, email: ADMIN_EMAIL, name: adminName || "অ্যাডমিন" }, { merge: true });
}

/* ---------------- অ্যাক্টিভিটি লগ ---------------- */

export async function logActivity(type, title, id, reason, staff) {
  try {
    const data = {
      type: type,                 /* approved | rejected | edited | deleted */
      postId: id || "",
      postTitle: String(title || "").slice(0, 300),
      title: String(title || "").slice(0, 300),  /* পুরোনো/নতুন উভয় UI-র জন্য */
      actorName: (staff && staff.name) || "",
      actorEmail: (staff && staff.email) || "",
      at: serverTimestamp()
    };
    if (reason) data.reason = reason;
    await addDoc(collection(db, "modActivity"), data);
  } catch (e) {}
}

export async function getActivity() {
  const snap = await getDocs(query(collection(db, "modActivity"), orderBy("at", "desc"), limit(100)));
  const arr = [];
  snap.forEach(function (d) { arr.push(Object.assign({ id: d.id }, d.data())); });
  return arr;
}

/* ---------------- বুকমার্ক (ডিভাইস-লোকাল, ফ্রি) ---------------- */

const BM_KEY = "bt-bookmarks";
export function getBookmarks() {
  try { return JSON.parse(localStorage.getItem(BM_KEY) || "[]"); }
  catch (e) { return []; }
}
export function isBookmarked(id) { return getBookmarks().indexOf(id) !== -1; }
export function toggleBookmark(id) {
  let list = getBookmarks();
  if (list.indexOf(id) !== -1) list = list.filter(function (x) { return x !== id; });
  else list.unshift(id);
  localStorage.setItem(BM_KEY, JSON.stringify(list.slice(0, 200)));
  return list.indexOf(id) !== -1;
}

/* ---------------- পঠন-ইতিহাস (ডিভাইস-লোকাল, ফ্রি) ---------------- */

const HIST_KEY = "bt-history";
export function pushHistory(post) {
  try {
    let list = JSON.parse(localStorage.getItem(HIST_KEY) || "[]");
    list = list.filter(function (x) { return x.id !== post.id; });
    list.unshift({
      id: post.id,
      title: post.title || "",
      category: post.category || "",
      authorName: post.authorName || "",
      at: Date.now()
    });
    localStorage.setItem(HIST_KEY, JSON.stringify(list.slice(0, 30)));
  } catch (e) {}
}
export function getHistory() {
  try { return JSON.parse(localStorage.getItem(HIST_KEY) || "[]"); } catch (e) { return []; }
}
export function clearHistory() { try { localStorage.removeItem(HIST_KEY); } catch (e) {} }

/* ---------------- ড্রাফট (লোকাল) ---------------- */

const DRAFT_KEY = "bt-draft";
export function saveDraft(d) { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch (e) {} }
export function loadDraft() { try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || "null"); } catch (e) { return null; } }
export function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch (e) {} }
