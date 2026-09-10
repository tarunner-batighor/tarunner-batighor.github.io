// @ts-nocheck
/* ============================================================
   তারুণ্যের বাতিঘর — প্রফেশনাল SVG লাইন-আইকন সেট
   স্ট্রোক-ভিত্তিক, currentColor — যেকোনো রঙ/সাইজে মানানসই
============================================================ */

const I = {
  ayat:
    '<path d="M3.6 20.5v-6a8.4 8.4 0 0 1 16.8 0v6"/><path d="M3.6 20.5h16.8"/>' +
    '<path d="M10 20.5v-3a2 2 0 0 1 4 0v3"/>' +
    '<path d="M12.7 2.2a1.9 1.9 0 1 0 1.2 3.5A2.3 2.3 0 0 1 12.7 2.2z"/>',
  atheism:
    '<path d="M19.8 12a7.8 7.8 0 0 1-7.8 7.8H6l-2.6 2.2V12a7.3 7.3 0 1 1 16.4 0z"/>' +
    '<path d="M9.9 9.4a1.9 1.9 0 1 1 2.7 1.7c-.7.4-1 .9-1 1.6"/>' +
    '<circle cx="11.8" cy="15" r=".6" fill="currentColor" stroke="none"/>',
  protest:
    '<path d="M5.5 21V4"/><path d="M5.5 4.8h12.5l-2.1 3.4 2.1 3.4h-12.5"/>' +
    '<path d="M3 21h5"/>',
  biography:
    '<circle cx="12" cy="14.5" r="5.6"/>' +
    '<path d="m12 11.6.9 1.8 2 .3-1.4 1.4.3 2-1.8-.9-1.8.9.3-2L9.1 13.7l2-.3z"/>' +
    '<path d="m9.2 3.4 1.6 5M14.8 3.4l-1.6 5"/>',
  story:
    '<rect x="3.4" y="3.6" width="6.8" height="16.8" rx="1.3"/>' +
    '<rect x="13.8" y="3.6" width="6.8" height="16.8" rx="1.3"/>' +
    '<path d="M6.8 7.4v9M17.2 7.4v9"/>',
  kobita:
    '<path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/>' +
    '<path d="M16 8 2 22"/><path d="M17.5 15H9"/>',
  nibondho:
    '<path d="M14 2.5H6a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8.5z"/>' +
    '<path d="M14 2.5v6h6"/><path d="M8 13h8M8 17h8M8 9h2"/>',
  soul:
    '<path d="M19.6 13.4A7.6 7.6 0 1 1 10.6 4.4 6.2 6.2 0 0 0 19.6 13.4z"/>' +
    '<path d="m18 2.6-.5 1.3-1.4.4 1.4.4.5 1.3.5-1.3 1.4-.4-1.4-.4z"/>',
  history:
    '<path d="M3 21h18"/><path d="M5.5 21V9.2M18.5 21V9.2M9.7 21V9.2M14.3 21V9.2"/>' +
    '<path d="M3 9.2h18"/><path d="m4.2 9.2 2.4-3.4h10.8l2.4 3.4"/>',
  travel:
    '<circle cx="12" cy="12" r="8.8"/><path d="m15.4 8.6-1.9 4.9-4.9 1.9 1.9-4.9z"/>',
  biggan:
    '<path d="M9.2 3h5.6"/><path d="M10 3v5.4L4.9 17.6a2 2 0 0 0 1.8 3h10.6a2 2 0 0 0 1.8-3L14 8.4V3"/>' +
    '<path d="M7.2 14.4h9.6"/>',
  boi:
    '<path d="M2.5 3.5h6A3.5 3.5 0 0 1 12 7v13.5a3 3 0 0 0-3-3H2.5z"/>' +
    '<path d="M21.5 3.5h-6A3.5 3.5 0 0 0 12 7v13.5a3 3 0 0 1 3-3h6.5z"/>',
  chithi:
    '<rect x="3" y="5" width="18" height="14" rx="2.2"/><path d="m3.5 7.2 8.5 5.6 8.5-5.6"/>',
  rommo:
    '<circle cx="12" cy="12" r="8.8"/><path d="M8.4 14.2a5 5 0 0 0 7.2 0"/>' +
    '<circle cx="9.2" cy="9.6" r=".7" fill="currentColor" stroke="none"/>' +
    '<circle cx="14.8" cy="9.6" r=".7" fill="currentColor" stroke="none"/>',
  shishu:
    '<path d="M12 2.8a5 5 0 0 1 5 5c0 3-2.6 4.1-5 5.1-2.4-1-5-2.1-5-5.1a5 5 0 0 1 5-5z"/>' +
    '<path d="M12 13v3.4"/><path d="M10 20.4h4M12 16.4c-1.4 1-2 2-2 4M12 16.4c1.4 1 2 2 2 4"/>',
  motamot:
    '<path d="m3.5 11 17-5v12l-17-5z"/>' +
    '<path d="M11.4 16.6a3 3 0 1 1-5.7 1.5L4.5 11"/>',
  smriti:
    '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10z"/>' +
    '<path d="M2 21c0-3 1.85-5.4 5.1-6"/>',
  onubad:
    '<circle cx="12" cy="12" r="8.8"/><path d="M3.2 12h17.6"/>' +
    '<path d="M12 3.2a14 14 0 0 1 0 17.6 14 14 0 0 1 0-17.6z"/>',
  onuprerona:
    '<path d="M9.2 17.5h5.6"/><path d="M10 21h4"/>' +
    '<path d="M15 13.8A6 6 0 1 0 9 13.8c.7-.6 1-1.3 1-2h4c0 .7.3 1.4 1 2z"/>',
  mukto:
    '<rect x="9" y="2.5" width="6" height="11.5" rx="3"/>' +
    '<path d="M5.5 10.5a6.5 6.5 0 0 0 13 0"/><path d="M12 17v4M8.5 21h7"/>'
};

const SIZES = { xs: 12, sm: 14, md: 18, lg: 24, xl: 30 };

export function catIcon(key, size) {
  const s = typeof size === "number" ? size : (SIZES[size || "md"] || 18);
  const cls = typeof size === "string" ? "cat-ic ci-" + size : "cat-ic";
  return '<svg class="' + cls + '" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" ' +
    'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    (I[key] || I.nibondho) + "</svg>";
}

const UI = {
  dice: '<rect x="3.5" y="3.5" width="17" height="17" rx="3.5"/><circle cx="8.6" cy="8.6" r="1.1" fill="currentColor" stroke="none"/><circle cx="15.4" cy="15.4" r="1.1" fill="currentColor" stroke="none"/><circle cx="15.4" cy="8.6" r="1.1" fill="currentColor" stroke="none"/><circle cx="8.6" cy="15.4" r="1.1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none"/>',
  pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  idCard: '<rect x="2.5" y="5" width="19" height="14" rx="2.2"/><circle cx="8" cy="11.5" r="2.1"/><path d="M4.6 16.6c.5-1.2 1.7-1.7 3.4-1.7s2.9.5 3.4 1.7M14.5 10h4M14.5 13h4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
  eye: '<path d="M2.2 12S6 5.2 12 5.2 21.8 12 21.8 12 18 18.8 12 18.8 2.2 12 2.2 12z"/><circle cx="12" cy="12" r="2.1" fill="currentColor" stroke="none"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  home: '<path d="m3 10 9-7 9 7v9.5a1.5 1.5 0 0 1-1.5 1.5H15v-6.5H9V21H4.5A1.5 1.5 0 0 1 3 19.5z"/>',
  grid: '<rect x="3" y="3" width="7.2" height="7.2" rx="1.4"/><rect x="13.8" y="3" width="7.2" height="7.2" rx="1.4"/><rect x="13.8" y="13.8" width="7.2" height="7.2" rx="1.4"/><rect x="3" y="13.8" width="7.2" height="7.2" rx="1.4"/>',
  compass: '<circle cx="12" cy="12" r="9.2"/><path d="m15.6 8.4-2.1 5.1-5.1 2.1 2.1-5.1z"/>',
  print: '<path d="M6 9V3h12v6"/><rect x="4" y="9" width="16" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
  expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  sound: '<path d="M11 5 6.5 9H3v6h3.5L11 19z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
  mute: '<path d="M11 5 6.5 9H3v6h3.5L11 19z"/><path d="m22 9-6 6M16 9l6 6"/>',
  stop: '<rect x="6.5" y="6.5" width="11" height="11" rx="2"/>',
  arrowUp: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  arrowRight: '<path d="M4 12h15M13 6l6 6-6 6"/>',
  chevronRight: '<path d="m9 6 6 6-6 6"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  quote: '<path d="M7.5 11c-2.5 0-4-1.8-4-4.5C3.5 4 5.5 2.5 8 3c1.8.4 2.8 2 2.5 4-.3 2.2-1.8 3.4-3.4 3.6L7 11zM16.5 11c-2.5 0-4-1.8-4-4.5C12.5 4 14.5 2.5 17 3c1.8.4 2.8 2 2.5 4-.3 2.2-1.8 3.4-3.4 3.6L16 11z"/><path d="M7.5 10.5c0 4 1 6.5 3.5 8M16.5 10.5c0 4 1 6.5 3.5 8"/>',
  bookmark: '<path d="m19 21-7-4-7 4V5.5A2.5 2.5 0 0 1 7.5 3h9A2.5 2.5 0 0 1 19 5.5z"/>',
  bookmarkFill: '<path d="m19 21-7-4-7 4V5.5A2.5 2.5 0 0 1 7.5 3h9A2.5 2.5 0 0 1 19 5.5z" fill="currentColor" stroke="currentColor"/>',
  heart: '<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z"/>',
  heartFill: '<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z" fill="currentColor" stroke="currentColor"/>',
  comment: '<path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  share: '<circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="m8.3 10.8 7.4-4.3M8.3 13.2l7.4 4.3"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.4.6l2.9-2.9a5 5 0 0 0-7-7l-1.8 1.7"/><path d="M14 11a5 5 0 0 0-7.4-.6l-2.9 2.9a5 5 0 0 0 7 7l1.7-1.7"/>',
  copy: '<rect x="9" y="9" width="12.5" height="12.5" rx="2"/><path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6"/><path d="M10 11v6M14 11v6"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  checkCircle: '<circle cx="12" cy="12" r="9.2"/><path d="m8.5 12.2 2.4 2.4 4.8-5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  xCircle: '<circle cx="12" cy="12" r="9.2"/><path d="m15 9-6 6M9 9l6 6"/>',
  alert: '<path d="M10.3 3.9 2.4 17.6A2 2 0 0 0 4.1 20.6h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4.5M12 17.2h.01"/>',
  info: '<circle cx="12" cy="12" r="9.2"/><path d="M12 11v5M12 7.6h.01"/>',
  ban: '<circle cx="12" cy="12" r="9.2"/><path d="m5.6 5.6 12.8 12.8"/>',
  lock: '<rect x="4" y="10.5" width="16" height="10.5" rx="2.2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
  login: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="m10 17 5-5-5-5"/><path d="M15 12H3"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  shield: '<path d="M12 22s8-3.6 8-10V5.2l-8-3-8 3V12c0 6.4 8 10 8 10z"/><path d="m9 11.8 2.2 2.2L15.5 9.5"/>',
  bell: '<path d="M6 9a6 6 0 0 1 12 0c0 5.5 2.2 6.6 2.6 7H3.4c.4-.4 2.6-1.5 2.6-7z"/><path d="M10.3 19.5a2 2 0 0 0 3.4 0"/>',
  bellOff: '<path d="M8.7 4A6 6 0 0 1 18 9c0 4 .8 5.7 1.5 6.5M6 16.5c-.4-.4-1-1.2-1-3.5"/><path d="M10.3 19.5a2 2 0 0 0 3.4 0"/><path d="m3 3 18 18"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2.5 12h2M19.5 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  star: '<path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/>',
  sparkles: '<path d="m12 3-1.7 5.3a2 2 0 0 1-1.2 1.2L3.8 11.2l5.3 1.7a2 2 0 0 1 1.2 1.2L12 19.4l1.7-5.3a2 2 0 0 1 1.2-1.2l5.3-1.7-5.3-1.7a2 2 0 0 1-1.2-1.2z"/><path d="M19 3.5v3M20.5 5h-3"/>',
  fire: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  trophy: '<path d="M6 4h12v5a6 6 0 0 1-12 0z"/><path d="M6 5H4a2 2 0 0 0 0 5h2.5M18 5h2a2 2 0 0 1 0 5h-2.5"/><path d="M9 16.5h6M10 16.5V20M14 16.5V20M7.5 20h9"/>',
  crown: '<path d="m3 7 4 4 5-6 5 6 4-4-2.5 11.5h-13z"/><path d="M5.5 21h13"/>',
  medal: '<path d="M7.2 15 2.7 7.1a2 2 0 0 1 .1-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.1a2 2 0 0 1 .1 2.2L16.8 15"/><path d="m11 12-5.9-9.8M13 12l5.9-9.8"/><path d="M8 7h8"/><circle cx="12" cy="17" r="4.6"/><path d="m12 14.8-.7 1.4-1.5.2 1.1 1-.3 1.5 1.4-.7 1.4.7-.3-1.5 1.1-1-1.5-.2z"/>',
  chart: '<path d="M3 3v18h18"/><path d="M7.5 16v-4.5M12.5 16V8M17.5 16v-2.5"/>',
  newspaper: '<path d="M4 21h15a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2z"/><path d="M4 19a2 2 0 0 0-2 2 2 2 0 0 0 2 2h15"/><path d="M9 7h8M9 11h8M9 15h5M6 7h.01M6 11h.01M6 15h.01"/>',
  feather: '<path d="M20.2 12.2a6 6 0 0 0-8.5-8.5L5 10.5V19h8.5z"/><path d="M16 8 2 22"/><path d="M17.5 15H9"/>',
  scroll: '<path d="M19 17V5a2 2 0 0 0-2-2H4"/><path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  bookOpen: '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
  folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.2a2 2 0 0 1-1.6-.8L10 3.7A2 2 0 0 0 8.4 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/>',
  file: '<path d="M14 2.5H6a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8.5z"/><path d="M14 2.5v6h6M9 13h6M9 17h6"/>',
  save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
  history: '<path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3.5 2"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v5h-5"/><path d="M3.6 18.4A9 9 0 0 0 6 20.4"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
  inbox: '<path d="M22 12h-5.5l-2 3h-5l-2-3H2"/><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.7 4H7.3a2 2 0 0 0-1.8 1.1z"/>',
  calendar: '<rect x="3.5" y="4.5" width="17" height="17" rx="2.2"/><path d="M16 2.5v4M8 2.5v4M3.5 10h17"/>',
  pin: '<path d="M12 17v5"/><path d="M9 10.8a2 2 0 0 1-1.1 1.8l-1.8.9A2 2 0 0 0 5 15.2V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.8a2 2 0 0 0-1.1-1.8l-1.8-.9a2 2 0 0 1-1.1-1.8V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>',
  rocket: '<path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2.1-.1-2.9a2.1 2.1 0 0 0-2.9-.1z"/><path d="m12 15-3-3a22 22 0 0 1 2-4A12.9 12.9 0 0 1 22 2c0 2.7-.8 7.5-6 11a22.4 22.4 0 0 1-4 2z"/><path d="M9 12H4s.5-3 2-4c1.6-1.1 5 0 5 0M12 15v5s3-.5 4-2c1.1-1.6 0-5 0-5"/>',
  zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  mic: '<rect x="9" y="2.5" width="6" height="11" rx="3"/><path d="M5 10.5a7 7 0 0 0 14 0M12 17.5v4M9.5 21.5h5"/>',
  phone: '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>',
  mail: '<rect x="2.5" y="4.5" width="19" height="15" rx="2.2"/><path d="m3.5 7 8.5 5.5 8.5-5.5"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3.2"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2.5"/><circle cx="9" cy="9" r="1.8"/><path d="m21 15-4.5-4.5a2 2 0 0 0-2.8 0L5 19.5"/>',
  type: '<path d="M4 6V4h16v2M9 20h6M12 4v16"/>',
  settings: '<circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.2A1.6 1.6 0 0 0 6.8 19l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3 13.6H2.8a2 2 0 1 1 0-4H3a1.6 1.6 0 0 0 1.1-2.7l-.1-.1A2 2 0 1 1 6.8 4l.1.1a1.6 1.6 0 0 0 1.8.3A1.6 1.6 0 0 0 9.6 3V2.8a2 2 0 1 1 4 0V3a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8 1.6 1.6 0 0 0 1.5 1h.2a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.3 1z"/>',
  trending: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  layers: '<path d="m12.8 2.2 8.6 3.9a1 1 0 0 1 0 1.8l-8.6 3.9a2 2 0 0 1-1.6 0L2.6 7.9a1 1 0 0 1 0-1.8l8.6-3.9a2 2 0 0 1 1.6 0z"/><path d="m3 12.5 8.6 4a2 2 0 0 0 1.6 0l8.6-4"/>',
  verified: '<path d="m12 2 2.4 1.8 3 .2.2 3 1.8 2.4-1.8 2.4-.2 3-3 .2L12 22l-2.4-1.8-3-.2-.2-3L4.6 14.6l1.8-2.4.2-3 3-.2z"/><path d="m9 12 2 2 4-4"/>',
  send: '<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/>',
  rss: '<path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1.2" fill="currentColor" stroke="none"/>',
  globe: '<circle cx="12" cy="12" r="9.2"/><path d="M3 12h18M12 2.8a14.5 14.5 0 0 1 0 18.4M12 2.8a14.5 14.5 0 0 0 0 18.4"/>',
  whatsapp: '<path d="M12 3.5c-4.7 0-8.5 3.7-8.5 8.3 0 1.7.5 3.3 1.5 4.7L4 20l3.7-1c1.3.7 2.8 1.1 4.3 1.1 4.7 0 8.5-3.7 8.5-8.3S16.7 3.5 12 3.5z" fill="currentColor" stroke="none"/><path d="M8.7 8.9c.2-.5.4-.5.7-.5h.5c.2 0 .4 0 .6.5l.7 1.6c.1.2.1.4 0 .6l-.3.5c-.1.2-.2.4 0 .7.3.6.9 1.3 1.6 1.6.3.2.5.1.7 0l.5-.5c.2-.2.4-.2.6-.1l1.5.8c.3.1.4.2.4.4 0 .8-.8 1.5-1.5 1.5-2.7 0-6.3-3.5-6.5-6.2 0-.6.2-1 .5-1.4z" fill="#fff" stroke="none"/>',
  facebook: '<path d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.3-1.6 1.6-1.6h1.6V3.5c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.5H7.8V13h2.7v8z" fill="currentColor" stroke="none"/>',
  google: '<path d="M21.35 11.1H12v3.8h5.35c-.5 2.4-2.6 3.7-5.35 3.7a5.9 5.9 0 1 1 0-11.8c1.65 0 2.75.7 3.4 1.3l2.5-2.4A9.4 9.4 0 1 0 12 21.5c5.6 0 9.2-3.9 9.2-9.5 0-.5-.05-.9-.15-1.4z" fill="currentColor" stroke="none"/>'
};

export function uiIcon(name, size) {
  const s = size || 18;
  return '<svg class="ui-ic" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (UI[name] || "") + "</svg>";
}

/* ব্র্যান্ড মার্ক — হেডারের লণ্ঠন */
export function brandIcon(size) {
  const s = size || 22;
  return '<svg class="brand-ic" width="' + s + '" height="' + s + '" viewBox="0 0 48 48" fill="none" ' +
    'stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M24 5v6"/>' +
    '<path d="M24 11c-7 0-12 5.4-12 12.2 0 3 .9 5.7 2.5 7.8"/>' +
    '<path d="M24 11c7 0 12 5.4 12 12.2 0 3.9-1.5 7.4-4 9.8"/>' +
    '<path d="M24 16c-4 0-7 3.1-7 7 0 1.8.6 3.4 1.6 4.6"/>' +
    '<path d="M24 16c4 0 7 3.1 7 7 0 2.2-.8 4.2-2.2 5.6"/>' +
    '<path d="M24 22c-1.5 0-2.6 1.1-2.6 2.6 0 .9.3 1.7.8 2.3"/>' +
    '<path d="M26.6 24.6c0-1.5-1.1-2.6-2.6-2.6"/>' +
    '<path d="M24 28v10"/><path d="M20 38h8"/></svg>';
}
