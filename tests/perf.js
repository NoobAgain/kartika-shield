// Uji performa: waktu & memori pada dataset kecil/menengah/besar. Pemakaian: node --expose-gc tests/perf.js [--json]
const T = require('../js/00a-kognitif-teks.js'), N = require('../js/00b-kognitif-narasi.js'), D = require('../js/00c-kognitif-dini.js');
let seed = 7; const R = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const kt = ['banjir', 'vaksin', 'harga', 'pilkada', 'sekolah', 'jalan', 'listrik', 'kopi', 'bola', 'konser'];
const realistis = n => Array.from({ length: n }, (_, i) => { const g = i % Math.max(10, Math.floor(n / 12)); return { u: 'u' + i, age: 30 + (i % 900), fo: 100, fi: 100, tm: (i * 3) % 1440, tx: 'warga ' + kt[g % 10] + ' kelurahan' + g + ' melaporkan kejadian' + g + ' pada hari ke' + (i % 30) + ' semoga cepat ditangani petugas' }; });
const templat = n => Array.from({ length: n }, (_, i) => ({ u: 'u' + i, age: 100 + i % 900, fo: 100, fi: 100, tm: (i * 3) % 1440, tx: 'topik nomor ' + (i % 40) + ' dibahas warga ' + (i % 7) + ' hari ini di kota kita bersama pak rt' }));
const mem = () => { if (global.gc) global.gc(); return process.memoryUsage().heapUsed / 1048576; };
const out = { node: process.version, narasi: [], cta: null };
for (const [nama, gen] of [['realistis', realistis], ['templat-patologis', templat]]) for (const n of [200, 1000, 5000, 20000]) {
  const rows = gen(n), m0 = mem(), t0 = process.hrtime.bigint(); const r = N.analisis(rows); const d = D.peringatanDini(r); const ms = Number(process.hrtime.bigint() - t0) / 1e6; const m1 = process.memoryUsage().heapUsed / 1048576;
  out.narasi.push({ data: nama, baris: n, ms: Math.round(ms), klaster: r.klaster.length, peringatan: d.length, heapDeltaMB: Math.round(m1 - m0) });
}
const teks = Array.from({ length: 20000 }, (_, i) => i % 5 === 0 ? 'VIRAL!!! Sebarkan sebelum dihapus, pemerintah menutupi semuanya' : 'Rapat warga membahas jadwal ronda dan kerja bakti hari ' + i);
const t0 = process.hrtime.bigint(); teks.forEach(x => T.analisis(x)); const ms = Number(process.hrtime.bigint() - t0) / 1e6;
out.cta = { teks: teks.length, ms: Math.round(ms), perDetik: Math.round(teks.length / (ms / 1000)) };
console.table(out.narasi); console.log('CTA', out.cta);
if (process.argv.includes('--json')) require('fs').writeFileSync(__dirname + '/../eval/hasil/perf.json', JSON.stringify(out, null, 1));
