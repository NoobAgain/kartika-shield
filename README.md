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
- Insiden: bundel STIX 2.1.

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
| TikTok | Hanya lewat Research API untuk peneliti yang disetujui |
| Facebook | Tidak ada pencarian publik. Meta Content Library hanya untuk peneliti yang disetujui |
| Instagram | Hanya akun bisnis sendiri, pencarian tagar sangat terbatas |
| X | API berbayar |
| WhatsApp | Terenkripsi dan privat, tidak ada data publik |
Menirukan login akun pribadi untuk mengambil data dari platform di atas melanggar ketentuan layanan dan berisiko memblokir akun.

## Pusat Data (penyimpanan dan kualitas data)

Jendela **Data** di dock mengelola semua data aplikasi (riwayat analisis, laporan peta, insiden, tinjauan feed, saluran berita).

- **Cadangan JSON**: unduh dan pulihkan seluruh data. Berkas memuat checksum, jadi berkas rusak ditolak. Saat memulihkan ada pratinjau (jumlah di berkas, baris rusak yang dibuang, hasil gabung) dan pilihan *Gabungkan* atau *Timpa*. Keadaan sebelumnya disimpan dulu dan bisa diurungkan.
- **Salinan otomatis**: data disalin ke IndexedDB tiap 10 detik bila berubah. Bila data lokal hilang (misalnya riwayat peramban dibersihkan) muncul tawaran memulihkan. Aplikasi juga meminta *penyimpanan permanen* ke peramban. Salinan ini tetap di peramban yang sama, jadi unduh cadangan berkas secara berkala. Aplikasi mengingatkan bila cadangan lebih dari 7 hari.
- **Validasi impor**: tiap record dicek bentuk dan rentangnya. ID video atau saluran YouTube yang tidak sesuai pola ditolak.
- **Deteksi duplikat**: record identik (insiden juga bila namanya sama) dihitung dan dapat dihapus.
- **Validasi CSV Buzzer**: baris dengan kolom kurang, angka bukan bulat, jam bukan HH:MM, atau teks kosong ditolak dengan nomor baris dan alasan. Duplikat persis dibuang, kode provinsi tak dikenal dikosongkan, maksimum 5000 baris dan 5 MB. Tersedia tombol *Pakai data bersih* dan *Unduh baris ditolak*.

Uji otomatis: `t10.js` (tidak disertakan di paket).
