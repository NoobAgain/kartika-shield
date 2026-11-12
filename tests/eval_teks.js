// Evaluasi analitik Cognitive Threat Analysis terhadap dataset berlabel. Pemakaian: node tests/eval_teks.js eval/dataset_dev.csv [--rinci]
const fs = require('fs'), path = require('path');
const T = require('../js/00a-kognitif-teks.js');
function csv(t) { const rows = []; let r = [], f = '', q = false; for (let i = 0; i < t.length; i++) { const c = t[i]; if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; } else if (c === '"') q = true; else if (c === ',') { r.push(f); f = ''; } else if (c === '\n') { r.push(f); rows.push(r); r = []; f = ''; } else if (c !== '\r') f += c; } if (f || r.length) { r.push(f); rows.push(r); } return rows; }
function muat(file) { const R = csv(fs.readFileSync(file, 'utf8')).filter(r => r.length >= 5); const h = R.shift(); return R.map(r => Object.fromEntries(h.map((k, i) => [k, r[i]]))); }
function metrik(tp, fp, fn, tn) { const p = tp / Math.max(tp + fp, 1), r = tp / Math.max(tp + fn, 1); return { tp, fp, fn, tn, precision: +p.toFixed(3), recall: +r.toFixed(3), f1: +(2 * p * r / Math.max(p + r, 1e-9)).toFixed(3), n: tp + fp + fn + tn }; }
function evaluasi(data, kolom, ambang) {
  let tp = 0, fp = 0, fn = 0, tn = 0; const salah = []; const per = {};
  for (const d of data) {
    const r = T.analisis(d.teks), pos = r.risk >= ambang, y = d[kolom] === '1';
    const j = per[d.jenis] = per[d.jenis] || { tp: 0, fp: 0, fn: 0, tn: 0 };
    if (pos && y) { tp++; j.tp++; } else if (pos) { fp++; j.fp++; salah.push({ id: d.id, jenis: d.jenis, tipe: 'FP', risk: r.risk, teks: d.teks.slice(0, 90) }); } else if (y) { fn++; j.fn++; salah.push({ id: d.id, jenis: d.jenis, tipe: 'FN', risk: r.risk, teks: d.teks.slice(0, 90) }); } else { tn++; j.tn++; }
  }
  return { ambang, kolom, ...metrik(tp, fp, fn, tn), perJenis: per, salah };
}
if (require.main === module) {
  const file = process.argv[2], data = muat(file);
  const hasil = { berkas: path.basename(file), jumlah: data.length, perhatian_ambang20: evaluasi(data, 'perhatian', 20), tinggi_ambang45: evaluasi(data, 'tinggi', 45) };
  const rinci = process.argv.includes('--rinci');
  for (const k of ['perhatian_ambang20', 'tinggi_ambang45']) { const x = hasil[k]; console.log(`${k}: n=${x.n} TP=${x.tp} FP=${x.fp} FN=${x.fn} TN=${x.tn} P=${x.precision} R=${x.recall} F1=${x.f1}`); if (rinci) x.salah.forEach(s => console.log('   ', s.tipe, s.id, s.jenis, s.risk, s.teks)); }
  if (process.argv.includes('--json')) console.log(JSON.stringify(hasil));
}
module.exports = { muat, evaluasi };
