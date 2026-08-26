/* ============================================================
   তারুণ্যের বাতিঘর — Service Worker (PWA)
   - প্রথম ভিজিটে app shell cache করা
   - অফলাইনেও সাইট খোলে (cached home)
   - পরে থেকে লোড হলে ফায়ারবেস থেকে লাইভ পোস্ট আসে
   ============================================================ */

const CACHE_NAME = "batighor-v8";

/* সাইট চালানোর জন্য মৌলিক ফাইলগুলো (version bump -> নতুন fetch) */
const APP_SHELL = [
    "/",
    "index.html",
    "style.css?v=8",
    "main.js?v=8",
    "admin.js?v=5",
    "website-posts.js",
    "manifest.webmanifest",
    "favicon.svg",
    "icons/icon-192.png",
    "icons/icon-512.png",
    "icons/icon-maskable-512.png",
    "icons/apple-touch-icon.png"
];

/* ---- Install: শেল ফাইলগুলো cache-এ রাখি ----
   Auto-skipWaiting না করা — নতুন version "waiting" অবস্থায় থাকবে।
   User "Update করুন" চাপলেই activate, নাহলে app বন্ধ করলে
   পরের launch-এ নিজে থেকেই activate হবে। */
self.addEventListener("install", function (event) {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function (cache) { return cache.addAll(APP_SHELL); })
    );
});

/* ---- "Update করুন" বাটনের signal ---- */
self.addEventListener("message", function (event) {
    if (event.data && event.data.type === "SKIP_WAITING") {
        self.skipWaiting();
    }
});
/* ---- Push: Firebase Cloud Messaging (Web Push) ----
   Cloud Function থেকে push message আসে (post accept/reject) →
   site বন্ধ/পেছনে রাখা অবস্থায়ও ফোনে notification দেখায় */
self.addEventListener("push", function (event) {
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch (e) {
        data = { body: event.data ? event.data.text() : "" };
    }

    const title = data.title || "তারুণ্যের বাতিঘর";
    const options = {
        body: data.body || "",
        icon: "icons/icon-192.png",
        badge: "icons/icon-192.png",
        vibrate: [100, 50, 100],
        renotify: true,
        tag: "batighor-post-update",
        data: { url: data.url || "/" }
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

/* ---- Notification click → সংশ্লিষ্ট post-এ নিয়ে যায় ---- */
self.addEventListener("notificationclick", function (event) {
    event.notification.close();

    const targetUrl =
        (event.notification.data && event.notification.data.url) || "/";

    event.waitUntil(
        self.clients
            .matchAll({ type: "window", includeUncontrolled: true })
            .then(function (winList) {
                for (const client of winList) {
                    if ("focus" in client) {
                        client.focus();
                        try {
                            if (
                                client.url &&
                                client.url.indexOf(targetUrl) === -1
                            ) {
                                client.navigate(targetUrl);
                            }
                        } catch (e) { /* ignore */ }
                        return client;
                    }
                }
                return self.clients.openWindow(targetUrl);
            })
    );
});


/* ---- Activate: পুরনো version-এর cache মুছে ফেলি ---- */
self.addEventListener("activate", function (event) {
    event.waitUntil(
        caches.keys()
            .then(function (keys) {
                return Promise.all(
                    keys.filter(function (k) { return k !== CACHE_NAME; })
                        .map(function (k) { return caches.delete(k); })
                );
            })
            .then(function () { return self.clients.claim(); })
    );
});

/* ---- Fetch: কৌশল ----
   1. পেজ লোড (navigation) → network-first, ব্যর্থ হলে cached home
   2. নিজের ডোমেইনের ফাইল → cache-first
   3. Google Fonts / Firebase JS → stale-while-revalidate
-------------------------------- */
self.addEventListener("fetch", function (event) {
    const req = event.request;
    if (req.method !== "GET") return;

    let url;
    try { url = new URL(req.url); } catch (e) { return; }

    /* 1) Navigation — network-first, offline fallback */
    if (req.mode === "navigate") {
        event.respondWith(
            fetch(req)
                .then(function (res) {
                    const copy = res.clone();
                    caches.open(CACHE_NAME).then(function (cache) {
                        cache.put("index.html", copy);
                    });
                    return res;
                })
                .catch(function () {
                    return caches.match("index.html");
                })
        );
        return;
    }

    /* 2) নিজের ডোমেইনের static ফাইল
           — JS/CSS: network-first (সাইট আপডেট দ্রুত যাবে), offline হলে cache
           — ইমেজ: cache-first (কম বদলায়, জায়গা বাঁচে) */
    if (url.origin === self.location.origin) {
        const isImage = /\.(png|jpe?g|svg|webp|gif|ico)$/i.test(url.pathname);

        if (isImage) {
            event.respondWith(
                caches.match(req).then(function (cached) {
                    if (cached) return cached;
                    return fetch(req).then(function (res) {
                        if (res && res.ok) {
                            const copy = res.clone();
                            caches.open(CACHE_NAME).then(function (cache) {
                                cache.put(req, copy);
                            });
                        }
                        return res;
                    });
                })
            );
            return;
        }

        event.respondWith(
            fetch(req)
                .then(function (res) {
                    if (res && res.ok) {
                        const copy = res.clone();
                        caches.open(CACHE_NAME).then(function (cache) {
                            cache.put(req, copy);
                        });
                    }
                    return res;
                })
                .catch(function () {
                    return caches.match(req).then(function (cached) {
                        if (cached) return cached;
                        if (req.mode === "navigate") return caches.match("index.html");
                        return Response.error();
                    });
                })
        );
        return;
    }

    /* 3) বহিরাগত: fonts + firebase — stale-while-revalidate */
    if (url.hostname === "fonts.googleapis.com" ||
        url.hostname === "fonts.gstatic.com" ||
        url.hostname === "www.gstatic.com") {
        event.respondWith(
            caches.match(req).then(function (cached) {
                const refreshed = fetch(req)
                    .then(function (res) {
                        if (res && res.ok) {
                            const copy = res.clone();
                            caches.open(CACHE_NAME).then(function (cache) {
                                cache.put(req, copy);
                            });
                        }
                        return res;
                    })
                    .catch(function () { return cached; });
                return cached || refreshed;
            })
        );
        return;
    }

    /* বাকি সব (Firebase API ইত্যাদি) → সরাসরি network */
});

