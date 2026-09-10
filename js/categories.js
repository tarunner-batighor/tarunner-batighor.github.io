// @ts-nocheck
/* ============================================================
   তারুণ্যের বাতিঘর — ক্যাটাগরি তালিকা (২০টি বিভাগ)
   আইকন আসে icons.js থেকে (প্রফেশনাল SVG)।
   পুরোনো ৫টি key অক্ষত: ayat · atheism · protest · biography · story
============================================================ */

export const CATEGORIES = [
  { key: "ayat",        name: "আয়াত ও হাদিস",      tagline: "কুরআনের আয়াত ও সহীহ হাদিসের আলোয় জীবন",   grad: ["#0f766e", "#0b3b39"] },
  { key: "atheism",     name: "নাস্তিকতার জবাব",   tagline: "যুক্তি, প্রমাণ ও বিশ্বাস — প্রশ্নের উত্তরে", grad: ["#4f46e5", "#1e1b4b"] },
  { key: "protest",     name: "প্রতিবাদ",           tagline: "অন্যায়, অসঙ্গতি ও কুসংস্কারের বিরুদ্ধে কলম", grad: ["#b91c1c", "#450a0a"] },
  { key: "biography",   name: "জীবনী",              tagline: "আদর্শ মানুষদের জীবন থেকে শেখা",            grad: ["#b45309", "#451a03"] },
  { key: "story",       name: "গল্প-উপন্যাস",       tagline: "কল্পকথা, ছোটগল্প ও ধারাবাহিক উপন্যাস",     grad: ["#6d28d9", "#2e1065"] },
  { key: "kobita",      name: "কবিতা ও ছড়া",       tagline: "ছন্দে, ছত্রে আর অলংকারে অনুভূতির প্রকাশ",   grad: ["#be185d", "#500724"] },
  { key: "nibondho",    name: "প্রবন্ধ-নিবন্ধ",     tagline: "গবেষণাভিত্তিক চিন্তা, বিশ্লেষণ ও মতপ্রকাশ", grad: ["#0369a1", "#082f49"] },
  { key: "soul",        name: "আত্মশুদ্ধি",         tagline: "তাযকিয়া, দোয়া, আমল ও অন্তরের পরিচ্ছন্নতা", grad: ["#047857", "#022c22"] },
  { key: "history",     name: "ইতিহাস-ঐতিহ্য",      tagline: "অতীতের সোনালি পাতা ও শিক্ষণীয় ঘটনা",       grad: ["#7c2d12", "#1c0a02"] },
  { key: "travel",      name: "ভ্রমণকাহিনী",        tagline: "দূর দূরান্তের পথ-চলা আর অভিজ্ঞতার ঝুলি",   grad: ["#0e7490", "#083344"] },
  { key: "biggan",      name: "বিজ্ঞান ও যুক্তি",   tagline: "বিজ্ঞানের চোখে সৃষ্টিরাহস্য ও সত্যের সন্ধান", grad: ["#0d9488", "#042f2e"] },
  { key: "boi",         name: "বই আলোচনা",          tagline: "বইয়ের পাঠ-প্রতিক্রিয়া, সমালোচনা ও সুপারিশ", grad: ["#a16207", "#422006"] },
  { key: "chithi",      name: "চিঠি ও ডায়েরি",      tagline: "মনের কথা, প্রিয়জনকে চিঠি, রোজনামচা",       grad: ["#be123c", "#4c0519"] },
  { key: "rommo",       name: "রম্যরচনা",           tagline: "হাস্যরসে মোড়ানো সমাজের হালচাল",           grad: ["#c2410c", "#431407"] },
  { key: "shishu",      name: "শিশুতোষ",            tagline: "ছোট্টদের জন্য গল্প, ছড়া আর মজার পাঠ",     grad: ["#ea580c", "#431407"] },
  { key: "motamot",     name: "মতামত",              tagline: "সমসাময়িক বিষয়ে স্পষ্ট ভাবনা ও সম্পাদকীয়", grad: ["#334155", "#020617"] },
  { key: "smriti",      name: "স্মৃতিকথা",          tagline: "ফিরে দেখা দিনগুলো, হারিয়ে যাওয়া মুহূর্ত",  grad: ["#15803d", "#052e16"] },
  { key: "onubad",      name: "অনুবাদ সাহিত্য",      tagline: "বিশ্বসাহিত্যের বাংলা স্বাদ",               grad: ["#1d4ed8", "#172554"] },
  { key: "onuprerona",  name: "অনুপ্রেরণা",          tagline: "সাফল্যের গল্প, শিক্ষণীয় জীবন ও নতুন পথ",  grad: ["#ca8a04", "#422006"] },
  { key: "mukto",       name: "মুক্তমঞ্চ",           tagline: "পাঠক-লেখকদের মুক্ত লেখার উন্মুক্ত প্ল্যাটফর্ম", grad: ["#7e22ce", "#3b0764"] }
];

const MAP = Object.create(null);
CATEGORIES.forEach(function (c) { MAP[c.key] = c; });

export function catMeta(key) {
  return MAP[key] || {
    key: key || "unknown",
    name: key ? key.replace(/^./, function (c) { return c.toUpperCase(); }) : "অন্যান্য",
    tagline: "বিবিধ লেখা",
    grad: ["#475569", "#0f172a"]
  };
}

export function catName(key) { return catMeta(key).name; }
