// @ts-nocheck
/* ============================================================
   তারুণ্যের বাতিঘর — মূল অ্যাপ v2 (প্রিমিয়াম পত্রিকা)
   রাউটার + শেল + সব পেজ
============================================================ */

import {
  onAuthChange, currentUser,
  googleSignIn, logout
} from "./fb.js";
import {
  loadPublished, getPostById, submitPost, getMyPosts, bumpView,
  getBookmarks, toggleBookmark, isBookmarked,
  saveDraft, loadDraft, clearDraft,
  notifyStaffOfSubmission, invalidateCache,
  escapeHtml, bn, fmtDate, relTime, readingMinutes, makeExcerpt, tsMs, _setCurrentUid
} from "./store.js";
import { CATEGORIES, catMeta, catName } from "./categories.js";
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

/* ---------------- অ্যাভাটার/কার্ড হেল্পার ---------------- */

const AV_COLORS = ["#f87171", "#fb923c", "#fbbf24", "#34d399", "#38bdf8", "#818cf8", "#c084fc", "#f472b6"];
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
  if (ghost) return '<span class="cat-badge ghost">' + c.icon + " " + escapeHtml(c.name) + "</span>";
  return '<span class="cat-badge" style="background:linear-gradient(135deg,' + c.grad[0] + "," + c.grad[1] + ')">' +
    c.icon + " " + escapeHtml(c.name) + "</span>";
}

function postCard(p) {
  return '<a class="post-card" href="#/post/' + p.id + '">' +
    '<div class="pc-top">' + catBadge(p.category) +
      '<span style="font-size:.72rem;color:var(--text-faint)">🕂 ' + escapeHtml(relTime(p.createdAt)) + "</span></div>" +
    "<h3>" + escapeHtml(p.title || "") + "</h3>" +
    '<p class="pc-excerpt">' + escapeHtml(makeExcerpt(p.content, 150)) + "</p>" +
    '<div class="pc-meta"><span class="pc-author">' + miniAvatar(p.authorName, p.authorPhotoURL) +
      '<span class="nm">' + escapeHtml(p.authorName || "অজ্ঞাত") + "</span></span>" +
      '<span class="pc-stats">👁️ ' + bn(p.viewCount) + "</span></div></a>";
}

function postRow(p, rank) {
  return '<a class="post-row" href="#/post/' + p.id + '">' +
    (rank ? '<div class="pr-num">' + bn(rank) + "</div>" : "") +
    '<div class="pr-body">' +
      '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">' + catBadge(p.category) +
      '<span style="font-size:.72rem;color:var(--text-faint)">🕂 ' + escapeHtml(relTime(p.createdAt)) + "</span></div>" +
      "<h3>" + escapeHtml(p.title || "") + "</h3>" +
      '<p class="pr-excerpt">' + escapeHtml(makeExcerpt(p.content, 200)) + "</p>" +
      '<div class="pr-meta"><span>✍️ ' + escapeHtml(p.authorName || "অজ্ঞাত") + "</span>" +
      "<span>👁️ " + bn(p.viewCount) + " বার</span><span>⏱ " + bn(readingMinutes(p.content)) + " মিনিট পড়া</span></div>" +
    "</div></a>";
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

/* ============================================================
   শেল ইনিশিয়ালাইজ
============================================================ */

let me = null;
let myRole = "none";
let publishedCache = [];

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

  /* ব্যাকগ্রাউন্ডে ক্যাটাগরি কাউন্ট */
  loadPublished().then(fillCatCounts).catch(function () {});
}

/* ---------- থিম ---------- */
function initTheme() {
  $("#themeToggleBtn").addEventListener("click", function () {
    const cur = document.documentElement.getAttribute("data-theme");
    const next = cur === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("bt-theme", next); } catch (e) {}
  });
}

/* ---------- নেভ প্যানেল ---------- */
function initNavPanels() {
  const catBtn = $("#navCatBtn");
  const catPanel = $("#catPanel");
  const grid = $("#catPanelGrid");
  const mobileCats = $("#mobileCats");

  grid.innerHTML = CATEGORIES.map(function (c) {
    return '<a class="cat-tile" href="#/cat/' + c.key + '"><span class="ci" style="background:linear-gradient(135deg,' +
      c.grad[0] + "," + c.grad[1] + ')">' + c.icon + '</span><span class="cn">' + escapeHtml(c.name) +
      '<span class="cc" data-count="' + c.key + '"></span></span></a>';
  }).join("");
  mobileCats.innerHTML = CATEGORIES.slice(0, 12).map(function (c) {
    return '<a href="#/cat/' + c.key + '">' + c.icon + " " + escapeHtml(c.name) + "</a>";
  }).join("") + '<a href="#/categories">🧭 সব বিভাগ…</a>';

  function closeCat() { catPanel.hidden = true; catBtn.setAttribute("aria-expanded", "false"); }
  catBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    const open = !catPanel.hidden;
    catPanel.hidden = open;
    catBtn.setAttribute("aria-expanded", String(!open));
  });
  document.addEventListener("click", function (e) {
    if (!catPanel.hidden && !catPanel.contains(e.target) && e.target !== catBtn && !catBtn.contains(e.target)) closeCat();
  });
  catPanel.addEventListener("click", closeCat);

  const burger = $("#navBurger");
  const mm = $("#mobileMenu");
  burger.addEventListener("click", function (e) {
    e.stopPropagation(); mm.hidden = !mm.hidden;
  });
  mm.addEventListener("click", function (e) {
    if (e.target && e.target.id === "mmTheme") { $("#themeToggleBtn").click(); return; }
    mm.hidden = true;
  });

  $("#navWriteBtn").addEventListener("click", function () { goWrite(); });

  $("#searchOpenBtn").addEventListener("click", openSearch);
}

function fillCatCounts(posts) {
  const counts = {};
  posts.forEach(function (p) { counts[p.category] = (counts[p.category] || 0) + 1; });
  $$("[data-count]").forEach(function (el) {
    const n = counts[el.getAttribute("data-count")] || 0;
    el.textContent = n ? bn(n) + "টি" : "";
  });
}

/* ---------- সার্চ ওভারলে ---------- */
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
  });

  input.addEventListener("input", function () {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(function () { renderSuggest(input.value.trim(), suggest); }, 180);
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
  $("#searchSuggest").innerHTML = '<div class="sg-empty">লেখার শিরোনাম, লেখকের নাম বা লেখার ভেতরের শব্দ লিখুন…</div>';
  setTimeout(function () { $("#globalSearchInput").focus(); }, 60);
}
function closeSearch() { $("#searchOverlay").hidden = true; }

async function renderSuggest(q, box) {
  if (!q) { box.innerHTML = '<div class="sg-empty">অন্তত একটি শব্দ লিখুন…</div>'; return; }
  const posts = await loadPublished();
  const ql = q.toLowerCase();
  const hits = posts.filter(function (p) {
    return (p.title || "").toLowerCase().includes(ql) ||
      (p.authorName || "").toLowerCase().includes(ql) ||
      (p.content || "").toLowerCase().includes(ql);
  }).slice(0, 8);
  if (!hits.length) { box.innerHTML = '<div class="sg-empty">“' + escapeHtml(q) + '” — কিছু পাওয়া যায়নি</div>'; return; }
  box.innerHTML = hits.map(function (p) {
    return '<button type="button" class="sg-item" data-id="' + p.id + '" style="width:100%;text-align:left;border:none;background:none">' +
      '<span style="font-size:1.15rem">' + catMeta(p.category).icon + '</span>' +
      '<span style="min-width:0"><span class="sg-title" style="display:block;white-space:normal">' + escapeHtml(p.title) +
      '</span><span class="sg-sub">✍️ ' + escapeHtml(p.authorName || "অজ্ঞাত") + " · 👁️ " + bn(p.viewCount) + "</span></span></button>";
  }).join("");
  $$(".sg-item", box).forEach(function (el) {
    el.addEventListener("click", function () { closeSearch(); location.hash = "#/post/" + el.getAttribute("data-id"); });
  });
}

/* ---------- ইউজার UI ---------- */
function initUserUI() {
  const loginBtn = $("#loginBtn");
  const chip = $("#avatarChip");
  const chipImg = $("#avatarChipImg");
  const chipIni = $("#avatarChipInitial");
  const dd = $("#userDropdown");

  loginBtn.addEventListener("click", function () {
    googleSignIn().catch(function (e) { return alert("❌ লগইন ব্যর্থ: " + (e.message || "")); });
  });
  chip.addEventListener("click", function (e) {
    e.stopPropagation();
    dd.hidden = !dd.hidden;
  });
  document.addEventListener("click", function (e) {
    if (!dd.hidden && !dd.contains(e.target) && e.target !== chip) dd.hidden = true;
  });
  $("#logoutBtn").addEventListener("click", function () {
    logout().then(function () { dd.hidden = true; toast("লগআউট হয়েছে"); });
  });
  $("#ddAdminBtn").addEventListener("click", function () {
    dd.hidden = true; openAdminPanel();
  });
  $("#ddPushBtn").addEventListener("click", async function () {
    const r = await enablePush();
    if (r.ok) toast("🔔 নোটিফিকেশন চালু হয়েছে", "success");
    else if (r.reason === "denied") toast("ব্রাউজারে নোটিফিকেশন ব্লক করা", "error");
    else if (r.reason === "unsupported") toast("এই ব্রাউজারে পুশ সাপোর্ট নেই");
    else toast("চেষ্টা ব্যর্থ, পরে আবার দেখুন", "error");
  });

  onAuthChange(function (user, role) {
    me = user; myRole = role;
    _setCurrentUid(user ? user.uid : null);
    if (user) {
      loginBtn.hidden = true;
      chip.hidden = false;
      const name = user.displayName || user.email || "?";
      if (user.photoURL) { chipImg.src = user.photoURL; chipImg.style.display = "block"; chipIni.textContent = ""; }
      else { chipImg.style.display = "none"; chipIni.textContent = name.trim().charAt(0); chipIni.style.background = "linear-gradient(135deg,#6366f1,#0d9488)"; }
      $("#ddUserName").textContent = name;
      $("#ddUserEmail").textContent = user.email || "";
      $("#ddAdminBtn").hidden = role !== "admin" && role !== "moderator";
      const pb = $("#ddPushBtn");
      if (pushStatus() === "granted") pb.innerHTML = "✅ নোটিফিকেশন চালু আছে";
    } else {
      loginBtn.hidden = false;
      chip.hidden = true;
      dd.hidden = true;
      $("#ddAdminBtn").hidden = true;
    }
  });
}

function goWrite() {
  if (me) { location.hash = "#/submit"; return; }
  googleSignIn().then(function () { location.hash = "#/submit"; })
    .catch(function (e) { return alert("❌ লগইন ব্যর্থ: " + (e.message || "")); });
}

function loginGate(icon, title, sub) {
  return '<div class="empty-state"><div class="es-icon">' + icon + '</div><h3>' + title + '</h3><p>' + sub + '</p>' +
    '<button class="google-btn" id="gateLogin">' +
    '<svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>' +
    " Google দিয়ে লগইন</button></div>";
}

/* ---------- রিডিং কন্ট্রোল ---------- */
function initReadControls() {
  const bar = document.createElement("div");
  bar.className = "read-controls";
  bar.id = "readControls";
  bar.innerHTML =
    '<button id="rcMinus" title="অক্ষর ছোট">A−</button>' +
    '<button id="rcPlus" title="অক্ষর বড়">A+</button>' +
    '<span class="rc-sep"></span>' +
    '<button id="rcFont" title="ফন্ট পাল্টান">🅰️</button>' +
    '<button id="rcTheme" title="থিম">🌓</button>' +
    '<span class="rc-label">পড়ার সেটিং</span>';
  document.body.appendChild(bar);

  const sizes = ["1rem", "1.0625rem", "1.125rem", "1.2rem", "1.32rem"];
  let si = 2, serif = false;
  try {
    const savedS = localStorage.getItem("bt-read-size");
    if (savedS !== null) { si = parseInt(savedS, 10); }
    serif = localStorage.getItem("bt-read-serif") === "1";
  } catch (e) {}
  function apply() {
    document.documentElement.style.setProperty("--read-size", sizes[si]);
    document.documentElement.style.setProperty("--read-font", serif
      ? '"Noto Serif Bengali", "Noto Color Emoji", serif'
      : '"Hind Siliguri", "Noto Color Emoji", sans-serif');
    $$(".article-body").forEach(function (b) { b.classList.toggle("serif", serif); });
  }
  bar.querySelector("#rcMinus").addEventListener("click", function () { si = Math.max(0, si - 1); localStorage.setItem("bt-read-size", String(si)); apply(); });
  bar.querySelector("#rcPlus").addEventListener("click", function () { si = Math.min(sizes.length - 1, si + 1); localStorage.setItem("bt-read-size", String(si)); apply(); });
  bar.querySelector("#rcFont").addEventListener("click", function () { serif = !serif; localStorage.setItem("bt-read-serif", serif ? "1" : "0"); apply(); });
  bar.querySelector("#rcTheme").addEventListener("click", function () { $("#themeToggleBtn").click(); });
  apply();
}

/* ---------- সার্ভিস ওয়ার্কার ---------- */
function initServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("service-worker.js").then(function (reg) {
    /* শুধু প্রকৃত আপডেটের সময় (updatefound + পেজ আগে থেকেই
       কোনো SW দিয়ে নিয়ন্ত্রিত) ব্যানার দেখানো হবে — প্রথম
       ইনস্টল বা রিলোডে বিরক্তিকর পপ-আপ আসবে না */
    reg.addEventListener("updatefound", function () {
      const w = reg.installing;
      if (!w) return;
      w.addEventListener("statechange", function () {
        if (w.state === "installed" && navigator.serviceWorker.controller) {
          $("#updateBanner").hidden = false;
        }
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

/* ============================================================
   রাউটার
============================================================ */
function initRouter() {
  /* পুরোনো লিংক সামঞ্জস্য: #cat/x → #/cat/x, #post/x → #/post/x */
  const h = location.hash;
  const legacy = h.match(/^#(cat|post)\/(.+)$/);
  if (legacy) location.replace("#/" + legacy[1] + "/" + legacy[2]);

  window.addEventListener("hashchange", render);
  render();
}

function setActiveNav(route) {
  $$("[data-nav]").forEach(function (a) {
    a.classList.toggle("active", a.getAttribute("data-nav") === route);
  });
  $$(".bn-item").forEach(function (a) { a.classList.remove("active"); });
  const bnMap = { home: "home", leaderboard: "lb" };
  if (bnMap[route]) { const el = $('.bn-item[data-bn="' + bnMap[route] + '"]'); if (el) el.classList.add("active"); }
  if (location.hash.startsWith("#/cat")) { const el = $('.bn-item[data-bn="cats"]'); if (el) el.classList.add("active"); }
  if (location.hash.startsWith("#/my")) { const el = $('.bn-item[data-bn="me"]'); if (el) el.classList.add("active"); }
  if (location.hash.startsWith("#/submit")) { const el = $('.bn-item[data-bn="write"]'); if (el) el.classList.add("active"); }
}

async function render() {
  $("#mobileMenu").hidden = true;
  $("#catPanel").hidden = true;
  $("#readControls").classList.remove("show");
  window.scrollTo(0, 0);

  const view = $("#view");
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
    if (root === "leaderboard") { setActiveNav("leaderboard"); return renderLeaderboard(view); }
    if (root === "submit") return pageSubmit(view);
    if (root === "my") return pageMy(view);
    if (root === "bookmarks") return pageBookmarks(view);
    if (root === "about") return pageAbout(view);
    if (root === "admin") { history.replaceState(null, "", "#/"); openAdminPanel(); return pageHome(view); }
    return pageNotFound(view);
  } catch (e) {
    console.error(e);
    view.innerHTML = '<div class="empty-state"><div class="es-icon">⚠️</div><h3>কিছু একটা সমস্যা হয়েছে</h3><p>' +
      escapeHtml(e.message || "") + '</p><a class="btn btn-gold" href="#/">হোমে ফিরুন</a></div>';
  }
}

/* ============================================================
   পেজ: হোম
============================================================ */
async function pageHome(view) {
  setActiveNav("home");
  view.innerHTML =
    '<div class="page-anim">' +
      '<div class="hero" id="hero"><div class="loading-block" style="grid-column:1/-1"><div class="loader"></div>সর্বশেষ লেখা আনা হচ্ছে…</div></div>' +
      '<div class="stats-strip" id="statsStrip"></div>' +
      '<div class="section"><div class="section-head"><h2>🧭 লেখার বিভাগ</h2><a class="section-link" href="#/categories">সব ২০টি বিভাগ →</a></div>' +
        '<div class="cat-grid" id="homeCatGrid"></div></div>' +
      '<div class="section layout-2col">' +
        '<div><div class="section-head"><h2>📰 সাম্প্রতিক লেখা</h2><a class="section-link" href="#/categories">বিভাগ ধরে পড়ুন →</a></div>' +
        '<div id="latestGrid">' + skeletonGrid(4) + "</div></div>" +
        '<aside class="sidebar"><div class="side-box"><h4>🔥 এ সময়ের জনপ্রিয়</h4><div id="trendBox"><div class="loader"></div></div></div>' +
        '<div class="side-box"><h4>🏆 সেরা লেখক</h4><div id="lbTeaser"><div class="loader"></div></div>' +
        '<a class="btn btn-ghost btn-sm" style="width:100%;margin-top:8px" href="#/leaderboard">পূর্ণ তালিকা দেখুন</a></div></aside>' +
      "</div>" +
      '<div class="section" id="ctaSlot"></div>' +
    "</div>";

  /* ক্যাটাগরি গ্রিড (সব ২০) */
  $("#homeCatGrid").innerHTML = CATEGORIES.map(function (c) {
    return '<a class="cat-card" href="#/cat/' + c.key + '">' +
      '<span class="cc-icon" style="background:linear-gradient(135deg,' + c.grad[0] + "," + c.grad[1] + ')">' + c.icon + "</span>" +
      '<span class="cc-name">' + escapeHtml(c.name) + '</span>' +
      '<span class="cc-count" data-count="' + c.key + '">…</span></a>';
  }).join("");

  let posts;
  try { posts = await loadPublished(); publishedCache = posts; }
  catch (e) {
    $("#hero").innerHTML = '<div class="empty-state"><div class="es-icon">📡</div><h3>লোড করা যায়নি</h3><p>ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।</p>' +
      '<button class="btn btn-gold" onclick="location.reload()">🔄 আবার চেষ্টা করুন</button></div>';
    return;
  }
  fillCatCounts(posts);

  if (!posts.length) {
    $("#hero").innerHTML = '<div class="hero-feature" style="min-height:280px"><div class="hf-bg"></div><div class="hf-glow"></div><div class="hf-pattern"></div>' +
      '<span class="cat-badge" style="background:linear-gradient(135deg,#f59e0b,#d97706)">🆕 নতুন পত্রিকা</span>' +
      '<h2>তারুণ্যের বাতিঘরে স্বাগতম</h2><p class="hf-excerpt">প্রথম লেখাটি আপনিই জমা দিন — কবিতা, গল্প, প্রবন্ধ বা যা-ই লিখুন না কেন।</p>' +
      '<div class="hf-meta"><a class="btn btn-gold btn-sm" href="#/submit">✍️ এখনই লিখুন</a></div></div>';
  } else {
    const f = posts[0];
    const side = posts.slice(1, 3);
    $("#hero").innerHTML =
      '<a class="hero-feature" href="#/post/' + f.id + '">' +
        '<div class="hf-bg" style="background:linear-gradient(160deg,' + catMeta(f.category).grad[0] + ",#0c1226)\"></div>" +
        '<div class="hf-glow"></div><div class="hf-pattern"></div>' +
        catBadge(f.category) +
        "<h2>" + escapeHtml(f.title) + "</h2>" +
        '<p class="hf-excerpt">' + escapeHtml(makeExcerpt(f.content, 230)) + "</p>" +
        '<div class="hf-meta"><span>✍️ ' + escapeHtml(f.authorName || "অজ্ঞাত") + "</span>" +
        "<span>🕂 " + escapeHtml(fmtDate(f.createdAt)) + "</span><span>👁️ " + bn(f.viewCount) + "</span>" +
        "<span>⏱ " + bn(readingMinutes(f.content)) + " মিনিট</span></div></a>" +
      '<div class="hero-side">' + side.map(function (p) {
        return '<a class="hero-mini" href="#/post/' + p.id + '">' + catBadge(p.category, true) +
          "<h3>" + escapeHtml(p.title) + '</h3><div class="pc-meta" style="border:none;padding:0"><span class="pc-author">' +
          miniAvatar(p.authorName, p.authorPhotoURL) + '<span class="nm">' + escapeHtml(p.authorName || "অজ্ঞাত") +
          "</span></span><span>👁️ " + bn(p.viewCount) + "</span></div></a>";
      }).join("") + "</div>";
  }

  /* পরিসংখ্যান */
  const writers = {};
  let views = 0, usedCats = {};
  posts.forEach(function (p) {
    if (p.authorUid) writers[p.authorUid] = true;
    views += p.viewCount || 0;
    if (p.category) usedCats[p.category] = true;
  });
  $("#statsStrip").innerHTML = stat(bn(posts.length), "প্রকাশিত লেখা") +
    stat(bn(Object.keys(writers).length), "সক্রিয় লেখক") +
    stat(bn(views), "মোট পঠন") +
    stat(bn(CATEGORIES.length), "লেখার বিভাগ");

  $("#latestGrid").innerHTML = '<div class="post-grid cols-2">' + posts.slice(0, 8).map(postCard).join("") + "</div>";

  const trending = posts.slice().sort(function (a, b) { return (b.viewCount || 0) - (a.viewCount || 0); }).slice(0, 6);
  $("#trendBox").innerHTML = trending.map(function (p, i) {
    return '<div class="trend-item" data-id="' + p.id + '"><span class="t-rank">' + bn(i + 1) + "</span>" +
      '<div style="min-width:0"><div class="t-title">' + escapeHtml(p.title) + "</div>" +
      '<div class="t-sub">👁️ ' + bn(p.viewCount) + " · " + escapeHtml(catMeta(p.category).name) + "</div></div></div>";
  }).join("");
  $$(".trend-item").forEach(function (el) {
    el.addEventListener("click", function () { location.hash = "#/post/" + el.getAttribute("data-id"); });
  });

  /* লিডারবোর্ড টিজার: পোস্ট+ভিউ ভিত্তিতে দ্রুত হিসাব */
  const m = new Map();
  posts.forEach(function (p) {
    if (!p.authorUid) return;
    let e = m.get(p.authorUid);
    if (!e) { e = { uid: p.authorUid, name: p.authorName || "অজ্ঞাত", photo: p.authorPhotoURL || "", posts: 0, views: 0 }; m.set(p.authorUid, e); }
    e.posts++; e.views += p.viewCount || 0;
    if (!e.photo && p.authorPhotoURL) e.photo = p.authorPhotoURL;
  });
  const teaser = Array.from(m.values()).sort(function (a, b) {
    return (b.posts * 10 + b.views) - (a.posts * 10 + a.views);
  }).slice(0, 5);
  $("#lbTeaser").innerHTML = teaser.map(function (e, i) {
    return '<div class="trend-item" data-uid="' + escapeHtml(e.uid) + '"><span class="t-rank">' + ["🥇", "🥈", "🥉", "৪", "৫"][i] || bn(i + 1) + "</span>" +
      '<div style="min-width:0;display:flex;gap:8px;align-items:center">' + miniAvatar(e.name, e.photo) +
      '<div><div class="t-title">' + escapeHtml(e.name) + '</div><div class="t-sub">' + bn(e.posts) + " লেখা · 👁️ " + bn(e.views) + "</div></div></div></div>";
  }).join("") || '<p class="field-hint">শীঘ্রই…</p>';
  $$('#lbTeaser .trend-item').forEach(function (el) {
    el.addEventListener("click", function () { location.hash = "#/writer/" + el.getAttribute("data-uid"); });
  });

  $("#ctaSlot").innerHTML =
    '<div class="hero-feature" style="min-height:auto;padding:34px;cursor:default">' +
    '<div class="hf-bg" style="background:linear-gradient(135deg,#7c2d12,#1b2547)"></div><div class="hf-glow"></div>' +
    '<span class="cat-badge" style="background:linear-gradient(135deg,#fcd34d,#f59e0b);color:#231503">🖋️ তারুণ্যের মঞ্চ</span>' +
    '<h2 style="font-size:1.5rem">আপনার লেখাও পৌঁছে যাক হাজারো পাঠকের কাছে</h2>' +
    '<p class="hf-excerpt">২০টি বিভাগে যে কোনো বিষয়ে লিখে জমা দিন — সম্পাদক অনুমোদনের পর প্রকাশ পাবে। সম্পূর্ণ বিনামূল্যে, সবার জন্য উন্মুক্ত।</p>' +
    '<div class="hf-meta"><a class="btn btn-gold" href="#/submit">✍️ লেখা জমা দিন</a>' +
    '<a class="btn btn-ghost" style="color:#fff;border-color:rgba(255,255,255,.3)" href="#/about">নিয়মাবলি জানুন</a></div></div>';
}

function stat(n, l) {
  return '<div class="stat-cell"><div class="n">' + n + '</div><div class="l">' + l + "</div></div>";
}

/* ============================================================
   পেজ: সব ক্যাটাগরি
============================================================ */
async function pageCategories(view) {
  view.innerHTML =
    '<div class="page-anim"><h1 class="page-title">🧭 লেখার সব বিভাগ</h1>' +
    '<p class="page-sub">আপনার পছন্দের বিষয় বেছে নিয়ে পড়তে শুরু করুন</p>' +
    '<div class="cat-grid" style="grid-template-columns:repeat(auto-fill,minmax(210px,1fr))">' +
    CATEGORIES.map(function (c) {
      return '<a class="cat-card" href="#/cat/' + c.key + '">' +
        '<span class="cc-icon" style="background:linear-gradient(135deg,' + c.grad[0] + "," + c.grad[1] + ')">' + c.icon + "</span>" +
        '<span class="cc-name">' + escapeHtml(c.name) + "</span>" +
        '<span class="cc-count">' + escapeHtml(c.tagline) + "</span></a>";
    }).join("") + "</div></div>";
  const posts = await loadPublished();
  const counts = {};
  posts.forEach(function (p) { counts[p.category] = (counts[p.category] || 0) + 1; });
  $$(".cat-card .cc-count", view).forEach(function (el, i) {
    const key = CATEGORIES[i].key;
    el.textContent = counts[key] ? bn(counts[key]) + "টি লেখা" : "নতুন বিভাগ";
  });
}

/* ============================================================
   পেজ: ক্যাটাগরি
============================================================ */
let catSort = "latest";
async function pageCategory(view, key) {
  const c = catMeta(key);
  view.innerHTML =
    '<div class="page-anim">' +
      '<div class="cat-hero" style="background:linear-gradient(135deg,' + c.grad[0] + "," + c.grad[1] + ')">' +
        '<div class="ch-pattern"></div><span class="ch-count" id="catCount">…</span>' +
        '<div class="ch-icon">' + c.icon + "</div><h1>" + escapeHtml(c.name) + "</h1>" +
        '<p>' + escapeHtml(c.tagline) + "</p></div>" +
      '<div class="sort-tabs">' +
        '<button class="sort-tab" data-sort="latest">🆕 সবার নতুন</button>' +
        '<button class="sort-tab" data-sort="popular">🔥 সবচেয়ে বেশি পঠিত</button>' +
        '<button class="sort-tab" data-sort="short">⏱ সংক্ষিপ্ত (কম সময়ের)</button>' +
      "</div>" +
      '<div id="catList"><div class="loading-block"><div class="loader"></div>লেখা আনা হচ্ছে…</div></div>' +
    "</div>";

  let posts;
  try { posts = await loadPublished(true); } catch (e) { posts = await loadPublished(); }
  let list = posts.filter(function (p) { return p.category === key; });
  $("#catCount").textContent = bn(list.length) + "টি লেখা";

  function render() {
    $$(".sort-tab", view).forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-sort") === catSort); });
    const sorted = list.slice();
    if (catSort === "popular") sorted.sort(function (a, b) { return b.viewCount - a.viewCount; });
    else if (catSort === "short") sorted.sort(function (a, b) { return readingMinutes(a.content) - readingMinutes(b.content); });
    const box = $("#catList");
    if (!sorted.length) {
      box.innerHTML = '<div class="empty-state"><div class="es-icon">' + c.icon + '</div><h3>এই বিভাগে এখনো লেখা আসেনি</h3>' +
        '<p>প্রথম লেখাটি আপনিই জমা দিতে পারেন।</p><a class="btn btn-gold" href="#/submit">✍️ লিখুন</a></div>';
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
   পেজ: পোস্ট পড়া
============================================================ */
async function pagePost(view, id) {
  view.innerHTML = '<div class="loading-block" style="padding-top:110px"><div class="loader"></div>লেখাটি আনা হচ্ছে…</div>';
  let post;
  try { post = await getPostById(id); }
  catch (e) {
    return showPostDenied(view, e);
  }
  if (!post) return showPostNotFound(view);
  if (post.status !== "published") {
    /* নিজের পোস্ট হলে দেখানো যায় (rules allow), কিন্তু স্ট্যাটাস জানানো */
    if (!me || post.authorUid !== me.uid) return showPostNotFound(view);
  }

  const c = catMeta(post.category);
  const saved = isBookmarked(id);
  const isPublished = post.status === "published";
  if (isPublished) bumpView(id);

  view.innerHTML =
    '<article class="reading-wrap page-anim">' +
      '<div class="crumbs"><a href="#/">হোম</a> <span>›</span> <a href="#/cat/' + c.key + '">' + c.icon + " " + escapeHtml(c.name) + "</a></div>" +
      (post.status !== "published" ? '<div class="chip chip-' + (post.status === "pending" ? "pending" : "rejected") +
        '" style="font-size:.85rem;margin-bottom:12px">' + (post.status === "pending" ? "⏳ এটি এখনো পেন্ডিং আছে" : "❌ এটি অনুমোদিত হয়নি") + "</div>" : "") +
      '<header class="article-head">' +
        "<h1>" + escapeHtml(post.title) + "</h1>" +
        '<div class="article-meta">' +
          '<a href="#/writer/' + encodeURIComponent(post.authorUid) + '">' + avatarHtml(post.authorName, post.authorPhotoURL, 46) + "</a>" +
          '<div class="am-info"><div class="nm"><a href="#/writer/' + encodeURIComponent(post.authorUid) + '">' + escapeHtml(post.authorName || "অজ্ঞাত লেখক") + "</a></div>" +
          '<div class="sub"><span>📅 ' + escapeHtml(fmtDate(post.createdAt)) + "</span><span>⏱ " + bn(readingMinutes(post.content)) + " মিনিট পড়া</span>" +
          (isPublished ? "<span>👁️ " + bn(Math.max(post.viewCount, 1)) + " বার</span>" : "") + "</div></div>" +
          '<div class="am-actions" style="position:relative">' +
            '<button class="icon-btn' + (saved ? " active" : "") + '" id="bmBtn" title="বুকমার্ক">' + (saved ? "🔖" : "📑") + "</button>" +
            '<button class="icon-btn" id="shareBtn" title="শেয়ার">🔗</button>' +
            '<div class="share-pop" id="sharePop">' +
              '<button data-share="native">📤 শেয়ার করুন</button>' +
              '<button data-share="copy">📋 লিংক কপি করুন</button>' +
              '<a data-share="wa" target="_blank" rel="noopener">💚 WhatsApp</a>' +
              '<a data-share="fb" target="_blank" rel="noopener">📘 Facebook</a>' +
            "</div>" +
          "</div>" +
        "</div>" +
      "</header>" +
      '<div class="article-body" id="articleBody">' + escapeHtml(post.content) + "</div>" +
      '<div id="engageSlot"></div>' +
      '<div class="related-box" id="relatedBox"></div>' +
    "</article>";

  /* ফন্ট সেটিং প্রয়োগ */
  let serif = false;
  try { serif = localStorage.getItem("bt-read-serif") === "1"; } catch (e) {}
  $("#articleBody").classList.toggle("serif", serif);
  $("#readControls").classList.add("show");

  /* বুকমার্ক */
  $("#bmBtn").addEventListener("click", function () {
    if (!me) { toast("বুকমার্ক ডিভাইসে সংরক্ষিত হয় — লগইন ছাড়াও চলবে"); }
    const on = toggleBookmark(id);
    $("#bmBtn").textContent = on ? "🔖" : "📑";
    $("#bmBtn").classList.toggle("active", on);
    toast(on ? "🔖 বুকমার্কে যুক্ত হয়েছে" : "বুকমার্ক সরানো হয়েছে");
  });

  /* শেয়ার */
  const sharePop = $("#sharePop");
  const url = location.origin + location.pathname + "#/post/" + id;
  const shareText = post.title + " — তারুণ্যের বাতিঘর";
  $("#shareBtn").addEventListener("click", function (e) {
    e.stopPropagation(); sharePop.classList.toggle("open");
  });
  document.addEventListener("click", function closeShare(e) {
    if (sharePop.classList.contains("open") && !sharePop.contains(e.target) && e.target.id !== "shareBtn") {
      sharePop.classList.remove("open");
    }
  });
  sharePop.querySelector('[data-share="native"]').addEventListener("click", async function () {
    if (navigator.share) { try { await navigator.share({ title: shareText, url: url }); } catch (e) {} }
    else { await navigator.clipboard.writeText(url); toast("লিংক কপি হয়েছে"); }
    sharePop.classList.remove("open");
  });
  sharePop.querySelector('[data-share="copy"]').addEventListener("click", async function () {
    try { await navigator.clipboard.writeText(url); toast("📋 লিংক কপি হয়েছে", "success"); }
    catch (e) { prompt("লিংক কপি করুন:", url); }
    sharePop.classList.remove("open");
  });
  sharePop.querySelector('[data-share="wa"]').href = "https://wa.me/?text=" + encodeURIComponent(shareText + " " + url);
  sharePop.querySelector('[data-share="fb"]').href = "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(url);

  /* এনগেজমেন্ট (শুধু প্রকাশিত লেখায়) */
  if (isPublished) {
    renderEngagement($("#engageSlot"), post, me);
  } else {
    $("#engageSlot").innerHTML =
      '<div class="engage-card" style="text-align:center;color:var(--text-faint);font-size:.9rem">' +
      "🔒 লেখাটি " + (post.status === "pending" ? "অনুমোদনের অপেক্ষায় আছে" : "অনুমোদিত হয়নি") +
      " — প্রকাশের পর মন্তব্য ও রিয়্যাকশন এখানে দেখা যাবে।<br>" +
      '<a class="btn btn-gold btn-sm" style="margin-top:12px" href="#/my">📂 আমার লেখায় ফিরে যান</a></div>';
  }

  /* একই বিভাগে আরও (শুধু প্রকাশিত লেখায়) */
  if (isPublished) {
    try {
      const posts = await loadPublished();
      const related = posts.filter(function (p) { return p.category === post.category && p.id !== id; }).slice(0, 3);
      if (related.length) {
        $("#relatedBox").innerHTML = "<h4>📖 একই বিভাগে আরও পড়ুন</h4>" + related.map(function (p) {
          return '<a class="related-item" href="#/post/' + p.id + '"><span class="t">' + escapeHtml(p.title) +
            '</span><span class="v">👁️ ' + bn(p.viewCount) + "</span></a>";
        }).join("");
      }
    } catch (e) {}
  }
}

function showPostNotFound(view) {
  view.innerHTML = '<div class="empty-state"><div class="es-icon">🧐</div><h3>লেখাটি খুঁজে পাওয়া যায়নি</h3>' +
    '<p>হয়তো এটি এখনো প্রকাশিত হয়নি, অথবা লিংকটি ভুল।</p><a class="btn btn-gold" href="#/">হোমে ফিরুন</a></div>';
}
function showPostDenied(view, e) {
  view.innerHTML = '<div class="empty-state"><div class="es-icon">🔒</div><h3>লেখাটি দেখার অনুমতি নেই</h3>' +
    '<p>পেন্ডিং লেখা শুধু লেখক নিজে ও স্টাফ দেখতে পারেন।</p>' +
    '<a class="btn btn-gold" href="#/">হোমে ফিরুন</a></div>';
}

/* ============================================================
   পেজ: সার্চ
============================================================ */
let searchCat = "", searchSort = "latest";
async function pageSearch(view, q) {
  view.innerHTML =
    '<div class="page-anim"><h1 class="page-title">🔍 খুঁজুন</h1>' +
    '<div class="search-page-input"><input id="spInput" value="' + escapeHtml(q) + '" placeholder="শিরোনাম, লেখক বা লেখার ভেতরের শব্দ…">' +
    '<button class="btn btn-gold" id="spBtn">খুঁজুন</button></div>' +
    '<div class="filter-chips" id="spChips"><button class="filter-chip active" data-cat="">সব বিভাগ</button>' +
      CATEGORIES.map(function (c) { return '<button class="filter-chip" data-cat="' + c.key + '">' + c.icon + " " + escapeHtml(c.name) + "</button>"; }).join("") +
    "</div>" +
    '<div class="sort-tabs"><button class="sort-tab" data-sort="latest">🆕 নতুন আগে</button>' +
    '<button class="sort-tab" data-sort="popular">🔥 জনপ্রিয় আগে</button></div>' +
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

  async function doSearch(term) {
    const box = $("#spResults");
    const posts = await loadPublished();
    let hits = posts.slice();
    if (searchCat) hits = hits.filter(function (p) { return p.category === searchCat; });
    if (term) {
      const tl = term.toLowerCase();
      hits = hits.filter(function (p) {
        return (p.title || "").toLowerCase().includes(tl) ||
          (p.authorName || "").toLowerCase().includes(tl) ||
          (p.content || "").toLowerCase().includes(tl);
      });
    }
    if (searchSort === "popular") hits.sort(function (a, b) { return b.viewCount - a.viewCount; });
    if (!hits.length) {
      box.innerHTML = '<div class="empty-state"><div class="es-icon">🔎</div><h3>কিছু পাওয়া যায়নি</h3>' +
        "<p>অন্য শব্দ বা বিভাগ দিয়ে চেষ্টা করুন।</p></div>";
      return;
    }
    box.innerHTML = '<p class="field-hint" style="margin-bottom:12px">' + bn(hits.length) + "টি লেখা পাওয়া গেছে</p>" +
      '<div class="post-list">' + hits.map(function (p, i) { return postRow(p, i + 1); }).join("") + "</div>";
  }
  doSearch(q);
}

/* ============================================================
   পেজ: লেখক প্রোফাইল
============================================================ */
async function pageWriter(view, uid) {
  uid = decodeURIComponent(uid || "");
  view.innerHTML = '<div class="loading-block" style="padding-top:90px"><div class="loader"></div>লেখকের তথ্য আনা হচ্ছে…</div>';
  const posts = await loadPublished();
  const mine = posts.filter(function (p) { return p.authorUid === uid; });
  if (!mine.length) return showPostNotFound(view);
  const name = mine[0].authorName || "অজ্ঞাত লেখক";
  const photo = mine.find(function (p) { return p.authorPhotoURL; });
  const views = mine.reduce(function (a, p) { return a + (p.viewCount || 0); }, 0);
  const cats = {};
  mine.forEach(function (p) { cats[p.category] = (cats[p.category] || 0) + 1; });
  const favCat = Object.keys(cats).sort(function (a, b) { return cats[b] - cats[a]; })[0];

  view.innerHTML =
    '<div class="page-anim">' +
      '<div class="writer-head">' + avatarHtml(name, photo ? photo.authorPhotoURL : "", 92) +
        '<div class="writer-info"><h1>' + escapeHtml(name) + "</h1>" +
        "<p>তারুণ্যের বাতিঘরের লেখক" + (favCat ? " · প্রিয় বিভাগ: " + catMeta(favCat).icon + " " + escapeHtml(catMeta(favCat).name) : "") + "</p></div>" +
        '<div class="writer-stats">' +
          '<div class="ws"><b>' + bn(mine.length) + "</b><span>প্রকাশিত লেখা</span></div>" +
          '<div class="ws"><b>' + bn(views) + "</b><span>মোট পঠন</span></div>" +
          '<div class="ws"><b>' + bn(Object.keys(cats).length) + "</b><span>বিভাগ</span></div>" +
        "</div>" +
      "</div>" +
      '<div class="section-head"><h2>✍️ এই লেখকের রচনা</h2></div>' +
      '<div class="post-grid">' + mine.map(postCard).join("") + "</div>" +
    "</div>";
}

/* ============================================================
   পেজ: লেখা জমা
============================================================ */
function pageSubmit(view) {
  if (!me) {
    view.innerHTML = '<div class="editor-card page-anim"><h1>✍️ লেখা জমা দিন</h1>' +
      '<p class="lead">জমা দিতে আগে Google দিয়ে লগইন করুন — আপনার নামে লেখা প্রকাশিত হবে।</p>' +
      loginGate("🔐", "লগইন প্রয়োজন", "লগইন সম্পূর্ণ বিনামূল্যে ও নিরাপদ।") + "</div>";
    const b = $("#gateLogin");
    if (b) b.addEventListener("click", function () {
      googleSignIn().then(function () { pageSubmit(view); }).catch(function (e) { alert("❌ " + (e.message || "")); });
    });
    return;
  }

  const draft = loadDraft();
  const catOpts = CATEGORIES.map(function (c) {
    return '<option value="' + c.key + '"' + (draft && draft.category === c.key ? " selected" : "") + ">" + c.icon + " " + c.name + "</option>";
  }).join("");

  view.innerHTML =
    '<div class="editor-card page-anim">' +
      "<h1>✍️ নতুন লেখা জমা দিন</h1>" +
      '<p class="lead">লেখা জমা হলে সম্পাদক তা পর্যালোচনা করে প্রকাশ করবেন। ফলাফল 🔔 বেল-এ জানতে পারবেন।</p>' +
      '<div class="guidelines"><strong>📌 জমা দেওয়ার নিয়মাবলি</strong><ul>' +
        "<li>শিরোনাম ৩০০ অক্ষরের মধ্যে, লেখা ১,০০,০০০ অক্ষরের মধ্যে রাখুন।</li>" +
        "<li>নিজের মৌলিক লেখা জমা দিন; কপিরাইটকৃত লেখা গ্রহণযোগ্য নয়।</li>" +
        "<li>কুরআন-হাদিস উদ্ধৃতির ক্ষেত্রে সূত্র (সূরা/আয়াত বা হাদিস গ্রন্থ) উল্লেখ করুন।</li>" +
        "<li>অশ্লীলতা, গালিগালাজ বা ব্যক্তিগত আক্রমণ এড়িয়ে যুক্তিনির্ভর লেখুন।</li>" +
        "<li>প্রতিটি অনুচ্ছেদ আলাদা লাইনে লিখুন — লেখা যেমন লিখবেন, তেমনই প্রকাশিত হবে।</li>" +
      "</ul></div>" +
      '<div class="field"><label>শিরোনাম *</label><input id="fTitle" maxlength="300" placeholder="আকর্ষণীয় শিরোনাম লিখুন…" value="' + escapeHtml(draft ? draft.title : "") + '"></div>' +
      '<div class="field"><label>বিভাগ *</label><select id="fCategory">' + catOpts + "</select>" +
        '<span class="field-hint" id="fCatHint"></span></div>' +
      '<div class="field"><label>লেখার অংশ *</label><textarea id="fContent" placeholder="এখানে আপনার লেখা লিখুন…&#10;&#10;অনুচ্ছেদ আলাদা করতে নতুন লাইন নিন।">' +
        escapeHtml(draft ? draft.content : "") + "</textarea>" +
        '<div class="char-count" id="fCount"></div></div>' +
      '<div class="editor-actions"><button class="btn btn-ghost" id="fDraft">📝 ড্রাফট সেভ</button>' +
      '<button class="btn btn-ghost" id="fClear">🗑️ মুছুন</button>' +
      '<button class="btn btn-gold" id="fSubmit">🚀 জমা দিন</button></div>' +
    "</div>";

  const titleEl = $("#fTitle"), catEl = $("#fCategory"), contentEl = $("#fContent"), countEl = $("#fCount");
  function updCount() {
    countEl.textContent = bn(contentEl.value.length) + " / ১,০০,০০০ অক্ষর";
    countEl.classList.toggle("over", contentEl.value.length > 100000);
    const c = catMeta(catEl.value);
    $("#fCatHint").textContent = c.icon + " " + c.tagline;
  }
  contentEl.addEventListener("input", updCount); catEl.addEventListener("change", updCount); updCount();

  function gather() { return { title: titleEl.value.trim(), category: catEl.value, content: contentEl.value.trim() }; }
  let draftTimer = null;
  function autosave() {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(function () {
      const d = gather();
      if (d.title || d.content) { saveDraft(d); }
    }, 800);
  }
  titleEl.addEventListener("input", autosave); contentEl.addEventListener("input", autosave);

  $("#fDraft").addEventListener("click", function () { saveDraft(gather()); toast("📝 ড্রাফট সংরক্ষিত হয়েছে", "success"); });
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
        authorName: me.displayName || me.email || "", category: d.category
      });
      clearDraft();
      invalidateCache();
      toast("✅ লেখা জমা হয়েছে! অনুমোদনের অপেক্ষায় আছে।", "success");
      setTimeout(function () { location.hash = "#/my?sent=1"; }, 700);
    } catch (e) {
      alert("❌ জমা দেওয়া যায়নি:\n" + (e.message || ""));
      btn.disabled = false; btn.textContent = "🚀 জমা দিন";
    }
  });
}

/* ============================================================
   পেজ: আমার লেখা
============================================================ */
function pageMy(view) {
  if (!me) {
    view.innerHTML = '<div class="editor-card page-anim"><h1>📂 আমার লেখা</h1>' +
      '<p class="lead">আপনার জমা দেওয়া লেখার অবস্থা দেখতে লগইন করুন।</p>' +
      loginGate("🔐", "লগইন প্রয়োজন", "") + "</div>";
    const b = $("#gateLogin");
    if (b) b.addEventListener("click", function () {
      googleSignIn().then(function () { render(); }).catch(function (e) { alert("❌ " + (e.message || "")); });
    });
    return;
  }

  view.innerHTML =
    '<div class="page-anim" style="max-width:820px;margin:0 auto">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:18px">' +
      "<h1 class='page-title' style='margin:0'>📂 আমার লেখা</h1>" +
      '<a class="btn btn-gold btn-sm" href="#/submit">✍️ নতুন লেখা</a></div>' +
      '<div id="sentBanner" class="guidelines" style="display:none"><strong>✅ আপনার লেখা সফলভাবে জমা হয়েছে!</strong>সম্পাদক অনুমোদন করলে এখানে স্ট্যাটাস আপডেট ও 🔔 নোটিফিকেশন পাবেন।</div>' +
      '<div id="myList"><div class="loading-block"><div class="loader"></div>আপনার লেখা আনা হচ্ছে…</div></div>' +
    "</div>";

  const sent = location.hash.indexOf("sent=1") !== -1;
  if (sent) $("#sentBanner").style.display = "block";

  getMyPosts(me.uid).then(function (docs) {
    if (!docs.length) {
      $("#myList").innerHTML = '<div class="empty-state"><div class="es-icon">🪶</div><h3>আপনি এখনো কিছু জমা দেননি</h3>' +
        '<p>আপনার প্রথম লেখাটি আজই জমা দিন।</p><a class="btn btn-gold" href="#/submit">✍️ লিখতে শুরু করুন</a></div>';
      return;
    }
    const chips = {
      pending: '<span class="chip chip-pending">⏳ পেন্ডিং</span>',
      published: '<span class="chip chip-published">✅ প্রকাশিত</span>',
      rejected: '<span class="chip chip-rejected">❌ বাতিল</span>'
    };
    $("#myList").innerHTML = docs.map(function (p) {
      const c = catMeta(p.category);
      return '<div class="mypost-item"><div class="mypost-head" data-id="' + p.id + '" data-status="' + p.status + '">' +
        '<div style="min-width:0"><h3>' + escapeHtml(p.title) + "</h3>" +
        '<div class="mypost-meta"><span>' + c.icon + " " + escapeHtml(c.name) + "</span>" +
        "<span>📅 " + escapeHtml(fmtDate(p.createdAt)) + "</span>" + (chips[p.status] || "") + "</div>" +
        (p.status === "rejected" && p.rejectReason ? '<div class="reject-note">কারণ: ' + escapeHtml(p.rejectReason) + "</div>" : "") +
        "</div>" +
        (p.status === "published" ? '<a class="btn btn-ghost btn-sm" href="#/post/' + p.id + '">📖 পড়ুন</a>' :
          '<button class="btn btn-ghost btn-sm mp-toggle">▾</button>') +
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
    $("#myList").innerHTML = '<div class="empty-state"><p>❌ ' + escapeHtml(e.message || "লোড ব্যর্থ") + "</p></div>";
  });
}

/* ============================================================
   পেজ: বুকমার্ক
============================================================ */
async function pageBookmarks(view) {
  view.innerHTML =
    '<div class="page-anim"><h1 class="page-title">🔖 বুকমার্ক</h1>' +
    '<p class="page-sub">এই ডিভাইসে সংরক্ষিত আপনার পছন্দের লেখা</p>' +
    '<div id="bmList"><div class="loading-block"><div class="loader"></div>আনা হচ্ছে…</div></div></div>';
  const ids = getBookmarks();
  if (!ids.length) {
    $("#bmList").innerHTML = '<div class="empty-state"><div class="es-icon">🔖</div><h3>কোনো বুকমার্ক নেই</h3>' +
      '<p>লেখা পড়ার সময় 📑 চিহ্নে চাপ দিলে লেখা এখানে জমা হবে।</p><a class="btn btn-gold" href="#/">লেখা খুঁজুন</a></div>';
    return;
  }
  const posts = await loadPublished();
  const saved = ids.map(function (id) { return posts.find(function (p) { return p.id === id; }); }).filter(Boolean);
  if (!saved.length) {
    $("#bmList").innerHTML = '<div class="empty-state"><div class="es-icon">🔖</div><h3>বুকমার্ককৃত লেখাগুলো আর পাওয়া যাচ্ছে না</h3></div>';
    return;
  }
  $("#bmList").innerHTML = '<div class="post-grid">' + saved.map(postCard).join("") + "</div>";
}

/* ============================================================
   পেজ: ৪০৪
============================================================ */
function pageNotFound(view) {
  view.innerHTML = '<div class="empty-state"><div class="es-icon">🧭</div><h3>পেজটি খুঁজে পাওয়া যায়নি</h3>' +
    '<a class="btn btn-gold" href="#/">হোমে ফিরুন</a></div>';
}

/* ============================================================
   পেজ: পরিচিতি
============================================================ */
function pageAbout(view) {
  setActiveNav("about");
  view.innerHTML =
    '<div class="about-card page-anim">' +
    "<h2>🕌 তারুণ্যের বাতিঘর কী?</h2>" +
    "<p>তারুণ্যের বাতিঘর তারুণ্যের কলমে সত্যের কথা বলার একটি মুক্ত বাংলা সাহিত্য-পত্রিকা। " +
    "কবিতা, গল্প-উপন্যাস, প্রবন্ধ, আয়াত ও হাদিস, নাস্তিকতার যৌক্তিক জবাব, প্রতিবাদ, জীবনীসহ " +
    bn(CATEGORIES.length) + "টি বিভাগে যে কেউ লেখা জমা দিতে পারেন — সম্পূর্ণ বিনামূল্যে।</p>" +
    "<h2>✍️ কীভাবে লেখা জমা দেবেন?</h2>" +
    "<ul><li>উপরে ডান কোণে <b>লগইন</b>-এ চাপ দিয়ে Google অ্যাকাউন্টে প্রবেশ করুন।</li>" +
    "<li><b>✍️ লিখুন</b> বাটনে চাপ দিন; শিরোনাম, বিভাগ বেছে নিয়ে লেখা পেস্ট/টাইপ করুন।</li>" +
    "<li>জমা হলে লেখা <b>পেন্ডিং</b> থাকবে; সম্পাদক অনুমোদন করলে সাইটে প্রকাশ পাবে।</li>" +
    "<li>অনুমোদন/বাতিলের খবর 🔔 বেল ও ব্রাউজার পুশ নোটিফিকেশনে পাবেন।</li></ul>" +
    "<h2>📌 কোন লেখা গ্রহণযোগ্য?</h2>" +
    "<ul><li>মৌলিক, যাচাইযোগ্য ও যুক্তিনির্ভর লেখা;</li>" +
    "<li>কুরআন-হাদিস উদ্ধৃতিতে সূত্র উল্লেখ;</li>" +
    "<li>অশ্লীলতা, গালিগালাজ, সাম্প্রদায়িক বিদ্বেষ ও ব্যক্তিগত আক্রমণ ব্যতীত;</li>" +
    "<li>কপিরাইটকৃত লেখা হুবহু নকল নয় এমন।</li></ul>" +
    "<h2>🛡️ মডারেশন সিস্টেম</h2>" +
    "<p>সাইটে একজন প্রধান অ্যাডমিন ও একাধিক মডারেটর থাকেন। তাঁরা লেখা সম্পাদনা, প্রকাশ বা বাতিল করতে পারেন; " +
    "লেখক চাইলে বাতিলের কারণ দেখতে পান এবং শুধরে আবার জমা দিতে পারেন।</p>" +
    "<h2>💸 খরচ কত?</h2>" +
    "<p>পাঠক ও লেখক — সবার জন্য <b>শতভাগ বিনামূল্যে</b>, চিরকালের জন্য। সাইটটি GitHub Pages আর Google Firebase-এর " +
    "ফ্রি স্তরে চলে — কোনো সাবস্ক্রিপশন বা বিজ্ঞাপন নেই।</p>" +
    '<div style="margin-top:26px;text-align:center"><a class="btn btn-gold" href="#/submit">✍️ এখনই লেখা জমা দিন</a></div>' +
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

/* ---------------- গো! ---------------- */
initShell();
