# Perbaikan Sinkronisasi Analisis dan Statistik Sesi

- Setiap analisis yang selesai sekarang memperbarui statistik sesi, walaupun teks tidak menyebut Kodam yang dapat dipetakan.
- Lima tipe ancaman dihitung berdasarkan indikator hasil analisis dan petunjuk eksplisit.
- Indikasi buzzer/koordinasi tidak disimpulkan hanya dari satu teks tanpa petunjuk koordinasi.
- Data Peta Dini dan catatan Kodam hanya dibuat jika lokasi berhasil dipetakan; sistem tidak mengarang Kodam.
- `dist/kartika-shield.html` dibangun ulang dari sumber menggunakan `node tools/build.js`.
- Uji regresi: `node tests/test_analysis_sync.js`.
