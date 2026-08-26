/**
 * ============================================================
 *  তারুণ্যের বাতিঘর — Cloud Function (Blaze upgrade path)
 * ============================================================
 *  এই function টা এখনো deploy করা হয়নি (Spark plan-এ চলে না)।
 *  বর্তমানে push পাঠাচ্ছে GitHub Actions (scripts/fcm-pusher.js)।
 *
 *  ভবিষ্যতে Blaze plan নিলে শুধু:
 *     firebase deploy --only functions
 *  করলেই push INSTANT হবে (5 মিনিটের delay সবার আগে চলে যাবে)।
 *
 *  নোট: in-site notification লেখে ADMIN PANEL (client-side) —
 *  তাই এই function শুধু push পাঠায় + pushedAt mark করে,
 *  notification দ্বিতীয়বার লেখে না (duplicate এড়ানোর জন্য)।
 * ============================================================
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const SITE_URL = "https://tarunner-batighor.github.io";

const INVALID_TOKEN_ERRORS = new Set([
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
  "messaging/registration-token-holds-too-many-apps"
]);

async function sleep(ms) {
    return new Promise(function (res) { setTimeout(res, ms); });
}

exports.onPostStatusChange = functions.firestore
    .document("Posts/{postId}")
    .onUpdate(async (change, context) => {

        const before = change.before.data();
        const after = change.after.data();
        const postId = context.params.postId;

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
        const db = admin.firestore();
        const userCol = db.collection("users").doc(uid);

        /* ---- client-এর লেখা notification খুঁজে নাও (একবার retry) ---- */
        let matching = [];
        for (let attempt = 0; attempt < 2; attempt++) {
            const snap = await userCol
                .collection("notifications")
                .where("pushedAt", "==", null)
                .get();
            matching = snap.docs.filter(function (d) {
                return d.data().postId === postId;
            });
            if (matching.length > 0) break;
            await sleep(3000);
        }

        if (matching.length === 0) {
            /* notification এখনো লেখা হয়নি — GitHub Actions-এর cron
               নিজেই 5 মিনিটের মধ্যে push করে দেবে */
            return { type: type, deferred: true };
        }

        const n = matching[0].data();
        const message = n.message || "";
        const pushTitle = type === "approved"
            ? "✅ পোস্ট অনুমোদিত হয়েছে"
            : "❌ পোস্ট অনুমোদিত হয়নি";
        const targetUrl = SITE_URL + "/#post/" + postId;

        /* ---- FCM Web Push ---- */
        const tSnap = await userCol.collection("pushTokens").get();
        const tokens = tSnap.docs.map(function (d) { return d.id; });

        let ok = 0;
        if (tokens.length > 0) {
            const results = await admin.messaging().sendEachForMulticast({
                tokens: tokens,
                notification: { title: pushTitle, body: message },
                data: {
                    title: pushTitle,
                    body: message,
                    type: type,
                    postId: postId,
                    url: targetUrl
                }
            });
            ok = results.successCount;

            const batch = db.batch();
            for (const r of results.responses) {
                if (!r.success && r.error && INVALID_TOKEN_ERRORS.has(r.error.code)) {
                    const idx = r.index !== undefined ? r.index : r.indexToOriginalMessage;
                    if (idx !== undefined && idx < tokens.length) {
                        batch.delete(userCol.collection("pushTokens").doc(tokens[idx]));
                    }
                }
            }
            await batch.commit();
        }

        /* ---- pushedAt mark (cron আবার push করবে না) ---- */
        for (const doc of matching) {
            await doc.ref.set(
                {
                    pushedAt: new Date().toISOString(),
                    pushSuccessCount: ok
                },
                { merge: true }
            );
        }

        return { type: type, pushSent: ok > 0, sent: ok, tokens: tokens.length };
    });
