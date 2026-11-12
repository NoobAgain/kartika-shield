# TEST REPORT, Kartika Shield Cognitive Warfare v2.0

Dihasilkan otomatis oleh `tests/buat_laporan.py` dari `eval/hasil/*.json` pada 12-11-2026 04:27. Lingkungan: Linux sandbox, Node v22.23.4, Python 3.12.3, Chromium headless (Playwright). **Hanya Chromium yang diuji** (Firefox/Safari/perangkat seluler nyata: belum diuji).

Semua perintah untuk mereproduksi ada di `tests/run_all.sh`. Pernyataan tentang kondisi dunia nyata **tidak** dibuat: seluruh dataset pada laporan ini **sintetis buatan pengembang**.

## 1. Ringkasan

| Rangkaian | Lulus/Total | Status |
|---|---|---|
| Uji unit mesin kognitif (Node) | 66/66 | PASS |
| Uji fungsional UI, `index.html` | 32/32 | PASS |
| Uji fungsional UI, `dist/kartika-shield.html` | 32/32 | PASS |
| Uji keamanan defensif | 19/19 | PASS |
| Skenario narasi/koordinasi sintetis | 10/10 | PASS |

Uji analitik (precision/recall) **tidak** berstatus lulus/gagal; angkanya dilaporkan apa adanya di bagian 3.

## 2. Build & baseline

- Sintaks seluruh berkas JS valid (`node --check`) dan build deterministik: `node tools/build.js` menghasilkan `dist/kartika-shield.html` tanpa galat; hasil build dimuat tanpa `pageerror`, tanpa permintaan jaringan eksternal (F01).
- Baseline v1.1.0 (probe `tests/baseline_probe.py`, sebelum perubahan): `runB` 200 baris 83 ms · 1000: 211 ms · 5000: **3025 ms**; kasus uji teks menunjukkan bug B-02 s.d. B-06 (lihat AUDIT_BASELINE.md).

## 3. Pengujian analitik

### 3.1 Metodologi (penting dibaca)
- Dataset teks berlabel dibagi dua: **DEV** (33 teks; boleh dipakai menyetel aturan) dan **UJI TERTAHAN** (120 teks; ditulis setelah mesin teks dibekukan, hash di `eval/FREEZE_SHA256.txt`, dijalankan sekali, **tidak** dipakai menyetel aturan).
- Penulis dataset = penulis aturan, sehingga **tidak independen**; teks sintetis tidak mewakili distribusi bahasa media sosial nyata. Angka di bawah adalah indikasi perilaku, **bukan akurasi lapangan**.
- Dua label: `perhatian` (ada teknik manipulasi yang layak ditinjau analis) dievaluasi pada risiko ≥ 20; `tinggi` (serius: ancaman+konspirasi/kebencian/ajakan agresif) pada risiko ≥ 45.

- Hash mesin teks saat evaluasi: `f6ccfcfb0aaf0f52…` (hash pembekuan awal pada FREEZE_SHA256.txt: `c77acdd2cd9e2873…`). **Hash berbeda bila mesin diubah setelah pembekuan** (lihat CHANGELOG bagian Catatan).

### 3.2 Hasil

| Set | Target/ambang | TP | FP | FN | TN | Precision | Recall | F1 |
|---|---|---|---|---|---|---|---|---|
| DEV (33) | perhatian ≥20 | 17 | 1 | 0 | 15 | 0.944 | 1.000 | 0.971 |
| DEV (33) | tinggi ≥45 | 8 | 0 | 3 | 22 | 1.000 | 0.727 | 0.842 |
| UJI TERTAHAN (120) | perhatian ≥20 | 48 | 4 | 9 | 59 | 0.923 | 0.842 | 0.881 |
| UJI TERTAHAN (120) | tinggi ≥45 | 14 | 1 | 16 | 89 | 0.933 | 0.467 | 0.622 |

### 3.3 Rincian per jenis konten, set uji tertahan, target `perhatian` ≥ 20

| Jenis | TP | FP | FN | TN |
|---|---|---|---|---|
| normal | 0 | 1 | 0 | 19 |
| clickbait | 9 | 0 | 3 | 0 |
| emosional | 7 | 0 | 1 | 4 |
| disinformasi | 11 | 0 | 5 | 0 |
| bantahan | 0 | 1 | 0 | 11 |
| duplikat | 5 | 0 | 0 | 1 |
| ejaan | 8 | 0 | 0 | 4 |
| ambigu | 0 | 2 | 0 | 8 |
| provokatif | 8 | 0 | 0 | 2 |
| irrelevan | 0 | 0 | 0 | 10 |

### 3.4 Kesalahan klasifikasi (set uji tertahan), tidak disembunyikan

**Target perhatian ≥ 20**

| Tipe | ID | Jenis | Risiko | Teks (dipotong) |
|---|---|---|---|---|
| FP | U009 | normal | 23 | Resep sambal terasi dari ibu mertua ternyata cocok sekali dengan ikan bakar. |
| FN | U025 | clickbait | 16 | Wajib tahu! Trik hemat listrik yang tidak mau diungkap petugas PLN |
| FN | U031 | clickbait | 18 | Jangan kaget lihat harga rumah di kota ini, geger satu negeri |
| FN | U032 | clickbait | 14 | Rahasia dapur restoran terkenal akhirnya dibongkar mantan koki |
| FN | U037 | emosional | 14 | Miris dan pilu melihat nasib mereka, kasihan sekali, menangis saya membacanya |
| FN | U050 | disinformasi | 11 | Sumber terpercaya bilang bank akan ditutup besok dan tabungan hangus, viralkan segera! |
| FN | U053 | disinformasi | 0 | Vaksin menyebabkan kemandulan massal, buktinya ada di grup dokter kami |
| FN | U054 | disinformasi | 0 | Gempa besar akan terjadi bulan depan menurut peneliti rahasia, tidak diumumkan agar tidak  |
| FN | U055 | disinformasi | 0 | Air garam bisa menyembuhkan semua penyakit jantung, dokter menyembunyikannya dari kita |
| FN | U059 | disinformasi | 18 | Mata uang akan diganti minggu depan dan uang lama tidak berlaku, info dari teman yang kerj |
| FP | U070 | bantahan | 65 | Pernyataan 'pendatang tidak pantas hidup di sini' adalah ujaran kebencian dan kami kecam,  |
| FP | U093 | ambigu | 44 | Bakar semangat juang timnas malam ini, kita serbu lini pertahanan lawan sejak menit awal! |
| FP | U095 | ambigu | 20 | Pemerintah menyembunyikan kejutan ulang tahun untuk Ibu, jangan bilang siapa-siapa ya! |

**Target tinggi ≥ 45**

| Tipe | ID | Jenis | Risiko | Teks (dipotong) |
|---|---|---|---|---|
| FN | U040 | emosional | 29 | Teror mengerikan di kampung kami, warga ketakutan, racun disebar di sumur, bahaya menganca |
| FN | U049 | disinformasi | 42 | Pesan berantai: air isi ulang mengandung racun, teruskan ke teman, pemerintah diam saja me |
| FN | U052 | disinformasi | 35 | Beredar kabar kelompok tertentu merencanakan penyerbuan ke kampung kita, harap waspada dan |
| FN | U056 | disinformasi | 34 | Pemilu kemarin dicurangi besar-besaran, data asli ditutupi lembaga, bangsa kita dikhianati |
| FN | U058 | disinformasi | 36 | Rumah sakit menyuntikkan racun ke pasien tertentu, saksi dibungkam, sebarkan ke semua grup |
| FN | U060 | disinformasi | 31 | Ada skenario besar di balik kenaikan harga BBM, rakyat dibohongi penguasa zalim |
| FP | U070 | bantahan | 65 | Pernyataan 'pendatang tidak pantas hidup di sini' adalah ujaran kebencian dan kami kecam,  |
| FN | U075 | duplikat | 44 | sebarkan! sebarkan! pemerintah menutupi semuanya media tidak berani share ke semua grup se |
| FN | U079 | ejaan | 40 | s3b4rk4n s3g3r4 p3m3rint4h m3nutupi k3b3n4r4n, m3d14 t1d4k b3r4n1!! |
| FN | U080 | ejaan | 38 | S E B A R K A N sebelum dihapus, pemerintah ditutupi semuanya |
| FN | U085 | ejaan | 32 | sebarkan.. sebarkan.. pemerintah menutup nutupi kebenaran, media bungkam |
| FN | U101 | provokatif | 44 | Bangkit dan serbu gedung dewan sekarang juga, jangan diam saja, hajar para pengkhianat! |
| FN | U102 | provokatif | 32 | Geruduk kantor mereka malam ini, bakar semua spanduknya, angkat senjata kalau perlu! |
| FN | U104 | provokatif | 40 | Musuh bersama kita sudah jelas, ganyang mereka, singkirkan semua antek! |
| FN | U105 | provokatif | 28 | Turun ke jalan besok pagi, jangan diam, tunjukkan siapa yang berkuasa! |
| FN | U107 | provokatif | 21 | Basmi cebong dan kampret itu, tidak pantas hidup di negeri ini |
| FN | U108 | provokatif | 28 | Bubarkan acara mereka, sweeping semua warung yang masih buka! |

**Bacaan jujur:** untuk menandai *adanya* indikator manipulasi, hasilnya cukup baik pada data sintetis ini. Untuk menandai kasus *serius* pada ambang 45, **recall rendah**: seruan kekerasan dan disinformasi tanpa kata pemicu leksikal diberi skor rendah, sementara metafora olahraga/kuliner ("serbu", "bakar") dapat salah tandai. Ini keterbatasan pendekatan leksikal dan tidak diperbaiki dengan menyetel terhadap set tertahan (agar angka tetap valid).

### 3.5 Narasi & koordinasi: skenario sintetis berlabel (`tests/eval_narasi.js`)

Kesamaan klaster diukur per pasangan unggahan: TP=200 FP=0 FN=0 · Precision 1 · Recall 1 · F1 1. **Skenario dirancang bersama algoritma (ground truth dibangkitkan), sehingga nilai sempurna bukan bukti performa pada data nyata.**

| Status | Skenario | Pemeriksaan |
|---|---|---|
| PASS | S1 kampanye akun baru serempak | ✓ koordinasi 90 dalam [75,100]; ✓ pasangan klaster tp=28 fp=0 fn=0 |
| PASS | S2 organik berita bersama akun lama | ✓ koordinasi 20 dalam [0,24]; ✓ pasangan klaster tp=28 fp=0 fn=0 |
| PASS | S3 relawan donor darah teks sama serempak | ✓ koordinasi 35 dalam [0,49]; ✓ pasangan klaster tp=6 fp=0 fn=0 |
| PASS | S4 kampanye parafrase urutan kata | ✓ koordinasi 75 dalam [50,100]; ✓ pasangan klaster tp=15 fp=0 fn=0 |
| PASS | S5 satu akun mengulang 10x | ✓ koordinasi 0 dalam [0,24]; ✓ pasangan klaster tp=45 fp=0 fn=0 |
| PASS | S6 5 penguat + 3 bantahan (klaster terpisah) | ✓ klaster 0 koordinasi 90 dalam [50,100]; ✓ klaster 1 koordinasi 0 dalam [0,0]; ✓ klaster 1 bantahan terdeteksi 3 = 3; ✓ pasangan klaster tp=13 fp=0 fn=0 |
| PASS | S7 serempak melewati tengah malam | ✓ koordinasi 90 dalam [75,100]; ✓ rasio serempak 1; ✓ pasangan klaster tp=10 fp=0 fn=0 |
| PASS | S8 teks sama di 5 hari berbeda | ✓ koordinasi 70 dalam [0,74]; ✓ pasangan klaster tp=10 fp=0 fn=0 |
| PASS | S9 50 teks tak berkaitan | ✓ tidak ada klaster (0) |
| PASS | S10 3 kampanye + 100 noise | ✓ pasangan tp=45 fp=0 fn=0 |

## 4. Pengujian unit mesin kognitif

| Status | Uji | Galat |
|---|---|---|
| PASS | N01 leet "s3b4rk4n" -> sebarkan |  |
| PASS | N02 huruf dipisah spasi disatukan |  |
| PASS | N03 huruf berulang diringkas |  |
| PASS | N04 "covid19" tidak dirusak pada versi mentah |  |
| PASS | N05 URL dan @mention dibuang |  |
| PASS | N06 input aneh tidak melempar galat |  |
| PASS | C01 EMOSI terdeteksi |  |
| PASS | C02 KETAKUTAN terdeteksi |  |
| PASS | C03 CLICKBAIT terdeteksi |  |
| PASS | C04 FRAMING terdeteksi |  |
| PASS | C05 POLARISASI terdeteksi |  |
| PASS | C06 PROVOKATIF terdeteksi |  |
| PASS | C07 REPETISI (kata berulang) terdeteksi |  |
| PASS | C08 TIDAK_TERVERIFIKASI terdeteksi |  |
| PASS | C09 teks netral = 0 di semua kategori |  |
| PASS | C10 teks kosong/whitespace -> risiko 0 dan bendera kosong |  |
| PASS | C11 bukti (kutipan) selalu menyertai indikator |  |
| PASS | C12 metode + keterbatasan + keyakinan selalu ada |  |
| PASS | C13 skor kategori <= batas dan total <= 100 |  |
| PASS | C14 deterministik (input sama = hasil sama) |  |
| PASS | C15 ambang verdict: 19=RENDAH 20=VERIFIKASI 45=SEDANG 65=TINGGI |  |
| PASS | K01 [B-02] bantahan bersumber: risiko rendah, arah "Membantah/meluruskan" |  |
| PASS | K02 [B-03] ujaran kebencian eksplisit -> TINGGI (aturan lantai) |  |
| PASS | K03 [B-04] leet-speak terdeteksi |  |
| PASS | K04 [B-05] clickbait terklasifikasi sebagai CLICKBAIT |  |
| PASS | K05 [B-06] teks kosong tidak bernilai 10 |  |
| PASS | K06 ajakan "share" saja (donor darah) tidak jadi SEDANG |  |
| PASS | K07 kata identitas saja BUKAN SARA |  |
| PASS | K08 identitas + ancaman = indikasi SARA |  |
| PASS | K09 tanpa sumber tidak dihitung pada teks netral |  |
| PASS | K10 klaim viral tipikal -> TINGGI |  |
| PASS | R01 teks 200 ribu karakter selesai < 2 dtk |  |
| PASS | R02 pola ReDoS (a a a ..., !!!!, kata panjang) selesai < 2 dtk |  |
| PASS | R03 tipe input non-string tidak melempar |  |
| PASS | R04 kata "__proto__"/"constructor" pada teks tidak merusak |  |
| PASS | M01 parseWaktu: HH:MM, ISO, angka, tidak valid |  |
| PASS | M02 duplikat persis dikelompokkan |  |
| PASS | M03 parafrase urutan kata dikelompokkan |  |
| PASS | M04 teks tak berkaitan tidak dikelompokkan |  |
| PASS | M05 [B-12] teks berakhiran "|ok" tidak dipotong di impor |  |
| PASS | M06 data kosong / bukan array -> hasil kosong tanpa galat |  |
| PASS | M07 baris tanpa field (u/tx/age kosong) tidak melempar |  |
| PASS | M08 [BUG] nama akun __proto__/constructor/toString tidak membuat crash |  |
| PASS | M09 jam melewati tengah malam: serempak terdeteksi |  |
| PASS | M10 tanggal berbeda: tidak serempak |  |
| PASS | M11 PRINSIP: teks+waktu saja (akun lama) tidak lebih dari "sedang" |  |
| PASS | M12 PRINSIP: label "indikasi kuat tidak autentik" butuh >=2 sinyal profil |  |
| PASS | M13 satu akun mengulang: koordinasi 0 |  |
| PASS | M14 bantahan dikecualikan dari penguat |  |
| PASS | M15 graf: simpul/sisi konsisten dan bersumber dari baris data |  |
| PASS | M16 kronologi terurut menaik |  |
| PASS | M17 [KETERBATASAN DIDOKUMENTASI] stance berlawanan tanpa kata bantahan ikut satu klaster |  |
| PASS | M18 deterministik |  |
| PASS | E01 bobot komponen berjumlah 1,0 |  |
| PASS | E02 ambang & definisi level tersedia (4 level, urut menurun) |  |
| PASS | E03 kampanye terkoordinasi -> level >= SIAGA |  |
| PASS | E04 skor = jumlah berbobot komponen (dapat direproduksi) |  |
| PASS | E05 setiap komponen 0..100 dan punya metrik penjelas |  |
| PASS | E06 jejak data: sumberBaris ⊆ id baris masukan |  |
| PASS | E07 GERBANG: volume besar tanpa manipulasi tidak jadi AWAS/SIAGA |  |
| PASS | E08 data kosong -> daftar kosong tanpa galat |  |
| PASS | E09 keyakinan rendah untuk sampel kecil & jam-saja |  |
| PASS | E10 rekomendasi hanya defensif (tanpa kata buzzer tandingan/manipulasi balasan) |  |
| PASS | L01 laporan pada data kosong tidak melempar |  |
| PASS | L02 laporan memuat 8 bagian wajib |  |
| PASS | L03 teks laporan memuat bagian & batasan |  |

## 5. Pengujian fungsional UI (Playwright/Chromium)
Dijalankan pada `index.html` dan `dist/kartika-shield.html`. Kolektor tiruan SSE (`tests/mock_collector.js`, data sintetis) dipakai untuk Feed.

| Uji | index.html | dist |
|---|---|---|
| F01 muat halaman: tanpa pageerror, tanpa permintaan eksternal, CSP aktif | PASS | PASS |
| F02 dock: 7 jendela dapat dibuka, diminimalkan, dan dipulihkan | PASS | PASS |
| F03 Analisis Konten: hasil lengkap (verdict, 8 kategori, bukti, DISARM, metode) | PASS | PASS |
| F04 Analisis Konten: input kosong tidak menghasilkan apa pun | PASS | PASS |
| F05 Analisis Konten: tombol Isi contoh dan Bersihkan | PASS | PASS |
| F06 [B-02] bantahan bersumber: risiko rendah & arah Membantah/meluruskan | PASS | PASS |
| F07 tidak ada komponen AI di UI (tombol/teks/objek) | PASS | PASS |
| F08 Dashboard: statistik & kategori dari riwayat; Reset | PASS | PASS |
| F09 Buzzer: contoh -> tabel narasi, peringatan dini, kronologi, graf, akun | PASS | PASS |
| F10 keterlacakan: simpul/sisi graf di layar = keluaran mesin | PASS | PASS |
| F11 Buzzer: validasi CSV (ditolak/duplikat) + Pakai data bersih + unduh baris ditolak | PASS | PASS |
| F12 Buzzer: waktu ISO (YYYY-MM-DDTHH:MM) dikenali -> mode tanggal & jam | PASS | PASS |
| F13 [B-12] impor: teks berakhiran |ok tidak dipotong; |XX tak dikenal diberi peringatan | PASS | PASS |
| F14 Buzzer: impor berkas CSV via input file | PASS | PASS |
| F15 Buzzer: kurang dari 3 baris valid -> pesan, tanpa galat | PASS | PASS |
| F16 Buzzer: Validasi model menampilkan TP/FP/FN/TN/Precision/Recall/F1 | PASS | PASS |
| F17 Buzzer: ekspor hasil JSON + salin ringkasan + laporan situasi kognitif | PASS | PASS |
| F18 Kirim ke Peta Dini -> catatan wilayah + panel peringatan dini kognitif | PASS | PASS |
| F19 Peta Dini: tambah laporan manual, contoh, pakai skor terakhir, reset | PASS | PASS |
| F20 Peta Dini: ekspor PNG (unduhan) dan Cetak/PDF (jendela) | PASS | PASS |
| F21 Laporan Komando: bagian Situasi Kognitif (narasi, indikator, kronologi, wilayah, bukti, keyakinan, rekomendasi) | PASS | PASS |
| F22 Laporan Komando: simpan -> riwayat -> muat -> hapus | PASS | PASS |
| F23 Laporan Komando: unduh JSON (ada kognitif), CSV (baris narasi_kognitif), teks, cetak | PASS | PASS |
| F24 Pusat Data: cadangan JSON -> hapus semua -> pulihkan; impor rusak ditolak | PASS | PASS |
| F25 Feed: kolektor tiruan -> hit dirender, XSS tidak dieksekusi, unduh CSV aman rumus | PASS | PASS |
| F26 Feed: kolektor tak terjangkau -> pesan galat, tanpa pageerror | PASS | PASS |
| F27 Peta Live: Mode Simulasi berlabel SIMULASI/DATA SINTETIS; analisis menambah sinyal langsung | PASS | PASS |
| F28 responsif 390x844: tanpa overflow horizontal & dock terlihat | PASS | PASS |
| F29 persistensi: riwayat bertahan setelah muat ulang | PASS | PASS |
| F30 localStorage berisi data beracun/rusak: aplikasi tetap termuat | PASS | PASS |
| F31 [B-14] DISARM: otomasi tidak disimpulkan (tanpa T0049.003), T0143.002 butuh akun baru, bantahan bersumber tidak dipetakan | PASS | PASS |
| F32 akun lama dengan teks+waktu sama (relawan) TIDAK berlabel "Indikasi kuat tidak autentik"; kampanye akun baru berlabel | PASS | PASS |

## 6. Pengujian keamanan (defensif, lokal)

| Status | Uji | Galat |
|---|---|---|
| PASS | S01 XSS: teks Analisis Konten (6 payload) tidak dieksekusi dan di-escape |  |
| PASS | S02 XSS: CSV Buzzer (akun, teks, tagar, kode) -> hasil, graf, tabel, laporan |  |
| PASS | S03 XSS: Peta Dini manual + Laporan Komando (judul, PIC, catatan) + jendela cetak |  |
| PASS | S04 XSS: pemulihan cadangan berisi payload & kunci prototipe -> tidak dieksekusi, tidak mencemari Object.prototype |  |
| PASS | S05 CSP: koneksi keluar ke domain eksternal diblokir; tidak ada permintaan jaringan selama alur penuh |  |
| PASS | S06 injeksi rumus CSV: sel berawalan = + - @ dinetralkan di semua ekspor CSV |  |
| PASS | S07 DoS: CSV 30.000 baris dipotong ke batas dan selesai < 25 dtk; baris 100 KB dipotong |  |
| PASS | S08 kunci berbahaya (__proto__/constructor) sebagai akun/teks tidak merusak UI |  |
| PASS | S09 kolektor: /stats 200 JSON; /events text/event-stream |  |
| PASS | S10 kolektor: Host asing ditolak (anti DNS rebinding) |  |
| PASS | S11 kolektor: POST dari Origin asing / tanpa JSON ditolak (anti CSRF); Origin asing tidak mendapat header CORS |  |
| PASS | S12 kolektor: path traversal & path tak dikenal -> 404 (tidak ada berkas statis) |  |
| PASS | S13 kolektor: body > 64 KB -> 413; JSON rusak -> 400; metode PUT/DELETE tidak mengubah status |  |
| PASS | S14 kolektor: batas klien SSE (MAX_CLIENTS=3) -> klien ke-4 ditolak 503 |  |
| PASS | S15 kolektor: konfigurasi bot tervalidasi (interval dibatasi 1..120, kata kunci dibatasi) |  |
| PASS | S16 pemindaian rahasia: tidak ada kunci/token/PEM tertanam pada kode & data (selain gambar base64) |  |
| PASS | S17 tanpa komponen AI: tak ada pustaka/endpoint/objek AI pada kode aplikasi (js, collector, index.html) |  |
| PASS | S18 tanpa otomasi interaksi media sosial / anti-deteksi: tak ada puppeteer/stealth/login/komentar-otomatis pada paket |  |
| PASS | S19 kolektor tidak memakai dependensi pihak ketiga (package.json bersih) dan pustaka klien memakai berkas lokal (vendor/) |  |

## 7. Pengujian performa
Mesin: lihat bagian lingkungan. Satu pengukuran per titik; hasil bervariasi antarmesin. UI tidak memakai Web Worker sehingga analisis besar memblokir tab selama prosesnya.

| Dataset | Baris | Waktu (ms) | Klaster | Δ heap (MB) |
|---|---|---|---|---|
| realistis | 200 | 93 | 16 | 2 |
| realistis | 1000 | 277 | 83 | 6 |
| realistis | 5000 | 1667 | 416 | 21 |
| realistis | 20000 | 8465 | 1666 | 84 |
| templat-patologis | 200 | 68 | 1 | 7 |
| templat-patologis | 1000 | 107 | 1 | 9 |
| templat-patologis | 5000 | 235 | 1 | 23 |
| templat-patologis | 20000 | 832 | 1 | 78 |

Cognitive Threat Analysis: 20000 teks dalam 647 ms (~30896 teks/detik).

"realistis" = banyak topik berbeda dengan kata langka; "templat-patologis" = seluruh unggahan memakai kerangka kalimat yang sama (kasus terburuk untuk pencarian kandidat). Pembanding baseline v1.1.0: 5000 baris = 3025 ms pada data yang jauh lebih mudah.

## 8. Yang belum atau tidak dapat diuji
- Kolektor terhadap jaringan nyata (Bluesky Jetstream, RSS, bot pencarian, `ambil-*.js` dengan API resmi): sandbox tidak memiliki akses; hanya proteksi HTTP kolektor dan klien dengan kolektor tiruan yang diuji. **Belum diuji.**
- Peta Dunia Live/Peta Dini: ekspor PNG/PDF diuji sebatas unduhan/jendela terbuka; ketepatan visual geografis diperiksa secara manual pada tangkapan layar, bukan otomatis.
- Peramban selain Chromium, perangkat seluler nyata, pembaca layar/aksesibilitas: belum diuji.
- Uji beban jangka panjang (SSE berjam-jam), kebocoran memori di peramban: belum diuji.
- Validitas rujukan DISARM (ID teknik) terhadap sumber resmi terkini dan klaim NATO/Burda pada materi: tidak dapat diverifikasi offline.
