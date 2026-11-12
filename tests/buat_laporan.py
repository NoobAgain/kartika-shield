# Menyusun TEST_REPORT.md dari eval/hasil/*.json (tidak ada angka yang diketik manual).
import json, os, subprocess, hashlib, platform, datetime
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); H = os.path.join(R, 'eval/hasil')
J = lambda n: json.load(open(os.path.join(H, n), encoding='utf-8'))
unit, fi, fd, sec = J('unit.json'), J('functional_index.json'), J('functional_kartika-shield.json'), J('security.json')
dev, uji, nar, perf, base = J('teks_dev.json'), J('teks_uji_tertahan.json'), J('narasi_skenario.json'), J('perf.json'), J('baseline_result.json')
sha = lambda f: hashlib.sha256(open(os.path.join(R, f), 'rb').read()).hexdigest()
pf = lambda ok: 'PASS' if ok else '**FAIL**'
def tab(rows, head): return '| ' + ' | '.join(head) + ' |\n|' + '|'.join(['---'] * len(head)) + '|\n' + '\n'.join('| ' + ' | '.join(str(c) for c in r) + ' |' for r in rows)
def blok(x): return f"TP={x['tp']} FP={x['fp']} FN={x['fn']} TN={x['tn']} · Precision {x['precision']:.3f} · Recall {x['recall']:.3f} · F1 {x['f1']:.3f}"
node = subprocess.run(['node', '--version'], capture_output=True, text=True).stdout.strip()
L = []; w = L.append
w('# TEST REPORT, Kartika Shield Cognitive Warfare v2.0\n')
w(f'Dihasilkan otomatis oleh `tests/buat_laporan.py` dari `eval/hasil/*.json` pada {datetime.datetime.now().strftime("%d-%m-%Y %H:%M")}. Lingkungan: Linux sandbox, Node {node}, Python {platform.python_version()}, Chromium headless (Playwright). **Hanya Chromium yang diuji** (Firefox/Safari/perangkat seluler nyata: belum diuji).\n')
w('Semua perintah untuk mereproduksi ada di `tests/run_all.sh`. Pernyataan tentang kondisi dunia nyata **tidak** dibuat: seluruh dataset pada laporan ini **sintetis buatan pengembang**.\n')
w('## 1. Ringkasan\n')
tot = [('Uji unit mesin kognitif (Node)', unit['lulus'], unit['total']), ('Uji fungsional UI, `index.html`', fi['lulus'], fi['total']), ('Uji fungsional UI, `dist/kartika-shield.html`', fd['lulus'], fd['total']), ('Uji keamanan defensif', sec['lulus'], sec['total']), ('Skenario narasi/koordinasi sintetis', nar['lulus'], nar['skenario'])]
w(tab([(a, f'{l}/{t}', pf(l == t)) for a, l, t in tot], ['Rangkaian', 'Lulus/Total', 'Status']) + '\n')
w('Uji analitik (precision/recall) **tidak** berstatus lulus/gagal; angkanya dilaporkan apa adanya di bagian 3.\n')
w('## 2. Build & baseline\n')
b = base
w(f"- Sintaks seluruh berkas JS valid (`node --check`) dan build deterministik: `node tools/build.js` menghasilkan `dist/kartika-shield.html` tanpa galat; hasil build dimuat tanpa `pageerror`, tanpa permintaan jaringan eksternal (F01).\n- Baseline v1.1.0 (probe `tests/baseline_probe.py`, sebelum perubahan): `runB` 200 baris {b['runB_perf']['200']['ms']} ms · 1000: {b['runB_perf']['1000']['ms']} ms · 5000: **{b['runB_perf']['5000']['ms']} ms**; kasus uji teks menunjukkan bug B-02 s.d. B-06 (lihat AUDIT_BASELINE.md).\n")
w('## 3. Pengujian analitik\n')
w('### 3.1 Metodologi (penting dibaca)\n- Dataset teks berlabel dibagi dua: **DEV** (33 teks; boleh dipakai menyetel aturan) dan **UJI TERTAHAN** (120 teks; ditulis setelah mesin teks dibekukan, hash di `eval/FREEZE_SHA256.txt`, dijalankan sekali, **tidak** dipakai menyetel aturan).\n- Penulis dataset = penulis aturan, sehingga **tidak independen**; teks sintetis tidak mewakili distribusi bahasa media sosial nyata. Angka di bawah adalah indikasi perilaku, **bukan akurasi lapangan**.\n- Dua label: `perhatian` (ada teknik manipulasi yang layak ditinjau analis) dievaluasi pada risiko ≥ 20; `tinggi` (serius: ancaman+konspirasi/kebencian/ajakan agresif) pada risiko ≥ 45.\n')
w(f"- Hash mesin teks saat evaluasi: `{sha('js/00a-kognitif-teks.js')[:16]}…` (hash pembekuan awal pada FREEZE_SHA256.txt: `{open(os.path.join(R,'eval/FREEZE_SHA256.txt')).read().split()[0][:16]}…`). **Hash berbeda bila mesin diubah setelah pembekuan** (lihat CHANGELOG bagian Catatan).\n")
w('### 3.2 Hasil\n')
rows = []
for nm, d in (('DEV (33)', dev), ('UJI TERTAHAN (120)', uji)):
    for k, lab in (('perhatian_ambang20', 'perhatian ≥20'), ('tinggi_ambang45', 'tinggi ≥45')): x = d[k]; rows.append((nm, lab, x['tp'], x['fp'], x['fn'], x['tn'], f"{x['precision']:.3f}", f"{x['recall']:.3f}", f"{x['f1']:.3f}"))
w(tab(rows, ['Set', 'Target/ambang', 'TP', 'FP', 'FN', 'TN', 'Precision', 'Recall', 'F1']) + '\n')
w('### 3.3 Rincian per jenis konten, set uji tertahan, target `perhatian` ≥ 20\n')
pj = uji['perhatian_ambang20']['perJenis']
w(tab([(k, v['tp'], v['fp'], v['fn'], v['tn']) for k, v in pj.items()], ['Jenis', 'TP', 'FP', 'FN', 'TN']) + '\n')
w('### 3.4 Kesalahan klasifikasi (set uji tertahan), tidak disembunyikan\n')
for k, t in (('perhatian_ambang20', 'Target perhatian ≥ 20'), ('tinggi_ambang45', 'Target tinggi ≥ 45')):
    w(f'**{t}**\n'); w(tab([(s['tipe'], s['id'], s['jenis'], s['risk'], s['teks'].replace('|', '/')) for s in uji[k]['salah']], ['Tipe', 'ID', 'Jenis', 'Risiko', 'Teks (dipotong)']) + '\n')
w('**Bacaan jujur:** untuk menandai *adanya* indikator manipulasi, hasilnya cukup baik pada data sintetis ini. Untuk menandai kasus *serius* pada ambang 45, **recall rendah**: seruan kekerasan dan disinformasi tanpa kata pemicu leksikal diberi skor rendah, sementara metafora olahraga/kuliner ("serbu", "bakar") dapat salah tandai. Ini keterbatasan pendekatan leksikal dan tidak diperbaiki dengan menyetel terhadap set tertahan (agar angka tetap valid).\n')
w('### 3.5 Narasi & koordinasi: skenario sintetis berlabel (`tests/eval_narasi.js`)\n')
p = nar['pasangan']; w(f"Kesamaan klaster diukur per pasangan unggahan: TP={p['TP']} FP={p['FP']} FN={p['FN']} · Precision {p['precision']} · Recall {p['recall']} · F1 {p['f1']}. **Skenario dirancang bersama algoritma (ground truth dibangkitkan), sehingga nilai sempurna bukan bukti performa pada data nyata.**\n")
w(tab([(pf(r['lulus']), r['nama'], '; '.join(('✓ ' if c[1] else '✗ ') + c[0] for c in r['cek'])) for r in nar['rincian']], ['Status', 'Skenario', 'Pemeriksaan']) + '\n')
w('## 4. Pengujian unit mesin kognitif\n'); w(tab([(pf(h['ok']), h['nama'], h.get('err', '')) for h in unit['hasil']], ['Status', 'Uji', 'Galat']) + '\n')
w('## 5. Pengujian fungsional UI (Playwright/Chromium)\nDijalankan pada `index.html` dan `dist/kartika-shield.html`. Kolektor tiruan SSE (`tests/mock_collector.js`, data sintetis) dipakai untuk Feed.\n')
dmap = {r['nama']: r for r in fd['hasil']}
w(tab([(r['nama'], pf(r['ok']), pf(dmap[r['nama']]['ok']) if r['nama'] in dmap else '-') for r in fi['hasil']], ['Uji', 'index.html', 'dist']) + '\n')
w('## 6. Pengujian keamanan (defensif, lokal)\n'); w(tab([(pf(r['ok']), r['nama'], r.get('err', '')) for r in sec['hasil']], ['Status', 'Uji', 'Galat']) + '\n')
w('## 7. Pengujian performa\nMesin: lihat bagian lingkungan. Satu pengukuran per titik; hasil bervariasi antarmesin. UI tidak memakai Web Worker sehingga analisis besar memblokir tab selama prosesnya.\n')
w(tab([(r['data'], r['baris'], r['ms'], r['klaster'], r['heapDeltaMB']) for r in perf['narasi']], ['Dataset', 'Baris', 'Waktu (ms)', 'Klaster', 'Δ heap (MB)']) + '\n')
c = perf['cta']; w(f"Cognitive Threat Analysis: {c['teks']} teks dalam {c['ms']} ms (~{c['perDetik']} teks/detik).\n")
w('"realistis" = banyak topik berbeda dengan kata langka; "templat-patologis" = seluruh unggahan memakai kerangka kalimat yang sama (kasus terburuk untuk pencarian kandidat). Pembanding baseline v1.1.0: 5000 baris = ' + str(b['runB_perf']['5000']['ms']) + ' ms pada data yang jauh lebih mudah.\n')
w('## 8. Yang belum atau tidak dapat diuji\n- Kolektor terhadap jaringan nyata (Bluesky Jetstream, RSS, bot pencarian, `ambil-*.js` dengan API resmi): sandbox tidak memiliki akses; hanya proteksi HTTP kolektor dan klien dengan kolektor tiruan yang diuji. **Belum diuji.**\n- Peta Dunia Live/Peta Dini: ekspor PNG/PDF diuji sebatas unduhan/jendela terbuka; ketepatan visual geografis diperiksa secara manual pada tangkapan layar, bukan otomatis.\n- Peramban selain Chromium, perangkat seluler nyata, pembaca layar/aksesibilitas: belum diuji.\n- Uji beban jangka panjang (SSE berjam-jam), kebocoran memori di peramban: belum diuji.\n- Validitas rujukan DISARM (ID teknik) terhadap sumber resmi terkini dan klaim NATO/Burda pada materi: tidak dapat diverifikasi offline.\n')
open(os.path.join(R, 'TEST_REPORT.md'), 'w', encoding='utf-8').write('\n'.join(L)); print('TEST_REPORT.md ditulis')
