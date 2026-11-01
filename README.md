# Kartika Shield

Dasbor anti disinformasi (Cognitive Domain) berbasis nilai Bhinneka Tunggal Ika.

- `index.html` : dasbor satu berkas (jalan sepenuhnya di peramban). Hosting: GitHub Pages.
- `collector/` : pengumpul data Bluesky/RSS (Node.js >= 22, tanpa dependensi). Tidak bisa di GitHub Pages.

Skor adalah **indikator pola bahasa, bukan bukti**. Verifikasi manual sebelum menindak akun atau konten apa pun.

## Mode di dasbor
- Tanpa kolektor: Analisis Hoaks (mode offline), Deteksi Buzzer (tempel CSV), Peta Peringatan Dini, Insiden/STIX, Edukasi.
- Dengan kolektor: buka tab Feed, isi alamat kolektor, klik **Hubungkan kolektor**.

## Menjalankan kolektor lokal
```
cd collector
node server.js
```
Lalu di dasbor isi `http://localhost:8787`. Pengaturan: `PORT`, `HOST`, `MIN_RISK`, `MAX_CLIENTS`, `ALLOW_ORIGIN`, `JETSTREAM`, `RSS_URLS`.

Bila dasbor dibuka dari GitHub Pages, tambahkan asalnya agar CORS lolos:
```
ALLOW_ORIGIN=https://USERNAME.github.io node server.js
```

## Privasi
Kolektor tidak menulis ke disk. Hanya 50 hasil terakhir di memori, akun ditampilkan sebagai hash 8 karakter.
Pastikan pemakaian sesuai aturan pelindungan data pribadi dan ketentuan layanan sumber data.

Atribusi: lihat `THIRD_PARTY.md`.
