# CHANGELOG

## v2.0.0, Cognitive Warfare Intelligence & Early Warning System (12 November 2026)
Basis: `kartika-shield-fixed` v1.1.0 (paket `kartika_shild.zip`). Audit awal: `AUDIT_BASELINE.md`. Bukti uji: `TEST_REPORT.md`.

### Ditambahkan
- **Cognitive Threat Analysis** (`js/00a-kognitif-teks.js`): 8 kategori manipulasi (emosi, ketakutan, clickbait, framing, polarisasi, provokatif, pesan berulang, tidak terverifikasi), 24 indikator berbobot, bukti kutipan, konteks bantahan, tingkat keyakinan, metode, dan keterbatasan pada tiap hasil.
- **Narrative & Influence Mapping** (`js/00b-kognitif-narasi.js`): klaster narasi (prefix filtering), kronologi, koordinasi berlapis (teks/waktu/profil/tagar) dengan penjelasan alternatif, status akun berlapis, graf akun–narasi–tagar, waktu `YYYY-MM-DDTHH:MM`.
- **Cognitive Threat Early Warning** (`js/00c-kognitif-dini.js`): skor komposit 6 komponen dengan gerbang level AWAS/SIAGA/WASPADA/AMAN dan definisi ambang; rekomendasi **defensif**.
- **Cognitive Situation Report**: bagian 2a pada Laporan Komando (HTML, teks, JSON, CSV, cetak).
- Panel peringatan dini kognitif di Peta Dini; kategori kognitif pada Dashboard; ekspor JSON hasil narasi.
- CSP `<meta>`; `vendor/` (d3 7.9.0, topojson-client 3.1.0, lisensi ISC); dataset uji, 6 rangkaian uji otomatis, `tests/run_all.sh`, `eval/SIMULASI_contoh_narasi.csv`.

### Diubah
- Analisis Konten, DISARM, kolektor, dan Buzzer kini memakai **satu mesin penilai** (sebelumnya tiga implementasi menyimpang).
- Skor buzzer lama (teks+waktu) diganti **skor akun berlapis**; label "Indikasi kuat tidak autentik" butuh ≥2 sinyal profil. Indeks koordinasi = nilai tertinggi antar klaster (tidak lagi diencerkan unggahan organik).
- Skor risiko pada Peta Live (`kBuzz`) = skor peringatan dini narasi (sebelumnya `indeks+20`, sering 100).
- Batas impor Buzzer 5000 → 20.000 baris. Kode provinsi pada akhir teks hanya dipotong bila dikenal (huruf besar tak dikenal diberi peringatan).
- DISARM: dipetakan dari indikator mesin; T0049.003 (otomasi) dihapus (korelasi ≠ otomasi); T0143.002 butuh akun baru; T0085.001 dihapus (tidak dapat diamati); teks bantahan bersumber tidak dipetakan.

### Dihapus (dengan alasan)
| Item | Alasan teknis/kebijakan |
|---|---|
| Komponen AI (`claude.use("sample")`, tombol "Ringkasan & respons AI", "Laporan peringatan dini AI") | Keputusan proyek: tanpa AI; hanya berfungsi di lingkungan tertentu; teks pengguna masuk prompt mentah (risiko *prompt injection*) |
| `AUTO IG/AUTOMATION INSTAGRAM` (17 berkas) | Bot komentar/like multi-akun dengan `puppeteer-extra-plugin-stealth`, "Anti-Deteksi", komentar buatan LLM; persis pola *coordinated inauthentic behaviour* yang dideteksi aplikasi; perintah Telegram tanpa daftar-putih. **Tidak dijalankan/diuji.** Tidak terhubung ke dasbor, sehingga penghapusan tidak merusak fitur lain (diverifikasi: seluruh uji fungsional lulus) |
| Ketergantungan CDN d3/topojson | Rantai pasok tanpa SRI; dasbor harus bisa offline (diganti `vendor/`) |
| Penangan klik `#tabs` di `01-inti.js` | Kode mati (elemen `display:none`, ditimpa `05-peta-live.js`) |

### Bug diperbaiki
| ID | Bug | Penyebab | Perbaikan | Bukti |
|---|---|---|---|---|
| B-01 | Jalur AI tertanam | `analyze()`→`sample.json`, 2 tombol AI | Dihapus | S17, F07 |
| B-02 | Bantahan cek fakta dinilai "Menyerang"+T0022 | Tidak ada konteks bantahan | Deteksi konteks bantahan (×0,2/×0,5), arah "Membantah/meluruskan", DISARM ditekan | K01, F06, F31 |
| B-03 | Ujaran kebencian skor 10 | Tidak ada indikator dehumanisasi/kekerasan | Indikator P03 + aturan lantai 65 | K02, F31 |
| B-04 | Leet-speak lolos | Normalisasi hanya di Buzzer | Normalisasi bersama (leet, spasi, huruf berulang) | K03, set uji "ejaan" |
| B-05 | Clickbait tak terdeteksi | Tidak ada kategori | Kategori CLICKBAIT | K04 |
| B-06 | Teks kosong berisiko 10 | Penalti "tanpa sumber" tanpa syarat | Teks kosong=0; "tanpa sumber" bersyarat | C10, K05, K09 |
| B-07 | `runB` O(n²): 5000 baris 3025 ms | Perbandingan semua pasangan | Prefix filtering + batas pemindaian; perbaikan tambahan hotspot graf O(simpul×sisi) | Bagian 7 TEST_REPORT |
| B-09 | Tiga penilai menyimpang | Duplikasi kode | Mesin tunggal, `require` oleh kolektor | S09, F-suite, unit |
| B-10 | Butuh CDN | `<script src=https://…>` | `vendor/` lokal + CSP | F01, S05, S19 |
| B-11 | Hanya jam tanpa tanggal; tengah malam | Selisih menit absolut | Waktu ISO, rotasi sirkular | M09, M10, F12 |
| B-12 | Teks berakhiran `\|xx` terpotong | Regex memotong dua huruf apa pun | Hanya kode dikenal | F13 |
| B-13 | Kode mati `#tabs` | Duplikasi | Dihapus | review kode |
| B-14 | Pemetaan DISARM terlalu agresif | Aturan ganda | Lihat "Diubah" | F31 |
| B-16 | Riwayat tumbuh tanpa batas | Tanpa batas | Dibatasi 2000; validator `bs_h` memeriksa `c` | review kode, F30 |
| N-01 | **Crash** bila akun/kata bernama `__proto__`/`constructor`/`toString` | Kamus `{}` dengan kunci dari data pengguna | `Object.create(null)` | M08, S08 |
| N-02 | Event Feed dengan `viral` tanpa `sources` menjatuhkan hit | Tidak ada validasi | Validasi event klien | F25 |
| N-03 | Waktu ISO dari impor kehilangan tanggal | `parseWaktu(epoch)` dibaca sebagai menit | Epoch ms dikenali | F12 |
| N-04 | 40 akun organik berusia sama bisa menjadi SIAGA | Indikator "usia seragam" aktif untuk akun lama | Hanya bila median <90 hari | E07 |
| N-05 | Catatan transparansi koordinasi hanya muncul saat skor dipotong | | Selalu bila tanpa indikator profil | M11 |
| N-06 | Pencarian kandidat melewatkan pasangan pada data bertemplat (klaster 0) | Kata umum dilewati | Prefix filtering | perf & M-suite |

Catatan: B-08 (kata "asing" → indikasi SARA) dinilai ulang: identitas + ancaman memang dimaksudkan menjadi indikasi SARA; kata identitas sendirian tidak (K07).

### Belum terselesaikan (transparan)
1. **Recall kasus serius rendah** pada set uji tertahan (target `tinggi` ≥45): seruan kekerasan dan disinformasi tanpa kata pemicu skornya rendah.
2. **Ambiguitas leksikal** menimbulkan salah tandai ("ikan bakar", "serbu diskon", "menyembunyikan kejutan"); ujaran kebencian yang **dikutip untuk dikecam** tetap tertandai.
3. Teks berstance berlawanan **tanpa** kata bantahan (mis. menambah "tidak") tetap satu klaster (uji M17); stance tidak diselesaikan.
4. Analisis di *main thread*: 20.000 baris beragam ±7 detik; tanpa Web Worker.
5. `ambil-*.js` masih memakai jam `HH:MM` tanpa tanggal.
6. Kolektor/Feed/bot terhadap jaringan nyata, peramban non-Chromium, dan perangkat seluler **belum diuji**.
7. Ambang koordinasi/peringatan dini heuristik, **belum dikalibrasi** pada data nyata; dataset sintetis dan tidak independen.
8. 14 ID DISARM dan rujukan NATO/Burda pada materi **belum diverifikasi** ke sumber resmi.
9. CSP memakai `'unsafe-inline'` (build satu berkas); Origin `null` diizinkan kolektor (agar `file://` bekerja).

### Catatan metodologi pengujian
Mesin teks dibekukan (hash 00a pada `eval/FREEZE_SHA256.txt`) sebelum set uji tertahan ditulis. Setelah itu `00a` hanya diubah untuk memakai kamus tanpa prototipe (perbaikan N-01); metrik set uji tertahan sebelum/sesudah **identik** (diverifikasi, P/R/F1 tidak berubah), sehingga hash akhir berbeda dari hash pembekuan.

## v1.1.0, sebelum integrasi (paket audit)
Perbaikan audit independen 8–9 November 2026 (lihat `LAPORAN_AUDIT_KARTIKA_SHIELD.md`).
