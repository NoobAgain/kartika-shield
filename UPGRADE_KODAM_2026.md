# Upgrade KARTIKA SHIELD — Kodam Map Overlay

Tanggal: 12 November 2026

## Perubahan
- Menambahkan `data/kodam.js` sebagai data overlay 27 Kodam dan pemetaan 38 provinsi ke Kodam.
- Peta Dunia Live menampilkan 27 marker identitas Kodam pada koordinat kota markas yang dipakai sebagai titik visualisasi.
- Peta Peringatan Dini tetap menyajikan data per provinsi, tetapi ikon provinsi memakai identitas Kodam wilayahnya.
- File `index.html` memuat data Kodam sebelum modul peta.

## Batas penting
- Lambang visual yang disediakan adalah badge identifikasi netral dengan singkatan, BUKAN lambang resmi TNI AD/Kodam. Jangan dipresentasikan sebagai insignia resmi.
- Koordinat adalah titik kota/markas untuk visualisasi, bukan lokasi operasional atau lokasi satuan.
- Pemetaan provinsi-Kodam adalah pemetaan referensi berdasarkan sumber publik yang ditemukan; pembagian wilayah yang bersifat lintas-provinsi atau berubah perlu dikonfirmasi kepada sumber resmi TNI AD sebelum dipakai untuk keperluan dinas.
- Data simulasi dan mesin analisis lainnya tidak diubah.
- `dist/kartika-shield.html` dibangun ulang dari source.

## Rujukan organisasi
- TNI AD: https://tniad.mil.id/hut-ke-81-tni-kasad-saksikan-peresmian-enam-kodam-baru/
- Sekretariat Presiden: https://presidenri.go.id/siaran-pers/presiden-prabowo-resmikan-204-satuan-baru-tni-pada-peringatan-hut-ke-81-tni/
- Rekap 27 Kodam dan pemetaan teritorial: https://dataindonesia.id/berita/detail/daftar-lengkap-jenderal-yang-dimutasi-awal-oktober-2026-rotasi-besar-tni-dan-peresmian-6-kodam-baru
