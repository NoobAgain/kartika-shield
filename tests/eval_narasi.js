// Evaluasi modul narasi/koordinasi pada skenario SINTETIS berlabel (ground truth diketahui karena dibangkitkan).
// Hasil menunjukkan perilaku algoritma pada skenario terkontrol, BUKAN kondisi dunia nyata.
const N = require('../js/00b-kognitif-narasi.js'), D = require('../js/00c-kognitif-dini.js');
let seed = 20261111; const R = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296; const pick = a => a[Math.floor(R() * a.length)];
const hm = m => String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
const sc = [];
const add = (nama, rows, harapan) => sc.push({ nama, rows, harapan });
const B = []; // pembangun baris
const baru = (i, n, tm, tx, extra) => Object.assign({ u: 'warga_asli' + (10000 + i * 37 + n), age: 3 + (i % 5), fo: 6 + i, fi: 400, tm, tx }, extra || {});
const lama = (i, tm, tx, extra) => Object.assign({ u: ['andi', 'budi', 'citra', 'dewi', 'eko', 'fina', 'gita', 'hari', 'indra', 'joko'][i % 10] + '_' + ['jkt', 'sby', 'bdg'][i % 3], age: 400 + i * 111, fo: 300 + i * 17, fi: 200 + i * 9, tm, tx }, extra || {});
const TPL = 'Awas! Kelompok tertentu akan menguasai desa kita, pemerintah menutupi semuanya, sebarkan sebelum dihapus #SelamatkanDesa';
// S1 kampanye terkoordinasi
add('S1 kampanye akun baru serempak', Array.from({ length: 8 }, (_, i) => baru(i, 1, 1140 + i % 4, TPL)), { klaster: [[0, 1, 2, 3, 4, 5, 6, 7]], koordinasi: [75, 100] });
// S2 organik: akun lama, kalimat bervariasi, tersebar 3 jam
add('S2 organik berita bersama akun lama', Array.from({ length: 8 }, (_, i) => lama(i, 600 + i * 22, ['BMKG memperkirakan hujan lebat di Jakarta sore ini, warga diminta waspada genangan', 'Hujan lebat diperkirakan BMKG di Jakarta sore ini, warga diminta waspada genangan air', 'Menurut BMKG hujan lebat di Jakarta sore ini, warga waspada genangan'][i % 3])), { klaster: [[0, 1, 2, 3, 4, 5, 6, 7]], koordinasi: [0, 24] });
// S3 relawan: akun lama, teks sama, serempak (tidak boleh 'kuat')
add('S3 relawan donor darah teks sama serempak', Array.from({ length: 4 }, (_, i) => lama(i, 960 + i, 'Ayo donor darah Minggu ini di balai desa jam 8 pagi')), { klaster: [[0, 1, 2, 3]], koordinasi: [0, 49] });
// S4 parafrase pengurutan kata
const par = ['pemerintah sengaja menutupi kebenaran soal harga beras naik dan rakyat dibohongi', 'harga beras naik, kebenarannya sengaja ditutupi pemerintah dan rakyat dibohongi', 'rakyat dibohongi, pemerintah sengaja menutupi kebenaran soal harga beras naik', 'sengaja ditutupi pemerintah kebenaran soal harga beras naik, rakyat dibohongi', 'soal harga beras naik pemerintah sengaja menutupi kebenaran dan rakyat dibohongi', 'kebenaran harga beras naik sengaja ditutupi pemerintah, rakyat dibohongi'];
add('S4 kampanye parafrase urutan kata', par.map((t, i) => baru(i, 2, 300 + i * 2, t)), { klaster: [[0, 1, 2, 3, 4, 5]], koordinasi: [50, 100] });
// S5 satu akun mengulang (spam)
add('S5 satu akun mengulang 10x', Array.from({ length: 10 }, (_, i) => ({ u: 'spammer_tunggal', age: 500, fo: 100, fi: 100, tm: 700 + i, tx: 'Beli obat kuat murah hubungi nomor ini sekarang juga' + (i ? ' ' : '') })), { klaster: [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]], koordinasi: [0, 24] });
// S6 campuran bantahan
const s6 = Array.from({ length: 5 }, (_, i) => baru(i, 3, 800 + i % 3, TPL)).concat([0, 1, 2].map(i => lama(i, 830 + i * 5, 'Klarifikasi: kabar kelompok tertentu akan menguasai desa adalah hoaks menurut siaran pers resmi kepolisian')));
add('S6 5 penguat + 3 bantahan (klaster terpisah)', s6, { klaster: [[0, 1, 2, 3, 4], [5, 6, 7]], koordinasiKlaster: [[0, 50, 100], [1, 0, 0]], bantahanKlaster: [[1, 3]] });
// S7 melewati tengah malam
add('S7 serempak melewati tengah malam', Array.from({ length: 5 }, (_, i) => baru(i, 4, (1438 + i) % 1440, TPL)), { klaster: [[0, 1, 2, 3, 4]], koordinasi: [75, 100], serempakMin: 0.5 });
// S8 hari berbeda (tanggal lengkap): tidak serempak
add('S8 teks sama di 5 hari berbeda', Array.from({ length: 5 }, (_, i) => Object.assign(baru(i, 5, 0, TPL), { ts: '2026-11-0' + (1 + i) + 'T10:00', tm: undefined })), { klaster: [[0, 1, 2, 3, 4]], koordinasi: [0, 74] });
// S9 noise
add('S9 50 teks tak berkaitan', Array.from({ length: 50 }, (_, i) => lama(i, Math.floor(R() * 1440), `kegiatan nomor ${i * 17} tentang ${pick(['kebun', 'sekolah', 'masjid', 'lapangan', 'pasar'])} di dusun ${pick(['Sari', 'Mulya', 'Jaya'])}${i} pada hari ke ${i}`)), { klaster: [] });
for (const s of sc) s.rows = s.rows.map(r => Object.assign({}, r));
const hasil = []; let TP = 0, FP = 0, FN = 0;
function pasangan(g) { const s = new Set(); for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) s.add(g[i] + ',' + g[j]); return s; }
for (const s of sc) {
  const r = N.analisis(s.rows), pred = new Set(); r.klaster.forEach(k => { const ix = [...k.idx].sort((a, b) => a - b); pasangan(ix).forEach(p => pred.add(p)); });
  const gold = new Set(); (s.harapan.klaster || []).forEach(g => pasangan(g).forEach(p => gold.add(p)));
  let tp = 0; pred.forEach(p => { if (gold.has(p)) tp++; }); const fp = pred.size - tp, fn = gold.size - tp; TP += tp; FP += fp; FN += fn;
  const cek = []; const h = s.harapan, k0 = r.klaster[0];
  if (h.koordinasi) { const sk = k0 ? k0.koordinasi.skor : 0; cek.push(['koordinasi ' + sk + ' dalam [' + h.koordinasi + ']', sk >= h.koordinasi[0] && sk <= h.koordinasi[1]]); }
  if (h.klaster && h.klaster.length === 0) cek.push(['tidak ada klaster (' + r.klaster.length + ')', r.klaster.length === 0]);
  if (h.koordinasiKlaster) h.koordinasiKlaster.forEach(([ki, lo, hi]) => { const k = r.klaster.find(x => x.idx.includes(h.klaster[ki][0])); const sk = k ? k.koordinasi.skor : -1; cek.push(['klaster ' + ki + ' koordinasi ' + sk + ' dalam [' + lo + ',' + hi + ']', sk >= lo && sk <= hi]); });
  if (h.bantahanKlaster) h.bantahanKlaster.forEach(([ki, n]) => { const k = r.klaster.find(x => x.idx.includes(h.klaster[ki][0])); cek.push(['klaster ' + ki + ' bantahan terdeteksi ' + (k ? k.bantahan : '?') + ' = ' + n, k && k.bantahan === n]); });
  if (h.akunPenguat != null) { const k = r.klaster.find(x => x.bantahan > 0) || {}; cek.push(['akun penguat ' + (k.koordinasi ? k.koordinasi.akun : '?') + ' = ' + h.akunPenguat + '; bantahan terdeteksi ' + k.bantahan, k.koordinasi && k.koordinasi.akun === h.akunPenguat && k.bantahan >= h.bantahanMin]); }
  if (h.serempakMin != null) cek.push(['rasio serempak ' + (k0 ? k0.koordinasi.rasioSerempak : 0), k0 && k0.koordinasi.rasioSerempak >= h.serempakMin]);
  if (h.klaster && h.klaster.length) cek.push(['pasangan klaster tp=' + tp + ' fp=' + fp + ' fn=' + fn, fp === 0 && fn === 0]);
  hasil.push({ nama: s.nama, lulus: cek.every(c => c[1]), cek });
}
// S10 campuran besar: 3 kampanye + 100 noise
const tpls = ['Pemerintah jual aset negara ke asing sebarkan sebelum dihapus', 'Vaksin racun untuk umat kita dokter dibungkam sebarkan segera', 'Bangsa kita dijajah pangan asing hentikan impor beras sekarang juga'];
const rows10 = [], gold10 = [];
tpls.forEach((t, c) => { const ix = []; for (let i = 0; i < 6; i++) { ix.push(rows10.length); rows10.push(baru(i, 10 + c, 100 + c * 400 + i, t + (i % 2 ? '!!' : ''))); } gold10.push(ix); });
for (let i = 0; i < 100; i++) rows10.push(lama(i, Math.floor(R() * 1440), `catatan ${i * 31} soal ${pick(['panen', 'ronda', 'arisan', 'futsal', 'kuliner'])} dusun ${i}x${pick(['a', 'b', 'c'])}`));
const r10 = N.analisis(rows10), pred10 = new Set(); r10.klaster.forEach(k => pasangan([...k.idx].sort((a, b) => a - b)).forEach(p => pred10.add(p)));
const g10 = new Set(); gold10.forEach(g => pasangan(g).forEach(p => g10.add(p))); let tp10 = 0; pred10.forEach(p => { if (g10.has(p)) tp10++; });
TP += tp10; FP += pred10.size - tp10; FN += g10.size - tp10;
hasil.push({ nama: 'S10 3 kampanye + 100 noise', lulus: tp10 === g10.size && pred10.size === tp10, cek: [['pasangan tp=' + tp10 + ' fp=' + (pred10.size - tp10) + ' fn=' + (g10.size - tp10), tp10 === g10.size && pred10.size === tp10]] });
const P = TP / Math.max(TP + FP, 1), Rc = TP / Math.max(TP + FN, 1);
const out = { skenario: hasil.length, lulus: hasil.filter(h => h.lulus).length, pasangan: { TP, FP, FN, precision: +P.toFixed(3), recall: +Rc.toFixed(3), f1: +(2 * P * Rc / Math.max(P + Rc, 1e-9)).toFixed(3) }, rincian: hasil };
if (require.main === module) { hasil.forEach(h => console.log((h.lulus ? 'PASS' : 'FAIL'), h.nama, '|', h.cek.map(c => (c[1] ? '✓ ' : '✗ ') + c[0]).join(' ; '))); console.log(JSON.stringify(out.pasangan), out.lulus + '/' + out.skenario); if (process.argv.includes('--json')) require('fs').writeFileSync(__dirname + '/../eval/hasil/narasi_skenario.json', JSON.stringify(out, null, 1)); }
module.exports = out;
