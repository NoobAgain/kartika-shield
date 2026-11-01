// Kartika Shield Collector: mengumpulkan unggahan publik NYATA, menilainya, dan menyiarkannya ke dasbor lewat SSE.
// Butuh Node.js >= 22 (WebSocket dan fetch bawaan). Tanpa dependensi.  Jalankan: node server.js
const http = require('http'), crypto = require('crypto'), fs = require('fs');
const PORT = +process.env.PORT || 8787;
const HOST = process.env.HOST || '127.0.0.1';              // hanya komputer ini; isi 0.0.0.0 bila sengaja ingin dibuka ke jaringan
const LOG_CSV = process.env.LOG_CSV || '';                    // opsional: simpan hasil ke berkas CSV (akun tetap berupa hash) untuk ditinjau manual
const MAX_CLIENTS = +process.env.MAX_CLIENTS || 20;
const ALLOW = (process.env.ALLOW_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
const okOrigin = o => o === 'null' || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o || '') || ALLOW.includes(o);  // 'null' = berkas HTML lokal
const JETSTREAM = process.env.JETSTREAM || 'wss://jetstream2.us-east.bsky.network/subscribe?wantedCollections=app.bsky.feed.post';
const RSS_URLS = (process.env.RSS_URLS || '').split(',').map(s => s.trim()).filter(Boolean); // opsional, pisahkan dengan koma
const MIN_RISK = +process.env.MIN_RISK || 45;       // ambang risiko untuk dilaporkan
const WINDOW_MS = 15 * 60 * 1000;                    // jendela deteksi teks kembar
const CITY = [[/\b(?:papua barat daya|sorong)\b/i,'PD'],[/\b(?:papua barat|manokwari)\b/i,'PB'],[/\b(?:papua tengah|nabire)\b/i,'PH'],[/\b(?:papua selatan|merauke)\b/i,'PS'],[/\b(?:papua pegunungan|wamena|jayawijaya)\b/i,'PP'],[/\b(?:jayapura|papua)\b/i,'PA'],[/\b(?:balikpapan|samarinda|kaltim)\b/i,'KI'],[/\b(?:denpasar|bali)\b/i,'BA'],[/\b(?:jakarta|dki)\b/i,'JK'],[/\b(?:bekasi|depok|bogor|bandung|jabar)\b/i,'JB'],[/\b(?:tangerang|serang|banten)\b/i,'BT'],[/\b(?:semarang|surakarta|jateng)\b/i,'JT'],[/\b(?:yogyakarta|jogja|yogya)\b/i,'YO'],[/\b(?:surabaya|malang|jatim)\b/i,'JI'],[/\b(?:medan|sumut)\b/i,'SU'],[/\b(?:banda aceh|aceh)\b/i,'AC'],[/\b(?:padang|sumbar)\b/i,'SB'],[/\b(?:pekanbaru|riau)\b/i,'RI'],[/\b(?:batam|tanjung ?pinang|kepri)\b/i,'KR'],[/\b(?:jambi)\b/i,'JA'],[/\b(?:bengkulu)\b/i,'BE'],[/\b(?:palembang|sumsel)\b/i,'SS'],[/\b(?:pangkal ?pinang|bangka|belitung|babel)\b/i,'BB'],[/\b(?:bandar lampung|lampung)\b/i,'LA'],[/\b(?:pontianak|kalbar)\b/i,'KB'],[/\b(?:banjarmasin|banjarbaru|kalsel)\b/i,'KS'],[/\b(?:palangka ?raya|kalteng)\b/i,'KT'],[/\b(?:tanjung selor|kaltara|kalimantan utara)\b/i,'KU'],[/\b(?:makassar|sulsel)\b/i,'SN'],[/\b(?:mamuju|sulbar)\b/i,'SR'],[/\b(?:manado|sulut)\b/i,'SA'],[/\b(?:kota palu|sulteng)\b/i,'ST'],[/\b(?:kendari|sultra)\b/i,'SG'],[/\b(?:gorontalo)\b/i,'GO'],[/\b(?:sofifi|ternate|malut|maluku utara)\b/i,'MU'],[/\b(?:ambon|maluku)\b/i,'MA'],[/\b(?:mataram|ntb)\b/i,'NB'],[/\b(?:kupang|ntt)\b/i,'NT']];  // urutan penting: yang lebih spesifik lebih dulu, \b mencegah 'bali' cocok dengan 'balikpapan'

const stat = { seen: 0, id: 0, flagged: 0, coordinated: 0 }, clients = new Set(), backlog = [], seenRss = new Set();
let groups = [];
const send = (ev, d) => { const m = `event: ${ev}\ndata: ${JSON.stringify(d)}\n\n`; clients.forEach(r => r.write(m)); };
const city = t => { const f = CITY.find(c => c[0].test(t)); return f ? f[1] : null; };

// Penilai pola bahasa (sama dengan mode offline di aplikasi). Ini indikator, bukan bukti.
function heur(t) {
  const kw = /\b(?:agama|suku|etnis|cina|china|kafir|pribumi|asing|aseng|rumah ibadah|gereja|masjid|komunis|antek)\b/i.test(t);   // kata sensitif saja tidak cukup
  let s = 0, hit = 0;
  [[/!{2,}|\b[A-Z]{5,}\b\s+\b[A-Z]{3,}\b/, 15], [/\b(?:sebarkan|share|viral|forward|sebelum dihapus)\b/i, 20], [/(media tidak berani|ditutupi|disembunyikan|konspirasi)/i, 20], [/(menguasai|menghancurkan|musnah|serbu|bantai)/i, 20]]
    .forEach(([x, p]) => { if (x.test(t)) { s += p; hit++; } });
  const sara = kw && hit > 0;   // SARA dihitung hanya bila muncul bersama pola manipulasi lain
  if (sara) s += 20;
  if (!/(https?:\/\/|menurut|dikutip|sumber)/i.test(t)) s += 10;
  return { risk: Math.min(s, 95), sara };
}
const norm = t => t.toLowerCase().replace(/https?:\/\/\S+|@\w+/g, '').replace(/4/g,'a').replace(/3/g,'e').replace(/1/g,'i').replace(/0/g,'o').replace(/(.)\1{2,}/g,'$1').replace(/[^a-z\s]/g,' ').replace(/\s+/g,' ').trim();
const anon = did => crypto.createHash('sha256').update(did).digest('hex').slice(0, 8); // akun tidak ditampilkan apa adanya

const csvc = v => { v = String(v == null ? '' : v); if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
function logCsv(h) {
  if (!LOG_CSV) return;
  try {
    if (!fs.existsSync(LOG_CSV)) fs.writeFileSync(LOG_CSV, '\ufeffwaktu,sumber,risiko,akun_serentak,wilayah,akun_hash,teks,penilaian_manual\r\n');
    fs.appendFileSync(LOG_CSV, [h.ts, h.src, h.risk, h.coordinated || 0, h.city || '', h.acct || '', h.text, ''].map(csvc).join(',') + '\r\n');
  } catch (e) { console.log('Gagal menulis CSV:', e.message); }
}
function emit(h) { h.ts = new Date().toISOString(); stat.flagged++; logCsv(h); backlog.push(h); if (backlog.length > 50) backlog.shift(); send('hit', h); }

async function profileStats(dids) {   // umur akun dari profil publik Bluesky (opsional, gagal = dilewati)
  const out = [];
  for (const d of dids.slice(0, 5)) {
    try {
      const r = await fetch('https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=' + encodeURIComponent(d), { signal: AbortSignal.timeout(3000) });
      const p = await r.json(); if (p.createdAt) out.push(Math.round((Date.now() - Date.parse(p.createdAt)) / 864e5));
    } catch (e) {}
  }
  return out.length ? { sampled: out.length, newAccounts: out.filter(a => a < 30).length, medianAgeDays: out.sort((a, b) => a - b)[out.length >> 1] } : null;
}

const bigrams = k => { const w = k.split(' '), o = new Set(); for (let i = 0; i < w.length - 1; i++) o.add(w[i] + ' ' + w[i + 1]); return o; };
const jac = (a, b) => { let i = 0; a.forEach(x => { if (b.has(x)) i++; }); const u = a.size + b.size - i; return u ? i / u : 0; };
function track(did, text) {            // teks MIRIP (Jaccard bigram >= 0,6) dari >= 3 akun berbeda dalam 15 menit = indikasi koordinasi
  const k = norm(text); if (k.split(' ').length < 5) return;
  const now = Date.now(), sh = bigrams(k);
  let g = groups.find(x => now - x.first <= WINDOW_MS && jac(x.sh, sh) >= 0.6);
  if (!g) { g = { first: now, dids: new Set(), n: 0, text, sh }; groups.push(g); }
  g.dids.add(did);
  if (g.dids.size >= 3 && g.dids.size > g.n) {
    g.n = g.dids.size; stat.coordinated++;
    const base = { src: 'Bluesky', type: 1, risk: Math.min(95, 50 + g.n * 8), text: text.slice(0, 280), city: city(text), coordinated: g.n };
    profileStats([...g.dids]).then(m => emit({ ...base, meta: m })).catch(() => emit(base));
  }
  if (groups.length > 2000) groups = groups.filter(x => now - x.first <= WINDOW_MS).slice(-2000);
}

function onMessage(raw) {
  stat.seen++;
  if (raw.indexOf('"id"') < 0) return;                              // saringan cepat bahasa Indonesia
  let j; try { j = JSON.parse(raw); } catch (e) { return; }
  const c = j.commit, r = c && c.record;
  if (!r || c.operation !== 'create' || !r.text || !(r.langs || []).includes('id')) return;
  stat.id++; track(j.did, r.text);
  const h = heur(r.text);
  if (h.risk >= MIN_RISK) emit({ src: 'Bluesky', type: h.sara ? 0 : 3, risk: h.risk, text: r.text.slice(0, 280), city: city(r.text), sara: h.sara, acct: anon(j.did) });
}
function connect() {
  const ws = new WebSocket(JETSTREAM);
  ws.onopen = () => console.log('Jetstream tersambung');
  ws.onmessage = e => onMessage(String(e.data));
  ws.onclose = () => { console.log('Jetstream putus, mencoba lagi 5 detik'); setTimeout(connect, 5000); };
  ws.onerror = () => {};
}
async function pollRss(u) {
  try {
    const x = await (await fetch(u, { signal: AbortSignal.timeout(10000) })).text();
    for (const m of [...x.matchAll(/<item[\s\S]*?<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/g)].slice(0, 15)) {
      const t = m[1].trim(); if (!t || seenRss.has(t)) continue; seenRss.add(t); if (seenRss.size > 5000) seenRss.clear(); stat.seen++; stat.id++;
      const h = heur(t); if (h.risk >= MIN_RISK) emit({ src: 'RSS ' + new URL(u).hostname, type: h.sara ? 0 : 3, risk: h.risk, text: t.slice(0, 280), city: city(t), sara: h.sara });
    }
  } catch (e) { console.log('RSS gagal:', u); }
}

http.createServer((q, r) => {
  const o = q.headers.origin; if (o && okOrigin(o)) { r.setHeader('Access-Control-Allow-Origin', o); r.setHeader('Vary', 'Origin'); }
  if (q.url === '/events') {
    if (clients.size >= MAX_CLIENTS) { r.writeHead(503); return r.end(); }
    r.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    backlog.slice(-20).forEach(h => r.write(`event: hit\ndata: ${JSON.stringify(h)}\n\n`));
    clients.add(r); q.on('close', () => clients.delete(r)); return;
  }
  if (q.url === '/health' || q.url === '/stats') { r.writeHead(200, { 'Content-Type': 'application/json' }); return r.end(JSON.stringify({ ...stat, uptimeSec: process.uptime() | 0 })); }
  r.writeHead(404); r.end();
}).listen(PORT, HOST, () => console.log(`Kartika Collector di http://${HOST}:${PORT}  (SSE: /events, statistik: /stats)`));

setInterval(() => send('stat', stat), 2000);
connect();
RSS_URLS.forEach(u => { pollRss(u); setInterval(() => pollRss(u), 5 * 60 * 1000); });
