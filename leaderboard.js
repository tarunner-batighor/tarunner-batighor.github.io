// @ts-nocheck
/* ============================================================
   তারুণ্যের বাতিঘর — Leaderboard (🏆)
   - পেজের নিচের দিকে একটি বড়, আকর্ষণীয় Leaderboard section
     (ফ্লোটিং বাটন নেই — স্ক্রল করলেই দেখা যায়)
   - মোট স্কোর-এর ভিত্তিতে র‍্যাংকিং:
     স্কোর = পোস্ট×১০ + ভিউ×১ + লাইক×৫ + কমেন্ট×১৫
   - ৩টা ট্যাব: সেরা লেখক (স্কোর) / সেরা পোস্টকারী / সর্বোচ্চ ভিউ
   - প্রতি রাউ: Rank + নাম + প্রোফাইল ছবি + পোস্ট/ভিউ/লাইক/কমেন্ট + স্কোর
   - Top 3 বিশেষ highlight (gold/silver/bronze)
   - সাইটের থিম ভেরিয়েবল ব্যবহার করে — light/dark দুটোয়ই মানানসই
   - সবাই দেখতে পারবে (শুধু Published পোস্ট গণনা হয়)
   - self-contained: main.js-এ কোনো পরিবর্তন নেই
============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  limit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth } from "./auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyD97ZB_1H6JcZ6MzTHj39uJic3gFqJnH6o",
  authDomain: "tarunner-batighor.firebaseapp.com",
  projectId: "tarunner-batighor",
  storageBucket: "tarunner-batighor.firebasestorage.app",
  messagingSenderId: "4949259714",
  appId: "1:4949259714:web:7f2ec193de3c8ee03b0683",
  measurementId: "G-Y9L1BG62BL"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* =========================
   STATE
========================= */

let lbEntries = [];
let lbTab = "score"; /* "score" | "posts" | "views" */
let lbLoading = false;
let lbLoaded = false;

const TOP_N = 20;
const WEIGHTS = { posts: 10, views: 1, likes: 5, comments: 15 };

/* =========================
   HELPERS
========================= */

function bengaliNum(n) {
  try {
    return Number(n || 0).toLocaleString("bn-BD");
  } catch (e) {
    return String(n || 0);
  }
}

const AVATAR_COLORS = [
  "#f87171", "#fb923c", "#fbbf24", "#34d399",
  "#38bdf8", "#818cf8", "#c084fc", "#f472b6"
];

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function avatarHtml(entry, size) {
  const letter = (entry.name || "?").trim().charAt(0).toUpperCase() || "?";
  const color = AVATAR_COLORS[hashStr(entry.uid || entry.name) % AVATAR_COLORS.length];

  if (entry.photo) {
    return `<img
      class="lb-avatar"
      style="width:${size}px;height:${size}px;"
      src="${escapeHtml(entry.photo)}"
      alt=""
      onerror="this.outerHTML='<div class=\\'lb-avatar lb-initial\\' style=\\'width:${size}px;height:${size}px;background:${color};\\'>${escapeHtml(letter)}</div>'">`;
  }

  return `<div
    class="lb-avatar lb-initial"
    style="width:${size}px;height:${size}px;background:${color};">
    ${escapeHtml(letter)}
  </div>`;
}

/* concurrency pool — পোস্ট অনেক হলেও request ফ্লাড না হয় */
async function poolMap(items, size, fn) {
  const results = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i], i);
    }
  }
  const workers = [];
  for (let w = 0; w < Math.min(size, items.length); w++) workers.push(worker());
  await Promise.all(workers);
  return results;
}

/* =========================
   DATA
========================= */

function calcScore(e) {
  return (
    e.posts * WEIGHTS.posts +
    e.views * WEIGHTS.views +
    e.likes * WEIGHTS.likes +
    e.comments * WEIGHTS.comments
  );
}

function sortEntries() {
  if (lbTab === "posts") {
    lbEntries.sort((a, b) => b.posts - a.posts || b.views - a.views);
  } else if (lbTab === "views") {
    lbEntries.sort((a, b) => b.views - a.views || b.posts - a.posts);
  } else {
    lbEntries.sort((a, b) => b.score - a.score || b.posts - a.posts);
  }
}

async function loadLeaderboard() {
  if (lbLoading) return;
  lbLoading = true;

  const list = document.getElementById("lbList");
  if (list) {
    list.innerHTML =
      '<p class="lb-sec-loading" id="lbLoadMsg">🏆 ডেটা লোড হচ্ছে<br>' +
      '<span>পোস্ট, লাইক আর কমেন্ট গণনা চলছে...</span></p>';
  }

  try {
    /* 1) সব published পোস্ট (একটা query) */
    const snap = await getDocs(
      query(
        collection(db, "Posts"),
        where("status", "==", "published")
      )
    );

    const postDocs = [];
    snap.forEach((d) => postDocs.push(d));

    /* 2) পোস্ট + ভিউ হিসাব (author অনুযায়ী) */
    const map = new Map();

    postDocs.forEach((postDoc) => {
      const p = postDoc.data();
      const uid = p.authorUid;
      if (!uid) return;

      let e = map.get(uid);
      if (!e) {
        e = {
          uid: uid,
          name: p.authorName || "Anonymous",
          email: p.authorEmail || "",
          photo: p.authorPhotoURL || "",
          posts: 0,
          views: 0,
          likes: 0,
          comments: 0
        };
        map.set(uid, e);
      }

      e.posts += 1;
      e.views += (typeof p.viewCount === "number" ? p.viewCount : 0);

      if (!e.photo && p.authorPhotoURL) e.photo = p.authorPhotoURL;
      if (!e.name && p.authorName) e.name = p.authorName;
    });

    /* 3) লাইক + কমেন্ট — প্রতি পোস্টের subcollection থেকে
         (published পোস্টের reactions/comments public, rules v5.1)
         এক পোস্টে সমস্যা হলে বাকিটা চলবে (partial data OK) */
    let done = 0;
    const total = postDocs.length;

    await poolMap(postDocs, 6, async (postDoc) => {
      const pid = postDoc.id;
      const p = postDoc.data();
      const e = p.authorUid ? map.get(p.authorUid) : null;

      let likes = 0;
      let comments = 0;

      try {
        const rSnap = await getDocs(
          query(collection(db, "Posts", pid, "reactions"), limit(500))
        );
        rSnap.forEach(() => { likes += 1; });
      } catch (err) {
        console.warn("Leaderboard: reactions load failed:", pid, err);
      }

      try {
        const cSnap = await getDocs(
          query(collection(db, "Posts", pid, "comments"), limit(500))
        );
        cSnap.forEach(() => { comments += 1; });
      } catch (err) {
        console.warn("Leaderboard: comments load failed:", pid, err);
      }

      if (e) {
        e.likes += likes;
        e.comments += comments;
      }

      done += 1;
      const m = document.getElementById("lbLoadMsg");
      if (m) {
        m.innerHTML =
          "🏆 গণনা চলছে... " + bengaliNum(done) + "/" + bengaliNum(total) +
          "<br><span>পোস্ট, লাইক আর কমেন্ট</span>";
      }
    });

    /* 4) স্কোর + sort + render */
    lbEntries = Array.from(map.values()).map(function (e) {
      e.score = calcScore(e);
      return e;
    });

    sortEntries();
    renderLeaderboard();
    lbLoaded = true;

  } catch (e) {
    console.error("Leaderboard load failed:", e);
    if (list) {
      list.innerHTML =
        '<div class="lb-sec-error">❌ লোড করা যায়নি<br>' +
        '<span>' + escapeHtml(String(e.message || e).slice(0, 120)) + '</span><br><br>' +
        '<button id="lbRetryBtn">আবার চেষ্টা করুন</button></div>';

      const retry = document.getElementById("lbRetryBtn");
      if (retry) {
        retry.addEventListener("click", function () {
          lbLoading = false;
          loadLeaderboard();
        });
      }
    }
  }

  lbLoading = false;
}

/* =========================
   RENDER
========================= */

function rankBadge(rank) {
  if (rank === 1) return '<span class="lb-medal">🥇</span>';
  if (rank === 2) return '<span class="lb-medal">🥈</span>';
  if (rank === 3) return '<span class="lb-medal">🥉</span>';
  return '<span class="lb-ranknum">' + bengaliNum(rank) + "</span>";
}

function scoreColor(rank) {
  if (rank === 1) return "var(--gold)";
  if (rank === 2) return "var(--text-soft)";
  if (rank === 3) return "#d97706";
  return "var(--row-title)";
}

function renderLeaderboard() {
  const list = document.getElementById("lbList");
  if (!list) return;

  const rows = lbEntries.slice(0, TOP_N);

  if (!rows.length) {
    list.innerHTML =
      '<div class="lb-sec-empty">এখনো কোনো Published পোস্ট নেই。<br>' +
      "পোস্ট Published হলে Leaderboard-এ নাম যুক্ত হবে।</div>";
    return;
  }

  const meUid = (auth && auth.currentUser) ? auth.currentUser.uid : null;

  list.innerHTML = rows.map(function (e, i) {
    const rank = i + 1;
    const top = rank <= 3;
    const isMe = meUid && meUid === e.uid;

    let cardStyle = "";
    let avatarRing = "";
    let nameColor = "";

    if (rank === 1) {
      cardStyle =
        "background:linear-gradient(135deg, rgba(251,191,36,0.16), rgba(245,158,11,0.04));" +
        "border:1px solid var(--gold);" +
        "box-shadow:0 0 18px rgba(251,191,36,0.14);";
      avatarRing = "border:3px solid var(--gold);";
      nameColor = "color:var(--gold);";
    } else if (rank === 2) {
      cardStyle =
        "background:rgba(148,163,184,0.10);border:1px solid #94a3b8;";
      avatarRing = "border:3px solid #cbd5e1;";
      nameColor = "";
    } else if (rank === 3) {
      cardStyle =
        "background:rgba(180,83,9,0.10);border:1px solid #b45309;";
      avatarRing = "border:3px solid #d97706;";
      nameColor = "";
    }

    const avatarSize = top ? 48 : 42;

    return `
      <div class="lb-row" style="${cardStyle}">
        <div class="lb-rank">${rankBadge(rank)}</div>

        <div class="lb-avatar-wrap" style="${avatarRing}">
          ${avatarHtml(e, avatarSize)}
        </div>

        <div class="lb-info">
          <div class="lb-name" style="${nameColor}">
            ${rank === 1 ? "👑 " : ""}${escapeHtml(e.name)}
            ${isMe ? '<span class="lb-me">আপনি</span>' : ""}
          </div>
          <div class="lb-email">${escapeHtml(e.email || "")}</div>
          <div class="lb-mini">
            <span>📝 <b>${bengaliNum(e.posts)}</b></span>
            <span>👀 <b>${bengaliNum(e.views)}</b></span>
            <span>❤️ <b>${bengaliNum(e.likes)}</b></span>
            <span>💬 <b>${bengaliNum(e.comments)}</b></span>
          </div>
        </div>

        <div class="lb-score">
          <span class="lb-score-val" style="color:${scoreColor(rank)};">${bengaliNum(e.score)}</span>
          <span class="lb-score-lbl">স্কোর</span>
        </div>
      </div>
    `;
  }).join("");
}

/* =========================
   SECTION (পেজের নিচে)
========================= */

function buildSection() {
  const css = document.createElement("style");
  css.textContent = `
    #lbSection {
      position: relative;
      z-index: 2;
      width: 100%;
      max-width: 640px;
      margin: 48px auto 8px;
      padding: 0 4px;
    }

    .lb-sec-card {
      background: var(--panel-bg);
      border: 1px solid var(--panel-border);
      border-radius: 20px;
      padding: 20px 14px 10px;
      box-shadow: 0 10px 34px rgba(2, 6, 23, 0.22);
    }

    .lb-sec-top {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .lb-sec-title {
      font-size: 26px;
      font-weight: 800;
      background: linear-gradient(180deg, var(--gold-bright) 0%, var(--gold) 55%, var(--gold-deep) 100%);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      color: var(--gold);
      filter: drop-shadow(0 3px 14px rgba(245, 158, 11, 0.20));
      margin: 0;
    }

    .lb-sec-refresh {
      position: absolute;
      right: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 36px;
      height: 36px;
      border: 1px solid var(--panel-border);
      border-radius: 10px;
      background: var(--row-bg);
      color: var(--text-faint);
      font-size: 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all .18s ease;
    }

    .lb-sec-refresh:hover {
      color: var(--gold);
      border-color: var(--gold);
      transform: translateY(-50%) rotate(90deg);
    }

    .lb-sec-sub {
      color: var(--text-faint);
      font-size: 12.5px;
      margin: 6px 0 0 0;
      text-align: center;
      line-height: 1.5;
    }

    .lb-tabs {
      display: flex;
      gap: 7px;
      margin-top: 14px;
    }

    .lb-tab {
      flex: 1;
      padding: 10px 6px;
      border: 1px solid var(--row-border);
      border-radius: 10px;
      background: var(--row-bg);
      color: var(--text-faint);
      cursor: pointer;
      font-weight: 700;
      font-size: 13.5px;
      font-family: inherit;
      transition: all .15s ease;
    }

    .lb-tab-on {
      border-color: var(--gold);
      color: var(--gold);
      background: rgba(251, 191, 36, 0.08);
      font-weight: 800;
    }

    .lb-list { margin-top: 14px; }

    .lb-row {
      display: flex;
      align-items: center;
      gap: 11px;
      border-radius: 14px;
      padding: 11px 12px;
      margin-bottom: 10px;
      background: var(--row-bg);
      border: 1px solid var(--row-border);
    }

    .lb-rank {
      width: 34px;
      flex-shrink: 0;
      text-align: center;
      font-size: 15px;
      color: var(--text-faint);
      font-weight: bold;
    }

    .lb-medal {
      font-size: 26px;
      line-height: 1;
      display: inline-block;
    }

    .lb-ranknum { font-size: 17px; }

    .lb-avatar-wrap {
      flex-shrink: 0;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .lb-avatar {
      border-radius: 50%;
      object-fit: cover;
      display: block;
    }

    .lb-avatar.lb-initial {
      color: white;
      font-weight: 800;
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .lb-info {
      flex: 1;
      min-width: 0;
    }

    .lb-name {
      font-weight: 700;
      font-size: 15px;
      color: var(--row-title);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .lb-email {
      color: var(--text-faint);
      font-size: 11.5px;
      margin-top: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .lb-me {
      background: rgba(56, 189, 248, 0.16);
      color: #38bdf8;
      font-size: 10.5px;
      padding: 2px 7px;
      border-radius: 20px;
      margin-left: 6px;
      vertical-align: middle;
      font-weight: bold;
    }

    html[data-theme="light"] .lb-me {
      background: rgba(3, 105, 161, 0.10);
      color: #0369a1;
    }

    .lb-mini {
      display: flex;
      flex-wrap: wrap;
      gap: 3px 12px;
      margin-top: 6px;
    }

    .lb-mini span {
      font-size: 11.5px;
      color: var(--text-faint);
      white-space: nowrap;
    }

    .lb-mini b {
      color: var(--text-soft);
      font-size: 12px;
      font-weight: 700;
    }

    .lb-score {
      flex-shrink: 0;
      text-align: center;
      min-width: 58px;
    }

    .lb-score-val {
      font-size: 17px;
      font-weight: 800;
      display: block;
      line-height: 1.15;
    }

    .lb-score-lbl {
      font-size: 10px;
      color: var(--text-faint);
      display: block;
    }

    .lb-sec-loading {
      color: var(--text-faint);
      text-align: center;
      padding: 34px 0;
      line-height: 1.8;
      font-size: 14px;
    }

    .lb-sec-loading span { font-size: 12px; }

    .lb-sec-error {
      background: rgba(239, 68, 68, 0.10);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: var(--text-soft);
      padding: 18px 16px;
      border-radius: 12px;
      font-size: 14px;
      text-align: center;
      line-height: 1.7;
    }

    .lb-sec-error span { font-size: 12.5px; }

    .lb-sec-error button {
      background: #ef4444;
      color: white;
      border: none;
      padding: 9px 18px;
      border-radius: 8px;
      font-weight: bold;
      cursor: pointer;
      font-family: inherit;
    }

    .lb-sec-empty {
      background: var(--row-bg);
      border: 1px solid var(--row-border);
      padding: 26px 16px;
      border-radius: 12px;
      text-align: center;
      color: var(--text-faint);
      font-size: 14px;
      line-height: 1.8;
    }

    .lb-sec-foot {
      text-align: center;
      color: var(--text-faint);
      font-size: 11.5px;
      padding: 14px 8px 8px;
      line-height: 1.6;
    }
  `;
  document.head.appendChild(css);

  const section = document.createElement("section");
  section.id = "lbSection";
  section.innerHTML = `
    <div class="lb-sec-card">
      <div class="lb-sec-top">
        <h2 class="lb-sec-title">🏆 Leaderboard</h2>
        <button class="lb-sec-refresh" id="lbRefreshBtn" title="আপডেট করুন" aria-label="আপডেট করুন">🔄</button>
      </div>
      <p class="lb-sec-sub">পোস্ট, ভিউ, লাইক আর কমেন্ট মিলিয়ে সেরা লেখক — Top ${TOP_N}</p>

      <div class="lb-tabs">
        <button class="lb-tab lb-tab-on" id="lbTabScore">⭐ সেরা লেখক</button>
        <button class="lb-tab" id="lbTabPosts">📝 পোস্ট</button>
        <button class="lb-tab" id="lbTabViews">👀 ভিউ</button>
      </div>

      <div class="lb-list" id="lbList">
        <p class="lb-sec-loading">🏆 ডেটা লোড হচ্ছে...</p>
      </div>

      <p class="lb-sec-foot">
        স্কোর = পোস্ট×${WEIGHTS.posts} + ভিউ×${WEIGHTS.views} + লাইক×${WEIGHTS.likes} + কমেন্ট×${WEIGHTS.comments}<br>
        শুধু <strong>Published</strong> পোস্ট গণনা হয় • সবাই দেখতে পারেন — Login দরকার নেই
      </p>
    </div>
  `;

  /* পেজের সবচেয়ে নিচে বসানো (feed-এর পরে) */
  const anchor = document.getElementById("contentContainer");
  if (anchor && anchor.parentNode) {
    anchor.insertAdjacentElement("afterend", section);
  } else {
    document.body.appendChild(section);
  }

  document
    .getElementById("lbRefreshBtn")
    .addEventListener("click", function () {
      lbLoading = false;
      loadLeaderboard();
    });

  const tabNames = { score: "Score", posts: "Posts", views: "Views" };
  Object.keys(tabNames).forEach(function (t) {
    document.getElementById("lbTab" + tabNames[t]).addEventListener("click", function () {
      setTab(t);
    });
  });

  /* স্ক্রল করে section-এর কাছে পৌঁছালেই data লোড হবে
     (page load দ্রুত রাখতে — এখনই query না চালাই) */
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(function (entries) {
      if (entries.some(function (en) { return en.isIntersecting; })) {
        io.disconnect();
        loadLeaderboard();
      }
    }, { rootMargin: "600px 0px" });
    io.observe(section);
  } else {
    loadLeaderboard();
  }

  return section;
}

function setTab(tab) {
  if (lbTab === tab) return;
  lbTab = tab;
  const tabNames = { score: "Score", posts: "Posts", views: "Views" };
  Object.keys(tabNames).forEach(function (t) {
    const el = document.getElementById("lbTab" + tabNames[t]);
    if (el) el.classList.toggle("lb-tab-on", t === tab);
  });
  sortEntries();
  renderLeaderboard();
}

function openLeaderboard() {
  const section = document.getElementById("lbSection");
  if (!section) return;
  section.scrollIntoView({ behavior: "smooth", block: "start" });
  if (!lbLoaded) loadLeaderboard();
}

/* module deferred → main.js (classic) আগে চলেছে,
   পুরো page DOM তৈরি হয়ে গেছে */
buildSection();

/* public hook — test/preview-এর জন্য */
globalThis.__leaderboard = {
  open: openLeaderboard,
  load: loadLeaderboard,
  setTab: setTab
};
