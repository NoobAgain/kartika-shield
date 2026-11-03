# Evaluasi penilai konten (jujur dan dapat diulang)

## Apa yang diukur
Penilai konten Kartika Shield menggabungkan dua hal:
1. **Aturan pola manipulasi** (huruf kapital berlebihan, desakan menyebar, klaim penyembunyian, ancaman, isu SARA bersama pola lain, tanpa sumber).
2. **Model ringan terlatih** (regresi logistik, unigram dan bigram biner, 2.500 fitur, sekitar 46 KB) yang menghitung kemiripan gaya dengan klaim hoaks terdokumentasi. Model hanya menambah maksimal 40 poin, sehingga tidak bisa sendirian menghasilkan RISIKO SEDANG atau TINGGI.

Penilai ini alat bantu triase. Ia tidak memeriksa fakta dan selalu mengarahkan ke tabayyun.

## Data
IDNHoaxCorpus (Universitas Muhammadiyah Ponorogo, lisensi MIT), tweet berbahasa Indonesia tahun 2020. Dipakai 3.772 baris berlabel (3.042 hoaks, 730 valid). Baris berlabel "?" dibuang.

## Cara menguji
Validasi silang 5 lipatan **dikelompokkan per topik** (kata kunci), jadi klaim yang hampir sama tidak muncul di data latih dan data uji sekaligus. Ini lebih ketat daripada pembagian acak.

| Penilai | AUC | Presisi (ambang 20) | Recall (ambang 20) | Salah tandai (ambang 20) |
|---|---|---|---|---|
| Aturan saja | 0,502 | 84,5% | 6,6% | 5,1% |
| Model saja | 0,779 | 84,5% | 97,1% | 74,1% |
| **Gabungan (yang dipakai)** | **0,730** | 90,2% | 70,1% | 31,9% |

Ambang 20 berarti "perlu diverifikasi ke atas". Pada ambang 45 (risiko sedang ke atas) presisi 94,3%, recall 14,6%, salah tandai 3,7%.

## Keterbatasan (baca sebelum mengutip angka)
- **Aturan saja tidak lebih baik dari tebakan acak pada data ini** (AUC 0,502). Aturan dirancang untuk provokasi, SARA, dan desakan menyebar, sedangkan korpus ini didominasi hoaks kesehatan dan label "valid" berupa tweet bantahan dan cek fakta. Kami tidak punya data berlabel SARA untuk membuktikan aturan itu bekerja pada domain sasarannya.
- Proporsi hoaks di korpus 81%. Presisi di dunia nyata dengan hoaks yang jarang akan lebih rendah. Lihat kolom salah tandai.
- Label korpus berasal dari domain sumber tweet, jadi sebagian label berisik.
- Model belajar topik (susu, ikan, kopi) dan kata penanda bantahan (bantah, hoaks, faktanya). Kemampuan pada topik politik dan SARA belum terbukti.
- Deteksi buzzer divalidasi pada data sintetis dan tiruan, belum pada data media sosial berlabel.

## Mengulang pengujian
1. Buka jendela **Data**, bagian **Uji akurasi penilai konten**.
2. Unggah CSV `teks,label`. Contoh sintetis: `eval/contoh-uji.csv` (24 baris buatan sendiri, bukan pengukuran).
3. Untuk data sungguhan, gunakan data yang **tidak** dipakai melatih model.
