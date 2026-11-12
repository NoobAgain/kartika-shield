#!/usr/bin/env node
// Bot pengambil data Facebook untuk tab "Deteksi Buzzer". Hasil: CSV  akun,umur_akun_hari,follower,following,jam(HH:MM),teks|KODE
// Memakai Graph API RESMI Meta. Hanya untuk Halaman (Page) yang ANDA kelola, dengan token Halaman milik Anda.
// Facebook tidak menyediakan pencarian postingan publik lewat API, jadi bot ini tidak bisa mengambil data Halaman orang lain.
// Node.js >= 22, tanpa dependensi.   Bantuan: node ambil-facebook.js --bantuan
const fs = require('fs'), crypto = require('crypto');

const A = {}; const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) { const k = argv[i].slice(2); A[k] = (argv[i + 1] && !argv[i + 1].startsWith('--')) ? argv[++i] : true; }

if (A.bantuan || A.help) {
  console.log(`Pemakaian:
  node ambil-facebook.js                          komentar dari postingan Halaman 24 jam terakhir
  node ambil-facebook.js --post "ID1,ID2"         komentar dari postingan tertentu (format IDHALAMAN_IDPOST)

Kredensial (lewat variabel lingkungan, jangan dibagikan dan jangan di-commit):
  FB_PAGE_TOKEN=EAA...   token akses Halaman (Page access token) milik Anda
  FB_PAGE_ID=1234...     ID Halaman (atau pakai --halaman 1234...)
  Izin token: pages_show_list, pages_read_engagement, pages_read_user_content

Pilihan:
  --jam 24            hanya komentar dari N jam terakhir, maksimum 24 (bawaan 24)
  --maks 500          jumlah komentar maksimum (bawaan 500)
  --post-maks 25      jumlah postingan terbaru yang diperiksa (bawaan 25)
  --keluar berkas.csv berkas keluaran (bawaan facebook.csv)
  --tampilkan-akun    tulis nama tampilan asli (bawaan: dianonimkan)

Catatan: Facebook tidak membuka umur akun, follower, dan following pengomentar. Kolom itu diisi nilai netral
(365, 100, 100) supaya tidak menambah skor. Deteksi hanya bersandar pada kemiripan teks, waktu serempak, dan pola nama.
Komentar yang pengirimnya disembunyikan Facebook dilewati.
`); process.exit(0);
}

const BASE = (process.env.FB_BASE || 'https://graph.facebook.com' + (process.env.FB_VERSION ? '/' + process.env.FB_VERSION : '')).replace(/\/$/, '');
const TOKEN = process.env.FB_PAGE_TOKEN, HALAMAN = String(A.halaman || process.env.FB_PAGE_ID || '').trim();
const POSTS = String(A.post || '').split(',').map(s => s.trim()).filter(Boolean);
let JAM = +A.jam || 24; if (JAM > 24) { console.log('Catatan: --jam dibatasi 24 karena analisis memakai jam dalam sehari.'); JAM = 24; }
const MAKS = +A.maks || 500, PMAKS = +A['post-maks'] || 25, KELUAR = typeof A.keluar === 'string' ? A.keluar : 'facebook.csv', ANON = !A['tampilkan-akun'];

const gagal = m => { console.error('Galat: ' + m); process.exit(1); };
if (!TOKEN) gagal('isi FB_PAGE_TOKEN (lihat --bantuan).');
if (!POSTS.length && !/^\d+$/.test(HALAMAN)) gagal('isi FB_PAGE_ID (angka) atau --post (lihat --bantuan).');
if (POSTS.some(p => !/^\d+(_\d+)?$/.test(p))) gagal('format --post harus angka atau IDHALAMAN_IDPOST.');

const CITY = [[/\b(?:papua barat daya|sorong)\b/i,'PD'],[/\b(?:papua barat|manokwari)\b/i,'PB'],[/\b(?:papua tengah|nabire)\b/i,'PH'],[/\b(?:papua selatan|merauke)\b/i,'PS'],[/\b(?:papua pegunungan|wamena|jayawijaya)\b/i,'PP'],[/\b(?:jayapura|papua)\b/i,'PA'],[/\b(?:balikpapan|samarinda|kaltim)\b/i,'KI'],[/\b(?:denpasar|bali)\b/i,'BA'],[/\b(?:jakarta|dki)\b/i,'JK'],[/\b(?:bekasi|depok|bogor|bandung|jabar)\b/i,'JB'],[/\b(?:tangerang|serang|banten)\b/i,'BT'],[/\b(?:semarang|surakarta|jateng)\b/i,'JT'],[/\b(?:yogyakarta|jogja|yogya)\b/i,'YO'],[/\b(?:surabaya|malang|jatim)\b/i,'JI'],[/\b(?:medan|sumut)\b/i,'SU'],[/\b(?:banda aceh|aceh)\b/i,'AC'],[/\b(?:padang|sumbar)\b/i,'SB'],[/\b(?:pekanbaru|riau)\b/i,'RI'],[/\b(?:batam|tanjung ?pinang|kepri)\b/i,'KR'],[/\b(?:jambi)\b/i,'JA'],[/\b(?:bengkulu)\b/i,'BE'],[/\b(?:palembang|sumsel)\b/i,'SS'],[/\b(?:pangkal ?pinang|bangka|belitung|babel)\b/i,'BB'],[/\b(?:bandar lampung|lampung)\b/i,'LA'],[/\b(?:pontianak|kalbar)\b/i,'KB'],[/\b(?:banjarmasin|banjarbaru|kalsel)\b/i,'KS'],[/\b(?:palangka ?raya|kalteng)\b/i,'KT'],[/\b(?:tanjung selor|kaltara|kalimantan utara)\b/i,'KU'],[/\b(?:makassar|sulsel)\b/i,'SN'],[/\b(?:mamuju|sulbar)\b/i,'SR'],[/\b(?:manado|sulut)\b/i,'SA'],[/\b(?:kota palu|sulteng)\b/i,'ST'],[/\b(?:kendari|sultra)\b/i,'SG'],[/\b(?:gorontalo)\b/i,'GO'],[/\b(?:sofifi|ternate|malut|maluku utara)\b/i,'MU'],[/\b(?:ambon|maluku)\b/i,'MA'],[/\b(?:mataram|ntb)\b/i,'NB'],[/\b(?:kupang|ntt)\b/i,'NT']];
const kodeWilayah = t => { const f = CITY.find(c => c[0].test(t)); return f ? f[1] : ''; };
const tidur = ms => new Promise(r => setTimeout(r, ms));

// Token dikirim lewat header Authorization, tidak pernah di URL maupun di pesan galat.
async function api(path, params) {
  const u = new URL(BASE + '/' + path);
  for (const [k, v] of Object.entries(params || {})) u.searchParams.set(k, v);
  for (let t = 0; t < 4; t++) {
    let r;
    try { r = await fetch(u, { headers: { Authorization: 'Bearer ' + TOKEN }, signal: AbortSignal.timeout(20000) }); } catch (e) { await tidur(1000 * 2 ** t); continue; }
    if (r.status >= 500) { await tidur(1000 * 2 ** t); continue; }
    if (!r.ok) {
      let e = {}; try { e = (await r.json()).error || {}; } catch (x) {}
      if ([4, 17, 32, 613].includes(e.code) || r.status === 429) { await tidur(2000 * 2 ** t); continue; }
      const err = new Error(path.replace(/\d{6,}/g, '#') + ' gagal (' + r.status + ') ' + String(e.message || '').slice(0, 100)); err.status = r.status; err.code = e.code; throw err;
    }
    await tidur(150); return r.json();
  }
  throw new Error(path.replace(/\d{6,}/g, '#') + ' gagal berulang kali');
}

const SALT = process.env.ANON_SALT || crypto.randomBytes(16).toString('hex');
const hashAkun = (id, nama) => {
  const h = crypto.createHmac('sha256', SALT).update(id).digest('hex').slice(0, 8);
  const huruf = [...h].map(c => String.fromCharCode(97 + parseInt(c, 16))).join('');
  const ekor = (String(nama).replace(/^@/, '').match(/\d{4,}$/) || [''])[0];
  return 'akun_' + huruf + ekor;
};
const jamWIB = iso => { const d = new Date(Date.parse(iso) + 7 * 3600e3); return String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0'); };

async function daftarPost() {
  if (POSTS.length) return POSTS;
  const sejak = Math.floor((Date.now() - JAM * 3600e3) / 1000);
  const r = await api(HALAMAN + '/posts', { fields: 'id,created_time', since: sejak, limit: Math.min(PMAKS, 100) });
  return (r.data || []).map(p => p.id).slice(0, PMAKS);
}

async function komentar(posts) {
  const sejak = Date.now() - JAM * 3600e3, out = []; let tersembunyi = 0;
  for (const p of posts) {
    let after = '';
    while (out.length < MAKS) {
      const r = await api(p + '/comments', { fields: 'id,created_time,message,from{id,name}', filter: 'stream', order: 'reverse_chronological', limit: 100, ...(after ? { after } : {}) });
      let lewat = false;
      for (const c of r.data || []) {
        if (Date.parse(c.created_time) < sejak) { lewat = true; continue; }
        if (!c.from || !c.from.id) { tersembunyi++; continue; }
        out.push({ ch: String(c.from.id), nama: c.from.name || '', teks: c.message || '', waktu: c.created_time });
      }
      // Tautan "next" memuat token, jadi tidak diikuti. Cukup pakai kursor.
      after = r.paging && r.paging.cursors && r.paging.cursors.after && r.paging.next ? r.paging.cursors.after : '';
      if (!after || lewat) break;
    }
    if (out.length >= MAKS) break;
  }
  return { out: out.slice(0, MAKS), tersembunyi };
}

function baris(k) {
  const teks = k.teks.replace(/\s+/g, ' ').replace(/\|/g, '/').trim(); if (!teks) return null;
  const kode = kodeWilayah(teks);
  return [ANON ? hashAkun(k.ch, k.nama) : k.nama.replace(/[,\n]/g, ' '), 365, 100, 100, jamWIB(k.waktu), teks + (kode ? '|' + kode : '')].join(',');
}

(async () => {
  try {
    console.log('Sumber: ' + (POSTS.length ? POSTS.length + ' postingan' : 'Halaman ' + HALAMAN.replace(/\d(?=\d{3})/g, '*')) + ' | ' + JAM + ' jam terakhir | akun ' + (ANON ? 'dianonimkan' : 'nama asli'));
    const posts = await daftarPost(); console.log('Postingan yang diperiksa: ' + posts.length);
    const { out, tersembunyi } = await komentar(posts);
    const L = out.map(baris).filter(Boolean);
    fs.writeFileSync(KELUAR, L.join('\n') + (L.length ? '\n' : ''));
    const lok = L.filter(l => /\|[A-Z]{2}$/.test(l)).length;
    console.log('Komentar ' + L.length + ' dari ' + new Set(out.map(k => k.ch)).size + ' akun, ' + lok + ' menyebut wilayah' + (tersembunyi ? ', ' + tersembunyi + ' dilewati karena pengirim disembunyikan Facebook' : '') + ' | berkas: ' + KELUAR);
    console.log('Selesai. Unggah berkas ke tab Deteksi Buzzer.');
  } catch (e) {
    if (e.code === 190) gagal('token ditolak atau kedaluwarsa. Buat ulang token Halaman.');
    if (e.code === 10 || e.code === 200 || e.code === 299) gagal('izin token kurang. Perlu pages_read_engagement dan pages_read_user_content.');
    gagal(e.message);
  }
})();
