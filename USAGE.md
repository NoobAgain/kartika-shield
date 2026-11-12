# USAGE, Panduan Operator

Navigasi: dock di atas Peta Dunia Live. Klik sekali membuka jendela, klik lagi meminimalkan, klik lagi memulihkan.

## 1. Analisis Konten (Cognitive Threat Analysis)
1. Buka **Analisis**, tempel teks, klik **Analisis**.
2. Baca: **Risiko 0–100** dan status; **Tingkat keyakinan** dan **Konteks** (mis. bantahan bersumber); **8 bar kategori** (arahkan kursor untuk definisi); **Bukti** (kutipan teks yang cocok); **Teknik**; **DISARM** (isyarat); **Metode & keterbatasan**; langkah tabayyun; tautan cek fakta; narasi tandingan.
3. Skor menunjukkan prioritas pemeriksaan, **bukan benar/salah**. Teks bantahan resmi sengaja berskor rendah.

## 2. Deteksi Buzzer & Peta Narasi/Pengaruh
1. Siapkan CSV: `akun,umur_hari,follower,following,waktu,teks[|KODE]`. **Waktu:** `HH:MM` atau (disarankan untuk multi-hari) `YYYY-MM-DDTHH:MM`. `|KODE` = kode provinsi 2 huruf (mis. `|JB`), opsional.
2. Tempel/unggah, klik **Deteksi** (contoh: **Gunakan contoh**; berkas `eval/SIMULASI_contoh_narasi.csv` siap diimpor). Pemeriksaan data menampilkan baris ditolak dengan alasan; **Pakai data bersih** membuang yang rusak/duplikat.
3. Hasil:
   - **Koordinasi** (tertinggi antar narasi) dengan kategori indikasi.
   - **Narasi utama**: tabel klaster (kata kunci, akun, unggahan, durasi, koordinasi, manipulasi, level peringatan dini).
   - **Peringatan dini kognitif**: 6 komponen, gerbang level, rekomendasi defensif, keterbatasan.
   - **Bukti koordinasi** per narasi (kode K1–K7) beserta **penjelasan alternatif**.
   - **Graf** akun–narasi–tagar (persegi = narasi, lingkaran = akun, belah ketupat = tagar; garis merah = serempak), **kronologi**, garis waktu, tagar, DISARM, **skor per akun**.
4. **Laporan situasi kognitif** menampilkan ringkasan teks; **Ekspor hasil (JSON)** menyimpan seluruh hasil beserta ID baris.
5. **Kirim ke Peta Dini** (butuh `|KODE`) mengirim catatan per provinsi dan narasi.

**Cara membaca status akun:** "Indikasi kuat tidak autentik" memerlukan ≥2 sinyal profil (umur, nama, rasio, follower) **dan** korelasi teks/waktu. Kesamaan teks dan waktu saja hanya menghasilkan "Perlu verifikasi" dan **tidak cukup menyimpulkan buzzer**. Verifikasi manual sebelum tindakan apa pun terhadap akun.

## 3. Peta Peringatan Dini
Tambah laporan manual (isu, volume, risiko), **Gunakan contoh** (data simulasi), atau **Kirim ke Peta Dini** dari Buzzer. Panel **Peringatan dini kognitif** di bawah tabel menampilkan level tiap narasi dari analisis Buzzer terakhir.

## 4. Peta Dunia Live dan Feed
Peta menampilkan peristiwa dari kolektor, Feed Bluesky, impor CSV, dan analisis konten. **Mode: Simulasi** memunculkan data sintetis berlabel **SIMULASI · DATA SINTETIS**; jangan dipakai sebagai kondisi nyata. Feed: hubungkan kolektor, tinjau hasil (tepat/salah tandai) untuk presisi berjalan.

## 5. Laporan Komando
Isi judul/PIC/tenggat/status/catatan, klik **Buat laporan**. Bagian **2a Situasi kognitif** memuat narasi dominan, indikator ancaman, kronologi, wilayah relevan (bila ada), bukti, tingkat keyakinan, dan rekomendasi respons defensif. Simpan, unduh **JSON**/**CSV**, **Cetak/PDF**, atau salin teks. Jalankan Buzzer dulu agar bagian 2a terisi.

## 6. Dashboard dan Pusat Data
Dashboard: jumlah analisis, rata-rata risiko, sebaran status, **kategori indikator kognitif**, teknik terbanyak (dari riwayat peramban). Pusat Data: unduh cadangan (JSON ber-checksum), pulihkan dengan **pratinjau** (Gabungkan/Timpa) dan **Urungkan**, cek duplikat, hapus semua data (dua konfirmasi).

## 7. Etika operasional
Hasil adalah indikator korelasi. Jangan menyimpulkan operasi pengaruh atau niat pelaku dari skor; jangan menindak individu tanpa verifikasi manusia; respons yang disarankan bersifat defensif (klarifikasi bersumber, pelaporan resmi platform, literasi).
