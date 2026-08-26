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
 *  নোট: notification + queue item লেখে ADMIN PANEL (client)।
 *  এই function শুধু queue থেকে item নিয়ে push পাঠায়।
 *  cron + function দুটো একসাথে থাকলেও double-push হবে না —
 *  যে item আগে push করবে সেটা queue থেকে মুছে ফেলবে।
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

        const db = admin.firestore();

        /* ---- queue item খুঁজে নাও (client delay হলে একবার retry) ---- */
        let items = [];
        for (let attempt = 0; attempt < 2; attempt++) {
            const snap = await db
                .collection("pushQueue")
                .where("postId", "==", postId)
                .get();
            items = snap.docs.filter(function (d) {
                return d.data().type === type;
            });
            if (items.length > 0) break;
            await sleep(3000);
        }

        if (items.length === 0) {
            /* queue item এখনো আসেনি — GitHub Actions-এর cron
               নিজেই 5 মিনিটের মধ্যে push করে দেবে */
            return { type: type, deferred: true };
        }

        let sent = 0;
        for (const qDoc of items) {
            const q = qDoc.data();
            const uid = q.uid;
            try {
                const tSnap = await db
                    .collection("users", uid, "pushTokens")
                    .get();
                const tokens = tSnap.docs.map(function (d) { return d.id; });

                let ok = 0;
                if (tokens.length > 0) {
                    const pushTitle = type === "approved"
                        ? "✅ পোস্ট অনুমোদিত হয়েছে"
                        : "❌ পোস্ট অনুমোদিত হয়নি";
                    const results = await admin.messaging().sendEachForMulticast({
                        tokens: tokens,
                        notification: { title: pushTitle, body: q.message || "" },
                        data: {
                            title: pushTitle,
                            body: q.message || "",
                            type: type,
                            postId: postId,
                            url: SITE_URL + "/#post/" + postId
                        }
                    });
                    ok = results.successCount;

                    const batch = db.batch();
                    for (const r of results.responses) {
                        if (!r.success && r.error && INVALID_TOKEN_ERRORS.has(r.error.code)) {
                            const idx = r.index !== undefined ? r.index : r.indexToOriginalMessage;
                            if (idx !== undefined && idx < tokens.length) {
                                batch.delete(
                                    db.collection("users", uid, "pushTokens").doc(tokens[idx])
                                );
                            }
                        }
                    }
                    await batch.commit();
                }

                await db
                    .doc("users/" + uid + "/notifications/" + q.notifId)
                    .set(
                        {
                            pushedAt: new Date().toISOString(),
                            pushSuccessCount: ok
                        },
                        { merge: true }
                    );

                await qDoc.ref.delete();
                sent += ok;
            } catch (e) {
                console.error("push failed for", qDoc.id, e.message);
            }
        }

        return { type: type, pushSent: sent > 0, sent: sent };
    });
