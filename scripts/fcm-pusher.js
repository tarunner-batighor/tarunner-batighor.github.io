/**
 * ============================================================
 *  তারুণ্যের বাতিঘর — FCM Push Sender (GitHub Actions)
 * ============================================================
 *  প্রতি ৫ মিনিটে চলে (cron)। কাজ:
 *  1. যে notification গুলো এখনো push হয়নি খুঁজে নেয়
 *     (users/{uid}/notifications — pushedAt == null)
 *  2. সেই user-এর সব device token-এ FCM Web Push পাঠায়
 *  3. push শেষে pushedAt চিহ্নিত করে (আবার duplicate হয় না)
 *  4. invalid token গুলো মুছে দেয়
 *
 *  নোট: এখানে কোনো sensitive key থাকে না —
 *  Firebase service account শুধু GitHub-এর encrypted secret-এ।
 * ============================================================
 */

const admin = require("firebase-admin");

const SITE_URL = "https://tarunner-batighor.github.io";

const INVALID_TOKEN_ERRORS = new Set([
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
  "messaging/registration-token-holds-too-many-apps"
]);

async function main() {
  admin.initializeApp();

  const db = admin.firestore();
  const messaging = admin.messaging();

  const snap = await db
    .collectionGroup("notifications")
    .where("pushedAt", "==", null)
    .get();

  const total = snap.size;
  let pushed = 0;
  let noTokens = 0;
  let failed = 0;

  console.log(`Unpushed notifications found: ${total}`);

  for (const nDoc of snap.docs) {
    const n = nDoc.data();
    const parts = nDoc.ref.path.split("/");
    const uid = parts[1];

    try {
      /* ---- user-এর সব device token ---- */
      const tSnap = await db
        .collection("users", uid, "pushTokens")
        .get();
      const tokens = tSnap.docs.map(function (d) { return d.id; });

      let ok = 0;

      if (tokens.length > 0) {
        const pushTitle =
          n.type === "approved"
            ? "✅ পোস্ট অনুমোদিত হয়েছে"
            : "❌ পোস্ট অনুমোদিত হয়নি";
        const body = n.message || "";

        const results = await messaging.sendEachForMulticast({
          tokens: tokens,
          notification: { title: pushTitle, body: body },
          data: {
            title: pushTitle,
            body: body,
            type: n.type || "",
            postId: n.postId || "",
            url: SITE_URL + "/#post/" + (n.postId || "")
          }
        });

        ok = results.successCount;

        /* ---- invalid token cleanup ---- */
        const batch = db.batch();
        for (const r of results.responses) {
          if (!r.success && r.error && INVALID_TOKEN_ERRORS.has(r.error.code)) {
            const idx =
              r.index !== undefined ? r.index : r.indexToOriginalMessage;
            if (idx !== undefined && idx < tokens.length) {
              batch.delete(
                db.collection("users", uid, "pushTokens").doc(tokens[idx])
              );
            }
          }
        }
        await batch.commit();
      } else {
        noTokens++;
      }

      /* ---- pushed mark ---- */
      await db
        .doc("users/" + uid + "/notifications/" + nDoc.id)
        .set(
          {
            pushedAt: new Date().toISOString(),
            pushSuccessCount: ok
          },
          { merge: true }
        );

      if (ok > 0) {
        pushed++;
      } else {
        failed++;
      }

      console.log(
        `notif ${nDoc.id} (${n.type}): sent=${ok}/${tokens.length}`
      );

    } catch (err) {
      failed++;
      console.error(`notif ${nDoc.id} failed: ${err.message}`);
    }
  }

  console.log(
    `DONE total=${total} pushed=${pushed} noTokens=${noTokens} failed=${failed}`
  );
}

main().catch(function (e) {
  console.error("FATAL:", e);
  process.exit(1);
});
