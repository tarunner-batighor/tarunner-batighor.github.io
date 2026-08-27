// @ts-nocheck
/* ============================================================
   তারুণ্যের বাতিঘর — Post Engagement module
   ❤️ Reaction + 💬 Comment + 👁️ View Count

   - Firebase config আর আলাদা করা হয় না — Firestore (db)
     instance auth.js-এর থেকে নেওয়া হয় (same app, same auth
     token, তাই security rules ঠিকমতো apply হয়)
   - Reaction: প্রতি user-এর ১টা reaction (doc id = uid),
     আবার চাপলে remove, অন্য চাপলে change
   - Comment: শুধু login করা user, ২-৫০০ অক্ষর
   - View: session-এ ১ বার + ১ ঘণ্টা cooldown (spam guard),
     শুধু viewCount field increment হয় (rules-এ enforce)
============================================================ */

import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  increment,
  serverTimestamp,
  query,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export const REACTION_EMOJIS = ["❤️", "👍", "🙏", "😢", "👏"];
export const REACTION_LABELS = {
  "❤️": "ভালোবাসা",
  "👍": "ভালো লেগেছে",
  "🙏": "ধন্যবাদ",
  "😢": "মন ছুটে গেল",
  "👏": "প্রশংসা"
};

const MAX_COMMENT = 500;
const MIN_COMMENT = 2;
const VIEW_COOLDOWN_MS = 60 * 60 * 1000; /* ১ ঘণ্টা */

/* ---------- helpers ---------- */

function toMs(ts) {
  if (!ts) return 0;
  if (ts._ms) return ts._ms;
  if (ts.seconds) return ts.seconds * 1000;
  if (typeof ts === "number") return ts;
  const t = new Date(ts).getTime();
  return isNaN(t) ? 0 : t;
}

function relTime(ts) {
  const t = toMs(ts);
  if (!t) return "";
  const diff = Date.now() - t;
  if (diff < 60000) return "এইমাত্র";
  if (diff < 3600000) return Math.floor(diff / 60000) + " মিনিট আগে";
  if (diff < 86400000) return Math.floor(diff / 3600000) + " ঘণ্টা আগে";
  return new Date(t).toLocaleDateString("bn-BD");
}

/* ---------- View count: session-এ ১ বার + ১ ঘণ্টা cooldown ---------- */

function shouldCountView(postId) {
  try {
    const ssKey = "tb_viewed:" + postId;
    const lsKey = "tb_lastview:" + postId;
    if (sessionStorage.getItem(ssKey)) return false;
    const last = parseInt(localStorage.getItem(lsKey) || "0", 10);
    if (Date.now() - last < VIEW_COOLDOWN_MS) return false;
    sessionStorage.setItem(ssKey, "1");
    localStorage.setItem(lsKey, String(Date.now()));
    return true;
  } catch (e) {
    return false;
  }
}

async function bumpViewCount(db, postId) {
  if (!shouldCountView(postId)) return false;
  try {
    /* field-masked update — শুধু viewCount বদলায় (rules-এ check হয়) */
    await updateDoc(doc(db, "Posts", postId), { viewCount: increment(1) });
    return true;
  } catch (e) {
    console.warn("view count update failed:", e);
    return false;
  }
}

/* ---------- data load ---------- */

async function loadEngagementData(db, postId, uid) {
  const byEmoji = {};
  let myEmoji = null;
  const rSnap = await getDocs(collection(db, "Posts", postId, "reactions"));
  rSnap.forEach(function (d) {
    const data = d.data();
    if (data.emoji) byEmoji[data.emoji] = (byEmoji[data.emoji] || 0) + 1;
    if (uid && d.id === uid) myEmoji = data.emoji;
  });

  const cSnap = await getDocs(
    query(
      collection(db, "Posts", postId, "comments"),
      orderBy("createdAt", "desc"),
      limit(200)
    )
  );
  const comments = cSnap.docs.map(function (d) {
    return { id: d.id, ...d.data() };
  });

  return { byEmoji: byEmoji, myEmoji: myEmoji, comments: comments };
}

/* ---------- writes ---------- */

async function setReactionDoc(db, postId, uid, emoji) {
  const ref = doc(db, "Posts", postId, "reactions", uid);
  if (!emoji) {
    try { await deleteDoc(ref); } catch (e) { /* already absent — fine */ }
    return;
  }
  await setDoc(
    ref,
    {
      emoji: emoji,
      uid: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}

async function createCommentDoc(db, postId, user, text) {
  const clean = String(text || "").trim();
  if (clean.length < MIN_COMMENT) throw new Error("MIN");
  if (clean.length > MAX_COMMENT) throw new Error("MAX");
  let name = "";
  if (user && user.displayName) name = String(user.displayName).trim();
  else if (user && user.email) name = String(user.email).split("@")[0];
  if (!name) name = "অতিথি";
  name = name.slice(0, 80);
  await addDoc(collection(db, "Posts", postId, "comments"), {
    authorUid: user.uid,
    authorName: name,
    text: clean,
    createdAt: serverTimestamp()
  });
  return { authorName: name, text: clean };
}

/* ================= RENDER =================
   container = <div> element (post card-এর পরে)
   post      = { id, viewCount, ... }
   opts      = { db, user, getAuth(), signIn() }
   returns   = { refresh() }
================================================ */

export function renderEngagement(container, post, opts) {
  const db = opts.db;
  const postId = post.id;
  const state = {
    byEmoji: {},
    myEmoji: null,
    comments: [],
    viewCount: Number(post.viewCount || 0),
    busy: false
  };

  container.innerHTML =
    '<div class="post-card eng-card">' +
    '<div class="eng-loginbar" id="engLoginBar" style="display:none;">' +
    "<span>Reaction বা মন্তব্য দিতে আগে লগইন করুন</span>" +
    '<button type="button" id="engLoginBtn">' +
    '<svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>' +
    "Google দিয়ে লগইন</button>" +
    "</div>" +
    '<div class="eng-react-row" id="engReactRow"></div>' +
    '<div class="eng-divider"></div>' +
    '<div class="eng-comm-head">💬 মন্তব্য <span class="eng-count" id="engCommCount">0</span></div>' +
    '<div class="eng-comm-list" id="engCommList"></div>' +
    '<div class="eng-comm-form" id="engCommForm"></div>' +
    "</div>" +
    '<div class="eng-stats">' +
    '<span class="eng-stat">❤️ <b id="engStatR">0</b> রিয়্যাকশন</span>' +
    '<span class="eng-stat">💬 <b id="engStatC">0</b> মন্তব্য</span>' +
    '<span class="eng-stat">👁️ <b id="engStatV">0</b> বার দেখা হয়েছে</span>' +
    "</div>";

  const $ = function (id) { return container.querySelector("#" + id); };
  const currentUser = function () {
    return opts.getAuth ? opts.getAuth() : opts.user;
  };

  /* ---- render pieces ---- */

  function renderReactions() {
    const row = $("engReactRow");
    row.innerHTML = "";
    REACTION_EMOJIS.forEach(function (emoji) {
      const count = state.byEmoji[emoji] || 0;
      const own = state.myEmoji === emoji;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "eng-react" + (own ? " own" : "");
      btn.title = REACTION_LABELS[emoji] +
        (own ? " — আপনার reaction, আবার চাপলে মুছে যাবে" : "");
      btn.setAttribute("aria-label", REACTION_LABELS[emoji]);
      const em = document.createElement("span");
      em.className = "eng-react-emoji";
      em.textContent = emoji;
      const ct = document.createElement("span");
      ct.className = "eng-react-count";
      ct.textContent = String(count);
      btn.appendChild(em);
      btn.appendChild(ct);
      btn.addEventListener("click", function () { onReact(emoji); });
      row.appendChild(btn);
    });
  }

  function renderComments() {
    const list = $("engCommList");
    $("engCommCount").textContent = String(state.comments.length);
    $("engStatC").textContent = String(state.comments.length);
    list.innerHTML = "";
    if (!state.comments.length) {
      const empty = document.createElement("div");
      empty.className = "eng-comment-empty";
      empty.innerHTML = "এখনো কোনো মন্তব্য নেই।<br>প্রথম মন্তব্য আপনিই করুন! ✨";
      list.appendChild(empty);
      return;
    }
    state.comments.forEach(function (c) {
      const item = document.createElement("div");
      item.className = "eng-comment";
      const meta = document.createElement("div");
      meta.className = "eng-comment-meta";
      const nm = document.createElement("b");
      nm.textContent = c.authorName || "অতিথি";
      meta.appendChild(nm);
      const t = relTime(c.createdAt);
      if (t) meta.appendChild(document.createTextNode(" · " + t));
      const tx = document.createElement("div");
      tx.className = "eng-comment-text";
      tx.textContent = c.text || "";
      item.appendChild(meta);
      item.appendChild(tx);
      list.appendChild(item);
    });
  }

  function renderForm() {
    const form = $("engCommForm");
    const user = currentUser();
    if (!user) {
      form.innerHTML = "";
      delete form.dataset.built;
      return;
    }
    if (!form.dataset.built) {
      form.innerHTML =
        '<textarea id="engCommText" maxlength="' + MAX_COMMENT + '" rows="2" ' +
        'placeholder="আপনার মন্তব্য লিখুন..."></textarea>' +
        '<div class="eng-comm-form-foot">' +
        '<span class="eng-comm-remaining" id="engCommLeft">' + MAX_COMMENT + ' অক্ষর বাকি</span>' +
        '<button type="button" class="eng-comm-btn" id="engCommBtn">মন্তব্য দিন</button>' +
        "</div>" +
        '<div class="eng-err" id="engCommErr" style="display:none;"></div>';
      form.dataset.built = "1";
      const ta = form.querySelector("#engCommText");
      ta.addEventListener("input", function () {
        const left = MAX_COMMENT - ta.value.length;
        form.querySelector("#engCommLeft").textContent = left + " অক্ষর বাকি";
      });
      form.querySelector("#engCommBtn").addEventListener("click", onComment);
      ta.addEventListener("keydown", function (e) {
        /* Ctrl/Cmd+Enter = submit (mobile-এও useful) */
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") onComment();
      });
    }
  }

  function renderStats() {
    let total = 0;
    Object.keys(state.byEmoji).forEach(function (k) {
      total += state.byEmoji[k] || 0;
    });
    $("engStatR").textContent = String(total);
    $("engStatV").textContent = String(state.viewCount);
  }

  function renderAll() {
    renderReactions();
    renderComments();
    renderForm();
    renderStats();
  }

  function showLoginBar() {
    $("engLoginBar").style.display = "flex";
    const btn = $("engLoginBtn");
    btn.disabled = false;
    btn.onclick = async function () {
      btn.disabled = true;
      try {
        await opts.signIn();
        /* popup flow-এ onAuthChange থেকে refresh হবে;
           redirect flow-এ page reload হবে (নিজে থেকেই) */
      } catch (e) {
        btn.disabled = false;
        alert(
          "❌ লগইন ব্যর্থ: " +
          (e && (e.code || e.message) || "unknown") +
          "\n\nআবার চেষ্টা করুন।"
        );
      }
    };
  }

  /* ---- handlers ---- */

  async function onReact(emoji) {
    const user = currentUser();
    if (!user) { showLoginBar(); return; }
    if (state.busy) return;

    if (state.myEmoji === emoji) {
      /* ---- remove ---- */
      const prev = emoji;
      state.myEmoji = null;
      state.byEmoji[prev] = Math.max(0, (state.byEmoji[prev] || 0) - 1);
      renderReactions(); renderStats();
      try {
        await setReactionDoc(db, postId, user.uid, null);
      } catch (e) {
        console.error("reaction remove failed:", e);
        state.myEmoji = prev;
        state.byEmoji[prev] = (state.byEmoji[prev] || 0) + 1;
        renderReactions(); renderStats();
      }
      return;
    }

    /* ---- set / change ---- */
    const prev = state.myEmoji;
    const prevCount = prev ? state.byEmoji[prev] || 0 : 0;
    state.myEmoji = emoji;
    if (prev) state.byEmoji[prev] = Math.max(0, prevCount - 1);
    state.byEmoji[emoji] = (state.byEmoji[emoji] || 0) + 1;
    renderReactions(); renderStats();
    state.busy = true;
    try {
      await setReactionDoc(db, postId, user.uid, emoji);
    } catch (e) {
      console.error("reaction failed:", e);
      state.myEmoji = prev;
      state.byEmoji[emoji] = Math.max(0, (state.byEmoji[emoji] || 0) - 1);
      if (prev) state.byEmoji[prev] = prevCount;
      renderReactions(); renderStats();
    }
    state.busy = false;
  }

  async function onComment() {
    const user = currentUser();
    if (!user) { showLoginBar(); return; }
    if (state.busy) return;
    const form = $("engCommForm");
    const ta = form.querySelector("#engCommText");
    const btn = form.querySelector("#engCommBtn");
    const errEl = form.querySelector("#engCommErr");
    errEl.style.display = "none";
    const text = String(ta.value || "").trim();
    if (text.length < MIN_COMMENT) {
      errEl.textContent = "কমপক্ষে ২ অক্ষর লিখুন।";
      errEl.style.display = "block";
      return;
    }
    state.busy = true;
    btn.disabled = true;
    btn.textContent = "পাঠানো হচ্ছে...";
    try {
      const c = await createCommentDoc(db, postId, user, text);
      /* optimistic insert (server time আসার আগের জন্য local time) */
      state.comments.unshift({
        id: "tmp-" + Date.now(),
        authorName: c.authorName,
        text: c.text,
        createdAt: { _ms: Date.now() }
      });
      ta.value = "";
      form.querySelector("#engCommLeft").textContent = MAX_COMMENT + " অক্ষর বাকি";
      renderComments();
      btn.textContent = "✅ ধন্যবাদ!";
      setTimeout(function () { btn.textContent = "মন্তব্য দিন"; }, 1800);
    } catch (e) {
      console.error("comment failed:", e);
      errEl.textContent =
        e && e.message === "MAX"
          ? "সর্বোচ্চ ৫০০ অক্ষর লিখুন।"
          : "❌ মন্তব্য পাঠানো যায়নি। আবার চেষ্টা করুন।";
      errEl.style.display = "block";
      btn.textContent = "মন্তব্য দিন";
      btn.disabled = false;
      state.busy = false;
      return;
    }
    state.busy = false;
    btn.disabled = false;
  }

  /* ---- initial load ---- */

  async function refresh() {
    try {
      const user = currentUser();
      const data = await loadEngagementData(db, postId, user ? user.uid : null);
      state.byEmoji = data.byEmoji;
      state.myEmoji = data.myEmoji;
      state.comments = data.comments;
      renderAll();
    } catch (e) {
      console.error("engagement load failed:", e);
      const list = $("engCommList");
      if (list) {
        list.innerHTML =
          '<div class="eng-comment-empty">Reaction / মন্তব্য লোড করা যায়নি।</div>';
      }
    }
  }

  refresh();

  /* view count: fire & forget (session/cooldown guard আছে ভেতরে) */
  bumpViewCount(db, postId).then(function (ok) {
    if (ok) {
      state.viewCount += 1;
      renderStats();
    }
  });

  return { refresh: refresh };
}
