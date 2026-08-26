/**
 * ============================================================
 *  তারুণ্যের বাতিঘর — FCM Push Sender (GitHub Actions)
 * ============================================================
 *  প্রতি ৫ মিনিটে চলে (cron)। কাজ:
 *  1. pushQueue collection থেকে pending item নেয়
 *     (admin accept/reject করলেই এই queue-তে item আসে)
 *  2. সেই user-এর সব device token-এ FCM Web Push পাঠায়
 *  3. notification-এ pushedAt চিহ্নিত করে
 *  4. queue item মুছে দেয়, invalid token মুছে দেয়
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

/* FCM connectivity smoke test (dummy token — expected error tells us
   service account + VAPID setup ঠিক আছে কিনা) */
async function smokeTest(messaging) {
  try {
    await messaging.send({
      token: "smoke-test-invalid-token",
      notification: { title: "test", body: "test" },
      data: { url: SITE_URL }
    });
    console.log("SMOKE: send ok (unexpected for dummy token)");
  } catch (e) {
    const code = String((e.error && e.error.code) || e.message || "");
    console.log("SMOKE FCM responded:", code.slice(0, 200));
    if (
      code.includes("invalid-registration-token") ||
      code.includes("400")
    ) {
      console.log(
        "SMOKE OK — FCM auth + VAPID setup valid (dummy token correctly rejected)"
      );
      return;
    }
    throw new Error("SMOKE FAIL — unexpected FCM error: " + code.slice(0, 300));
  }
}

async function main() {
  admin.initializeApp();

  const db = admin.firestore();
  const messaging = admin.messaging();

  if (process.env.SMOKE_TEST === "1") {
    await smokeTest(messaging);
    return;
  }

  const queue = await db.collection("pushQueue").get();

  const total = queue.size;
  let pushed = 0;
  let noTokens = 0;
  let failed = 0;

  console.log(`pushQueue items: ${total}`);

  for (const qDoc of queue.docs) {
    const q = qDoc.data();
    const uid = q.uid;
    const notifId = q.notifId;

    try {
      /* ---- user-এর সব device token ---- */
      const tSnap = await db
        .collection("users", uid, "pushTokens")
        .get();
      const tokens = tSnap.docs.map(function (d) { return d.id; });

      let ok = 0;

      if (tokens.length > 0) {
        const pushTitle =
          q.type === "approved"
            ? "✅ পোস্ট অনুমোদিত হয়েছে"
            : "❌ পোস্ট অনুমোদিত হয়নি";
        const body = q.message || "";

        const results = await messaging.sendEachForMulticast({
          tokens: tokens,
          notification: { title: pushTitle, body: body },
          data: {
            title: pushTitle,
            body: body,
            type: q.type || "",
            postId: q.postId || "",
            url: SITE_URL + "/#post/" + (q.postId || "")
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

      /* ---- notification-এ pushedAt mark ---- */
      await db
        .doc("users/" + uid + "/notifications/" + notifId)
        .set(
          {
            pushedAt: new Date().toISOString(),
            pushSuccessCount: ok
          },
          { merge: true }
        );

      /* ---- queue item মুছে ফেলা ---- */
      await qDoc.ref.delete();

      if (ok > 0) {
        pushed++;
      } else {
        failed++;
      }

      console.log(
        `queue ${qDoc.id} (${q.type}, user ${uid.slice(0, 8)}…): sent=${ok}/${tokens.length}`
      );

    } catch (err) {
      failed++;
      /* queue item থাকবে — পরের run-এ আবার চেষ্টা হবে */
      console.error(`queue ${qDoc.id} failed (will retry): ${err.message}`);
    }
  }

  console.log(
    `DONE items=${total} pushed=${pushed} noTokens=${noTokens} failed=${failed}`
  );
}

main().catch(function (e) {
  console.error("FATAL:", e);
  process.exit(1);
});
