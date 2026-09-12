// @ts-nocheck
/* ============================================================
   তারুণ্যের বাতিঘর — অ্যাডমিন ও মডারেশন প্যানেল (v2)
   ট্যাব: Pending · Published · Moderators(admin) · History
============================================================ */

import {
  db, auth, onAuthChange, currentUser, currentRole, isStaff as roleStaff, isAdmin as roleAdmin,
  googleSignIn, ADMIN_EMAIL
} from "./fb.js";
import {
  escapeHtml, bn, fmtDate, tsMs,
  getAllPostsForStaff, staffUpdatePost, adminDeletePost,
  notifyAuthorDecision, findUserByEmail, getAllUsers, setModerator,
  syncStaffList, logActivity, getActivity, invalidateCache, setFeatured,
  loadQuotes, addQuote, staffUpdateQuote, staffDeleteQuote, loadPublished
} from "./store.js";
import { CATEGORIES, catMeta } from "./categories.js";
import { catIcon, uiIcon } from "./icons.js";
import {
  dayIndexOf, inputValueOfDay, dayIndexFromInput, bnDateOfDay, suggestFromPosts
} from "./quotes.js";
const I = uiIcon;
import {
  doc, addDoc, collection, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ---------------- মডল বেস ---------------- */

function openModal(cardHtml, opts) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = '<div class="modal-card' + ((opts && opts.wide) ? " admin-panel" : "") + '">' + cardHtml + "</div>";
  document.getElementById("modalRoot").appendChild(overlay);
  function close() { overlay.remove(); document.removeEventListener("keydown", onKey); }
  function onKey(e) { if (e.key === "Escape") close(); }
  document.addEventListener("keydown", onKey);
  overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
  overlay.querySelector("[data-close]") && overlay.querySelector("[data-close]").addEventListener("click", close);
  return { overlay: overlay, close: close };
}

function toast(msg) {
  const root = document.getElementById("toastRoot");
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  root.appendChild(t);
  setTimeout(function () { t.style.opacity = "0"; t.style.transform = "translateY(8px)"; }, 2600);
  setTimeout(function () { t.remove(); }, 3100);
}

/* ---------------- পোস্ট এডিটর মডল ---------------- */

export function openPostEditorModal(existing) {
  return new Promise(function (resolve) {
    const catOpts = CATEGORIES.map(function (c) {
      return '<option value="' + c.key + '"' + (existing && existing.category === c.key ? " selected" : "") + '>' +
        c.name + "</option>";
    }).join("");

    const m = openModal(
      '<div class="modal-head"><h3 class="mh-title">' + I("pen", 18) + ' লেখা সম্পাদনা</h3><button class="icon-btn" data-close>' + I("x", 16) + '</button></div>' +
      '<div class="modal-body">' +
        '<div class="field"><label>শিরোনাম</label><input id="edTitle" maxlength="300" value="' + escapeHtml(existing ? existing.title : "") + '"></div>' +
        '<div class="field"><label>বিভাগ</label><select id="edCategory">' + catOpts + "</select></div>" +
        '<div class="field"><label>লেখার অংশ</label><textarea id="edContent" style="min-height:260px">' +
          escapeHtml(existing ? existing.content : "") + "</textarea>" +
        '<div class="char-count" id="edCount"></div></div>' +
      "</div>" +
      '<div class="modal-foot"><button class="btn btn-ghost" data-close>বাতিল</button>' +
      '<button class="btn btn-gold btn-ic" id="edSave">' + I("save", 16) + ' সেভ করুন</button></div>'
    );

    const titleEl = m.overlay.querySelector("#edTitle");
    const catEl = m.overlay.querySelector("#edCategory");
    const contentEl = m.overlay.querySelector("#edContent");
    const countEl = m.overlay.querySelector("#edCount");
    if (existing && existing.category) catEl.value = existing.category;
    function updCount() {
      countEl.textContent = bn(contentEl.value.length) + " / ১,০০,০০০ অক্ষর";
      countEl.classList.toggle("over", contentEl.value.length > 100000);
    }
    contentEl.addEventListener("input", updCount); updCount();

    m.overlay.querySelector("#edSave").addEventListener("click", function () {
      const title = titleEl.value.trim();
      const content = contentEl.value.trim();
      if (!title) { titleEl.focus(); return toast("শিরোনাম লিখুন"); }
      if (!content) { contentEl.focus(); return toast("লেখার অংশ খালি রাখা যাবে না"); }
      if (content.length > 100000) return toast("লেখা ১,০০,০০০ অক্ষরের মধ্যে রাখুন");
      m.close();
      resolve({ title: title, content: content, category: catEl.value });
    });
    titleEl.focus();
  });
}

/* ---------------- মূল প্যানেল ---------------- */

let panelRef = null;

export async function openAdminPanel(initialTab) {
  if (panelRef) { panelRef.close(); panelRef = null; }
  activeTab = initialTab || "pending";

  const m = openModal(
    '<div class="modal-head"><h3 class="mh-title">' + I("shield", 18) + ' মডারেশন প্যানেল</h3><button class="icon-btn" data-close>' + I("x", 16) + '</button></div>' +
    '<div class="modal-body" id="adminBody" style="padding:0"><div class="loading-block"><div class="loader"></div>লোড হচ্ছে…</div></div>',
    { wide: true }
  );
  panelRef = m;
  m.overlay.addEventListener("DOMNodeRemoved", function () {});
  const body = m.overlay.querySelector("#adminBody");
  const origClose = m.close;
  m.close = function () { panelRef = null; origClose(); };

  function renderGate() {
    const user = currentUser();
    if (!user) {
      body.innerHTML =
        '<div class="login-card"><div class="li-ic">' + I("lock", 42) + '</div><h3>স্টাফ লগইন</h3>' +
        '<p style="color:var(--text-soft);font-size:.88rem">মডারেশন প্যানেল শুধু অ্যাডমিন ও মডারেটরদের জন্য।</p>' +
        '<button class="google-btn" id="adminGoogleBtn">' + googleSvg() + " Google দিয়ে লগইন</button>" +
        '<p class="login-note">অ্যাডমিন: ' + escapeHtml(ADMIN_EMAIL) + "</p></div>";
      body.querySelector("#adminGoogleBtn").addEventListener("click", function () {
        googleSignIn().catch(function (e) { return alert("লগইন ব্যর্থ: " + (e.message || "")); });
      });
      return;
    }
    if (!roleStaff()) {
      body.innerHTML =
        '<div class="login-card"><div class="li-ic">' + I("ban", 42) + '</div><h3>অননুমোদিত প্রবেশ</h3>' +
        '<p style="color:var(--text-soft);font-size:.88rem">আপনি (' + escapeHtml(user.email || "") + ") স্টাফ নন।<br>মডারেটর হতে অ্যাডমিনের সাথে যোগাযোগ করুন।</p>" +
        '<button class="btn btn-ghost" data-close>বন্ধ করুন</button></div>';
      return;
    }
    renderPanel();
  }

  let unsub = onAuthChange(function () {
    if (document.body.contains(body)) renderGate();
  });
  const obs = new MutationObserver(function () {
    if (!document.body.contains(m.overlay)) { unsub && unsub(); obs.disconnect(); }
  });
  obs.observe(document.body, { childList: true, subtree: true });

  renderGate();
}

/* ---------------- প্যানেলের ভেতরের UI ---------------- */

let allPosts = [];
let activeTab = "pending";

async function renderPanel() {
  const body = panelRef.overlay.querySelector("#adminBody");
  const admin = roleAdmin();
  const counts = { pending: 0, published: 0, rejected: 0 };
  allPosts.forEach(function (p) { if (counts[p.status] != null) counts[p.status] += 1; });

  body.innerHTML =
    '<div class="admin-tabs">' +
      tabBtn("pending", I("clock", 14) + " পেন্ডিং", counts.pending) +
      tabBtn("published", I("checkCircle", 14) + " প্রকাশিত", counts.published) +
      tabBtn("rejected", I("xCircle", 14) + " বাতিল", counts.rejected) +
      tabBtn("quotes", I("quote", 14) + " বাণী", null) +
      (admin ? tabBtn("moderators", I("users", 14) + " মডারেটর", null) : "") +
      tabBtn("history", I("history", 14) + " ইতিহাস", null) +
      '<button class="btn btn-ghost btn-sm icon-only" id="admRefresh" style="margin-left:auto" title="রিফ্রেশ">' + I("refresh", 16) + "</button>" +
    "</div>" +
    '<div class="admin-content" id="admContent"><div class="loading-block"><div class="loader"></div>পোস্ট লোড হচ্ছে…</div></div>';

  body.querySelectorAll(".admin-tab").forEach(function (t) {
    t.addEventListener("click", function () { activeTab = t.getAttribute("data-tab"); renderPanel(); });
  });
  body.querySelector("#admRefresh").addEventListener("click", loadPosts);

  if (roleAdmin()) refreshStaffConfig().catch(function () {});
  await loadPosts();
}

function tabBtn(key, label, count) {
  return '<button class="admin-tab' + (activeTab === key ? " active" : "") + '" data-tab="' + key + '">' + label +
    (count != null ? '<span class="tab-count">' + bn(count) + "</span>" : "") + "</button>";
}

async function loadPosts() {
  const content = panelRef.overlay.querySelector("#admContent");
  if (!content) return;
  if (activeTab === "moderators") return renderModerators();
  if (activeTab === "history") return renderHistory();
  if (activeTab === "quotes") return renderQuotesTab();
  content.innerHTML = '<div class="loading-block"><div class="loader"></div>লোড হচ্ছে…</div>';
  try {
    allPosts = await getAllPostsForStaff();
    const list = allPosts.filter(function (p) { return p.status === activeTab; });
    /* ট্যাব কাউন্ট রিফ্রেশ */
    panelRef.overlay.querySelectorAll(".tab-count").forEach(function () {});
    renderPostList(content, list);
    /* কাউন্ট আপডেট */
    const counts = { pending: 0, published: 0, rejected: 0 };
    allPosts.forEach(function (p) { if (counts[p.status] != null) counts[p.status] += 1; });
    ["pending", "published", "rejected"].forEach(function (k) {
      const el = panelRef.overlay.querySelector('.admin-tab[data-tab="' + k + '"] .tab-count');
      if (el) el.textContent = bn(counts[k]);
    });
  } catch (e) {
    content.innerHTML = '<div class="empty-state"><div class="es-icon">' + I("alert", 34) + '</div><p>লোড ব্যর্থ: ' + escapeHtml(e.message || "") + "</p></div>";
  }
}

function renderPostList(content, list) {
  if (!list.length) {
    content.innerHTML = '<div class="empty-state"><div class="es-icon">' + I("checkCircle", 36) + '</div><h3>এই তালিকা খালি</h3></div>';
    return;
  }
  content.innerHTML = list.map(function (p) {
    const c = catMeta(p.category);
    const chip = p.status === "pending" ? '<span class="chip chip-pending chip-ic">' + I("clock", 13) + " পেন্ডিং</span>"
      : p.status === "published" ? '<span class="chip chip-published chip-ic">' + I("checkCircle", 13) + " প্রকাশিত</span>"
      : '<span class="chip chip-rejected chip-ic">' + I("xCircle", 13) + " বাতিল</span>";
    return '<div class="mod-item" data-id="' + p.id + '">' +
      '<div class="mi-top"><div style="min-width:0">' +
        '<h4>' + escapeHtml(p.title || "(শিরোনামহীন)") + "</h4>" +
        '<div class="mi-meta"><span class="mi-cat">' + catIcon(p.category, 14) + escapeHtml(c.name) + "</span>" +
          "<span class='meta-ic'>" + I("pen", 13) + " " + escapeHtml(p.authorName || "অজ্ঞাত") + "</span>" +
          "<span class='meta-ic'>" + I("calendar", 13) + " " + escapeHtml(fmtDate(p.createdAt)) + "</span><span class='meta-ic'>" + I("eye", 13) + " " + bn(p.viewCount) + "</span>" +
          (p.featured ? "<span class='meta-ic feat-tag'>" + I("star", 13) + " ফিচার্ড</span> " : "") + chip + "</div>" +
        (p.status === "rejected" && p.rejectReason ? '<div class="reject-note">কারণ: ' + escapeHtml(p.rejectReason) + "</div>" : "") +
        (p.status === "pending" && p.reviewedBy ? '<div class="review-note">' + I("search", 13) + " " + escapeHtml(p.reviewedBy) + " পর্যালোচনা করছেন</div>" : "") +
      "</div>" +
      '<div class="mi-actions">' + actionButtons(p) + "</div></div>" +
      '<div class="mi-body" hidden>' + escapeHtml(p.content || "") + "</div>" +
    "</div>";
  }).join("");

  content.querySelectorAll(".mod-item").forEach(function (item) {
    const id = item.getAttribute("data-id");
    const post = list.find(function (x) { return x.id === id; });
    const bodyEl = item.querySelector(".mi-body");
    item.querySelector("[data-act='view']") && item.querySelector("[data-act='view']").addEventListener("click", function () {
      bodyEl.hidden = !bodyEl.hidden;
    });
    if (post.status === "published") {
      item.querySelector("[data-act='open']") && item.querySelector("[data-act='open']").addEventListener("click", function () {
        panelRef.close(); location.hash = "#/post/" + id;
      });
    }
    item.querySelector("[data-act='feature']") && item.querySelector("[data-act='feature']").addEventListener("click", function () { doFeature(post, true); });
    item.querySelector("[data-act='unfeature']") && item.querySelector("[data-act='unfeature']").addEventListener("click", function () { doFeature(post, false); });
    item.querySelector("[data-act='approve']") && item.querySelector("[data-act='approve']").addEventListener("click", function () { doApprove(post); });
    item.querySelector("[data-act='reject']") && item.querySelector("[data-act='reject']").addEventListener("click", function () { doReject(post); });
    item.querySelector("[data-act='edit']") && item.querySelector("[data-act='edit']").addEventListener("click", function () { doEdit(post); });
    item.querySelector("[data-act='delete']") && item.querySelector("[data-act='delete']").addEventListener("click", function () { doDelete(post); });
  });
}

function actionButtons(p) {
  let html = '<button class="btn btn-ghost btn-sm btn-ic" data-act="view">' + I("eye", 14) + " দেখুন</button>";
  if (p.status === "published") {
    html += '<button class="btn btn-ghost btn-sm btn-ic" data-act="open">' + I("bookOpen", 14) + " খুলুন</button>";
    html += p.featured
      ? '<button class="btn btn-ghost btn-sm btn-ic feat-on" data-act="unfeature">' + I("star", 14) + " ফিচার্ড</button>"
      : '<button class="btn btn-ghost btn-sm btn-ic" data-act="feature">' + I("star", 14) + " ফিচার্ড</button>";
  }
  if (p.status === "pending") {
    html += '<button class="btn btn-teal btn-sm btn-ic" data-act="approve">' + I("check", 15) + " প্রকাশ</button>";
    html += '<button class="btn btn-danger btn-sm btn-ic" data-act="reject">' + I("x", 15) + " বাতিল</button>";
  }
  html += '<button class="btn btn-ghost btn-sm btn-ic" data-act="edit">' + I("pen", 14) + " এডিট</button>";
  if (roleAdmin()) html += '<button class="btn btn-danger btn-sm btn-ic" data-act="delete">' + I("trash", 14) + " ডিলিট</button>";
  return html;
}

function staffInfo() {
  const u = currentUser();
  return { name: (u && (u.displayName || u.email)) || "স্টাফ", email: (u && u.email) || "" };
}

async function doApprove(post) {
  if (!confirm('"'+post.title+'" প্রকাশ করতে চান?')) return;
  const s = staffInfo();
  try {
    await staffUpdatePost(post.id, {
      status: "published",
      moderatedBy: { name: s.name, email: s.email, at: serverTimestamp() },
      reviewedBy: null
    });
    await notifyAuthorDecision({ post: post, decision: "approved", staff: s });
    await logActivity("approved", post.title, post.id, "", s);
    invalidateCache();
    toast("প্রকাশিত হয়েছে");
    loadPosts();
  } catch (e) { alert(e.message || "একটি সমস্যা হয়েছে"); }
}

async function doFeature(post, on) {
  const s = staffInfo();
  try {
    await setFeatured(post.id, on);
    await logActivity(on ? "featured" : "unfeatured", post.title, post.id, "", s);
    toast(on ? "ফ্রন্ট পেজে ফিচার্ড হয়েছে" : "ফিচার্ড তালিকা থেকে সরানো হয়েছে");
    loadPosts();
  } catch (e) { alert(e.message || "একটি সমস্যা হয়েছে"); }
}

function promptReason() {
  return new Promise(function (resolve) {
    const m = openModal(
      '<div class="modal-head"><h3 class="mh-title">' + I("xCircle", 18) + ' লেখা বাতিলের কারণ</h3><button class="icon-btn" data-close>' + I("x", 16) + '</button></div>' +
      '<div class="modal-body"><div class="field"><label>লেখককে জানানোর জন্য কারণ (ঐচ্ছিক)</label>' +
      '<input id="rjReason" maxlength="400" placeholder="যেমন: কপিরাইটকৃত লেখা / নিয়মবহির্ভূত বিষয়বস্তু…"></div></div>' +
      '<div class="modal-foot"><button class="btn btn-ghost" id="rjSkip">কারণ ছাড়াই</button>' +
      '<button class="btn btn-danger" id="rjConfirm">বাতিল করুন</button></div>'
    );
    const input = m.overlay.querySelector("#rjReason");
    input.focus();
    m.overlay.querySelector("#rjConfirm").addEventListener("click", function () { const v = input.value.trim(); m.close(); resolve(v); });
    m.overlay.querySelector("#rjSkip").addEventListener("click", function () { m.close(); resolve(""); });
    m.overlay.querySelector("[data-close]").addEventListener("click", function () { m.close(); resolve(null); });
  });
}

async function doReject(post) {
  const reason = await promptReason();
  if (reason === null) return;
  const s = staffInfo();
  try {
    await staffUpdatePost(post.id, {
      status: "rejected",
      rejectReason: reason || "",
      moderatedBy: { name: s.name, email: s.email, at: serverTimestamp() },
      reviewedBy: null
    });
    await notifyAuthorDecision({ post: post, decision: "rejected", reason: reason, staff: s });
    await logActivity("rejected", post.title, post.id, reason, s);
    toast("বাতিল করা হয়েছে");
    loadPosts();
  } catch (e) { alert(e.message || "একটি সমস্যা হয়েছে"); }
}

async function doEdit(post) {
  try {
    await staffUpdatePost(post.id, { reviewedBy: staffInfo().name, reviewedAt: serverTimestamp() });
  } catch (e) {}
  const result = await openPostEditorModal({ title: post.title, content: post.content, category: post.category });
  if (!result) {
    try { await staffUpdatePost(post.id, { reviewedBy: null }); } catch (e) {}
    return;
  }
  const s = staffInfo();
  try {
    await staffUpdatePost(post.id, {
      title: result.title, content: result.content, category: result.category,
      lastEditedBy: s.name, lastEditedAt: serverTimestamp(), reviewedBy: null
    });
    await logActivity("edited", result.title, post.id, "", s);
    if (currentRole() === "moderator") notifyMainAdmin(s.name + ' এডিট করেছেন: "' + result.title + '"');
    invalidateCache();
    toast("সংরক্ষিত হয়েছে");
    loadPosts();
  } catch (e) { alert(e.message || "একটি সমস্যা হয়েছে"); }
}

async function doDelete(post) {
  if (!confirm('"' + post.title + '" চিরতরে ডিলিট হবে। নিশ্চিত?')) return;
  try {
    await adminDeletePost(post.id);
    await logActivity("deleted", post.title, post.id, "", staffInfo());
    invalidateCache();
    toast("ডিলিট হয়েছে");
    loadPosts();
  } catch (e) { alert(e.message || "একটি সমস্যা হয়েছে"); }
}

async function notifyMainAdmin(message) {
  try {
    const { getDoc } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    const snap = await getDoc(doc(db, "config", "mainAdmin"));
    const uid = snap.exists() ? snap.data().uid : null;
    if (!uid) return;
    await addDoc(collection(db, "users", uid, "notifications"), {
      type: "approved", message: message, read: false, createdAt: serverTimestamp()
    });
  } catch (e) {}
}

/* ---------------- দৈনিক বাণী ট্যাব ---------------- */

let quotePosts = [];

async function renderQuotesTab() {
  const content = panelRef.overlay.querySelector("#admContent");
  content.innerHTML =
    "<div>" +
      '<div class="guidelines"><strong class="gn-head">' + I("quote", 15) + " দৈনিক বাণী পরিচালনা</strong>" +
        "প্রতিদিনের জন্য একটি বাণী যোগ করুন। নির্দিষ্ট তারিখে বাণী না থাকলে সাইট স্বয়ংক্রিয়ভাবে তার আগের সর্বশেষ বাণী দেখায়; " +
        "ভবিষ্যতের তারিখ দিলে বাণীটি সেই দিন থেকে স্বয়ংক্রিয়ভাবে দেখানো হবে।</div>" +
      '<div class="aq-form">' +
        '<div class="field" style="min-width:180px"><label>যে তারিখের জন্য</label>' +
          '<input type="date" id="qDate"></div>' +
        '<div class="field" style="flex:1;min-width:220px"><label>কার উক্তি / সূত্র *</label>' +
          '<input id="qAuthor" maxlength="120" placeholder="যেমন: রবীন্দ্রনাথ ঠাকুর / সহীহ বুখারী / লেখকের নাম"></div>' +
        '<div class="field" style="flex:1;min-width:220px"><label>আমাদের লেখা থেকে সূত্র (ঐচ্ছিক)</label>' +
          '<select id="qSource"><option value="">— সাধারণ বাণী —</option></select></div>' +
        '<div class="field" style="flex-basis:100%"><label>বাণীর লেখা *</label>' +
          '<textarea id="qText" maxlength="1200" style="min-height:110px" placeholder="বাণী/উক্তিটি লিখুন…"></textarea>' +
          '<div class="char-count" id="qCount"></div></div>' +
        '<div class="field" style="flex-basis:100%" id="qSugBox"></div>' +
        '<div style="flex-basis:100%;display:flex;gap:8px;flex-wrap:wrap">' +
          '<button class="btn btn-ghost btn-sm btn-ic" id="qSugBtn">' + I("sparkles", 14) + " আমাদের লেখা থেকে বাণীর পরামর্শ</button>" +
          '<button class="btn btn-gold btn-ic" id="qSave">' + I("save", 15) + " বাণী সংরক্ষণ করুন</button>" +
          '<button class="btn btn-danger btn-ic" id="qDelete" hidden>' + I("trash", 15) + " এই দিনের বাণী মুছুন</button>" +
          '<button class="btn btn-ghost btn-sm" id="qCancel" hidden>নতুন বাণী</button>' +
        "</div>" +
      "</div>" +
      '<div id="quoteAdminList"><div class="loading-block"><div class="loader"></div>বাণীর তালিকা লোড হচ্ছে…</div></div>' +
    "</div>";

  const dateEl = content.querySelector("#qDate");
  const authorEl = content.querySelector("#qAuthor");
  const sourceEl = content.querySelector("#qSource");
  const textEl = content.querySelector("#qText");
  const countEl = content.querySelector("#qCount");
  const sugBox = content.querySelector("#qSugBox");
  const saveBtn = content.querySelector("#qSave");
  const delBtn = content.querySelector("#qDelete");
  const cancelBtn = content.querySelector("#qCancel");
  const sugBtn = content.querySelector("#qSugBtn");

  const todayN = dayIndexOf(new Date());
  dateEl.value = inputValueOfDay(todayN);
  let editingId = null;

  function updCount() { countEl.textContent = bn(textEl.value.length) + " / ১,২০০ অক্ষর"; }
  textEl.addEventListener("input", updCount); updCount();

  let quotes = [];
  try {
    const [qs, posts] = await Promise.all([loadQuotes(true), loadPublished().catch(function () { return []; })]);
    quotes = qs || [];
    quotePosts = posts || [];
  } catch (e) {
    content.querySelector("#quoteAdminList").innerHTML =
      '<div class="empty-state"><p>বাণী লোড ব্যর্থ: ' + escapeHtml(e.message || "") +
      '<br>Firestore Rules নতুন করে প্রকাশ করেছেন কিনা দেখুন।</p></div>';
    return;
  }

  /* সূত্র ড্রপডাউন */
  sourceEl.innerHTML = '<option value="">— সাধারণ বাণী (কোনো লেখার সূত্র নয়) —</option>' +
    quotePosts.slice(0, 300).map(function (p) {
      return '<option value="' + p.id + '">' + escapeHtml((p.title || "শিরোনামহীন").slice(0, 80)) + " — " +
        escapeHtml((p.authorPenName || p.authorName || "").slice(0, 40)) + "</option>";
    }).join("");

  function quoteByDay(n) { return quotes.find(function (q) { return q.day === n; }); }

  function fillForm(q) {
    editingId = q ? q.id : null;
    textEl.value = q ? q.text : "";
    authorEl.value = q ? q.author : "";
    sourceEl.value = q && q.postId ? q.postId : "";
    delBtn.hidden = !q;
    cancelBtn.hidden = !q;
    saveBtn.innerHTML = q ? I("save", 15) + " পরিবর্তন সংরক্ষণ করুন" : I("save", 15) + " বাণী সংরক্ষণ করুন";
    updCount();
  }

  function syncDateToExisting() {
    const n = dayIndexFromInput(dateEl.value);
    fillForm(quoteByDay(n));
  }
  dateEl.addEventListener("change", syncDateToExisting);

  /* আমাদের লেখা থেকে বাণীর পরামর্শ */
  sugBtn.addEventListener("click", function () {
    if (!quotePosts.length) { sugBox.innerHTML = '<p class="field-hint">এখনো কোনো প্রকাশিত লেখা পাওয়া যায়নি।</p>'; return; }
    const sugs = suggestFromPosts(quotePosts, 1, 8);
    if (!sugs.length) { sugBox.innerHTML = '<p class="field-hint">উপযুক্ত বাক্যাংশ পাওয়া যায়নি; নিজে লিখুন।</p>'; return; }
    sugBox.innerHTML =
      '<label class="aq-sug-head">' + I("feather", 13) + " প্রকাশিত লেখা থেকে বাছাই করা অংশ (ক্লিক করলে বসবে)</label>" +
      '<div class="aq-sug-list">' + sugs.map(function (s, i) {
        return '<button type="button" class="aq-sug" data-i="' + i + '"><b>“' + escapeHtml(s.text) + '”</b>' +
          "<span>— " + escapeHtml(s.author) + " · «" + escapeHtml((s.sourceTitle || "").slice(0, 60)) + "»</span></button>";
      }).join("") + "</div>";
    sugBox.querySelectorAll(".aq-sug").forEach(function (b) {
      b.addEventListener("click", function () {
        const s = sugs[Number(b.getAttribute("data-i"))];
        textEl.value = s.text;
        authorEl.value = s.author;
        sourceEl.value = s.postId || "";
        updCount();
        toast("বাণী বসানো হয়েছে — প্রয়োজনে সম্পাদনা করুন");
      });
    });
  });

  saveBtn.addEventListener("click", async function () {
    const text = textEl.value.trim();
    const author = authorEl.value.trim();
    const day = dayIndexFromInput(dateEl.value);
    if (text.length < 2) { textEl.focus(); return toast("বাণীর লেখা লিখুন"); }
    if (!author) { authorEl.focus(); return toast("কার উক্তি/সূত্র লিখুন"); }
    const post = quotePosts.find(function (p) { return p.id === sourceEl.value; });
    const payload = {
      text: text, author: author, day: day,
      postId: post ? post.id : "",
      sourceTitle: post ? post.title : ""
    };
    const u = currentUser();
    const staff = { uid: u.uid, name: u.displayName || u.email || "স্টাফ", email: u.email || "" };
    const sameDay = quoteByDay(day);
    saveBtn.disabled = true;
    try {
      if (editingId) {
        await staffUpdateQuote(editingId, payload);
        toast("বাণী হালনাগাদ হয়েছে", "success");
      } else if (sameDay) {
        if (!confirm("এই তারিখে ইতিমধ্যে একটি বাণী আছে। সেটির জায়গায় নতুন বাণীটি বসবে?")) { saveBtn.disabled = false; return; }
        await staffUpdateQuote(sameDay.id, payload);
        toast("সেই দিনের বাণী প্রতিস্থাপন হয়েছে", "success");
      } else {
        await addQuote(Object.assign({ staff: staff }, payload));
        toast("বাণী যুক্ত হয়েছে", "success");
      }
      loadPosts();
    } catch (e) {
      saveBtn.disabled = false;
      alert("বাণী সংরক্ষণ ব্যর্থ:\n" + (e.message || "") +
        "\n\n(Firestore Rules-এ quotes কালেকশনের অনুমতি প্রকাশিত না হলে এটি ঘটতে পারে।)");
    }
  });

  delBtn.addEventListener("click", async function () {
    const n = dayIndexFromInput(dateEl.value);
    const q = editingId ? quotes.find(function (x) { return x.id === editingId; }) : quoteByDay(n);
    if (!q) return;
    if (!confirm(bnDateOfDay(q.day) + " তারিখের বাণীটি চিরতরে মুছবেন?")) return;
    delBtn.disabled = true;
    try {
      await staffDeleteQuote(q.id);
      toast("বাণী মুছে ফেলা হয়েছে");
      loadPosts();
    } catch (e) { delBtn.disabled = false; alert("মুছতে ব্যর্থ: " + (e.message || "")); }
  });
  cancelBtn.addEventListener("click", function () { dateEl.value = inputValueOfDay(todayN); syncDateToExisting(); });

  /* তালিকা */
  const sorted = quotes.slice().sort(function (a, b) { return b.day - a.day; });
  const upcoming = sorted.filter(function (q) { return q.day > todayN; });
  const todays = sorted.filter(function (q) { return q.day === todayN; });
  const past = sorted.filter(function (q) { return q.day < todayN; });
  const listBox = content.querySelector("#quoteAdminList");

  function row(q, badge, cls) {
    return '<div class="aq-item ' + (cls || "") + '">' +
      '<div class="aq-meta"><b>' + escapeHtml(bnDateOfDay(q.day)) + '</b>' +
      (badge ? " " + badge : "") + "</div>" +
      '<div class="aq-text">“' + escapeHtml(q.text) + '”<cite>— ' + escapeHtml(q.author) + "</cite></div>" +
      '<div class="aq-acts">' +
        '<button class="btn btn-ghost btn-sm btn-ic" data-edit="' + q.id + '">' + I("pen", 13) + " সম্পাদনা</button>" +
        '<button class="btn btn-danger btn-sm btn-ic" data-del="' + q.id + '">' + I("trash", 13) + " মুছুন</button>" +
      "</div></div>";
  }
  let html = "";
  if (todays.length) html += '<h4 class="tab-h4">' + I("sparkles", 15) + " আজকের বাণী</h4>" + todays.map(function (q) { return row(q, '<span class="chip chip-published">আজ</span>'); }).join("");
  if (upcoming.length) html += '<h4 class="tab-h4">' + I("calendar", 15) + " আগামী দিনের জন্য নির্ধারিত (" + bn(upcoming.length) + ")</h4>" +
    upcoming.slice(0, 30).map(function (q) { return row(q, '<span class="chip chip-pending">শিডিউলকৃত</span>', "aq-up"); }).join("");
  html += '<h4 class="tab-h4">' + I("history", 15) + " অতীত বাণী (" + bn(past.length) + ")</h4>";
  html += past.length ? '<div class="aq-past">' + past.slice(0, 60).map(function (q) { return row(q); }).join("") + "</div>"
    : '<p class="field-hint">এখনো কোনো অতীত বাণী নেই।</p>';
  listBox.innerHTML = html;

  listBox.querySelectorAll("[data-edit]").forEach(function (b) {
    b.addEventListener("click", function () {
      const q = quotes.find(function (x) { return x.id === b.getAttribute("data-edit"); });
      if (!q) return;
      dateEl.value = inputValueOfDay(q.day);
      fillForm(q);
      content.querySelector(".aq-form").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
  listBox.querySelectorAll("[data-del]").forEach(function (b) {
    b.addEventListener("click", async function () {
      const q = quotes.find(function (x) { return x.id === b.getAttribute("data-del"); });
      if (!q || !confirm(bnDateOfDay(q.day) + " তারিখের বাণীটি মুছবেন?")) return;
      try { await staffDeleteQuote(q.id); toast("মুছে ফেলা হয়েছে"); loadPosts(); }
      catch (e) { alert("মুছতে ব্যর্থ: " + (e.message || "")); }
    });
  });

  /* তারিখ বদলে থাকলে ফর্ম সিঙ্ক রাখা */
  fillForm(quoteByDay(todayN));
}

/* ---------------- মডারেটর ট্যাব ---------------- */

async function renderModerators() {
  const content = panelRef.overlay.querySelector("#admContent");
  content.innerHTML =
    "<div>" +
      '<div class="guidelines"><strong class="gn-head">' + I("plus", 15) + " নতুন মডারেটর যোগ করুন</strong>" +
        "যাঁকে মডারেটর বানাবেন, তাঁকে আগে একবার Google দিয়ে এই সাইটে লগইন করে থাকতে হবে। " +
        "নিচে তাঁর ইমেইল দিয়ে খুঁজুন।</div>" +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px">' +
        '<input id="modEmail" class="" placeholder="মডারেটরের Gmail ঠিকানা…" style="flex:1;min-width:220px;padding:11px 14px;border-radius:12px;border:1px solid var(--border);background:var(--bg-soft);color:var(--text)">' +
        '<button class="btn btn-gold btn-ic" id="modSearchBtn">' + I("search", 15) + " খুঁজুন</button></div>" +
      '<div id="modSearchResult"></div>' +
      '<h4 class="tab-h4">' + I("shield", 16) + " বর্তমান মডারেটর তালিকা</h4>" +
      '<div id="modList"><div class="loading-block"><div class="loader"></div>লোড হচ্ছে…</div></div>' +
    "</div>";

  let searchUser = null;
  content.querySelector("#modSearchBtn").addEventListener("click", async function () {
    const email = content.querySelector("#modEmail").value.trim().toLowerCase();
    const out = content.querySelector("#modSearchResult");
    if (!email || email.indexOf("@") === -1) { out.innerHTML = '<p class="field-hint">সঠিক ইমেইল দিন</p>'; return; }
    out.innerHTML = '<p class="field-hint">খোঁজা হচ্ছে…</p>';
    try {
      searchUser = await findUserByEmail(email);
      if (!searchUser) {
        out.innerHTML = '<p class="reject-note">এই ইমেইলে কোনো ব্যবহারকারী পাওয়া যায়নি। তাঁকে আগে সাইটে লগইন করতে বলুন।</p>';
        return;
      }
      const isMod = searchUser.role === "moderator" && searchUser.active !== false;
      const isMainAdmin = searchUser.email === ADMIN_EMAIL;
      out.innerHTML = '<div class="mod-list-row"><div><div class="u-name u-name-ic">' + I("user", 14) + " " + escapeHtml(searchUser.name || searchUser.email) + "</div>" +
        '<div class="u-mail">' + escapeHtml(searchUser.email) + "</div></div>" +
        (isMainAdmin ? '<span class="chip chip-published">প্রধান অ্যাডমিন</span>'
          : isMod ? '<button class="btn btn-danger btn-sm btn-ic" data-remove="1">' + I("shield", 14) + " সরান</button>"
          : '<button class="btn btn-teal btn-sm btn-ic" data-add="1">' + I("shield", 14) + " মডারেটর বানান</button>") + "</div>";
      const addB = out.querySelector("[data-add]"), rmB = out.querySelector("[data-remove]");
      if (addB) addB.addEventListener("click", function () { toggleMod(searchUser, true); });
      if (rmB) rmB.addEventListener("click", function () { toggleMod(searchUser, false); });
    } catch (e) {
      out.innerHTML = '<p class="reject-note">খোঁজা যায়নি: ' + escapeHtml(e.message || "") + " (অ্যাডমিন হিসেবে লগইন আছেন তো?)</p>";
    }
  });

  async function toggleMod(user, on) {
    try {
      await setModerator(user.uid, on, user.name || user.email || "");
      await refreshStaffConfig();
      toast(on ? "মডারেটর যুক্ত হয়েছে" : "মডারেটর সরানো হয়েছে");
      loadModList();
      content.querySelector("#modSearchResult").innerHTML = "";
      content.querySelector("#modEmail").value = "";
    } catch (e) { alert(e.message || "একটি সমস্যা হয়েছে"); }
  }

  async function loadModList() {
    const box = content.querySelector("#modList");
    try {
      const users = await getAllUsers();
      const mods = users.filter(function (u) { return u.role === "moderator" && u.active !== false; });
      if (!mods.length) { box.innerHTML = '<p class="field-hint">এখনো কোনো মডারেটর নেই</p>'; return; }
      box.innerHTML = mods.map(function (u) {
        return '<div class="mod-list-row"><div><div class="u-name u-name-ic">' + I("shield", 14) + " " + escapeHtml(u.name || u.email || u.uid) + "</div>" +
          '<div class="u-mail">' + escapeHtml(u.email || "") + "</div></div>" +
          '<button class="btn btn-danger btn-sm" data-uid="' + u.uid + '" data-name="' + escapeHtml(u.name || u.email || "") + '">সরান</button></div>';
      }).join("");
      box.querySelectorAll("button[data-uid]").forEach(function (b) {
        b.addEventListener("click", function () {
          toggleMod({ uid: b.getAttribute("data-uid"), name: b.getAttribute("data-name"), email: "" }, false);
        });
      });
    } catch (e) {
      box.innerHTML = '<p class="reject-note">তালিকা আনা যায়নি: ' + escapeHtml(e.message || "") + "</p>";
    }
  }
  loadModList();
}

async function refreshStaffConfig() {
  const u = currentUser();
  let mods = [];
  try {
    const users = await getAllUsers();
    mods = users.filter(function (x) { return x.role === "moderator" && x.active !== false; })
      .map(function (x) { return { uid: x.uid, name: x.name || x.email || "", email: x.email || "" }; });
  } catch (e) {}
  await syncStaffList(u.uid, u.displayName || u.email || "অ্যাডমিন", mods);
}

/* ---------------- ইতিহাস ট্যাব ---------------- */

async function renderHistory() {
  const content = panelRef.overlay.querySelector("#admContent");
  content.innerHTML = '<div class="loading-block"><div class="loader"></div>ইতিহাস লোড হচ্ছে…</div>';
  try {
    const items = await getActivity();
    if (!items.length) { content.innerHTML = '<div class="empty-state"><div class="es-icon">' + I("history", 36) + '</div><h3>এখনো কোনো কার্যক্রম নেই</h3></div>'; return; }
    const ICONS = { approved: ["checkCircle", "var(--green)"], rejected: ["xCircle", "var(--red)"], edited: ["pen", "var(--blue)"], deleted: ["trash", "var(--red)"], featured: ["star", "var(--gold)"], unfeatured: ["star", "var(--text-faint)"] };
    content.innerHTML = items.map(function (a) {
      const ic = ICONS[a.type] || ["", "var(--text-faint)"];
      const title = a.postTitle || a.title || "";
      const who = a.actorName ? ' <span class="u-mail">· ' + escapeHtml(a.actorName) + "</span>" : "";
      return '<div class="activity-item"><span class="ai-tag" style="color:' + ic[1] + '">' + (ic[0] ? I(ic[0], 15) : "•") + "</span>" +
        '<span style="flex:1">' + escapeHtml(title) + who +
        (a.reason ? ' <span class="reject-note">কারণ: ' + escapeHtml(a.reason) + "</span>" : "") + "</span>" +
        '<span class="ai-time">' + escapeHtml(fmtDate(a.at)) + "</span></div>";
    }).join("");
  } catch (e) {
    content.innerHTML = '<div class="empty-state"><p>ইতিহাস আনা যায়নি: ' + escapeHtml(e.message || "") + "</p></div>";
  }
}

function googleSvg() {
  return '<svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>';
}
