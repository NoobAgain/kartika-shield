#!/usr/bin/env node
// Bot pengambil data untuk tab "Deteksi Buzzer". Hasilnya berupa berkas CSV siap tempel atau unggah:
//   akun,umur_akun_hari,follower,following,jam(HH:MM),teks|KODE
// Memakai API RESMI Bluesky dan akun Anda sendiri (App Password, bukan kata sandi utama). Hanya membaca unggahan publik.
// Node.js >= 22, tanpa dependensi.   Bantuan: node ambil-buzzer.js --bantuan
const fs = require('fs'), crypto = require('crypto');

const A = {}; const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) { const k = argv[i].slice(2); A[k] = (argv[i + 1] && !argv[i + 1].startsWith('--')) ? argv[++i] : true; }

if (A.bantuan || A.help) {
  console.log(`Pemakaian:
  node ambil-buzzer.js --kata "kata1,kata2" [pilihan]

Akun (lewat variabel lingkungan, JANGAN ditulis di perintah atau dibagikan):
  BSKY_HANDLE=nama.bsky.social
  BSKY_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx   (buat di Bluesky: Pengaturan > Privasi dan keamanan > Kata sandi aplikasi)

Pilihan:
  --kata "a,b"        kata kunci atau tagar yang dicari, pisahkan koma (wajib)
  --jam 3             hanya unggahan dari N jam terakhir, maksimum 24 (bawaan 3)
  --maks 500          jumlah unggahan maksimum per putaran (bawaan 500)
  --keluar berkas.csv berkas keluaran (bawaan buzzer.csv)
  --ulang 15          ulangi tiap N menit tanpa henti, hanya menambah unggahan baru (bawaan: sekali jalan)
  --bahasa id         saring bahasa unggahan (bawaan id, "semua" untuk tanpa saringan)
  --tampilkan-akun    tulis nama akun asli (bawaan: dianonimkan)
`); process.exit(0);
}

const SERVICE = (process.env.BSKY_SERVICE || 'https://bsky.social').replace(/\/$/, '');
const HANDLE = process.env.BSKY_HANDLE, PASS = process.env.BSKY_APP_PASSWORD;
const KATA = String(A.kata || process.env.KATA || '').split(',').map(s => s.trim()).filter(Boolean);
let JAM = +A.jam || 3; if (JAM > 24) { console.log('Catatan: --jam dibatasi 24 karena analisis memakai jam dalam sehari.'); JAM = 24; }
const MAKS = +A.maks || 500, KELUAR = typeof A.keluar === 'string' ? A.keluar : 'buzzer.csv';
const ULANG = +A.ulang || 0, BAHASA = typeof A.bahasa === 'string' ? A.bahasa : 'id', ANON = !A['tampilkan-akun'];

const gagal = m => { console.error('Galat: ' + m); process.exit(1); };
if (!KATA.length) gagal('isi --kata. Contoh: --kata "pemilu,#indonesiadijual"');
if (!HANDLE || !PASS) gagal('isi BSKY_HANDLE dan BSKY_APP_PASSWORD (lihat --bantuan).');
if (!/^[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/i.test(PASS)) console.log('Peringatan: yang dipakai sebaiknya App Password (format xxxx-xxxx-xxxx-xxxx), bukan kata sandi utama.');

const CITY = [[/\b(?:papua barat daya|sorong)\b/i,'PD'],[/\b(?:papua barat|manokwari)\b/i,'PB'],[/\b(?:papua tengah|nabire)\b/i,'PH'],[/\b(?:papua selatan|merauke)\b/i,'PS'],[/\b(?:papua pegunungan|wamena|jayawijaya)\b/i,'PP'],[/\b(?:jayapura|papua)\b/i,'PA'],[/\b(?:balikpapan|samarinda|kaltim)\b/i,'KI'],[/\b(?:denpasar|bali)\b/i,'BA'],[/\b(?:jakarta|dki)\b/i,'JK'],[/\b(?:bekasi|depok|bogor|bandung|jabar)\b/i,'JB'],[/\b(?:tangerang|serang|banten)\b/i,'BT'],[/\b(?:semarang|surakarta|jateng)\b/i,'JT'],[/\b(?:yogyakarta|jogja|yogya)\b/i,'YO'],[/\b(?:surabaya|malang|jatim)\b/i,'JI'],[/\b(?:medan|sumut)\b/i,'SU'],[/\b(?:banda aceh|aceh)\b/i,'AC'],[/\b(?:padang|sumbar)\b/i,'SB'],[/\b(?:pekanbaru|riau)\b/i,'RI'],[/\b(?:batam|tanjung ?pinang|kepri)\b/i,'KR'],[/\b(?:jambi)\b/i,'JA'],[/\b(?:bengkulu)\b/i,'BE'],[/\b(?:palembang|sumsel)\b/i,'SS'],[/\b(?:pangkal ?pinang|bangka|belitung|babel)\b/i,'BB'],[/\b(?:bandar lampung|lampung)\b/i,'LA'],[/\b(?:pontianak|kalbar)\b/i,'KB'],[/\b(?:banjarmasin|banjarbaru|kalsel)\b/i,'KS'],[/\b(?:palangka ?raya|kalteng)\b/i,'KT'],[/\b(?:tanjung selor|kaltara|kalimantan utara)\b/i,'KU'],[/\b(?:makassar|sulsel)\b/i,'SN'],[/\b(?:mamuju|sulbar)\b/i,'SR'],[/\b(?:manado|sulut)\b/i,'SA'],[/\b(?:kota palu|sulteng)\b/i,'ST'],[/\b(?:kendari|sultra)\b/i,'SG'],[/\b(?:gorontalo)\b/i,'GO'],[/\b(?:sofifi|ternate|malut|maluku utara)\b/i,'MU'],[/\b(?:ambon|maluku)\b/i,'MA'],[/\b(?:mataram|ntb)\b/i,'NB'],[/\b(?:kupang|ntt)\b/i,'NT']];
const kodeWilayah = t => { const f = CITY.find(c => c[0].test(t)); return f ? f[1] : ''; };
const tidur = ms => new Promise(r => setTimeout(r, ms));

async function api(path, params, token, method = 'GET', body) {
  const u = new URL(SERVICE + '/xrpc/' + path);
  for (const [k, v] of Object.entries(params || {})) (Array.isArray(v) ? v : [v]).forEach(x => u.searchParams.append(k, x));
  for (let t = 0; t < 5; t++) {
    const r = await fetch(u, { method, headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20000) });
    if (r.status === 429 || r.status >= 500) { const w = (+r.headers.get('retry-after') || 2 ** t) * 1000; console.log('Server meminta menunggu ' + Math.round(w / 1000) + ' detik...'); await tidur(w); continue; }
    if (!r.ok) { const e = await r.text().catch(() => ''); const err = new Error(path + ' gagal (' + r.status + ') ' + e.slice(0, 120)); err.status = r.status; throw err; }
    await tidur(250); return r.json();
  }
  throw new Error(path + ' gagal berulang kali');
}

async function masuk() {
  try { return (await api('com.atproto.server.createSession', {}, null, 'POST', { identifier: HANDLE, password: PASS })).accessJwt; }
  catch (e) { if (e.status === 401 || e.status === 400) gagal('login ditolak. Periksa handle dan App Password.'); throw e; }
}

const hashAkun = (did, handle) => {
  const h = crypto.createHash('sha256').update(did).digest('hex').slice(0, 8);
  const huruf = [...h].map(c => String.fromCharCode(97 + parseInt(c, 16))).join('');   // huruf saja agar tidak memicu aturan "angka acak" secara palsu
  const ekor = (handle.split('.')[0].match(/\d{4,}$/) || [''])[0];                    // pola angka di akhir nama tetap dipertahankan (sinyal bot yang sah)
  return 'akun_' + huruf + ekor;
};
const jamWIB = iso => { const d = new Date(Date.parse(iso) + 7 * 3600e3); return String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0'); };

async function cari(token, sejak, seen) {
  const out = [];
  for (const q of KATA) {
    let cursor;
    while (out.length < MAKS) {
      const p = { q, limit: 100, sort: 'latest', since: sejak, ...(BAHASA !== 'semua' ? { lang: BAHASA } : {}), ...(cursor ? { cursor } : {}) };
      const r = await api('app.bsky.feed.searchPosts', p, token);
      for (const x of r.posts || []) {
        if (seen.has(x.uri) || !x.record || !x.record.text) continue;
        seen.add(x.uri); out.push(x);
      }
      cursor = r.cursor; if (!cursor || !(r.posts || []).length) break;
    }
    if (out.length >= MAKS) break;
  }
  return out.slice(0, MAKS);
}

async function profil(token, dids) {
  const m = new Map();
  for (let i = 0; i < dids.length; i += 25) {
    const r = await api('app.bsky.actor.getProfiles', { actors: dids.slice(i, i + 25) }, token);
    (r.profiles || []).forEach(p => m.set(p.did, p));
  }
  return m;
}

function baris(x, p) {
  const akun = ANON ? hashAkun(x.author.did, x.author.handle) : x.author.handle;
  const dibuat = (p && (p.createdAt || p.indexedAt)) || x.author.createdAt;
  const umur = dibuat ? Math.max(0, Math.round((Date.now() - Date.parse(dibuat)) / 864e5)) : '';
  if (umur === '' || !p) return null;                                   // tanpa umur atau profil, skor akun tidak bermakna
  const teks = x.record.text.replace(/\s+/g, ' ').replace(/\|/g, '/').trim();
  if (!teks) return null;
  const kode = kodeWilayah(teks);
  return [akun, umur, p.followersCount || 0, p.followsCount || 0, jamWIB(x.indexedAt || x.record.createdAt), teks + (kode ? '|' + kode : '')].join(',');
}

const seen = new Set();
async function putaran(pertama) {
  const token = await masuk();
  const sejak = new Date(Date.now() - JAM * 3600e3).toISOString();
  const posts = await cari(token, sejak, seen);
  const prof = await profil(token, [...new Set(posts.map(x => x.author.did))]);
  const L = posts.map(x => baris(x, prof.get(x.author.did))).filter(Boolean);
  if (pertama) fs.writeFileSync(KELUAR, L.join('\n') + (L.length ? '\n' : '')); else if (L.length) fs.appendFileSync(KELUAR, L.join('\n') + '\n');
  const akun = new Set(posts.map(x => x.author.did)).size, lok = L.filter(l => /\|[A-Z]{2}$/.test(l)).length;
  console.log(new Date().toLocaleTimeString('id-ID') + ' | unggahan baru ' + L.length + ' dari ' + akun + ' akun, ' + lok + ' menyebut wilayah | berkas: ' + KELUAR);
  return L.length;
}

(async () => {
  console.log('Kata kunci: ' + KATA.join(', ') + ' | ' + JAM + ' jam terakhir | akun ' + (ANON ? 'dianonimkan' : 'ASLI'));
  try { await putaran(true); } catch (e) { gagal(e.message); }
  if (!ULANG) { console.log('Selesai. Tempel isi berkas ke tab Deteksi Buzzer, atau pakai tombol Telusuri.'); return; }
  console.log('Mode ulang tiap ' + ULANG + ' menit. Tekan Ctrl+C untuk berhenti.');
  for (;;) { await tidur(ULANG * 60e3); try { await putaran(false); } catch (e) { console.log('Putaran gagal, dicoba lagi nanti: ' + e.message); } }
})();
