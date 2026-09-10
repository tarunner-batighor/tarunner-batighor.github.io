// @ts-nocheck
/* ============================================================
   তারুণ্যের বাতিঘর — রিয়্যাকশন + মন্তব্য (v2)
============================================================ */

import {
  escapeHtml, bn, relTime,
  getReactions, setMyReaction, getComments, addComment, deleteComment
} from "./store.js";
import { googleSignIn, isStaff } from "./fb.js";

export const REACTIONS = [
  { emoji: "❤️", label: "ভালোবাসা" },
  { emoji: "👍", label: "ভালো লেগেছে" },
  { emoji: "🙏", label: "ধন্যবাদ" },
  { emoji: "😢", label: "মন ছুটে গেল" },
  { emoji: "👏", label: "প্রশংসা" }
];

const AV_COLORS = ["#f87171", "#fb923c", "#fbbf24", "#34d399", "#38bdf8", "#818cf8", "#c084fc", "#f472b6"];
function colorFor(seed) {
  let h = 0; const s = String(seed || "?");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return AV_COLORS[Math.abs(h) % AV_COLORS.length];
}

export function avatarHtml(name, photo, size) {
  const letter = (name || "?").trim().charAt(0) || "?";
  const sz = size || 38;
  if (photo) {
    return '<img class="author-av" style="width:' + sz + 'px;height:' + sz + 'px" src="' + escapeHtml(photo) +
      '" alt="" onerror="this.outerHTML=\'<div class=&quot;author-av&quot; style=&quot;width:' + sz + 'px;height:' + sz +
      'px;background:' + colorFor(name) + '&quot;>' + escapeHtml(letter) + '</div>\'">';
  }
  return '<div class="author-av" style="width:' + sz + 'px;height:' + sz + 'px;background:' + colorFor(name) + '">' + escapeHtml(letter) + '</div>';
}

export async function renderEngagement(container, post, user) {
  container.innerHTML =
    '<div class="engage-card" id="engCard">' +
      '<div class="react-row" id="reactRow"><span class="loader" style="border-top-color:var(--gold)"></span></div>' +
      '<div class="eng-divider"></div>' +
      '<div class="comm-head">💬 মন্তব্য <span id="commCount" style="color:var(--gold)">(০)</span></div>' +
      '<div id="commList"></div>' +
      '<div class="comm-form" id="commForm"></div>' +
      '<div class="eng-stats" id="engStats"></div>' +
    '</div>';

  let data = { byEmoji: {}, mine: null, comments: [] };
  try {
    const [r, c] = await Promise.all([getReactions(post.id), getComments(post.id)]);
    data.byEmoji = r.byEmoji; data.mine = r.mine; data.comments = c;
  } catch (e) {
    container.querySelector("#engCard").innerHTML =
      '<div class="empty-state"><div class="es-icon">📡</div><p>রিয়্যাকশন লোড করা যায়নি। ইন্টারনেট দেখুন।</p></div>';
    return;
  }

  const reactRow = container.querySelector("#reactRow");
  function renderReacts() {
    reactRow.innerHTML = REACTIONS.map(function (r) {
      const count = data.byEmoji[r.emoji] || 0;
      const mine = data.mine === r.emoji;
      return '<button type="button" class="react-btn' + (mine ? " mine" : "") + '" data-emoji="' + r.emoji +
        '" title="' + r.label + '"><span>' + r.emoji + '</span>' +
        (count ? '<span class="rc-count">' + bn(count) + '</span>' : "") + '</button>';
    }).join("");
    reactRow.querySelectorAll(".react-btn").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        if (!user) { openLoginPrompt(); return; }
        const emoji = btn.getAttribute("data-emoji");
        const next = data.mine === emoji ? null : emoji;
        btn.disabled = true;
        try {
          await setMyReaction(post.id, user.uid, next);
          if (data.mine) data.byEmoji[data.mine] = Math.max(0, (data.byEmoji[data.mine] || 1) - 1);
          if (next) data.byEmoji[next] = (data.byEmoji[next] || 0) + 1;
          data.mine = next;
          renderReacts(); renderStats();
        } catch (e) {
          btn.disabled = false;
          alert("❌ " + (e.message || "ব্যর্থ হয়েছে"));
        }
      });
    });
  }

  const commList = container.querySelector("#commList");
  const commForm = container.querySelector("#commForm");

  function renderComments() {
    container.querySelector("#commCount").textContent = "(" + bn(data.comments.length) + ")";
    if (!data.comments.length) {
      commList.innerHTML = '<p style="color:var(--text-faint);font-size:.85rem;text-align:center;padding:10px 0 4px">এখনো কোনো মন্তব্য নেই — প্রথম মন্তব্যটি আপনিই করুন 💬</p>';
    } else {
      commList.innerHTML = data.comments.map(function (c) {
        const canDel = isStaff();
        return '<div class="comm-item">' +
          avatarHtml(c.authorName, "", 38) +
          '<div class="comm-body">' +
            '<div class="comm-top"><span class="comm-name">' + escapeHtml(c.authorName || "অতিথি") + '</span>' +
            '<span class="comm-time">' + escapeHtml(relTime(c.createdAt)) + '</span>' +
            (canDel ? '<button class="comm-del" data-cid="' + c.id + '">মুছুন</button>' : "") +
            '</div>' +
            '<p class="comm-text">' + escapeHtml(c.text) + '</p>' +
          '</div></div>';
      }).join("");
      commList.querySelectorAll(".comm-del").forEach(function (b) {
        b.addEventListener("click", async function () {
          if (!confirm("এই মন্তব্যটি মুছবেন?")) return;
          await deleteComment(post.id, b.getAttribute("data-cid"));
          data.comments = data.comments.filter(function (x) { return x.id !== b.getAttribute("data-cid"); });
          renderComments();
        });
      });
    }

    if (user) {
      commForm.innerHTML =
        '<textarea id="commInput" maxlength="500" placeholder="মন্তব্য লিখুন… (২–৫০০ অক্ষর)"></textarea>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px">' +
          '<span class="field-hint">নাম: ' + escapeHtml(user.displayName || (user.email || "").split("@")[0]) + '</span>' +
          '<button class="btn btn-gold btn-sm" id="commSendBtn">💬 পোস্ট করুন</button>' +
        '</div>';
      commForm.querySelector("#commSendBtn").addEventListener("click", async function () {
        const ta = commForm.querySelector("#commInput");
        const text = ta.value.trim();
        if (text.length < 2) { ta.focus(); return; }
        const btn = this; btn.disabled = true;
        try {
          await addComment(post.id, user, text);
          const fresh = await getComments(post.id);
          data.comments = fresh;
          renderComments();
        } catch (e) {
          alert("❌ মন্তব্য পোস্ট হয়নি: " + (e.message || ""));
        } finally { btn.disabled = false; }
      });
    } else {
      commForm.innerHTML =
        '<div style="text-align:center;padding:8px 0">' +
          '<p style="font-size:.85rem;color:var(--text-faint);margin:0 0 10px">রিয়্যাকশন বা মন্তব্য দিতে লগইন করুন</p>' +
          '<button class="google-btn" id="engLoginBtn" style="padding:9px 18px;font-size:.85rem">' + googleSvg() + ' Google দিয়ে লগইন</button>' +
        '</div>';
      commForm.querySelector("#engLoginBtn").addEventListener("click", openLoginPrompt);
    }
  }

  function renderStats() {
    const totalR = Object.values(data.byEmoji).reduce(function (a, b) { return a + b; }, 0);
    container.querySelector("#engStats").innerHTML =
      '<span>❤️ <b>' + bn(totalR) + '</b> রিয়্যাকশন</span>' +
      '<span>💬 <b>' + bn(data.comments.length) + '</b> মন্তব্য</span>' +
      '<span>👁️ <b>' + bn(post.viewCount) + '</b> বার পঠিত</span>';
  }

  function openLoginPrompt() {
    googleSignIn().catch(function (err) {
      alert("❌ লগইন ব্যর্থ: " + (err && err.message ? err.message : "আবার চেষ্টা করুন"));
    });
  }

  renderReacts();
  renderComments();
  renderStats();
}

function googleSvg() {
  return '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>';
}
