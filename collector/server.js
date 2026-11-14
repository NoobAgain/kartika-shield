// Kartika Shield Collector: mengumpulkan unggahan publik NYATA, menilainya, dan menyiarkannya ke dasbor lewat SSE.
// Butuh Node.js >= 22 (WebSocket dan fetch bawaan). Tanpa dependensi.  Jalankan: node server.js
const http = require('http'), crypto = require('crypto'), fs = require('fs');
const PORT = +process.env.PORT || 8787;
const HOST = process.env.HOST || '127.0.0.1';              // hanya komputer ini; isi 0.0.0.0 bila sengaja ingin dibuka ke jaringan
const LOG_CSV = process.env.LOG_CSV || '';                    // opsional: simpan hasil ke berkas CSV (akun tetap berupa hash) untuk ditinjau manual
const MAX_CLIENTS = +process.env.MAX_CLIENTS || 20;
const ALLOW = (process.env.ALLOW_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
const HOST_OK = (process.env.ALLOW_HOST || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);   // host tambahan bila HOST=0.0.0.0
const okOrigin = o => o === 'null' || o === 'file://' || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o || '') || ALLOW.includes(o);  // 'null' / 'file://' = berkas HTML lokal
const JETSTREAM = process.env.JETSTREAM || 'wss://jetstream2.us-east.bsky.network/subscribe?wantedCollections=app.bsky.feed.post';
const DEFAULT_RSS = [
  'https://www.antaranews.com/rss/terkini.xml',
  'https://www.cnnindonesia.com/nasional/rss',
  'https://news.detik.com/berita/rss',
  'https://www.cnbcindonesia.com/news/rss',
  'https://news.google.com/rss/search?q=Indonesia&hl=id&gl=ID&ceid=ID:id',
  // Pencarian RSS dibatasi ke domain resmi; tautan artikel tetap menuju penerbit aslinya.
  'https://news.google.com/rss/search?q=site%3Atniad.mil.id&hl=id&gl=ID&ceid=ID:id',
  'https://news.google.com/rss/search?q=site%3Atniad.mil.id%20Pussiberad&hl=id&gl=ID&ceid=ID:id',
  'https://news.google.com/rss/search?q=site%3Abssn.go.id&hl=id&gl=ID&ceid=ID:id',
  'https://news.google.com/rss/search?q=site%3Appid.tni.mil.id%20%22Bais%20TNI%22&hl=id&gl=ID&ceid=ID:id',
  'https://news.google.com/rss/search?q=site%3Akomdigi.go.id&hl=id&gl=ID&ceid=ID:id'
];
const RSS_RAW = process.env.RSS_URLS == null ? null : process.env.RSS_URLS.trim();
const RSS_URLS = RSS_RAW == null ? DEFAULT_RSS : (RSS_RAW.toLowerCase() === 'off' ? [] : RSS_RAW.split(',')).map(s => s.trim()).filter(Boolean);
const _mr = process.env.MIN_RISK === undefined || process.env.MIN_RISK === '' ? NaN : +process.env.MIN_RISK;
const MIN_RISK = Number.isFinite(_mr) ? _mr : 45;       // ambang risiko untuk dilaporkan
const WINDOW_MS = 15 * 60 * 1000;                    // jendela deteksi teks kembar
const BOT_ENDPOINT = process.env.BOT_BSKY_ENDPOINT || 'https://api.bsky.app/xrpc/app.bsky.feed.searchPosts';
const BOT_FALLBACK_ENDPOINT = process.env.BOT_BSKY_FALLBACK_ENDPOINT || (BOT_ENDPOINT.includes('public.api.bsky.app') ? 'https://api.bsky.app/xrpc/app.bsky.feed.searchPosts' : 'https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts');
const BOT_KEYWORDS = (process.env.BOT_KEYWORDS || 'hoaks,disinformasi,provokasi,pemilu,konflik sosial').split(',').map(s => s.trim()).filter(Boolean).slice(0, 8);
const BOT_INTERVAL_MIN = Math.max(1, Math.min(120, +process.env.BOT_INTERVAL_MIN || 10));
const BOT_AUTO = process.env.BOT_AUTO !== '0';
const BOT_LOOKBACK_HOURS = Math.max(1, Math.min(72, +process.env.BOT_LOOKBACK_HOURS || 24));
const BOT_LIMIT = Math.max(5, Math.min(100, +process.env.BOT_LIMIT || 30));
const CITY = [[/\b(?:papua barat daya|sorong)\b/i,'PD'],[/\b(?:papua barat|manokwari)\b/i,'PB'],[/\b(?:papua tengah|nabire)\b/i,'PH'],[/\b(?:papua selatan|merauke)\b/i,'PS'],[/\b(?:papua pegunungan|wamena|jayawijaya)\b/i,'PP'],[/\b(?:jayapura|papua)\b/i,'PA'],[/\b(?:balikpapan|samarinda|kaltim)\b/i,'KI'],[/\b(?:denpasar|bali)\b/i,'BA'],[/\b(?:jakarta|dki)\b/i,'JK'],[/\b(?:bekasi|depok|bogor|bandung|jabar)\b/i,'JB'],[/\b(?:tangerang|serang|banten)\b/i,'BT'],[/\b(?:semarang|surakarta|jateng)\b/i,'JT'],[/\b(?:yogyakarta|jogja|yogya)\b/i,'YO'],[/\b(?:surabaya|malang|jatim)\b/i,'JI'],[/\b(?:medan|sumut)\b/i,'SU'],[/\b(?:banda aceh|aceh)\b/i,'AC'],[/\b(?:padang|sumbar)\b/i,'SB'],[/\b(?:pekanbaru|riau)\b/i,'RI'],[/\b(?:batam|tanjung ?pinang|kepri)\b/i,'KR'],[/\b(?:jambi)\b/i,'JA'],[/\b(?:bengkulu)\b/i,'BE'],[/\b(?:palembang|sumsel)\b/i,'SS'],[/\b(?:pangkal ?pinang|bangka|belitung|babel)\b/i,'BB'],[/\b(?:bandar lampung|lampung)\b/i,'LA'],[/\b(?:pontianak|kalbar)\b/i,'KB'],[/\b(?:banjarmasin|banjarbaru|kalsel)\b/i,'KS'],[/\b(?:palangka ?raya|kalteng)\b/i,'KT'],[/\b(?:tanjung selor|kaltara|kalimantan utara)\b/i,'KU'],[/\b(?:makassar|sulsel)\b/i,'SN'],[/\b(?:mamuju|sulbar)\b/i,'SR'],[/\b(?:manado|sulut)\b/i,'SA'],[/\b(?:kota palu|sulteng)\b/i,'ST'],[/\b(?:kendari|sultra)\b/i,'SG'],[/\b(?:gorontalo)\b/i,'GO'],[/\b(?:sofifi|ternate|malut|maluku utara)\b/i,'MU'],[/\b(?:ambon|maluku)\b/i,'MA'],[/\b(?:mataram|ntb)\b/i,'NB'],[/\b(?:kupang|ntt)\b/i,'NT']];  // urutan penting: yang lebih spesifik lebih dulu, \b mencegah 'bali' cocok dengan 'balikpapan'

const stat = { seen: 0, id: 0, flagged: 0, coordinated: 0, news: 0, viral: 0 }, clients = new Set(), backlog = [], seenRss = new Set();
const bot = {
  keywords: BOT_KEYWORDS.length ? BOT_KEYWORDS : ['hoaks'], intervalMin: BOT_INTERVAL_MIN, auto: BOT_AUTO,
  running: false, lastRun: null, lastFound: 0, lastEmitted: 0, lastError: '', lastEndpoint: '', lastErrors: 0, nextRun: null, timer: null, seen: new Set()
};
let groups = [], newsGroups = [], newsArticles = [];
const NEWS_STORE = process.env.NEWS_STORE || require('path').join(__dirname, 'data', 'news-articles.json');
try { const saved = JSON.parse(fs.readFileSync(NEWS_STORE, 'utf8')); if (Array.isArray(saved)) newsArticles = saved.filter(a => a && a.url && a.title).slice(0, 1500); } catch (e) {}
// Seed deduplication from the persistent archive so a Collector restart does not re-add old RSS items.
newsArticles.forEach(a => { if (a.url) seenRss.add(a.url); });
function persistNews() { try { fs.mkdirSync(require('path').dirname(NEWS_STORE), { recursive: true }); const tmp = NEWS_STORE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(newsArticles)); fs.renameSync(tmp, NEWS_STORE); } catch (e) { console.log('Gagal menyimpan arsip berita:', e.message); } }
const NEWS_MAX = Math.max(100, Math.min(5000, +(process.env.NEWS_MAX || 1500)));
const NEWS_SOURCES = RSS_URLS.map(u => ({ url: u, host: (() => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return 'unknown'; } })() }));
const send = (ev, d) => { const m = `event: ${ev}\ndata: ${JSON.stringify(d)}\n\n`; clients.forEach(r => r.write(m)); };
const city = t => { const f = CITY.find(c => c[0].test(t)); return f ? f[1] : null; };

// Penilai tunggal: mesin Cognitive Threat Analysis yang SAMA dengan dasbor (../js/00a-kognitif-teks.js), tanpa AI.
const KSTeks = require('../js/00a-kognitif-teks.js');
const { analyzeNews } = require('./services/news-analysis');
function heur(t) { const r = KSTeks.analisis(t); return { risk: Math.min(r.risk, 95), sara: r.sara }; }
const norm = t => t.toLowerCase().replace(/https?:\/\/\S+|@\w+/g, '').replace(/4/g,'a').replace(/3/g,'e').replace(/1/g,'i').replace(/0/g,'o').replace(/(.)\1{2,}/g,'$1').replace(/[^a-z\s]/g,' ').replace(/\s+/g,' ').trim();
const SALT_FILE = require('path').join(__dirname, 'data', '.anon-salt');
let SALT = process.env.ANON_SALT || '';
if (!SALT) { try { SALT = fs.readFileSync(SALT_FILE, 'utf8').trim(); } catch (e) { SALT = crypto.randomBytes(32).toString('hex'); try { fs.mkdirSync(require('path').dirname(SALT_FILE), { recursive: true }); fs.writeFileSync(SALT_FILE, SALT, { mode: 0o600, flag: 'wx' }); } catch (x) { try { SALT = fs.readFileSync(SALT_FILE, 'utf8').trim(); } catch (y) {} } } }
const anon = did => crypto.createHmac('sha256', SALT || 'kartika-local-anon').update(did).digest('hex').slice(0, 10); // pseudonim stabil lokal; DID mentah tidak disimpan
const buzzerRecords = new Map();
const BUZZER_RECORD_MAX = Math.max(100, Math.min(2000, +(process.env.BUZZER_RECORD_MAX || 1000)));
function bskyPostUrl(post) { const uri = String(post.uri || ''); const rkey = uri.split('/').pop(); const author = post.author || {}; const handle = String(author.handle || ''); const validHandle = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(handle) && !/\.invalid$/i.test(handle); const profile = validHandle ? handle : String(author.did || ''); return profile && rkey ? `https://bsky.app/profile/${encodeURIComponent(profile)}/post/${encodeURIComponent(rkey)}` : ''; }
async function fetchBskyProfiles(dids) {
  const out = new Map();
  for (let i = 0; i < dids.length; i += 25) {
    try { const u = new URL('https://api.bsky.app/xrpc/app.bsky.actor.getProfiles'); dids.slice(i, i + 25).forEach(d => u.searchParams.append('actors', d));
      const j = await fetchPublicJson(u, 3); (j.profiles || []).forEach(x => out.set(x.did, x));
    } catch (e) {}
  }
  return out;
}

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
      const r = await fetch('https://api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=' + encodeURIComponent(d), { signal: AbortSignal.timeout(3000) });
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
async function fetchPublicJson(url, attempts = 4) {
  let last;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'KartikaShield/2.1.1 (public research)' }, signal: AbortSignal.timeout(15000) });
      if (res.ok) return await res.json();
      if (res.status !== 429 && res.status < 500) throw new Error('HTTP ' + res.status);
      const retry = Number(res.headers.get('retry-after'));
      await sleep(Math.min(30000, (Number.isFinite(retry) && retry > 0 ? retry * 1000 : 1000 * (2 ** i))));
      last = new Error('HTTP ' + res.status);
    } catch (e) { last = e; if (i < attempts - 1) await sleep(Math.min(8000, 500 * (2 ** i))); }
  }
  throw last || new Error('Public API tidak merespons');
}
async function fetchBskySearch(url) {
  const candidates = [new URL(url), new URL(BOT_FALLBACK_ENDPOINT)];
  candidates[1].search = candidates[0].search;
  let last;
  for (let i = 0; i < candidates.length; i++) {
    try {
      const data = await fetchPublicJson(candidates[i], 1);
      return { data, endpoint: candidates[i].origin };
    } catch (e) {
      last = e;
      if (i === 0) console.log(`Bluesky search endpoint utama gagal (${e.message}); mencoba endpoint cadangan.`);
    }
  }
  throw last || new Error('Semua endpoint pencarian Bluesky gagal');
}
const parseBotKeywords = v => [...new Set(String(v || '').split(',').map(s => s.trim().replace(/\s+/g, ' ').slice(0, 60)).filter(Boolean))].slice(0, 8);
const botPublic = () => ({
  keywords: bot.keywords, intervalMin: bot.intervalMin, auto: bot.auto, running: bot.running,
  lastRun: bot.lastRun, lastFound: bot.lastFound, lastEmitted: bot.lastEmitted, lastError: bot.lastError, lastErrors: bot.lastErrors, lastEndpoint: bot.lastEndpoint, nextRun: bot.nextRun
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
  bot.running = true; bot.lastError = ''; bot.lastErrors = 0; bot.lastEndpoint = ''; bot.lastRun = new Date().toISOString();
  send('bot', botPublic());
  const cutoff = Date.now() - BOT_LOOKBACK_HOURS * 3600000;
  let found = 0, emitted = 0, errors = 0;
  const fresh = new Map();
  try {
    for (const q of bot.keywords) {
      try {
        const u = new URL(BOT_ENDPOINT);
        u.searchParams.set('q', q); u.searchParams.set('limit', String(BOT_LIMIT));
        u.searchParams.set('sort', 'latest'); u.searchParams.set('lang', 'id');
        u.searchParams.set('since', new Date(cutoff).toISOString());
        const result = await fetchBskySearch(u);
        const data = result.data; bot.lastEndpoint = result.endpoint;
        for (const p of (data.posts || [])) {
          const text = p.record && p.record.text;
          const did = (p.author && p.author.did) || '';
          const key = p.uri || (did + ':' + ((p.record && p.record.createdAt) || ''));
          if (!text || !key || bot.seen.has(key)) continue;
          const created = Date.parse((p.record && p.record.createdAt) || p.indexedAt || '');
          if (created && created < cutoff) continue;
          bot.seen.add(key);
          while (bot.seen.size > 12000) bot.seen.delete(bot.seen.values().next().value);
          fresh.set(key, p);
        }
      } catch (e) {
        errors++; bot.lastError = (q + ': ' + (e.message || e)).slice(0, 180);
        console.log('Bot gagal:', bot.lastError);
      }
      await sleep(300);
    }

    const posts = [...fresh.values()];
    const needsProfile = posts.filter(p => { const a = p.author || {}; return !a.createdAt || a.followersCount == null || a.followsCount == null || !Number.isFinite(+a.followersCount) || !Number.isFinite(+a.followsCount); }).map(p => p.author && p.author.did).filter(Boolean);
    const profiles = await fetchBskyProfiles([...new Set(needsProfile)]);
    const batch = [];
    for (const p of posts) {
      const text = String(p.record && p.record.text || '').replace(/\s+/g, ' ').trim();
      const did = p.author && p.author.did;
      const key = p.uri || '';
      if (!text || !did || !key) continue;
      const profile = profiles.get(did) || p.author || {};
      const createdAt = p.record.createdAt || p.indexedAt || null;
      const accountCreatedAt = profile.createdAt || null;
      const ageDays = accountCreatedAt && Number.isFinite(Date.parse(accountCreatedAt)) ? Math.max(0, Math.floor((Date.now() - Date.parse(accountCreatedAt)) / 86400000)) : null;
      const followers = profile.followersCount != null && Number.isFinite(+profile.followersCount) ? +profile.followersCount : null;
      const following = profile.followsCount != null && Number.isFinite(+profile.followsCount) ? +profile.followsCount : null;
      const region = city(text);
      const sourceHandle = String(p.author && p.author.handle || '');
      const namePattern = /\d{4,}$/.test(sourceHandle) || /\d{5,}/.test(sourceHandle) || /^[a-z]+_?\d{3,}$/i.test(sourceHandle);
      const item = {
        id: crypto.createHash('sha256').update(key).digest('hex').slice(0, 20), source: 'Bluesky public search', account: 'akun_' + anon(did),
        createdAt, accountCreatedAt, ageDays, followers, following, namePattern,
        text: text.slice(0, 2000), provinceCode: region || null,
        locationBasis: region ? 'nama_wilayah_disebut_dalam_teks' : null,
        postUrl: bskyPostUrl(p), collectedAt: new Date().toISOString()
      };
      buzzerRecords.set(key, item); batch.push(item);
      stat.seen++; stat.id++; found++;
      track(did, text);
      const h = heur(text);
      if (h.risk >= MIN_RISK) {
        emit({ src: 'Bluesky Bot', type: h.sara ? 0 : 3, risk: h.risk, text: text.slice(0, 280), city: region, sara: h.sara, acct: item.account });
        emitted++;
      }
    }
    while (buzzerRecords.size > BUZZER_RECORD_MAX) buzzerRecords.delete(buzzerRecords.keys().next().value);
    if (batch.length) send('buzzer-data', { generatedAt: new Date().toISOString(), count: batch.length, items: batch });
  } finally {
    bot.running = false; bot.lastFound = found; bot.lastEmitted = emitted;
    bot.lastErrors = errors;
    if (errors && !bot.lastError) bot.lastError = errors + ' kata kunci gagal';
    send('bot', botPublic()); send('stat', stat);
  }
  console.log(`Bot ${reason}: ${found} unggahan baru dikumpulkan, ${emitted} memenuhi ambang feed`);
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
  let ws; try { ws = new WebSocket(JETSTREAM); } catch (e) { console.log('JETSTREAM tidak valid:', e.message, '- mencoba lagi 30 detik'); return void setTimeout(connect, 30000); }
  ws.onopen = () => console.log('Jetstream tersambung');
  ws.onmessage = e => onMessage(String(e.data));
  ws.onclose = () => { console.log('Jetstream putus, mencoba lagi 5 detik'); setTimeout(connect, 5000); };
  ws.onerror = () => {};
}
const dec = s => String(s || '').replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
function blocksOf(x, tag) {   // pemindaian linear (hindari backtracking kuadratik pada feed hostile)
  const out = [], lo = x.toLowerCase(), open = '<' + tag, close = '</' + tag + '>';
  let i = 0;
  while (out.length < 200) { const a = lo.indexOf(open, i); if (a < 0) break; const b = lo.indexOf(close, a); if (b < 0) break; out.push(x.slice(a, b + close.length)); i = b + close.length; }
  return out;
}
function rssItems(x) {
  const out = [], blocks = blocksOf(x, 'item').length ? blocksOf(x, 'item') : blocksOf(x, 'entry');
  for (const b of blocks) {
    const pick = (re) => { const m = b.match(re); return m ? dec(m[1]).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : ''; };
    const title = pick(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const link = pick(/<link[^>]*href=["']([^"']+)["']/i) || pick(/<link[^>]*>([\s\S]*?)<\/link>/i);
    const desc = pick(/<(?:description|summary|content:encoded)[^>]*>([\s\S]*?)<\/(?:description|summary|content:encoded)>/i);
    const src = pick(/<source[^>]*>([\s\S]*?)<\/source>/i);
    const date = pick(/<(?:pubDate|published|updated|dc:date)[^>]*>([\s\S]*?)<\/(?:pubDate|published|updated|dc:date)>/i);
    if (title && /^https?:\/\//i.test(link)) out.push({ title, link, desc, src, published: date });
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
    const x = (await (await fetch(u, { signal: AbortSignal.timeout(10000) })).text()).slice(0, 2e6);
    const host = new URL(u).hostname.replace(/^www\./, '');
    for (const it of rssItems(x).slice(0, 20)) {
      const t = it.title.trim(), key = (it.link || t).trim(); if (!t || seenRss.has(key)) continue;
      seenRss.add(key); while (seenRss.size > 10000) seenRss.delete(seenRss.values().next().value);
      stat.seen++; stat.id++; stat.news++;
      const src = it.src || host;
      const h = heur(t + ' ' + it.desc);
      const pub = Date.parse(it.published || '') || null;
      const region = city(t + ' ' + it.desc);
      const article = { id: crypto.createHash('sha256').update(key).digest('hex').slice(0, 16), title: t.slice(0, 300), url: it.link, source: src, sourceHost: host, publishedAt: pub ? new Date(pub).toISOString() : null, collectedAt: new Date().toISOString(), province: region, risk: h.risk, sara: !!h.sara, summary: it.desc.slice(0, 500), dataType: 'public_news' };
      article.analysis = analyzeNews({ ...article, independentSources: 1 });
      newsArticles.unshift(article);
      if (newsArticles.length > NEWS_MAX) newsArticles.length = NEWS_MAX;
      persistNews();
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
      if (n > 65536) { reject(Object.assign(new Error('Body terlalu besar'), { code: 413 })); }
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
  const host = String(q.headers.host || '').replace(/:\d+$/, '').toLowerCase();
  if (!(['localhost', '127.0.0.1', '[::1]'].includes(host) || HOST_OK.includes(host))) { r.writeHead(403); return r.end(); }   // anti DNS rebinding
  if (q.method === 'POST' && ((o && !okOrigin(o)) || !/^application\/json\b/i.test(q.headers['content-type'] || ''))) return reply(r, 403, { ok: false, error: 'Origin atau Content-Type tidak diizinkan' });   // anti CSRF
  if (path === '/events') {
    if (clients.size >= MAX_CLIENTS) { r.writeHead(503); return r.end(); }
    r.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    backlog.slice(-20).forEach(h => r.write(`event: hit\ndata: ${JSON.stringify(h)}\n\n`));
    r.write(`event: bot\ndata: ${JSON.stringify(botPublic())}\n\n`);
    clients.add(r); q.on('close', () => clients.delete(r)); return;
  }
  if (path === '/api/ai/research' && q.method === 'POST') {
    try {
      const d = await readJson(q);
      const query = String(d.query || '').trim().slice(0, 1200);
      const provider = ['openrouter', 'gemini', 'openai', 'both'].includes(d.provider) ? d.provider : 'openrouter';
      if (query.length < 8) return reply(r, 400, { ok: false, error: 'Pertanyaan minimal 8 karakter.' });
      const recent = newsArticles.slice(0, 40).map(a => ({ title:a.title, url:a.url, source:a.source || a.sourceHost, publishedAt:a.publishedAt, summary:a.summary || '', province:a.province || null }));
      const evidence = recent.length ? '\n\nARTIKEL YANG SUDAH DIKUMPULKAN (gunakan sebagai petunjuk, bukan bukti tunggal):\n' + JSON.stringify(recent) : '\n\nBelum ada artikel di arsip lokal.';
      const instructions = 'Anda adalah asisten riset isu publik yang netral. Jawab dalam Bahasa Indonesia. Bedakan FAKTA TERKONFIRMASI, KLAIM SUMBER, ANALISIS, dan HAL YANG BELUM DIKETAHUI. Jangan menuduh individu/kelompok, jangan menyimpulkan niat, jangan memberi label politik, SARA, hoaks, atau ancaman tanpa bukti. Gunakan arsip RSS lokal sebagai konteks bukti. Jangan mengaku telah melakukan pencarian internet atau menyatakan informasi sebagai terbaru jika tidak tersedia bukti pencarian langsung. Cantumkan URL artikel lokal yang relevan jika tersedia. Jangan pernah membuat URL, judul, tanggal, atau kutipan. Jika tidak menemukan sumber yang dapat diverifikasi, katakan tidak ditemukan. Jangan samakan jumlah artikel dengan jumlah unggahan atau dukungan publik. Arsip lokal berikut hanya konteks tambahan.' + evidence + '\n\nPERTANYAAN RISET: ' + query;
      const callOpenRouter = async () => {
        if (!process.env.OPENROUTER_API_KEY) {
          throw new Error('OPENROUTER_API_KEY belum diatur pada file .env / environment Collector.');
        }

        const model = process.env.OPENROUTER_MODEL || 'openrouter/free';

        const rr = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + process.env.OPENROUTER_API_KEY
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'user', content: instructions }
            ],
            temperature: 0.2,
            max_tokens: 3500
          }),
          signal: AbortSignal.timeout(90000)
        });

        const j = await rr.json();

        if (!rr.ok) {
          throw new Error(
            'OpenRouter HTTP ' + rr.status + ': ' +
            (j.error?.message || 'permintaan gagal')
          );
        }

        const raw = j.choices?.[0]?.message?.content;

        const text = typeof raw === 'string'
          ? raw.trim()
          : Array.isArray(raw)
            ? raw.map(x => typeof x === 'string' ? x : (x.text || '')).join('\n').trim()
            : '';

        if (!text) {
          throw new Error('OpenRouter tidak mengembalikan teks jawaban.');
        }

        return {
          provider: 'OpenRouter',
          model: j.model || model,
          text,
          citations: [],
          searched: false
        };
      };
      const callGemini = async () => {
        if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY belum diatur pada file .env / environment Collector.');
        const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
        const u = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(process.env.GEMINI_API_KEY);
        const rr = await fetch(u, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ contents:[{parts:[{text:instructions}]}], tools:[{google_search:{}}], generationConfig:{temperature:0.2, maxOutputTokens:3500} }), signal:AbortSignal.timeout(90000) });
        const j = await rr.json(); if (!rr.ok) throw new Error('Gemini HTTP ' + rr.status + ': ' + (j.error?.message || 'permintaan gagal'));
        const c = j.candidates?.[0]; const text = (c?.content?.parts || []).map(x=>x.text || '').join('\n').trim();
        const gm = c?.groundingMetadata || {}; const chunks = gm.groundingChunks || [];
        const citations = chunks.map(x=>x.web).filter(x=>x?.uri).map(x=>({title:x.title || x.uri, url:x.uri}));
        return { provider:'Gemini', model, text, citations, searched:!!gm.searchEntryPoint || chunks.length>0 };
      };
      const callOpenAI = async () => {
        if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY belum diatur pada file .env / environment Collector.');
        const model = process.env.OPENAI_MODEL || 'gpt-5.4';
        const rr = await fetch('https://api.openai.com/v1/responses', { method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+process.env.OPENAI_API_KEY}, body:JSON.stringify({ model, tools:[{type:'web_search'}], tool_choice:'required', input:instructions }), signal:AbortSignal.timeout(90000) });
        const j = await rr.json(); if (!rr.ok) throw new Error('OpenAI HTTP ' + rr.status + ': ' + (j.error?.message || 'permintaan gagal'));
        const parts=[]; const citations=[];
        for (const item of (j.output || [])) for (const c of (item.content || [])) { if(c.type==='output_text' && c.text) parts.push(c.text); for(const a of (c.annotations || [])) if(a.type==='url_citation' && a.url_citation?.url) citations.push({title:a.url_citation.title || a.url_citation.url,url:a.url_citation.url}); }
        return { provider:'OpenAI', model, text:parts.join('\n').trim() || j.output_text || '', citations, searched:(j.output || []).some(x=>x.type==='web_search_call') };
      };
      const tasks = provider==='both' ? [callGemini(),callOpenAI()] : [provider==='openai'?callOpenAI():provider==='openrouter'?callOpenRouter():callGemini()];
      const settled = await Promise.allSettled(tasks);
      const results = settled.map(x=>x.status==='fulfilled'?x.value:{error:x.reason?.message || 'Penyedia AI gagal'});
      const ok = results.some(x=>!x.error && x.text);
      return reply(r, ok?200:502, { ok, provider, generatedAt:new Date().toISOString(), results, notice: provider==='openrouter' ? 'OpenRouter menganalisis pertanyaan dengan konteks arsip RSS lokal. Fitur ini tidak menjalankan web search eksternal; verifikasi setiap klaim melalui tautan sumber.' : 'Jawaban AI adalah bahan riset, bukan verifikasi final. Periksa tautan sumber asli dan tanggal publikasi sebelum digunakan.' });
    } catch (e) { return reply(r, e.code===413?413:400, {ok:false,error:e.message || 'Permintaan riset gagal'}); }
  }
  if (path === '/news' || path === '/api/news') {
    const u = new URL(q.url, 'http://localhost');
    const limit = Math.max(1, Math.min(1500, +(u.searchParams.get('limit') || 200)));
    const province = (u.searchParams.get('province') || '').toUpperCase();
    const status = (u.searchParams.get('status') || '').toUpperCase();
    const source = (u.searchParams.get('source') || '').toLowerCase();
    const search = (u.searchParams.get('q') || '').toLowerCase().slice(0, 120);
    const filtered = newsArticles.filter(a => (!province || a.province === province) && (!status || (a.analysis && a.analysis.status === status)) && (!source || String(a.source || a.sourceHost || '').toLowerCase().includes(source)) && (!search || (String(a.title || '') + ' ' + String(a.summary || '')).toLowerCase().includes(search)));
    const items = filtered.slice(0, limit).map(a => a.analysis ? a : { ...a, analysis: analyzeNews(a) });
    return reply(r, 200, { ok: true, count: items.length, totalStored: newsArticles.length, totalMatched: filtered.length, sources: NEWS_SOURCES, pollIntervalMin: 5, analysis: { method: 'local_rules_preliminary', aiAutomatic: false }, items });
  }
  if (path === '/buzzer/data' || path === '/api/buzzer/data') {
    const u = new URL(q.url, 'http://localhost');
    const limit = Math.max(1, Math.min(1000, +(u.searchParams.get('limit') || 500)));
    const items = [...buzzerRecords.values()].slice(-limit).reverse();
    return reply(r, 200, { ok: true, source: 'Bluesky public search', count: items.length, totalStored: buzzerRecords.size, bot: botPublic(), items, notice: 'Data unggahan publik untuk analisis lokal. Kode wilayah hanya berasal dari penyebutan nama wilayah dalam teks, bukan lokasi akun atau geolokasi.' });
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
    } catch (e) { return reply(r, e.code === 413 ? 413 : 400, { ok: false, error: e.message }); }
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

  // Serve dashboard and its local assets from the same HTTP origin as the API.
  // Only GET/HEAD are allowed; hidden files, environment files and path traversal are denied.
  if ((q.method === 'GET' || q.method === 'HEAD') && !path.startsWith('/api/') && !path.startsWith('/bot')) {
    let rel;
    try { rel = decodeURIComponent(path === '/' ? '/index.html' : path); }
    catch { r.writeHead(400); return r.end('Bad Request'); }
    if (rel.split('/').some(part => part.startsWith('.') || part === '..')) { r.writeHead(404); return r.end('Not Found'); }
    const root = require('path').resolve(__dirname, '..');
    const file = require('path').resolve(root, '.' + rel);
    if (file !== root && !file.startsWith(root + require('path').sep)) { r.writeHead(404); return r.end('Not Found'); }
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) { r.writeHead(404); return r.end('Not Found'); }
      const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.svg':'image/svg+xml', '.webp':'image/webp', '.ico':'image/x-icon', '.woff2':'font/woff2' };
      r.writeHead(200, { 'Content-Type': types[require('path').extname(file).toLowerCase()] || 'application/octet-stream', 'X-Content-Type-Options':'nosniff', 'Cache-Control':'no-cache' });
      if (q.method === 'HEAD') return r.end();
      fs.createReadStream(file).pipe(r);
    });
    return;
  }
  r.writeHead(404); r.end();
}).listen(PORT, HOST, () => console.log(`Kartika Shield dashboard + Collector di http://${HOST}:${PORT}/  (API: /health, /news, /events; bot: ${bot.auto ? 'otomatis tiap ' + bot.intervalMin + ' menit' : 'nonaktif'})`));

setInterval(() => send('stat', stat), 2000);
connect();
RSS_URLS.forEach(u => { pollRss(u); setInterval(() => pollRss(u), 5 * 60 * 1000); });
if (bot.auto) armBot(true);
