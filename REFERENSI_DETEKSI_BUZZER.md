# Referensi teknis — Deteksi Buzzer Otomatis

Dokumen ini membedakan referensi protokol/sumber data dari metode analisis. KARTIKA SHIELD tidak mengklaim bahwa sumber-sumber ini membuktikan adanya operasi buzzer.

## 1. Sumber data Bluesky

- **Bluesky HTTP API Reference**: https://docs.bsky.app/docs/api/app-bsky-feed-get-feed
  - Endpoint pencarian utama: `https://api.bsky.app/xrpc/app.bsky.feed.searchPosts`; fallback: `https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts`. Keduanya adalah host AppView Bluesky; dokumentasi resmi menjelaskan penggunaan endpoint AppView untuk pembacaan publik tanpa autentikasi.
  - Endpoint pencarian unggahan: `app.bsky.feed.searchPosts`.
  - Pengayaan profil publik menggunakan `app.bsky.actor.getProfiles` dan `app.bsky.actor.getProfile`.
- **Rate limits resmi**: https://bsky.network/docs/rate-limits/
  - Baca header rate-limit dan tangani HTTP 429 dengan jeda/backoff; batas dapat berubah.
- **Jetstream / protocol services**: https://bsky.network/docs/protocol-services/
  - Jetstream menyediakan aliran event publik real-time. Itu berbeda dari endpoint pencarian berbasis kata kunci.

**Cakupan implementasi 2.1.1:** modul otomatis saat ini melakukan pencarian kata kunci pada Bluesky AppView publik, bukan pemantauan menyeluruh seluruh media sosial dan bukan arsip lengkap seluruh Bluesky. Hasil pencarian tergantung indeks, bahasa, kata kunci, jendela waktu, limit, dan ketersediaan layanan. Collector berjalan berkala sesuai konfigurasi bot (bawaan 10 menit).

## 2. Kerangka analisis

- **DISARM Red Framework**: https://www.disarm.foundation/framework
- **Repositori resmi DISARM**: https://github.com/DISARMFoundation/DISARMframeworks

DISARM adalah bahasa/kerangka untuk mendokumentasikan perilaku dan teknik dalam insiden manipulasi informasi. Pemetaan taktik tidak boleh dipakai sebagai atribusi otomatis kepada akun atau kelompok tertentu.

## 3. Batas interpretasi dan perlindungan

- Kesamaan teks, tagar, atau waktu adalah korelasi awal, bukan bukti koordinasi, identitas operator, niat, atau afiliasi.
- Statistik akun berasal dari profil publik Bluesky dan dapat berubah. Jika data profil tidak tersedia, unggahan tetap dianalisis untuk pola teks/waktu, sedangkan indikator umur, follower, dan following dinonaktifkan (tidak dianggap nol). Pola nama hanya dihitung dari metadata handle sumber, bukan dari pseudonim HMAC.
- Kode wilayah hanya ditambahkan jika nama wilayah dikenali dari teks unggahan. Ini **bukan** lokasi akun, GPS, atau bukti bahwa penulis berada di wilayah tersebut.
- Akun ditampilkan sebagai pseudonim HMAC lokal. Pseudonim bukan identitas dan bukan penilaian bahwa akun palsu.
- Kritik, opini politik, pelaporan, jurnalisme, kegiatan advokasi, protes damai, dan percakapan organik tidak boleh otomatis diberi label buzzer/ancaman.
- Semua peringatan harus ditinjau manusia dengan membuka unggahan asli dan memeriksa konteks serta sumber independen.
- Pengumpulan hanya membaca data publik melalui API resmi; tidak melakukan bypass, scraping login, pengambilalihan akun, atau tindakan terhadap akun.

## 4. Data dan penyimpanan

- Buffer server berisi data terbaru selama proses Collector aktif.
- Browser menyimpan hingga 500 record ringkas pada `localStorage` dengan key `ks_buzzer_auto_v1`.
- Tidak menggunakan MySQL. Tidak menyimpan App Password Bluesky untuk fitur pencarian publik otomatis.
- Salt pseudonimisasi dibuat lokal di `collector/data/.anon-salt` kecuali `ANON_SALT` diberikan melalui environment. File tersembunyi ini tidak boleh dipublikasikan.
