# KARTIKA SHIELD 2.1.1 — Automatic Buzzer Full Analysis

## Perubahan utama
- Tombol **Ambil & analisis sekarang** menunggu pencarian online selesai, memuat batch terbaru, lalu menjalankan mesin analisis narasi dan laporan yang sama dengan mode manual.
- Pengumpulan otomatis memicu pembaruan laporan setelah setiap siklus. Jika tidak ada data baru, arsip lokal tetap dapat dianalisis ulang dengan label yang jelas agar tidak disalahartikan sebagai hasil pencarian baru.
- Endpoint pencarian Bluesky utama diganti ke `api.bsky.app`, dengan fallback endpoint AppView alternatif. Status menampilkan jumlah kata kunci gagal dan hasil pengambilan.
- Data unggahan tetap dianalisis meskipun statistik profil tidak tersedia. Nilai umur/follower/following yang tidak diketahui tidak dianggap nol dan tidak menghasilkan indikator profil palsu.
- Pola nama akun hanya dinilai dari metadata handle sumber; pseudonim hash tidak dipakai sebagai bukti pola nama.
- Tautan sumber menghindari handle `.invalid`; DID publik digunakan sebagai rute cadangan.
- Daftar sumber menampilkan 20 unggahan terbaru dengan cuplikan, waktu unggah, dan waktu pengumpulan.

## Fitur yang dipertahankan
- Mode analisis manual CSV/tempel tetap memakai mesin yang sama.
- Peta narasi, kronologi, indikator koordinasi, graf akun–narasi–tagar, peringatan dini, petunjuk DISARM, skor akun, laporan situasi, dan ekspor tetap tersedia.
- Penyimpanan lokal browser dan buffer Collector; tidak memakai MySQL.
- Fitur dashboard, Mini TV, RSS/berita, dan modul lain tidak sengaja dihapus atau diganti.

## Prinsip interpretasi
Kesamaan teks, waktu, tagar, umur akun, dan rasio pengikut hanya indikator korelasi. Hasil bukan bukti koordinasi, identitas, niat, afiliasi, atau pelanggaran. Kritik, opini, jurnalisme, advokasi, dan protes damai tidak otomatis dianggap ancaman. Verifikasi manusia dan sumber independen tetap diperlukan.

## Verifikasi
Hasil uji final dicatat pada `TEST_REPORT_2.1.1.md`. Konektivitas langsung ke Bluesky dari jaringan pengguna tidak dapat dikonfirmasi dari lingkungan build ini; pengujian endpoint dilakukan dengan mock lokal.
