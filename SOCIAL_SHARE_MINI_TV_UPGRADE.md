KARTIKA SHIELD - ADD-ON SHARE DATA & MINI LIVE TV

Penambahan pada paket ini:
1. Bagian "Share data" di bagian bawah dashboard.
2. Tombol berbagi Facebook dan X/Twitter menggunakan URL dashboard saat ini.
3. Tombol TikTok: memakai menu berbagi perangkat jika tersedia; pada desktop menyalin URL dan membuka TikTok agar tautan dapat ditempelkan. TikTok tidak menyediakan endpoint web-share universal untuk membagikan URL situs eksternal secara langsung.
4. Mini Live TV yang sudah ada di paket sumber dipertahankan tanpa mengubah daftar kanal atau logikanya (tvOne, Kompas TV, Metro TV).

File yang diubah:
- index.html: menambahkan panel Share data dan memuat modul baru.
- assets/style.css: menambahkan gaya khusus panel Share data.
File baru:
- js/modules/social-share.js
Hasil build:
- dist/kartika-shield.html

Validasi yang dijalankan:
- node --check js/modules/social-share.js
- node --check js/modules/mini-tv.js
- node tests/test_mini_tv.js
- node tools/build.js

Catatan:
- Pemutaran Mini Live TV bergantung pada izin embed dari penyiar/YouTube.
- Jika dashboard dibuka melalui file://, URL yang dibagikan hanya alamat lokal komputer. Untuk dibagikan ke orang lain, host dashboard melalui HTTP/HTTPS.
- Tidak ada menu, data Kodam, peta, maupun modul analisis yang sengaja diubah.
