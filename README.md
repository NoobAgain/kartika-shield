# Kartika Shield

Dasbor anti disinformasi (Cognitive Domain) berbasis nilai Bhinneka Tunggal Ika, dengan kolektor data opsional.

Penilaian adalah **indikator pola bahasa dan perilaku, bukan putusan benar atau salah**. Hanya cek fakta resmi yang dapat menyatakan sebuah klaim hoaks.

## Struktur
```
index.html          kerangka halaman
assets/             gaya (style.css) dan logo
js/                 kode aplikasi, satu berkas per fitur (dimuat berurutan, angka di awal nama menentukan urutan)
data/               data statis (batas provinsi, lambang, peta dunia)
collector/          Caraka (agen siaga), bot pengambil data, kolektor Bluesky/RSS (Node.js >= 22, tanpa dependensi)
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
Pengaturan lewat variabel lingkungan: `PORT` (8787), `HOST` (127.0.0.1), `MIN_RISK` (45), `MAX_CLIENTS` (20), `ALLOW_ORIGIN` (asal tambahan untuk CORS), `LOG_CSV`, `JETSTREAM`, `RSS_URLS`. Pengaturan bot pengambil data dijelaskan terpisah di bawah.

Bila dasbor dibuka dari GitHub Pages: `ALLOW_ORIGIN=https://USERNAME.github.io node server.js`, lalu isi `http://localhost:8787` di tab Feed. Kolektor tidak bisa berjalan di GitHub Pages atau Vercel karena harus tersambung terus-menerus.

## Bot pengambil data Buzzer (Bluesky)
Mengambil unggahan publik, jumlah follower dan following, serta umur akun lewat API resmi Bluesky, lalu menulisnya dalam format tab Deteksi Buzzer (`akun,umur_akun_hari,follower,following,jam,teks|KODE`).

1. Di Bluesky buat **App Password** khusus (Pengaturan, Privasi dan keamanan, Kata sandi aplikasi). Jangan pakai kata sandi utama dan jangan dibagikan ke siapa pun.
2. Di PowerShell:
```
cd collector
$env:BSKY_HANDLE="namaanda.bsky.social"
$env:BSKY_APP_PASSWORD="xxxx-xxxx-xxxx-xxxx"
node ambil-buzzer.js --kata "pemilu,#indonesiadijual" --jam 3
```
3. Hasilnya `buzzer.csv`. Di dasbor, buka Buzzer lalu klik **Telusuri** (atau tempel isinya), kemudian **Deteksi**.

Pilihan: `--jam` (maks 24), `--maks`, `--keluar`, `--bahasa`, `--ulang 15` (ulangi tiap 15 menit dan hanya menambah unggahan baru), `--tampilkan-akun`. Lihat `node ambil-buzzer.js --bantuan`.

Catatan: nama akun dianonimkan secara bawaan (pola angka di akhir nama tetap dipertahankan karena itu sinyal bot yang sah). Jam ditulis dalam WIB. Analisis hanya valid dalam jendela maksimum 24 jam. Bot hanya membaca dan mematuhi batas laju server. Platform lain tidak punya akses publik resmi yang gratis (lihat catatan platform di bawah).

## Bot pengambil data YouTube
Mengambil komentar publik lewat YouTube Data API v3 resmi (kunci API gratis, kuota 10.000 unit per hari). Format keluaran sama dengan tab Deteksi Buzzer. Jumlah following tidak tersedia dari YouTube sehingga diisi 0.

1. Di Google Cloud Console buat proyek, aktifkan **YouTube Data API v3**, lalu buat **API key**. Jangan dibagikan.
2. Di PowerShell:
```
cd collector
$env:YT_API_KEY="AIza..."
node ambil-youtube.js --video "https://youtu.be/ID_VIDEO" --jam 24
node ambil-youtube.js --kata "pemilu,vaksin" --video-maks 5
```
3. Hasilnya `youtube.csv`. Muat lewat tombol **Telusuri** di tab Buzzer, lalu **Deteksi**.

Pencarian video memakai 100 unit per kata kunci, sedangkan mengambil komentar dari video yang sudah diketahui hampir tidak memakai kuota. Lihat `node ambil-youtube.js --bantuan`.

## Ekspor
- Peta Peringatan Dini: unduh PNG, cetak atau simpan PDF.
- Peta Live: unduh PNG.
- Feed: CSV hasil dan CSV tinjauan.

## Privasi dan batasan
- Kolektor tidak menulis ke disk kecuali `LOG_CSV` diisi. Akun ditampilkan sebagai hash 8 karakter.
- Cakupan sumber hanya Bluesky dan RSS. Platform lain tidak punya aliran publik atau berbayar.
- Skor berbasis aturan bahasa bisa salah tandai dan mudah dihindari. Selalu tinjau manual dan rujuk cek fakta (tautan tersedia di hasil Analisis).
- Mode AI (Analisis dan Bot) hanya aktif di lingkungan yang menyediakannya. Di tempat lain dasbor memakai mode offline.

Atribusi data dan lambang: lihat `THIRD_PARTY.md`.

## Catatan platform
| Platform | Bisa diambil secara sah? |
|---|---|
| Bluesky | Ya, `ambil-buzzer.js` (App Password) |
| YouTube | Ya, `ambil-youtube.js` (kunci API gratis) |
| Facebook | Hanya Halaman milik Anda, `ambil-facebook.js` (token Halaman) |
| TikTok | Hanya lewat Research API untuk peneliti yang disetujui |
| Facebook | Tidak ada pencarian publik. Meta Content Library hanya untuk peneliti yang disetujui |
| Instagram | Hanya akun bisnis sendiri, pencarian tagar sangat terbatas |
| X | API berbayar |
| WhatsApp | Terenkripsi dan privat, tidak ada data publik |
Menirukan login akun pribadi untuk mengambil data dari platform di atas melanggar ketentuan layanan dan berisiko memblokir akun.

## Pusat Data (penyimpanan dan kualitas data)

Jendela **Data** di dock mengelola semua data aplikasi (riwayat analisis, laporan peta, tinjauan feed).

- **Cadangan JSON**: unduh dan pulihkan seluruh data. Berkas memuat checksum, jadi berkas rusak ditolak. Saat memulihkan ada pratinjau (jumlah di berkas, baris rusak yang dibuang, hasil gabung) dan pilihan *Gabungkan* atau *Timpa*. Keadaan sebelumnya disimpan dulu dan bisa diurungkan.
- **Salinan otomatis**: data disalin ke IndexedDB tiap 10 detik bila berubah. Bila data lokal hilang (misalnya riwayat peramban dibersihkan) muncul tawaran memulihkan. Aplikasi juga meminta *penyimpanan permanen* ke peramban. Salinan ini tetap di peramban yang sama, jadi unduh cadangan berkas secara berkala. Aplikasi mengingatkan bila cadangan lebih dari 7 hari.
- **Validasi impor**: tiap record dicek bentuk dan rentangnya. Record dengan bentuk atau rentang tidak wajar dibuang.
- **Deteksi duplikat**: record identik dihitung dan dapat dihapus.
- **Validasi CSV Buzzer**: baris dengan kolom kurang, angka bukan bulat, jam bukan HH:MM, atau teks kosong ditolak dengan nomor baris dan alasan. Duplikat persis dibuang, kode provinsi tak dikenal dikosongkan, maksimum 5000 baris dan 5 MB. Tersedia tombol *Pakai data bersih* dan *Unduh baris ditolak*.

Uji otomatis: `t10.js` (tidak disertakan di paket).

## Bot Facebook (Halaman yang Anda kelola)

Facebook tidak punya API pencarian postingan publik (CrowdTangle sudah ditutup), jadi bot ini hanya membaca komentar di **Halaman yang Anda kelola**. Facebook juga tidak membuka umur akun, follower, dan following pengomentar, sehingga kolom itu diisi nilai netral (365, 100, 100) dan deteksi bersandar pada kemiripan teks, waktu serempak, dan pola nama.

1. Buat aplikasi di developers.facebook.com (jenis Business), lalu buka Graph API Explorer.
2. Pilih Halaman Anda, minta izin `pages_show_list`, `pages_read_engagement`, `pages_read_user_content`, lalu buat **Page access token**.
3. Jalankan (token lewat variabel lingkungan, jangan di-commit):
```
$env:FB_PAGE_TOKEN="EAA..."
$env:FB_PAGE_ID="ID_HALAMAN"
node collector/ambil-facebook.js --jam 24
```
Token dikirim lewat header, tidak pernah dicetak, dan tautan paginasi yang memuat token tidak diikuti. Hasil `facebook.csv` diunggah di tab Deteksi Buzzer. Untuk izin tertentu Meta bisa meminta App Review bila aplikasi dipakai pihak lain, tetapi untuk Halaman milik sendiri dengan akun admin/pengembang aplikasi biasanya tidak perlu.

## Offline penuh

d3 dan topojson disertakan di `vendor/`, dan `dist/kartika-shield.html` berjalan tanpa internet.

## Demo terpandu

Saat dibuka pertama kali muncul layar pembuka. Tombol **Demo** di peta menjalankan alur 4 langkah dengan data contoh (analisis, buzzer, peta dini, pantauan). Data Anda dicadangkan sebelum demo dan dikembalikan sesudahnya.

## Evaluasi akurasi

Lihat `docs/EVALUASI.md` untuk metode, angka, dan keterbatasan. Penilai konten memakai aturan ditambah model ringan terlatih. Alat uji ada di jendela **Data**.

## Caraka, agen pemantau yang selalu siaga

`collector/caraka.js` berjalan terus dan memantau sumber resmi secara berkala: Bluesky (pencarian kata kunci), YouTube (komentar video terbaru), Facebook (Halaman milik Anda), dan RSS berita. Hasilnya dinilai, teks kembar lintas akun dideteksi, lalu disiarkan ke dasbor.

**Menyiapkan**
1. Salin `collector/caraka.config.contoh.json` menjadi `caraka.config.json`, isi `kataKunci`, dan isi `izinkanAsal` dengan alamat situs Anda bila dasbor dibuka dari GitHub Pages.
2. Di Windows, salin `rahasia-caraka.contoh.bat` menjadi `rahasia-caraka.bat` lalu isi kunci dan token (berkas ini diabaikan git). Di sistem lain, isi variabel lingkungan yang sama.
3. Uji dulu: `node collector/caraka.js --cek` (memeriksa konfigurasi dan tiap kredensial tanpa menjalankan pemantauan).
4. Jalankan: `jalankan-caraka.bat` (Windows, otomatis mulai ulang bila berhenti) atau `node collector/caraka.js`. Untuk server, bungkus dengan `pm2` atau `systemd`.

**Memakai di dasbor**
- Tab **Feed**: isi alamat `http://localhost:8787`, tekan **Hubungkan kolektor**. Temuan muncul langsung di peta dan daftar.
- Tab **Buzzer**: tombol **Ambil dari Caraka** memuat data 24 jam terakhir (`/buzzer.csv`) dan langsung menganalisisnya.
- Status tiap sumber: `http://localhost:8787/stats`.

**Perilaku siaga**
- Tiap sumber berjalan sendiri. Bila satu gagal, ia mencoba lagi dengan jeda bertambah dan sumber lain tetap jalan.
- Kredensial ditolak menghentikan sumber itu saja (tidak memukul API berulang) dan statusnya `ditolak`.
- Kuota YouTube dijaga: pencarian video (100 unit) dibatasi tiap `cariVideoMenit` dan ada batas harian `kuotaHarian`. Saat habis, hanya komentar video yang sudah dikenal yang dipantau.
- ID yang sudah diproses dan buffer 24 jam disimpan di `caraka-data/`, jadi restart tidak mengulang data.
- Akun dianonimkan (hash) kecuali `akunAsli` diaktifkan. Server hanya membaca, hanya mendengar di komputer ini, dan hanya menerima asal yang diizinkan.
- Facebook tidak membuka umur akun dan follower, jadi nilainya netral. Facebook hanya untuk Halaman yang Anda kelola.

**Batas yang perlu diketahui**: Caraka diuji dengan API tiruan, belum dengan API sungguhan. Ia hanya membaca data publik atau milik Anda lewat API resmi. TikTok, X, dan Instagram tidak punya akses resmi yang bisa dipakai.
