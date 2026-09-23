// @ts-nocheck
/* ============================================================
   তারুণ্যের বাতিঘর — মূল অ্যাপ v3 (প্রিমিয়াম পত্রিকা)
   রাউটার + শেল + সব পেজ
============================================================ */

import {
  onAuthChange, currentUser, isStaff,
  googleSignIn, logout
} from "./fb.js";
import {
  loadPublished, getPostById, submitPost, getMyPosts, bumpView,
  getBookmarks, toggleBookmark, isBookmarked,
  getHistory, pushHistory, clearHistory,
  saveDraft, loadDraft, clearDraft,
  getMyProfile, saveMyProfile, getLocalProfile, saveLocalProfile,
  notifyStaffOfSubmission, invalidateCache,
  loadQuotes,
  escapeHtml, bn, fmtDate, relTime, readingMinutes, makeExcerpt
} from "./store.js";
import { CATEGORIES, catMeta } from "./categories.js";
import { catIcon, uiIcon, brandIcon } from "./icons.js";
import { dayIndexOf, bnDateOfDay, pickQuoteOfDay } from "./quotes.js";
const I = uiIcon;
import { renderEngagement, avatarHtml } from "./engage.js";
import { renderLeaderboard } from "./leaderboard.js";
import { openAdminPanel } from "./admin.js";
import { initNotifications } from "./notify.js";
import { enablePush, pushStatus } from "./push.js";

const $ = function (s, r) { return (r || document).querySelector(s); };
const $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

/* ---------------- টোস্ট ---------------- */
function toast(msg, type) {
  const root = $("#toastRoot");
  const t = document.createElement("div");
  t.className = "toast " + (type || "");
  t.textContent = msg;
  root.appendChild(t);
  setTimeout(function () { t.style.transition = "opacity .4s,transform .4s"; t.style.opacity = "0"; t.style.transform = "translateY(8px)"; }, 2800);
  setTimeout(function () { t.remove(); }, 3300);
}

/* ---------------- SEO/মেটা ---------------- */
const BASE_TITLE = "তারুণ্যের বাতিঘর — তারুণ্যের কলমে, সত্যের কথা";
function setMeta(title, desc) {
  document.title = title ? title + " — তারুণ্যের বাতিঘর" : BASE_TITLE;
  const d = desc || "কবিতা, গল্প-উপন্যাস, প্রবন্ধ, আয়াত ও হাদিস, নাস্তিকতার জবাব, প্রতিবাদ, জীবনীসহ ২০টি বিভাগে তারুণ্যের মুক্তচিন্তার পত্রিকা।";
  ['meta[property="og:title"]', 'meta[name="twitter:title"]'].forEach(function (sel) {
    const el = $(sel); if (el) el.setAttribute("content", title || BASE_TITLE);
  });
  ['meta[name="description"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]'].forEach(function (sel) {
    const el = $(sel); if (el) el.setAttribute("content", d);
  });
}

/* ---------------- কার্ড/ব্যাজ হেল্পার ---------------- */
const AV_COLORS = ["#c0572f", "#b45309", "#0d9488", "#0369a1", "#6d28d9", "#be185d", "#15803d", "#b91c1c", "#0e7490", "#a16207"];
function avColor(seed) {
  let h = 0; const s = String(seed || "?");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return AV_COLORS[Math.abs(h) % AV_COLORS.length];
}
function miniAvatar(name, photo) {
  const letter = (name || "?").trim().charAt(0) || "?";
  if (photo) return '<img class="mini-av" src="' + escapeHtml(photo) + '" alt="" onerror="this.outerHTML=\'<div class=&quot;mini-av&quot; style=&quot;background:' + avColor(name) + '&quot;>' + escapeHtml(letter) + "</div>'\">";
  return '<div class="mini-av" style="background:' + avColor(name) + '">' + escapeHtml(letter) + "</div>";
}
function catBadge(key, ghost) {
  const c = catMeta(key);
  if (ghost) return '<span class="cat-badge ghost">' + catIcon(key, 13) + " " + escapeHtml(c.name) + "</span>";
  return '<span class="cat-badge" style="background:linear-gradient(135deg,' + c.grad[0] + "," + c.grad[1] + ')">' +
    catIcon(key, 13) + " " + escapeHtml(c.name) + "</span>";
}
function displayName(p) { return p.authorPenName || p.authorName || "অজ্ঞাত"; }

function postCard(p) {
  const c = catMeta(p.category);
  return '<a class="post-card" style="--accent:' + c.grad[0] + '" href="#/post/' + p.id + '">' +
    '<div class="pc-top">' + catBadge(p.category) +
      '<span class="pc-feat">' + (p.featured ? I("star", 12) + " সম্পাদকের পছন্দ" : "") + "</span></div>" +
    "<h3>" + escapeHtml(p.title || "") + "</h3>" +
    '<p class="pc-excerpt">' + escapeHtml(makeExcerpt(p.content, 150)) + "</p>" +
    '<div class="pc-meta"><span class="pc-author">' + miniAvatar(displayName(p), p.authorPhotoURL) +
      '<span class="nm">' + escapeHtml(displayName(p)) + "</span></span>" +
      '<span class="pc-stats">' + I("eye", 13) + " " + bn(p.viewCount) + "</span></div></a>";
}

function postRow(p, rank, q) {
  return '<a class="post-row" href="#/post/' + p.id + '">' +
    (rank ? '<div class="pr-num">' + bn(rank) + "</div>" : "") +
    '<div class="pr-body">' +
      '<div style="display:flex;gap:9px;align-items:center;flex-wrap:wrap">' + catBadge(p.category) +
      '<span class="meta-date">' + I("clock", 12) + " " + escapeHtml(relTime(p.createdAt)) + "</span></div>" +
      "<h3>" + hl(p.title || "", q) + "</h3>" +
      '<p class="pr-excerpt">' + hl(makeExcerpt(p.content, 200), q) + "</p>" +
      '<div class="pr-meta"><span class="meta-ic">' + I("pen", 13) + " " + escapeHtml(displayName(p)) + "</span>" +
      "<span class='meta-ic'>" + I("eye", 13) + " " + bn(p.viewCount) + " বার</span><span class='meta-ic'>" + I("clock", 13) + " " + bn(readingMinutes(p.content)) + " মিনিট</span></div>" +
    "</div></a>";
}

/* সার্চ-শব্দ হাইলাইট */
function hl(text, q) {
  const safe = escapeHtml(text);
  if (!q) return safe;
  const needle = escapeHtml(q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  try { return safe.replace(new RegExp("(" + needle + ")", "gi"), '<mark>$1</mark>'); }
  catch (e) { return safe; }
}

function skeletonGrid(n) {
  let h = "";
  for (let i = 0; i < (n || 6); i++) {
    h += '<div class="post-card" style="pointer-events:none"><div class="skeleton sk-line" style="width:40%"></div>' +
      '<div class="skeleton sk-line" style="width:90%;height:20px"></div><div class="skeleton sk-line" style="width:70%"></div>' +
      '<div class="skeleton sk-line" style="width:50%;margin-top:auto"></div></div>';
  }
  return '<div class="post-grid">' + h + "</div>";
}

/* দৈনিক উক্তি ও বাণী-সংগ্রহ: js/quotes.js দেখুন */

/* ============================================================
   শেল ইনিশ
============================================================ */
let me = null;
let myRole = "none";

function initShell() {
  $("#footerYear").textContent = new Date().getFullYear().toLocaleString("bn-BD");
  initTheme();
  initNavPanels();
  initSearch();
  initUserUI();
  initReadControls();
  initServiceWorker();
  initNotifications();
  initRouter();
  initFab();
  loadPublished().then(function (posts) {
    fillCatCounts(posts);
    fillTicker(posts);
  }).catch(function () {});
}

function initTheme() {
  $("#themeToggleBtn").addEventListener("click", function () {
    const cur = document.documentElement.getAttribute("data-theme");
    const next = cur === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("bt-theme", next); } catch (e) {}
  });
}

function initNavPanels() {
  const catBtn = $("#navCatBtn");
  const catPanel = $("#catPanel");
  const grid = $("#catPanelGrid");
  const mobileCats = $("#mobileCats");

  grid.innerHTML = CATEGORIES.map(function (c) {
    return '<a class="cat-tile" href="#/cat/' + c.key + '"><span class="ci" style="background:linear-gradient(135deg,' +
      c.grad[0] + "," + c.grad[1] + ')">' + catIcon(c.key, 19) + '</span>' +
      '<span class="cn">' + escapeHtml(c.name) + '<span class="cc" data-count="' + c.key + '"></span></span></a>';
  }).join("");
  mobileCats.innerHTML = CATEGORIES.slice(0, 12).map(function (c) {
    return '<a href="#/cat/' + c.key + '" style="--g:' + c.grad[0] + '"><span style="color:' + c.grad[0] + ';display:inline-flex">' + catIcon(c.key, 17) + "</span>" + escapeHtml(c.name) + "</a>";
  }).join("") + '<a href="#/categories" class="mm-allcats">' + I("grid", 17) + " সব বিভাগ…</a>";

  function closeCat() { catPanel.hidden = true; catBtn.setAttribute("aria-expanded", "false"); }
  catBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    const open = !catPanel.hidden;
    catPanel.hidden = open;
    catBtn.setAttribute("aria-expanded", String(!open));
  });
  document.addEventListener("click", function (e) {
    if (!catPanel.hidden && !catPanel.contains(e.target) && !catBtn.contains(e.target)) closeCat();
  });
  catPanel.addEventListener("click", closeCat);

  const burger = $("#navBurger");
  const mm = $("#mobileMenu");
  burger.addEventListener("click", function (e) {
    e.stopPropagation(); mm.hidden = !mm.hidden;
  });
  mm.addEventListener("click", function (e) {
    if (e.target && e.target.closest && e.target.closest("#mmTheme")) { $("#themeToggleBtn").click(); return; }
    mm.hidden = true;
  });

  $("#navWriteBtn").addEventListener("click", goWrite);

  $("#searchOpenBtn").addEventListener("click", openSearch);

  $("#randomBtn").addEventListener("click", openRandomPost);
}

function fillTicker(posts) {
  const ticker = $("#ticker"), track = $("#tickerTrack");
  if (!posts.length) return;
  const items = posts.slice(0, 12).map(function (p) {
    return '<a class="ticker-item" href="#/post/' + p.id + '"><span class="dot"></span><b>' +
      escapeHtml(p.title) + "</b><span class='tk-writer'>" + I("pen", 11) + " " + escapeHtml(displayName(p)) + "</span></a>";
  });
  track.innerHTML = items.join("") + items.join("");
  ticker.hidden = false;
}

function fillCatCounts(posts) {
  const counts = {};
  posts.forEach(function (p) { counts[p.category] = (counts[p.category] || 0) + 1; });
  $$("[data-count]").forEach(function (el) {
    const n = counts[el.getAttribute("data-count")] || 0;
    el.textContent = n ? bn(n) + "টি লেখা" : "নতুন বিভাগ";
  });
}

/* ---------------- যেকোনো লেখা ---------------- */
async function openRandomPost() {
  try {
    const posts = await loadPublished();
    if (!posts.length) return toast("এখনো কোনো লেখা নেই");
    const pool = posts.filter(function (p) { return location.hash !== "#/post/" + p.id; });
    const p = pool[Math.floor(Math.random() * pool.length)];
    location.hash = "#/post/" + p.id;
  } catch (e) { toast("লেখা খোলা যায়নি", "error"); }
}

/* ---------------- সার্চ ---------------- */
let searchDebounce = null;
function initSearch() {
  const ov = $("#searchOverlay");
  const input = $("#globalSearchInput");
  const suggest = $("#searchSuggest");
  $("#searchCloseBtn").addEventListener("click", closeSearch);
  ov.addEventListener("click", function (e) { if (e.target === ov) closeSearch(); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeSearch();
    if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); openSearch(); }
    if (e.key === "/" && document.activeElement && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
      e.preventDefault(); openSearch();
    }
  });
  input.addEventListener("input", function () {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(function () { renderSuggest(input.value.trim(), suggest); }, 170);
  });
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      const q = input.value.trim();
      closeSearch();
      location.hash = "#/search?q=" + encodeURIComponent(q);
    }
  });
}
function openSearch() {
  $("#searchOverlay").hidden = false;
  $("#globalSearchInput").value = "";
  $("#searchSuggest").innerHTML = '<div class="sg-empty">শিরোনাম, লেখক বা লেখার ভেতরের শব্দ লিখুন… <br><span style="font-size:.75rem">Ctrl+K চেপেও খুঁজতে পারবেন</span></div>';
  setTimeout(function () { $("#globalSearchInput").focus(); }, 60);
}
function closeSearch() { $("#searchOverlay").hidden = true; }
async function renderSuggest(q, box) {
  if (!q) { box.innerHTML = '<div class="sg-empty">অন্তত একটি শব্দ লিখুন…</div>'; return; }
  const posts = await loadPublished();
  const ql = q.toLowerCase();
  const hits = posts.filter(function (p) {
    return (p.title || "").toLowerCase().includes(ql) ||
      (displayName(p) || "").toLowerCase().includes(ql) ||
      (p.content || "").toLowerCase().includes(ql);
  }).slice(0, 8);
  if (!hits.length) { box.innerHTML = '<div class="sg-empty">“' + escapeHtml(q) + '” — কিছু পাওয়া যায়নি</div>'; return; }
  box.innerHTML = hits.map(function (p) {
    return '<button type="button" class="sg-item" data-id="' + p.id + '" style="border:none;background:none">' +
      '<span style="color:var(--gold);display:inline-flex">' + catIcon(p.category, 17) + '</span>' +
      '<span style="min-width:0"><span class="sg-title" style="display:block;white-space:normal">' + hl(p.title, q) +
      '</span><span class="sg-sub">' + I("pen", 12) + " " + escapeHtml(displayName(p)) + " · " + I("eye", 12) + " " + bn(p.viewCount) + "</span></span></button>";
  }).join("");
  $$(".sg-item", box).forEach(function (el) {
    el.addEventListener("click", function () { closeSearch(); location.hash = "#/post/" + el.getAttribute("data-id"); });
  });
}

/* ---------------- ইউজার UI ---------------- */
function initUserUI() {
  const loginBtn = $("#loginBtn");
  const chip = $("#avatarChip");
  const chipImg = $("#avatarChipImg");
  const chipIni = $("#avatarChipInitial");
  const dd = $("#userDropdown");

  loginBtn.addEventListener("click", function () {
    googleSignIn().catch(function (e) { alert("লগইন ব্যর্থ: " + (e.message || "")); });
  });
  chip.addEventListener("click", function (e) { e.stopPropagation(); dd.hidden = !dd.hidden; });
  document.addEventListener("click", function (e) {
    if (!dd.hidden && !dd.contains(e.target) && e.target !== chip) dd.hidden = true;
  });
  $("#logoutBtn").addEventListener("click", function () {
    logout().then(function () { dd.hidden = true; toast("লগআউট হয়েছে"); });
  });
  $("#ddAdminBtn").addEventListener("click", function () { dd.hidden = true; openAdminPanel(); });
  $("#ddProfileBtn").addEventListener("click", function () { dd.hidden = true; openProfileModal(); });
  $("#ddPushBtn").addEventListener("click", async function () {
    const r = await enablePush();
    if (r.ok) toast("নোটিফিকেশন চালু হয়েছে", "success");
    else if (r.reason === "denied") toast("ব্রাউজারে নোটিফিকেশন ব্লক করা", "error");
    else if (r.reason === "unsupported") toast("এই ব্রাউজারে পুশ সাপোর্ট নেই");
    else toast("চেষ্টা ব্যর্থ, পরে আবার দেখুন", "error");
  });

  onAuthChange(function (user, role) {
    me = user; myRole = role;
    if (user) {
      loginBtn.hidden = true; chip.hidden = false;
      const name = user.displayName || user.email || "?";
      if (user.photoURL) { chipImg.src = user.photoURL; chipImg.style.display = "block"; chipIni.textContent = ""; }
      else { chipImg.style.display = "none"; chipIni.textContent = name.trim().charAt(0); chipIni.style.background = "linear-gradient(135deg,#6d28d9,#0d9488)"; }
      $("#ddUserName").textContent = name;
      $("#ddUserEmail").textContent = user.email || "";
      $("#ddAdminBtn").hidden = role !== "admin" && role !== "moderator";
      const pb = $("#ddPushBtn");
      pb.innerHTML = pushStatus() === "granted" ? I("bell", 15) + " <span>নোটিফিকেশন চালু আছে</span>" : I("bellOff", 15) + " <span>নোটিফিকেশন চালু করুন</span>";
      /* সংরক্ষিত কলম-নাম/বায়ো লোকাল ক্যাশে আনা */
      getMyProfile(user.uid).then(function (d) {
        if (d && (d.penName || d.bio)) saveLocalProfile({ penName: d.penName || "", bio: d.bio || "" });
      }).catch(function () {});
    } else {
      loginBtn.hidden = false; chip.hidden = true; dd.hidden = true;
      $("#ddAdminBtn").hidden = true;
    }
  });
}

/* ---------------- প্রোফাইল মডল (কলম-নাম) ---------------- */
function openProfileModal() {
  if (!me) { googleSignIn().then(openProfileModal).catch(function () {}); return; }
  const root = $("#modalRoot");
  const local = getLocalProfile();
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML =
    '<div class="modal-card" style="max-width:520px">' +
      '<div class="modal-head"><h3 class="mh-title">' + I("idCard", 18) + ' লেখক প্রোফাইল</h3><button class="icon-btn" data-c>' + I("x", 16) + '</button></div>' +
      '<div class="modal-body">' +
        '<p class="field-hint" style="margin-bottom:16px">আপনার Google নামের বদলে এই <b>কলম-নাম</b> লেখার সঙ্গে প্রকাশিত হবে। খালি রাখলে Google নামই দেখানো হবে।</p>' +
        '<div class="field"><label>কলম-নাম</label><input id="pfPen" maxlength="80" placeholder="যেমন: এক পথিক / আপনার ছদ্মনাম" value=""></div>' +
        '<div class="field"><label>সংক্ষিপ্ত পরিচিতি</label><textarea id="pfBio" maxlength="400" style="min-height:110px" placeholder="আপনার সম্পর্কে দু-একটি লাইন…"></textarea>' +
        '<span class="field-hint">লেখক প্রোফাইল পেজে দেখানো হবে</span></div>' +
      "</div>" +
      '<div class="modal-foot"><button class="btn btn-ghost" data-c>বাতিল</button><button class="btn btn-gold btn-ic" id="pfSave">' + I("save", 16) + ' সংরক্ষণ করুন</button></div>' +
    "</div>";
  root.appendChild(overlay);
  const pen = overlay.querySelector("#pfPen"), bio = overlay.querySelector("#pfBio");
  pen.value = local.penName || ""; bio.value = local.bio || "";
  function close() { overlay.remove(); }
  overlay.querySelectorAll("[data-c]").forEach(function (b) { b.addEventListener("click", close); });
  overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
  getMyProfile(me.uid).then(function (d) { pen.value = d.penName || pen.value; bio.value = d.bio || bio.value; }).catch(function () {});
  overlay.querySelector("#pfSave").addEventListener("click", async function () {
    const btn = this; btn.disabled = true;
    try {
      await saveMyProfile(me.uid, { penName: pen.value, bio: bio.value });
      toast("প্রোফাইল সংরক্ষিত হয়েছে — নতুন লেখায় কলম-নাম দেখাবে", "success");
      close();
    } catch (e) {
      btn.disabled = false;
      toast("সংরক্ষণ ব্যর্থ: " + (e.message || ""), "error");
    }
  });
}

function goWrite() {
  if (me) { location.hash = "#/submit"; return; }
  googleSignIn().then(function () { location.hash = "#/submit"; })
    .catch(function (e) { alert("লগইন ব্যর্থ: " + (e.message || "")); });
}

function loginGate(icon, title, sub) {
  const gateIcon = icon === "lock" ? I("lock", 36) : icon;
  return '<div class="empty-state"><div class="es-icon">' + gateIcon + '</div><h3>' + title + '</h3><p>' + sub + '</p>' +
    '<button class="google-btn" id="gateLogin">' +
    '<svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>' +
    " Google দিয়ে লগইন</button></div>";
}

/* ---------------- পড়ার কন্ট্রোল ---------------- */
function initReadControls() {
  const bar = document.createElement("div");
  bar.className = "read-controls";
  bar.id = "readControls";
  bar.innerHTML =
    '<button id="rcMinus" title="অক্ষর ছোট">A−</button>' +
    '<button id="rcPlus" title="অক্ষর বড়">A+</button><span class="rc-sep"></span>' +
    '<button id="rcFont" title="ফন্ট পাল্টান">' + I("type", 17) + '</button>' +
    '<button id="rcListen" title="শুনুন">' + I("sound", 17) + '</button>' +
    '<button id="rcPrint" title="প্রিন্ট/পিডিএফ">' + I("print", 17) + '</button>' +
    '<button id="rcFocus" title="ফোকাস/ফুলস্ক্রিন">' + I("expand", 17) + '</button>' +
    '<button id="rcTheme" title="থিম"><span class="ic-moon rc-icw">' + I("moon", 15) + '</span><span class="ic-sun rc-icw">' + I("sun", 15) + '</span></button>';
  document.body.appendChild(bar);

  const sizes = ["1rem", "1.06rem", "1.14rem", "1.22rem", "1.34rem"];
  let si = 2, serif = false;
  try {
    const s = localStorage.getItem("bt-read-size"); if (s !== null) si = parseInt(s, 10);
    serif = localStorage.getItem("bt-read-serif") === "1";
  } catch (e) {}
  function apply() {
    document.documentElement.style.setProperty("--read-size", sizes[si]);
    document.documentElement.style.setProperty("--read-font",
      serif ? '"Noto Serif Bengali", "Noto Color Emoji", serif' : '"Hind Siliguri", "Noto Color Emoji", sans-serif');
    $$(".article-body").forEach(function (b) { b.classList.toggle("serif", serif); });
  }
  bar.querySelector("#rcMinus").addEventListener("click", function () { si = Math.max(0, si - 1); localStorage.setItem("bt-read-size", String(si)); apply(); });
  bar.querySelector("#rcPlus").addEventListener("click", function () { si = Math.min(sizes.length - 1, si + 1); localStorage.setItem("bt-read-size", String(si)); apply(); });
  bar.querySelector("#rcFont").addEventListener("click", function () { serif = !serif; localStorage.setItem("bt-read-serif", serif ? "1" : "0"); apply(); });
  bar.querySelector("#rcTheme").addEventListener("click", function () { $("#themeToggleBtn").click(); });
  bar.querySelector("#rcPrint").addEventListener("click", function () { window.print(); });
  bar.querySelector("#rcFocus").addEventListener("click", function () {
    const el = document.fullscreenElement;
    if (el) document.exitFullscreen();
    else { const a = document.querySelector(".reading-wrap") || document.documentElement; (a.requestFullscreen || function () {}).call(a); }
  });
  bar.querySelector("#rcListen").addEventListener("click", function () { toggleListen(this); });
  apply();
}

/* ---------------- টেক্সট-টু-স্পিচ ---------------- */
let speaking = false;
function stopListen() {
  if ("speechSynthesis" in window) { window.speechSynthesis.cancel(); }
  speaking = false;
  const b = $("#rcListen"); if (b) { b.classList.remove("on"); b.innerHTML = I("sound", 17); b.title = "শুনুন"; }
}
function toggleListen(btn) {
  if (!("speechSynthesis" in window)) return toast("এই ব্রাউজারে অডিও পাঠ সাপোর্ট নেই");
  if (speaking) { stopListen(); return; }
  const body = $(".article-body");
  if (!body) return;
  const text = body.textContent.replace(/\s+\n/g, "\n");
  const u = new SpeechSynthesisUtterance(text.slice(0, 12000));
  u.lang = "bn-BD"; u.rate = 0.95; u.pitch = 1;
  const voices = window.speechSynthesis.getVoices();
  const bnVoice = voices.find(function (v) { return /bn|bangla|bengali/i.test(v.lang + v.name); });
  if (bnVoice) u.voice = bnVoice;
  u.onend = function () { stopListen(); };
  u.onerror = function () { stopListen(); };
  window.speechSynthesis.speak(u);
  speaking = true;
  btn.classList.add("on"); btn.innerHTML = I("stop", 16); btn.title = "থামান";
}

/* ---------------- ব্যাক-টু-টপ ---------------- */
function initFab() {
  const fab = $("#fabTop");
  fab.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
  window.addEventListener("scroll", function () {
    fab.classList.toggle("show", window.scrollY > 600);
  }, { passive: true });
}

/* ---------------- সার্ভিস ওয়ার্কার ---------------- */
function initServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("service-worker.js").then(function (reg) {
    reg.addEventListener("updatefound", function () {
      const w = reg.installing;
      if (!w) return;
      w.addEventListener("statechange", function () {
        if (w.state === "installed" && navigator.serviceWorker.controller) $("#updateBanner").hidden = false;
      });
    });
    const banner = $("#updateBanner");
    $("#updateReloadBtn").addEventListener("click", function () {
      if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
      else location.reload();
    });
    $("#updateDismissBtn").addEventListener("click", function () { banner.hidden = true; });
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", function () {
      if (!refreshing) { refreshing = true; location.reload(); }
    });
  }).catch(function (e) { console.warn("SW register failed", e); });
}

/* ---------------- সংখ্যা অ্যানিমেশন ---------------- */
function animateCount(el, to, dur) {
  const start = performance.now(), durMs = dur || 900;
  function frame(now) {
    const p = Math.min(1, (now - start) / durMs);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = bn(Math.round(to * eased));
    if (p < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/* ============================================================
   রাউটার
============================================================ */
function initRouter() {
  const h = location.hash;
  const legacy = h.match(/^#(cat|post)\/(.+)$/);
  if (legacy) location.replace("#/" + legacy[1] + "/" + legacy[2]);
  window.addEventListener("hashchange", render);
  render();
}

function setActiveNav(route) {
  $$("[data-nav]").forEach(function (a) { a.classList.toggle("active", a.getAttribute("data-nav") === route); });
  $$(".bn-item").forEach(function (a) { a.classList.remove("active"); });
  const map = { home: "home", leaderboard: "lb", writers: "cats", categories: "cats" };
  if (map[route]) { const el = $('.bn-item[data-bn="' + map[route] + '"]'); if (el) el.classList.add("active"); }
  if (location.hash.startsWith("#/cat")) { const el = $('.bn-item[data-bn="cats"]'); if (el) el.classList.add("active"); }
  if (location.hash.startsWith("#/my")) { const el = $('.bn-item[data-bn="me"]'); if (el) el.classList.add("active"); }
  if (location.hash.startsWith("#/submit")) { const el = $('.bn-item[data-bn="write"]'); if (el) el.classList.add("active"); }
}

let routeGen = 0;
function staleView(view, gen) { return Number(view.dataset.gen || 0) !== gen; }

async function render() {
  stopListen();
  $("#mobileMenu").hidden = true;
  $("#catPanel").hidden = true;
  $("#readControls").classList.remove("show");
  window.scrollTo(0, 0);

  const view = $("#view");
  const gen = ++routeGen;
  view.dataset.gen = String(gen);
  const raw = location.hash.replace(/^#\/?/, "");
  const [path, qs] = raw.split("?");
  const parts = path.split("/").filter(Boolean);
  const q = {};
  (qs || "").split("&").filter(Boolean).forEach(function (kv) {
    const [k, v] = kv.split("="); q[k] = decodeURIComponent(v || "");
  });
  const root = parts[0] || "home";
  setActiveNav(root);

  try {
    if (root === "home" || !parts.length) return pageHome(view);
    if (root === "categories") return pageCategories(view);
    if (root === "cat") return pageCategory(view, parts[1]);
    if (root === "post") return pagePost(view, parts[1]);
    if (root === "search") return pageSearch(view, q.q || "");
    if (root === "writer") return pageWriter(view, parts[1]);
    if (root === "writers") return pageWriters(view);
    if (root === "quotes" || root === "bani") return pageQuotes(view);
    if (root === "leaderboard") return renderLeaderboard(view);
    if (root === "submit") return pageSubmit(view);
    if (root === "my") return pageMy(view);
    if (root === "bookmarks") return pageBookmarks(view);
    if (root === "history") return pageHistory(view);
    if (root === "about") return pageAbout(view);
    if (root === "admin") { history.replaceState(null, "", "#/"); openAdminPanel(); return pageHome(view); }
    return pageNotFound(view);
  } catch (e) {
    console.error(e);
    setMeta(null);
    view.innerHTML = '<div class="empty-state"><div class="es-icon">' + I("alert", 34) + '</div><h3>কিছু একটা সমস্যা হয়েছে</h3><p>' +
      escapeHtml(e.message || "") + '</p><a class="btn btn-gold" href="#/">হোমে ফিরুন</a></div>';
  }
}

/* ============================================================
   হোম
============================================================ */
async function pageHome(view) {
  setMeta(null);
  const gen = routeGen;
  view.innerHTML =
    '<div class="page-anim">' +
      '<div class="hero" id="hero"><div class="loading-block" style="grid-column:1/-1"><div class="loader"></div>সর্বশেষ লেখা আনা হচ্ছে…</div></div>' +
      '<div class="stats-strip" id="statsStrip"></div>' +
      '<section class="quote-band" id="quoteBand" hidden></section>' +
      '<section class="rail" id="picksRail" hidden></section>' +
      '<div class="section"><div class="section-head"><h2>লেখার বিভাগ</h2><a class="section-link" href="#/categories">সব ২০টি বিভাগ →</a></div>' +
        '<div class="cat-grid" id="homeCatGrid"></div></div>' +
      '<div class="section layout-2col">' +
        '<div><div class="section-head"><h2>সাম্প্রতিক লেখা</h2></div><div id="latestGrid">' + skeletonGrid(4) + "</div></div>" +
        '<aside class="sidebar">' +
          '<div class="side-box"><h4>' + I("trending", 15) + ' এ সময়ের জনপ্রিয়</h4><div id="trendBox"><div class="loader"></div></div></div>' +
          '<div class="side-box" id="recentBox" hidden><h4>' + I("history", 15) + ' সম্প্রতি পড়া</h4><div id="recentList"></div><a class="side-link" href="#/history">সব দেখুন →</a></div>' +
          '<div class="side-box"><h4>' + I("trophy", 15) + ' শীর্ষ লেখক</h4><div id="lbTeaser"><div class="loader"></div></div><a class="side-link" href="#/leaderboard">পূর্ণ তালিকা →</a></div>' +
        "</aside></div>" +
      '<div id="catRails"></div>' +
      '<div class="section" id="ctaSlot"></div>' +
    "</div>";

  $("#homeCatGrid").innerHTML = CATEGORIES.map(function (c, i) {
    return '<a class="cat-card rise" style="animation-delay:' + (i * 0.025) + 's" href="#/cat/' + c.key + '">' +
      '<span class="cc-icon" style="background:linear-gradient(140deg,' + c.grad[0] + "," + c.grad[1] + ')">' + catIcon(c.key, 24) + "</span>" +
      '<span class="cc-watermark" style="color:' + c.grad[0] + '">' + catIcon(c.key, 86) + "</span>" +
      '<span class="cc-name">' + escapeHtml(c.name) + "</span>" +
      '<span class="cc-count" data-count="' + c.key + '">…</span></a>';
  }).join("");

  let posts;
  try { posts = await loadPublished(); }
  catch (e) {
    if (staleView(view, gen)) return;
    $("#hero").innerHTML = '<div class="empty-state"><div class="es-icon">' + I("alert", 36) + '</div><h3>লোড করা যায়নি</h3><p>ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।</p>' +
      '<button class="btn btn-gold btn-ic" onclick="location.reload()">' + I("refresh", 16) + ' আবার চেষ্টা</button></div>';
    return;
  }
  if (staleView(view, gen)) return;
  fillCatCounts(posts);

  /* হিরো: সম্পাদকের ফিচার্ড অগ্রাধিকার, নইলে সর্বশেষ */
  const featured = posts.filter(function (p) { return p.featured; });
  const heroPool = featured.concat(posts.filter(function (p) { return !p.featured; }));
  if (!heroPool.length) {
    $("#hero").innerHTML =
      '<div class="hero-feature" style="grid-column:1/-1;min-height:300px"><div class="hf-bg"></div><div class="hf-glow"></div><div class="hf-pattern"></div>' +
      '<span class="cat-badge" style="background:linear-gradient(135deg,#f5b53d,#d97706);color:#2a1c02">' + I("sparkles", 13) + " নতুন পত্রিকা</span>" +
      "<h2>তারুণ্যের বাতিঘরে স্বাগতম</h2><p class='hf-excerpt'>প্রথম লেখাটি আপনিই জমা দিন — কবিতা, গল্প, প্রবন্ধ বা যা-ই লিখুন না কেন।</p>" +
      '<div class="hf-meta"><a class="btn btn-gold btn-sm btn-ic" href="#/submit">' + I("pen", 14) + ' এখনই লিখুন</a></div></div>';
  } else {
    const f = heroPool[0];
    const c = catMeta(f.category);
    const side = heroPool.slice(1, 3);
    $("#hero").innerHTML =
      '<a class="hero-feature" href="#/post/' + f.id + '" style="--accent:' + c.grad[0] + '">' +
        '<div class="hf-bg" style="background:linear-gradient(155deg,' + c.grad[0] + ",#080d1d)\"></div>" +
        '<div class="hf-glow"></div><div class="hf-pattern"></div><div class="hf-orbit"></div>' +
        (f.featured ? '<span class="hf-feat">' + I("star", 13) + " সম্পাদকের পছন্দ</span>" : "") +
        catBadge(f.category) +
        "<h2>" + escapeHtml(f.title) + "</h2>" +
        '<p class="hf-excerpt">' + escapeHtml(makeExcerpt(f.content, 240)) + "</p>" +
        '<div class="hf-meta"><span class="meta-ic">' + I("pen", 14) + " " + escapeHtml(displayName(f)) + "</span>" +
        "<span class='meta-ic'>" + I("calendar", 14) + " " + escapeHtml(fmtDate(f.createdAt)) + "</span><span class='meta-ic'>" + I("eye", 14) + " " + bn(f.viewCount) + "</span>" +
        "<span class='meta-ic'>" + I("clock", 14) + " " + bn(readingMinutes(f.content)) + " মিনিট</span></div></a>" +
      '<div class="hero-side">' + side.map(function (p) {
        return '<a class="hero-mini" href="#/post/' + p.id + '">' + catBadge(p.category, true) +
          "<h3>" + escapeHtml(p.title) + '</h3><div class="pc-meta" style="border:none;padding:0"><span class="pc-author">' +
          miniAvatar(displayName(p), p.authorPhotoURL) + '<span class="nm">' + escapeHtml(displayName(p)) +
          "</span></span><span class='meta-ic'>" + I("eye", 13) + " " + bn(p.viewCount) + "</span></div></a>";
      }).join("") + "</div>";
  }

  /* পরিসংখ্যান (অ্যানিমেটেড) */
  const writers = {}; let views = 0;
  posts.forEach(function (p) { if (p.authorUid) writers[p.authorUid] = true; views += p.viewCount || 0; });
  $("#statsStrip").innerHTML = stat(0, posts.length, "প্রকাশিত লেখা") + stat(0, Object.keys(writers).length, "সক্রিয় লেখক") +
    stat(0, views, "মোট পঠন") + stat(0, CATEGORIES.length, "লেখার বিভাগ", true);
  $$(".stat-cell .n").forEach(function (el, i) {
    animateCount(el, [posts.length, Object.keys(writers).length, views, CATEGORIES.length][i]);
  });
  function stat(_, n, l) { return '<div class="stat-cell"><div class="n">০</div><div class="l">' + l + "</div></div>"; }

  /* উক্তি ব্যান্ড — Firestore-এ স্টাফ-যোগ করা দৈনিক বাণী থেকে */
  loadQuotes().then(function (quotes) {
    if (staleView(view, gen)) return;
    const qb = $("#quoteBand");
    if (!qb) return;
    const n = dayIndexOf(new Date());
    const qd = pickQuoteOfDay(quotes, n);
    if (!qd) { qb.remove(); return; }
    const isToday = qd.day === n;
    qb.innerHTML =
      '<a class="qb-link" href="#/quotes">' +
      '<div class="qb-kicker">' + (isToday ? "আজকের বাণী" : "সর্বশেষ বাণী") +
        ' <span class="qb-date">' + bnDateOfDay(qd.day) + "</span></div>" +
      '<blockquote>“' + escapeHtml(qd.text) + '”</blockquote><cite>' + escapeHtml(qd.author) + "</cite>" +
      '<span class="qb-cta" role="button">' + I("bookOpen", 15) + " আগের বাণীসমূহ <span class=\"qb-cta-arrow\">" + I("chevronRight", 14) + "</span></span>" +
      '<span class="qb-mark" style="color:#f5b53d">' +
      '<svg width="90" height="74" viewBox="0 0 24 24" fill="currentColor"><path d="M9.5 6C6.5 7.2 4.5 9.6 4.5 13v5h6v-6H7.8c.1-1.8 1-3 2.7-3.8zM19.5 6c-3 1.2-5 3.6-5 7v5h6v-6h-2.7c.1-1.8 1-3 2.7-3.8z" opacity=".85"/></svg></span>' +
      "</a>";
    qb.hidden = false;
  }).catch(function () {
    const qb = $("#quoteBand");
    if (qb) qb.remove();
  });

  /* সম্পাদকের পছন্দ রেল */
  if (featured.length >= 2) {
    const rail = $("#picksRail");
    rail.hidden = false;
    rail.innerHTML = '<div class="rail-head"><h3>' + I("star", 17) + ' সম্পাদকের পছন্দ</h3><span class="rh-sub">বাছাই করা সেরা লেখা</span></div>' +
      '<div class="rail-track">' + featured.slice(0, 8).map(postCard).join("") + "</div>";
  }

  /* সর্বশেষ গ্রিড */
  $("#latestGrid").innerHTML = '<div class="post-grid cols-2">' + posts.slice(0, 6).map(postCard).join("") + "</div>";

  /* ট্রেন্ডিং */
  const trending = posts.slice().sort(function (a, b) { return (b.viewCount || 0) - (a.viewCount || 0); }).slice(0, 6);
  $("#trendBox").innerHTML = trending.map(function (p, i) {
    return '<div class="trend-item" data-id="' + p.id + '"><span class="t-rank">' + bn(i + 1) + "</span>" +
      '<div style="min-width:0"><div class="t-title">' + escapeHtml(p.title) + "</div>" +
      '<div class="t-sub">' + I("eye", 12) + " " + bn(p.viewCount) + " · <span class='meta-ic' style='color:var(--gold)'>" + catIcon(p.category, 12) + " " + escapeHtml(catMeta(p.category).name) + "</span></div></div></div>";
  }).join("");
  $$("#trendBox .trend-item").forEach(function (el) {
    el.addEventListener("click", function () { location.hash = "#/post/" + el.getAttribute("data-id"); });
  });

  /* সম্প্রতি পড়া */
  const hist = getHistory();
  if (hist.length) {
    $("#recentBox").hidden = false;
    $("#recentList").innerHTML = hist.slice(0, 5).map(function (h) {
      return '<div class="trend-item" data-id="' + h.id + '"><span class="t-rank" style="color:var(--teal)">›</span>' +
        '<div style="min-width:0"><div class="t-title">' + escapeHtml(h.title) + "</div>" +
        '<div class="t-sub">' + escapeHtml(relTime(h.at)) + "</div></div></div>";
    }).join("");
    $$("#recentList .trend-item").forEach(function (el) {
      el.addEventListener("click", function () { location.hash = "#/post/" + el.getAttribute("data-id"); });
    });
  }

  /* শীর্ষ লেখক টিজার */
  const m = new Map();
  posts.forEach(function (p) {
    if (!p.authorUid) return;
    let e = m.get(p.authorUid);
    if (!e) { e = { uid: p.authorUid, name: displayName(p), photo: p.authorPhotoURL || "", posts: 0, views: 0 }; m.set(p.authorUid, e); }
    e.posts++; e.views += p.viewCount || 0;
    if (!e.photo && p.authorPhotoURL) e.photo = p.authorPhotoURL;
    if (e.name === "অজ্ঞাত" && displayName(p)) e.name = displayName(p);
  });
  const teaser = Array.from(m.values()).sort(function (a, b) { return (b.posts * 10 + b.views) - (a.posts * 10 + a.views); }).slice(0, 5);
  $("#lbTeaser").innerHTML = teaser.map(function (e, i) {
    return '<div class="trend-item" data-uid="' + escapeHtml(e.uid) + '"><span class="t-rank' + (i < 3 ? " tr-" + ["g", "s", "b"][i] : "") + '">' + bn(i + 1) + "</span>" +
      '<div style="min-width:0;display:flex;gap:9px;align-items:center">' + miniAvatar(e.name, e.photo) +
      '<div><div class="t-title">' + escapeHtml(e.name) + '</div><div class="t-sub">' + bn(e.posts) + " লেখা · " + I("eye", 12) + " " + bn(e.views) + "</div></div></div></div>";
  }).join("") || '<p class="field-hint">শীঘ্রই…</p>';
  $$("#lbTeaser .trend-item").forEach(function (el) {
    el.addEventListener("click", function () { location.hash = "#/writer/" + el.getAttribute("data-uid"); });
  });

  /* ক্যাটাগরি রেল (যেসব বিভাগে লেখা আছে) */
  const byCat = {};
  posts.forEach(function (p) { (byCat[p.category] = byCat[p.category] || []).push(p); });
  const rails = Object.keys(byCat).map(function (k) { return { k: k, n: byCat[k].length }; })
    .filter(function (x) { return x.n >= 2; })
    .sort(function (a, b) { return b.n - a.n; }).slice(0, 4);
  $("#catRails").innerHTML = rails.map(function (r) {
    const c = catMeta(r.k);
    return '<section class="rail"><div class="rail-head"><h3><span style="color:' + c.grad[0] + '">' + catIcon(r.k, 20) + "</span>" +
      escapeHtml(c.name) + '</h3><a href="#/cat/' + r.k + '">সব দেখুন →</a></div>' +
      '<div class="rail-track">' + byCat[r.k].slice(0, 10).map(postCard).join("") + "</div></section>";
  }).join("");

  /* CTA */
  $("#ctaSlot").innerHTML =
    '<div class="hero-feature" style="min-height:auto;padding:38px;cursor:default;grid-column:1/-1">' +
    '<div class="hf-bg" style="background:linear-gradient(130deg,#3a1c10,#101a36)"></div><div class="hf-glow"></div><div class="hf-pattern"></div>' +
    '<span class="cat-badge" style="background:linear-gradient(135deg,#ffd98a,#f5b53d);color:#2a1c02">' + I("feather", 14) + " তারুণ্যের মঞ্চ</span>" +
    "<h2 style=\"font-size:clamp(1.3rem,3vw,1.7rem)\">আপনার লেখাও পৌঁছে যাক হাজারো পাঠকের কাছে</h2>" +
    '<p class="hf-excerpt">২০টি বিভাগে যে কোনো বিষয়ে লিখে জমা দিন — সম্পাদক অনুমোদনের পর প্রকাশ পাবে।</p>' +
    '<div class="hf-meta"><a class="btn btn-gold btn-ic" href="#/submit">' + I("pen", 16) + ' লেখা জমা দিন</a>' +
    '<a class="btn btn-ghost" style="color:#fff;border-color:rgba(255,255,255,.32)" href="#/about">নিয়মাবলি জানুন</a></div></div>';
}

/* ============================================================
   সব ক্যাটাগরি
============================================================ */
async function pageCategories(view) {
  const gen = routeGen;
  setMeta("সব বিভাগ", "তারুণ্যের বাতিঘরের ২০টি লেখার বিভাগ");
  view.innerHTML =
    '<div class="page-anim"><h1 class="page-title">লেখার সব বিভাগ</h1>' +
    '<p class="page-sub">পছন্দের বিষয় বেছে নিয়ে পড়তে শুরু করুন</p>' +
    '<div class="cat-grid" style="grid-template-columns:repeat(auto-fill,minmax(226px,1fr))">' +
    CATEGORIES.map(function (c, i) {
      return '<a class="cat-card rise" style="animation-delay:' + (i * 0.03) + 's" href="#/cat/' + c.key + '">' +
        '<span class="cc-icon" style="background:linear-gradient(140deg,' + c.grad[0] + "," + c.grad[1] + ')">' + catIcon(c.key, 24) + "</span>" +
        '<span class="cc-watermark" style="color:' + c.grad[0] + '">' + catIcon(c.key, 86) + "</span>" +
        '<span class="cc-name">' + escapeHtml(c.name) + "</span>" +
        '<span class="cc-tagline">' + escapeHtml(c.tagline) + "</span>" +
        '<span class="cc-count" data-count="' + c.key + '">…</span></a>';
    }).join("") + "</div></div>";
  const posts = await loadPublished();
  if (staleView(view, gen)) return;
  const counts = {};
  posts.forEach(function (p) { counts[p.category] = (counts[p.category] || 0) + 1; });
  $$(".cat-card .cc-count", view).forEach(function (el, i) {
    const n = counts[CATEGORIES[i].key] || 0;
    el.textContent = n ? bn(n) + "টি লেখা" : "নতুন বিভাগ";
  });
}

/* ============================================================
   ক্যাটাগরি পেজ
============================================================ */
let catSort = "latest";
async function pageCategory(view, key) {
  const gen = routeGen;
  const c = catMeta(key);
  setMeta(c.name, c.tagline);
  view.innerHTML =
    '<div class="page-anim">' +
      '<div class="cat-hero" style="background:linear-gradient(135deg,' + c.grad[0] + "," + c.grad[1] + ')">' +
        '<div class="ch-icon" style="color:#fff">' + catIcon(key, 34) + "</div>" +
        '<span class="ch-count" id="catCount">…</span><h1>' + escapeHtml(c.name) + "</h1>" +
        "<p>" + escapeHtml(c.tagline) + "</p></div>" +
      '<div class="sort-tabs">' +
        '<button class="sort-tab" data-sort="latest">' + I("history", 14) + " সবার নতুন</button>" +
        '<button class="sort-tab" data-sort="popular">' + I("trending", 14) + " সবচেয়ে বেশি পঠিত</button>" +
        '<button class="sort-tab" data-sort="short">' + I("zap", 14) + " সংক্ষিপ্ত লেখা</button>" +
      "</div>" +
      '<div id="catList"><div class="loading-block"><div class="loader"></div>লেখা আনা হচ্ছে…</div></div>' +
    "</div>";
  const posts = await loadPublished(true);
  if (staleView(view, gen)) return;
  const list = posts.filter(function (p) { return p.category === key; });
  $("#catCount").textContent = bn(list.length) + "টি লেখা";
  function render() {
    if (staleView(view, gen)) return;
    $$(".sort-tab", view).forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-sort") === catSort); });
    const sorted = list.slice();
    if (catSort === "popular") sorted.sort(function (a, b) { return b.viewCount - a.viewCount; });
    else if (catSort === "short") sorted.sort(function (a, b) { return readingMinutes(a.content) - readingMinutes(b.content); });
    const box = $("#catList");
    if (!sorted.length) {
      box.innerHTML = '<div class="empty-state"><div class="es-icon" style="color:' + c.grad[0] + '">' + catIcon(key, 60) + "</div>" +
        "<h3>এই বিভাগে এখনো লেখা আসেনি</h3><p>প্রথম লেখাটি আপনিই জমা দিতে পারেন।</p>" +
        '<a class="btn btn-gold btn-ic" href="#/submit">' + I("pen", 15) + ' লিখুন</a></div>';
      return;
    }
    box.innerHTML = '<div class="post-list">' + sorted.map(function (p, i) { return postRow(p, i + 1); }).join("") + "</div>";
  }
  $$(".sort-tab", view).forEach(function (b) {
    b.addEventListener("click", function () { catSort = b.getAttribute("data-sort"); render(); });
  });
  render();
}

/* ============================================================
   পোস্ট পড়া
============================================================ */
async function pagePost(view, id) {
  const gen = routeGen;
  setMeta(null);
  view.innerHTML = '<div class="loading-block" style="padding-top:110px"><div class="loader"></div>লেখাটি আনা হচ্ছে…</div>';
  let post;
  try { post = await getPostById(id); }
  catch (e) { if (!staleView(view, gen)) showPostDenied(view); return; }
  if (staleView(view, gen)) return;
  if (!post) return showPostNotFound(view);
  const isOwner = me && post.authorUid === me.uid;
  if (post.status !== "published" && !isOwner) return showPostNotFound(view);

  const c = catMeta(post.category);
  const saved = isBookmarked(id);
  const isPublished = post.status === "published";
  if (isPublished) { bumpView(id); pushHistory(post); }

  setMeta(post.title, makeExcerpt(post.content, 160));
  const writerName = displayName(post);

  view.innerHTML =
    '<article class="reading-wrap page-anim">' +
      '<div class="crumbs"><a href="#/">হোম</a> <span>›</span> <a href="#/cat/' + c.key + '">' +
      catIcon(c.key, 13) + " " + escapeHtml(c.name) + "</a></div>" +
      (post.status !== "published" ? '<div class="chip chip-' + (post.status === "pending" ? "pending" : "rejected") +
        '" style="font-size:.85rem;margin-bottom:12px;display:inline-flex;gap:6px;align-items:center">' + (post.status === "pending" ? I("clock", 14) + " এটি এখনো অনুমোদনের অপেক্ষায় আছে" : I("xCircle", 14) + " এটি অনুমোদিত হয়নি") + "</div>" : "") +
      '<header class="article-head"><h1>' + escapeHtml(post.title) + "</h1>" +
        '<div class="article-meta">' +
          '<a href="#/writer/' + encodeURIComponent(post.authorUid) + '">' + avatarHtml(writerName, post.authorPhotoURL, 48) + "</a>" +
          '<div class="am-info"><div class="nm"><a href="#/writer/' + encodeURIComponent(post.authorUid) + '">' + escapeHtml(writerName) + "</a></div>" +
          '<div class="sub"><span class="meta-ic">' + I("calendar", 13) + " " + escapeHtml(fmtDate(post.createdAt)) + "</span><span class='meta-ic'>" + I("clock", 13) + " " + bn(readingMinutes(post.content)) + " মিনিট পড়া</span>" +
          (isPublished ? "<span class='meta-ic'>" + I("eye", 13) + " " + bn(Math.max(post.viewCount, 1)) + " বার</span>" : "") + "</div>" +
          (post.authorBio ? '<div class="author-bio">' + escapeHtml(post.authorBio) + "</div>" : "") +
        "</div>" +
        '<div class="am-actions">' +
          '<button class="icon-btn' + (saved ? " active" : "") + '" id="bmBtn" title="বুকমার্ক">' + (saved ? I("bookmarkFill", 18) : I("bookmark", 18)) + "</button>" +
          '<button class="icon-btn" id="shareBtn" title="শেয়ার">' + I("share", 18) + "</button>" +
          '<div class="share-pop" id="sharePop">' +
            '<button data-share="native">' + I("share", 15) + " শেয়ার করুন</button>" +
            '<button data-share="copy">' + I("link", 15) + " লিংক কপি করুন</button>" +
            '<a data-share="wa" target="_blank" rel="noopener" class="sp-wa">' + I("whatsapp", 15) + " WhatsApp</a>" +
            '<a data-share="fb" target="_blank" rel="noopener" class="sp-fb">' + I("facebook", 15) + " Facebook</a>" +
          "</div>" +
        "</div></div>" +
      "</header>" +
      '<div class="article-body" id="articleBody">' + escapeHtml(post.content) + '</div>' +
      '<div class="article-end"><span class="ae-line"></span>' + I("feather", 17) + '<span class="ae-line"></span></div>' +
      '<div id="engageSlot"></div><div class="related-box" id="relatedBox"></div>' +
    "</article>";

  let serif = false;
  try { serif = localStorage.getItem("bt-read-serif") === "1"; } catch (e) {}
  $("#articleBody").classList.toggle("serif", serif);
  $("#readControls").classList.add("show");

  $("#bmBtn").addEventListener("click", function () {
    const on = toggleBookmark(id);
    $("#bmBtn").innerHTML = on ? I("bookmarkFill", 18) : I("bookmark", 18);
    $("#bmBtn").classList.toggle("active", on);
    toast(on ? "বুকমার্কে যুক্ত হয়েছে" : "বুকমার্ক সরানো হয়েছে");
  });

  const sharePop = $("#sharePop");
  // Hash routes are invisible to social crawlers. Share the generated static route instead;
  // its HTML contains the post's Open Graph metadata and redirects human visitors to the article.
  const url = new URL("/share/" + encodeURIComponent(id) + "/", location.origin).href;
  const shareText = post.title + " — তারুণ্যের বাতিঘর";
  $("#shareBtn").addEventListener("click", function (e) {
    e.stopPropagation(); sharePop.classList.toggle("open");
  });
  document.addEventListener("click", function (e) {
    if (sharePop.classList.contains("open") && !sharePop.contains(e.target) && e.target.id !== "shareBtn") sharePop.classList.remove("open");
  });
  sharePop.querySelector('[data-share="native"]').addEventListener("click", async function () {
    if (navigator.share) { try { await navigator.share({ title: shareText, url: url }); } catch (e) {} }
    else { try { await navigator.clipboard.writeText(url); toast("লিংক কপি হয়েছে", "success"); } catch (e) {} }
    sharePop.classList.remove("open");
  });
  sharePop.querySelector('[data-share="copy"]').addEventListener("click", async function () {
    try { await navigator.clipboard.writeText(url); toast("লিংক কপি হয়েছে", "success"); }
    catch (e) { prompt("লিংক কপি করুন:", url); }
    sharePop.classList.remove("open");
  });
  sharePop.querySelector('[data-share="wa"]').href = "https://wa.me/?text=" + encodeURIComponent(shareText + " " + url);
  sharePop.querySelector('[data-share="fb"]').href = "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(url);

  if (isPublished) {
    renderEngagement($("#engageSlot"), post, me);
    try {
      const posts = await loadPublished();
      if (staleView(view, gen)) return;
      const related = posts.filter(function (p) { return p.category === post.category && p.id !== id; }).slice(0, 3);
      if (related.length) {
        $("#relatedBox").innerHTML = "<h4>" + I("bookOpen", 16) + " একই বিভাগে আরও পড়ুন</h4>" + related.map(function (p) {
          return '<a class="related-item" href="#/post/' + p.id + '"><span class="t">' + escapeHtml(p.title) +
            '</span><span class="v meta-ic">' + I("eye", 13) + " " + bn(p.viewCount) + "</span></a>";
        }).join("");
      }
    } catch (e) {}
  } else {
    $("#engageSlot").innerHTML =
      '<div class="engage-card" style="text-align:center;color:var(--text-faint);font-size:.9rem">' +
      '<span class="denied-lock">' + I("lock", 22) + '</span>লেখাটি ' + (post.status === "pending" ? "অনুমোদনের অপেক্ষায় আছে" : "অনুমোদিত হয়নি") +
      " — প্রকাশের পর মন্তব্য ও রিয়্যাকশন চালু হবে।<br>" +
      '<a class="btn btn-gold btn-sm btn-ic" style="margin-top:12px" href="#/my">' + I("folder", 15) + ' আমার লেখায় ফিরে যান</a></div>';
  }
}
function showPostNotFound(view) {
  setMeta("লেখা পাওয়া যায়নি");
  view.innerHTML = '<div class="empty-state"><div class="es-icon">' + I("search", 36) + '</div><h3>লেখাটি খুঁজে পাওয়া যায়নি</h3>' +
    '<p>হয়তো এটি এখনো প্রকাশিত হয়নি, অথবা লিংকটি ভুল।</p><a class="btn btn-gold" href="#/">হোমে ফিরুন</a></div>';
}
function showPostDenied(view) {
  setMeta("অনুমতি নেই");
  view.innerHTML = '<div class="empty-state"><div class="es-icon">' + I("lock", 36) + '</div><h3>লেখাটি দেখার অনুমতি নেই</h3>' +
    '<p>পেন্ডিং লেখা শুধু লেখক নিজে ও স্টাফ দেখতে পারেন।</p><a class="btn btn-gold" href="#/">হোমে ফিরুন</a></div>';
}

/* ============================================================
   সার্চ পেজ
============================================================ */
let searchCat = "", searchSort = "latest";
async function pageSearch(view, q) {
  setMeta("খুঁজুন");
  view.innerHTML =
    '<div class="page-anim"><h1 class="page-title">' + I("search", 21) + " খুঁজুন</h1>" +
    '<div class="search-page-input"><input id="spInput" value="' + escapeHtml(q) + '" placeholder="শিরোনাম, লেখক বা লেখার ভেতরের শব্দ…">' +
    '<button class="btn btn-gold" id="spBtn">খুঁজুন</button></div>' +
    '<div class="filter-chips" id="spChips"><button class="filter-chip active" data-cat="">' + I("grid", 13) + " সব বিভাগ</button>" +
      CATEGORIES.map(function (c) { return '<button class="filter-chip" data-cat="' + c.key + '">' + catIcon(c.key, 13) + " " + escapeHtml(c.name) + "</button>"; }).join("") +
    "</div>" +
    '<div class="sort-tabs"><button class="sort-tab" data-sort="latest">' + I("history", 14) + " নতুন আগে</button>" +
    '<button class="sort-tab" data-sort="popular">' + I("trending", 14) + " জনপ্রিয় আগে</button></div>" +
    '<div id="spResults"><div class="loading-block"><div class="loader"></div>খোঁজা হচ্ছে…</div></div></div>';
  const input = $("#spInput");
  input.focus();
  function run() { doSearch(input.value.trim()); }
  $("#spBtn").addEventListener("click", run);
  input.addEventListener("keydown", function (e) { if (e.key === "Enter") run(); });
  $$("#spChips .filter-chip").forEach(function (b) {
    b.addEventListener("click", function () {
      searchCat = b.getAttribute("data-cat");
      $$("#spChips .filter-chip").forEach(function (x) { x.classList.toggle("active", x === b); });
      run();
    });
  });
  $$(".sort-tab", view).forEach(function (b) {
    b.addEventListener("click", function () {
      searchSort = b.getAttribute("data-sort");
      $$(".sort-tab", view).forEach(function (x) { x.classList.toggle("active", x === b); });
      run();
    });
  });
  doSearch(q);
  async function doSearch(term) {
    const box = $("#spResults");
    if (!box) return;
    const posts = await loadPublished();
    if (!box.isConnected) return;
    let hits = posts.slice();
    if (searchCat) hits = hits.filter(function (p) { return p.category === searchCat; });
    if (term) {
      const tl = term.toLowerCase();
      hits = hits.filter(function (p) {
        return (p.title || "").toLowerCase().includes(tl) ||
          (displayName(p) || "").toLowerCase().includes(tl) ||
          (p.content || "").toLowerCase().includes(tl);
      });
    }
    if (searchSort === "popular") hits.sort(function (a, b) { return b.viewCount - a.viewCount; });
    if (!hits.length) {
      box.innerHTML = '<div class="empty-state"><div class="es-icon">' + I("search", 36) + '</div><h3>কিছু পাওয়া যায়নি</h3><p>অন্য শব্দ বা বিভাগ দিয়ে চেষ্টা করুন।</p></div>';
      return;
    }
    box.innerHTML = '<p class="field-hint" style="margin-bottom:12px">' + bn(hits.length) + "টি লেখা পাওয়া গেছে</p>" +
      '<div class="post-list">' + hits.map(function (p, i) { return postRow(p, i + 1, term); }).join("") + "</div>";
  }
}

/* ============================================================
   লেখক প্রোফাইল
============================================================ */
async function pageWriter(view, uid) {
  const gen = routeGen;
  uid = decodeURIComponent(uid || "");
  setMeta("লেখক প্রোফাইল");
  view.innerHTML = '<div class="loading-block" style="padding-top:90px"><div class="loader"></div>লেখকের তথ্য আনা হচ্ছে…</div>';
  const posts = await loadPublished();
  if (staleView(view, gen)) return;
  const mine = posts.filter(function (p) { return p.authorUid === uid; });
  if (!mine.length) return showPostNotFound(view);
  const name = displayName(mine[0]);
  const photo = mine.find(function (p) { return p.authorPhotoURL; });
  const bio = (mine.find(function (p) { return p.authorBio; }) || {}).authorBio;
  const views = mine.reduce(function (a, p) { return a + (p.viewCount || 0); }, 0);
  const cats = {};
  mine.forEach(function (p) { cats[p.category] = (cats[p.category] || 0) + 1; });
  const favCat = Object.keys(cats).sort(function (a, b) { return cats[b] - cats[a]; })[0];
  setMeta(name + " — লেখক প্রোফাইল");
  view.innerHTML =
    '<div class="page-anim">' +
      '<div class="writer-head">' + avatarHtml(name, photo ? photo.authorPhotoURL : "", 96) +
        '<div class="writer-info"><h1>' + escapeHtml(name) + "</h1>" +
        (bio ? '<p class="w-bio">' + escapeHtml(bio) + "</p>" : "") +
        "<p>তারুণ্যের বাতিঘরের লেখক</p>" +
        (favCat ? '<p style="display:flex;gap:7px;align-items:center;margin-top:8px"><span style="color:var(--gold);display:inline-flex">' + catIcon(favCat, 17) + "</span><b>" + escapeHtml(catMeta(favCat).name) + "</b> বিভাগে সর্বাধিক লেখা</p>" : "") +
        "</div>" +
        '<div class="writer-stats">' +
          '<div class="ws"><b>' + bn(mine.length) + "</b><span>প্রকাশিত লেখা</span></div>" +
          '<div class="ws"><b>' + bn(views) + "</b><span>মোট পঠন</span></div>" +
          '<div class="ws"><b>' + bn(Object.keys(cats).length) + "</b><span>বিভাগ</span></div>" +
        "</div></div>" +
      '<div class="section-head"><h2>' + I("pen", 18) + " এই লেখকের রচনা</h2></div>" +
      '<div class="post-grid">' + mine.map(postCard).join("") + "</div>" +
    "</div>";
}

/* ============================================================
   লেখক ডিরেক্টরি
============================================================ */
async function pageWriters(view) {
  const gen = routeGen;
  setMeta("লেখকবৃন্দ");
  view.innerHTML =
    '<div class="page-anim"><h1 class="page-title">' + I("users", 22) + " লেখকবৃন্দ</h1>" +
    '<p class="page-sub">তারুণ্যের বাতিঘরের সব লেখক ও তাঁদের রচনা</p>' +
    '<div id="writersGrid"><div class="loading-block"><div class="loader"></div>লেখক তালিকা আনা হচ্ছে…</div></div></div>';
  const posts = await loadPublished();
  if (staleView(view, gen)) return;
  const m = new Map();
  posts.forEach(function (p) {
    if (!p.authorUid) return;
    let e = m.get(p.authorUid);
    if (!e) { e = { uid: p.authorUid, name: displayName(p), photo: p.authorPhotoURL || "", posts: 0, views: 0 }; m.set(p.authorUid, e); }
    e.posts++; e.views += p.viewCount || 0;
    if (!e.photo && p.authorPhotoURL) e.photo = p.authorPhotoURL;
  });
  const list = Array.from(m.values()).sort(function (a, b) { return b.posts * 10 + b.views - (a.posts * 10 + a.views); });
  if (!list.length) {
    $("#writersGrid").innerHTML = '<div class="empty-state"><div class="es-icon">' + I("feather", 38) + '</div><h3>এখনো কোনো লেখক নেই</h3></div>';
    return;
  }
  $("#writersGrid").innerHTML = '<div class="writers-grid">' + list.map(function (e, i) {
    return '<a class="writer-card rise" style="animation-delay:' + Math.min(i * 0.03, 0.4) + 's" href="#/writer/' + encodeURIComponent(e.uid) + '">' +
      (i < 3 ? '<span class="wc-rank wcr-' + ["g", "s", "b"][i] + '">' + bn(i + 1) + "</span>" : '<span class="wc-rank" style="color:var(--text-faint)">' + bn(i + 1) + "</span>") +
      avatarHtml(e.name, e.photo, 54) +
      '<div style="min-width:0"><div class="wc-name">' + escapeHtml(e.name) + "</div>" +
      '<div class="wc-sub">' + bn(e.posts) + " লেখা · " + I("eye", 12) + " " + bn(e.views) + "</div></div></a>";
  }).join("") + "</div>";
}

/* ============================================================
   লেখা জমা
============================================================ */
function pageSubmit(view) {
  setMeta("লেখা জমা দিন");
  if (!me) {
    view.innerHTML = '<div class="editor-card page-anim"><h1>' + I("pen", 22) + ' লেখা জমা দিন</h1>' +
      '<p class="lead">জমা দিতে আগে Google দিয়ে লগইন করুন — আপনার নামে লেখা প্রকাশিত হবে।</p>' +
      loginGate("lock", "লগইন প্রয়োজন", "লগইন সম্পূর্ণ বিনামূল্যে ও নিরাপদ।") + "</div>";
    const b = $("#gateLogin");
    if (b) b.addEventListener("click", function () {
      googleSignIn().then(function () { pageSubmit(view); }).catch(function (e) { alert(e.message || "লগইন ব্যর্থ"); });
    });
    return;
  }
  const draft = loadDraft();
  const profile = getLocalProfile();
  const catOpts = CATEGORIES.map(function (c) {
    return '<option value="' + c.key + '"' + (draft && draft.category === c.key ? " selected" : "") + ">" + c.name + "</option>";
  }).join("");
  view.innerHTML =
    '<div class="editor-card page-anim">' +
      "<h1>" + I("pen", 22) + " নতুন লেখা জমা দিন</h1>" +
      '<p class="lead">লেখা জমা হলে সম্পাদক পর্যালোচনা করে প্রকাশ করবেন; ফলাফল বেল-আইকনে জানতে পারবেন।</p>' +
      (profile.penName ? '<div class="guidelines gn-inline" style="padding:10px 16px"><span class="meta-ic">' + I("idCard", 14) + "</span> আপনি <b>" + escapeHtml(profile.penName) + "</b> কলম-নামে লিখছেন। <a href=\"javascript:void(0)\" id=\"editProfileLink\">পরিবর্তন করুন</a></div>" : "") +
      '<div class="guidelines"><strong class="gn-head">' + I("pin", 15) + " জমা দেওয়ার নিয়মাবলি</strong><ul>" +
        "<li>শিরোনাম ৩০০ অক্ষরের মধ্যে, লেখা ১,০০,০০০ অক্ষরের মধ্যে রাখুন।</li>" +
        "<li>নিজের মৌলিক লেখা জমা দিন; কপিরাইটকৃত লেখা গ্রহণযোগ্য নয়।</li>" +
        "<li>কুরআন-হাদিস উদ্ধৃতিতে সূত্র (সূরা/আয়াত, হাদিস গ্রন্থ) উল্লেখ করুন।</li>" +
        "<li>অশ্লীলতা, গালিগালাজ ও ব্যক্তিগত আক্রমণ এড়িয়ে যুক্তিনির্ভর লিখুন।</li>" +
        "<li>প্রতিটি অনুচ্ছেদ আলাদা লাইনে লিখুন — লেখা তেমনই প্রকাশিত হবে।</li>" +
      "</ul></div>" +
      '<div class="field"><label>শিরোনাম *</label><input id="fTitle" maxlength="300" placeholder="আকর্ষণীয় শিরোনাম লিখুন…" value="' + escapeHtml(draft ? draft.title : "") + '"></div>' +
      '<div class="field"><label>বিভাগ *</label><select id="fCategory">' + catOpts + "</select>" +
        '<span class="field-hint" id="fCatHint"></span></div>' +
      '<div class="field"><label>লেখার অংশ *</label><textarea id="fContent" placeholder="এখানে আপনার লেখা লিখুন…&#10;&#10;অনুচ্ছেদ আলাদা করতে নতুন লাইন নিন।">' +
        escapeHtml(draft ? draft.content : "") + "</textarea>" +
        '<div class="char-count" id="fCount"></div></div>' +
      '<div class="editor-actions"><button class="btn btn-ghost btn-ic" id="fDraft">' + I("save", 15) + " ড্রাফট সেভ</button>" +
      '<button class="btn btn-ghost btn-ic" id="fClear">' + I("trash", 15) + " মুছুন</button>" +
      '<button class="btn btn-gold btn-ic" id="fSubmit">' + I("rocket", 16) + " জমা দিন</button></div>" +
    "</div>";
  const link = $("#editProfileLink");
  if (link) link.addEventListener("click", openProfileModal);
  const titleEl = $("#fTitle"), catEl = $("#fCategory"), contentEl = $("#fContent"), countEl = $("#fCount");
  function updCount() {
    countEl.textContent = bn(contentEl.value.length) + " / ১,০০,০০০ অক্ষর";
    countEl.classList.toggle("over", contentEl.value.length > 100000);
    const c = catMeta(catEl.value);
    $("#fCatHint").innerHTML = catIcon(catEl.value, 14) + " " + escapeHtml(c.tagline);
  }
  contentEl.addEventListener("input", updCount); catEl.addEventListener("change", updCount); updCount();
  function gather() { return { title: titleEl.value.trim(), category: catEl.value, content: contentEl.value.trim() }; }
  let draftTimer = null;
  function autosave() {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(function () { const d = gather(); if (d.title || d.content) saveDraft(d); }, 800);
  }
  titleEl.addEventListener("input", autosave); contentEl.addEventListener("input", autosave);
  $("#fDraft").addEventListener("click", function () { saveDraft(gather()); toast("ড্রাফট সংরক্ষিত হয়েছে", "success"); });
  $("#fClear").addEventListener("click", function () {
    if (!confirm("লেখা ও ড্রাফট মুছে ফেলবেন?")) return;
    titleEl.value = ""; contentEl.value = ""; clearDraft(); updCount();
  });
  $("#fSubmit").addEventListener("click", async function () {
    const d = gather();
    if (d.title.length < 3) return toast("শিরোনাম লিখুন (অন্তত ৩ অক্ষর)", "error");
    if (d.content.length < 20) return toast("লেখা খুব ছোট — অন্তত ২০ অক্ষর লিখুন", "error");
    if (d.content.length > 100000) return toast("লেখা ১,০০,০০০ অক্ষরের মধ্যে রাখুন", "error");
    const btn = this; btn.disabled = true; btn.textContent = "জমা হচ্ছে…";
    try {
      const id = await submitPost({ title: d.title, content: d.content, category: d.category, user: me });
      await notifyStaffOfSubmission({
        postId: id, title: d.title, authorUid: me.uid,
        authorName: (getLocalProfile().penName || me.displayName || me.email || ""), category: d.category
      });
      clearDraft(); invalidateCache();
      toast("লেখা জমা হয়েছে! অনুমোদনের অপেক্ষায় আছে।", "success");
      setTimeout(function () { location.hash = "#/my?sent=1"; }, 700);
    } catch (e) {
      alert("জমা দেওয়া যায়নি:\n" + (e.message || ""));
      btn.disabled = false; btn.innerHTML = I("rocket", 16) + " জমা দিন";
    }
  });
}

/* ============================================================
   আমার লেখা
============================================================ */
function pageMy(view) {
  setMeta("আমার লেখা");
  if (!me) {
    view.innerHTML = '<div class="editor-card page-anim"><h1>' + I("folder", 22) + ' আমার লেখা</h1>' +
      '<p class="lead">আপনার জমা দেওয়া লেখার অবস্থা দেখতে লগইন করুন।</p>' +
      loginGate("lock", "লগইন প্রয়োজন", "") + "</div>";
    const b = $("#gateLogin");
    if (b) b.addEventListener("click", function () {
      googleSignIn().then(function () { render(); }).catch(function (e) { alert(e.message || "লগইন ব্যর্থ"); });
    });
    return;
  }
  view.innerHTML =
    '<div class="page-anim" style="max-width:840px;margin:0 auto">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:18px">' +
      "<h1 class='page-title' style='margin:0'>" + I("folder", 20) + " আমার লেখা</h1>" +
      '<div style="display:flex;gap:8px"><button class="btn btn-ghost btn-sm btn-ic" id="myProfileBtn">' + I("idCard", 14) + ' প্রোফাইল</button><a class="btn btn-gold btn-sm btn-ic" href="#/submit">' + I("pen", 14) + " নতুন লেখা</a></div></div>" +
      '<div id="sentBanner" class="guidelines" hidden><strong class="gn-head">' + I("checkCircle", 16) + ' আপনার লেখা সফলভাবে জমা হয়েছে!</strong>সম্পাদক অনুমোদন করলে এখানে স্ট্যাটাস আপডেট ও নোটিফিকেশন পাবেন।</div>' +
      '<div id="myList"><div class="loading-block"><div class="loader"></div>আপনার লেখা আনা হচ্ছে…</div></div>' +
    "</div>";
  $("#myProfileBtn").addEventListener("click", openProfileModal);
  if (location.hash.indexOf("sent=1") !== -1) $("#sentBanner").hidden = false;
  getMyPosts(me.uid).then(function (docs) {
    const myList = $("#myList");
    if (!myList) return;
    if (!docs.length) {
      $("#myList").innerHTML = '<div class="empty-state"><div class="es-icon">' + I("feather", 38) + '</div><h3>আপনি এখনো কিছু জমা দেননি</h3>' +
        '<p>প্রথম লেখাটি আজই জমা দিন।</p><a class="btn btn-gold btn-ic" href="#/submit">' + I("pen", 16) + ' লিখতে শুরু করুন</a></div>';
      return;
    }
    const chips = {
      pending: '<span class="chip chip-pending chip-ic">' + I("clock", 13) + " পেন্ডিং</span>",
      published: '<span class="chip chip-published chip-ic">' + I("checkCircle", 13) + " প্রকাশিত</span>",
      rejected: '<span class="chip chip-rejected chip-ic">' + I("xCircle", 13) + " বাতিল</span>"
    };
    $("#myList").innerHTML = docs.map(function (p) {
      const c = catMeta(p.category);
      return '<div class="mypost-item"><div class="mypost-head" data-id="' + p.id + '" data-status="' + p.status + '">' +
        '<div style="min-width:0"><h3>' + escapeHtml(p.title) + "</h3>" +
        '<div class="mypost-meta"><span style="display:inline-flex;gap:5px;align-items:center;color:var(--gold)">' + catIcon(p.category, 13) + " " + escapeHtml(c.name) + "</span>" +
        "<span class='meta-ic'>" + I("calendar", 13) + " " + escapeHtml(fmtDate(p.createdAt)) + "</span>" + (chips[p.status] || "") + "</div>" +
        (p.status === "rejected" && p.rejectReason ? '<div class="reject-note">কারণ: ' + escapeHtml(p.rejectReason) + "</div>" : "") +
        "</div>" +
        (p.status === "published" ? '<a class="btn btn-ghost btn-sm btn-ic" href="#/post/' + p.id + '">' + I("bookOpen", 14) + " পড়ুন</a>"
          : '<button class="btn btn-ghost btn-sm mp-toggle">▾</button>') +
      "</div>" +
      (p.status !== "published" ? '<div class="mypost-body">' + escapeHtml(p.content) + "</div>" : "") +
    "</div>";
    }).join("");
    $$(".mypost-head").forEach(function (head) {
      head.addEventListener("click", function (e) {
        if (e.target.closest("a")) return;
        const body = head.parentElement.querySelector(".mypost-body");
        if (body) body.classList.toggle("open");
      });
    });
  }).catch(function (e) {
    $("#myList").innerHTML = '<div class="empty-state"><p>' + escapeHtml(e.message || "লোড ব্যর্থ") + "</p></div>";
  });
}

/* ============================================================
   বুকমার্ক
============================================================ */
async function pageBookmarks(view) {
  const gen = routeGen;
  setMeta("বুকমার্ক");
  view.innerHTML =
    '<div class="page-anim"><h1 class="page-title">' + I("bookmark", 20) + " বুকমার্ক</h1>" +
    '<p class="page-sub">এই ডিভাইসে সংরক্ষিত আপনার পছন্দের লেখা</p>' +
    '<div id="bmList"><div class="loading-block"><div class="loader"></div>আনা হচ্ছে…</div></div></div>';
  const ids = getBookmarks();
  if (!ids.length) {
    $("#bmList").innerHTML = '<div class="empty-state"><div class="es-icon">' + I("bookmark", 38) + '</div><h3>কোনো বুকমার্ক নেই</h3>' +
      '<p>লেখা পড়ার সময় বুকমার্ক চিহ্নে চাপ দিলে লেখা এখানে জমা হবে।</p><a class="btn btn-gold" href="#/">লেখা খুঁজুন</a></div>';
    return;
  }
  const posts = await loadPublished();
  if (staleView(view, gen)) return;
  const saved = ids.map(function (id) { return posts.find(function (p) { return p.id === id; }); }).filter(Boolean);
  if (!saved.length) {
    $("#bmList").innerHTML = '<div class="empty-state"><div class="es-icon">' + I("bookmark", 38) + '</div><h3>বুকমার্ককৃত লেখাগুলো খুঁজে পাওয়া যাচ্ছে না</h3></div>';
    return;
  }
  $("#bmList").innerHTML = '<div class="post-grid">' + saved.map(postCard).join("") + "</div>";
}

/* ============================================================
   পঠন-ইতিহাস
============================================================ */
function pageHistory(view) {
  setMeta("সম্প্রতি পড়া");
  const hist = getHistory();
  view.innerHTML =
    '<div class="page-anim" style="max-width:840px;margin:0 auto"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">' +
      "<h1 class='page-title'>" + I("history", 20) + " সম্প্রতি পড়া</h1>" +
      (hist.length ? '<button class="btn btn-ghost btn-sm btn-ic" id="clearHist">' + I("trash", 14) + " তালিকা মুছুন</button>" : "") +
    "</div>" +
    '<div id="histList"></div></div>';
  const box = $("#histList");
  if (!hist.length) {
    box.innerHTML = '<div class="empty-state"><div class="es-icon">' + I("history", 38) + '</div><h3>এখনো কিছু পড়া হয়নি</h3>' +
      '<a class="btn btn-gold" href="#/">লেখা পড়ুন</a></div>';
    return;
  }
  box.innerHTML = '<div class="post-list">' + hist.map(function (h, i) {
    return '<a class="post-row" href="#/post/' + h.id + '"><div class="pr-num">' + bn(i + 1) + "</div>" +
      '<div class="pr-body"><div style="display:flex;gap:9px;align-items:center;flex-wrap:wrap">' +
      '<span class="cat-badge" style="background:linear-gradient(135deg,' + catMeta(h.category).grad[0] + "," + catMeta(h.category).grad[1] + ')">' + catIcon(h.category, 13) + " " + escapeHtml(catMeta(h.category).name) + "</span>" +
      '<span class="meta-date">' + I("clock", 12) + " " + escapeHtml(relTime(h.at)) + "</span></div>" +
      "<h3>" + escapeHtml(h.title) + '</h3><div class="pr-meta"><span class="meta-ic">' + I("pen", 13) + " " + escapeHtml(h.authorName || "অজ্ঞাত") + "</span></div></div></a>";
  }).join("") + "</div>";
  $("#clearHist").addEventListener("click", function () {
    if (!confirm("পঠন-ইতিহাস মুছবেন?")) return;
    clearHistory(); pageHistory(view);
  });
}

/* ============================================================
   দৈনিক বাণীর সংগ্রহ (Firestore — স্টাফ যোগ করেন)
============================================================ */
let quoteBatch = 12;
async function pageQuotes(view) {
  const gen = routeGen;
  setMeta("দৈনিক বাণী", "প্রতিদিনের নির্বাচিত বাণী ও আগের বাণীসমূহ");
  view.innerHTML =
    '<div class="page-anim quotes-page">' +
      '<div class="q-page-head"><div><h1 class="page-title">' + I("quote", 22) + " দৈনিক বাণী</h1>" +
      '<p class="page-sub">সম্পাদনা পরিষদ প্রতিদিন একটি নতুন বাণী নির্বাচন করেন — আজকেরটি বড় করে, আগের দিনগুলো নিচে সাজানো</p></div>' +
      (isStaff() ? '<button class="btn btn-gold btn-ic" id="qManage">' + I("plus", 15) + " বাণী যোগ/ম্যানেজ</button>" : "") +
      "</div>" +
      '<div id="quoteBody"><div class="loading-block" style="padding:60px"><div class="loader"></div>বাণী আনা হচ্ছে…</div></div>' +
    "</div>";
  const qManage = $("#qManage");
  if (qManage) qManage.addEventListener("click", function () { openAdminPanel("quotes"); });

  let quotes;
  try { quotes = await loadQuotes(true); }
  catch (e) {
    if (staleView(view, gen)) return;
    /* অনুমতি না থাকা/খালি ভাণ্ডার — ভিজিটরকে এরর না দেখিয়ে খালি-স্টেট */
    quotes = [];
  }
  if (staleView(view, gen)) return;

  const todayN = dayIndexOf(new Date());
  const tq = pickQuoteOfDay(quotes, todayN);
  const body = $("#quoteBody");

  if (!tq) {
    body.innerHTML =
      '<div class="empty-state" style="padding:60px 24px"><div class="es-icon">' + I("quote", 44) + '</div>' +
      "<h3>এখনো কোনো বাণী সংগ্রহে নেই</h3>" +
      "<p>সম্পাদনা পরিষদ শিগগিরই প্রতিদিনের বাণী যোগ করবেন।</p>" +
      (isStaff() ? '<button class="btn btn-gold btn-ic" id="qManage2">' + I("plus", 16) + " প্রথম বাণীটি যোগ করুন</button>" : "") +
      "</div>";
    const b2 = $("#qManage2");
    if (b2) b2.addEventListener("click", function () { openAdminPanel("quotes"); });
    return;
  }

  const isToday = tq.day === todayN;
  const past = quotes.filter(function (q) { return q.day <= tq.day && q.id !== tq.id; })
    .sort(function (a, b) { return b.day - a.day; });

  body.innerHTML =
    '<section class="quote-today" id="quoteToday">' +
      '<div class="qt-badge">' + I("sparkles", 14) +
        " <span>" + (isToday ? "আজকের বাণী" : "সর্বশেষ বাণী") + "</span> · " + escapeHtml(bnDateOfDay(tq.day)) + "</div>" +
      '<blockquote>“' + escapeHtml(tq.text) + '”</blockquote>' +
      '<cite>' + escapeHtml(tq.author) + "</cite>" +
      (tq.postId ? '<a class="qt-source" href="#/post/' + tq.postId + '">' + I("bookOpen", 13) +
        " সূত্র: " + escapeHtml(tq.sourceTitle || "মূল লেখা") + "</a>" : "") +
      '<div class="qt-actions">' +
        '<button class="btn btn-gold btn-sm btn-ic" id="qtCopy">' + I("copy", 14) + " বাণীটি কপি করুন</button>" +
        '<button class="btn btn-ghost btn-sm btn-ic" id="qtShare">' + I("share", 14) + " শেয়ার করুন</button>" +
      "</div>" +
    "</section>";

  if (past.length) {
    body.insertAdjacentHTML("beforeend",
      '<div class="section-head q-archive-head"><h2>' + I("bookOpen", 18) + " আগের বাণীসমূহ</h2>" +
        '<span class="rh-sub">সংগ্রহে ' + bn(past.length + 1) + "টি বাণী</span></div>" +
      '<div class="quote-archive" id="quoteArchive"></div>' +
      '<div class="quote-more-wrap" ' + (past.length <= quoteBatch ? "hidden" : "") + '>' +
        '<button class="btn btn-ghost btn-ic" id="quoteMore">' + I("history", 16) + " আরও আগের বাণী</button></div>");
  }

  function quoteCard(q) {
    return '<article class="quote-card qc-day">' +
      '<div class="qc-date">' + I("clock", 13) + " <span>" + escapeHtml(bnDateOfDay(q.day)) + "</span></div>" +
      '<blockquote>“' + escapeHtml(q.text) + '”</blockquote>' +
      '<cite>' + escapeHtml(q.author) + "</cite>" +
      (q.postId ? '<a class="qc-source" href="#/post/' + q.postId + '">' + I("bookOpen", 12) + " " +
        escapeHtml(q.sourceTitle || "মূল লেখা") + "</a>" : "") +
    "</article>";
  }

  const archive = $("#quoteArchive");
  const moreBtn = $("#quoteMore");
  if (archive) {
    let shown = 0;
    function renderBatch() {
      const frag = [];
      for (let i = 0; i < quoteBatch && shown < past.length; i++) frag.push(quoteCard(past[shown++]));
      archive.insertAdjacentHTML("beforeend", frag.join(""));
      if (shown >= past.length && moreBtn) moreBtn.parentElement.hidden = true;
    }
    renderBatch();
    if (moreBtn) moreBtn.addEventListener("click", renderBatch);
  }

  function quoteText(q) {
    let t = "“" + q.text + "” — " + q.author;
    if (q.sourceTitle) t += " («" + q.sourceTitle + "», তারুণ্যের বাতিঘর)";
    else t += "\n(তারুণ্যের বাতিঘর)";
    return t;
  }
  $("#qtCopy").addEventListener("click", async function () {
    try { await navigator.clipboard.writeText(quoteText(tq)); toast("বাণীটি কপি হয়েছে", "success"); }
    catch (e) { try { prompt("বাণীটি কপি করুন:", quoteText(tq)); } catch (e2) {} }
  });
  $("#qtShare").addEventListener("click", async function () {
    const url = location.origin + location.pathname + "#/quotes";
    if (navigator.share) { try { await navigator.share({ title: "আজকের বাণী — তারুণ্যের বাতিঘর", text: quoteText(tq), url: url }); } catch (e) {} }
    else { try { await navigator.clipboard.writeText(quoteText(tq) + " " + url); toast("লিংকসহ বাণী কপি হয়েছে", "success"); } catch (e) {} }
  });
}

/* ============================================================
   ৪০৪
============================================================ */
function pageNotFound(view) {
  setMeta("পেজ পাওয়া যায়নি");
  view.innerHTML = '<div class="empty-state"><div class="es-icon">' + I("compass", 38) + '</div><h3>পেজটি খুঁজে পাওয়া যায়নি</h3>' +
    '<a class="btn btn-gold" href="#/">হোমে ফিরুন</a></div>';
}

/* ============================================================
   পরিচিতি
============================================================ */
function pageAbout(view) {
  setMeta("পরিচিতি ও নিয়মাবলি");
  view.innerHTML =
    '<div class="about-card page-anim">' +
    "<h2>" + brandIcon(22) + " তারুণ্যের বাতিঘর কী?</h2>" +
    "<p>তারুণ্যের বাতিঘর তারুণ্যের কলমে সত্যের কথা বলার একটি মুক্ত বাংলা সাহিত্য-পত্রিকা। " +
    "কবিতা, গল্প-উপন্যাস, প্রবন্ধ, আয়াত ও হাদিস, নাস্তিকতার যৌক্তিক জবাব, প্রতিবাদ, জীবনীসহ " +
    bn(CATEGORIES.length) + "টি বিভাগে যে কেউ লেখা জমা দিতে পারেন।</p>" +
    "<h2>" + I("pen", 19) + " কীভাবে লেখা জমা দেবেন?</h2>" +
    "<ul><li>উপরে ডান কোণে <b>লগইন</b>-এ চাপ দিয়ে Google অ্যাকাউন্টে প্রবেশ করুন।</li>" +
    "<li>প্রোফাইল মেনু থেকে ইচ্ছে করলে <b>কলম-নাম</b> ও সংক্ষিপ্ত পরিচিতি সেট করুন — এ নামেই আপনার লেখা প্রকাশ হবে।</li>" +
    "<li><b>“লিখুন”</b> বাটনে চাপ দিন; শিরোনাম, বিভাগ বেছে নিয়ে লেখা লিখুন বা পেস্ট করুন। লেখা নিজে থেকেই ড্রাফট হিসেবে সংরক্ষিত হয়।</li>" +
    "<li>জমা হলে লেখা <b>পেন্ডিং</b> থাকবে; সম্পাদক অনুমোদন করলে সাইটে প্রকাশ পাবে।</li>" +
    "<li>অনুমোদন/বাতিলের খবর বেল ও ব্রাউজার পুশ নোটিফিকেশনে পাবেন।</li></ul>" +
    "<h2>" + I("sparkles", 19) + " বিশেষ সুবিধা</h2>" +
    "<ul><li>" + bn(CATEGORIES.length) + "টি বিভাগ, রঙিন ও পরিপাটি রিডিং মোড — অক্ষর বড়-ছোট, সেরিফ ফন্ট, শোনার ব্যবস্থা (টেক্সট-টু-স্পিচ), প্রিন্ট/পিডিএফ।</li>" +
    "<li>শক্তিশালী সার্চ, সেরা লেখক তালিকা, লেখক প্রোফাইল, বুকমার্ক ও পঠন-ইতিহাস।</li>" +
    "<li>মোবাইলে অ্যাপের মতো ইন্টারফেস; হোম স্ক্রিনে যুক্ত করে অফলাইনেও পড়া যায়।</li></ul>" +
    "<h2>" + I("pin", 19) + " কোন লেখা গ্রহণযোগ্য?</h2>" +
    "<ul><li>মৌলিক, যাচাইযোগ্য ও যুক্তিনির্ভর লেখা;</li>" +
    "<li>কুরআন-হাদিস উদ্ধৃতিতে সূত্র উল্লেখ;</li>" +
    "<li>অশ্লীলতা, গালিগালাজ, সাম্প্রদায়িক বিদ্বেষ ও ব্যক্তিগত আক্রমণ ব্যতীত;</li>" +
    "<li>কপিরাইটকৃত লেখার হুবহু নকল নয় এমন।</li></ul>" +
    "<h2>" + I("shield", 19) + " মডারেশন সিস্টেম</h2>" +
    "<p>সাইটে একজন প্রধান অ্যাডমিন ও একাধিক মডারেটর থাকেন। তাঁরা লেখা সম্পাদনা, ফিচার্ড হিসেবে চিহ্নিতকরণ, প্রকাশ বা বাতিল করতে পারেন; " +
    "লেখক বাতিলের কারণ দেখতে পান এবং শুধরে আবার জমা দিতে পারেন। সব কার্যক্রম ইতিহাসে সংরক্ষিত থাকে।</p>" +
    '<div class="about-cta"><a class="btn btn-gold btn-ic" href="#/submit">' + I("pen", 17) + " এখনই লেখা জমা দিন</a></div>" +
    "</div>";
}


/* ---------------- স্ক্রল প্রগ্রেস ---------------- */
window.addEventListener("scroll", function () {
  const bar = $("#scrollProgress");
  const isPost = location.hash.indexOf("/post/") !== -1;
  if (!isPost) { bar.classList.remove("show"); return; }
  bar.classList.add("show");
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const pct = max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0;
  bar.firstElementChild.style.width = pct + "%";
}, { passive: true });

initShell();
