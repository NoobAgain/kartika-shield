# KARTIKA SHIELD — Kodam-centric monitoring upgrade

## Tujuan
Mengubah unit utama pemantauan yang ditampilkan dari kota/provinsi menjadi 27 Kodam. Kota/provinsi tetap dipertahankan sebagai petunjuk geografis dan metadata sumber agar asal informasi dapat ditelusuri.

## Perubahan
- `js/00d-kodam-scope.js` ditambahkan sebagai resolver tunggal untuk mengubah penyebutan provinsi/kota atau kode provinsi menjadi identitas Kodam berdasarkan `data/kodam.js` dan `KODAM_BY_PROVINCE`.
- `index.html` memuat resolver sebelum modul analisis.
- `js/05-peta-live.js` memakai 27 entri `KODAM_DATA` sebagai target peta/simulasi; statistik lokasi ditampilkan sebagai nama Kodam.
- `js/07-feed.js` mengubah petunjuk lokasi dari analisis/collector menjadi target Kodam; ekspor feed menampilkan kolom Kodam dan menyimpan kode provinsi untuk jejak asal.
- `js/04-peta-dini.js` mengagregasikan laporan pada tingkat Kodam, menyediakan pemilihan Kodam untuk laporan manual, dan menampilkan provinsi hanya sebagai cakupan pendukung.
- `js/03-buzzer.js` dan `js/00c-kognitif-dini.js` menampilkan ringkasan lokasi klaster pada tingkat Kodam.
- `js/08-laporan.js` menyajikan prioritas dan ringkasan sebagai prioritas Kodam.
- `dist/kartika-shield.html` dibangun ulang.

## Data dan kompatibilitas
- `data/kodam.js`, `data/provinces.js`, `data/logos.js`, dan data aset lambang tidak diubah.
- Skema catatan lama tetap kompatibel: kode provinsi yang sudah tersimpan dipetakan saat dibaca; tidak ada migrasi atau penghapusan localStorage/IndexedDB.
- Kota/provinsi yang disebut dalam teks hanya menjadi petunjuk pemetaan, bukan geolokasi akun atau bukti bahwa suatu Kodam terdampak.
- Jika tidak ada petunjuk wilayah yang cukup, data tidak dipaksakan ke Kodam tertentu.
- Pemetaan teritorial tetap mengikuti dataset yang sudah ada di `data/kodam.js`; verifikasi resmi organisasi/teritorial tetap diperlukan sebelum penggunaan kedinasan.

## Pengujian
- `node --check` untuk semua file JavaScript: lulus.
- `tests/unit_engine.js`: 68/68 lulus.
- `tests/test_news_analysis.js`: lulus.
- `tests/test_public_news.js`: lulus.
- `tests/test_mini_tv.js`: lulus.
- `tests/test_buzzer_auto.js`: lulus.
- Build `node tools/build.js`: berhasil.
- Browser visual test tidak dijalankan karena Chromium Playwright tidak tersedia di lingkungan build.
