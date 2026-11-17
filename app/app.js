/* Koranwoorden – leer de woorden van de Koran in context.
   Data: quran.com (woord-voor-woord, NL-vertaling Abdalsalaam), Quranic Arabic Corpus (morfologie). */
'use strict';
(function () {
const QW = window.QW;
const M = QW.meta;
const LEM = M.lemmas;            // [lem, root, pos, sub, n, nl, level, note, auto, en[], nSurahs]
const SUR = M.surahs;            // [id, name, nameAr, nameNl, verses, place, nUnique, nWords, lemmaIds[]]
const ROOTS = M.roots;           // root -> [kern, kernLemma, lemmaIds[], total]
const ROOT_LIST = Object.keys(ROOTS).sort((a, b) => ROOTS[b][3] - ROOTS[a][3]);
const TOTAL_WORDS = LEM.reduce((a, l) => a + l[4], 0);
const $main = document.getElementById('main');

/* ---------------- hulpfuncties ---------------- */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad3 = n => String(n).padStart(3, '0');
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function today() { const d = new Date(); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5); }
const DAYS = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
const HARAKAT = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;
const stripAr = s => s.replace(HARAKAT, '').replace(/[ٱأإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي');
const normAr = s => stripAr(s).replace(/[\s‌‏]/g, '');
const normRoot = s => s.replace(HARAKAT, '').replace(/[ءأإآؤئاٱ]/g, 'ء').replace(/ى/g, 'ي').replace(/[^ء-ي]/g, '');
const spaced = r => [...r].join(' ');
const BW = { 'ء': "'", 'آ': '|', 'أ': '>', 'ؤ': '&', 'إ': '<', 'ئ': '}', 'ا': 'A', 'ب': 'b', 'ة': 'p', 'ت': 't', 'ث': 'v', 'ج': 'j', 'ح': 'H', 'خ': 'x', 'د': 'd', 'ذ': '*', 'ر': 'r', 'ز': 'z', 'س': 's', 'ش': '$', 'ص': 'S', 'ض': 'D', 'ط': 'T', 'ظ': 'Z', 'ع': 'E', 'غ': 'g', 'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ه': 'h', 'و': 'w', 'ى': 'Y', 'ي': 'y', 'ٱ': 'A' };
const toBW = s => [...s].map(c => BW[c] ?? '').join('');
function lev(a, b) {
  const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
  return prev[n];
}
function toast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.remove('hidden'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.add('hidden'), 2800); }

/* ---------------- grammatica-labels ---------------- */
const POSNL = { N: 'naamwoord', V: 'werkwoord', P: 'partikel' };
const SUBNL = { PN: 'eigennaam', ACT_PCPL: 'actief deelwoord', PASS_PCPL: 'passief deelwoord', VN: 'verbaal naamwoord', ADJ: 'bijvoeglijk', REL: 'betrekkelijk', DEM: 'aanwijzend', NEG: 'ontkenning', CONJ: 'voegwoord', INTG: 'vraagwoord', COND: 'voorwaarde', LOC: 'plaats', T: 'tijd', PRON: 'voornaamwoord', P: 'voorzetsel' };
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const VFORM = { 2: 'intensief of laten doen', 3: 'met/tegen iemand doen', 4: 'doen laten (causatief)', 5: 'zichzelf (wederkerend van II)', 6: 'elkaar / samen', 7: 'ondergaan (passief-wederkerend)', 8: 'voor zichzelf / met inspanning', 9: 'kleur of gebrek worden', 10: 'vragen om / beschouwen als' };
const PREF = { 'و': 'en', 'ف': 'dus / en dan', 'ب': 'met / door / in', 'ل': 'voor / om te / zeker', 'ك': 'zoals', 'ال': 'de / het', 'س': 'zal (toekomst)', 'أ': 'vraag: …?', 'ي': 'o! (aanroep)', 'ه': 'kijk! (aandacht)' };
const PER = { '1S': ['ik', 'mijn / mij'], '1P': ['wij', 'ons'], '2MS': ['jij (m)', 'jouw / jou'], '2FS': ['jij (v)', 'jouw / jou'], '2D': ['jullie twee', 'jullie twee'], '2MD': ['jullie twee', 'jullie twee'], '2FD': ['jullie twee', 'jullie twee'], '2MP': ['jullie (m)', 'jullie'], '2FP': ['jullie (v)', 'jullie'], '3MS': ['hij', 'zijn / hem'], '3FS': ['zij (ev)', 'haar'], '3D': ['zij twee', 'hun / hen (twee)'], '3MD': ['zij twee', 'hun / hen (twee)'], '3FD': ['zij twee (v)', 'hun / hen (twee)'], '3MP': ['zij (m mv)', 'hun / hen'], '3FP': ['zij (v mv)', 'hun / hen'] };
const NUM = { M: 'mannelijk', F: 'vrouwelijk', MS: 'm. enkelvoud', FS: 'v. enkelvoud', MD: 'm. tweevoud', FD: 'v. tweevoud', D: 'tweevoud', MP: 'm. meervoud', FP: 'v. meervoud' };
const CASE = { NOM: 'nominatief (onderwerp)', ACC: 'accusatief (voorwerp / bijwoord)', GEN: 'genitief (na voorzetsel / bezit)' };
function posLabel(L) {
  const parts = [POSNL[L[2]] || L[2]];
  for (const t of (L[3] || '').split(',')) {
    if (!t) continue;
    const vf = t.match(/^VF(\d+)/);
    if (vf) { if (vf[1] !== '1') parts.push('vorm ' + ROMAN[+vf[1]]); }
    else if (SUBNL[t]) parts.push(SUBNL[t]);
  }
  return [...new Set(parts)].join(' · ');
}
const segsOf = w => Array.isArray(w[4]) ? w[4] : [[w[0], w[4]]];
function stemLabel(code) {
  const pos = code[1], tags = code.slice(3).split(',').filter(Boolean), out = [];
  if (pos === 'V') {
    if (tags.includes('PERF')) out.push('voltooid: deed'); else if (tags.includes('IMPF')) out.push('onvoltooid: doet / zal doen'); else if (tags.includes('IMPV')) out.push('gebiedend: doe!');
    if (tags.includes('PASS')) out.push('lijdende vorm');
    const p = tags.find(t => PER[t]); if (p) out.push('onderwerp: ' + PER[p][0]);
  } else if (pos === 'N') {
    for (const t of ['ACT_PCPL', 'PASS_PCPL', 'VN', 'PN']) if (tags.includes(t)) out.push({ ACT_PCPL: 'actief deelwoord (wie … doet)', PASS_PCPL: 'passief deelwoord (wat … is)', VN: 'verbaal naamwoord (het …)', PN: 'eigennaam' }[t]);
    const p = tags.find(t => PER[t]); if (p) out.push(PER[p][0]);
    const nm = tags.find(t => NUM[t]); if (nm) out.push(NUM[nm]);
    const cs = tags.find(t => CASE[t]); if (cs) out.push(CASE[cs]);
    if (tags.includes('INDEF')) out.push('onbepaald (een …)');
  } else out.push('partikel');
  const vf = tags.find(t => /^VF\d/.test(t)); if (vf && vf !== 'VF1') out.push('vorm ' + ROMAN[+vf.slice(2)] + ': ' + (VFORM[+vf.slice(2)] || ''));
  return out.join(' · ');
}
function segLabel(code, stemPos) {
  const k = code[0], v = code.slice(1);
  if (k === 'p') return PREF[v] || 'voorvoegsel';
  if (k === 'v') return 'uitgang: ' + (PER[v]?.[0] || v);
  if (k === 'x') return (stemPos === 'V' ? 'object: ' : stemPos === 'N' ? 'bezit: ' : '') + (PER[v]?.[1] || v);
  if (k === 's') return stemLabel(code);
  return 'toevoeging';
}
function interestingForm(w) { const m = w[4]; return Array.isArray(m) || /^sV/.test(m) || /ACT_PCPL|PASS_PCPL|VN|MP|FP|MD|FD/.test(m); }
function breakdown(w) {
  const ss = segsOf(w), stem = ss.find(s => s[1][0] === 's'), sp = stem ? stem[1][1] : 'N', i = w[3];
  return `<div class="segs">${ss.map(([f, c]) => `<span class="seg seg-${c[0]}"><b>${esc(f)}</b><small>${esc(segLabel(c, sp))}</small></span>`).join('')}</div>
    <div class="small muted">Grondwoord <span class="ar">${esc(LEM[i][0])}</span> = ${esc(meaning(i))}${LEM[i][1] ? ` · wortel <a href="#/wortel/${encodeURIComponent(LEM[i][1])}" class="ar">${esc(spaced(LEM[i][1]))}</a>` : ''}</div>`;
}
const meaning = i => LEM[i][5] || (LEM[i][9][0] ? LEM[i][9][0] + ' (EN)' : '—');
const isFunc = i => LEM[i][2] === 'P' || /PRON|DEM|REL/.test(LEM[i][3]);

/* ---------------- data laden ---------------- */
function loadScript(src) { return new Promise((res, rej) => { const e = document.createElement('script'); e.src = src; e.onload = res; e.onerror = () => rej(new Error('Kan ' + src + ' niet laden')); document.head.appendChild(e); }); }
const surahP = {}, IDX = {};
function loadSurah(n) {
  if (!surahP[n]) surahP[n] = loadScript('data/s' + n + '.js').then(() => {
    const d = QW.s[n], idx = new Map();
    d.v.forEach((v, a) => v[1].forEach((w, k) => { if (!idx.has(w[3])) idx.set(w[3], []); idx.get(w[3]).push([a + 1, k + 1]); }));
    IDX[n] = idx; return d;
  });
  return surahP[n];
}
let occP; const loadOcc = () => occP || (occP = loadScript('data/occ.js'));
/* studiebronnen: tafsir, gharib, i'rab (per soera) en woordenboeken (per wortelletter) */
QW.v = {}; QW.vloaded = d => { QW.v[d.id] = d; };
const vP = {};
const loadV = n => vP[n] || (vP[n] = loadScript('data/v' + n + '.js').catch(() => { delete vP[n]; }));
QW.lx = {}; QW.lxloaded = (k, d) => { QW.lx[k] = d; };
const lxP = {};
const loadLx = k => lxP[k] || (lxP[k] = loadScript('data/lx' + k + '.js').catch(() => { delete lxP[k]; }));
const LEXIDX = QW.lexidx || {};
const skel = s => s.replace(HARAKAT, '').replace(/[ٱأإآءؤئ]/g, 'ا').replace(/[اىوي]/g, '').replace(/ة/g, 'ه').replace(/[^ء-ي]/g, '');
function tbFor(s, a, k) {
  const v = QW.v[s]; if (!v) return null;
  const ws = v.tb[a - 1]; if (!ws || ws.length !== QW.s[s].v[a - 1][1].length) return null;
  return ws[k - 1];
}
const IRAB_SET = ['فاعل', 'مفعول به', 'مضاف إليه', 'مجرور', 'صفة', 'خبر', 'حال', 'نائب فاعل', 'بدل', 'اسم إن', 'خبر إن', 'اسم كان', 'خبر كان', 'تمييز', 'مفعول مطلق', 'منادى', 'مفعول لأجله', 'معطوف', 'اسم أن', 'خبر أن'];
function irabRel(s, a, k) { const t = tbFor(s, a, k); if (!t) return null; const st = t.find(x => IRAB_SET.includes(x[2])); return st ? st[2] : null; }
function gharibFor(s, a, k) {
  const v = QW.v[s]; if (!v) return [];
  const w = skel(wordAt(s, a, k)[0]); if (!w) return [];
  return (v.gh[a - 1] || []).filter(g => { const t = skel(g[0]); return t === w || (w.length >= 2 && t.split(/\s+/).length < 4 && (t.includes(w) || w.includes(t) && t.length >= 2)); }).slice(0, 3);
}
function darwishBlock(s, a) { const v = QW.v[s]; return v ? v.ir.find(b => b[0].includes(a)) : null; }
function darwishFor(s, a, k) {
  const b = darwishBlock(s, a); if (!b) return null;
  const html = b[1], i = html.indexOf('الإعراب:'); if (i < 0) return null;
  let sec = html.slice(i + 8); const end = sec.search(/<strong>\s*(البلاغة|الفوائد|اللغة|الإعراب)/); if (end > 0) sec = sec.slice(0, end);
  const txt = sec.replace(/<[^>]+>/g, ' ');
  const segs = [...txt.matchAll(/\(([^()]{1,80})\)\s*([^()]*)/g)].map(m => [m[1], m[2].trim()]);
  const target = skel(wordAt(s, a, k)[0]); if (!target) return null;
  // hoeveelste keer komt dit woord voor in de passage tot hier?
  let nth = 0;
  for (const aa of b[0]) { if (aa > a || !QW.s[s].v[aa - 1]) break; QW.s[s].v[aa - 1][1].forEach((w, kk) => { if ((aa < a || kk + 1 < k) && skel(w[0]) === target) nth++; }); }
  const exact = segs.filter(x => skel(x[0]) === target);
  if (exact.length) return exact[Math.min(nth, exact.length - 1)];
  return segs.find(x => skel(x[0]).includes(target) && target.length >= 2) || null;
}
function irabHtml(s, a, k) {
  const t = tbFor(s, a, k), d = darwishFor(s, a, k);
  if (!t && !d) return '';
  const toks = t ? t.map(x => `<span class="tok"><b>${esc(x[0])}</b> ${esc(x[1])}${x[2] ? ` · <em>${esc(x[2])}</em>` : ''}${x[3] ? ` ← ${esc(wordAt(s, a, x[3])[0])}` : ''}${x[4] ? ` (${esc(x[4])})` : ''}</span>`).join('') : '';
  return `<div class="irab" dir="rtl">${toks ? `<div><span class="srcl">الإعراب (الشجرة النحوية)</span>${toks}</div>` : ''}${d ? `<div class="drw"><span class="srcl">إعراب القرآن وبيانه</span> (${esc(d[0])}) ${esc(d[1].slice(0, 400))}${d[1].length > 400 ? '…' : ''}</div>` : ''}</div>`;
}
function gharibHtml(s, a, k) {
  const g = gharibFor(s, a, k); if (!g.length) return '';
  return `<div class="gharib" dir="rtl"><span class="srcl">معنى الكلمة في هذه الآية</span>${g.map(x => `<div><b>${esc(x[0])}:</b> ${x[1]} <small class="muted">— ${esc(x[2])}</small></div>`).join('')}</div>`;
}
function nlBlock(t) {
  if (S.set.nl === 'nooit' || !t) return '';
  return S.set.nl === 'tonen' ? `<div class="nlline">${esc(t)}</div>` : `<details class="nlline small"><summary>Nederlandse vertaling (interpretatie)</summary>${esc(t)}</details>`;
}
function muyassarHtml(s, a, cls) { const v = QW.v[s]; return v && v.mu[a - 1] ? `<div class="tafsir-mini ${cls || ''}" dir="rtl"><span class="srcl">التفسير الميسر</span> ${v.mu[a - 1]}</div>` : ''; }
const occOf = i => QW.occ[i].split(' ').map(x => x.split(':').map(Number));
const wordAt = (s, a, w) => QW.s[s].v[a - 1][1][w - 1];
const audioUrl = (s, a, w) => `https://audio.qurancdn.com/wbw/${pad3(s)}_${pad3(a)}_${pad3(w)}.mp3`;
let player;
function play(s, a, w) { try { player && player.pause(); player = new Audio(audioUrl(s, a, w)); player.play().catch(() => { }); } catch (e) { } }

/* ---------------- opslag: localStorage + IndexedDB-kopie ---------------- */
const KEY = 'koranwoorden-v1';
const DEF = { cards: {}, hist: {}, set: { goal: 15, newPerDay: 8, len: 15, dir: 'mix', mode: 'type', skipFunc: false, kb: 'scherm', remind: '19:00', nl: 'ingeklapt' }, focus: null, frz: { n: 0, days: [] }, read: [], lastBackup: null, created: null };
const clone = o => JSON.parse(JSON.stringify(o));
const merge = x => Object.assign(clone(DEF), x, { set: Object.assign({}, DEF.set, x.set), frz: Object.assign({}, DEF.frz, x.frz) });
let S = loadState();
function loadState() { try { const x = JSON.parse(localStorage.getItem(KEY)); if (x && x.cards) return merge(x); } catch (e) { } const d = clone(DEF); d.created = today(); return d; }
const idb = {
  open() { return this.p || (this.p = new Promise((res, rej) => { const r = indexedDB.open('koranwoorden', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); })); },
  async set(k, v) { const db = await this.open(); return new Promise((res, rej) => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); },
  async get(k) { const db = await this.open(); return new Promise((res, rej) => { const r = db.transaction('kv').objectStore('kv').get(k); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); },
};
let idbT;
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Opslaan in browser mislukt: ' + e.message); }
  clearTimeout(idbT); idbT = setTimeout(() => { try { idb.set('state', JSON.stringify(S)).catch(() => { }); } catch (e) { } }, 400);
}
async function restoreFromIdb() {
  if (Object.keys(S.cards).length || Object.keys(S.hist).length) return false;
  try { const x = await idb.get('state'); if (x) { const y = JSON.parse(x); if (y.cards && Object.keys(y.cards).length) { S = merge(y); localStorage.setItem(KEY, x); return true; } } } catch (e) { }
  return false;
}
function askPersist() { try { navigator.storage?.persist?.(); } catch (e) { } }

/* ---------------- herhalingsschema (SM-2 variant) ---------------- */
const newCard = s => ({ d: today(), i: 0, e: 2.5, r: 0, l: 0, s: s || null, f: today(), n: 0, k: 0 });
function status(i) { const c = S.cards[i]; if (!c) return 'new'; if (c.x) return 'done'; return c.i >= 21 ? 'known' : 'learning'; }
const STLABEL = { new: 'nieuw', learning: 'aan het leren', known: 'beheerst', done: 'begrepen ✓' };
const knownish = i => { const s = status(i); return s !== 'new'; };
function grade(i, g, s) {
  const t = today();
  let c = S.cards[i] || (S.cards[i] = newCard(s));
  if (c.r === 0) { c.i = [0, 1, 1, 4][g]; if (g === 0) c.l++; }
  else if (g === 0) { c.l++; c.e = Math.max(1.3, c.e - 0.2); c.i = 1; }
  else if (g === 1) { c.e = Math.max(1.3, c.e - 0.15); c.i = Math.max(1, Math.round(c.i * 1.2)); }
  else if (g === 2) c.i = Math.max(c.i + 1, Math.round(c.i * c.e));
  else { c.e += 0.15; c.i = Math.max(c.i + 2, Math.round(c.i * c.e * 1.3)); }
  if (g > 0) c.r++;
  if (c.i > 4) c.i = Math.round(c.i * (0.95 + Math.random() * 0.1));
  c.d = t + c.i;
  if (!c.s && s) c.s = s;
}
function excludeWord(i, s) {
  const c = S.cards[i] || (S.cards[i] = newCard(s)); c.x = 1; c.i = Math.max(c.i, 365); save();
  if (SES) SES.items.forEach(it => { if (it.i === i && SES.items.indexOf(it) > SES.pos) it.skip = true; });
  toast('Komt niet meer terug — telt als begrepen');
}
function hToday() { const t = today(); return S.hist[t] || (S.hist[t] = { n: 0, c: 0, new: 0, ms: 0, w: 0, rd: 0 }); }
const dayDone = d => (S.hist[d]?.n || 0) >= S.set.goal || S.frz.days.includes(d);
function streak() { const t = today(); let d = dayDone(t) ? t : t - 1, c = 0; while (dayDone(d)) { c++; d--; } return c; }
function bestStreak() {
  const days = [...new Set([...Object.keys(S.hist).map(Number), ...S.frz.days])].filter(dayDone).sort((a, b) => a - b);
  let best = 0, run = 0, prev = null;
  for (const d of days) { run = prev === d - 1 ? run + 1 : 1; best = Math.max(best, run); prev = d; }
  return best;
}
function logAnswer(ok, isNew) {
  const h = hToday(), was = dayDone(today());
  h.n++; if (ok) h.c++; if (isNew) h.new++;
  if (!was && dayDone(today())) {
    const st = streak();
    if (st > 0 && st % 7 === 0 && S.frz.n < 2) { S.frz.n++; toast(`🔥 ${st} dagen! Je verdient een streak-bevriezing ❄`); }
    else toast('Dagdoel gehaald ✓');
  }
}
function applyFreeze() {
  const y = today() - 1;
  if (!dayDone(y) && dayDone(y - 1) && S.frz.n > 0) { S.frz.n--; S.frz.days.push(y); save(); setTimeout(() => toast('❄ Gisteren gemist — bevriezing gebruikt, je streak blijft staan'), 600); }
}
const dueIds = (filter) => Object.keys(S.cards).map(Number).filter(i => !S.cards[i].x && S.cards[i].d <= today() && (!filter || filter(i))).sort((a, b) => S.cards[a].d - S.cards[b].d);
const newLeftToday = () => Math.max(0, S.set.newPerDay - (S.hist[today()]?.new || 0));
function newCandidates(surah, k, list) {
  const src = list || (surah ? SUR[surah - 1][8] : LEM.map((_, i) => i));
  const out = [];
  for (const i of src) { if (out.length >= k) break; if (!S.cards[i] && !(S.set.skipFunc && isFunc(i))) out.push(i); }
  return out;
}
const coverage = ids => { let n = 0; for (const i of ids) n += LEM[i][4]; return n; };
const topKnown = n => { let k = 0; for (let i = 0; i < n; i++) if (S.cards[i]) k++; return k; };

/* ---------------- kleine UI-blokken ---------------- */
function resBadge(i) {
  const lv = LEM[i][6];
  return lv === 2 ? '<span class="badge r2" title="Extra onderzoek nodig">⚠ onderzoek</span>' : lv === 1 ? '<span class="badge r1" title="Betekenis hangt af van context">◐ context</span>' : '';
}
function researchBox(i) {
  const L = LEM[i], lv = L[6];
  const head = lv === 2 ? '⚠ Extra onderzoek nodig' : lv === 1 ? '◐ Let op de context' : '✓ Betekenis vrij eenduidig';
  const expl = lv === 2 ? 'De Nederlandse vertaling dekt de Arabische lading maar deels. Lees een klassiek lexicon (Lane) en tafsir erbij.'
    : lv === 1 ? 'De dichtstbijzijnde vertaling klopt meestal, maar de nuance verschuift per vers. Kijk naar de contextuele vertaling.'
      : 'De dichtstbijzijnde vertaling dekt de betekenis goed.';
  return `<div class="research r${lv}"><b>${head}</b>${esc(expl)}${L[7] ? `<div style="margin-top:6px"><b style="display:inline">Notitie:</b> ${esc(L[7])}</div>` : ''}${L[8] ? `<div class="small" style="margin-top:6px">${esc(L[8])}</div>` : ''}</div>`;
}
function researchLinks(i, ctx) {
  const L = LEM[i];
  const rootBW = L[1] ? toBW(L[1]) : toBW(stripAr(L[0]));
  const plain = stripAr(L[0]);
  const links = [
    [`https://ejtaal.net/aa/#q=${encodeURIComponent(rootBW)}`, 'Lane / Hans Wehr (ejtaal)'],
    [`https://www.almaany.com/ar/dict/ar-en/${encodeURIComponent(plain)}/`, 'Almaany'],
    L[1] ? [`https://corpus.quran.com/qurandictionary.jsp?q=${encodeURIComponent(rootBW)}`, 'Corpus: alle vormen van de wortel'] : null,
    [`https://tafsir.net/searchs?keys=${encodeURIComponent(plain)}`, 'tafsir.net (onderzoek)'],
  ];
  if (ctx) {
    links.push([`https://quran.com/${ctx[0]}:${ctx[1]}/tafsirs/ar-tafsir-muyassar`, `Tafsir al-Muyassar ${ctx[0]}:${ctx[1]}`]);
    links.push([`https://corpus.quran.com/wordmorphology.jsp?location=(${ctx[0]}:${ctx[1]}:${ctx[2]})`, 'Grammatica van dit woord']);
  }
  return '<div class="links">' + links.filter(Boolean).map(([u, t]) => `<a class="btn sm" target="_blank" rel="noopener" href="${u}">${esc(t)} ↗</a>`).join('') + '</div>';
}
function rootBox(i, opts = {}) {
  const r = LEM[i][1]; if (!r) return '';
  const R = ROOTS[r], fam = R[2].filter(j => j !== i);
  return `<div class="rootbox">
    <div class="row between"><a class="rootletters ar" href="#/wortel/${encodeURIComponent(r)}">${esc(spaced(r))}</a>
      <div class="small" style="text-align:right">wortel · kern: <b>${esc(R[0])}</b><br><span class="muted">${R[2].length} woorden · ${R[3]}× in de Koran</span></div></div>
    ${fam.length ? `<div class="fam">${fam.slice(0, opts.max || 6).map(j => `<a href="#/woord/${j}" class="famw ${knownish(j) ? 'k' : ''}"><span class="ar">${esc(LEM[j][0])}</span><small>${esc(meaning(j))}</small></a>`).join('')}${fam.length > (opts.max || 6) ? `<a class="famw more" href="#/wortel/${encodeURIComponent(r)}">+${fam.length - (opts.max || 6)}</a>` : ''}</div>` : ''}
  </div>`;
}
function verseArabic(s, a, hlW, opts = {}) {
  const v = QW.s[s].v[a - 1];
  let words = v[1].map((w, k) => ({ w, k: k + 1 }));
  let pre = '', post = '';
  if (opts.window && words.length > opts.window * 2 + 1) {
    const from = Math.max(0, hlW - 1 - opts.window), to = Math.min(words.length, hlW + opts.window);
    if (from > 0) pre = '… '; if (to < words.length) post = ' …';
    words = words.slice(from, to);
  }
  return pre + words.map(({ w, k }) => {
    const txt = esc(w[0]);
    if (k === hlW) return `<mark>${txt}</mark>`;
    if (opts.clickable) return `<span class="w${knownish(w[3]) ? ' known' : ''}" data-w="${s}:${a}:${k}">${txt}</span>`;
    return txt;
  }).join(' ') + post;
}
function contextBlock(s, a, w, opts = {}) {
  const word = wordAt(s, a, w), v = QW.s[s].v[a - 1];
  return `<div class="context">
    <div class="arline">${verseArabic(s, a, w, { window: opts.window })}</div>
    <div class="row between small wrap" style="margin:4px 0 6px">
      <span><b class="ar">${esc(word[0])}</b> <span class="muted">(${esc(word[2])})</span> = <i>${esc(word[1])}</i> <span class="muted">— in dit vers (EN)</span></span>
      <button class="audio" data-play="${s}:${a}:${w}">▶ luister</button>
    </div>
    ${gharibHtml(s, a, w)}
    ${opts.breakdown ? breakdown(word) + irabHtml(s, a, w) : ''}
    ${opts.noTafsir ? '' : muyassarHtml(s, a)}
    ${opts.noNl ? '' : nlBlock(v[0])}
    <div class="ref"><a href="#/soera/${s}/tekst">${esc(SUR[s - 1][1])}</a> ${s}:${a} · <a href="#/vers/${s}/${a}">vers bestuderen (tafsir · i'rab) →</a></div>
  </div>`;
}
document.addEventListener('click', e => {
  const p = e.target.closest('[data-play]');
  if (p) { e.preventDefault(); const [s, a, w] = p.dataset.play.split(':').map(Number); play(s, a, w); }
});

/* ---------------- Arabisch schermtoetsenbord ---------------- */
const KB_ROWS = ['ض ص ث ق ف غ ع ه خ ح ج', 'ش س ي ب ل ا ت ن م ك ط', 'ذ ء ؤ ر ى ة و ز ظ د', 'أ إ آ ئ'];
function arInput(id, ph) {
  const scr = S.set.kb === 'scherm';
  return `<div class="arinput"><input id="${id}" class="ar answer" dir="rtl" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="${esc(ph || 'typ in het Arabisch')}" ${scr ? 'inputmode="none"' : ''}>
    <button class="btn sm kbtoggle" type="button" data-kbt title="Wissel tussen schermtoetsenbord en eigen toetsenbord">${scr ? '⌨ eigen toetsenbord' : '⌨ schermtoetsenbord'}</button></div>
    ${scr ? `<div class="kb" data-for="${id}">${KB_ROWS.map(r => `<div>${r.split(' ').map(k => `<button type="button" data-k="${k}">${k}</button>`).join('')}${r === KB_ROWS[3] ? '<button type="button" data-k=" " class="wide">spatie</button><button type="button" data-k="⌫" class="wide">⌫</button>' : ''}</div>`).join('')}</div>` : ''}`;
}
document.addEventListener('click', e => {
  const k = e.target.closest('[data-k]');
  if (k) {
    const inp = document.getElementById(k.closest('.kb').dataset.for); if (!inp) return;
    inp.value = k.dataset.k === '⌫' ? inp.value.slice(0, -1) : inp.value + k.dataset.k;
    inp.dispatchEvent(new Event('input'));
  }
  if (e.target.closest('[data-kbt]')) { S.set.kb = S.set.kb === 'scherm' ? 'systeem' : 'scherm'; save(); if (SES && location.hash === '#/oefen') renderQ(); else render(); }
});

/* ---------------- router ---------------- */
const routes = [];
const route = (re, fn) => routes.push([re, fn]);
async function render() {
  closeSheet();
  const h = location.hash.slice(1) || '/';
  for (const [re, fn] of routes) {
    const m = h.match(re);
    if (m) {
      const nav = h.split('/')[1] || 'home';
      const map = { soera: 'soeras', soeras: 'soeras', woord: 'woorden', woorden: 'woorden', wortel: 'wortels', wortels: 'wortels', zoek: 'woorden', lezen: 'home', oefen: 'home' };
      document.querySelectorAll('nav.bottom a').forEach(a => a.classList.toggle('active', a.dataset.nav === (map[nav] || nav)));
      try { await fn(...m.slice(1).map(x => x && decodeURIComponent(x))); } catch (err) { console.error(err); $main.innerHTML = `<div class="card"><h2>Er ging iets mis</h2><p class="muted">${esc(err.message)}</p></div>`; }
      if (!h.startsWith('/oefen')) window.scrollTo(0, 0);
      return;
    }
  }
  location.hash = '#/';
}
window.addEventListener('hashchange', render);

/* ---------------- Vandaag ---------------- */
const TIPS = [
  'Kort en elke dag wint van lang en af en toe. Eén korte ronde van ±5 minuten is genoeg om je streak te houden.',
  'Typ het antwoord echt uit, ook als je twijfelt. Zelf ophalen onthoudt veel beter dan herkennen.',
  'De meest voorkomende woorden eerst: de top 300 lemma\'s dekken ruim twee derde van de Korantekst.',
  'Let op de wortel (3 letters). Eén wortel ontsluit vaak tien of meer woorden.',
  'Schrijf lastige woorden in je schrift: wortel, vormen, en het vers waarin het staat. Je hand onthoudt mee.',
  'Lees na elke ronde een paar verzen met je nieuwe woorden. Groen = woorden die je al kent.',
  'Spreek het woord hardop na. Horen + zeggen + schrijven: drie sporen naar je geheugen.',
  'Zie je ⚠ onderzoek? Zoek de wortel op in Lane (ejtaal) en lees een tafsir over het vers.',
  'Begrijp je een woord echt overal? Tik op "Ken ik overal" en het komt niet meer terug.',
];
route(/^\/$/, async () => {
  const t = today(), h = S.hist[t] || { n: 0 };
  const due = dueIds().length, nNew = Math.min(newLeftToday(), newCandidates(S.focus, 999).length, Math.max(2, Math.ceil(S.set.len / 3)));
  const ids = Object.keys(S.cards).map(Number);
  const done = ids.filter(i => S.cards[i].x).length, known = ids.filter(i => status(i) === 'known').length;
  const cov = coverage(ids) / TOTAL_WORDS * 100;
  const st = streak();
  const sessQ = Math.min(due, S.set.len) + nNew * 3;
  const week = [];
  for (let d = t - 6; d <= t; d++) {
    const n = S.hist[d]?.n || 0, fz = S.frz.days.includes(d);
    week.push(`<div><i class="${fz ? 'frz' : n >= S.set.goal ? 'on' : n > 0 ? 'part' : ''}"></i>${DAYS[new Date(d * 864e5).getUTCDay()]}</div>`);
  }
  const focusName = S.focus ? `soera ${esc(SUR[S.focus - 1][1])} <span class="ar">${esc(SUR[S.focus - 1][2])}</span>` : 'de meest voorkomende woorden eerst';
  const needBackup = ids.length >= 10 && (!S.lastBackup || t - S.lastBackup >= 7);
  $main.innerHTML = `
  ${needBackup ? `<div class="card banner"><b>Back-up maken</b><p class="small" style="margin:4px 0 8px">Je hebt ${ids.length} woorden in je geheugen. Bewaar een back-up (bv. in iCloud/Drive) zodat je nooit iets kwijtraakt.</p><button class="btn sm primary" data-backup>Back-up opslaan</button></div>` : ''}
  <div class="card">
    <div class="streak"><div class="flame">${st > 0 ? '🔥' : '🌱'}</div>
      <div class="grow"><b>${st}</b> ${st === 1 ? 'dag' : 'dagen'} op rij <div class="muted small">Record: ${bestStreak()} · ${S.frz.n ? `❄ ${S.frz.n} bevriezing${S.frz.n > 1 ? 'en' : ''}` : 'elke 7 dagen verdien je een bevriezing'}</div></div></div>
    <div class="week">${week.join('')}</div>
  </div>
  <div class="card">
    <div class="row between"><h2>Vandaag</h2><span class="muted small">${h.n}/${S.set.goal}</span></div>
    <div class="bar" style="margin-bottom:12px"><i style="width:${Math.min(100, h.n / S.set.goal * 100)}%"></i></div>
    <p class="muted small" style="margin-top:0">${due} te herhalen · ${nNew} nieuw${h.n < S.set.goal ? ` · nog ${S.set.goal - h.n} voor je streak` : ' · dagdoel gehaald ✓'}</p>
    ${due + nNew > 0
      ? `<button class="btn primary big block" id="go">Start korte ronde <span class="small" style="opacity:.8">(≈ ${Math.max(2, Math.round(sessQ * 20 / 60))} min)</span></button>`
      : `<button class="btn primary big block" id="extra">${h.n >= S.set.goal ? 'Alles gedaan ✓ — nog een korte ronde?' : 'Oefen je woorden'}</button>`}
    <p class="small muted" style="margin-bottom:0">Nieuwe woorden: ${focusName} · <a href="#/soeras">kies soera</a>${S.focus ? ' · <a href="#" id="unfocus">terug naar frequentie</a>' : ''}</p>
  </div>
  ${ids.length ? `<div class="card row between wrap"><div><b>📖 Lees wat je geleerd hebt</b><div class="small muted">Verzen met je nieuwste woorden — probeer ze zelf te begrijpen.</div></div><a class="btn" href="#/lezen">Lezen</a></div>` : ''}
  <div class="stats">
    <div class="stat"><b>${ids.length}</b><span>woorden geleerd${done ? ` (${done} begrepen ✓)` : ''}</span></div>
    <div class="stat"><b>${known + done}</b><span>beheerst</span></div>
    <div class="stat"><b>${cov.toFixed(1)}%</b><span>van de Korantekst herken je</span></div>
  </div>
  <div class="card" style="margin-top:14px"><b>Meest voorkomende woorden</b>
    ${[100, 300, 1000].map(n => { const k = topKnown(n); return `<div class="row" style="margin-top:8px"><span class="small" style="width:70px">Top ${n}</span><div class="bar grow"><i style="width:${k / n * 100}%"></i></div><span class="small muted" style="width:64px;text-align:right">${k}/${n}</span></div>`; }).join('')}
    <p class="small muted" style="margin:8px 0 0">De top 100 dekt ruim de helft van alle woorden in de Koran.</p></div>
  <div class="card"><b>Tip</b><p class="muted" style="margin:4px 0 0">${esc(TIPS[t % TIPS.length])}</p></div>`;
  document.getElementById('go')?.addEventListener('click', () => startDaily());
  document.getElementById('extra')?.addEventListener('click', () => startDaily(true));
  document.getElementById('unfocus')?.addEventListener('click', e => { e.preventDefault(); S.focus = null; save(); render(); });
});
document.addEventListener('click', e => { if (e.target.closest('[data-backup]')) backup(); });

/* ---------------- Soera's ---------------- */
route(/^\/soeras$/, async () => {
  $main.innerHTML = `<h1>Soera's</h1>
  <input type="search" id="q" placeholder="Zoek op naam of nummer…" style="margin-bottom:12px">
  <div class="card" style="padding:4px 12px"><ul class="list" id="sl"></ul></div>`;
  const draw = q => {
    q = (q || '').toLowerCase().trim();
    document.getElementById('sl').innerHTML = SUR.filter(s => !q || String(s[0]) === q || s[1].toLowerCase().includes(q) || s[3].toLowerCase().includes(q) || stripAr(s[2]).includes(stripAr(q))).map(s => {
      const learned = s[8].filter(i => S.cards[i]).length;
      return `<li><a class="item" href="#/soera/${s[0]}">
        <span class="num">${s[0]}</span>
        <span class="grow"><b>${esc(s[1])}</b> ${S.focus === s[0] ? '<span class="badge r0">focus</span>' : ''}<br><span class="muted small">${esc(s[3])} · ${s[4]} verzen</span>
          <div class="bar" style="margin-top:6px;max-width:220px"><i style="width:${learned / s[6] * 100}%"></i></div>
          <span class="muted small">${learned}/${s[6]} woorden</span></span>
        <span class="ar-name">${esc(s[2])}</span></a></li>`;
    }).join('') || '<li class="item muted">Geen soera gevonden</li>';
  };
  draw();
  document.getElementById('q').addEventListener('input', e => draw(e.target.value));
});

function interlinear(s, a, opts = {}) {
  const v = QW.s[s].v[a - 1];
  return `<div class="inter">${v[1].map((w, k) => {
    const i = w[3], kn = knownish(i), tgt = opts.targets?.has(i);
    const gloss = kn || opts.hideAll ? `<small class="hid" data-reveal="${esc(meaning(i))}">···</small>` : `<small>${esc(meaning(i))}</small>`;
    return `<span class="iw ${kn ? 'known' : ''} ${tgt ? 'tgt' : ''}" data-w="${s}:${a}:${k + 1}"><b>${esc(w[0])}</b>${gloss}</span>`;
  }).join('')}<span class="vno">﴿${a}﴾</span></div>`;
}
document.addEventListener('click', e => { const h = e.target.closest('[data-reveal]'); if (h) { e.stopPropagation(); h.textContent = h.dataset.reveal; h.classList.remove('hid'); h.removeAttribute('data-reveal'); } }, true);

route(/^\/soera\/(\d+)(?:\/(woorden|tekst|lees))?$/, async (n, tab) => {
  n = +n; tab = tab || 'woorden';
  const s = SUR[n - 1]; if (!s) { location.hash = '#/soeras'; return; }
  $main.innerHTML = '<p class="muted center">Soera laden…</p>';
  await loadSurah(n);
  const ids = s[8];
  const learned = ids.filter(i => S.cards[i]).length;
  const surCov = (() => { let tot = 0, k = 0; for (const v of QW.s[n].v) for (const w of v[1]) { tot++; if (S.cards[w[3]]) k++; } return tot ? k / tot * 100 : 0; })();
  const newHere = newCandidates(n, 999).length, dueHere = dueIds(i => ids.includes(i)).length;
  let html = `
  <a href="#/soeras" class="small">← Alle soera's</a>
  <div class="card" style="margin-top:8px">
    <div class="row between"><div><h1 style="margin:0">${n}. ${esc(s[1])}</h1><div class="muted">${esc(s[3])} · ${s[4]} verzen · ${s[7]} woorden · ${s[6]} unieke</div></div>
      <div class="ar-name" style="font-size:2rem">${esc(s[2])}</div></div>
    <div class="bar" style="margin:12px 0 4px"><i style="width:${learned / s[6] * 100}%"></i></div>
    <div class="muted small">${learned}/${s[6]} geleerd · je herkent ${surCov.toFixed(0)}% van de woorden in deze soera</div>
    <div class="row wrap" style="margin-top:12px">
      <button class="btn primary" id="learn" ${newHere + dueHere === 0 ? 'disabled' : ''}>Leer nieuwe woorden (${Math.min(8, newHere)}${dueHere ? ' + ' + dueHere + ' herhalen' : ''})</button>
      <button class="btn" id="prac">Oefen (typen)</button>
      <button class="btn" id="focus">${S.focus === n ? '★ Focus-soera' : '☆ Maak focus-soera'}</button>
    </div>
    <p class="small muted" style="margin-bottom:0">Focus-soera: je dagelijkse nieuwe woorden komen uit deze soera (meest voorkomende eerst).</p>
  </div>
  <div class="tabs"><a href="#/soera/${n}/woorden" class="${tab === 'woorden' ? 'on' : ''}">Woorden</a><a href="#/soera/${n}/tekst" class="${tab === 'tekst' ? 'on' : ''}">Tekst</a><a href="#/soera/${n}/lees" class="${tab === 'lees' ? 'on' : ''}">Leesmodus</a></div>`;
  if (tab === 'woorden') {
    html += `<div class="chips" id="flt"><button data-f="all" class="on">Alle</button><button data-f="new">Nieuw</button><button data-f="learning">Aan het leren</button><button data-f="known">Beheerst</button><button data-f="r">⚠ Onderzoek</button><button data-f="nofunc">Zonder functiewoorden</button></div>
    <div class="chips" id="srt"><button data-o="soera" class="on">Volgorde in soera</button><button data-o="freq">Meest voorkomend</button></div>
    <div class="card" style="padding:4px 12px"><ul class="list" id="wl"></ul></div>`;
  } else if (tab === 'tekst') {
    html += `<p class="small muted">Tik op een woord voor de betekenis en opbouw. Groen = al geleerd.</p><div class="card" id="vt">` +
      QW.s[n].v.map((v, a) => `<div class="verse"><div class="arline">${verseArabic(n, a + 1, -1, { clickable: true })} <span class="vno">﴿${a + 1}﴾</span></div><div class="nlline"><b>${a + 1}.</b> ${esc(v[0])}</div></div>`).join('') + '</div>';
  } else {
    html += `<p class="small muted">Leesmodus: onder onbekende woorden staat de betekenis, bij woorden die je kent is die verborgen (tik ··· om te spieken). Probeer elk vers eerst zelf te begrijpen.</p><div class="card" id="vt">` +
      QW.s[n].v.map((v, a) => `<div class="verse">${interlinear(n, a + 1)}<details class="small"><summary>Vertaling</summary>${esc(v[0])}</details></div>`).join('') + '</div>';
  }
  $main.innerHTML = html;
  document.getElementById('learn').onclick = () => startLearn(newCandidates(n, 8), dueIds(i => ids.includes(i)), 'Leren: ' + s[1], n);
  document.getElementById('prac').onclick = () => startPractice(ids, 'Oefenen: ' + s[1], n);
  document.getElementById('focus').onclick = () => { S.focus = S.focus === n ? null : n; save(); render(); toast(S.focus ? 'Focus-soera ingesteld' : 'Nieuwe woorden weer op frequentie'); };
  if (tab === 'woorden') {
    const cnt = IDX[n]; let f = 'all', o = 'soera';
    const draw = () => {
      let list = ids.filter(i => f === 'all' || (f === 'r' ? LEM[i][6] === 2 : f === 'nofunc' ? !isFunc(i) : f === 'known' ? ['known', 'done'].includes(status(i)) : status(i) === f));
      if (o === 'freq') list = list.slice().sort((a, b) => LEM[b][4] - LEM[a][4]);
      document.getElementById('wl').innerHTML = list.map(i => wordRow(i, `${cnt.get(i).length}× hier · ${LEM[i][4]}× in de Koran`, n)).join('') || '<li class="item muted">Geen woorden in dit filter</li>';
    };
    draw();
    document.getElementById('flt').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; document.querySelectorAll('#flt button').forEach(x => x.classList.toggle('on', x === b)); f = b.dataset.f; draw(); });
    document.getElementById('srt').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; document.querySelectorAll('#srt button').forEach(x => x.classList.toggle('on', x === b)); o = b.dataset.o; draw(); });
  } else {
    document.getElementById('vt').addEventListener('click', e => {
      const w = e.target.closest('[data-w]'); if (!w || e.target.closest('[data-reveal]')) return;
      const [s2, a, k] = w.dataset.w.split(':').map(Number); wordSheet(s2, a, k);
    });
  }
});
function wordRow(i, sub, s) {
  return `<li><a class="item" href="#/woord/${i}${s ? '/' + s : ''}">
    <span class="lemma-ar">${esc(LEM[i][0])}</span>
    <span class="grow"><b>${esc(meaning(i))}</b> ${resBadge(i)}<br><span class="muted small">${sub}${LEM[i][1] ? ` · <span class="ar">${esc(spaced(LEM[i][1]))}</span>` : ''}</span></span>
    <span class="badge st-${status(i)}">${STLABEL[status(i)]}</span></a></li>`;
}

async function wordSheet(s, a, k) {
  await loadV(s);
  const w = wordAt(s, a, k), i = w[3];
  openSheet(`<div class="row between"><div class="prompt-ar" style="font-size:2.4rem">${esc(w[0])}</div><button class="audio" data-play="${s}:${a}:${k}">▶ luister</button></div>
    <div class="muted">${esc(w[2])} · ${s}:${a} · hier: <i>${esc(w[1])}</i> (EN) · <a href="#/vers/${s}/${a}">vers bestuderen →</a></div>
    ${gharibHtml(s, a, k)}
    ${breakdown(w)}${irabHtml(s, a, k)}
    <p style="margin:10px 0 6px"><b>${esc(meaning(i))}</b> ${resBadge(i)} <span class="muted small">· ${posLabel(LEM[i])} · ${LEM[i][4]}× in de Koran</span></p>
    <div class="row wrap"><a class="btn primary" href="#/woord/${i}/${s}">Alles over dit woord</a>
    ${S.cards[i] ? `<span class="badge st-${status(i)}">${STLABEL[status(i)]}</span>` : `<button class="btn" id="addw">+ Leren</button><button class="btn" id="exw">Ken ik overal</button>`}
    <button class="btn" data-close>Sluiten</button></div>`);
  document.getElementById('addw')?.addEventListener('click', () => { addCard(i, s); closeSheet(); render(); });
  document.getElementById('exw')?.addEventListener('click', () => { excludeWord(i, s); closeSheet(); render(); });
}
function openSheet(html) { const el = document.getElementById('sheet'); el.innerHTML = `<div class="panel">${html}</div>`; el.classList.remove('hidden'); }
function closeSheet() { document.getElementById('sheet').classList.add('hidden'); }
document.getElementById('sheet').addEventListener('click', e => { if (e.target.id === 'sheet' || e.target.closest('[data-close]')) closeSheet(); });
function addCard(i, s) { if (!S.cards[i]) { S.cards[i] = newCard(s); save(); toast('Toegevoegd: komt vandaag in je herhaling'); } }

/* ---------------- Woorddetail ---------------- */
route(/^\/woord\/(\d+)(?:\/(\d+))?$/, async (i, s) => {
  i = +i; s = s ? +s : null;
  const L = LEM[i]; if (!L) { location.hash = '#/'; return; }
  $main.innerHTML = '<p class="muted center">Laden…</p>';
  await loadOcc();
  const occ = occOf(i);
  if (!s) s = S.cards[i]?.s || occ[0][0];
  await loadSurah(s); await loadV(s);
  const here = occ.filter(o => o[0] === s);
  const elsewhere = occ.filter(o => o[0] !== s);
  const st = status(i), c = S.cards[i];
  $main.innerHTML = `
  <a href="#/soera/${s}" class="small">← ${esc(SUR[s - 1][1])}</a>
  <div class="card" style="margin-top:8px">
    <div class="row between wrap">
      <div><div class="prompt-nl" style="margin:0">${esc(meaning(i))}</div>
        <div class="muted small">${posLabel(L)} · ${L[4]}× in de Koran, in ${L[10]} ${L[10] === 1 ? 'soera' : "soera's"}</div></div>
      <div class="prompt-ar">${esc(L[0])}</div>
    </div>
    ${rootBox(i, { max: 8 })}
    ${researchBox(i)}
    <p class="small" style="margin:0"><b>Vertalingen in context (EN, ter vergelijking):</b> ${L[9].map(esc).join(' · ')}</p>
    <div class="row wrap" style="margin-top:12px">
      <span class="badge st-${st}">${STLABEL[st]}${c && !c.x ? ` · volgende herhaling ${c.d <= today() ? 'vandaag' : 'over ' + (c.d - today()) + ' d'}` : ''}${c?.n ? ` · ${c.k}/${c.n} goed` : ''}</span>
      ${c ? '' : `<button class="btn sm" id="add">+ Leren</button>`}
      ${c?.x ? `<button class="btn sm" id="unx">Toch weer oefenen</button>` : `<button class="btn sm" id="ex">✓ Ken ik overal — niet meer vragen</button>`}
      ${c && !c.x ? `<button class="btn sm" id="del">Verwijder</button>` : ''}
    </div>
  </div>
  <h2>Woordenboeken (wortel ${L[1] ? `<span class="ar">${esc(spaced(L[1]))}</span>` : '—'})</h2>
  <div class="card" id="lex">${L[1] ? '<p class="muted small">Laden…</p>' : '<p class="muted small">Dit woord heeft geen wortel (partikel/voornaamwoord). Zie de i\'rab en tafsir bij de verzen hieronder.</p>'}</div>
  <h2>Verder onderzoek (online)</h2>
  <div class="card">${researchLinks(i, here[0] || occ[0])}</div>
  <h2>In ${esc(SUR[s - 1][1])} (${here.length}×)</h2>
  <div>${here.slice(0, 30).map(o => contextBlock(...o, { breakdown: true })).join('')}${here.length > 30 ? `<p class="muted small">…en nog ${here.length - 30} keer</p>` : ''}</div>
  ${elsewhere.length ? `<h2>Elders in de Koran (${elsewhere.length}×)</h2><div id="else"></div><button class="btn block" id="more">Toon voorbeelden</button>` : ''}`;
  if (L[1]) lexBlock(L[1], document.getElementById('lex'));
  document.getElementById('add')?.addEventListener('click', () => { addCard(i, s); render(); });
  document.getElementById('ex')?.addEventListener('click', () => { excludeWord(i, s); render(); });
  document.getElementById('unx')?.addEventListener('click', () => { delete S.cards[i].x; S.cards[i].d = today(); S.cards[i].i = Math.min(S.cards[i].i, 7); save(); render(); });
  document.getElementById('del')?.addEventListener('click', () => { if (confirm('Dit woord uit je herhaling halen? De voortgang van dit woord gaat verloren.')) { delete S.cards[i]; save(); render(); } });
  let shown = 0;
  const more = document.getElementById('more');
  more?.addEventListener('click', async () => {
    more.disabled = true; more.textContent = 'Laden…';
    const seen = new Set(), pick = [];
    for (const o of elsewhere.slice(shown)) { if (pick.length >= 6) break; if (!seen.has(o[0]) || elsewhere.length - shown < 12) { pick.push(o); seen.add(o[0]); } }
    await Promise.all([...new Set(pick.map(o => o[0]))].map(n => loadSurah(n).then(() => loadV(n))));
    document.getElementById('else').insertAdjacentHTML('beforeend', pick.map(o => contextBlock(...o, { breakdown: true })).join(''));
    const used = new Set(pick.map(o => o.join(':')));
    elsewhere.splice(shown, elsewhere.length - shown, ...pick, ...elsewhere.slice(shown).filter(o => !used.has(o.join(':'))));
    shown += pick.length;
    more.disabled = false; more.textContent = 'Meer voorbeelden';
    if (shown >= elsewhere.length) more.remove();
  });
});

/* ---------------- woordenboeken ---------------- */
const LEXNAMES = { mf: ['المفردات في غريب القرآن', 'ar-Rāghib al-Iṣfahānī — betekenis in de Koran'], mq: ['مقاييس اللغة', 'Ibn Fāris — grondidee (الأصل) van de wortel'], ln: ["Lane's Lexicon", 'Engels, klassiek en zeer uitgebreid'] };
async function lexBlock(root, el, first) {
  const ix = LEXIDX[root];
  if (!ix) { el.innerHTML = '<p class="muted small">Geen woordenboekartikel gevonden voor deze wortel. Gebruik de online links.</p>'; return; }
  await loadLx(ix[0]);
  const e = QW.lx[ix[0]]?.[root];
  if (!e) { el.innerHTML = '<p class="muted small">Woordenboek niet beschikbaar (offline en nog niet gedownload?).</p>'; return; }
  const tabs = ['mq', 'mf', 'ln'].filter(k => e[k]);
  let cur = first && e[first] ? first : tabs[0];
  const body = k => k === 'mq' ? `<div dir="rtl" class="lexar"><div class="axes">${e.mq[0].map(x => `<span class="badge r0">${esc(x)}</span>`).join(' ')}</div>${e.mq[1]}<p class="small muted" dir="ltr">Fragment; het volledige artikel staat in Maqāyīs al-Lugha.</p></div>`
    : k === 'mf' ? `<div dir="rtl" class="lexar">${e.mf}</div>` : `<div class="lexen">${e.ln}</div>`;
  const draw = () => {
    el.innerHTML = `<div class="chips">${tabs.map(k => `<button data-lx="${k}" class="${k === cur ? 'on' : ''}">${esc(LEXNAMES[k][0])}</button>`).join('')}</div>
      <p class="small muted" style="margin:0 0 6px">${esc(LEXNAMES[cur][1])}</p><div class="lexbox">${body(cur)}</div>`;
    el.querySelectorAll('[data-lx]').forEach(b => b.onclick = () => { cur = b.dataset.lx; draw(); });
  };
  draw();
}

/* ---------------- Vers bestuderen ---------------- */
route(/^\/vers\/(\d+)\/(\d+)$/, async (s, a) => {
  s = +s; a = +a; const sur = SUR[s - 1]; if (!sur || a < 1 || a > sur[4]) { location.hash = '#/soeras'; return; }
  $main.innerHTML = '<p class="muted center">Vers laden…</p>';
  await loadSurah(s); await loadV(s);
  const v = QW.s[s].v[a - 1], V = QW.v[s];
  const words = v[1].map((w, k) => {
    const t = tbFor(s, a, k + 1), rel = t ? t.map(x => x[2]).filter(Boolean).join(' · ') : '', pos = t ? t.map(x => x[1]).join(' + ') : '';
    return `<tr data-w="${s}:${a}:${k + 1}"><td class="ar big">${esc(w[0])}</td><td dir="rtl" class="small">${esc(pos)}${rel ? `<br><b>${esc(rel)}</b>` : ''}</td><td class="small">${esc(meaning(w[3]))}<br><span class="muted">${esc(w[1])}</span></td></tr>`;
  }).join('');
  const sa = V ? V.sa.filter(b => b[0].includes(a)) : [], ir = darwishBlock(s, a);
  const gh = V ? V.gh[a - 1] : [];
  $main.innerHTML = `<div class="row between"><a href="#/soera/${s}/tekst" class="small">← ${esc(sur[1])}</a>
    <span class="small">${a > 1 ? `<a href="#/vers/${s}/${a - 1}">‹ vorig</a>` : ''} ${s}:${a} ${a < sur[4] ? `<a href="#/vers/${s}/${a + 1}">volgend ›</a>` : ''}</span></div>
  <div class="card" style="margin-top:8px"><div class="verse"><div class="arline">${verseArabic(s, a, -1, { clickable: true })} <span class="vno">﴿${a}﴾</span></div></div>
    ${nlBlock(v[0])}</div>
  ${!V ? '<div class="card small muted">Tafsir en i\'rab voor deze soera zijn nog niet gedownload (offline?). Ga online of gebruik "Download alles" in Meer.</div>' : ''}
  <h2>Woord voor woord · الإعراب</h2>
  <div class="card" style="padding:4px 8px;overflow-x:auto"><table class="wtab"><tr><th>الكلمة</th><th dir="rtl">النوع · الإعراب</th><th>betekenis</th></tr>${words}</table>
    <p class="small muted">Tik op een woord voor opbouw, i'rab uit إعراب القرآن وبيانه en betekenis. Bron: The Quranic Treebank (op basis van het Quranic Arabic Corpus).</p></div>
  ${gh.length ? `<h2>غريب الكلمات</h2><div class="card lexar" dir="rtl">${gh.map(g => `<p><b>${esc(g[0])}:</b> ${g[1]} <small class="muted">— ${esc(g[2])}</small></p>`).join('')}</div>` : ''}
  ${V ? `<h2>التفسير الميسر</h2><div class="card lexar" dir="rtl">${V.mu[a - 1]}</div>` : ''}
  ${sa.length ? `<details class="card"><summary><b>تفسير السعدي</b> (تيسير الكريم الرحمن)</summary><div class="lexar" dir="rtl">${sa.map(b => b[1]).join('<hr>')}</div></details>` : ''}
  ${ir ? `<details class="card" open><summary><b>إعراب القرآن وبيانه</b> — محيي الدين درويش <span class="small muted">(verzen ${ir[0][0]}–${ir[0][ir[0].length - 1]}: اللغة · الإعراب · البلاغة · الفوائد)</span></summary><div class="lexar irabfull" dir="rtl">${ir[1]}</div></details>` : ''}`;
  $main.querySelectorAll('[data-w]').forEach(el => el.addEventListener('click', () => { const [s2, a2, k2] = el.dataset.w.split(':').map(Number); wordSheet(s2, a2, k2); }));
});

/* ---------------- Wortels ---------------- */
route(/^\/wortels$/, async () => {
  $main.innerHTML = `<h1>Wortels</h1>
  <p class="muted small">Bijna elk Arabisch woord is gebouwd op een wortel van 3 (soms 4) letters. Ken je de wortel, dan herken je de hele familie. Gesorteerd op hoe vaak de wortel in de Koran voorkomt.</p>
  <input type="search" id="q" placeholder="Zoek wortel (bv. رحم) of betekenis…" style="margin-bottom:10px">
  <div class="chips" id="flt"><button data-f="all" class="on">Alle</button><button data-f="mine">Mijn wortels</button></div>
  <div class="card" style="padding:4px 12px"><ul class="list" id="rl"></ul></div>
  <button class="btn block" id="morer">Meer tonen</button>`;
  let lim = 60, f = 'all', q = '';
  const draw = () => {
    const nq = normRoot(q), tq = q.toLowerCase().trim();
    let list = ROOT_LIST.filter(r => (f === 'all' || ROOTS[r][2].some(j => S.cards[j])) && (!q || (nq && normRoot(r).includes(nq)) || (!nq && ROOTS[r][0].toLowerCase().includes(tq))));
    document.getElementById('rl').innerHTML = list.slice(0, lim).map(r => {
      const R = ROOTS[r], k = R[2].filter(j => S.cards[j]).length;
      return `<li><a class="item" href="#/wortel/${encodeURIComponent(r)}"><span class="rootletters ar small-root">${esc(spaced(r))}</span>
        <span class="grow"><b>${esc(R[0])}</b><br><span class="muted small">${R[2].length} woorden · ${R[3]}×</span>
        <div class="bar" style="margin-top:4px;max-width:200px"><i style="width:${k / R[2].length * 100}%"></i></div></span>
        <span class="small muted">${k}/${R[2].length}</span></a></li>`;
    }).join('') || '<li class="item muted">Niets gevonden</li>';
    document.getElementById('morer').classList.toggle('hidden', list.length <= lim);
  };
  draw();
  document.getElementById('q').addEventListener('input', e => { q = e.target.value; lim = 60; draw(); });
  document.getElementById('morer').onclick = () => { lim += 100; draw(); };
  document.getElementById('flt').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; document.querySelectorAll('#flt button').forEach(x => x.classList.toggle('on', x === b)); f = b.dataset.f; draw(); });
});
route(/^\/wortel\/(.+)$/, async r => {
  const R = ROOTS[r]; if (!R) { location.hash = '#/wortels'; return; }
  const ids = R[2], k = ids.filter(j => S.cards[j]).length;
  $main.innerHTML = `<a href="#/wortels" class="small">← Alle wortels</a>
  <div class="card center" style="margin-top:8px">
    <div class="rootletters ar" style="font-size:3.2rem">${esc(spaced(r))}</div>
    <div class="prompt-nl" style="margin:4px 0">${esc(R[0])}</div>
    <div class="muted small">kernbetekenis (van <span class="ar">${esc(LEM[R[1]][0])}</span>) · ${ids.length} woorden · ${R[3]}× in de Koran · ${k} geleerd</div>
    <div class="row wrap" style="justify-content:center;margin-top:12px">
      <button class="btn primary" id="lf" ${newCandidates(0, 1, ids).length ? '' : 'disabled'}>Leer deze familie</button>
      <button class="btn" id="pf">Oefen familie (typen)</button>
      <a class="btn" target="_blank" rel="noopener" href="https://ejtaal.net/aa/#q=${encodeURIComponent(toBW(r))}">Lane / Hans Wehr ↗</a>
    </div>
  </div>
  <div class="card" id="lex"><p class="muted small">Woordenboeken laden…</p></div>
  <div class="card small"><b>Zo gebruik je een wortel</b><p class="muted" style="margin:4px 0 0">Zoek het gemeenschappelijke idee in alle woorden hieronder. Schrijf de wortel groot in je schrift, met de vormen eronder en hun betekenis. Bij een nieuw woord: zoek eerst de 3 wortelletters, dan weet je vaak al de richting van de betekenis.</p></div>
  <div class="card" style="padding:4px 12px"><ul class="list">${ids.map(j => wordRow(j, `${posLabel(LEM[j])} · ${LEM[j][4]}×`)).join('')}</ul></div>`;
  lexBlock(r, document.getElementById('lex'), 'mq');
  document.getElementById('lf').onclick = () => startLearn(newCandidates(0, 8, ids), dueIds(j => ids.includes(j)), 'Wortelfamilie ' + spaced(r));
  document.getElementById('pf').onclick = () => startPractice(ids, 'Familie ' + spaced(r));
});

/* ---------------- Mijn woorden + statistiek + zoeken ---------------- */
route(/^\/woorden$/, async () => {
  const ids = Object.keys(S.cards).map(Number);
  const t = today();
  const days = []; let maxN = 1;
  for (let d = t - 29; d <= t; d++) { const n = S.hist[d]?.n || 0; maxN = Math.max(maxN, n); days.push([d, n]); }
  const H = Object.values(S.hist), tot = H.reduce((a, h) => a + h.n, 0), ok = H.reduce((a, h) => a + h.c, 0), mins = Math.round(H.reduce((a, h) => a + (h.ms || 0), 0) / 60000);
  const activeDays = H.filter(h => h.n > 0).length, rootsTouched = new Set(ids.map(i => LEM[i][1]).filter(Boolean)).size;
  $main.innerHTML = `<div class="row between"><h1>Mijn woorden</h1><a class="btn sm" href="#/zoek">⌕ Zoek woord</a></div>
  <div class="card"><b>Laatste 30 dagen</b>
    <div class="chart">${days.map(([d, n]) => `<i title="${n}" class="${dayDone(d) ? 'on' : ''}" style="height:${Math.max(2, n / maxN * 100)}%"></i>`).join('')}</div>
    <div class="stats" style="margin-top:10px">
      <div class="stat"><b>${tot}</b><span>antwoorden</span></div>
      <div class="stat"><b>${tot ? Math.round(ok / tot * 100) : 0}%</b><span>goed</span></div>
      <div class="stat"><b>${mins}</b><span>minuten</span></div>
      <div class="stat"><b>${activeDays}</b><span>actieve dagen</span></div>
      <div class="stat"><b>${rootsTouched}</b><span>wortels</span></div>
      <div class="stat"><b>${H.reduce((a, h) => a + (h.w || 0), 0)}</b><span>schrijfopdrachten</span></div>
    </div></div>
  <div class="chips" id="flt"><button data-f="due" class="on">Te herhalen</button><button data-f="all">Alle</button><button data-f="hard">Lastig</button><button data-f="done">Begrepen ✓</button><button data-f="r">⚠ Onderzoek</button></div>
  <div class="card" style="padding:4px 12px"><ul class="list" id="wl"></ul></div>
  ${ids.some(i => S.cards[i].l >= 2) ? '<button class="btn block" id="hardp">Oefen lastige woorden (typen)</button>' : ''}`;
  const draw = f => {
    const list = ids.filter(i => f === 'all' || (f === 'due' ? !S.cards[i].x && S.cards[i].d <= t : f === 'hard' ? S.cards[i].l >= 2 && !S.cards[i].x : f === 'done' ? S.cards[i].x : LEM[i][6] === 2)).sort((a, b) => f === 'hard' ? S.cards[b].l - S.cards[a].l : a - b);
    document.getElementById('wl').innerHTML = list.slice(0, 400).map(i => { const c = S.cards[i]; return wordRow(i, c.x ? 'komt niet meer terug' : `${c.d <= t ? 'vandaag' : 'over ' + (c.d - t) + ' d'} · ${c.k || 0}/${c.n || 0} goed${c.l >= 3 ? ' · ✍ schrijf op' : ''}`); }).join('') || `<li class="item muted">${ids.length ? 'Niets in dit filter' : 'Nog geen woorden. Start op "Vandaag".'}</li>`;
  };
  draw('due');
  document.getElementById('flt').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; document.querySelectorAll('#flt button').forEach(x => x.classList.toggle('on', x === b)); draw(b.dataset.f); });
  document.getElementById('hardp')?.addEventListener('click', () => startPractice(ids.filter(i => S.cards[i].l >= 2 && !S.cards[i].x), 'Lastige woorden'));
});

route(/^\/zoek$/, async () => {
  $main.innerHTML = `<h1>Zoek een woord</h1><input type="search" id="q" placeholder="Arabisch, Nederlands of Engels…" autofocus>
  <p class="small muted">Arabisch mag zonder klinkertekens. Een wortel zoeken kan ook, bv. <span class="ar">رحم</span>.</p>
  <div class="card" style="padding:4px 12px"><ul class="list" id="res"><li class="item muted">Typ om te zoeken</li></ul></div>`;
  const q = document.getElementById('q');
  q.addEventListener('input', () => {
    const v = q.value.trim(); if (v.length < 2) return;
    const isAr = /[؀-ۿ]/.test(v), nv = isAr ? stripAr(v) : v.toLowerCase();
    const out = [];
    for (let i = 0; i < LEM.length && out.length < 60; i++) {
      const L = LEM[i];
      const hit = isAr ? (stripAr(L[0]).includes(nv) || normRoot(L[1]) === normRoot(v)) : ((L[5] || '').toLowerCase().includes(nv) || L[9].some(e => e.toLowerCase().includes(nv)));
      if (hit) out.push(i);
    }
    document.getElementById('res').innerHTML = out.map(i => wordRow(i, `${posLabel(LEM[i])} · ${LEM[i][4]}×`)).join('') || '<li class="item muted">Niets gevonden</li>';
  });
});

/* ---------------- Lezen ---------------- */
async function readingVerses(ids) {
  await loadOcc();
  const cand = new Map();
  for (const i of ids.slice(0, 12)) {
    const occ = occOf(i);
    const pref = occ.filter(o => o[0] === S.cards[i]?.s).concat(occ).slice(0, 4);
    for (const o of pref) cand.set(o[0] + ':' + o[1], [o[0], o[1]]);
  }
  const surahs = [...new Set([...cand.values()].map(c => c[0]))].slice(0, 10);
  await Promise.all(surahs.map(loadSurah));
  const tg = new Set(ids);
  const scored = [...cand.values()].filter(([s]) => QW.s[s]).map(([s, a]) => {
    const ws = QW.s[s].v[a - 1][1];
    const kn = ws.filter(w => knownish(w[3])).length;
    return { s, a, score: kn / ws.length - (ws.length > 30 ? 0.3 : 0), t: ws.filter(w => tg.has(w[3])).length };
  }).filter(x => x.t).sort((x, y) => y.score - x.score);
  return scored.slice(0, 5);
}
route(/^\/lezen$/, async () => {
  let ids = (S.read || []).filter(i => S.cards[i]);
  if (!ids.length) ids = Object.keys(S.cards).map(Number).sort((a, b) => (S.cards[b].f - S.cards[a].f) || (a - b)).slice(0, 10);
  if (!ids.length) { $main.innerHTML = '<div class="card">Nog geen woorden geleerd. Start eerst een ronde op "Vandaag".</div>'; return; }
  $main.innerHTML = '<p class="muted center">Verzen zoeken…</p>';
  const vs = await readingVerses(ids);
  const tg = new Set(ids);
  let k = 0;
  const draw = () => {
    if (k >= vs.length) {
      hToday().rd = (hToday().rd || 0) + vs.length; save();
      $main.innerHTML = `<div class="card center"><div style="font-size:2.4rem">📖</div><h1>${vs.length} verzen gelezen</h1><p class="muted">Lees ze morgen nog eens: je zult merken dat het steeds sneller gaat.</p><a class="btn primary" href="#/">Naar Vandaag</a></div>`;
      return;
    }
    const { s, a } = vs[k];
    $main.innerHTML = `<div class="qhead"><a href="#/" class="small">✕</a><div class="bar"><i style="width:${k / vs.length * 100}%"></i></div><span class="small muted">${k + 1}/${vs.length}</span></div>
    <div class="card">
      <div class="qlabel">Lees en begrijp · ${esc(SUR[s - 1][1])} ${s}:${a}</div>
      ${interlinear(s, a, { targets: tg })}
      <p class="small muted">Gemarkeerd = woorden uit je laatste ronde. Onder bekende woorden staat ···: tik alleen als je echt niet meer weet.</p>
      <textarea id="own" rows="2" placeholder="Jouw vertaling (in je hoofd, hier of in je schrift)…"></textarea>
      <button class="btn block" id="tr" style="margin-top:8px">Toon vertaling</button>
      <div id="nl" class="nlline hidden" style="margin-top:10px">${esc(QW.s[s].v[a - 1][0])}</div>
      <button class="btn primary block" id="nx" style="margin-top:10px">Volgend vers →</button>
    </div>`;
    document.getElementById('tr').onclick = () => document.getElementById('nl').classList.remove('hidden');
    document.getElementById('nx').onclick = () => { k++; draw(); window.scrollTo(0, 0); };
    $main.querySelector('.inter').addEventListener('click', e => { const w = e.target.closest('[data-w]'); if (w && !e.target.closest('[data-reveal]')) { const [s2, a2, kk] = w.dataset.w.split(':').map(Number); wordSheet(s2, a2, kk); } });
  };
  if (!vs.length) { $main.innerHTML = '<div class="card">Geen geschikte verzen gevonden.</div>'; return; }
  draw();
});

/* ---------------- Instellingen ---------------- */
route(/^\/instellingen$/, async () => {
  const st = S.set;
  const persisted = await navigator.storage?.persisted?.().catch(() => false);
  const offline = 'serviceWorker' in navigator && navigator.serviceWorker.controller ? true : false;
  $main.innerHTML = `<h1>Instellingen</h1>
  <div class="card">
    <h2>Kort en elke dag</h2>
    <label class="field"><span>Lengte van een ronde</span><select id="len">
      <option value="10">Heel kort (≈ 3 min)</option><option value="15">Kort (≈ 5 min) — aanbevolen</option><option value="25">Normaal (≈ 8 min)</option><option value="40">Lang (≈ 15 min)</option></select></label>
    <label class="field"><span>Dagdoel voor je streak (aantal antwoorden)</span><input type="number" id="goal" min="5" max="300" value="${st.goal}"></label>
    <label class="field"><span>Nieuwe woorden per dag</span><input type="number" id="newPerDay" min="0" max="100" value="${st.newPerDay}"></label>
    <label class="field"><span>Dagelijkse herinnering</span><div class="row"><input type="time" id="remind" value="${st.remind}" style="max-width:140px"><button class="btn" id="ics">Zet in mijn agenda</button></div>
      <small class="muted">Maakt een dagelijks terugkerende afspraak met melding in je agenda (iPhone/Android/Mac).</small></label>
  </div>
  <div class="card">
    <h2>Oefenen</h2>
    <label class="field"><span>Oefenvorm</span><select id="mode">
      <option value="type">Typen (actief ophalen) — aanbevolen</option><option value="mix">Afwisselend (typen, meerkeuze, kaart)</option><option value="mc">Meerkeuze</option><option value="flip">Flashcard (zelf beoordelen)</option></select></label>
    <label class="field"><span>Richting</span><select id="dir">
      <option value="mix">Gemengd</option><option value="ar">Arabisch → Nederlands</option><option value="nl">Nederlands → Arabisch</option></select></label>
    <label class="field"><span>Arabisch typen met</span><select id="kb"><option value="scherm">Schermtoetsenbord in de app</option><option value="systeem">Eigen (telefoon)toetsenbord</option></select></label>
    <label class="field"><span>Nederlandse versvertaling</span><select id="nl"><option value="ingeklapt">Ingeklapt — eerst Arabische tafsir (aanbevolen)</option><option value="tonen">Altijd tonen</option><option value="nooit">Niet tonen</option></select></label>
    <label class="check"><input type="checkbox" id="skipFunc" ${st.skipFunc ? 'checked' : ''}> Functiewoorden (voorzetsels, voornaamwoorden…) overslaan bij nieuwe woorden</label>
    <p class="small muted" style="margin:0">Herhalingen wisselen tussen: betekenis typen, Arabisch typen, wortel typen, woordvorm ontleden en i'rab (functie in de zin).</p>
  </div>
  <div class="card"><h2>Opslag &amp; back-up</h2>
    <p class="small">Opslag op dit apparaat: ${persisted ? '<b style="color:var(--good)">blijvend ✓</b>' : '<b>niet gegarandeerd</b> — installeer de app op je beginscherm en maak back-ups'} · offline: ${offline ? '<b style="color:var(--good)">klaar ✓</b>' : 'nog niet (alleen via de geïnstalleerde/online versie)'}</p>
    <p class="muted small">Alles (woorden, streaks, statistiek) wordt automatisch bewaard op dit apparaat. Een back-up kun je op een ander apparaat weer importeren.</p>
    <div class="row wrap"><button class="btn primary" data-backup>Back-up opslaan / delen</button><label class="btn">Back-up terugzetten<input type="file" id="imp" accept="application/json,.json" hidden></label>
    <button class="btn" id="reset" style="color:var(--bad)">Alles wissen</button></div>
    <p class="small muted">Laatste back-up: ${S.lastBackup ? (today() - S.lastBackup === 0 ? 'vandaag' : (today() - S.lastBackup) + ' dagen geleden') : 'nog nooit'}</p>
  </div>
  <div class="card small"><h2>Studiebronnen offline</h2>
    <p class="muted">Tafsir, i'rab en woordenboeken (± 60 MB, ± 15 MB downloaden) worden per soera/wortel geladen zodra je ze opent. Met deze knop haal je alles in één keer binnen, zodat ook dit volledig offline werkt.</p>
    <button class="btn" id="dlall">Download alles voor offline</button><div id="dlprog" class="small muted" style="margin-top:6px"></div></div>
  <div class="card small"><h2>Op je telefoon zetten</h2>
    <p><b>iPhone:</b> open de app-link in Safari → deelknop <b>⎋</b> → <i>Zet op beginscherm</i>.<br><b>Android:</b> open in Chrome → menu <b>⋮</b> → <i>App installeren</i>.</p>
    <p class="muted">Daarna werkt alles offline (behalve audio die je nog niet gehoord hebt).</p>
    <button class="btn hidden" id="install">Installeer app</button></div>
  <div class="card small"><h2>Schrift-methode</h2>
    <p class="muted">Na elke ronde krijg je een korte schrijfopdracht voor je lastigste woorden: wortel groot, de vormen met betekenis, het vers overschrijven met het woord onderstreept, en je eigen vertaling. Schrijven met de hand versterkt het geheugen en traint het herkennen van woordvormen.</p></div>
  <div class="card small"><h2>Bronnen</h2>
    <ul class="muted">
      <li>Koran-tekst, woord-voor-woord (EN), audio: quran.com</li>
      <li>Wortels, grondvormen, woordopbouw: <a href="https://corpus.quran.com" target="_blank" rel="noopener">Quranic Arabic Corpus</a> (Kais Dukes, GPL)</li>
      <li>التفسير الميسر، تفسير السعدي، إعراب القرآن وبيانه (درويش)، غريب القرآن (السراج، ابن الهائم، تذكرة الأريب، كلمات القرآن)، المفردات للراغب: <a href="https://quranpedia.net" target="_blank" rel="noopener">Quranpedia.net</a></li>
      <li>I'rab per woord: <a href="https://github.com/NoorBayan/Quranic" target="_blank" rel="noopener">The Quranic Treebank</a> (MIT)</li>
      <li>مقاييس اللغة (ابن فارس): via github.com/hhiyassat/Maqaiys-roots (fragmenten)</li>
      <li>Lane's Arabic-English Lexicon: <a href="https://github.com/laneslexicon/LexiconDatabase" target="_blank" rel="noopener">laneslexicon</a> (GPL)</li>
      <li>Nederlandse versvertaling (optioneel): Malak Faris Abdalsalaam</li>
    </ul>
    <p class="muted">De Nederlandse grondbetekenissen zijn een leerhulp; de Arabische bronnen gaan voor.</p></div>`;
  for (const [id, v] of [['len', st.len], ['mode', st.mode], ['dir', st.dir], ['kb', st.kb], ['nl', st.nl]]) document.getElementById(id).value = String(v);
  const upd = () => {
    st.goal = Math.max(1, +document.getElementById('goal').value || 15); st.newPerDay = Math.max(0, +document.getElementById('newPerDay').value || 0);
    st.len = +document.getElementById('len').value; st.mode = document.getElementById('mode').value; st.dir = document.getElementById('dir').value; st.kb = document.getElementById('kb').value; st.nl = document.getElementById('nl').value;
    st.skipFunc = document.getElementById('skipFunc').checked; st.remind = document.getElementById('remind').value || '19:00'; save(); toast('Opgeslagen');
  };
  $main.querySelectorAll('input:not([type=file]),select').forEach(el => el.addEventListener('change', upd));
  document.getElementById('ics').onclick = () => reminderIcs(st.remind);
  document.getElementById('imp').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try { const x = JSON.parse(await f.text()); if (!x.cards || !x.hist) throw new Error('geen geldig back-upbestand');
      if (!confirm('Huidige voortgang vervangen door deze back-up?')) return;
      S = merge(x); save(); toast('Back-up teruggezet'); render();
    } catch (err) { toast('Terugzetten mislukt: ' + err.message); }
  };
  document.getElementById('reset').onclick = () => { if (confirm('Alle voortgang, streaks en instellingen wissen? Dit kan niet ongedaan worden gemaakt (tenzij je een back-up hebt).')) { S = clone(DEF); S.created = today(); save(); render(); } };
  document.getElementById('dlall').onclick = async e => {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) { toast('Werkt alleen in de geïnstalleerde/online versie'); return; }
    e.target.disabled = true; const pr = document.getElementById('dlprog');
    const files = [...Array.from({ length: 114 }, (_, i) => 'data/v' + (i + 1) + '.js'), ...[...new Set(Object.values(LEXIDX).map(x => x[0]))].map(k => 'data/lx' + k + '.js')];
    let done = 0, fail = 0;
    for (let i = 0; i < files.length; i += 6) {
      await Promise.all(files.slice(i, i + 6).map(f => fetch(f).then(r => { if (!r.ok) fail++; }).catch(() => fail++).finally(() => { done++; pr.textContent = `${done}/${files.length} bestanden…`; })));
    }
    pr.textContent = fail ? `Klaar, ${fail} mislukt — probeer opnieuw met een goede verbinding.` : 'Alles staat offline op dit apparaat ✓';
    e.target.disabled = false;
  };
  if (installEvt) { const b = document.getElementById('install'); b.classList.remove('hidden'); b.onclick = () => { installEvt.prompt(); installEvt = null; b.remove(); }; }
});
async function backup() {
  const name = 'koranwoorden-backup-' + new Date().toISOString().slice(0, 10) + '.json';
  const blob = new Blob([JSON.stringify(S)], { type: 'application/json' });
  try {
    const file = new File([blob], name, { type: 'application/json' });
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: 'Koranwoorden back-up' }); S.lastBackup = today(); save(); render(); return; }
  } catch (e) { if (e.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
  S.lastBackup = today(); save(); setTimeout(render, 300);
}
function reminderIcs(time) {
  const [hh, mm] = time.split(':'), d = new Date(), ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Koranwoorden//NL', 'BEGIN:VEVENT', `UID:koranwoorden-${Date.now()}@lokaal`, `DTSTAMP:${ymd}T000000Z`,
    `DTSTART:${ymd}T${hh}${mm}00`, 'DURATION:PT5M', 'RRULE:FREQ=DAILY', 'SUMMARY:Koranwoorden – korte ronde (5 min)', 'DESCRIPTION:Houd je streak vast: één korte ronde + een vers lezen.',
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Koranwoorden', 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })); a.download = 'koranwoorden-herinnering.ics'; a.click();
}
let installEvt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; });

/* ---------------- Oefensessies ---------------- */
let SES = null;
function pickDir() { const d = S.set.dir; return d === 'mix' ? (Math.random() < .5 ? 'ar' : 'nl') : d; }
function reviewKind(i, ctx) {
  const c = S.cards[i], m = S.set.mode, r = Math.random();
  const base = m === 'mix' ? ['type', 'type', 'mc', 'flip'][Math.floor(Math.random() * 4)] : m;
  if (base === 'flip' || !c || c.r < 2) return base;
  const w = QW.s[ctx[0]] ? wordAt(...ctx) : null;
  if (LEM[i][1] && r < 0.18) return 'root';
  if (w && interestingForm(w) && r < 0.4) return 'form';
  if (w && irabRel(...ctx) && r < 0.58) return 'irab';
  return base;
}
async function startDaily(extra) {
  const len = S.set.len;
  let due = dueIds().slice(0, len);
  const nNew = extra ? Math.min(3, newLeftToday()) : Math.min(newLeftToday(), Math.max(2, Math.ceil(len / 3)));
  const fresh = newCandidates(S.focus, nNew);
  if (extra && !due.length && !fresh.length) {
    const pool = Object.keys(S.cards).map(Number).filter(i => !S.cards[i].x);
    if (!pool.length) { toast('Nog geen woorden — kies eerst nieuwe woorden'); return; }
    return startPractice(pool, 'Extra ronde');
  }
  await startLearn(fresh, due, extra ? 'Extra ronde' : 'Dagelijkse ronde', S.focus);
}
async function startLearn(fresh, due, title, surah) {
  const items = [], dueItems = due.map(i => ({ i })), newItems = fresh.map(i => ({ i, kind: 'intro' }));
  while (dueItems.length || newItems.length) {
    if (newItems.length) items.push(newItems.shift());
    for (let k = 0; k < 3 && dueItems.length; k++) items.push(dueItems.shift());
  }
  await startSession({ title, items, surah });
}
async function startPractice(pool, title, surah) {
  let p = pool.filter(i => !S.cards[i]?.x);
  const seen = p.filter(i => S.cards[i]);
  if (seen.length >= 4) p = seen;
  if (!p.length) { toast('Niets te oefenen'); return; }
  await startSession({ title, practice: true, items: shuffle(p).slice(0, S.set.len).map(i => ({ i })), surah });
}
function chooseContext(i, surah) {
  if (surah && IDX[surah]?.has(i)) { const l = IDX[surah].get(i); const o = l[Math.floor(Math.random() * l.length)]; return [surah, ...o]; }
  const occ = occOf(i), c = S.cards[i];
  if (c && c.r >= 2 && Math.random() < .6) return occ[Math.floor(Math.random() * occ.length)];
  if (c?.s) { const o = occ.find(x => x[0] === c.s); if (o) return o; }
  return occ[0];
}
async function startSession(cfg) {
  if (!cfg.items.length) { toast('Niets te oefenen'); return; }
  $main.innerHTML = '<p class="muted center">Ronde voorbereiden…</p>';
  askPersist();
  await loadOcc();
  if (cfg.surah) await loadSurah(cfg.surah);
  for (const it of cfg.items) it.ctx = chooseContext(it.i, cfg.surah);
  await Promise.all([...new Set(cfg.items.map(it => it.ctx[0]))].map(n => loadSurah(n).then(() => loadV(n))));
  for (const it of cfg.items) if (!it.kind) { it.kind = cfg.practice ? (S.set.mode === 'mc' ? 'mc' : S.set.mode === 'flip' ? 'flip' : 'type') : reviewKind(it.i, it.ctx); it.dir = pickDir(); }
  SES = { ...cfg, pos: 0, graded: new Set(), ok: 0, n: 0, wrong: new Set(), learned: new Set(), retries: {}, start: Date.now(), last: Date.now() };
  if (location.hash === '#/oefen') renderQ(); else location.hash = '#/oefen';
}
route(/^\/oefen$/, async () => { if (!SES) { location.hash = '#/'; return; } renderQ(); });

function distractors(i, dir) {
  const L = LEM[i], want = meaning(i), out = [], seen = new Set([want, L[0]]);
  const near = [];
  for (let d = 1; d < 400 && near.length < 60; d++) for (const j of [i - d, i + d]) if (j >= 0 && j < LEM.length && LEM[j][2] === L[2]) near.push(j);
  for (const j of shuffle(near)) {
    const key = dir === 'ar' ? meaning(j) : LEM[j][0];
    if (seen.has(key) || meaning(j) === want || stripAr(LEM[j][0]) === stripAr(L[0])) continue;
    seen.add(key); out.push(j); if (out.length === 3) break;
  }
  return out;
}
/* antwoordcontrole */
function normNl(s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\b(de|het|een|te|zich|to|the|a|an)\b/g, ' ').replace(/\s+/g, ' ').trim(); }
function nlAlts(i) {
  const m = LEM[i][5] || LEM[i][9].join(', '), alts = new Set();
  for (const p of m.split(/[,;/]|\bof\b/)) { alts.add(normNl(p.replace(/\([^)]*\)/g, ''))); alts.add(normNl(p.replace(/[()]/g, ''))); }
  return [...alts].filter(Boolean);
}
function checkNl(input, i) {
  const t = normNl(input); if (!t) return 0; let best = 0;
  for (const a of nlAlts(i)) {
    if (t === a || (a.length >= 3 && (' ' + t + ' ').includes(' ' + a + ' '))) return 2;
    const d = lev(t, a);
    if (d <= Math.max(1, Math.floor(a.length / 6))) best = Math.max(best, 2); else if (d <= Math.floor(a.length / 3)) best = Math.max(best, 1);
  }
  return best;
}
function checkAr(input, i) { const a = normAr(LEM[i][0]), t = normAr(input); if (!t) return 0; if (t === a) return 2; return a.length >= 4 && lev(t, a) <= 1 ? 1 : 0; }
const checkRoot = (input, i) => normRoot(input) === normRoot(LEM[i][1]) ? 2 : 0;

let keyHandler = null;
document.addEventListener('keydown', e => { if (keyHandler && location.hash === '#/oefen' && !e.metaKey && !e.ctrlKey) keyHandler(e); });
const head = () => `<div class="qhead"><a href="#/" class="small">✕</a><div class="bar"><i style="width:${SES.pos / SES.items.length * 100}%"></i></div><span class="small muted">${SES.pos + 1}/${SES.items.length}</span></div>`;
function renderQ() {
  keyHandler = null;
  while (SES.items[SES.pos]?.skip) SES.pos++;
  const it = SES.items[SES.pos];
  if (!it) return renderDone();
  const i = it.i, L = LEM[i], [s, a, w] = it.ctx, word = wordAt(s, a, w);
  if (it.kind === 'intro') {
    $main.innerHTML = head() + `<div class="card qcard">
      <div class="qlabel">Nieuw woord · #${i + 1} meest voorkomend</div>
      <div class="prompt-ar">${esc(L[0])}</div>
      <div class="prompt-nl">${esc(meaning(i))}</div>
      <div class="muted small">${posLabel(L)} · ${L[4]}× in de Koran</div>
      <div class="feedback">${rootBox(i)}${contextBlock(s, a, w, { window: 8, breakdown: interestingForm(word) })}${L[6] ? researchBox(i) : ''}</div>
      <button class="btn primary big block" id="nx">Begrepen → <span class="small" style="opacity:.7">(Enter)</span></button>
      <button class="btn block" id="exw" style="margin-top:8px">✓ Ken ik al overal — niet vragen</button></div>`;
    play(s, a, w);
    const next = () => {
      SES.learned.add(i);
      SES.items.splice(Math.min(SES.items.length, SES.pos + 3), 0, { i, ctx: it.ctx, dir: 'ar', kind: 'mc', isNew: true });
      if (S.set.mode !== 'mc' && S.set.mode !== 'flip') SES.items.splice(Math.min(SES.items.length, SES.pos + 7), 0, { i, ctx: it.ctx, dir: 'ar', kind: 'type', isNew: true });
      SES.pos++; renderQ();
    };
    document.getElementById('nx').onclick = next;
    document.getElementById('exw').onclick = () => { excludeWord(i, s); SES.pos++; renderQ(); };
    keyHandler = e => { if (e.key === 'Enter') { e.preventDefault(); next(); } };
    return;
  }
  const ctxAr = `<div class="context" style="text-align:right"><div class="arline">${verseArabic(s, a, w, { window: 6 })}</div><div class="ref" style="text-align:left">${s}:${a}</div></div>`;
  const ctxNl = `<div class="context"><div class="nlline">${esc(QW.s[s].v[a - 1][0])}</div><div class="ref">${s}:${a}</div></div>`;
  if (it.kind === 'irab') {
    const rel = irabRel(s, a, w);
    if (!rel) { it.kind = 'type'; it.dir = 'ar'; return renderQ(); }
    if (!it.opts) it.opts = shuffle([rel, ...shuffle(IRAB_SET.filter(x => x !== rel)).slice(0, 3)]);
    $main.innerHTML = head() + `<div class="card qcard"><div class="qlabel">الإعراب · wat is de functie van het gemarkeerde woord in de zin?</div>
      <div class="prompt-ar">${esc(word[0])}</div>${ctxAr}
      <div class="opts">${it.opts.map((x, k) => `<button class="btn opt ar-lbl" data-r="${esc(x)}"><kbd>${k + 1}</kbd>${esc(x)}</button>`).join('')}</div><div id="fb"></div></div>`;
    const answer = x => {
      if (it.answered) return; it.answered = true;
      $main.querySelectorAll('.opt').forEach(b => { b.disabled = true; if (b.dataset.r === rel) b.classList.add('right'); else if (b.dataset.r === x) b.classList.add('wrong'); });
      finish(it, x === rel ? 2 : 0);
    };
    $main.querySelectorAll('.opt').forEach(b => b.onclick = () => answer(b.dataset.r));
    keyHandler = e => { if (it.answered) { if (e.key === 'Enter') { e.preventDefault(); nextQ(); } return; } const k = +e.key; if (k >= 1 && k <= it.opts.length) answer(it.opts[k - 1]); };
    return;
  }
  let prompt = '', body = '';
  if (it.kind === 'root') {
    prompt = `<div class="qlabel">Wortel · typ de wortelletters van dit woord</div><div class="prompt-ar">${esc(word[0])}</div>${ctxAr}`;
    body = arInput('ans', 'bv. ر ح م') + checkButtons();
  } else if (it.kind === 'form') {
    prompt = `<div class="qlabel">Woordvorm · stap 1: typ de wortel</div><div class="prompt-ar">${esc(word[0])}</div><div class="muted small">${esc(word[2])}</div>${ctxAr}`;
    body = arInput('ans', 'wortelletters') + checkButtons();
  } else if (it.dir === 'ar') {
    prompt = `<div class="qlabel">Arabisch → Nederlands · wat betekent dit woord?</div><div class="prompt-ar">${esc(L[0])}</div>${ctxAr}`;
    if (it.kind === 'type') body = `<input id="ans" class="answer" autocomplete="off" autocapitalize="off" placeholder="typ de Nederlandse betekenis">` + checkButtons(true);
  } else {
    prompt = `<div class="qlabel">Nederlands → Arabisch · welk Arabisch woord is dit?</div><div class="prompt-nl">${esc(meaning(i))}</div><div class="muted small">${posLabel(L)}</div>${ctxNl}`;
    if (it.kind === 'type') body = arInput('ans', 'grondvorm, zonder klinkertekens') + checkButtons(true);
  }
  if (it.kind === 'mc') {
    if (!it.opts) it.opts = shuffle([i, ...distractors(i, it.dir)]);
    body = `<div class="opts">${it.opts.map((j, k) => `<button class="btn opt ${it.dir === 'nl' ? 'ar' : ''}" data-j="${j}"><kbd>${k + 1}</kbd>${esc(it.dir === 'ar' ? meaning(j) : LEM[j][0])}</button>`).join('')}</div>`;
  } else if (it.kind === 'flip') {
    body = `<button class="btn primary big block" id="show" style="margin-top:16px">Toon antwoord</button>`;
  }
  $main.innerHTML = head() + `<div class="card qcard">${prompt}${body}<div id="fb"></div></div>`;
  const inp = document.getElementById('ans');
  if (inp) setTimeout(() => inp.focus({ preventScroll: true }), 50);
  if (it.kind === 'mc') {
    const answer = j => {
      if (it.answered) return; it.answered = true;
      $main.querySelectorAll('.opt').forEach(b => { const jj = +b.dataset.j; b.disabled = true; if (jj === i) b.classList.add('right'); else if (jj === j) b.classList.add('wrong'); });
      finish(it, j === i ? 2 : 0);
    };
    $main.querySelectorAll('.opt').forEach(b => b.onclick = () => answer(+b.dataset.j));
    keyHandler = e => { if (it.answered) { if (e.key === 'Enter') { e.preventDefault(); nextQ(); } return; } const k = +e.key; if (k >= 1 && k <= it.opts.length) answer(it.opts[k - 1]); };
  } else if (it.kind === 'flip') {
    const show = () => {
      document.getElementById('show').remove();
      document.getElementById('fb').innerHTML = `<div class="prompt-${it.dir === 'ar' ? 'nl' : 'ar'}">${esc(it.dir === 'ar' ? meaning(i) : L[0])}</div>
        <div class="grades"><button class="btn" data-g="0">Opnieuw<small>1</small></button><button class="btn" data-g="1">Moeilijk<small>2</small></button><button class="btn" data-g="2">Goed<small>3</small></button><button class="btn" data-g="3">Makkelijk<small>4</small></button></div>`;
      $main.querySelectorAll('[data-g]').forEach(b => b.onclick = () => finish(it, +b.dataset.g));
      keyHandler = e => { const k = +e.key; if (k >= 1 && k <= 4) finish(it, k - 1); };
    };
    document.getElementById('show').onclick = show;
    keyHandler = e => { if (e.key === 'Enter') { e.preventDefault(); show(); } };
  } else {
    const check = () => {
      if (it.answered) return; const v = inp.value.trim(); if (!v) { inp.focus(); return; }
      it.answered = true; it.given = v; inp.disabled = true;
      let g = it.kind === 'root' || it.kind === 'form' ? checkRoot(v, i) : it.dir === 'ar' ? checkNl(v, i) : checkAr(v, i);
      if (it.hint && g === 2) g = 1;
      if (it.kind === 'form') return formStep2(it, g);
      finish(it, g);
    };
    document.getElementById('chk').onclick = check;
    document.getElementById('idk').onclick = () => { if (it.answered) return; it.answered = true; it.given = ''; inp.disabled = true; if (it.kind === 'form') formStep2(it, 0); else finish(it, 0); };
    document.getElementById('hint')?.addEventListener('click', e => {
      it.hint = true; const h = document.getElementById('hinttxt');
      h.innerHTML = it.dir === 'nl' && L[1] ? `wortel: <span class="ar">${esc(spaced(L[1]))}</span>` : it.dir === 'ar' ? `begint met: <b>${esc((meaning(i)[0] || '').toUpperCase())}…</b> (${meaning(i).split(/[,;]/)[0].length} letters)` : `begint met: <span class="ar">${esc(normAr(L[0])[0])}</span>`;
      e.target.disabled = true;
    });
    keyHandler = e => { if (e.key === 'Enter') { e.preventDefault(); if (it.answered) { if (it.done) nextQ(); } else check(); } };
  }
}
function checkButtons(withHint) {
  return `<div class="row wrap" style="margin-top:10px"><button class="btn primary grow" id="chk">Controleer</button><button class="btn" id="idk">Weet ik niet</button>${withHint ? '<button class="btn" id="hint">Hint</button>' : ''}</div><div id="hinttxt" class="small muted" style="margin-top:6px"></div>`;
}
function formStep2(it, rootG) {
  const i = it.i, [s, a, w] = it.ctx, word = wordAt(s, a, w);
  document.getElementById('fb').innerHTML = `<div class="verdict ${rootG ? 'ok' : 'no'}">${rootG ? 'Wortel goed ✓' : `Wortel: <span class="ar">${esc(spaced(LEM[i][1]))}</span>`}</div>
    <div class="feedback"><div class="qlabel" style="text-align:left">Stap 2 · zo is dit woord opgebouwd</div>${breakdown(word)}
    <p class="small">In dit vers: <i>${esc(word[1])}</i> (EN)</p>
    <p><b>Begreep je wie / wanneer / wat deze vorm uitdrukt?</b></p>
    <div class="grades" style="grid-template-columns:repeat(3,1fr)"><button class="btn" data-g="0">Nee</button><button class="btn" data-g="1">Deels</button><button class="btn" data-g="2">Ja</button></div></div>`;
  $main.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { const g = +b.dataset.g; finish(it, rootG ? g : (g === 2 ? 1 : 0)); });
  keyHandler = null;
}
function finish(it, g) {
  const i = it.i, [s, a, w] = it.ctx, ok = g > 0;
  const now = Date.now(); hToday().ms = (hToday().ms || 0) + Math.min(60000, now - SES.last); SES.last = now;
  SES.n++; if (ok) SES.ok++; else SES.wrong.add(i);
  const firstTime = !SES.graded.has(i);
  it.prev = S.cards[i] ? clone(S.cards[i]) : null; it.g = g; it.first = firstTime;
  if (firstTime) { SES.graded.add(i); if (!SES.practice) grade(i, g, s); }
  const c = S.cards[i]; if (c) { c.n = (c.n || 0) + 1; if (ok) c.k = (c.k || 0) + 1; c.t = today(); }
  logAnswer(ok, it.isNew && firstTime);
  save();
  if (!ok && (SES.retries[i] = (SES.retries[i] || 0) + 1) <= 2) { it.retry ={ i, ctx: it.ctx, dir: it.dir, kind: it.kind === 'form' || it.kind === 'root' ? 'type' : it.kind === 'flip' ? 'flip' : it.kind === 'irab' ? 'irab' : 'type', isNew: it.isNew }; SES.items.splice(Math.min(SES.items.length, SES.pos + 4), 0, it.retry); }
  if (it.kind === 'flip') { nextQ(); return; }
  it.done = true;
  const L = LEM[i], word = wordAt(s, a, w);
  const typed = it.given !== undefined && it.kind !== 'mc';
  const verdict = g === 2 ? 'Goed!' : g === 1 ? (it.hint ? 'Goed, met hint' : 'Bijna goed (kleine fout)') : 'Nog niet';
  document.getElementById('fb').innerHTML = `<div class="verdict ${ok ? 'ok' : 'no'}">${verdict}</div>
    <div class="feedback">
      ${typed && it.given ? `<p class="small muted" style="margin:6px 0">Jouw antwoord: <b class="${/[؀-ۿ]/.test(it.given) ? 'ar' : ''}">${esc(it.given)}</b></p>` : ''}
      <div class="row between answerline"><div><b>${esc(meaning(i))}</b> ${resBadge(i)}</div><div class="ar" style="font-size:1.8rem">${esc(L[0])}</div></div>
      ${rootBox(i, { max: 4 })}
      ${contextBlock(s, a, w, { window: 10, breakdown: it.kind === 'irab' || (it.kind !== 'form' && interestingForm(word)) })}
      ${L[6] === 2 ? researchBox(i) : ''}
      <div class="row wrap" style="margin-top:6px">
        ${typed && !ok && it.kind === 'type' ? '<button class="btn sm" id="ovr">Ik had het toch goed</button>' : ''}
        <button class="btn sm" id="exw">✓ Ken ik overal</button>
        <a href="#/woord/${i}/${s}" class="btn sm" target="_blank">Meer ↗</a>
      </div>
      <button class="btn primary block big" id="nx" style="margin-top:10px">Volgende → <span class="small" style="opacity:.7">(Enter)</span></button>
    </div>`;
  if (!ok) play(s, a, w);
  document.getElementById('nx').onclick = nextQ;
  document.getElementById('exw').onclick = () => { excludeWord(i, s); nextQ(); };
  document.getElementById('ovr')?.addEventListener('click', () => {
    if (it.first && !SES.practice) { if (it.prev) S.cards[i] = it.prev; else delete S.cards[i]; grade(i, 2, s); const c2 = S.cards[i]; c2.n = (c2.n || 0) + 1; c2.k = (c2.k || 0) + 1; }
    hToday().c++; SES.ok++; SES.wrong.delete(i); if (it.retry) it.retry.skip = true; save(); toast('Aangepast naar goed'); nextQ();
  });
  keyHandler = e => { if (e.key === 'Enter') { e.preventDefault(); nextQ(); } };
  setTimeout(() => document.getElementById('nx')?.focus({ preventScroll: true }), 30);
}
function nextQ() { if (!SES) return; SES.pos++; renderQ(); window.scrollTo(0, 0); }
function writeTask(i, ctx) {
  const L = LEM[i], [s, a, w] = ctx, fam = L[1] ? ROOTS[L[1]][2].slice(0, 4) : [i];
  return `<div class="write"><div class="row between"><b class="ar" style="font-size:1.6rem">${esc(L[0])}</b><span>${esc(meaning(i))}</span></div>
    <ol class="small">
      ${L[1] ? `<li>Schrijf de wortel groot: <b class="ar" style="font-size:1.3rem">${esc(spaced(L[1]))}</b> — kern: ${esc(ROOTS[L[1]][0])}</li>
      <li>Schrijf deze vormen eronder met betekenis:<br>${fam.map(j => `<span class="ar" style="font-size:1.2rem">${esc(LEM[j][0])}</span> ${esc(meaning(j))}`).join(' · ')}</li>` : ''}
      <li>Schrijf dit vers over en onderstreep het woord:<div class="arline ar" style="font-size:1.4rem;line-height:2.1">${verseArabic(s, a, w, { window: 7 })}</div></li>
      <li>Schrijf je eigen vertaling eronder en vergelijk: <span class="muted">${esc(QW.s[s].v[a - 1][0])}</span></li>
      <li>Ontleed de vorm <b class="ar">${esc(wordAt(s, a, w)[0])}</b>: voorvoegsel · wortel · uitgang.</li>
    </ol></div>`;
}
function renderDone() {
  const pct = SES.n ? Math.round(SES.ok / SES.n * 100) : 0, st = streak(), h = hToday();
  const mins = Math.max(1, Math.round((Date.now() - SES.start) / 60000));
  const wrong = [...SES.wrong];
  const learnedIds = [...new Set([...SES.learned, ...SES.graded])];
  S.read = learnedIds.slice(0, 12); save();
  const writeIds = [...new Set([...wrong, ...SES.learned])].slice(0, 3);
  const ses = SES; SES = null; keyHandler = null;
  const ctxOf = i => ses.items.find(x => x.i === i)?.ctx;
  $main.innerHTML = `<div class="card center">
    <div style="font-size:3rem">${dayDone(today()) ? '🔥' : '✓'}</div>
    <h1>${esc(ses.title)} klaar</h1>
    <p class="muted">${ses.n} antwoorden · ${pct}% goed · ${mins} min</p>
    <p>${dayDone(today()) ? `Dagdoel gehaald — streak: <b>${st} ${st === 1 ? 'dag' : 'dagen'}</b>` : `Nog ${S.set.goal - h.n} voor je dagdoel — nog één korte ronde?`}</p>
    <div class="row wrap" style="justify-content:center"><a class="btn primary" href="#/lezen">📖 Lees nu wat je net leerde</a><button class="btn" id="again">Nog een korte ronde</button><a class="btn" href="#/">Klaar</a></div></div>
  ${writeIds.length ? `<div class="card"><h2>✍ Schrijfopdracht voor je schrift (±3 min)</h2><p class="small muted">Met de hand schrijven helpt vooral bij woorden die je fout had of nieuw zijn.</p>
    ${writeIds.map(i => writeTask(i, ctxOf(i) || occOf(i)[0])).join('')}
    <button class="btn block" id="wdone">Opgeschreven ✓</button></div>` : ''}
  ${wrong.length ? `<div class="card"><b>Deze waren lastig:</b><ul class="list">${wrong.map(i => wordRow(i, LEM[i][1] ? `wortel ${spaced(LEM[i][1])}` : posLabel(LEM[i]))).join('')}</ul></div>` : ''}`;
  document.getElementById('again').onclick = () => startDaily(true);
  document.getElementById('wdone')?.addEventListener('click', e => { hToday().w = (hToday().w || 0) + 1; save(); e.target.disabled = true; e.target.textContent = 'Opgeschreven ✓ — goed bezig'; });
}

/* ---------------- start ---------------- */
(async () => {
  if (await restoreFromIdb()) toast('Voortgang hersteld uit opslag');
  applyFreeze();
  render();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => { });
})();
})();
