/* ============================================================
   Firestore Security Rules ডিপ্লয়ার (এক-ক্লিক, GitHub Actions)
   ব্যবহার:
     GOOGLE_APPLICATION_CREDENTIALS=service-account.json \
       node deploy-firestore-rules.js
   প্রয়োজনীয় service-account অনুমতি:
     roles/firebaserules.admin (অথবা প্রজেক্ট Editor/Owner)
   ------------------------------------------------------------
   firebase CLI ছাড়াই Firebase Rules REST API দিয়ে
   রিপোর ফাইল firestore.rules প্রকাশ করে।
============================================================ */
const fs = require("fs");
const path = require("path");
const { GoogleAuth } = require("google-auth-library");

(async () => {
  const creds = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!creds || !fs.existsSync(creds)) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS সেট করা নেই বা ফাইল নেই");
  }
  const rulesPath = path.join(__dirname, "..", "firestore.rules");
  if (!fs.existsSync(rulesPath)) throw new Error("firestore.rules ফাইল পাওয়া যায়নি");
  const content = fs.readFileSync(rulesPath, "utf8");

  const sa = JSON.parse(fs.readFileSync(creds, "utf8"));
  const projectId = sa.project_id;
  if (!projectId) throw new Error("service account JSON-এ project_id নেই");

  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"]
  });
  const client = await auth.getClient();
  const base = `https://firebaserules.googleapis.com/v1/projects/${projectId}`;

  /* ১) নতুন rulesets তৈরি */
  const rs = await client.request({
    url: base + "/rulesets",
    method: "POST",
    data: { source: { files: [{ name: "firestore.rules", content: content }] } }
  });
  const rulesetName = rs.data && rs.data.name;
  if (!rulesetName) throw new Error("ruleset তৈরি হয়নি: " + JSON.stringify(rs.data));
  console.log("নতুন ruleset:", rulesetName);

  /* ২) cloud.firestore রিলিজে যুক্ত করা (আগে PATCH, না থাকলে POST) */
  const releaseName = base + "/releases/cloud.firestore";
  try {
    await client.request({
      url: releaseName + "?updateMask=rulesetName",
      method: "PATCH",
      data: { name: releaseName, rulesetName: rulesetName }
    });
  } catch (e) {
    const code = e && e.response && e.response.data && e.response.data.error && e.response.data.error.code;
    if (code === 404) {
      await client.request({
        url: base + "/releases?releaseId=cloud.firestore",
        method: "POST",
        data: { name: releaseName, rulesetName: rulesetName }
      });
    } else {
      throw e;
    }
  }
  console.log("✅ Firestore rules প্রকাশিত হয়েছে — project:", projectId);
})().catch(function (e) {
  const err = e && e.response && e.response.data ? e.response.data : { message: e.message };
  console.error("❌ rules ডিপ্লয় ব্যর্থ:", JSON.stringify(err, null, 2));
  if (err && err.error && /permission|forbidden|403/i.test(JSON.stringify(err))) {
    console.error("\nপরামর্শ: service account-টিতে 'Firebase Rules Admin' (roles/firebaserules.admin)\n" +
      "IAM রোল দিন, অথবা Firebase Console → Firestore → Rules থেকে ম্যানুয়ালি পেস্ট করুন।");
  }
  process.exit(1);
});
