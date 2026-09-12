// @ts-nocheck
/* ============================================================
   তারুণ্যের বাতিঘর — দৈনিক বাণী (স্টাফ-পরিচালিত, Firestore)
   - মডারেটর/অ্যাডমিন মডারেশন প্যানেলের «বাণী» ট্যাব থেকে
     প্রতিদিনের বাণী যোগ/সম্পাদনা/মুছতে পারেন
   - প্রতিটি বাণীর সাথে একটি দিন (day index) যুক্ত থাকে;
     একই দিনে সব পাঠক একই বাণী দেখেন, রিলোডে বদলায় না
   - নির্দিষ্ট দিনে বাণী না থাকলে আগের সর্বশেষ বাণী দেখানো হয়
============================================================ */

/* নির্দিষ্ট প্রারম্ভিক দিন (স্থানীয়) — দিন-সংখ্যার ভিত্তি */
export const QUOTE_EPOCH = Date.UTC(2026, 0, 1);
const DAY_MS = 86400000;

/* স্থানীয় তারিখ অনুযায়ী দিন-সংখ্যা */
export function dayIndexOf(date) {
  const d = date instanceof Date ? new Date(date) : new Date();
  const localMid = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const epochLocal = new Date(2026, 0, 1).getTime();
  return Math.round((localMid - epochLocal) / DAY_MS);
}

/* দিন-সংখ্যা থেকে স্থানীয় Date (মধ্যরাত্রি) */
export function dateOfDay(n) {
  const d = new Date(QUOTE_EPOCH + n * DAY_MS);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/* বাংলা পূর্ণ তারিখ: শুক্রবার, ১২ সেপ্টেম্বর, ২০২৬ */
const bnDateFmt = new Intl.DateTimeFormat("bn-BD", {
  weekday: "long", day: "numeric", month: "long", year: "numeric"
});
export function bnDateOfDay(n) {
  return bnDateFmt.format(dateOfDay(n));
}

export const bnNum = (function () {
  const map = { "0": "০", "1": "১", "2": "২", "3": "৩", "4": "৪", "5": "৫", "6": "৬", "7": "৭", "8": "৮", "9": "৯" };
  return function (n) { return String(n).replace(/[0-9]/g, function (c) { return map[c]; }); };
})();

/* <input type="date"> (yyyy-mm-dd, স্থানীয়) ↔ day index */
export function dayIndexFromInput(iso) {
  const parts = String(iso || "").split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return dayIndexOf(new Date());
  return dayIndexOf(new Date(parts[0], parts[1] - 1, parts[2]));
}
export function inputValueOfDay(n) {
  const d = dateOfDay(n);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + m + "-" + day;
}

/* Firestore থেকে-আসা বাণীর তালিকা থেকে নির্দিষ্ট দিনের বাণী বাছাই:
   ১) ঐ দিনের জন্য নির্ধারিত বাণী; ২) না থাকলে তার আগের সর্বশেষ বাণী */
export function pickQuoteOfDay(quotes, n) {
  if (!quotes || !quotes.length) return null;
  let exact = null, fallback = null;
  for (const q of quotes) {
    if (typeof q.day !== "number") continue;
    if (q.day === n) { exact = q; break; }
    if (q.day < n && (!fallback || q.day > fallback.day)) fallback = q;
  }
  return exact || fallback;
}

/* প্রকাশিত লেখা থেকে বাণী হিসেবে ব্যবহারযোগ্য বাক্যাংশের পরামর্শ */
export function suggestFromPosts(posts, maxPerPost, totalMax) {
  const per = maxPerPost || 1;
  const total = totalMax || 8;
  const out = [];
  const seen = {};
  for (const p of posts || []) {
    const text = String(p.content || "").replace(/[“”"]/g, "").replace(/\s+/g, " ").trim();
    const sentences = text.split(/(?<=[।!?…])\s*/);
    let taken = 0;
    for (let raw of sentences) {
      if (taken >= per || out.length >= total) break;
      const s = raw.trim().replace(/^[•\-*0-9.)\s]+/, "");
      const len = s.length;
      if (len < 38 || len > 190) continue;
      if (/(https?:|www\.|@|[0-9]{4,})/.test(s)) continue;
      if (/[,:;]/.test(s) && len > 140) continue;
      if (seen[s]) continue;
      seen[s] = true;
      out.push({
        text: s,
        author: p.authorName || "তারুণ্যের বাতিঘর",
        postId: p.id,
        sourceTitle: p.title || ""
      });
      taken++;
    }
  }
  return out.slice(0, total);
}
