// @ts-nocheck
/* ============================================================
   তারুণ্যের বাতিঘর — লিডারবোর্ড (v2)
   স্কোর = পোস্ট×১০ + ভিউ×১ + রিয়্যাকশন×৫
============================================================ */

import { db } from "./fb.js";
import { escapeHtml, bn } from "./store.js";
import { avatarHtml } from "./engage.js";
import { uiIcon } from "./icons.js";
const I = uiIcon;
import {
  collection, getDocs, query, where, limit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const WEIGHTS = { posts: 10, views: 1, likes: 5 };

async function poolMap(items, size, fn) {
  const results = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) { const i = idx++; results[i] = await fn(items[i], i); }
  }
  const ws = [];
  for (let w = 0; w < Math.min(size, items.length); w++) ws.push(worker());
  await Promise.all(ws);
  return results;
}

export async function renderLeaderboard(container) {
  container.innerHTML =
    '<div class="lb-wrap page-anim">' +
      '<div style="text-align:center;margin-bottom:8px"><h1 class="page-title">' + I("trophy", 23) + ' সেরা লেখক তালিকা</h1>' +
      '<p class="page-sub">পোস্ট, পঠন আর ভালোবাসা মিলিয়ে সেরা ২০ লেখক<br><span style="font-size:.8rem">স্কোর = পোস্ট×১০ + ভিউ×১ + রিয়্যাকশন×৫</span></p></div>' +
      '<div id="lbLoading" class="loading-block"><div class="loader"></div><div id="lbProgress">' + I("chart", 15) + ' ডেটা গণনা হচ্ছে…</div></div>' +
      '<div id="lbPodium"></div><div id="lbList"></div>' +
    "</div>";

  try {
    const snap = await getDocs(query(collection(db, "Posts"), where("status", "==", "published")));
    const postDocs = [];
    snap.forEach(function (d) { postDocs.push(d); });
    if (!container.isConnected) return;

    if (!postDocs.length) {
      container.querySelector("#lbLoading").outerHTML =
        '<div class="empty-state"><div class="es-icon">' + I("feather", 38) + '</div><h3>এখনো কোনো প্রকাশিত লেখা নেই</h3></div>';
      return;
    }

    const map = new Map();
    postDocs.forEach(function (sd) {
      const p = sd.data();
      if (!p.authorUid) return;
      let e = map.get(p.authorUid);
      if (!e) {
        e = { uid: p.authorUid, name: p.authorName || "অজ্ঞাত লেখক", photo: p.authorPhotoURL || "",
          posts: 0, views: 0, likes: 0, comments: 0, _best: [] };
        map.set(p.authorUid, e);
      }
      e.posts += 1;
      e.views += typeof p.viewCount === "number" ? p.viewCount : 0;
      if (!e.photo && p.authorPhotoURL) e.photo = p.authorPhotoURL;
      if ((!e.name || e.name === "অজ্ঞাত লেখক") && p.authorName) e.name = p.authorName;
      e._best.push({ id: sd.id, title: p.title || "", views: typeof p.viewCount === "number" ? p.viewCount : 0 });
    });

    let done = 0;
    const progress = container.querySelector("#lbProgress");
    await poolMap(postDocs, 6, async function (sd) {
      const p = sd.data();
      const e = map.get(p.authorUid);
      try {
        const r = await getDocs(query(collection(db, "Posts", sd.id, "reactions"), limit(500)));
        if (e) e.likes += r.size;
      } catch (err) {}
      try {
        const c = await getDocs(query(collection(db, "Posts", sd.id, "comments"), limit(500)));
        if (e) e.comments += c.size;
      } catch (err) {}
      done++;
      if (progress && done % 5 === 0) progress.innerHTML = I("chart", 14) + " গণনা চলছে… " + bn(done) + "/" + bn(postDocs.length);
    });
    if (!container.isConnected) return;

    let entries = Array.from(map.values());
    entries.forEach(function (e) {
      e.score = e.posts * WEIGHTS.posts + e.views * WEIGHTS.views + e.likes * WEIGHTS.likes;
      e.best = e._best.slice().sort(function (a, b) { return b.views - a.views; }).slice(0, 5);
      delete e._best;
    });
    entries.sort(function (a, b) { return b.score - a.score || b.posts - a.posts; });
    entries = entries.slice(0, 20);

    const CLS = ["gold", "silver", "bronze"];
    const top3 = entries.slice(0, 3);

    container.querySelector("#lbLoading").outerHTML = "";
    container.querySelector("#lbPodium").innerHTML =
      '<div class="lb-podium">' + top3.map(function (e, i) {
        return '<div class="podium-card ' + CLS[i] + '" data-uid="' + escapeHtml(e.uid) + '">' +
          '<div class="podium-medal pm-' + CLS[i] + '">' + bn(i + 1) + "</div>" +
          avatarHtml(e.name, e.photo, i === 0 ? 82 : 70).replace('class="author-av"', 'class="podium-av author-av"') +
          '<div class="podium-name">' + escapeHtml(e.name) + "</div>" +
          '<div class="podium-score">' + bn(e.score) + "</div>" +
          '<div class="podium-sub">' + I("book", 12) + " " + bn(e.posts) + " লেখা · " + I("eye", 12) + " " + bn(e.views) + " · " + I("heart", 12) + " " + bn(e.likes) + "</div>" +
        "</div>";
      }).join("") + "</div>";

    container.querySelector("#lbList").innerHTML = entries.slice(3).map(function (e, i) {
      const rank = i + 4;
      return '<div class="lb-row" data-uid="' + escapeHtml(e.uid) + '">' +
        '<div class="lb-rank">' + bn(rank) + "</div>" +
        avatarHtml(e.name, e.photo, 42) +
        '<div class="lb-info"><div class="nm">' + escapeHtml(e.name) + "</div>" +
        '<div class="sub lb-sub">' + I("book", 13) + " " + bn(e.posts) + " লেখা · " + I("eye", 13) + " " + bn(e.views) + " · " + I("heart", 13) + " " + bn(e.likes) + " · " + I("comment", 13) + " " + bn(e.comments) + "</div></div>" +
        '<div class="lb-score"><b>' + bn(e.score) + "</b><span>পয়েন্ট</span></div>" +
      "</div>" +
      '<div class="best-posts" id="best-' + escapeHtml(e.uid.replace(/[^a-zA-Z0-9_-]/g, "")) + '">' +
        e.best.map(function (p) {
          return '<a href="#/post/' + p.id + '">' + I("bookOpen", 13) + " " + escapeHtml(p.title) + ' <span class="vp meta-ic">' + I("eye", 12) + " " + bn(p.views) + "</span></a>";
        }).join("") +
      "</div>";
    }).join("");

    function gotoWriter(uid) { if (uid) location.hash = "#/writer/" + uid; }
    container.querySelectorAll(".podium-card").forEach(function (el) {
      el.addEventListener("click", function () { gotoWriter(el.getAttribute("data-uid")); });
    });
    container.querySelectorAll(".lb-row").forEach(function (el) {
      el.addEventListener("click", function () {
        const uid = el.getAttribute("data-uid");
        const box = container.querySelector("#best-" + uid.replace(/[^a-zA-Z0-9_-]/g, ""));
        if (box) box.classList.toggle("open");
      });
    });
  } catch (e) {
    console.error(e);
    container.innerHTML = '<div class="empty-state"><div class="es-icon">' + I("alert", 36) + '</div><h3>লিডারবোর্ড লোড হয়নি</h3><p>' +
      escapeHtml(e.message || "") + "</p><a class='btn btn-gold' href='#/'>হোমে ফিরে যান</a></div>";
  }
}
