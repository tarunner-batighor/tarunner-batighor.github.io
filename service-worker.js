/* ============================================================
   তারুণ্যের বাতিঘর — Service Worker v2 (প্রিমিয়াম সংস্করণ)
   - অ্যাপ শেল প্রি-ক্যাশ, অফলাইন ফলব্যাক
   - নিজস্ব ফাইল: stale-while-revalidate
   - বাইরের হোস্ট (fonts/gstatic/Firebase JS): cache-first
   - FCM ওয়েব পুশ হ্যান্ডলার পুরোনো মতো অক্ষত
   ============================================================ */

const CACHE_NAME = "batighor-v12";
const SHELL = "batighor-shell-v12";
const RUNTIME = "batighor-runtime-v12";

const APP_SHELL = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "favicon.svg",
  "assets/styles.css",
  "js/fb.js",
  "js/categories.js",
  "js/store.js",
  "js/engage.js",
  "js/leaderboard.js",
  "js/notify.js",
  "js/push.js",
  "js/admin.js",
  "js/app.js",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(SHELL).then(function (cache) {
      return Promise.all(APP_SHELL.map(function (url) {
        return fetch(url, { cache: "reload" }).then(function (res) {
          if (res && (res.ok || res.type === "opaque")) return cache.put(url, res);
        }).catch(function () { /* সিডিএন রেস নয়, অফলাইনে রানটাইমে উঠবে */ });
      }));
    })
  );
  self.skipWaiting();
});

self.addEventListener("message", function (event) {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) {
        return k !== SHELL && k !== RUNTIME;
      }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* নরমালাইজড কী (?v=... বাদ দিয়ে) */
function normKey(req) {
  const u = new URL(req.url);
  u.search = "";
  return u.toString();
}

self.addEventListener("fetch", function (event) {
  const req = event.request;
  if (req.method !== "GET") return;
  let url;
  try { url = new URL(req.url); } catch (e) { return; }

  /* Firebase API/Auth/পুশ সংযোগ কখনো ক্যাশ করা হবে না */
  if (url.hostname === "firestore.googleapis.com" ||
      url.hostname === "identitytoolkit.googleapis.com" ||
      url.hostname === "securetoken.googleapis.com" ||
      url.hostname === "fcmregistrations.googleapis.com" ||
      url.hostname.endsWith("firebaseio.com")) {
    return;
  }

  /* ১) নেভিগেশন → network-first, ফলব্যাক ক্যাশড শেল */
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).then(function (res) {
        const copy = res.clone();
        caches.open(RUNTIME).then(function (c) { c.put("./", copy); }).catch(function () {});
        return res;
      }).catch(function () {
        return caches.match("./").then(function (r) { return r || caches.match("index.html"); });
      })
    );
    return;
  }

  /* ২) বাইরের হোস্ট (Google Fonts, gstatic SDK) → stale-while-revalidate */
  if (url.origin !== self.location.origin) {
    if (url.hostname.indexOf("gstatic.com") !== -1 || url.hostname.indexOf("fonts.googleapis.com") !== -1 ||
        url.hostname.indexOf("fonts.gstatic.com") !== -1) {
      event.respondWith(staleWhileRevalidate(req, true));
      return;
    }
    return; /* অন্য cross-origin বাইপাস */
  }

  /* ৩) নিজস্ব স্ট্যাটিক ফাইল → stale-while-revalidate */
  event.respondWith(staleWhileRevalidate(req, false));
});

function staleWhileRevalidate(req, external) {
  const key = external ? req.url : normKey(req);
  return caches.match(key).then(function (cached) {
    const fetched = fetch(req).then(function (res) {
      if (res && (res.ok || res.type === "opaque") && res.status !== 206) {
        const copy = res.clone();
        caches.open(external ? RUNTIME : SHELL).then(function (c) { c.put(key, copy); }).catch(function () {});
      }
      return res;
    }).catch(function () { return cached || Response.error(); });
    return cached || fetched;
  });
}

/* ---------------- ওয়েব পুশ (FCM) ---------------- */
self.addEventListener("push", function (event) {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch (e) { data = { body: event.data ? event.data.text() : "" }; }

  const title = data.title || "তারুণ্যের বাতিঘর";
  let target = data.url || data.link || "/";
  if (target.indexOf("#post/") !== -1) target = target.replace("#post/", "#/post/");
  if (target.indexOf("#cat/") !== -1) target = target.replace("#cat/", "#/cat/");

  const options = {
    body: data.body || "",
    icon: "icons/icon-192.png",
    badge: "icons/icon-192.png",
    vibrate: [100, 50, 100],
    renotify: true,
    tag: "batighor-" + (data.postId || "update"),
    data: { url: target }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (wins) {
      for (const client of wins) {
        if ("focus" in client) {
          client.focus();
          try { if (client.url && client.url.indexOf(targetUrl) === -1) client.navigate(targetUrl); } catch (e) {}
          return client;
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
