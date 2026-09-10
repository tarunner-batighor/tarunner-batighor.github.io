// @ts-nocheck
/* ============================================================
   তারুণ্যের বাতিঘর — ক্যাটাগরি তালিকা (২০টি বিভাগ)
   পুরোনো ৫টি ক্যাটাগরি key অক্ষত রাখা হয়েছে (data compatibility):
   ayat · atheism · protest · biography · story
============================================================ */

export const CATEGORIES = [
  {
    key: "ayat",
    icon: "🕌",
    name: "আয়াত ও হাদিস",
    tagline: "কুরআনের আয়াত ও সহীহ হাদিসের আলোয় জীবন",
    grad: ["#0d9488", "#0f766e"]
  },
  {
    key: "atheism",
    icon: "🧠",
    name: "নাস্তিকতার জবাব",
    tagline: "যুক্তি, প্রমাণ ও বিশ্বাস — প্রশ্নের উত্তরে",
    grad: ["#6366f1", "#4338ca"]
  },
  {
    key: "protest",
    icon: "✊",
    name: "প্রতিবাদ",
    tagline: "অন্যায়, অসঙ্গতি ও কুসংস্কারের বিরুদ্ধে কলম",
    grad: ["#dc2626", "#991b1b"]
  },
  {
    key: "biography",
    icon: "🌟",
    name: "জীবনী",
    tagline: "আদর্শ মানুষদের জীবন থেকে শেখা",
    grad: ["#d97706", "#b45309"]
  },
  {
    key: "story",
    icon: "📚",
    name: "গল্প-উপন্যাস",
    tagline: "কল্পকথা, ছোটগল্প ও ধারাবাহিক উপন্যাস",
    grad: ["#7c3aed", "#5b21b6"]
  },
  {
    key: "kobita",
    icon: "🪶",
    name: "কবিতা ও ছড়া",
    tagline: "ছন্দে, ছত্রে আর অলংকারে অনুভূতির প্রকাশ",
    grad: ["#db2777", "#9d174d"]
  },
  {
    key: "nibondho",
    icon: "📝",
    name: "প্রবন্ধ-নিবন্ধ",
    tagline: "গবেষণাভিত্তিক চিন্তা, বিশ্লেষণ ও মতপ্রকাশ",
    grad: ["#0284c7", "#075985"]
  },
  {
    key: "soul",
    icon: "🤲",
    name: "আত্মশুদ্ধি",
    tagline: "তাযকিয়া, দোয়া, আমল ও অন্তরের পরিচ্ছন্নতা",
    grad: ["#059669", "#065f46"]
  },
  {
    key: "history",
    icon: "🏛️",
    name: "ইতিহাস-ঐতিহ্য",
    tagline: "অতীতের সোনালি পাতা ও শিক্ষণীয় ঘটনা",
    grad: ["#92400e", "#78350f"]
  },
  {
    key: "travel",
    icon: "🧭",
    name: "ভ্রমণকাহিনী",
    tagline: "দূর দূরান্তের পথ-চলা আর অভিজ্ঞতার ঝুলি",
    grad: ["#0891b2", "#155e75"]
  },
  {
    key: "biggan",
    icon: "🔬",
    name: "বিজ্ঞান ও যুক্তি",
    tagline: "বিজ্ঞানের চোখে সৃষ্টিরাহস্য ও সত্যের সন্ধান",
    grad: ["#0d9488", "#115e59"]
  },
  {
    key: "boi",
    icon: "📖",
    name: "বই আলোচনা",
    tagline: "বইয়ের পাঠ-প্রতিক্রিয়া, সমালোচনা ও সুপারিশ",
    grad: ["#ca8a04", "#854d0e"]
  },
  {
    key: "chithi",
    icon: "✉️",
    name: "চিঠি ও ডায়েরি",
    tagline: "মনের কথা, প্রিয়জনকে চিঠি, রোজনামচা",
    grad: ["#e11d48", "#881337"]
  },
  {
    key: "rommo",
    icon: "😄",
    name: "রম্যরচনা",
    tagline: "হাস্যরসে মোড়ানো সমাজের হালচাল",
    grad: ["#f59e0b", "#b45309"]
  },
  {
    key: "shishu",
    icon: "🧸",
    name: "শিশুতোষ",
    tagline: "ছোট্টদের জন্য গল্প, ছড়া আর মজার পাঠ",
    grad: ["#f97316", "#c2410c"]
  },
  {
    key: "motamot",
    icon: "📣",
    name: "মতামত",
    tagline: "সমসাময়িক বিষয়ে স্পষ্ট ভাবনা ও সম্পাদকীয়",
    grad: ["#475569", "#1e293b"]
  },
  {
    key: "smriti",
    icon: "🌿",
    name: "স্মৃতিকথা",
    tagline: "ফিরে দেখা দিনগুলো, হারিয়ে যাওয়া মুহূর্ত",
    grad: ["#16a34a", "#166534"]
  },
  {
    key: "onubad",
    icon: "🌍",
    name: "অনুবাদ সাহিত্য",
    tagline: "বিশ্বসাহিত্যের বাংলা স্বাদ",
    grad: ["#2563eb", "#1e3a8a"]
  },
  {
    key: "onuprerona",
    icon: "💡",
    name: "অনুপ্রেরণা",
    tagline: "সাফল্যের গল্প, শিক্ষণীয় জীবন ও নতুন পথ",
    grad: ["#eab308", "#a16207"]
  },
  {
    key: "mukto",
    icon: "🎙️",
    name: "মুক্তমঞ্চ",
    tagline: "পাঠক-লেখকদের মুক্ত লেখার উন্মুক্ত প্ল্যাটফর্ম",
    grad: ["#9333ea", "#6b21a8"]
  }
];

const MAP = Object.create(null);
CATEGORIES.forEach(function (c) { MAP[c.key] = c; });

export function catMeta(key) {
  return MAP[key] || {
    key: key || "unknown",
    icon: "📄",
    name: key || "অন্যান্য",
    tagline: "বিবিধ লেখা",
    grad: ["#64748b", "#334155"]
  };
}

export function catName(key) {
  return catMeta(key).name;
}
