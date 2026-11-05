// Kartika Shield Collector: mengumpulkan unggahan publik NYATA, menilainya, dan menyiarkannya ke dasbor lewat SSE.
// Butuh Node.js >= 22 (WebSocket dan fetch bawaan). Tanpa dependensi.  Jalankan: node server.js
const http = require('http'), crypto = require('crypto'), fs = require('fs');
const PORT = +process.env.PORT || 8787;
const HOST = process.env.HOST || '127.0.0.1';              // hanya komputer ini; isi 0.0.0.0 bila sengaja ingin dibuka ke jaringan
const LOG_CSV = process.env.LOG_CSV || '';                    // opsional: simpan hasil ke berkas CSV (akun tetap berupa hash) untuk ditinjau manual
const MAX_CLIENTS = +process.env.MAX_CLIENTS || 20;
const ALLOW = (process.env.ALLOW_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
const okOrigin = o => o === 'null' || o === 'file://' || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o || '') || ALLOW.includes(o);  // 'null' / 'file://' = berkas HTML lokal
const JETSTREAM = process.env.JETSTREAM || 'wss://jetstream2.us-east.bsky.network/subscribe?wantedCollections=app.bsky.feed.post';
const DEFAULT_RSS = [
  'https://news.google.com/rss/search?q=indonesia&hl=id&gl=ID&ceid=ID:id',
  'https://www.antaranews.com/rss/terkini.xml',
  'https://www.cnnindonesia.com/rss',
  'https://rss.detik.com/index.php/detikcom',
  'https://kumparan.com/rss',
  'https://www.tempo.co/rss/terkini'
];
const RSS_RAW = process.env.RSS_URLS == null ? null : process.env.RSS_URLS.trim();
const RSS_URLS = RSS_RAW == null ? DEFAULT_RSS : (RSS_RAW.toLowerCase() === 'off' ? [] : RSS_RAW.split(',')).map(s => s.trim()).filter(Boolean);
const MIN_RISK = +process.env.MIN_RISK || 45;       // ambang risiko untuk dilaporkan
const WINDOW_MS = 15 * 60 * 1000;                    // jendela deteksi teks kembar
const BOT_ENDPOINT = process.env.BOT_BSKY_ENDPOINT || 'https://api.bsky.app/xrpc/app.bsky.feed.searchPosts';
const BOT_KEYWORDS = (process.env.BOT_KEYWORDS || 'hoaks,disinformasi,provokasi,pemilu,konflik sosial').split(',').map(s => s.trim()).filter(Boolean).slice(0, 8);
const BOT_INTERVAL_MIN = Math.max(1, Math.min(120, +process.env.BOT_INTERVAL_MIN || 10));
const BOT_AUTO = process.env.BOT_AUTO !== '0';
const BOT_LOOKBACK_HOURS = Math.max(1, Math.min(72, +process.env.BOT_LOOKBACK_HOURS || 24));
const BOT_LIMIT = Math.max(5, Math.min(100, +process.env.BOT_LIMIT || 30));
const CITY = [[/\b(?:papua barat daya|sorong)\b/i,'PD'],[/\b(?:papua barat|manokwari)\b/i,'PB'],[/\b(?:papua tengah|nabire)\b/i,'PH'],[/\b(?:papua selatan|merauke)\b/i,'PS'],[/\b(?:papua pegunungan|wamena|jayawijaya)\b/i,'PP'],[/\b(?:jayapura|papua)\b/i,'PA'],[/\b(?:balikpapan|samarinda|kaltim)\b/i,'KI'],[/\b(?:denpasar|bali)\b/i,'BA'],[/\b(?:jakarta|dki)\b/i,'JK'],[/\b(?:bekasi|depok|bogor|bandung|jabar)\b/i,'JB'],[/\b(?:tangerang|serang|banten)\b/i,'BT'],[/\b(?:semarang|surakarta|jateng)\b/i,'JT'],[/\b(?:yogyakarta|jogja|yogya)\b/i,'YO'],[/\b(?:surabaya|malang|jatim)\b/i,'JI'],[/\b(?:medan|sumut)\b/i,'SU'],[/\b(?:banda aceh|aceh)\b/i,'AC'],[/\b(?:padang|sumbar)\b/i,'SB'],[/\b(?:pekanbaru|riau)\b/i,'RI'],[/\b(?:batam|tanjung ?pinang|kepri)\b/i,'KR'],[/\b(?:jambi)\b/i,'JA'],[/\b(?:bengkulu)\b/i,'BE'],[/\b(?:palembang|sumsel)\b/i,'SS'],[/\b(?:pangkal ?pinang|bangka|belitung|babel)\b/i,'BB'],[/\b(?:bandar lampung|lampung)\b/i,'LA'],[/\b(?:pontianak|kalbar)\b/i,'KB'],[/\b(?:banjarmasin|banjarbaru|kalsel)\b/i,'KS'],[/\b(?:palangka ?raya|kalteng)\b/i,'KT'],[/\b(?:tanjung selor|kaltara|kalimantan utara)\b/i,'KU'],[/\b(?:makassar|sulsel)\b/i,'SN'],[/\b(?:mamuju|sulbar)\b/i,'SR'],[/\b(?:manado|sulut)\b/i,'SA'],[/\b(?:kota palu|sulteng)\b/i,'ST'],[/\b(?:kendari|sultra)\b/i,'SG'],[/\b(?:gorontalo)\b/i,'GO'],[/\b(?:sofifi|ternate|malut|maluku utara)\b/i,'MU'],[/\b(?:ambon|maluku)\b/i,'MA'],[/\b(?:mataram|ntb)\b/i,'NB'],[/\b(?:kupang|ntt)\b/i,'NT']];  // urutan penting: yang lebih spesifik lebih dulu, \b mencegah 'bali' cocok dengan 'balikpapan'

const stat = { seen: 0, id: 0, flagged: 0, coordinated: 0, news: 0, viral: 0 }, clients = new Set(), backlog = [], seenRss = new Set();
const bot = {
  keywords: BOT_KEYWORDS.length ? BOT_KEYWORDS : ['hoaks'], intervalMin: BOT_INTERVAL_MIN, auto: BOT_AUTO,
  running: false, lastRun: null, lastFound: 0, lastEmitted: 0, lastError: '', nextRun: null, timer: null, seen: new Set()
};
let groups = [], newsGroups = [];
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

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const parseBotKeywords = v => [...new Set(String(v || '').split(',').map(s => s.trim().replace(/\s+/g, ' ').slice(0, 60)).filter(Boolean))].slice(0, 8);
const botPublic = () => ({
  keywords: bot.keywords, intervalMin: bot.intervalMin, auto: bot.auto, running: bot.running,
  lastRun: bot.lastRun, lastFound: bot.lastFound, lastEmitted: bot.lastEmitted, lastError: bot.lastError, nextRun: bot.nextRun
});
function armBot(runNow) {
  if (bot.timer) { clearInterval(bot.timer); bot.timer = null; }
  bot.nextRun = null;
  if (bot.auto) {
    const ms = bot.intervalMin * 60000;
    bot.nextRun = new Date(Date.now() + ms).toISOString();
    bot.timer = setInterval(() => {
      bot.nextRun = new Date(Date.now() + ms).toISOString();
      botRun('otomatis').catch(e => {
        bot.running = false; bot.lastError = String(e.message || e).slice(0, 180);
        send('bot', botPublic());
      });
    }, ms);
    if (runNow) setTimeout(() => botRun('otomatis').catch(e => {
      bot.running = false; bot.lastError = String(e.message || e).slice(0, 180);
      send('bot', botPublic());
    }), 1200);
  }
  send('bot', botPublic());
}
async function botRun(reason) {
  if (bot.running) return false;
  bot.running = true; bot.lastError = ''; bot.lastRun = new Date().toISOString();
  send('bot', botPublic());
  const cutoff = Date.now() - BOT_LOOKBACK_HOURS * 3600000;
  let found = 0, emitted = 0, errors = 0;
  try {
    for (const q of bot.keywords) {
      try {
        const u = new URL(BOT_ENDPOINT);
        u.searchParams.set('q', q);
        u.searchParams.set('limit', String(BOT_LIMIT));
        u.searchParams.set('sort', 'latest');
        u.searchParams.set('lang', 'id');
        u.searchParams.set('since', new Date(cutoff).toISOString());
        const res = await fetch(u, { headers: { 'User-Agent': 'KartikaShield/1.0' }, signal: AbortSignal.timeout(12000) });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        for (const p of (data.posts || [])) {
          const text = p.record && p.record.text;
          const did = (p.author && p.author.did) || p.uri;
          const key = p.uri || (did + ':' + ((p.record && p.record.createdAt) || ''));
          if (!text || !key || bot.seen.has(key)) continue;
          const created = Date.parse((p.record && p.record.createdAt) || p.indexedAt || '');
          if (created && created < cutoff) continue;
          bot.seen.add(key);
          while (bot.seen.size > 8000) bot.seen.delete(bot.seen.values().next().value);
          stat.seen++; stat.id++; found++;
          track(did, text);
          const h = heur(text);
          if (h.risk >= MIN_RISK) {
            emit({ src: 'Bluesky Bot', type: h.sara ? 0 : 3, risk: h.risk, text: text.slice(0, 280), city: city(text), sara: h.sara, acct: anon(did) });
            emitted++;
          }
        }
      } catch (e) {
        errors++; bot.lastError = (q + ': ' + (e.message || e)).slice(0, 180);
        console.log('Bot gagal:', bot.lastError);
      }
      await sleep(300);
    }
  } finally {
    bot.running = false; bot.lastFound = found; bot.lastEmitted = emitted;
    if (errors && !bot.lastError) bot.lastError = errors + ' kata kunci gagal';
    send('bot', botPublic()); send('stat', stat);
  }
  console.log(`Bot ${reason}: ${found} unggahan baru, ${emitted} dikirim`);
  return { found, emitted, errors, reason };
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
const dec = s => String(s || '').replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
function rssItems(x) {
  const out = [], blocks = x.match(/<item[\s\S]*?<\/item>/gi) || x.match(/<entry[\s\S]*?<\/entry>/gi) || [];
  for (const b of blocks) {
    const pick = (re) => { const m = b.match(re); return m ? dec(m[1]) : ''; };
    const title = pick(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const link = pick(/<link[^>]*href=["']([^"']+)["']/i) || pick(/<link[^>]*>([\s\S]*?)<\/link>/i);
    const desc = pick(/<(?:description|summary|content:encoded)[^>]*>([\s\S]*?)<\/(?:description|summary|content:encoded)>/i);
    const src = pick(/<source[^>]*>([\s\S]*?)<\/source>/i);
    if (title) out.push({ title, link, desc, src });
  }
  return out;
}
function newsTrack(title, desc, source) {   // judul mirip dari >= 2 penerbit berbeda dalam 3 jam = berita menyebar
  const k = norm(title); if (k.split(' ').length < 4) return false;
  const now = Date.now(), sh = bigrams(k);
  let g = newsGroups.find(x => now - x.first <= 3 * 3600 * 1000 && jac(x.sh, sh) >= 0.62);
  if (!g) { g = { first: now, sources: new Set(), n: 0, title, sh }; newsGroups.push(g); }
  g.sources.add(source);
  if (g.sources.size < 2 || g.sources.size <= g.n) return false;
  g.n = g.sources.size;
  if (g.n > 3 && g.n % 5) return true;
  const h = heur(title + ' ' + desc);
  stat.viral++;
  emit({ src: 'Agregasi Berita', type: h.sara ? 0 : 3, risk: Math.max(h.risk, Math.min(85, 45 + g.n * 6)), text: title.slice(0, 280), city: city(title + ' ' + desc), sara: h.sara, viral: { n: g.n, sources: [...g.sources].slice(0, 6), windowMin: Math.round((now - g.first) / 60000) } });
  return true;
}
async function pollRss(u) {
  try {
    const x = await (await fetch(u, { signal: AbortSignal.timeout(10000) })).text();
    const host = new URL(u).hostname.replace(/^www\./, '');
    for (const it of rssItems(x).slice(0, 20)) {
      const t = it.title.trim(), key = (it.link || t).trim(); if (!t || seenRss.has(key)) continue;
      seenRss.add(key); if (seenRss.size > 5000) seenRss.clear();
      stat.seen++; stat.id++; stat.news++;
      const src = it.src || host;
      const h = heur(t + ' ' + it.desc);
      if (newsTrack(t, it.desc, src)) continue;
      if (h.risk >= MIN_RISK) emit({ src: 'RSS ' + src, type: h.sara ? 0 : 3, risk: h.risk, text: t.slice(0, 280), city: city(t + ' ' + it.desc), sara: h.sara });
    }
    if (newsGroups.length > 2000) newsGroups = newsGroups.filter(x => Date.now() - x.first <= 3 * 3600 * 1000).slice(-2000);
  } catch (e) { console.log('RSS gagal:', u); }
}

function readJson(q) {
  return new Promise((resolve, reject) => {
    let n = 0, chunks = [];
    q.on('data', c => {
      n += c.length;
      if (n > 65536) { reject(new Error('Body terlalu besar')); q.destroy(); }
      else chunks.push(c);
    });
    q.on('end', () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch (e) { reject(new Error('JSON tidak valid')); } });
    q.on('error', reject);
  });
}
const reply = (r, code, obj) => { r.writeHead(code, { 'Content-Type': 'application/json' }); r.end(JSON.stringify(obj)); };

http.createServer(async (q, r) => {
  const o = q.headers.origin; if (o && okOrigin(o)) { r.setHeader('Access-Control-Allow-Origin', o); r.setHeader('Vary', 'Origin'); }
  if (q.method === 'OPTIONS') {
    r.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    r.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    r.writeHead(204); return r.end();
  }
  const path = String(q.url || '/').split('?')[0];
  if (path === '/events') {
    if (clients.size >= MAX_CLIENTS) { r.writeHead(503); return r.end(); }
    r.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    backlog.slice(-20).forEach(h => r.write(`event: hit\ndata: ${JSON.stringify(h)}\n\n`));
    r.write(`event: bot\ndata: ${JSON.stringify(botPublic())}\n\n`);
    clients.add(r); q.on('close', () => clients.delete(r)); return;
  }
  if (path === '/bot' || path === '/bot/status') return reply(r, 200, botPublic());
  if (path === '/bot/config' && q.method === 'POST') {
    try {
      const d = await readJson(q);
      const kw = parseBotKeywords(d.keywords); if (kw.length) bot.keywords = kw;
      if (d.intervalMin != null) { const v = +d.intervalMin; if (Number.isFinite(v)) bot.intervalMin = Math.max(1, Math.min(120, Math.round(v))); }
      if (typeof d.auto === 'boolean') bot.auto = d.auto;
      armBot(bot.auto);
      return reply(r, 200, { ok: true, bot: botPublic() });
    } catch (e) { return reply(r, 400, { ok: false, error: e.message }); }
  }
  if (path === '/bot/search' && q.method === 'POST') {
    try {
      const d = await readJson(q);
      const kw = parseBotKeywords(d.keywords); if (kw.length) bot.keywords = kw;
      if (d.intervalMin != null) { const v = +d.intervalMin; if (Number.isFinite(v)) bot.intervalMin = Math.max(1, Math.min(120, Math.round(v))); }
      if (typeof d.auto === 'boolean') { bot.auto = d.auto; armBot(bot.auto); }
      if (bot.running) return reply(r, 202, { ok: true, queued: false, running: true, bot: botPublic() });
      botRun('manual').catch(e => {
        bot.running = false; bot.lastError = String(e.message || e).slice(0, 180);
        send('bot', botPublic());
      });
      return reply(r, 202, { ok: true, queued: true, bot: botPublic() });
    } catch (e) { return reply(r, 400, { ok: false, error: e.message }); }
  }
  if (path === '/health' || path === '/stats') return reply(r, 200, { ...stat, uptimeSec: process.uptime() | 0, bot: botPublic() });
  r.writeHead(404); r.end();
}).listen(PORT, HOST, () => console.log(`Kartika Collector di http://${HOST}:${PORT}  (SSE: /events, statistik: /stats, bot: ${bot.auto ? 'otomatis tiap ' + bot.intervalMin + ' menit' : 'nonaktif'})`));

setInterval(() => send('stat', stat), 2000);
connect();
RSS_URLS.forEach(u => { pollRss(u); setInterval(() => pollRss(u), 5 * 60 * 1000); });
if (bot.auto) armBot(true);
