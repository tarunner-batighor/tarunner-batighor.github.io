// @ts-nocheck
/* ============================================================
   তারুণ্যের বাতিঘর — ইন-সাইট নোটিফিকেশন (বেল)
============================================================ */

import { db, onAuthChange } from "./fb.js";
import { notificationsQuery, markNotifRead, escapeHtml, relTime } from "./store.js";
import { onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { uiIcon } from "./icons.js";
const I = uiIcon;

function cleanMsg(t) {
  return String(t || "").replace(/^(?:[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\uFE0F]|\s|\u200d|\u20e3|[0-9#])+/u, "");
}

let unsub = null;
let list = [];

function panelHtml() {
  if (!list.length) {
    return '<div class="sg-empty nf-empty">' + I("bellOff", 30) + ' কোনো নোটিফিকেশন নেই</div>';
  }
  return list.slice(0, 30).map(function (n) {
    const ic = n.type === "rejected" ? "xCircle" : (n.submission ? "inbox" : "checkCircle");
    return '<button type="button" class="sg-item nf-item' + (n.read ? "" : " unread") + '" data-id="' + n.id +
      '" data-post="' + escapeHtml(n.postId || "") + '" style="width:100%;text-align:left;border:none;background:' +
      (n.read ? "transparent" : "rgba(245,158,11,.07)") + '">' +
      '<span class="nf-ic nf-' + ic + '">' + I(ic, 18) + '</span>' +
      '<span style="min-width:0;flex:1">' +
        '<span class="sg-title" style="display:block;white-space:normal;font-weight:' + (n.read ? "500" : "700") + '">' + escapeHtml(cleanMsg(n.message || n.postTitle || "")) + '</span>' +
        '<span class="sg-sub">' + escapeHtml(relTime(n.createdAt)) + '</span>' +
      '</span>' +
      (n.read ? "" : '<span style="width:8px;height:8px;border-radius:50%;background:var(--rose);flex-shrink:0"></span>') +
      '</button>';
  }).join("");
}

export function initNotifications() {
  const bell = document.getElementById("bellBtn");
  const dot = document.getElementById("bellDot");

  let panel = null;
  function closePanel() { if (panel) { panel.remove(); panel = null; } }

  function openPanel() {
    closePanel();
    panel = document.createElement("div");
    panel.className = "dropdown-menu";
    panel.style.cssText = "position:fixed;top:64px;right:16px;width:min(360px,92vw);max-height:70vh;overflow:auto;z-index:1400;";
    panel.innerHTML =
      '<div class="dd-user-head" style="flex-direction:row;justify-content:space-between;align-items:center">' +
        '<strong class="nf-head">' + I("bell", 16) + ' নোটিফিকেশন</strong>' +
        '<button id="nfMarkAll" class="btn btn-ghost btn-sm" style="padding:4px 10px">সব পড়া হয়েছে</button>' +
      '</div>' + panelHtml();
    document.body.appendChild(panel);
    requestAnimationFrame(function () {
      panel.style.animation = "pop .18s ease";
    });

    panel.querySelectorAll(".nf-item").forEach(function (el) {
      el.addEventListener("click", async function () {
        const id = el.getAttribute("data-id");
        const postId = el.getAttribute("data-post");
        if (id && !list.find(function (x) { return x.id === id; }).read) {
          try { await markNotifRead(_uid, id); } catch (e) {}
        }
        closePanel();
        if (postId) location.hash = "#/post/" + postId;
      });
    });
    const ma = panel.querySelector("#nfMarkAll");
    if (ma) ma.addEventListener("click", async function () {
      await Promise.all(list.filter(function (n) { return !n.read; }).map(function (n) {
        return markNotifRead(_uid, n.id).catch(function () {});
      }));
    });
  }

  bell.addEventListener("click", function (e) {
    e.stopPropagation();
    if (panel) closePanel(); else openPanel();
  });
  document.addEventListener("click", function (e) {
    if (panel && !panel.contains(e.target) && e.target !== bell) closePanel();
  });

  let _uid = null;

  onAuthChange(function (user) {
    if (unsub) { unsub(); unsub = null; }
    list = [];
    dot.hidden = true;
    if (!user) { bell.hidden = true; closePanel(); return; }
    bell.hidden = false;
    _uid = user.uid;

    unsub = onSnapshot(notificationsQuery(user.uid), function (snap) {
      list = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
      const unread = list.filter(function (n) { return !n.read; }).length;
      dot.hidden = unread === 0;
      if (panel) {
        panel.querySelectorAll(":scope > .sg-item, :scope > button").forEach(function () {});
        const head = panel.querySelector(".dd-user-head");
        panel.innerHTML = "";
        if (head) panel.appendChild(head);
        const wrap = document.createElement("div");
        wrap.innerHTML = panelHtml();
        while (wrap.firstChild) panel.appendChild(wrap.firstChild);
        panel.querySelectorAll(".nf-item").forEach(function (el) {
          el.addEventListener("click", async function () {
            const id = el.getAttribute("data-id");
            const postId = el.getAttribute("data-post");
            if (id) { const nn = list.find(function (x) { return x.id === id; }); if (nn && !nn.read) await markNotifRead(_uid, id).catch(function () {}); }
            closePanel();
            if (postId) location.hash = "#/post/" + postId;
          });
        });
        const ma2 = panel.querySelector("#nfMarkAll");
        if (ma2) ma2.addEventListener("click", async function () {
          await Promise.all(list.filter(function (n) { return !n.read; }).map(function (n) {
            return markNotifRead(_uid, n.id).catch(function () {});
          }));
        });
      }
    }, function () { dot.hidden = true; });
  });
}
