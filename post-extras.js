// @ts-nocheck
/* ============================================================
   তারুণ্যের বাতিঘর — Post Extras
   - 📖 Reading progress bar — পোস্ট পড়ার সময় পেজের
     একদম উপরে পাতলা সোনালি line (কতটুকু পড়েছো সেটা দেখায়)
   - "📖 একই বিভাগে আরও পড়ুন" — পোস্টের নিচে একই
     category-র আরও ৩টা পোস্ট (ট্যাপ করলে সেটা খোলে)
   - self-contained: main.js / engage.js-এ কোনো হাত লাগেনি
============================================================ */

/* ---------- CSS ---------- */
(function () {
  const css = document.createElement("style");
  css.textContent = `
    #peProgressBar {
      position: fixed;
      top: 0; left: 0; right: 0;
      height: 3px;
      z-index: 3600;
      opacity: 0;
      transition: opacity .35s ease;
      pointer-events: none;
    }

    #peProgressBar.pe-show { opacity: 1; }

    .pe-bar-fill {
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, var(--gold-bright), var(--gold), var(--gold-deep));
      border-radius: 0 2px 2px 0;
      box-shadow: 0 0 8px rgba(245, 158, 11, 0.35);
      transition: width .07s linear;
    }

    .pe-related {
      margin-top: 22px;
      border-top: 1px dashed var(--row-border);
      padding-top: 16px;
    }

    .pe-rel-head {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-soft);
      text-align: center;
      margin: 0 0 12px;
    }

    .pe-rel-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      background: var(--row-bg);
      border: 1px solid var(--row-border);
      border-radius: 12px;
      padding: 11px 13px;
      margin-bottom: 8px;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      transition: border-color .15s ease, transform .12s ease;
    }

    .pe-rel-item:hover { border-color: var(--gold); }

    .pe-rel-item:active { transform: scale(0.985); }

    .pe-rel-title {
      font-size: 13.5px;
      font-weight: 600;
      color: var(--row-title);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      min-width: 0;
    }

    .pe-rel-views {
      flex-shrink: 0;
      font-size: 11.5px;
      color: var(--text-faint);
    }
  `;
  document.head.appendChild(css);
})();

/* =========================
   Reading progress bar
========================= */

const peBar = document.createElement("div");
peBar.id = "peProgressBar";
peBar.innerHTML = '<div class="pe-bar-fill"></div>';
document.body.appendChild(peBar);

let peTick = false;

function peUpdateBar() {
  if (peTick) return;
  peTick = true;
  requestAnimationFrame(function () {
    peTick = false;
    const isPost = /^#post\/[A-Za-z0-9_-]+/.test(location.hash);
    const content = document.querySelector("#dynamicContent .post-content");
    if (!isPost || !content) {
      peBar.classList.remove("pe-show");
      return;
    }
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    const pct = max > 0
      ? Math.min(100, Math.max(0, (window.scrollY / max) * 100))
      : 0;
    peBar.querySelector(".pe-bar-fill").style.width = pct.toFixed(1) + "%";
    peBar.classList.add("pe-show");
  });
}

window.addEventListener("scroll", peUpdateBar, { passive: true });
window.addEventListener("resize", peUpdateBar);
window.addEventListener("hashchange", peUpdateBar);
peUpdateBar();

/* =========================
   Related posts — একই বিভাগে আরও পড়ুন
========================= */

let peRelatedFor = null;

function peRemoveRelated() {
  const old = document.querySelector("#dynamicContent .pe-related");
  if (old) old.remove();
}

/* main.js asyncভাবে post render করে — render শেষ হওয়া পর্যন্ত
   অপেক্ষা করে, নাহলে innerHTML বদলালে related box মুছে যেত */
function peWaitPostContent(timeoutMs) {
  return new Promise(function (resolve) {
    const t0 = Date.now();
    (function check() {
      const hasContent = document.querySelector("#dynamicContent .post-content");
      const hasTitle = document.querySelector("#dynamicContent .category-header-title");
      if (hasContent && hasTitle) return resolve(true);
      if (Date.now() - t0 > (timeoutMs || 8000)) return resolve(false);
      setTimeout(check, 120);
    })();
  });
}

async function peRenderRelated() {
  const m = location.hash.match(/^#post\/([A-Za-z0-9_-]+)/);
  if (!m) {
    peRemoveRelated();
    peRelatedFor = null;
    return;
  }

  const postId = m[1];
  if (peRelatedFor === postId) return;

  try {
    const wp = await import("./website-posts.js");
    const post = await wp.getPostById(postId);
    if (!post || post.status !== "published") return;
    if (peRelatedFor === postId) return;
    if (!/^#post\/[A-Za-z0-9_-]+/.test(location.hash)) return;

    peRelatedFor = postId;

    const posts = post.category
      ? await wp.getPublishedPosts(post.category)
      : [];
    const others = posts
      .filter(function (p) { return p.id !== postId; })
      .slice(0, 3);
    if (!others.length) return;

    /* main.js পোস্টটা render করে ফেলেছে কিনা দেখি */
    const ready = await peWaitPostContent(8000);
    if (!ready) return;
    if (!/^#post\/([A-Za-z0-9_-]+)/.test(location.hash)) return;

    const bn = function (n) {
      try { return Number(n || 0).toLocaleString("bn-BD"); }
      catch (e) { return String(n || 0); }
    };

    const dc = document.getElementById("dynamicContent");
    if (!dc) return;

    peRemoveRelated();

    const box = document.createElement("div");
    box.className = "pe-related";
    box.innerHTML =
      '<p class="pe-rel-head">📖 একই বিভাগে আরও পড়ুন</p>' +
      others.map(function (p) {
        return (
          '<div class="pe-rel-item" data-post-id="' + p.id + '">' +
          '<span class="pe-rel-title"></span>' +
          '<span class="pe-rel-views">👀 ' + bn(p.viewCount) + '</span>' +
          '</div>'
        );
      }).join("");

    box.querySelectorAll(".pe-rel-item").forEach(function (item, i) {
      item.querySelector(".pe-rel-title").textContent = others[i].title || "";
      item.addEventListener("click", function () {
        const nid = item.getAttribute("data-post-id");
        if (nid) location.hash = "post/" + nid;
      });
    });

    dc.appendChild(box);
  } catch (e) {
    console.warn("Post extras: related load failed:", e);
  }
}

window.addEventListener("hashchange", peRenderRelated);
peRenderRelated();
