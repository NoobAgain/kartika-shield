#!/usr/bin/env node
// CARAKA, agen pemantau yang selalu siaga untuk Kartika Shield.
// Memantau sumber resmi secara berkala (Bluesky, YouTube, Facebook Halaman milik sendiri, RSS berita), menilai, mendeteksi
// teks kembar lintas akun, lalu menyiarkan hasilnya ke dasbor (SSE /events) dan menyediakan CSV untuk tab Deteksi Buzzer.
// Node.js >= 22, tanpa dependensi.   Bantuan: node caraka.js --bantuan     Cek kredensial: node caraka.js --cek
// Rahasia (kunci, token, kata sandi aplikasi) HANYA lewat variabel lingkungan, tidak pernah di berkas konfigurasi.
const http = require('http'), crypto = require('crypto'), fs = require('fs'), path = require('path');

const A = {}; { const v = process.argv.slice(2); for (let i = 0; i < v.length; i++) if (v[i].startsWith('--')) { const k = v[i].slice(2); A[k] = (v[i + 1] && !v[i + 1].startsWith('--')) ? v[++i] : true; } }
if (A.bantuan || A.help) {
  console.log(`CARAKA, agen pemantau siaga Kartika Shield

  node caraka.js                       jalan terus (Ctrl+C untuk berhenti)
  node caraka.js --cek                 uji konfigurasi dan kredensial lalu keluar
  node caraka.js --konfig berkas.json  pakai berkas konfigurasi lain (bawaan caraka.config.json)

Rahasia lewat variabel lingkungan:
  BSKY_HANDLE, BSKY_APP_PASSWORD       Bluesky (App Password)
  YT_API_KEY                           YouTube Data API v3
  FB_PAGE_TOKEN, FB_PAGE_ID            Facebook, hanya Halaman yang Anda kelola
Pengaturan lain di caraka.config.json (lihat caraka.config.contoh.json).

Dasbor: buka tab Feed, isi alamat kolektor http://localhost:8787, lalu Sambungkan.
Tab Buzzer: tombol "Ambil dari Caraka" memuat /buzzer.csv.`); process.exit(0);
}

const DEF = { port: 8787, host: '127.0.0.1', dataDir: 'caraka-data', kataKunci: [], ambangRisiko: 45, akunAsli: false, izinkanAsal: [],
  sumber: { bluesky: { aktif: true, intervalMenit: 3, bahasa: 'id' }, youtube: { aktif: true, intervalMenit: 30, cariVideoMenit: 120, videoMaks: 5, komentarMaks: 200, kuotaHarian: 8000 },
    facebook: { aktif: true, intervalMenit: 10, postMaks: 10 }, rss: { aktif: true, intervalMenit: 10, url: [] } } };
function muatKonfig() {
  const f = typeof A.konfig === 'string' ? A.konfig : 'caraka.config.json'; let u = {};
  if (fs.existsSync(f)) { try { u = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { console.error('Galat: ' + f + ' bukan JSON yang valid (' + e.message + ')'); process.exit(1); } }
  else if (typeof A.konfig === 'string') { console.error('Galat: berkas konfigurasi tidak ada: ' + f); process.exit(1); }
  const c = { ...DEF, ...u, sumber: {} }; for (const k of Object.keys(DEF.sumber)) c.sumber[k] = { ...DEF.sumber[k], ...((u.sumber || {})[k] || {}) };
  c.port = +process.env.PORT || +c.port; c.host = process.env.HOST || c.host;
  c.kataKunci = (Array.isArray(c.kataKunci) ? c.kataKunci : []).map(s => String(s).trim()).filter(Boolean).slice(0, 20);
  return c;
}
const C = muatKonfig();
const ENV = process.env;
const okOrigin = o => o === 'null' || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o || '') || (C.izinkanAsal || []).includes(o);

// ---------- umum
const log = (...a) => console.log(new Date().toLocaleTimeString('id-ID'), ...a);
const tidur = ms => new Promise(r => setTimeout(r, ms));
const CITY = [[/\b(?:papua barat daya|sorong)\b/i,'PD'],[/\b(?:papua barat|manokwari)\b/i,'PB'],[/\b(?:papua tengah|nabire)\b/i,'PH'],[/\b(?:papua selatan|merauke)\b/i,'PS'],[/\b(?:papua pegunungan|wamena|jayawijaya)\b/i,'PP'],[/\b(?:jayapura|papua)\b/i,'PA'],[/\b(?:balikpapan|samarinda|kaltim)\b/i,'KI'],[/\b(?:denpasar|bali)\b/i,'BA'],[/\b(?:jakarta|dki)\b/i,'JK'],[/\b(?:bekasi|depok|bogor|bandung|jabar)\b/i,'JB'],[/\b(?:tangerang|serang|banten)\b/i,'BT'],[/\b(?:semarang|surakarta|jateng)\b/i,'JT'],[/\b(?:yogyakarta|jogja|yogya)\b/i,'YO'],[/\b(?:surabaya|malang|jatim)\b/i,'JI'],[/\b(?:medan|sumut)\b/i,'SU'],[/\b(?:banda aceh|aceh)\b/i,'AC'],[/\b(?:padang|sumbar)\b/i,'SB'],[/\b(?:pekanbaru|riau)\b/i,'RI'],[/\b(?:batam|tanjung ?pinang|kepri)\b/i,'KR'],[/\b(?:jambi)\b/i,'JA'],[/\b(?:bengkulu)\b/i,'BE'],[/\b(?:palembang|sumsel)\b/i,'SS'],[/\b(?:pangkal ?pinang|bangka|belitung|babel)\b/i,'BB'],[/\b(?:bandar lampung|lampung)\b/i,'LA'],[/\b(?:pontianak|kalbar)\b/i,'KB'],[/\b(?:banjarmasin|banjarbaru|kalsel)\b/i,'KS'],[/\b(?:palangka ?raya|kalteng)\b/i,'KT'],[/\b(?:tanjung selor|kaltara|kalimantan utara)\b/i,'KU'],[/\b(?:makassar|sulsel)\b/i,'SN'],[/\b(?:mamuju|sulbar)\b/i,'SR'],[/\b(?:manado|sulut)\b/i,'SA'],[/\b(?:kota palu|sulteng)\b/i,'ST'],[/\b(?:kendari|sultra)\b/i,'SG'],[/\b(?:gorontalo)\b/i,'GO'],[/\b(?:sofifi|ternate|malut|maluku utara)\b/i,'MU'],[/\b(?:ambon|maluku)\b/i,'MA'],[/\b(?:mataram|ntb)\b/i,'NB'],[/\b(?:kupang|ntt)\b/i,'NT']];  // urutan penting: yang lebih spesifik lebih dulu, \b mencegah 'bali' cocok dengan 'balikpapan'
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
const bigrams = k => { const w = k.split(' '), o = new Set(); for (let i = 0; i < w.length - 1; i++) o.add(w[i] + ' ' + w[i + 1]); return o; };
const jac = (a, b) => { let i = 0; a.forEach(x => { if (b.has(x)) i++; }); const u = a.size + b.size - i; return u ? i / u : 0; };
// model ringan terlatih (opsional, sama dengan di dasbor): dibaca dari ../data/model.js bila ada
let ML = null; try { const s = fs.readFileSync(path.join(__dirname, '..', 'data', 'model.js'), 'utf8'); ML = JSON.parse(s.slice(s.indexOf('{', s.indexOf('DATA_ML')), s.lastIndexOf('}') + 1)); } catch (e) {}
function mlScore(t) { if (!ML) return null; const k = String(t).toLowerCase().replace(/https?:\/\/\S+/g, ' ').match(/[a-z]{2,}/g) || [], f = new Set(k); for (let i = 0; i < k.length - 1; i++) f.add(k[i] + ' ' + k[i + 1]); let z = ML.b; f.forEach(x => { const w = ML.w[x]; if (w) z += w; }); return 1 / (1 + Math.exp(-z)); }
function nilai(t) { const h = heur(t), m = mlScore(t); let r = h.risk; if (m !== null && m >= .5) r = Math.min(95, r + Math.round((m - .5) / .5 * 40)); return { risk: r, sara: h.sara }; }
const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex').slice(0, 8);
const hashAkun = (id, nama) => { const h = sha(id), huruf = [...h].map(c => String.fromCharCode(97 + parseInt(c, 16))).join(''), ekor = (String(nama || '').replace(/^@/, '').split('.')[0].match(/\d{4,}$/) || [''])[0]; return 'akun_' + huruf + ekor; };
const jamWIB = ms => { const d = new Date(ms + 7 * 3600e3); return String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0'); };

// ---------- penyimpanan (agar siaga tahan restart)
fs.mkdirSync(C.dataDir, { recursive: true });
const F_STATE = path.join(C.dataDir, 'state.json'), F_BUF = path.join(C.dataDir, 'buffer.jsonl');
let S = { seen: {}, yt: { day: '', used: 0, vids: {} }, fb: { posts: {} }, bs: { last: 0 } };
try { const x = JSON.parse(fs.readFileSync(F_STATE, 'utf8')); S = { ...S, ...x, yt: { ...S.yt, ...(x.yt || {}) }, fb: { ...S.fb, ...(x.fb || {}) }, bs: { ...S.bs, ...(x.bs || {}) } }; } catch (e) {}
const seen = new Map(Object.entries(S.seen || {}));               // id -> waktu (ms), dibatasi
const sudah = id => seen.has(id), tandai = id => { seen.set(id, Date.now()); if (seen.size > 30000) { const o = [...seen.entries()].sort((a, b) => a[1] - b[1]).slice(0, 5000); o.forEach(([k]) => seen.delete(k)); } };
function simpanState() { try { S.seen = Object.fromEntries(seen); const t = F_STATE + '.tmp'; fs.writeFileSync(t, JSON.stringify(S)); fs.renameSync(t, F_STATE); } catch (e) { log('Gagal menyimpan state:', e.message); } }
const DAY = 864e5; let buf = [];
try { fs.readFileSync(F_BUF, 'utf8').split('\n').forEach(l => { if (!l) return; try { const o = JSON.parse(l); if (Date.now() - o.ts <= DAY) buf.push(o); } catch (e) {} }); } catch (e) {}
function padatkanBuf() { buf = buf.filter(o => Date.now() - o.ts <= DAY).slice(-8000); try { fs.writeFileSync(F_BUF, buf.map(o => JSON.stringify(o)).join('\n') + (buf.length ? '\n' : '')); } catch (e) {} }

// ---------- inti: serap, nilai, deteksi koordinasi, siarkan
const stat = { diserap: 0, ditandai: 0, terkoordinasi: 0, mulai: Date.now() }, klien = new Set(), backlog = []; let grup = [];
const kirim = (ev, d) => { const m = `event: ${ev}\ndata: ${JSON.stringify(d)}\n\n`; klien.forEach(r => r.write(m)); };
function siarkan(h) { h.ts = new Date().toISOString(); stat.ditandai++; backlog.push(h); if (backlog.length > 50) backlog.shift(); kirim('hit', h); log('TANDA', h.src, 'risiko', h.risk, (h.city || '-'), h.text.slice(0, 70).replace(/\s+/g, ' ')); }
function lacak(akun, teks, src) {
  const k = norm(teks); if (k.split(' ').length < 5) return; const now = Date.now(), sh = bigrams(k);
  let g = grup.find(x => now - x.first <= 15 * 60e3 && jac(x.sh, sh) >= 0.6);
  if (!g) { g = { first: now, akun: new Set(), n: 0, sh }; grup.push(g); }
  g.akun.add(akun);
  if (g.akun.size >= 3 && g.akun.size > g.n) { g.n = g.akun.size; stat.terkoordinasi++; siarkan({ src, type: 1, risk: Math.min(95, 50 + g.n * 8), text: teks.slice(0, 280), city: city(teks), coordinated: g.n }); }
  if (grup.length > 2000) grup = grup.filter(x => now - x.first <= 15 * 60e3).slice(-2000);
}
// it: { id, src, akun (hash), umur, fo, fi, ts (ms), teks }   akun/umur boleh kosong (mis. RSS)
function serap(it) {
  if (!it.teks || sudah(it.id)) return false; tandai(it.id); stat.diserap++;
  const teks = it.teks.replace(/\s+/g, ' ').trim(); if (teks.length < 3) return false;
  if (it.akun && Number.isFinite(it.umur)) { const o = { ts: it.ts, akun: it.akun, umur: it.umur, fo: it.fo | 0, fi: it.fi | 0, teks: teks.slice(0, 1000), src: it.src }; buf.push(o); try { fs.appendFileSync(F_BUF, JSON.stringify(o) + '\n'); } catch (e) {} }
  if (it.akun) lacak(it.akun, teks, it.src);
  const n = nilai(teks); if (n.risk >= C.ambangRisiko) siarkan({ src: it.src, type: n.sara ? 0 : 3, risk: n.risk, text: teks.slice(0, 280), city: city(teks), sara: n.sara, acct: it.akun || undefined });
  return true;
}

// ---------- HTTP dengan percobaan ulang
class GalatAuth extends Error {}
async function ambil(url, opt, nama) {
  for (let t = 0; t < 4; t++) {
    let r; try { r = await fetch(url, { ...opt, signal: AbortSignal.timeout(20000) }); } catch (e) { await tidur(1000 * 2 ** t); continue; }
    if (r.status === 429 || r.status >= 500) { await tidur(Math.min(60, (+r.headers.get('retry-after') || 2 ** t)) * 1000); continue; }
    if (!r.ok) { let b = ''; try { b = await r.text(); } catch (e) {} const e = new Error(nama + ' gagal (' + r.status + ') ' + b.replace(/access_token=[^&"\s]+|key=[^&"\s]+/g, '[rahasia]').slice(0, 100)); e.status = r.status; e.body = b;
      if (r.status === 401 || r.status === 403 && /keyInvalid|API key|OAuth|invalid_token|expired/i.test(b) || /"code":\s*190/.test(b) || r.status === 400 && /keyInvalid/i.test(b)) throw new GalatAuth(e.message); throw e; }
    await tidur(200); return r.json();
  }
  throw new Error(nama + ' gagal berulang kali');
}

// ---------- sumber: Bluesky
const BS = { svc: (ENV.BSKY_SERVICE || 'https://bsky.social').replace(/\/$/, ''), tok: '', tokTs: 0, prof: new Map() };
const bsAktif = () => C.sumber.bluesky.aktif && ENV.BSKY_HANDLE && ENV.BSKY_APP_PASSWORD && C.kataKunci.length;
async function bsMasuk() { if (BS.tok && Date.now() - BS.tokTs < 90 * 60e3) return BS.tok;
  const r = await ambil(BS.svc + '/xrpc/com.atproto.server.createSession', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: ENV.BSKY_HANDLE, password: ENV.BSKY_APP_PASSWORD }) }, 'Bluesky masuk');
  BS.tok = r.accessJwt; BS.tokTs = Date.now(); return BS.tok; }
async function bsPutaran() {
  const tok = await bsMasuk(), H = { Authorization: 'Bearer ' + tok }, sejak = new Date(Math.max(S.bs.last, Date.now() - 3 * 3600e3) - 2 * 60e3).toISOString(), posts = [];
  for (const q of C.kataKunci) { let cur; for (let h = 0; h < 3; h++) {
    const u = new URL(BS.svc + '/xrpc/app.bsky.feed.searchPosts'); u.searchParams.set('q', q); u.searchParams.set('limit', '100'); u.searchParams.set('sort', 'latest'); u.searchParams.set('since', sejak); if (C.sumber.bluesky.bahasa !== 'semua') u.searchParams.set('lang', C.sumber.bluesky.bahasa); if (cur) u.searchParams.set('cursor', cur);
    const r = await ambil(u, { headers: H }, 'Bluesky cari'); (r.posts || []).forEach(p => { if (p.record && p.record.text && !sudah(p.uri)) posts.push(p); }); cur = r.cursor; if (!cur || !(r.posts || []).length) break; } }
  const dids = [...new Set(posts.map(p => p.author.did))].filter(d => !(BS.prof.get(d) && Date.now() - BS.prof.get(d).t < 6 * 3600e3));
  for (let i = 0; i < dids.length; i += 25) { const u = new URL(BS.svc + '/xrpc/app.bsky.actor.getProfiles'); dids.slice(i, i + 25).forEach(d => u.searchParams.append('actors', d)); const r = await ambil(u, { headers: H }, 'Bluesky profil'); (r.profiles || []).forEach(p => BS.prof.set(p.did, { t: Date.now(), p })); }
  if (BS.prof.size > 20000) BS.prof.clear();
  let n = 0; for (const p of posts) { const pr = (BS.prof.get(p.author.did) || {}).p; if (!pr) continue; const dibuat = pr.createdAt || pr.indexedAt; if (!dibuat) continue;
    if (serap({ id: p.uri, src: 'Bluesky', akun: C.akunAsli ? p.author.handle : hashAkun(p.author.did, p.author.handle), umur: Math.max(0, Math.round((Date.now() - Date.parse(dibuat)) / 864e5)), fo: pr.followersCount || 0, fi: pr.followsCount || 0, ts: Date.parse(p.indexedAt || p.record.createdAt) || Date.now(), teks: p.record.text })) n++; }
  S.bs.last = Date.now(); return n; }

// ---------- sumber: YouTube (kuota dijaga)
const YT = { base: (ENV.YT_BASE || 'https://www.googleapis.com/youtube/v3').replace(/\/$/, ''), prof: new Map() };
const ytAktif = () => C.sumber.youtube.aktif && ENV.YT_API_KEY && C.kataKunci.length;
const hariKuota = () => new Date(Date.now() - 8 * 3600e3).toISOString().slice(0, 10);   // kuota YouTube direset tengah malam Pasifik (perkiraan)
async function ytApi(p, q, biaya) { if (S.yt.day !== hariKuota()) { S.yt.day = hariKuota(); S.yt.used = 0; }
  if (S.yt.used + biaya > C.sumber.youtube.kuotaHarian) { const e = new Error('kuota harian YouTube versi Caraka habis (' + S.yt.used + '/' + C.sumber.youtube.kuotaHarian + ')'); e.kuota = true; throw e; }
  const u = new URL(YT.base + '/' + p); Object.entries(q).forEach(([k, v]) => u.searchParams.set(k, v)); u.searchParams.set('key', ENV.YT_API_KEY);
  const r = await ambil(u, {}, 'YouTube ' + p); S.yt.used += biaya; return r; }
async function ytPutaran() {
  if (S.yt.day !== hariKuota()) { S.yt.day = hariKuota(); S.yt.used = 0; }
  const Y = C.sumber.youtube, sejak24 = new Date(Date.now() - DAY).toISOString();
  const cariLagi = Date.now() - (S.yt.lastSearch || 0) >= (Y.cariVideoMenit || 120) * 60e3;   // pencarian mahal (100 unit), dibatasi frekuensinya
  if (cariLagi) S.yt.lastSearch = Date.now();
  for (const q of cariLagi ? C.kataKunci : []) { try { const r = await ytApi('search', { part: 'snippet', type: 'video', q, order: 'date', maxResults: Math.min(Y.videoMaks, 50), regionCode: 'ID', relevanceLanguage: 'id', publishedAfter: sejak24 }, 100);
    (r.items || []).forEach(x => { const v = x.id && x.id.videoId; if (v && !S.yt.vids[v]) S.yt.vids[v] = { t: Date.now(), last: 0 }; }); } catch (e) { if (e.kuota) { log('YouTube:', e.message, '- hanya memantau video yang sudah dikenal'); break; } throw e; } }
  Object.keys(S.yt.vids).forEach(v => { if (Date.now() - S.yt.vids[v].t > DAY) delete S.yt.vids[v]; });
  const baru = []; let kom = 0;
  for (const [v, st] of Object.entries(S.yt.vids)) { let tok = ''; const vb = [];
    for (let h = 0; h < 3 && kom < Y.komentarMaks; h++) { let r; try { r = await ytApi('commentThreads', { part: 'snippet', videoId: v, order: 'time', maxResults: 100, textFormat: 'plainText', ...(tok ? { pageToken: tok } : {}) }, 1); }
      catch (e) { if (e.kuota) throw e; if (e.status === 403 || e.status === 404) { delete S.yt.vids[v]; break; } throw e; }
      let lewat = false; for (const it of r.items || []) { const c = it.snippet && it.snippet.topLevelComment && it.snippet.topLevelComment.snippet; if (!c || !c.authorChannelId) continue; const ts = Date.parse(c.publishedAt);
        if (ts <= st.last || Date.now() - ts > DAY) { lewat = true; continue; } const o = { id: 'yt:' + (it.id || sha(c.authorChannelId.value + c.publishedAt)), ch: c.authorChannelId.value, nama: c.authorDisplayName, teks: c.textOriginal || c.textDisplay || '', ts }; baru.push(o); vb.push(o); kom++; }
      tok = r.nextPageToken; if (!tok || lewat) break; }
    const mx = vb.reduce((m, b) => Math.max(m, b.ts), 0); if (mx > st.last) st.last = mx; }
  const need = [...new Set(baru.map(b => b.ch))].filter(c => !(YT.prof.get(c) && Date.now() - YT.prof.get(c).t < DAY));
  for (let i = 0; i < need.length; i += 50) { const r = await ytApi('channels', { part: 'snippet,statistics', id: need.slice(i, i + 50).join(','), maxResults: 50 }, 1); (r.items || []).forEach(c => YT.prof.set(c.id, { t: Date.now(), c })); }
  if (YT.prof.size > 20000) YT.prof.clear();
  let n = 0; for (const b of baru) { const c = (YT.prof.get(b.ch) || {}).c; if (!c || !c.snippet || !c.snippet.publishedAt) continue; const st = c.statistics || {};
    if (serap({ id: b.id, src: 'YouTube', akun: C.akunAsli ? b.nama : hashAkun(b.ch, b.nama), umur: Math.max(0, Math.round((Date.now() - Date.parse(c.snippet.publishedAt)) / 864e5)), fo: st.hiddenSubscriberCount ? 0 : (+st.subscriberCount || 0), fi: 0, ts: b.ts, teks: b.teks })) n++; }
  return n; }

// ---------- sumber: Facebook (Halaman milik sendiri)
const FB = { base: (ENV.FB_BASE || 'https://graph.facebook.com' + (ENV.FB_VERSION ? '/' + ENV.FB_VERSION : '')).replace(/\/$/, '') };
const fbAktif = () => C.sumber.facebook.aktif && ENV.FB_PAGE_TOKEN && /^\d+$/.test(ENV.FB_PAGE_ID || '');
const fbApi = (p, q) => { const u = new URL(FB.base + '/' + p); Object.entries(q || {}).forEach(([k, v]) => u.searchParams.set(k, v)); return ambil(u, { headers: { Authorization: 'Bearer ' + ENV.FB_PAGE_TOKEN } }, 'Facebook'); };
async function fbPutaran() { const F = C.sumber.facebook;
  const ps = await fbApi(ENV.FB_PAGE_ID + '/posts', { fields: 'id,created_time', since: Math.floor((Date.now() - DAY) / 1000), limit: Math.min(F.postMaks, 100) }); let n = 0;
  for (const p of (ps.data || []).slice(0, F.postMaks)) { const st = S.fb.posts[p.id] = S.fb.posts[p.id] || { last: 0 }; let after = '', mx = st.last;
    for (let h = 0; h < 3; h++) { const r = await fbApi(p.id + '/comments', { fields: 'id,created_time,message,from{id,name}', filter: 'stream', order: 'reverse_chronological', limit: 100, ...(after ? { after } : {}) }); let lewat = false;
      for (const c of r.data || []) { const ts = Date.parse(c.created_time); if (ts <= st.last || Date.now() - ts > DAY) { lewat = true; continue; } mx = Math.max(mx, ts); if (!c.from || !c.from.id) continue;
        if (serap({ id: 'fb:' + c.id, src: 'Facebook', akun: C.akunAsli ? c.from.name : hashAkun(c.from.id, c.from.name), umur: 365, fo: 100, fi: 100, ts, teks: c.message || '' })) n++; }   // Facebook tidak membuka umur dan follower: nilai netral
      after = r.paging && r.paging.cursors && r.paging.cursors.after && r.paging.next ? r.paging.cursors.after : ''; if (!after || lewat) break; }
    st.last = mx; }
  Object.keys(S.fb.posts).forEach(k => { if (!(ps.data || []).some(p => p.id === k)) delete S.fb.posts[k]; });
  return n; }

// ---------- sumber: RSS berita (judul saja)
const rssAktif = () => C.sumber.rss.aktif && (C.sumber.rss.url || []).length;
async function rssPutaran() { let n = 0;
  for (const u of C.sumber.rss.url) { let x; try { const r = await fetch(u, { signal: AbortSignal.timeout(15000) }); if (!r.ok) continue; x = await r.text(); } catch (e) { continue; }
    for (const m of [...x.matchAll(/<item[\s\S]*?<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/g)].slice(0, 20)) { const t = m[1].trim(); if (t && serap({ id: 'rss:' + sha(u + t), src: 'RSS ' + new URL(u).hostname, teks: t, ts: Date.now() })) n++; } }
  return n; }

// ---------- penjadwal siaga: tiap sumber berjalan sendiri, gagal tidak mematikan yang lain
const SRC = [
  { k: 'bluesky', nama: 'Bluesky', ada: bsAktif, jalan: bsPutaran, mnt: () => C.sumber.bluesky.intervalMenit, perlu: 'BSKY_HANDLE, BSKY_APP_PASSWORD, dan kataKunci' },
  { k: 'youtube', nama: 'YouTube', ada: ytAktif, jalan: ytPutaran, mnt: () => C.sumber.youtube.intervalMenit, perlu: 'YT_API_KEY dan kataKunci' },
  { k: 'facebook', nama: 'Facebook', ada: fbAktif, jalan: fbPutaran, mnt: () => C.sumber.facebook.intervalMenit, perlu: 'FB_PAGE_TOKEN dan FB_PAGE_ID' },
  { k: 'rss', nama: 'RSS', ada: rssAktif, jalan: rssPutaran, mnt: () => C.sumber.rss.intervalMenit, perlu: 'sumber.rss.url' }];
const kondisi = {}; SRC.forEach(s => kondisi[s.k] = { status: 'mati', putaran: 0, baruTotal: 0, gagalBeruntun: 0, terakhir: null, berikut: null, galat: '' });
let berhenti = false;
async function siaga(s) { const K = kondisi[s.k];
  if (!s.ada()) { K.status = C.sumber[s.k].aktif ? 'tanpa kredensial' : 'dimatikan'; if (C.sumber[s.k].aktif) log(s.nama + ': dilewati, perlu ' + s.perlu); return; }
  K.status = 'siaga'; log(s.nama + ': siaga, tiap ' + s.mnt() + ' menit');
  while (!berhenti) { let tunggu = s.mnt() * 60e3;
    try { const n = await s.jalan(); K.putaran++; K.baruTotal += n; K.gagalBeruntun = 0; K.galat = ''; K.status = 'siaga'; K.terakhir = new Date().toISOString(); if (n) log(s.nama + ': ' + n + ' unggahan baru'); simpanState(); }
    catch (e) { if (e instanceof GalatAuth) { K.status = 'ditolak'; K.galat = e.message; log(s.nama + ': kredensial ditolak, sumber ini dihentikan sampai Caraka dijalankan ulang. ' + e.message); return; }
      K.gagalBeruntun++; K.galat = e.message; K.status = 'terganggu'; tunggu = Math.min(tunggu, 30e3 * 2 ** Math.min(K.gagalBeruntun - 1, 6)); log(s.nama + ': gagal (' + K.gagalBeruntun + 'x), coba lagi ' + Math.round(tunggu / 1000) + ' detik. ' + e.message);
      if (e.kuota) tunggu = s.mnt() * 60e3; }
    K.berikut = new Date(Date.now() + tunggu).toISOString(); await tidur(tunggu * (0.9 + Math.random() * 0.2)); }
}

// ---------- server HTTP (hanya baca)
function csvBuzzer(jam) { const t0 = Date.now() - Math.min(24, Math.max(1, jam || 24)) * 3600e3;
  return buf.filter(o => o.ts >= t0).sort((a, b) => a.ts - b.ts).map(o => [o.akun, o.umur, o.fo, o.fi, jamWIB(o.ts), o.teks.replace(/[\r\n,]+/g, ' ').replace(/\|/g, '/').trim() + (city(o.teks) ? '|' + city(o.teks) : '')].join(',')).join('\n') + '\n'; }
function jalankanServer() {
  http.createServer((q, r) => { const o = q.headers.origin; if (o && okOrigin(o)) { r.setHeader('Access-Control-Allow-Origin', o); r.setHeader('Vary', 'Origin'); }
    const u = new URL(q.url, 'http://x');
    if (u.pathname === '/events') { if (klien.size >= 20) { r.writeHead(503); return r.end(); } r.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      backlog.slice(-20).forEach(h => r.write(`event: hit\ndata: ${JSON.stringify(h)}\n\n`)); klien.add(r); q.on('close', () => klien.delete(r)); return; }
    if (u.pathname === '/buzzer.csv') { r.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Cache-Control': 'no-store' }); return r.end(csvBuzzer(+u.searchParams.get('jam'))); }
    if (u.pathname === '/stats' || u.pathname === '/health') { r.writeHead(200, { 'Content-Type': 'application/json' }); return r.end(JSON.stringify({ nama: 'Caraka', ...stat, seen: stat.diserap, id: stat.diserap, flagged: stat.ditandai, coordinated: stat.terkoordinasi, uptimeSec: (process.uptime() | 0), buffer24j: buf.length, model: !!ML, ytKuota: { dipakai: S.yt.used, batas: C.sumber.youtube.kuotaHarian }, sumber: kondisi })); }
    r.writeHead(404); r.end(); }).listen(C.port, C.host, () => log('Caraka siaga di http://' + C.host + ':' + C.port + '  (SSE /events, CSV /buzzer.csv, status /stats)')).on('error', e => { console.error('Galat server: ' + e.message + (e.code === 'EADDRINUSE' ? ' (port ' + C.port + ' sudah dipakai, mungkin Caraka lain sedang jalan)' : '')); process.exit(1); });
}

// ---------- mode cek
async function cek() {
  console.log('Cek konfigurasi Caraka'); console.log('Kata kunci: ' + (C.kataKunci.join(', ') || '(kosong)')); let bad = 0;
  for (const s of SRC) { if (!C.sumber[s.k].aktif) { console.log('- ' + s.nama + ': dimatikan di konfigurasi'); continue; } if (!s.ada()) { console.log('- ' + s.nama + ': BELUM SIAP, perlu ' + s.perlu); bad++; continue; }
    try { if (s.k === 'bluesky') await bsMasuk(); else if (s.k === 'youtube') await ytApi('videos', { part: 'id', id: 'dQw4w9WgXcQ' }, 1); else if (s.k === 'facebook') await fbApi(ENV.FB_PAGE_ID, { fields: 'id' }); else for (const u of C.sumber.rss.url) { const r = await fetch(u, { signal: AbortSignal.timeout(10000) }); if (!r.ok) throw new Error(u + ' status ' + r.status); }
      console.log('- ' + s.nama + ': OK'); } catch (e) { console.log('- ' + s.nama + ': GAGAL, ' + e.message); bad++; } }
  console.log(bad ? 'Ada sumber yang belum siap.' : 'Semua sumber aktif siap.'); process.exit(bad ? 1 : 0);
}

if (A.cek) { cek(); }
else {
  if (!SRC.some(s => s.ada())) { console.error('Tidak ada sumber yang siap. Isi caraka.config.json (kataKunci) dan variabel lingkungan, lalu jalankan: node caraka.js --cek'); process.exit(1); }
  jalankanServer(); SRC.forEach(s => siaga(s));
  setInterval(simpanState, 60e3); setInterval(padatkanBuf, 3600e3); setInterval(() => kirim('stat', { seen: stat.diserap, id: stat.diserap, flagged: stat.ditandai, coordinated: stat.terkoordinasi }), 2000);
  setInterval(() => log('detak: diserap ' + stat.diserap + ', ditandai ' + stat.ditandai + ', buffer 24 jam ' + buf.length + ' | ' + SRC.map(s => s.nama + ':' + kondisi[s.k].status).join(' ')), 10 * 60e3);
  const tutup = () => { berhenti = true; log('Menyimpan dan berhenti...'); simpanState(); padatkanBuf(); process.exit(0); }; process.on('SIGINT', tutup); process.on('SIGTERM', tutup);
  process.on('unhandledRejection', e => log('Galat tak tertangani (diabaikan, Caraka tetap siaga):', e && e.message)); process.on('uncaughtException', e => log('Pengecualian (Caraka tetap siaga):', e.message));
}
