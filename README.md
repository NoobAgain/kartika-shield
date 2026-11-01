# Kartika Shield

Dasbor anti disinformasi (Cognitive Domain) berbasis nilai Bhinneka Tunggal Ika, dengan kolektor data opsional.

Penilaian adalah **indikator pola bahasa dan perilaku, bukan putusan benar atau salah**. Hanya cek fakta resmi yang dapat menyatakan sebuah klaim hoaks.

## Struktur
```
index.html          kerangka halaman
assets/             gaya (style.css) dan logo
js/                 kode aplikasi, satu berkas per fitur (dimuat berurutan, angka di awal nama menentukan urutan)
data/               data statis (batas provinsi, lambang, peta dunia, katalog DISARM)
collector/          kolektor Bluesky/RSS (Node.js >= 22, tanpa dependensi)
tools/build.js      menggabungkan semuanya menjadi satu berkas
dist/               hasil build, kartika-shield.html (berkas tunggal mandiri)
```

## Menjalankan dasbor
- **Langsung**: buka `index.html` (atau `dist/kartika-shield.html`) dengan klik dua kali.
- **GitHub Pages / Vercel**: unggah repositori apa adanya, `index.html` di akar.
- **Membuat ulang berkas tunggal** setelah mengubah kode: `node tools/build.js`

Tidak ada langkah instal. Pustaka d3 dan topojson dimuat dari CDN, jadi butuh internet saat pertama kali dibuka.

## Mengisi data
| Cara | Tempat |
|---|---|
| Aliran Bluesky langsung dari peramban | Feed, tombol Sambungkan |
| Kolektor di komputer sendiri (ada deteksi koordinasi) | Feed, Hubungkan kolektor |
| Tempel teks | Analisis |
| Impor CSV unggahan | Buzzer |
| Isi manual per provinsi | Peta Dini |
| Data sintetis untuk demo | tombol Mode: Simulasi (diberi penanda tegas) |

## Menguji mutu penilaian dengan data nyata
1. Hubungkan Feed (langsung atau lewat kolektor) dan biarkan beberapa jam.
2. Pada tiap hasil di daftar Feed, klik **tepat** atau **salah tandai**. Ringkasan presisi berjalan muncul di atas daftar (targetkan minimal 30 tinjauan).
3. Unduh **hasil feed (CSV)** dan **tinjauan (CSV)** untuk laporan. Tinjauan hanya tersimpan di peramban Anda.

Kolektor bisa menyimpan hasilnya sendiri: `LOG_CSV=hasil.csv node collector/server.js` (akun tetap berupa hash, ada kolom `penilaian_manual` untuk diisi).

## Kolektor
```
cd collector
node server.js
```
Pengaturan lewat variabel lingkungan: `PORT` (8787), `HOST` (127.0.0.1), `MIN_RISK` (45), `MAX_CLIENTS` (20), `ALLOW_ORIGIN` (asal tambahan untuk CORS), `LOG_CSV`, `JETSTREAM`, `RSS_URLS`.

Bila dasbor dibuka dari GitHub Pages: `ALLOW_ORIGIN=https://USERNAME.github.io node server.js`, lalu isi `http://localhost:8787` di tab Feed. Kolektor tidak bisa berjalan di GitHub Pages atau Vercel karena harus tersambung terus-menerus.

## Ekspor
- Peta Peringatan Dini: unduh PNG, cetak atau simpan PDF.
- Peta Live: unduh PNG.
- Feed: CSV hasil dan CSV tinjauan.
- Insiden: bundel STIX 2.1.

## Privasi dan batasan
- Kolektor tidak menulis ke disk kecuali `LOG_CSV` diisi. Akun ditampilkan sebagai hash 8 karakter.
- Cakupan sumber hanya Bluesky dan RSS. Platform lain tidak punya aliran publik atau berbayar.
- Skor berbasis aturan bahasa bisa salah tandai dan mudah dihindari. Selalu tinjau manual dan rujuk cek fakta (tautan tersedia di hasil Analisis).
- Mode AI (Analisis dan Bot) hanya aktif di lingkungan yang menyediakannya. Di tempat lain dasbor memakai mode offline.

Atribusi data dan lambang: lihat `THIRD_PARTY.md`.
