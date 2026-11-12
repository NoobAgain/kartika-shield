# INSTALLATION, Kartika Shield Cognitive Warfare v2.0

## Kebutuhan
| Komponen | Versi | Untuk |
|---|---|---|
| Peramban modern (Chrome/Edge/Firefox/Safari terbaru) | - | Dasbor. **Hanya Chromium yang diuji.** |
| Node.js | ≥ 22 | Build (`tools/build.js`), kolektor, uji unit |
| Python 3 + `playwright` (+ Chromium) | 3.10+ | Uji fungsional dan keamanan (opsional) |

Tidak ada `npm install` untuk aplikasi maupun kolektor (nol dependensi). d3 dan topojson-client sudah ada di `vendor/` (lisensi ISC disertakan), sehingga **aplikasi berjalan offline**.

## 1. Menjalankan dasbor
**Cara cepat:** buka `dist/kartika-shield.html` (berkas tunggal) atau `index.html` langsung di peramban. Tidak perlu server.

**Membangun ulang** (setelah mengubah berkas di `js/`, `assets/`, `data/`):
```
node tools/build.js          # menghasilkan dist/kartika-shield.html
```

## 2. Kolektor data (opsional)
```
cd collector
node server.js               # http://127.0.0.1:8787 (SSE: /events, status: /stats)
```
Variabel lingkungan utama: `PORT` (8787), `HOST` (127.0.0.1), `MIN_RISK` (45), `RSS_URLS`, `LOG_CSV`, `BOT_AUTO` (0/1), `MAX_CLIENTS`, `ALLOW_HOST`, `ALLOW_ORIGIN`, `ANON_SALT`, `BOT_KEYWORDS`, `BOT_INTERVAL_MIN`, `JETSTREAM`. Kolektor memuat mesin penilai yang sama dengan dasbor dari `../js/00a-kognitif-teks.js`, **jangan memindahkan folder `collector/` terpisah dari `js/`**.

Di dasbor: jendela **Feed** → isi alamat kolektor → **Hubungkan kolektor**. Bila alamat bukan `localhost`/`127.0.0.1`, tambahkan host itu ke `connect-src` pada `<meta http-equiv="Content-Security-Policy">` di `index.html`, lalu build ulang.

Pengambil CSV untuk Buzzer (`ambil-buzzer.js`, `ambil-youtube.js`, `ambil-facebook.js`) memakai **API resmi** dan kredensial dari variabel lingkungan; lihat `README.md`. Keluarannya berjam `HH:MM` (tanpa tanggal).

## 3. Menjalankan pengujian
```
pip install playwright && playwright install chromium      # sekali saja
tests/run_all.sh                                            # build + seluruh uji + TEST_REPORT.md
```
Atau per bagian:
```
node tests/unit_engine.js                                   # 66 uji unit mesin
node tests/eval_teks.js eval/dataset_uji_tertahan.csv --rinci
node tests/eval_narasi.js
node --expose-gc tests/perf.js
python3 tests/test_functional.py index.html                 # UI (Playwright)
python3 tests/test_functional.py dist/kartika-shield.html kartika-shield
python3 tests/test_security.py index.html
```
Uji fungsional memakai `tests/mock_collector.js` (port 8791) dan memblokir seluruh permintaan jaringan eksternal.

## 4. Pemecahan masalah
| Gejala | Penyebab/solusi |
|---|---|
| Feed: "Kolektor tidak terjangkau" | Server belum berjalan, atau host tidak ada di `connect-src` CSP |
| Peta kosong | `vendor/d3.min.js` atau `vendor/topojson-client.min.js` hilang dari folder yang sama dengan `index.html` |
| Analisis 20.000 baris terasa lambat | Normal (±7 detik, tanpa Web Worker); pecah data |
| `collector/server.js` galat `Cannot find module '../js/00a-...'` | Folder `collector/` dipindah tanpa folder `js/` |
