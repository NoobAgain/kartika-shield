# PATCH TOP KODAM TERKAIT — 2026-11-13

Perubahan:
- Menambahkan pilihan konteks pemantauan Kodam pada panel Analisis Konten.
- Jika narasi memuat lokasi/Kodam yang dapat dikenali, hasil pemetaan otomatis dari teks tetap diprioritaskan.
- Jika narasi tidak memuat lokasi yang dapat dipetakan, Kodam yang dipilih pengguna menjadi konteks laporan.
- Rekaman analisis mengalir ke agregasi Peta Dini, sehingga Top Kodam Terkait terisi hanya jika ada Kodam yang teridentifikasi/dipilih.
- Tidak mengarang atribusi Kodam untuk narasi tanpa lokasi.

Berkas yang disentuh:
- index.html
- js/02-analisis.js
- js/07-feed.js
- dist/kartika-shield.html

Validasi:
- node --check js/02-analisis.js: lulus
- node --check js/07-feed.js: lulus
- 22 blok JavaScript inline pada dist/kartika-shield.html: lulus pemeriksaan sintaks.

Catatan:
- Statistik Top Kodam tetap kosong bila belum ada analisis baru dengan lokasi yang terpetakan atau pilihan Kodam yang eksplisit.
- Data lokal browser tidak diubah oleh patch ini.
