# Laporan Verifikasi — KARTIKA SHIELD 2.1.1

Tanggal: 12 November 2026

## Hasil yang berhasil dijalankan

| Pemeriksaan | Hasil |
|---|---|
| `node --check collector/server.js` | Lulus |
| `node --check js/03-buzzer.js` | Lulus |
| `node --check js/00b-kognitif-narasi.js` | Lulus |
| `npm run build` | Lulus; `dist/kartika-shield.html` dibuat (±1.082 KB) |
| `npm run test:unit` | 68/68 lulus |
| `npm run test:buzzer` | Lulus; mock menguji HTTP 403 endpoint utama → fallback, profil, pseudonim, tautan sumber, dan jalur analisis UI bersama |
| `npm run test:news` | Lulus; analisis berita dan sumber RSS |
| `npm run test:mini-tv` | Lulus |
| `node tests/eval_narasi.js --json` | 10/10 skenario lulus |
| `node --expose-gc tests/perf.js --json` | Lulus; 20.000 teks sekitar 606 ms pada lingkungan uji ini |
| Smoke test Collector | `/`, `/health`, dan `/buzzer/data` masing-masing HTTP 200 |

## Pemeriksaan yang belum dapat diverifikasi

- `npm test` belum selesai seluruhnya karena Playwright tidak menemukan Chromium headless yang diharapkan oleh paket uji.
- Upaya menjalankan browser sistem juga diblokir kebijakan lingkungan (`ERR_BLOCKED_BY_ADMINISTRATOR`) untuk navigasi `file://` maupun localhost. Karena itu, pengujian visual/klik UI penuh dan uji keamanan berbasis browser belum dapat dinyatakan lulus.
- Koneksi langsung ke Bluesky dari lingkungan build tidak tersedia. Pengujian fallback HTTP 403 dilakukan menggunakan mock lokal; koneksi nyata harus dikonfirmasi di komputer pengguna.

## Batas klaim

Hasil unit, mock API, evaluasi sintetis, build, dan smoke test tidak membuktikan ketersediaan Bluesky pada jaringan pengguna maupun akurasi deteksi di lapangan. Semua sinyal koordinasi tetap indikator korelasi dan wajib diverifikasi manusia.
