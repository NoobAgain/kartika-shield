#!/usr/bin/env node
// Bot pengambil data YouTube untuk tab "Deteksi Buzzer". Hasil: CSV  akun,umur_akun_hari,follower,following,jam(HH:MM),teks|KODE
// Memakai YouTube Data API v3 RESMI (kunci API gratis dari Google Cloud). Hanya membaca komentar publik.
// Node.js >= 22, tanpa dependensi.   Bantuan: node ambil-youtube.js --bantuan
const fs = require('fs'), crypto = require('crypto');

const A = {}; const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) { const k = argv[i].slice(2); A[k] = (argv[i + 1] && !argv[i + 1].startsWith('--')) ? argv[++i] : true; }

if (A.bantuan || A.help) {
  console.log(`Pemakaian (pilih salah satu sumber video):
  node ambil-youtube.js --video "https://youtu.be/ID1,ID2"        komentar dari video tertentu (hemat kuota)
  node ambil-youtube.js --kata "pemilu,vaksin" --video-maks 5     cari video terbaru dari kata kunci, lalu ambil komentarnya

Kunci API (lewat variabel lingkungan, jangan dibagikan):
  YT_API_KEY=AIza...     (Google Cloud Console > APIs > YouTube Data API v3 > Credentials > API key)

Pilihan:
  --jam 24            hanya komentar dari N jam terakhir, maksimum 24 (bawaan 24)
  --maks 500          jumlah komentar maksimum (bawaan 500)
  --video-maks 5      jumlah video hasil pencarian per kata kunci (bawaan 5)
  --keluar berkas.csv berkas keluaran (bawaan youtube.csv)
  --tampilkan-akun    tulis nama tampilan asli (bawaan: dianonimkan)

Kuota harian gratis 10.000 unit. Pencarian video = 100 unit, tiap halaman komentar = 1 unit, tiap 50 profil kanal = 1 unit.
Catatan: YouTube tidak membuka jumlah "following" kanal lain, jadi kolom itu diisi 0.
`); process.exit(0);
}

const BASE = (process.env.YT_BASE || 'https://www.googleapis.com/youtube/v3').replace(/\/$/, '');
const KEY = process.env.YT_API_KEY;
const VIDEO = String(A.video || '').split(',').map(s => s.trim()).filter(Boolean);
const KATA = String(A.kata || '').split(',').map(s => s.trim()).filter(Boolean);
let JAM = +A.jam || 24; if (JAM > 24) { console.log('Catatan: --jam dibatasi 24 karena analisis memakai jam dalam sehari.'); JAM = 24; }
const MAKS = +A.maks || 500, VMAKS = +A['video-maks'] || 5, KELUAR = typeof A.keluar === 'string' ? A.keluar : 'youtube.csv', ANON = !A['tampilkan-akun'];
let kuota = 0;

const gagal = m => { console.error('Galat: ' + m); process.exit(1); };
if (!KEY) gagal('isi YT_API_KEY (lihat --bantuan).');
if (!VIDEO.length && !KATA.length) gagal('isi --video atau --kata (lihat --bantuan).');

const CITY = [[/\b(?:papua barat daya|sorong)\b/i,'PD'],[/\b(?:papua barat|manokwari)\b/i,'PB'],[/\b(?:papua tengah|nabire)\b/i,'PH'],[/\b(?:papua selatan|merauke)\b/i,'PS'],[/\b(?:papua pegunungan|wamena|jayawijaya)\b/i,'PP'],[/\b(?:jayapura|papua)\b/i,'PA'],[/\b(?:balikpapan|samarinda|kaltim)\b/i,'KI'],[/\b(?:denpasar|bali)\b/i,'BA'],[/\b(?:jakarta|dki)\b/i,'JK'],[/\b(?:bekasi|depok|bogor|bandung|jabar)\b/i,'JB'],[/\b(?:tangerang|serang|banten)\b/i,'BT'],[/\b(?:semarang|surakarta|jateng)\b/i,'JT'],[/\b(?:yogyakarta|jogja|yogya)\b/i,'YO'],[/\b(?:surabaya|malang|jatim)\b/i,'JI'],[/\b(?:medan|sumut)\b/i,'SU'],[/\b(?:banda aceh|aceh)\b/i,'AC'],[/\b(?:padang|sumbar)\b/i,'SB'],[/\b(?:pekanbaru|riau)\b/i,'RI'],[/\b(?:batam|tanjung ?pinang|kepri)\b/i,'KR'],[/\b(?:jambi)\b/i,'JA'],[/\b(?:bengkulu)\b/i,'BE'],[/\b(?:palembang|sumsel)\b/i,'SS'],[/\b(?:pangkal ?pinang|bangka|belitung|babel)\b/i,'BB'],[/\b(?:bandar lampung|lampung)\b/i,'LA'],[/\b(?:pontianak|kalbar)\b/i,'KB'],[/\b(?:banjarmasin|banjarbaru|kalsel)\b/i,'KS'],[/\b(?:palangka ?raya|kalteng)\b/i,'KT'],[/\b(?:tanjung selor|kaltara|kalimantan utara)\b/i,'KU'],[/\b(?:makassar|sulsel)\b/i,'SN'],[/\b(?:mamuju|sulbar)\b/i,'SR'],[/\b(?:manado|sulut)\b/i,'SA'],[/\b(?:kota palu|sulteng)\b/i,'ST'],[/\b(?:kendari|sultra)\b/i,'SG'],[/\b(?:gorontalo)\b/i,'GO'],[/\b(?:sofifi|ternate|malut|maluku utara)\b/i,'MU'],[/\b(?:ambon|maluku)\b/i,'MA'],[/\b(?:mataram|ntb)\b/i,'NB'],[/\b(?:kupang|ntt)\b/i,'NT']];
const kodeWilayah = t => { const f = CITY.find(c => c[0].test(t)); return f ? f[1] : ''; };
const tidur = ms => new Promise(r => setTimeout(r, ms));
const videoId = s => { const m = s.match(/(?:v=|youtu\.be\/|\/live\/|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/); return m ? m[1] : (/^[A-Za-z0-9_-]{11}$/.test(s) ? s : ''); };

async function api(path, params, biaya) {
  const u = new URL(BASE + '/' + path);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  u.searchParams.set('key', KEY);
  for (let t = 0; t < 4; t++) {
    let r;
    try { r = await fetch(u, { signal: AbortSignal.timeout(20000) }); } catch (e) { await tidur(1000 * 2 ** t); continue; }
    if (r.status === 429 || r.status >= 500) { await tidur(1000 * 2 ** t); continue; }
    if (!r.ok) {
      let pesan = ''; try { const j = await r.json(); pesan = (j.error && (j.error.errors && j.error.errors[0] && j.error.errors[0].reason || j.error.message)) || ''; } catch (e) {}
      const err = new Error(path + ' gagal (' + r.status + ') ' + String(pesan).slice(0, 100)); err.status = r.status; err.reason = pesan; throw err;   // kunci API tidak pernah ikut dicetak
    }
    kuota += biaya; await tidur(150); return r.json();
  }
  throw new Error(path + ' gagal berulang kali');
}

const SALT = process.env.ANON_SALT || crypto.randomBytes(16).toString('hex');
const hashAkun = (id, nama) => {
  const h = crypto.createHmac('sha256', SALT).update(id).digest('hex').slice(0, 8);
  const huruf = [...h].map(c => String.fromCharCode(97 + parseInt(c, 16))).join('');
  const ekor = (String(nama).replace(/^@/, '').match(/\d{4,}$/) || [''])[0];
  return 'akun_' + huruf + ekor;
};
const jamWIB = iso => { const d = new Date(Date.parse(iso) + 7 * 3600e3); return String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0'); };

async function cariVideo() {
  const ids = new Set(VIDEO.map(videoId).filter(Boolean));
  if (VIDEO.length && !ids.size) gagal('tidak ada ID video yang valid di --video.');
  const sejak = new Date(Date.now() - JAM * 3600e3).toISOString();
  for (const q of KATA) {
    const r = await api('search', { part: 'snippet', type: 'video', q, order: 'date', maxResults: Math.min(VMAKS, 50), regionCode: 'ID', relevanceLanguage: 'id', publishedAfter: sejak }, 100);
    (r.items || []).forEach(x => x.id && x.id.videoId && ids.add(x.id.videoId));
  }
  return [...ids];
}

async function komentar(vids) {
  const sejak = Date.now() - JAM * 3600e3, out = [];
  for (const v of vids) {
    let token = '';
    while (out.length < MAKS) {
      let r;
      try { r = await api('commentThreads', { part: 'snippet', videoId: v, order: 'time', maxResults: 100, textFormat: 'plainText', ...(token ? { pageToken: token } : {}) }, 1); }
      catch (e) { if (e.status === 403 && /commentsDisabled/.test(e.reason)) { console.log('Video ' + v + ': komentar dimatikan, dilewati.'); break; } if (e.status === 404) { console.log('Video ' + v + ' tidak ditemukan.'); break; } throw e; }
      let lewat = false;
      for (const it of r.items || []) {
        const c = it.snippet && it.snippet.topLevelComment && it.snippet.topLevelComment.snippet; if (!c || !c.authorChannelId) continue;
        if (Date.parse(c.publishedAt) < sejak) { lewat = true; continue; }
        out.push({ ch: c.authorChannelId.value, nama: c.authorDisplayName || '', teks: c.textOriginal || c.textDisplay || '', waktu: c.publishedAt });
      }
      token = r.nextPageToken; if (!token || lewat) break;     // urutan terbaru, berhenti saat melewati jendela waktu
    }
    if (out.length >= MAKS) break;
  }
  return out.slice(0, MAKS);
}

async function kanal(ids) {
  const m = new Map();
  for (let i = 0; i < ids.length; i += 50) {
    const r = await api('channels', { part: 'snippet,statistics', id: ids.slice(i, i + 50).join(','), maxResults: 50 }, 1);
    (r.items || []).forEach(c => m.set(c.id, c));
  }
  return m;
}

function baris(k, p) {
  if (!p || !p.snippet || !p.snippet.publishedAt) return null;
  const umur = Math.max(0, Math.round((Date.now() - Date.parse(p.snippet.publishedAt)) / 864e5));
  const st = p.statistics || {}, fo = st.hiddenSubscriberCount ? 0 : (+st.subscriberCount || 0);
  const teks = k.teks.replace(/\s+/g, ' ').replace(/\|/g, '/').trim(); if (!teks) return null;
  const kode = kodeWilayah(teks);
  return [ANON ? hashAkun(k.ch, k.nama) : k.nama.replace(/[,\n]/g, ' '), umur, fo, 0, jamWIB(k.waktu), teks + (kode ? '|' + kode : '')].join(',');
}

(async () => {
  try {
    console.log('Sumber: ' + (VIDEO.length ? VIDEO.length + ' video ' : '') + (KATA.length ? 'pencarian "' + KATA.join(', ') + '" ' : '') + '| ' + JAM + ' jam terakhir | akun ' + (ANON ? 'dianonimkan' : 'ASLI'));
    const vids = await cariVideo(); console.log('Video yang diperiksa: ' + vids.length);
    const kom = await komentar(vids);
    const prof = await kanal([...new Set(kom.map(k => k.ch))]);
    const L = kom.map(k => baris(k, prof.get(k.ch))).filter(Boolean);
    fs.writeFileSync(KELUAR, L.join('\n') + (L.length ? '\n' : ''));
    const lok = L.filter(l => /\|[A-Z]{2}$/.test(l)).length;
    console.log('Komentar ' + L.length + ' dari ' + new Set(kom.map(k => k.ch)).size + ' kanal, ' + lok + ' menyebut wilayah | berkas: ' + KELUAR + ' | perkiraan kuota terpakai: ' + kuota + ' dari 10.000/hari');
    console.log('Selesai. Tempel isi berkas ke tab Deteksi Buzzer, atau pakai tombol Telusuri.');
  } catch (e) {
    if (e.status === 403 && /quota/i.test(e.reason || '')) gagal('kuota harian habis. Coba lagi besok atau kurangi --video-maks.');
    if (e.status === 400 || (e.status === 403 && /keyInvalid|API key|forbidden/i.test(e.reason || ''))) gagal('kunci API ditolak. Pastikan YouTube Data API v3 sudah diaktifkan untuk kunci ini.');
    gagal(e.message);
  }
})();
