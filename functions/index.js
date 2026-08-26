/**
 * ============================================================
 *  তারুণ্যের বাতিঘর — Cloud Functions
 * ============================================================
 *  কাজ:
 *  Admin কোনো পোস্টের status বদলালে (published / rejected):
 *   1. লেখকের users/{uid}/notifications-এ notification লেখে
 *      (সাইটের ভিতরের Bell-এ দেখা যায়)
 *   2. FCM Web Push পাঠায় লেখকের সব device/browser-এ
 *      (site বন্ধ থাকা অবস্থায়ও ফোনে আসে)
 *
 *  Deploy:
 *   npm install -g firebase-tools
 *   firebase login
 *   firebase deploy        (repo root থেকে)
 * ============================================================
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const SITE_URL = "https://tarunner-batighor.github.io";

/* ============================================================
   Posts/{postId} status পরিবর্তন হলে trigger
   ============================================================ */
exports.onPostStatusChange = functions.firestore
    .document("Posts/{postId}")
    .onUpdate(async (change, context) => {

        const before = change.before.data();
        const after = change.after.data();
        const postId = context.params.postId;

        /* authorUid না থাকলে (পুরনো পোস্ট) বা status বদলায় না হলে ignore */
        if (!after.authorUid) return null;
        if ((before.status || "") === (after.status || "")) return null;

        const from = before.status || "";
        const to = after.status || "";

        let type = null;
        if (to === "published" && from !== "published") {
            type = "approved";
        } else if (to === "rejected" && from !== "rejected") {
            type = "rejected";
        }

        if (!type) return null;

        const uid = after.authorUid;
        const postTitle = after.title || "";

        /* ---- বার্তা (spec অনুযায়ী) ---- */
        const message = type === "approved"
            ? "আপনার পোস্টটি অনুমোদিত হয়েছে এবং এখন ওয়েবসাইটে প্রকাশিত হয়েছে।"
            : "দুঃখিত, আপনার পোস্টটি অনুমোদিত হয়নি।";

        const pushTitle = type === "approved"
            ? "✅ পোস্ট অনুমোদিত হয়েছে"
            : "❌ পোস্ট অনুমোদিত হয়নি";

        const targetUrl = SITE_URL + "/#post/" + postId;

        const db = admin.firestore();
        const userRef = db.collection("users").doc(uid);

        /* ============================================================
           1) In-site notification
              (users/{uid}/notifications — Bell-এ দেখা যাবে)
           ============================================================ */
        await userRef.collection("notifications").add({
            type: type,
            postId: postId,
            postTitle: postTitle,
            message: message,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        /* ============================================================
           2) FCM Web Push
              (users/{uid}/pushTokens — প্রতিটি device/browser-এ)
           ============================================================ */
        const tokensSnap = await userRef
            .collection("pushTokens")
            .get();

        const tokens = [];
        tokensSnap.forEach(function (d) {
            tokens.push(d.id);
        });

        if (tokens.length === 0) {
            return { type: type, pushSent: false, reason: "no_tokens" };
        }

        /* token invalid হলে FCM যে error code দেয় (তখন token মুছে ফেলা হয়) */
        const invalidTokenErrors = new Set([
            "messaging/invalid-registration-token",
            "messaging/registration-token-not-registered",
            "messaging/registration-token-holds-too-many-apps"
        ]);

        /* notification + data দুই-তেই title/body রাখি:
           - site বন্ধ → browser নিজেই notification ফিল্ড থেকে দেখায়
           - site background-এ খোলা → SW push handler data থেকে দেখায় */
        const results = await admin.messaging().sendEachForMulticast({
            tokens: tokens,
            notification: {
                title: pushTitle,
                body: message
            },
            data: {
                title: pushTitle,
                body: message,
                type: type,
                postId: postId,
                url: targetUrl
            }
        });

        /* ---- Invalid token গুলো সাইট থেকে মুছে ফেলি ---- */
        const batch = db.batch();
        let failed = 0;
        let removed = 0;

        for (const r of results.responses) {
            if (r.success) continue;
            failed++;
            const code = r.error && r.error.code;
            if (code && invalidTokenErrors.has(code)) {
                const idx = (r.index !== undefined) ? r.index : r.indexToOriginalMessage;
                if (idx !== undefined && idx < tokens.length) {
                    batch.delete(userRef.collection("pushTokens").doc(tokens[idx]));
                    removed++;
                }
            }
        }

        if (removed > 0) {
            await batch.commit();
        }

        return {
            type: type,
            pushSent: results.successCount > 0,
            totalTokens: tokens.length,
            successCount: results.successCount,
            failedCount: failed,
            tokensRemoved: removed
        };
    });
