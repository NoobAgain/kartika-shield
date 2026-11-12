# Evaluasi penilai konten (jujur dan dapat diulang)

## Apa yang diukur
Penilai konten Kartika Shield versi ini memakai **aturan pola manipulasi** yang berjalan lokal di peramban:
1. Huruf kapital atau tanda seru berlebihan.
2. Desakan menyebarkan segera.
3. Klaim penyembunyian oleh pihak berkuasa (konspirasi).
4. Bahasa ancaman terhadap kelompok.
5. Eksploitasi isu SARA bila bergabung dengan pola lain.
6. Tidak mencantumkan sumber yang dapat dicek.

Skor 0-100 dipetakan ke RENDAH, PERLU DIVERIFIKASI, SEDANG, atau TINGGI. Ini **indikator triase pola bahasa, bukan pemeriksaan fakta** dan bukan putusan benar atau salah. Hanya cek fakta resmi yang dapat menyatakan sebuah klaim hoaks.

## Arah narasi dan pemetaan DISARM
- **Arah narasi** diperkirakan dari kata penilaian/dukungan dan **sasaran** dari kata lembaga/kelompok (pemerintah, agama, etnis/warga asing, kesehatan, politik, tokoh publik, ekonomi, kelompok rentan). Hasilnya dipakai di Analisis, Feed, Buzzer, dan Laporan Komando.
- **DISARM** dipetakan dengan aturan sinyal di `js/06-disarm.js`: tagar kampanye (`T0015.002`), clickbait (`T0016`), konspirasi (`T0022`), pembelahan (`T0079`), eksploitasi SARA (`T0083`), ujaran kebencian (`T0140.003`), deepfake/cheap fake (`T0087.001`, `T0086.003`), amplifikasi otomatis/serempak (`T0049.003`, `T0049.005`), akun baru/massal (`T0150.001`, `T0150.008`), dan seterusnya.
- Pemetaan ini **tidak** divalidasi oleh pakar DISARM dan bukan atribusi resmi. Rujukan: DISARM Foundation, CC BY-SA 4.0 (lihat `THIRD_PARTY.md`).

## Data dan pengujian
- **Tidak ada model terlatih** yang disertakan pada versi ini. Semua penilaian berjalan dengan aturan lokal; teks tidak dikirim ke server.
- Tab **Buzzer** menyediakan **Uji akurasi internal** dengan 18 akun sintetis berlabel (9 positif, 9 negatif), termasuk kasus sulit: akun lama yang diretas, spam tunggal, dan relawan sah yang bergerak serempak. Tabel TP/FP/FN/TN hanya menunjukkan pertukaran antara ambang ketat dan longgar, bukan akurasi lapangan.
- Untuk data nyata: sambungkan Feed, tinjau hasil dengan tombol **Tepat** / **Salah tandai** (targetkan minimal 30 tinjauan), lalu unduh CSV tinjauan. Ringkasan presisi berjalan muncul di atas daftar.

## Keterbatasan (baca sebelum mengutip angka)
- Aturan bahasa mudah dihindari dan bisa salah tandai pada sarkasme, kutipan berita, atau teks bantahan.
- Belum ada validasi pada korpus berlabel nyata. Data sintetis tidak mewakili distribusi lapangan, sehingga angka internal tidak boleh disebut sebagai akurasi sesungguhnya.
- Deteksi buzzer bersandar pada kemiripan teks, waktu serempak, dan profil akun. Akun sah yang bergerak serempak bisa ikut tertandai.
- Arah/sasaran narasi dan DISARM adalah heuristik kata kunci; sarkasme, kutipan, bahasa daerah, dan kalimat bantahan dapat salah petakan. Tidak ada validasi lapangan pada versi ini.
- Laporan Komando merangkum data sesi secara otomatis. Angka dan label tetap indikator; periksa manual sebelum dipakai untuk tindakan.
- Teks unggahan hanya berada di memori peramban. Tinjauan dan riwayat disimpan lokal di peramban pengguna.
- Skor tidak boleh dipakai untuk menuduh individu atau kelompok. Selalu rujuk sumber primer dan cek fakta resmi.

## Mengulang pengujian
1. Buka jendela **Buzzer** dari dock peta, lalu tekan **Uji akurasi** untuk melihat tabel ambang pada data sintetis.
2. Untuk pengukuran nyata, sambungkan **Feed**, tandai minimal 30 hasil, lalu unduh **tinjauan (CSV)** sebagai bukti.
3. Buka **Laporan Komando**, susun laporan, simpan tindak lanjut, lalu unduh JSON/CSV atau cetak PDF sebagai rekap sesi.
4. Simpan tanggal, sumber, dan jumlah sampel bersama laporan agar hasil dapat diperiksa ulang.


---
**Pembaruan v2.0:** evaluasi internal 18 akun di atas tetap sirkular. Pengujian yang dapat diperiksa (dataset DEV/uji tertahan, skenario koordinasi, TP/FP/TN/FN, precision/recall/F1) ada di `TEST_REPORT.md` dan `eval/hasil/`.
