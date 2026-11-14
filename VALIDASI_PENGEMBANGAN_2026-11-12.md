# Validasi Pengembangan Kartika Shield 2.0.0

Tanggal: 12 November 2026  
Lingkungan uji: Node.js v22.16.0, Linux sandbox.  
Penyimpanan: lokal (JSON di Collector dan penyimpanan browser); tidak membutuhkan MySQL.

## Perubahan/komponen yang diperiksa

- `collector/services/news-analysis.js`: analisis awal berita berbasis aturan lokal, dimensi kejadian, skor risiko dan keyakinan, alasan, serta gerbang verifikasi manusia.
- `collector/server.js`: integrasi analisis ke artikel RSS, metadata sumber/waktu, penyimpanan arsip lokal, dan endpoint `/news` dengan filter.
- `js/modules/mini-tv.js`: Mini TV dengan kanal YouTube resmi TVRI, tvOne, Metro TV, dan Kompas TV; pilihan kanal dan status sembunyi/tampil disimpan lokal.
- `index.html` dan `assets/style.css`: komponen Mini TV dan pemuatan modul mandiri.
- Integrasi OpenRouter di Collector dan n8n bridge tetap ada pada source; tidak ada kredensial yang dimasukkan ke paket.

## Hasil yang benar-benar dijalankan pada sesi ini

| Pemeriksaan | Hasil |
|---|---|
| `node --check` untuk seluruh JavaScript aplikasi, Collector, layanan, dan build tools | LULUS |
| `node tests/unit_engine.js` | LULUS — 66/66 |
| `node tests/test_news_analysis.js` | LULUS |
| `node tests/test_public_news.js` | LULUS |
| `node tests/test_mini_tv.js` | LULUS |
| `node tools/build.js` (dipanggil oleh `npm test`) | LULUS — `dist/kartika-shield.html` dibangun |
| `npm test` lengkap | BELUM TERVERIFIKASI: tahap Playwright tidak dapat membuka halaman karena Chromium di lingkungan ini mengembalikan `ERR_BLOCKED_BY_ADMINISTRATOR` pada `file://` maupun `http://127.0.0.1`. Ini hambatan lingkungan uji, bukan bukti bahwa UI lulus atau gagal. |
| Uji browser n8n | BELUM TERVERIFIKASI karena hambatan Chromium yang sama. |
| Uji koneksi sumber eksternal nyata / API ber-token | BELUM DIJALANKAN pada sesi ini. |

## Batas interpretasi dan keamanan

- Analisis berita adalah penyaringan awal, bukan verifikasi fakta, penetapan ancaman, atau atribusi pelaku.
- Demonstrasi damai dan kritik tidak boleh diperlakukan sebagai ancaman hanya karena topiknya sensitif.
- Status kritis memerlukan sejumlah sinyal sekaligus, termasuk lokasi eksplisit dan lebih dari satu sumber independen; operator tetap wajib memeriksa sumber asli.
- Mini TV mengarah ke embed kanal YouTube resmi. Ketersediaan siaran/izin embed ditentukan YouTube dan tidak dijamin dashboard. Status LIVE tidak diklaim otomatis.
- Paket ini tidak menyertakan `.env`, token, API key, `node_modules`, atau kredensial.

## Cara menjalankan di Windows

1. Ekstrak ZIP ke folder kerja baru, jangan menimpa folder produksi.
2. Pastikan Node.js 22 atau lebih baru.
3. Salin `.env.example` menjadi `.env` jika perlu konfigurasi Collector. Isi kredensial langsung di komputer sendiri; jangan kirim file `.env` ke siapa pun.
4. Jalankan PowerShell dari folder proyek:

```powershell
npm test
npm run collector
```

5. Buka `index.html` di browser. Collector lokal berjalan pada `http://127.0.0.1:8787`.
6. Uji endpoint tanpa mengubah data:

```powershell
Invoke-RestMethod http://127.0.0.1:8787/health
Invoke-RestMethod "http://127.0.0.1:8787/news?limit=5"
```

Jalankan pengujian browser pada komputer Windows pengguna untuk verifikasi akhir UI, karena sandbox sesi ini memblokir navigasi Chromium.
