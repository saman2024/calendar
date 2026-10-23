/* Calendar Atlas app. Calendar math runs in the browser; accounts, shared calendars and media use Supabase. */
(() => {
const DAY = 864e5;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

/* ======================= calendar systems ======================= */
const SYS = {
  gregory:            {name:"Gregorian",                 home:null,    color:"#5B7C99"},
  persian:            {name:"Persian (Solar Hijri)",     home:"fa-IR", color:"#2E8B57"},
  kurdish:            {name:"Kurdish",                   home:"ckb",   color:"#C0392B"},
  "islamic-umalqura": {name:"Islamic (Umm al-Qura)",     home:"ar-SA", color:"#1F7A4A"},
  "islamic-civil":    {name:"Islamic (lunar Hijri)",     home:"ar",    color:"#3E8E6B"},
  hebrew:             {name:"Hebrew",                    home:"he-IL", color:"#3A62B5"},
  chinese:            {name:"Chinese lunisolar",         home:"zh-CN", color:"#C2412D"},
  dangi:              {name:"Korean lunisolar (Dangi)",  home:"ko-KR", color:"#B5527A"},
  indian:             {name:"Indian national (Saka)",    home:"hi-IN", color:"#D2802A"},
  buddhist:           {name:"Thai solar (Buddhist Era)", home:"th-TH", color:"#B8862B"},
  japanese:           {name:"Japanese era",              home:"ja-JP", color:"#A23B4F"},
  roc:                {name:"Minguo (Republic of China)",home:"zh-TW", color:"#7A5BB0"},
  ethiopic:           {name:"Ethiopian",                 home:"am-ET", color:"#4C8C2B"},
  coptic:             {name:"Coptic",                    home:"ar-EG", color:"#8C6A3E"},
};
const SYS_ORDER = Object.keys(SYS);
const ERA = {ethiopic:"EC", coptic:"AM"};
const KURD_LAT = ["Xakelêwe","Gullan","Cozerdan","Pûşper","Gelawêj","Xermanan","Rezber","Gelarêzan","Sermawez","Befranbar","Rêbendan","Reşeme"];
const KURD_CKB = ["خاکەلێوە","گوڵان","جۆزەردان","پووشپەڕ","گەلاوێژ","خەرمانان","ڕەزبەر","گەڵاڕێزان","سەرماوەز","بەفرانبار","ڕێبەندان","ڕەشەمێ"];
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const arDigits = (n) => String(n).replace(/\d/g, (d) => AR_DIGITS[d]);
const CKB_WD = ["یەکشەممە","دووشەممە","سێشەممە","چوارشەممە","پێنجشەممە","هەینی","شەممە"];
const CKB_WD_SHORT = ["یەک","دوو","سێ","چوار","پێنج","هەینی","شەممە"];
const CKB_GM = ["کانوونی دووەم","شوبات","ئازار","نیسان","ئایار","حوزەیران","تەممووز","ئاب","ئەیلوول","تشرینی یەکەم","تشرینی دووەم","کانوونی یەکەم"];
const supported = (l) => { try { return Intl.DateTimeFormat.supportedLocalesOf([l]).length > 0; } catch (e) { return false; } };
const CKB_OK = supported("ckb");
function locFor(sys, want) { for (const l of [want, SYS[sys] && SYS[sys].home, "en-US"]) if (l && supported(l)) return l; return "en-US"; }

/* ======================= countries ======================= */
const COUNTRIES = [
  {id:"KRD", name:"Kurdistan Region (Iraq)", loc:"ckb-IQ", tz:["Asia/Baghdad"], wk:6, cals:["gregory","kurdish","islamic-civil"],
   note:"Iraq's official calendar is the Gregorian calendar. The Kurdish calendar (Solar Hijri + 1321) is used for Newroz and cultural dates, and the lunar Hijri calendar for religious ones."},
  {id:"IR", name:"Iran", loc:"fa-IR", tz:["Asia/Tehran"], wk:6, cals:["persian","islamic-civil","gregory"],
   note:"Iran's official calendar is the Solar Hijri calendar; the year begins at Nowruz. Religious dates follow the lunar Hijri calendar, whose months Iran begins with a moon sighting."},
  {id:"AF", name:"Afghanistan", loc:"fa-AF", tz:["Asia/Kabul"], wk:6, cals:["persian","islamic-civil","gregory"],
   note:"Afghanistan uses both the Solar Hijri and the lunar Hijri calendars."},
  {id:"IQ", name:"Iraq", loc:"ar-IQ", tz:["Asia/Baghdad"], wk:6, cals:["gregory","islamic-civil"], note:"Gregorian for civil life, lunar Hijri for religious dates."},
  {id:"SA", name:"Saudi Arabia", loc:"ar-SA", tz:["Asia/Riyadh"], wk:0, cals:["islamic-umalqura","gregory"],
   note:"The Umm al-Qura calendar is used for official purposes alongside the Gregorian calendar."},
  {id:"TR", name:"Türkiye", loc:"tr-TR", tz:["Europe/Istanbul"], wk:1, cals:["gregory","islamic-civil"], note:"Gregorian civil calendar; religious holidays follow the lunar Hijri calendar."},
  {id:"EG", name:"Egypt", loc:"ar-EG", tz:["Africa/Cairo"], wk:6, cals:["gregory","islamic-civil","coptic"], note:"Gregorian civil calendar, lunar Hijri for Islamic dates, and the Coptic calendar in the Coptic Church and farming."},
  {id:"IL", name:"Israel", loc:"he-IL", tz:["Asia/Jerusalem"], wk:0, cals:["hebrew","gregory"], note:"The Hebrew and Gregorian calendars are both official."},
  {id:"ET", name:"Ethiopia", loc:"am-ET", tz:["Africa/Addis_Ababa"], wk:1, cals:["ethiopic","gregory"],
   note:"The Ethiopian calendar is official; the year begins on Meskerem 1 (11 September). Ethiopian clock time counts hours from 6 in the morning."},
  {id:"IN", name:"India", loc:"hi-IN", tz:["Asia/Kolkata"], wk:0, cals:["gregory","indian"], note:"The Indian national (Saka) calendar is official alongside the Gregorian calendar."},
  {id:"PK", name:"Pakistan", loc:"ur-PK", tz:["Asia/Karachi"], wk:1, cals:["gregory","islamic-civil"], note:"Gregorian civil calendar; lunar Hijri for religious dates."},
  {id:"CN", name:"China", loc:"zh-CN", tz:["Asia/Shanghai"], wk:1, cals:["gregory","chinese"], note:"Gregorian civil calendar; the Chinese lunisolar calendar sets the Spring Festival and other traditional holidays."},
  {id:"TW", name:"Taiwan", loc:"zh-TW", tz:["Asia/Taipei"], wk:0, cals:["roc","gregory","chinese"], note:"Years are counted in the Minguo era (from 1912); traditional holidays follow the lunisolar calendar."},
  {id:"JP", name:"Japan", loc:"ja-JP", tz:["Asia/Tokyo"], wk:0, cals:["gregory","japanese"], note:"Gregorian months with years also counted by imperial era (Reiwa since 2019)."},
  {id:"KR", name:"South Korea", loc:"ko-KR", tz:["Asia/Seoul"], wk:0, cals:["gregory","dangi"], note:"Gregorian civil calendar; Seollal and Chuseok follow the Korean lunisolar calendar."},
  {id:"VN", name:"Vietnam", loc:"vi-VN", tz:["Asia/Ho_Chi_Minh"], wk:1, cals:["gregory","chinese"], note:"Tết follows the Vietnamese lunar calendar, computed for UTC+7; it occasionally differs by a day from the Chinese calendar shown here."},
  {id:"TH", name:"Thailand", loc:"th-TH", tz:["Asia/Bangkok"], wk:0, cals:["buddhist","gregory"], note:"Thai solar calendar: Gregorian months, years counted in the Buddhist Era (543 years ahead)."},
  {id:"ID", name:"Indonesia", loc:"id-ID", tz:["Asia/Jakarta"], wk:1, cals:["gregory","islamic-civil"], note:"Gregorian civil calendar; lunar Hijri for religious dates."},
  {id:"RU", name:"Russia", loc:"ru-RU", tz:["Europe/Moscow"], wk:1, cals:["gregory"], note:"Gregorian civil calendar; the Orthodox Church keeps Christmas on 7 January."},
  {id:"DE", name:"Germany", loc:"de-DE", tz:["Europe/Berlin"], wk:1, cals:["gregory"], note:"Gregorian calendar; weeks start on Monday."},
  {id:"FR", name:"France", loc:"fr-FR", tz:["Europe/Paris"], wk:1, cals:["gregory"], note:"Gregorian calendar; weeks start on Monday."},
  {id:"GB", name:"United Kingdom", loc:"en-GB", tz:["Europe/London"], wk:1, cals:["gregory"], note:"Gregorian calendar."},
  {id:"US", name:"United States", loc:"en-US", tz:["America/New_York","America/Chicago","America/Denver","America/Phoenix","America/Los_Angeles","America/Anchorage","Pacific/Honolulu"], wk:0, cals:["gregory"], note:"Gregorian calendar; weeks start on Sunday."},
  {id:"MX", name:"Mexico", loc:"es-MX", tz:["America/Mexico_City"], wk:0, cals:["gregory"], note:"Gregorian calendar."},
  {id:"BR", name:"Brazil", loc:"pt-BR", tz:["America/Sao_Paulo"], wk:0, cals:["gregory"], note:"Gregorian calendar."},
  {id:"NG", name:"Nigeria", loc:"en-NG", tz:["Africa/Lagos"], wk:1, cals:["gregory","islamic-civil"], note:"Gregorian civil calendar; lunar Hijri for Islamic holidays."},
  {id:"KE", name:"Kenya", loc:"sw-KE", tz:["Africa/Nairobi"], wk:1, cals:["gregory"], note:"Gregorian calendar."},
];
const byId = Object.fromEntries(COUNTRIES.map((c) => [c.id, c]));

/* ======================= observances (computed) ======================= */
const ISLAMIC = [[1,1,"Islamic New Year"],[1,10,"Ashura"],[3,12,"Mawlid an-Nabi (12 Rabi I)"],[9,1,"Ramadan begins"],[10,1,"Eid al-Fitr"],[12,10,"Eid al-Adha"]];
const HOL = {
  persian: [[1,1,"Nowruz"],[1,2,"Nowruz holiday"],[1,3,"Nowruz holiday"],[1,4,"Nowruz holiday"],[1,13,"Sizdah Be-dar"],[9,30,"Shab-e Yalda (evening)"]],
  kurdish: [[1,1,"Newroz"]],
  "islamic-civil": ISLAMIC, "islamic-umalqura": ISLAMIC,
  hebrew: [["Tishri",1,"Rosh Hashanah"],["Tishri",2,"Rosh Hashanah"],["Tishri",10,"Yom Kippur"],["Tishri",15,"Sukkot"],["Kislev",25,"Hanukkah begins"],["Nisan",15,"Passover"],["Sivan",6,"Shavuot"]],
  chinese: [["1",1,"Spring Festival"],["1",15,"Lantern Festival"],["5",5,"Dragon Boat Festival"],["8",15,"Mid-Autumn Festival"]],
  dangi: [["1",1,"Seollal"],["8",15,"Chuseok"]],
  ethiopic: [[1,1,"Enkutatash (New Year)"],[1,17,"Meskel"],[4,29,"Genna (Christmas)"]],
  coptic: [[1,1,"Nayrouz (Coptic New Year)"]],
  indian: [[1,1,"Chaitra 1 (Saka New Year)"]],
};
const GREG_HOL = [
  [1,1,"New Year's Day","*"],[7,4,"Independence Day","US"],[7,14,"Bastille Day","FR"],[9,16,"Independence Day","MX"],[9,7,"Independence Day","BR"],
  [1,26,"Republic Day","IN"],[8,15,"Independence Day","IN"],[10,29,"Republic Day","TR"],[10,3,"German Unity Day","DE"],[10,1,"National Day","CN"],
  [10,10,"National Day","TW"],[4,13,"Songkran","TH"],[1,7,"Orthodox and Coptic Christmas","RU EG"],[3,21,"Newroz","KRD"],
  [12,25,"Christmas Day","US GB DE FR MX BR NG KE"],
];

/* ======================= date helpers ======================= */
const fmtCache = new Map();
function F(loc, opts) {
  const k = loc + "|" + JSON.stringify(opts);
  let f = fmtCache.get(k);
  if (!f) {
    try { f = new Intl.DateTimeFormat(loc, opts); } catch (e) { f = new Intl.DateTimeFormat("en-US", opts); }
    fmtCache.set(k, f);
  }
  return f;
}
const U = {timeZone: "UTC"};
const keyToDate = (k) => { const [y, m, d] = k.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d, 12)); };
const dateToKey = (dt) => dt.toISOString().slice(0, 10);
const addDays = (dt, n) => new Date(dt.getTime() + n * DAY);
const todayKey = (tz) => F("en-CA", {timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit"}).format(new Date());
const icu = (sys) => (sys === "kurdish" ? "persian" : sys);
const cal = (loc, sys) => loc + "-u-ca-" + icu(sys);

function parts(sys, dt) {
  const o = {};
  for (const p of F(cal("en-US", sys), {...U, year: "numeric", month: "numeric", day: "numeric"}).formatToParts(dt)) o[p.type] = p.value;
  let y = +(o.year || o.relatedYear);
  if (sys === "kurdish") y += 1321;
  return {y, m: o.month, d: +o.day};
}
function lunarParts(sys, dt) {
  const o = {};
  for (const p of F(cal("en-US", sys), {...U, year: "numeric", month: "long", day: "numeric"}).formatToParts(dt)) o[p.type] = p.value;
  const month = (o.month || "").replace(/^(.*)bis$/, "Leap $1");
  return {month, d: +o.day, ry: o.relatedYear, yn: o.yearName};
}
const ckbWeekday = (dt) => (CKB_OK ? F("ckb", {...U, weekday: "long"}).format(dt) : CKB_WD[dt.getUTCDay()]);
const wdEn = (dt) => F("en-US", {...U, weekday: "long"}).format(dt);
const dropEra = (s) => s.replace(/\s?ERA\d/g, "");

function englishDate(sys, dt) {
  if (sys === "kurdish") { const p = parts(sys, dt); return `${wdEn(dt)}, ${p.d} ${KURD_LAT[+p.m - 1]} ${p.y}`; }
  if (sys === "chinese" || sys === "dangi") { const p = lunarParts(sys, dt); return `${wdEn(dt)}, day ${p.d} of the ${p.month}, ${p.yn} year (${p.ry})`; }
  const s = F(cal("en-US", sys), {...U, dateStyle: "full"}).format(dt);
  return ERA[sys] ? s.replace(/ERA\d/, ERA[sys]) : s;
}
function localDate(sys, dt, loc) {
  if (sys === "kurdish") {
    const p = parts(sys, dt);
    return `${ckbWeekday(dt)}، ${arDigits(p.d)}ی ${KURD_CKB[+p.m - 1]}ی ${arDigits(p.y)}`;
  }
  const want = loc || SYS[sys].home || "en-US";
  if (sys === "gregory" && /^ckb/.test(want) && !CKB_OK) { const p = parts("gregory", dt); return `${ckbWeekday(dt)}، ${arDigits(p.d)}ی ${CKB_GM[+p.m - 1]}ی ${arDigits(p.y)}`; }
  return dropEra(F(cal(locFor(sys, want), sys), {...U, dateStyle: "full"}).format(dt));
}
function shortDate(sys, dt) {
  if (sys === "kurdish") { const p = parts(sys, dt); return `${p.d} ${KURD_LAT[+p.m - 1]}`; }
  if (sys === "chinese" || sys === "dangi") { const p = parts(sys, dt); return `${String(p.m).replace("bis", "L")}/${p.d}`; }
  return dropEra(F(cal("en-US", sys), {...U, month: "short", day: "numeric"}).format(dt));
}
function monthLabel(sys, dt) {
  if (sys === "kurdish") { const p = parts(sys, dt); return `${KURD_LAT[+p.m - 1]} ${p.y}`; }
  if (sys === "chinese" || sys === "dangi") { const p = lunarParts(sys, dt); return `${p.month}, ${p.yn} year (${p.ry})`; }
  const s = F(cal("en-US", sys), {...U, month: "long", year: "numeric"}).format(dt);
  return ERA[sys] ? s.replace(/ERA\d/, ERA[sys]) : s;
}
function monthLabelLocal(sys, dt, loc) {
  if (sys === "kurdish") { const p = parts(sys, dt); return `${KURD_CKB[+p.m - 1]}ی ${arDigits(p.y)}`; }
  const want = loc || SYS[sys].home || "en-US";
  if (sys === "gregory" && /^ckb/.test(want) && !CKB_OK) { const p = parts("gregory", dt); return `${CKB_GM[+p.m - 1]}ی ${arDigits(p.y)}`; }
  return dropEra(F(cal(locFor(sys, want), sys), {...U, month: "long", year: "numeric"}).format(dt));
}
function monthStart(sys, dt) { let x = dt; for (let i = 0; i < 40 && parts(sys, x).d !== 1; i++) x = addDays(x, -1); return x; }
function monthNext(sys, start) { let x = addDays(start, 25); for (let i = 0; i < 40 && parts(sys, x).d !== 1; i++) x = addDays(x, 1); return x; }

/* ---- personal calendars ----
   A personal calendar counts months and years by a BASE calendar (Gregorian, Hijri, Hebrew, ...).
   Day 1 is any date. Each personal month begins on the same day of the base calendar's month as
   Day 1 (or that month's last day, if it is shorter). A new personal year begins when the base
   calendar reaches Day 1's month again, so a Hijri-based year is a lunar year. */
const BASE_EXCLUDE = new Set(["japanese"]);            // era years restart, so "year N" is ambiguous
function normId(sys, m) { m = String(m).replace(/bis$/, ""); return sys === "hebrew" && m === "6" ? "7" : m; }
function monthNameOnly(sys, dt) {
  if (sys === "kurdish") return KURD_LAT[+parts(sys, dt).m - 1];
  if (sys === "chinese" || sys === "dangi") return lunarParts(sys, dt).month;
  return F(cal("en-US", sys), {...U, month: "long"}).format(dt);
}
const monthCache = new Map();
function cMonths(c, until) {
  const base = c.base && SYS[c.base] && !BASE_EXCLUDE.has(c.base) ? c.base : "gregory";
  const key = c.id + "|" + c.start + "|" + base;
  let st = monthCache.get(key);
  if (!st) {
    const ep = keyToDate(c.start), bs = monthStart(base, ep);
    st = {base, d0: Math.round((ep - bs) / DAY) + 1, id0: normId(base, parts(base, ep).m),
          list: [{start: ep, year: 1, month: 1}], bcur: bs, yearAt: 0};
    monthCache.set(key, st);
  }
  while (st.list[st.list.length - 1].start <= until) {
    const bnext = monthNext(st.base, st.bcur), bafter = monthNext(st.base, bnext);
    const len = Math.round((bafter - bnext) / DAY);
    const prev = st.list[st.list.length - 1];
    let year = prev.year, month = prev.month + 1;
    if (normId(st.base, parts(st.base, bnext).m) === st.id0 && st.list.length - st.yearAt >= 11) { year++; month = 1; st.yearAt = st.list.length; }
    st.list.push({start: addDays(bnext, Math.min(st.d0, len) - 1), year, month});
    st.bcur = bnext;
  }
  return st.list;
}
function cInfo(c, dt) {
  const ep = keyToDate(c.start);
  if (dt < ep) return null;
  const L = cMonths(c, dt);
  let lo = 0, hi = L.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (L[mid].start <= dt) lo = mid; else hi = mid - 1; }
  const m = L[lo];
  return {n: lo, year: m.year, month: m.month, day: Math.round((dt - m.start) / DAY) + 1,
          total: Math.round((dt - ep) / DAY) + 1, start: m.start, next: L[lo + 1].start};
}
const hmsToSec = (t) => { const [h = 0, m = 0, x = 0] = String(t || "0:0:0").split(":").map(Number); return (h * 3600 + m * 60 + (x || 0)) % 86400; };
const secToHms = (n) => [Math.floor(n / 3600), Math.floor(n / 60) % 60, n % 60].map((v) => String(v).padStart(2, "0")).join(":");
function wall(tz, now) {
  const o = {};
  for (const p of F("en-CA", {timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"}).formatToParts(now)) o[p.type] = p.value;
  return {key: `${o.year}-${o.month}-${o.day}`, sec: (+o.hour % 24) * 3600 + (+o.minute) * 60 + (+o.second)};
}
/* The personal calendar's own "now": its days begin at its start time, on the wall clock of its time zone. */
function cNow(c, now = new Date()) {
  const tz = c.tz || S.tz, w = wall(tz, now), off = hmsToSec(c.time);
  let key = w.key, sec = w.sec - off;
  if (sec < 0) { sec += 86400; key = dateToKey(addDays(keyToDate(key), -1)); }
  return {key, sec, tz};
}
function cNowText(c) {
  const n = cNow(c), t = cText(c, keyToDate(n.key));
  return cInfo(c, keyToDate(n.key)) ? `${t.main} · ${secToHms(n.sec)}` : `${t.main}`;
}
const baseOf = (c) => (c.base && SYS[c.base] && !BASE_EXCLUDE.has(c.base) ? c.base : "gregory");
/* All months of base-calendar year y: [{id, label, start, len}] (used to enter Day 1). */
function baseYearMonths(sys, y) {
  const today = keyToDate(dateToKey(new Date()));
  const yl = /islamic/.test(sys) ? 354.367 : 365.2425;
  let g = addDays(today, Math.round((y - parts(sys, today).y) * yl));
  for (let i = 0; i < 40 && parts(sys, g).y !== y; i++) g = addDays(g, parts(sys, g).y < y ? 20 : -20);
  if (parts(sys, g).y !== y) return [];
  let s0 = monthStart(sys, g);
  for (let i = 0; i < 14; i++) { const p = monthStart(sys, addDays(s0, -1)); if (parts(sys, p).y !== y) break; s0 = p; }
  const out = [];
  while (parts(sys, s0).y === y && out.length < 14) {
    const n = monthNext(sys, s0);
    out.push({id: String(parts(sys, s0).m), label: monthNameOnly(sys, s0), start: s0, len: Math.round((n - s0) / DAY)});
    s0 = n;
  }
  return out;
}
const cMonthName = (c, m) => (c.months && c.months[m - 1]) ? `${c.months[m - 1]} (${m})` : `Month ${m}`;
function cText(c, dt) {
  const i = cInfo(c, dt);
  if (!i) { const before = Math.round((keyToDate(c.start) - dt) / DAY); return {main: `${before.toLocaleString("en-US")} days before Day 1`, sub: ""}; }
  return {main: `Year ${i.year}, ${cMonthName(c, i.month)}, day ${i.day}`, sub: `Day ${i.total.toLocaleString("en-US")} · counted by the ${SYS[baseOf(c)].name} calendar`};
}

function observances(dt, systems, country) {
  const out = [];
  for (const sys of new Set(systems)) {
    const list = HOL[sys]; if (!list) continue;
    const p = parts(sys, dt);
    const hm = sys === "hebrew" ? F("en-US-u-ca-hebrew", {...U, month: "long"}).format(dt) : null;
    for (const [m, d, name] of list) {
      const ok = sys === "hebrew" ? (hm === m && p.d === d) : (String(p.m) === String(m) && p.d === d);
      if (ok) out.push({sys, name});
    }
  }
  const g = parts("gregory", dt);
  for (const [m, d, name, who] of GREG_HOL) {
    if (+g.m === m && g.d === d && (who === "*" || who.split(" ").includes(country))) out.push({sys: "gregory", name});
  }
  const seen = new Set();
  return out.filter((o) => (seen.has(o.name) ? false : seen.add(o.name)));
}

/* ======================= Supabase ======================= */
const SUPABASE_URL = "https://omtxlxtjzfdlytsqveom.supabase.co";
const SUPABASE_KEY = "sb_publishable_emTiO5xEhMj86umJh3K3rg_sJ3tfeii";   // public key; the database rules protect the data
const sb = window.supabase && window.supabase.createClient
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {auth: {persistSession: true, autoRefreshToken: true, detectSessionInUrl: true}})
  : null;
const MAX_FILE = 50 * 1024 * 1024;
const ALLOWED = /^(image\/(jpeg|png|webp|gif)|video\/(mp4|webm|quicktime)|application\/pdf)$/;

/* ======================= state ======================= */
const store = {
  get(k, f) { try { const v = localStorage.getItem("atlas:" + k); return v == null ? f : JSON.parse(v); } catch (e) { return f; } },
  set(k, v) { try { if (v == null) localStorage.removeItem("atlas:" + k); else localStorage.setItem("atlas:" + k, JSON.stringify(v)); } catch (e) {} },
};
const S = {
  country: store.get("country", "KRD"),
  tz: null, view: null, anchor: null, selected: null,
  events: [], cals: [],
  me: null, email: "", myName: "", names: {}, people: {},
  status: "signedout",
};
if (!byId[S.country]) S.country = "KRD";
const C = () => byId[S.country];
S.tz = store.get("tz:" + S.country, C().tz[0]);
S.view = store.get("view", C().cals[0]);
S.selected = todayKey(S.tz);
S.anchor = S.selected;

const ROLE_TEXT = {owner: "Owner", editor: "Editor", contributor: "Contributor", viewer: "Viewer"};
const calById = (id) => S.cals.find((x) => x.id === id);
const canAdd = (k) => !!k && ["owner", "editor", "contributor"].includes(k.role);
const canManage = (k) => !!k && ["owner", "editor"].includes(k.role);
const canEditEvent = (e) => { const k = calById(e.calId); return !!k && ((e.by === S.me && canAdd(k)) || canManage(k)); };

function viewName(v) { if (v.startsWith("custom:")) { const c = customOf(v); return c ? c.name : "Personal"; } return SYS[v] ? SYS[v].name : v; }
function vv() { const v = S.view || ""; if (v.startsWith("custom:")) return customOf(v) ? v : C().cals[0]; return SYS[v] ? v : C().cals[0]; }
function customOf(v) { return (v || "").startsWith("custom:") ? S.cals.find((x) => "custom:" + x.id === v) : null; }
function colorOf(tag) { const c = customOf(tag || ""); return c ? c.color : (SYS[tag] ? SYS[tag].color : "var(--accent)"); }
/* On a personal calendar's own view, show only its events; elsewhere show events from all your calendars. */
function visibleEvents() { const k = customOf(vv()); return k ? S.events.filter((e) => e.calId === k.id) : S.events; }

const fromRow = (r, roles) => ({id: r.id, name: r.name, base: r.base, start: r.start_date, time: r.start_time, tz: r.tz,
  months: r.month_names || [], color: r.color, owner: r.owner, role: r.owner === S.me ? "owner" : (roles[r.id] || "viewer")});
const evFromRow = (r) => ({id: r.id, calId: r.calendar_id, cal: "custom:" + r.calendar_id, date: r.day, time: r.time || "",
  title: r.title, note: r.note, media: Array.isArray(r.media) ? r.media : [], by: r.created_by, at: Date.parse(r.created_at) || 0});

/* ======================= render: top + today ======================= */
const COLORS = ["#C0392B", "#D2802A", "#2E8B57", "#1D6A9E", "#7A5BB0", "#B5527A"];

function renderCountryPicker() {
  $("country").innerHTML = COUNTRIES.map((c) => `<option value="${c.id}"${c.id === S.country ? " selected" : ""}>${esc(c.name)}</option>`).join("");
  const tzs = C().tz;
  $("tzwrap").hidden = tzs.length < 2;
  $("tz").innerHTML = tzs.map((t) => `<option value="${t}"${t === S.tz ? " selected" : ""}>${esc(t.replace(/_/g, " ").split("/").pop())}</option>`).join("");
}

function renderToday() {
  const c = C(), dt = keyToDate(todayKey(S.tz));
  $("todayh").textContent = `Today in ${c.name}`;
  const cards = c.cals.map((sys) => `
    <div class="card">
      <div class="eyebrow"><span class="swatch" style="background:${SYS[sys].color}"></span>${esc(SYS[sys].name)}</div>
      <div class="en">${esc(englishDate(sys, dt))}</div>
      <div class="lc local" lang="${esc(sys === "kurdish" ? "ckb" : c.loc)}" dir="auto">${esc(localDate(sys, dt, c.loc))}</div>
    </div>`);
  for (const k of S.cals) {
    const t = cText(k, keyToDate(cNow(k).key));
    cards.push(`<div class="card custom">
      <div class="eyebrow"><span class="swatch" style="background:${esc(k.color)}"></span>${esc(k.name)}</div>
      <div class="en clockline" data-cnow="${esc(k.id)}">${esc(cNowText(k))}</div>
      <div class="xtra mono">${esc(t.sub)}</div>
      <div class="xtra">${esc((k.tz || S.tz).replace(/_/g, " "))} · days begin at ${esc(k.time || "00:00:00")}</div>
    </div>`);
  }
  $("cards").innerHTML = cards.join("");
  $("countrynote").textContent = c.note;
  renderClock();
}

function renderClock() {
  const c = C(), now = new Date();
  $("clock").textContent = F("en-US", {timeZone: S.tz, hour: "numeric", minute: "2-digit", second: "2-digit"}).format(now);
  let local;
  if (/^ckb/.test(c.loc) && !CKB_OK) {
    const wd = CKB_WD[["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].indexOf(F("en-US", {timeZone: S.tz, weekday: "short"}).format(now))];
    local = `${wd} ${arDigits(F("en-GB", {timeZone: S.tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23"}).format(now))}`;
  } else local = F(locFor("gregory", c.loc), {timeZone: S.tz, hour: "numeric", minute: "2-digit", weekday: "long"}).format(now);
  if (c.id === "ET") {
    const h = +F("en-GB", {timeZone: S.tz, hour: "2-digit", hourCycle: "h23"}).format(now);
    const m = F("en-GB", {timeZone: S.tz, minute: "2-digit"}).format(now).padStart(2, "0");
    const eh = ((h + 6) % 12) || 12;
    local += ` · Ethiopian time ${eh}:${m} ${h >= 6 && h < 18 ? "(day)" : "(night)"}`;
  }
  $("clocklocal").textContent = local;
  $("clocklocal").lang = c.loc;
  $("clocktz").textContent = S.tz.replace(/_/g, " ");
  document.querySelectorAll("[data-cnow]").forEach((el) => { const k = calById(el.dataset.cnow); if (k) el.textContent = (el.id === "mnow" ? "Now: " : "") + cNowText(k); });
}

/* ======================= render: month ======================= */
function renderViews() {
  const c = C();
  const main = [...new Set([...c.cals, "gregory"])];
  let h = main.map((s) => `<button type="button" data-v="${s}" aria-pressed="${S.view === s}">${esc(SYS[s].name)}</button>`).join("");
  h += S.cals.map((k) => `<button type="button" data-v="custom:${esc(k.id)}" aria-pressed="${S.view === "custom:" + k.id}"><span class="swatch" style="background:${esc(k.color)}"></span>${esc(k.name)}</button>`).join("");
  const others = SYS_ORDER.filter((s) => !main.includes(s));
  h += `<select id="moresys" aria-label="Other calendars"><option value="">Other calendars…</option>${others.map((s) => `<option value="${s}"${S.view === s ? " selected" : ""}>${esc(SYS[s].name)}</option>`).join("")}</select>`;
  $("views").innerHTML = h;
}

function monthRange() {
  const V = vv(), a = keyToDate(S.anchor), k = customOf(V);
  if (k) {
    const i = cInfo(k, a) || cInfo(k, keyToDate(k.start));
    return {start: i.start, next: i.next, custom: k, info: i};
  }
  const s = monthStart(V, a);
  return {start: s, next: monthNext(V, s)};
}

const RTL = /^(fa|ar|he|ckb|ur|ps)/;
function renderMonth() {
  const V = vv();
  const c = C(), r = monthRange(), today = r.custom ? cNow(r.custom).key : todayKey(S.tz);
  $("mnow").hidden = !r.custom;
  if (r.custom) { $("mnow").dataset.cnow = r.custom.id; $("mnow").textContent = "Now: " + cNowText(r.custom); } else delete $("mnow").dataset.cnow;
  const secSys = V === "gregory" ? (c.cals.find((s) => s !== "gregory") || null) : "gregory";
  if (r.custom) {
    $("mlabel").textContent = `${r.custom.name}: ${cMonthName(r.custom, r.info.month)}, year ${r.info.year}`;
    $("mlabellocal").textContent = `${F("en-US", {...U, day: "numeric", month: "short", year: "numeric"}).format(r.start)} – ${F("en-US", {...U, day: "numeric", month: "short", year: "numeric"}).format(addDays(r.next, -1))}`;
    $("mlabellocal").lang = "en";
  } else {
    $("mlabel").textContent = monthLabel(V, r.start);
    const homeLoc = c.cals.includes(V) ? c.loc : null;
    $("mlabellocal").textContent = monthLabelLocal(V, r.start, homeLoc);
    $("mlabellocal").lang = V === "kurdish" ? "ckb" : (homeLoc || SYS[V].home || "en");
  }
  $("prev").disabled = !!(r.custom && r.info.n === 0);
  $("prevy").disabled = !!(r.custom && r.info.year === 1);
  const rtl = !r.custom && RTL.test(V === "gregory" ? c.loc : (c.cals.includes(V) ? c.loc : (SYS[V].home || "")));
  $("wdays").classList.toggle("rtl", rtl); $("days").classList.toggle("rtl", rtl);

  const base = keyToDate("2026-10-18");   // a Sunday
  const wloc = r.custom ? "en-US" : (V === "kurdish" ? "ckb" : c.loc);
  $("wdays").innerHTML = Array.from({length: 7}, (_, i) => {
    const d = addDays(base, (c.wk + i) % 7);
    const en = F("en-US", {...U, weekday: "short"}).format(d);
    const lc = /^ckb/.test(wloc) ? CKB_WD_SHORT[d.getUTCDay()] : F(locFor("gregory", wloc), {...U, weekday: "narrow"}).format(d);
    return `<div class="wd"><span>${en}</span>${wloc.startsWith("en") ? "" : `<span class="lc local">${esc(lc)}</span>`}</div>`;
  }).join("");

  const lead = (r.start.getUTCDay() - c.wk + 7) % 7;
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(`<div class="cell pad" aria-hidden="true"></div>`);
  const sysForObs = [...new Set([...c.cals, ...(r.custom ? [] : [V])])];
  const evAll = visibleEvents();
  for (let d = r.start; d < r.next; d = addDays(d, 1)) {
    const key = dateToKey(d);
    const n = r.custom ? cInfo(r.custom, d).day : parts(V, d).d;
    const sec = secSys ? shortDate(secSys, d) : "";
    const obs = observances(d, sysForObs, c.id);
    const evs = evAll.filter((e) => e.date === key);
    const img = evs.flatMap((e) => e.media || []).find((m) => (m.type || "").startsWith("image/"));
    const thumb = img ? mediaUrl(img.path) : "";
    const dots = evs.slice(0, 4).map((e) => `<span class="ev" style="background:${esc(colorOf(e.cal))}"></span>`).join("") + (evs.length > 4 ? `<span class="more">+${evs.length - 4}</span>` : "");
    const label = `${englishDate(r.custom ? "gregory" : V, d)}${obs.length ? ". " + obs.map((o) => o.name).join(", ") : ""}${evs.length ? `. ${evs.length} entr${evs.length === 1 ? "y" : "ies"}` : ""}`;
    cells.push(`<button type="button" class="cell${key === today ? " today" : ""}${obs.length ? " obs" : ""}" data-k="${key}" aria-pressed="${key === S.selected}" aria-label="${esc(label)}" title="${esc(obs.map((o) => o.name).join(" · "))}">
      <span class="n">${n}</span><span class="s">${esc(sec)}</span>
      <span class="marks">${thumb ? `<img class="thumb" alt="" src="${esc(thumb)}" loading="lazy">` : ""}${dots}</span>
    </button>`);
  }
  $("days").innerHTML = cells.join("");
}

/* ======================= render: day ======================= */
function renderDay() {
  const V = vv();
  const c = C(), dt = keyToDate(S.selected), k = customOf(V);
  const sys = k ? "gregory" : V;
  $("dayeyebrow").textContent = S.selected === todayKey(S.tz) ? "Today" : "Selected day";
  $("dayen").textContent = k ? `${cText(k, dt).main} · ${englishDate("gregory", dt)}` : englishDate(sys, dt);
  const homeLoc = c.cals.includes(sys) ? c.loc : null;
  $("daylc").textContent = localDate(sys, dt, homeLoc);
  $("daylc").lang = sys === "kurdish" ? "ckb" : (homeLoc || SYS[sys].home || c.loc);

  const obs = observances(dt, [...new Set([...c.cals, sys])], c.id);
  $("dayobs").innerHTML = obs.map((o) => `<span class="obs-tag"><b>${esc(SYS[o.sys].name)}</b> · ${esc(o.name)}</span>`).join("");

  const evs = visibleEvents().filter((e) => e.date === S.selected).sort((a, b) => (a.time || "99").localeCompare(b.time || "99") || a.at - b.at);
  const writable = S.cals.filter(canAdd);
  $("dayevents").innerHTML = evs.length ? evs.map(eventHTML).join("") :
    `<div class="empty">${S.me ? (writable.length ? "Nothing on this day yet. Add an appointment, a memory, or photos and videos below. Only the people on that calendar will see it." : "Nothing on this day yet.") : "Sign in to add events, photos and videos to your own calendars."}</div>`;

  const rows = SYS_ORDER.map((s) => `<div class="every-row"><span><span class="swatch" style="background:${SYS[s].color}"></span>${esc(SYS[s].name)}</span><span>${esc(englishDate(s, dt))}</span><span class="lc local" dir="auto" lang="${esc(s === "kurdish" ? "ckb" : (SYS[s].home || c.loc))}">${esc(localDate(s, dt, s === "gregory" ? c.loc : null))}</span></div>`);
  for (const kk of S.cals) { const t = cText(kk, dt); rows.push(`<div class="every-row"><span><span class="swatch" style="background:${esc(kk.color)}"></span>${esc(kk.name)}</span><span>${esc(t.main)}</span><span class="mono" style="font-size:12px">${esc(t.sub)}</span></div>`); }
  $("every").innerHTML = rows.join("");

  // the add form: only calendars you may add to
  const cur = $("ev-cal").value || (k && canAdd(k) ? k.id : "");
  $("ev-cal").innerHTML = writable.map((x) => `<option value="${esc(x.id)}"${x.id === cur ? " selected" : ""}>${esc(x.name)}${x.role === "owner" ? "" : " (shared)"}</option>`).join("");
  if (k && canAdd(k)) $("ev-cal").value = k.id;
  $("addform").hidden = !S.me || !writable.length;
  $("addhint").hidden = !S.me || !!writable.length;
}

function mediaHTML(m) {
  const u = mediaUrl(m.path), t = m.type || "";
  if (!u) return `<span class="ph" aria-label="Loading ${esc(m.name || "file")}"></span>`;
  if (t.startsWith("image/")) return `<button type="button" data-open="${esc(m.path)}" data-type="${esc(t)}" aria-label="Open ${esc(m.name || "photo")}"><img src="${esc(u)}" alt="${esc(m.name || "")}" loading="lazy"></button>`;
  if (t.startsWith("video/")) return `<button type="button" data-open="${esc(m.path)}" data-type="${esc(t)}" aria-label="Play ${esc(m.name || "video")}"><video src="${esc(u)}#t=0.1" muted playsinline preload="metadata"></video></button>`;
  return `<a class="file" href="${esc(u)}" target="_blank" rel="noopener">${esc(m.name || "File")}</a>`;
}
function eventHTML(e) {
  const k = calById(e.calId), edit = canEditEvent(e);
  const who = e.by ? (e.by === S.me ? "Added by you" : (S.names[e.by] ? `Added by ${S.names[e.by]}` : "")) : "";
  return `<article class="event" style="--c:${esc(colorOf(e.cal))}" data-id="${esc(e.id)}">
    <div class="row1">${e.time ? `<span class="time">${esc(e.time)}</span>` : ""}<span class="title">${esc(e.title || "Untitled")}</span></div>
    <div class="meta">${esc(k ? k.name : "Calendar")}${who ? " · " + esc(who) : ""}</div>
    ${e.note ? `<div class="body">${esc(e.note)}</div>` : ""}
    ${e.media.length ? `<div class="media">${e.media.map(mediaHTML).join("")}</div>` : ""}
    ${edit ? `<div class="acts">
      <label class="btn ghost" style="display:inline-block">Add photos or videos<input type="file" hidden multiple data-addmedia="${esc(e.id)}" accept="image/*,video/*,application/pdf"></label>
      <button type="button" class="btn ghost danger" data-del="${esc(e.id)}">Delete</button>
    </div>` : ""}
  </article>`;
}

/* ======================= render: personal calendars ======================= */
function renderCustoms() {
  $("custsignin").hidden = !!S.me;
  $("calform").hidden = !S.me;
  if (!S.me) { $("clist").innerHTML = ""; return; }
  $("clist").innerHTML = S.cals.length ? S.cals.map((k) => {
    const t = cText(k, keyToDate(cNow(k).key));
    const ppl = (S.people[k.id] || []).length;
    const owner = k.role === "owner";
    const sharedNote = owner ? (ppl > 1 ? `Shared with ${ppl - 1} ${ppl - 1 === 1 ? "person" : "people"}` : "Only you") :
      `Shared with you by ${esc(S.names[k.owner] || "its owner")} · you are ${ROLE_TEXT[k.role].toLowerCase()}`;
    return `<div class="card custom" data-cid="${esc(k.id)}">
      <div class="eyebrow"><span class="swatch" style="background:${esc(k.color)}"></span>${esc(k.name)}</div>
      <div class="en clockline" data-cnow="${esc(k.id)}">${esc(cNowText(k))}</div>
      <div class="xtra">Day 1: ${esc(englishDate(baseOf(k), keyToDate(k.start)))}${baseOf(k) === "gregory" ? "" : " (" + esc(englishDate("gregory", keyToDate(k.start))) + ")"}, from ${esc(k.time || "00:00:00")} ${esc((k.tz || S.tz).replace(/_/g, " "))}</div>
      <div class="xtra mono">${esc(t.sub)}</div>
      <div class="xtra share-line"><span class="role ${owner ? "own" : ""}">${esc(ROLE_TEXT[k.role])}</span> ${sharedNote}</div>
      <div class="acts" style="display:flex;gap:6px;flex-wrap:wrap">
        <button type="button" class="btn ghost" data-showcal="${esc(k.id)}">Show</button>
        <button type="button" class="btn ${canManage(k) ? "" : "ghost"}" data-share="${esc(k.id)}">${canManage(k) ? "Share" : "People"}</button>
        ${owner ? `<button type="button" class="btn ghost danger" data-delcal="${esc(k.id)}">Delete</button>` : `<button type="button" class="btn ghost danger" data-leave="${esc(k.id)}">Leave</button>`}
      </div>
    </div>`;
  }).join("") : `<div class="empty">No personal calendars yet. Start one from a birthday, a wedding, or the day you arrived somewhere new. Then share it with the people you choose.</div>`;
}

function renderAccount() {
  $("acctbtn").textContent = S.me ? (S.myName || "Account") : "Sign in";
  $("acctbtn").classList.toggle("primary", !S.me);
}

function renderAll() { renderCountryPicker(); renderToday(); renderViews(); renderMonth(); renderDay(); renderCustoms(); renderAccount(); }

/* ======================= status + toast ======================= */
function setStatus(s) {
  if (s) S.status = s;
  const t = {signedout: "Not signed in · official calendars only", loading: "Loading your calendars…", live: "Signed in · changes sync live",
             offline: "Offline · showing your last saved copy", error: "Could not reach the server · showing your last saved copy",
             nolib: "Could not load the sign-in library; check your connection"}[S.status];
  $("statustext").textContent = t;
  $("status").classList.toggle("live", S.status === "live");
}
let toastT = null;
function toast(msg) { const el = $("toast"); el.textContent = msg; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 4500); }

/* ======================= data: load + live ======================= */
function saveCache() { if (S.me) store.set("cache:" + S.me, {cals: S.cals, events: S.events, names: S.names, people: S.people, myName: S.myName}); }

async function fetchEvents() {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const {data, error} = await sb.from("events").select("*").order("day").range(from, from + 999);
    if (error) throw error;
    out.push(...data.map(evFromRow));
    if (data.length < 1000) break;
  }
  return out;
}
let loading = null;
function fetchAll() { if (!loading) loading = doFetchAll().finally(() => { loading = null; }); return loading; }
async function doFetchAll() {
  if (!sb || !S.me) return;
  try {
    const [c, m] = await Promise.all([
      sb.from("calendars").select("*").order("created_at"),
      sb.from("calendar_members").select("calendar_id,role").eq("user_id", S.me)]);
    if (c.error) throw c.error;
    if (m.error) throw m.error;
    const roles = Object.fromEntries(m.data.map((x) => [x.calendar_id, x.role]));
    const cals = c.data.map((r) => fromRow(r, roles)).filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k.start));
    const evs = await fetchEvents();
    monthCache.clear();
    S.cals = cals; S.events = evs;
    setStatus("live");
    renderAll();
    if (S.joined) { const k = calById(S.joined); if (k) toast(`You joined “${k.name}”.`); S.joined = null; }
    await loadPeople();
    saveCache();
  } catch (err) {
    setStatus(navigator.onLine ? "error" : "offline");
  }
}
async function loadPeople() {
  await Promise.all(S.cals.map(async (k) => {
    const {data} = await sb.rpc("calendar_people", {cal: k.id});
    if (data) { S.people[k.id] = data; for (const p of data) if (p.display_name) S.names[p.user_id] = p.display_name; }
  }));
  renderCustoms(); renderDay();
}
let evTimer = null;
function reloadEventsSoon() {
  clearTimeout(evTimer);
  evTimer = setTimeout(async () => { try { S.events = await fetchEvents(); saveCache(); renderMonth(); renderDay(); } catch (e) {} }, 300);
}
let chan = null;
function setupRealtime() {
  teardownRealtime();
  chan = sb.channel("events-live").on("postgres_changes", {event: "*", schema: "public", table: "events"}, reloadEventsSoon).subscribe();
}
function teardownRealtime() { if (chan) { sb.removeChannel(chan); chan = null; } }

/* ======================= photos and videos ======================= */
/* Photos and videos are downloaded through the signed-in connection and shown from a local copy
   (a blob: address on the app's own origin), so the browser never blocks them as cross-site images. */
const urlCache = new Map(), signFailed = new Set(), signQ = new Set();
let signTimer = null;
function mediaUrl(path) {
  if (!path) return "";
  const c = urlCache.get(path);
  if (c) return c;
  if (!signFailed.has(path) && sb && S.me) { signQ.add(path); clearTimeout(signTimer); signTimer = setTimeout(flushSign, 40); }
  return "";
}
const inFlight = new Set();
async function flushSign() {
  const paths = [...signQ].filter((p) => !inFlight.has(p)); signQ.clear();
  if (!paths.length) return;
  paths.forEach((p) => inFlight.add(p));
  let n = 0;
  await Promise.all(paths.map(async (p) => {
    try {
      const {data, error} = await sb.storage.from("media").download(p);
      if (error || !data) throw error || new Error("no data");
      urlCache.set(p, URL.createObjectURL(data)); n++;
    } catch (e) { signFailed.add(p); }
    finally { inFlight.delete(p); }
  }));
  if (n) { renderMonth(); renderDay(); }
}
async function shrinkImage(f) {
  if (!/^image\/(jpeg|png|webp)$/.test(f.type) || f.size < 700e3 || typeof createImageBitmap !== "function") return f;
  try {
    const bmp = await createImageBitmap(f);
    const s = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    const cv = document.createElement("canvas");
    cv.width = Math.round(bmp.width * s); cv.height = Math.round(bmp.height * s);
    const g = cv.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(bmp, 0, 0, cv.width, cv.height);
    const b = await new Promise((r) => cv.toBlob(r, "image/jpeg", 0.82));
    if (!b || b.size >= f.size) return f;
    return new File([b], f.name.replace(/\.[^.]+$/, "") + ".jpg", {type: "image/jpeg"});
  } catch (e) { return f; }
}
async function uploadFiles(files, calId, msgEl) {
  const out = [];
  let i = 0;
  for (const f0 of files) {
    i++;
    msgEl.textContent = `Preparing ${i} of ${files.length}: ${f0.name}`;
    const f = await shrinkImage(f0);
    const type = f.type || (/\.pdf$/i.test(f.name) ? "application/pdf" : (/\.mov$/i.test(f.name) ? "video/quicktime" : ""));
    if (!ALLOWED.test(type)) throw new Error(`${f0.name} is not a supported type. Use a photo (JPG, PNG, GIF, WebP), a video (MP4, MOV, WebM) or a PDF.`);
    if (f.size > MAX_FILE) throw new Error(`${f0.name} is larger than 50 MB. Trim the video or send a shorter clip.`);
    const ext = ((f.name.match(/\.([A-Za-z0-9]{1,5})$/) || [])[1] || type.split("/")[1] || "bin").toLowerCase();
    const path = `${calId}/${crypto.randomUUID()}.${ext}`;
    msgEl.textContent = `Uploading ${i} of ${files.length}: ${f0.name}`;
    const {error} = await sb.storage.from("media").upload(path, f, {contentType: type, upsert: false});
    if (error) {
      if (out.length) await sb.storage.from("media").remove(out.map((m) => m.path));
      throw new Error(`${f0.name} could not be uploaded: ${error.message}`);
    }
    out.push({path, type, name: f0.name.slice(0, 120)});
  }
  return out;
}
function dbError(err) {
  const m = (err && err.message) || "";
  if (!navigator.onLine) return "You are offline. Try again when you are connected.";
  if (/row-level security|permission/i.test(m)) return "You do not have permission to change this calendar.";
  return m || "That could not be saved. Check your connection and try again.";
}

/* ======================= interactions: navigation ======================= */
$("country").addEventListener("change", (e) => {
  S.country = e.target.value; store.set("country", S.country);
  S.tz = store.get("tz:" + S.country, C().tz[0]);
  if (!customOf(S.view)) S.view = C().cals[0];
  store.set("view", S.view);
  S.selected = todayKey(S.tz); S.anchor = S.selected;
  calBaseOptions();
  renderAll();
});
$("tz").addEventListener("change", (e) => { S.tz = e.target.value; store.set("tz:" + S.country, S.tz); renderToday(); renderMonth(); renderDay(); });
$("views").addEventListener("click", (e) => { const b = e.target.closest("button[data-v]"); if (b) setView(b.dataset.v); });
$("views").addEventListener("change", (e) => { if (e.target.id === "moresys" && e.target.value) setView(e.target.value); });
function setView(v) { S.view = v; store.set("view", v); S.anchor = S.selected; renderViews(); renderMonth(); renderDay(); }
function yearJump(dir) {
  const V = vv(), r = monthRange();
  if (r.custom) {
    const L = cMonths(r.custom, addDays(r.next, 420));
    const ty = r.info.year + dir;
    if (ty < 1) { S.anchor = r.custom.start; renderMonth(); return; }
    const inYear = L.filter((m) => m.year === ty && L[L.length - 1] !== m);
    if (!inYear.length) return;
    const pick = inYear.find((m) => m.month === r.info.month) || inYear[inYear.length - 1];
    S.anchor = dateToKey(pick.start); renderMonth(); return;
  }
  if (V === "japanese") { S.anchor = dateToKey(addDays(r.start, dir * 365 + 10)); renderMonth(); return; }
  const p = parts(V, r.start), months = baseYearMonths(V, p.y + dir);
  if (!months.length) { S.anchor = dateToKey(addDays(r.start, Math.round(dir * (/islamic/.test(V) ? 354.4 : 365.25)) + 5)); renderMonth(); return; }
  const cur = baseYearMonths(V, p.y).findIndex((m) => dateToKey(m.start) === dateToKey(r.start));
  const pick = months.find((m) => normId(V, m.id) === normId(V, p.m)) || months[Math.min(Math.max(cur, 0), months.length - 1)];
  S.anchor = dateToKey(pick.start); renderMonth();
}
$("prevy").addEventListener("click", () => yearJump(-1));
$("nexty").addEventListener("click", () => yearJump(1));
$("prev").addEventListener("click", () => { const r = monthRange(); S.anchor = dateToKey(addDays(r.start, -1)); renderMonth(); });
$("next").addEventListener("click", () => { const r = monthRange(); S.anchor = dateToKey(r.next); renderMonth(); });
$("gotoday").addEventListener("click", () => { S.selected = todayKey(S.tz); S.anchor = S.selected; renderMonth(); renderDay(); });
$("days").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-k]"); if (!b) return;
  S.selected = b.dataset.k;
  $("days").querySelectorAll("[aria-pressed=true]").forEach((x) => x.setAttribute("aria-pressed", "false"));
  b.setAttribute("aria-pressed", "true");
  renderDay();
  if (matchMedia("(max-width:960px)").matches) $("daypanel").scrollIntoView({behavior: "smooth", block: "start"});
});
$("colors").innerHTML = COLORS.map((c, i) => `<input type="radio" name="c-color" id="c-color-${i}" value="${c}"${i === 0 ? " checked" : ""}><label for="c-color-${i}" style="background:${c}" title="${c}"></label>`).join("");

/* ======================= interactions: events ======================= */
async function addEvent() {
  const msg = $("formmsg"); msg.className = "formmsg"; msg.textContent = "";
  const calId = $("ev-cal").value, k = calById(calId);
  const files = [...($("ev-files").files || [])];
  const title = $("ev-title").value.trim(), note = $("ev-note").value.trim();
  if (!k || !canAdd(k)) { msg.className = "formmsg err"; msg.textContent = "Choose one of your calendars."; return; }
  if (!title && !files.length && !note) { msg.className = "formmsg err"; msg.textContent = "Add a title, a note, or at least one file."; return; }
  $("addbtn").disabled = true;
  let media = [];
  try {
    media = await uploadFiles(files, calId, msg);
    msg.textContent = "Saving…";
    const {data, error} = await sb.from("events").insert({calendar_id: calId, day: S.selected, time: $("ev-time").value || "",
      title: (title || (media.length ? "Photos and videos" : "Note")).slice(0, 200), note: note.slice(0, 4000), media}).select().single();
    if (error) throw error;
    if (!S.events.some((x) => x.id === data.id)) S.events.push(evFromRow(data));
    saveCache(); renderMonth(); renderDay();
    $("ev-title").value = ""; $("ev-note").value = ""; $("ev-time").value = ""; $("ev-files").value = "";
    msg.textContent = `Added to ${k.name}.`;
  } catch (err) {
    if (media.length) await sb.storage.from("media").remove(media.map((m) => m.path)).catch(() => {});
    msg.className = "formmsg err"; msg.textContent = err instanceof Error && !err.code ? err.message : dbError(err);
  } finally { $("addbtn").disabled = false; }
}
$("addform").addEventListener("submit", (e) => { e.preventDefault(); addEvent(); });
$("addbtn").addEventListener("click", (e) => { e.preventDefault(); addEvent(); });

$("dayevents").addEventListener("click", async (e) => {
  const open = e.target.closest("[data-open]");
  if (open) { openLightbox(open.dataset.open, open.dataset.type); return; }
  const del = e.target.closest("[data-del]");
  if (!del) return;
  if (del.dataset.confirm !== "1") { del.dataset.confirm = "1"; del.textContent = "Confirm delete"; setTimeout(() => { if (del.isConnected) { del.dataset.confirm = ""; del.textContent = "Delete"; } }, 4000); return; }
  const id = del.dataset.del, ev = S.events.find((x) => x.id === id);
  del.disabled = true;
  try {
    const {data, error} = await sb.from("events").delete().eq("id", id).select("id");
    if (error) throw error;
    if (!data.length) throw new Error("You do not have permission to delete this.");
    if (ev && ev.media.length) await sb.storage.from("media").remove(ev.media.map((m) => m.path));
    S.events = S.events.filter((x) => x.id !== id); saveCache(); renderMonth(); renderDay();
  } catch (err) { $("formmsg").className = "formmsg err"; $("formmsg").textContent = dbError(err); del.disabled = false; }
});
$("dayevents").addEventListener("change", async (e) => {
  const inp = e.target.closest("[data-addmedia]"); if (!inp) return;
  const id = inp.dataset.addmedia, ev = S.events.find((x) => x.id === id);
  const msg = $("formmsg"); msg.className = "formmsg";
  if (!ev) return;
  let media = [];
  try {
    media = await uploadFiles([...inp.files], ev.calId, msg);
    const all = [...ev.media, ...media];
    const {data, error} = await sb.from("events").update({media: all}).eq("id", id).select("id");
    if (error) throw error;
    if (!data.length) throw new Error("You do not have permission to change this event.");
    ev.media = all; saveCache(); renderMonth(); renderDay();
    msg.textContent = `Added ${media.length} file${media.length === 1 ? "" : "s"}.`;
  } catch (err) {
    if (media.length) await sb.storage.from("media").remove(media.map((m) => m.path)).catch(() => {});
    msg.className = "formmsg err"; msg.textContent = err instanceof Error && !err.code ? err.message : dbError(err);
  }
});

/* ======================= interactions: new calendar ======================= */
function calBaseOptions() {
  const first = [...new Set([...C().cals, "gregory", "persian", "islamic-civil"])].filter((x) => !BASE_EXCLUDE.has(x));
  const rest = SYS_ORDER.filter((x) => !first.includes(x) && !BASE_EXCLUDE.has(x));
  const cur = $("c-base").value || first[0];
  $("c-base").innerHTML = [...first, ...rest].map((x) => `<option value="${x}"${x === cur ? " selected" : ""}>${esc(SYS[x].name)}</option>`).join("");
}
let cMonthsList = [];
function fillMonths(keepId) {
  const sys = $("c-base").value, y = parseInt($("c-y").value, 10);
  cMonthsList = Number.isFinite(y) && y > 0 && y < 10000 ? baseYearMonths(sys, y) : [];
  $("c-m").innerHTML = cMonthsList.map((m, i) => `<option value="${i}"${m.id === keepId ? " selected" : ""}>${esc(m.label)}</option>`).join("");
  updatePreview();
}
function setBaseFromGregorian(dt) {
  const sys = $("c-base").value, p = parts(sys, dt);
  $("c-y").value = p.y; $("c-d").value = p.d;
  fillMonths(String(p.m));
}
function dayOneDate() {
  const m = cMonthsList[+$("c-m").value], d = parseInt($("c-d").value, 10);
  if (!m || !Number.isFinite(d) || d < 1 || d > m.len) return null;
  return addDays(m.start, d - 1);
}
function normTime(v) { const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(v || ""); return m ? `${m[1].padStart(2, "0")}:${m[2]}:${m[3] || "00"}` : "00:00:00"; }
function updatePreview() {
  const sys = $("c-base").value, dt = dayOneDate(), m = cMonthsList[+$("c-m").value];
  const el = $("c-preview");
  if (!$("c-y").value) { el.textContent = ""; return; }
  if (!cMonthsList.length) { el.textContent = "Enter a year in this calendar."; return; }
  if (!dt) { el.textContent = m ? `Enter a day from 1 to ${m.len}.` : ""; return; }
  const tm = normTime($("c-time").value), tz = ($("c-tz").value || "UTC").replace(/_/g, " ");
  el.textContent = `Day 1 begins at ${tm} (${tz}) on ${englishDate(sys, dt)}` + (sys === "gregory" ? "." : `, which is ${englishDate("gregory", dt)}.`);
  $("c-g").value = dateToKey(dt);
}
$("c-base").addEventListener("change", () => { const dt = dayOneDate() || keyToDate(todayKey(S.tz)); setBaseFromGregorian(dt); });
$("c-y").addEventListener("input", () => { const keep = (cMonthsList[+$("c-m").value] || {}).id; fillMonths(keep); });
$("c-m").addEventListener("change", updatePreview);
$("c-d").addEventListener("input", updatePreview);
$("c-g").addEventListener("change", () => { if (/^\d{4}-\d{2}-\d{2}$/.test($("c-g").value)) setBaseFromGregorian(keyToDate($("c-g").value)); });
calBaseOptions();
(() => {
  let zones = [];
  try { zones = Intl.supportedValuesOf("timeZone"); } catch (e) {}
  if (!zones.length) zones = [...new Set(COUNTRIES.flatMap((c) => c.tz))].sort();
  let mine = "UTC"; try { mine = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch (e) {}
  if (!zones.includes(mine)) zones.unshift(mine);
  if (!zones.includes("UTC")) zones.push("UTC");
  $("c-tz").innerHTML = zones.map((z) => `<option value="${esc(z)}"${z === mine ? " selected" : ""}>${esc(z.replace(/_/g, " "))}</option>`).join("");
})();
setBaseFromGregorian(keyToDate(todayKey(S.tz)));
$("c-time").addEventListener("input", updatePreview);
$("c-tz").addEventListener("change", updatePreview);

async function createCalendar() {
  const msg = $("calmsg"); msg.className = "formmsg"; msg.textContent = "";
  const name = $("c-name").value.trim(), dt = dayOneDate(), base = $("c-base").value;
  if (!S.me) { openAuth("in"); return; }
  if (!name) { msg.className = "formmsg err"; msg.textContent = "Give the calendar a name."; return; }
  if (!dt) { msg.className = "formmsg err"; msg.textContent = "Day 1 is not a valid date in that calendar. Check the year, month and day."; return; }
  const months = $("c-months").value.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 13);
  const color = (document.querySelector('input[name="c-color"]:checked') || {}).value || COLORS[0];
  $("calbtn").disabled = true;
  try {
    const {data, error} = await sb.from("calendars").insert({name: name.slice(0, 80), base, start_date: dateToKey(dt), start_time: normTime($("c-time").value),
      tz: $("c-tz").value || "UTC", month_names: months, color}).select().single();
    if (error) throw error;
    const k = fromRow(data, {});
    S.cals.push(k); S.people[k.id] = [{user_id: S.me, display_name: S.myName, role: "owner"}];
    $("c-name").value = ""; $("c-months").value = "";
    msg.textContent = `Created ${name}. Only you can see it until you share it.`;
    S.view = "custom:" + k.id; store.set("view", S.view); S.anchor = S.selected;
    saveCache(); renderAll();
  } catch (err) { msg.className = "formmsg err"; msg.textContent = dbError(err); }
  finally { $("calbtn").disabled = false; }
}
$("calform").addEventListener("submit", (e) => { e.preventDefault(); createCalendar(); });
$("calbtn").addEventListener("click", (e) => { e.preventDefault(); createCalendar(); });

function confirmClick(btn, label) {
  if (btn.dataset.confirm === "1") return true;
  const orig = btn.textContent;
  btn.dataset.confirm = "1"; btn.textContent = label;
  setTimeout(() => { if (btn.isConnected) { btn.dataset.confirm = ""; btn.textContent = orig; } }, 4000);
  return false;
}
$("clist").addEventListener("click", async (e) => {
  const show = e.target.closest("[data-showcal]");
  if (show) { setView("custom:" + show.dataset.showcal); $("views").scrollIntoView({behavior: "smooth", block: "start"}); return; }
  const sh = e.target.closest("[data-share]");
  if (sh) { openShare(sh.dataset.share); return; }
  const del = e.target.closest("[data-delcal]");
  const leave = e.target.closest("[data-leave]");
  if (!del && !leave) return;
  const btn = del || leave, id = btn.dataset.delcal || btn.dataset.leave, k = calById(id);
  if (!confirmClick(btn, del ? "Delete it and all its events?" : "Confirm leave")) return;
  btn.disabled = true;
  try {
    if (del) {
      const files = S.events.filter((x) => x.calId === id).flatMap((x) => x.media.map((m) => m.path));
      const {data, error} = await sb.from("calendars").delete().eq("id", id).select("id");
      if (error) throw error;
      if (!data.length) throw new Error("Only the owner can delete this calendar.");
      for (let i = 0; i < files.length; i += 100) await sb.storage.from("media").remove(files.slice(i, i + 100));
    } else {
      const {error} = await sb.from("calendar_members").delete().eq("calendar_id", id).eq("user_id", S.me);
      if (error) throw error;
    }
    S.cals = S.cals.filter((x) => x.id !== id); S.events = S.events.filter((x) => x.calId !== id);
    if (S.view === "custom:" + id) { S.view = C().cals[0]; store.set("view", S.view); }
    saveCache(); renderAll();
    toast(del ? `Deleted “${k ? k.name : "calendar"}”.` : `You left “${k ? k.name : "the calendar"}”.`);
  } catch (err) { $("calmsg").className = "formmsg err"; $("calmsg").textContent = dbError(err); btn.disabled = false; }
});

/* ======================= sharing ======================= */
let shareId = null;
function openShare(id) {
  const k = calById(id); if (!k) return;
  shareId = id;
  $("shareh").textContent = canManage(k) ? `Share “${k.name}”` : `People on “${k.name}”`;
  $("sh-invite").hidden = !canManage(k);
  $("sh-revoke").hidden = !canManage(k);
  $("sh-link").hidden = true; $("sh-url").value = "";
  $("sh-msg").textContent = ""; $("sh-msg").className = "formmsg";
  renderPeople();
  openModal("sharemodal");
  sb.rpc("calendar_people", {cal: id}).then(({data}) => { if (data && shareId === id) { S.people[id] = data; for (const p of data) if (p.display_name) S.names[p.user_id] = p.display_name; renderPeople(); renderCustoms(); } });
}
function renderPeople() {
  const k = calById(shareId); if (!k) return;
  const list = (S.people[k.id] || []).slice().sort((a, b) => (a.role === "owner" ? -1 : b.role === "owner" ? 1 : 0));
  $("sh-people").innerHTML = list.length ? list.map((p) => {
    const me = p.user_id === S.me, name = (p.display_name || "Someone") + (me ? " (you)" : "");
    let ctl = `<span class="role ${p.role === "owner" ? "own" : ""}">${esc(ROLE_TEXT[p.role] || p.role)}</span>`;
    if (canManage(k) && p.role !== "owner" && !me) {
      ctl = `<select data-setrole="${esc(p.user_id)}" aria-label="Role for ${esc(name)}">${["viewer", "contributor", "editor"].map((r) => `<option value="${r}"${r === p.role ? " selected" : ""}>${ROLE_TEXT[r]}</option>`).join("")}</select>
             <button type="button" class="btn ghost danger" data-remove="${esc(p.user_id)}">Remove</button>`;
    }
    return `<div class="person"><span class="pname">${esc(name)}</span><span class="pctl">${ctl}</span></div>`;
  }).join("") : `<div class="muted">Loading…</div>`;
}
$("sh-make").addEventListener("click", async () => {
  const k = calById(shareId); if (!k) return;
  const msg = $("sh-msg"); msg.className = "formmsg"; msg.textContent = "";
  $("sh-make").disabled = true;
  try {
    const {data, error} = await sb.from("invites").insert({calendar_id: k.id, role: $("sh-role").value}).select("token").single();
    if (error) throw error;
    const url = new URL(location.href); url.search = "?invite=" + data.token; url.hash = "";
    $("sh-url").value = url.toString(); $("sh-link").hidden = false;
    $("sh-send").hidden = !navigator.share;
  } catch (err) { msg.className = "formmsg err"; msg.textContent = dbError(err); }
  finally { $("sh-make").disabled = false; }
});
$("sh-copy").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText($("sh-url").value); $("sh-msg").className = "formmsg"; $("sh-msg").textContent = "Link copied."; }
  catch (e) { $("sh-url").select(); $("sh-msg").textContent = "Select the link and copy it."; }
});
$("sh-send").addEventListener("click", async () => {
  const k = calById(shareId);
  try { await navigator.share({title: "Calendar Atlas", text: `Join my calendar “${k ? k.name : ""}”`, url: $("sh-url").value}); } catch (e) {}
});
$("sh-revoke").addEventListener("click", async (e) => {
  if (!confirmClick(e.currentTarget, "Confirm: turn off unused links")) return;
  const {error} = await sb.from("invites").delete().eq("calendar_id", shareId);
  $("sh-msg").className = error ? "formmsg err" : "formmsg";
  $("sh-msg").textContent = error ? dbError(error) : "All unused invite links for this calendar are turned off.";
  $("sh-link").hidden = true;
});
$("sh-people").addEventListener("change", async (e) => {
  const sel = e.target.closest("[data-setrole]"); if (!sel) return;
  const {error} = await sb.from("calendar_members").update({role: sel.value}).eq("calendar_id", shareId).eq("user_id", sel.dataset.setrole);
  $("sh-msg").className = error ? "formmsg err" : "formmsg";
  $("sh-msg").textContent = error ? dbError(error) : "Role changed.";
  const p = (S.people[shareId] || []).find((x) => x.user_id === sel.dataset.setrole); if (p && !error) p.role = sel.value;
});
$("sh-people").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-remove]"); if (!b) return;
  if (!confirmClick(b, "Confirm remove")) return;
  const {error} = await sb.from("calendar_members").delete().eq("calendar_id", shareId).eq("user_id", b.dataset.remove);
  if (error) { $("sh-msg").className = "formmsg err"; $("sh-msg").textContent = dbError(error); return; }
  S.people[shareId] = (S.people[shareId] || []).filter((x) => x.user_id !== b.dataset.remove);
  renderPeople(); renderCustoms();
  $("sh-msg").className = "formmsg"; $("sh-msg").textContent = "Removed. They can no longer see this calendar.";
});

/* ======================= accounts ======================= */
let authMode = "in";
function openAuth(mode, note) {
  authMode = mode;
  $("au-msg").textContent = ""; $("au-msg").className = "formmsg";
  $("au-note").textContent = note || "";
  $("au-note").hidden = !note;
  const acct = mode === "acct";
  $("au-forms").hidden = acct; $("au-acct").hidden = !acct;
  $("au-tabs").hidden = acct || mode === "reset";
  $("authh").textContent = {in: "Sign in", up: "Create an account", reset: "Choose a new password", acct: "Your account"}[mode];
  $("au-tab-in").setAttribute("aria-pressed", mode === "in"); $("au-tab-up").setAttribute("aria-pressed", mode === "up");
  $("au-namewrap").hidden = mode !== "up";
  $("au-emailwrap").hidden = mode === "reset";
  $("au-pass").autocomplete = mode === "in" ? "current-password" : "new-password";
  $("au-passlabel").firstChild.textContent = mode === "reset" ? "New password " : "Password ";
  $("au-forgot").hidden = mode !== "in";
  $("au-go").textContent = {in: "Sign in", up: "Create account", reset: "Save new password"}[mode] || "";
  if (acct) { $("ac-name").value = S.myName; $("ac-email").textContent = S.email; }
  openModal("authmodal");
}
$("acctbtn").addEventListener("click", () => openAuth(S.me ? "acct" : "in"));
$("custsigninbtn").addEventListener("click", () => openAuth("up"));
$("addhintbtn").addEventListener("click", () => $("calform").scrollIntoView({behavior: "smooth", block: "start"}));
$("au-tab-in").addEventListener("click", () => openAuth("in", $("au-note").textContent));
$("au-tab-up").addEventListener("click", () => openAuth("up", $("au-note").textContent));
async function authGo() {
  const msg = $("au-msg"); msg.className = "formmsg"; msg.textContent = "";
  const email = $("au-email").value.trim(), pass = $("au-pass").value, name = $("au-name").value.trim();
  if (!sb) { msg.className = "formmsg err"; msg.textContent = "The sign-in service did not load. Check your connection and reload."; return; }
  if (authMode !== "reset" && !/^\S+@\S+\.\S+$/.test(email)) { msg.className = "formmsg err"; msg.textContent = "Enter your email address."; return; }
  if (pass.length < 8) { msg.className = "formmsg err"; msg.textContent = "Use a password of at least 8 characters."; return; }
  if (authMode === "up" && !name) { msg.className = "formmsg err"; msg.textContent = "Enter the name other people will see."; return; }
  $("au-go").disabled = true;
  try {
    let res;
    if (authMode === "in") res = await sb.auth.signInWithPassword({email, password: pass});
    else if (authMode === "up") res = await sb.auth.signUp({email, password: pass, options: {data: {display_name: name.slice(0, 60)}}});
    else res = await sb.auth.updateUser({password: pass});
    if (res.error) throw res.error;
    if (authMode === "up" && !res.data.session) { msg.textContent = "Account created. Check your email to confirm it, then sign in."; return; }
    $("au-pass").value = "";
    closeModal("authmodal");
    if (authMode === "reset") toast("Password changed.");
  } catch (err) {
    msg.className = "formmsg err";
    const m = (err && err.message) || "";
    msg.textContent = /invalid login/i.test(m) ? "That email and password do not match." : /already registered/i.test(m) ? "There is already an account with this email. Sign in instead." : (m || "Something went wrong. Try again.");
  } finally { $("au-go").disabled = false; }
}
$("au-form").addEventListener("submit", (e) => { e.preventDefault(); authGo(); });
$("au-go").addEventListener("click", (e) => { e.preventDefault(); authGo(); });
$("au-forgot").addEventListener("click", async () => {
  const email = $("au-email").value.trim(), msg = $("au-msg");
  if (!/^\S+@\S+\.\S+$/.test(email)) { msg.className = "formmsg err"; msg.textContent = "Enter your email address first."; return; }
  const {error} = await sb.auth.resetPasswordForEmail(email, {redirectTo: location.origin + location.pathname});
  msg.className = error ? "formmsg err" : "formmsg";
  msg.textContent = error ? error.message : "If there is an account for that email, a reset link is on its way. Open it on this device.";
});
$("ac-save").addEventListener("click", async () => {
  const name = $("ac-name").value.trim().slice(0, 60), msg = $("ac-msg");
  if (!name) { msg.className = "formmsg err"; msg.textContent = "Enter a name."; return; }
  const {error} = await sb.from("profiles").update({display_name: name}).eq("id", S.me);
  msg.className = error ? "formmsg err" : "formmsg"; msg.textContent = error ? dbError(error) : "Saved.";
  if (!error) { S.myName = name; S.names[S.me] = name; renderAccount(); saveCache(); }
});
$("ac-out").addEventListener("click", async () => { await sb.auth.signOut(); closeModal("authmodal"); });

async function loadMyName() {
  const {data} = await sb.from("profiles").select("display_name").eq("id", S.me).maybeSingle();
  if (data) { S.myName = data.display_name; S.names[S.me] = data.display_name; renderAccount(); }
}
async function acceptPendingInvite() {
  const t = store.get("invite", null);
  if (!t || !S.me) return;
  store.set("invite", null);
  const {data, error} = await sb.rpc("accept_invite", {t});
  if (error) { toast(error.message || "That invite link did not work."); return; }
  S.joined = data; S.view = "custom:" + data; store.set("view", S.view);
}
let sessionUser = undefined;
async function onSession(session) {
  const id = session ? session.user.id : null;
  if (id === sessionUser) return;
  sessionUser = id;
  S.me = id; S.email = session ? session.user.email : "";
  S.cals = []; S.events = []; S.names = {}; S.people = {}; S.myName = "";
  urlCache.forEach((u) => URL.revokeObjectURL(u)); urlCache.clear(); signFailed.clear(); monthCache.clear();
  if (!S.me) {
    teardownRealtime(); setStatus("signedout"); renderAll();
    if (store.get("invite", null)) openAuth("up", "Someone shared a calendar with you. Create an account, or sign in, to open it.");
    return;
  }
  const cache = store.get("cache:" + S.me, null);
  if (cache) { S.cals = cache.cals || []; S.events = cache.events || []; S.names = cache.names || {}; S.people = cache.people || {}; S.myName = cache.myName || ""; }
  setStatus(navigator.onLine ? "loading" : "offline");
  renderAll();
  if (!navigator.onLine) return;
  loadMyName();
  await acceptPendingInvite();
  await fetchAll();
  setupRealtime();
}

/* ======================= modals + lightbox ======================= */
let lastFocus = null;
function openModal(id) { lastFocus = document.activeElement; $(id).hidden = false; const f = $(id).querySelector("input:not([type=hidden]):not([hidden]),select,button"); if (f) setTimeout(() => f.focus(), 30); }
function closeModal(id) { $(id).hidden = true; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
document.querySelectorAll(".modal").forEach((m) => {
  m.addEventListener("click", (e) => { if (e.target === m || e.target.closest("[data-close]")) closeModal(m.id); });
});
function openLightbox(path, type) {
  const src = mediaUrl(path); if (!src) return;
  $("lbbody").innerHTML = type.startsWith("video/") ? `<video src="${esc(src)}" controls autoplay playsinline></video>` : `<img src="${esc(src)}" alt="">`;
  $("lightbox").hidden = false; $("lbclose").focus();
}
function closeLightbox() { $("lightbox").hidden = true; $("lbbody").innerHTML = ""; }
$("lbclose").addEventListener("click", closeLightbox);
$("lightbox").addEventListener("click", (e) => { if (e.target.id === "lightbox") closeLightbox(); });
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!$("lightbox").hidden) closeLightbox();
  document.querySelectorAll(".modal:not([hidden])").forEach((m) => closeModal(m.id));
});

/* ======================= install hint ======================= */
(() => {
  const standalone = navigator.standalone || matchMedia("(display-mode: standalone)").matches;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  let deferred = null;
  const show = (text, btn) => {
    if (standalone || store.get("hideinstall", false)) return;
    $("installtext").textContent = text; $("installbtn").hidden = !btn; $("install").hidden = false;
  };
  if (ios) show("Install on your iPhone: in Safari, tap the Share button, then “Add to Home Screen”.", false);
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; show("Install Calendar Atlas as an app on this device.", true); });
  $("installbtn").addEventListener("click", async () => { if (deferred) { deferred.prompt(); deferred = null; } $("install").hidden = true; });
  $("installx").addEventListener("click", () => { $("install").hidden = true; store.set("hideinstall", true); });
})();

/* ======================= boot ======================= */
(() => {
  const q = new URLSearchParams(location.search), inv = q.get("invite");
  if (inv && /^[0-9a-f-]{36}$/i.test(inv)) { store.set("invite", inv); history.replaceState(null, "", location.pathname + location.hash); }
})();
renderAll();
setStatus("signedout");
setInterval(() => {
  renderClock();
  const t = todayKey(S.tz);
  if (t !== S.lastToday) { const first = S.lastToday === undefined; S.lastToday = t; if (!first) { renderToday(); renderMonth(); renderCustoms(); } }
}, 1000);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && S.me && navigator.onLine) fetchAll(); });
window.addEventListener("online", () => { if (S.me) { fetchAll(); setupRealtime(); } });
window.addEventListener("offline", () => { if (S.me) setStatus("offline"); });

if (!sb) setStatus("nolib");
else {
  sb.auth.onAuthStateChange((event, session) => {
    setTimeout(() => {
      if (event === "PASSWORD_RECOVERY") openAuth("reset");
      onSession(session);
    }, 0);
  });
}
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
})();
