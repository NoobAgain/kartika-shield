# AUDIT BASELINE — Kartika Shield (sebelum integrasi Cognitive Warfare)

Tanggal audit: 12 November 2026 · Objek: `kartika_shild.zip` → `kartika-shield-fixed.zip` (v1.1.0, sudah memuat perbaikan audit independen 8–9 Nov 2026).
Lingkungan: Linux sandbox, Node.js v22.23.4, Chromium (Playwright 1.63), d3 7.9.0 dan topojson-client 3.1.0 dari npm (CDN diblokir sandbox).

**Legenda bukti:** `[UJI]` = saya jalankan sendiri di sesi ini · `[KODE]` = hanya dari membaca kode · `[LAPORAN]` = klaim laporan audit sebelumnya yang **tidak saya ulang** · `[TIDAK DIUJI]`.

## 1. Isi paket yang diterima

| Berkas | Isi | Perlakuan |
|---|---|---|
| `kartika_shild.zip` | `kartika-shield-fixed.zip` (aplikasi pasca-audit), `kartika-shield-audit.patch`, `kartika-shield-audit-tests.zip` (8 skrip uji), `LAPORAN_AUDIT_KARTIKA_SHIELD.md` | `fixed` dipakai sebagai baseline (bukan `main` asli) |
| `tambahan_buat_lomba.zip` | 15 gambar JPEG (tangkapan layar carousel Instagram `@cyber_revolution.id`, "Ruang Pikiran sebagai Domain Medan Perang (Cognitive Warfare)", 15 slide) | Dibaca via OCR + pemeriksaan visual (lihat §8) |

Folder `AUTO IG/AUTOMATION INSTAGRAM/` (17 berkas) ada di paket `fixed`; ditinjau **hanya dengan membaca** (§7).

## 2. Struktur aplikasi `[UJI]`

Bahasa/kerangka: HTML + JavaScript murni (tanpa framework), d3 7.9.0 + topojson-client 3.1.0 (CDN), kolektor Node.js ≥ 22 tanpa dependensi. Total JS aplikasi ≈ 150 KB (kode padat, baris panjang), data statis ≈ 410 KB (peta dunia, 38 provinsi, lambang).

```
index.html                 kerangka + 8 jendela (satu <section> per fitur)
assets/style.css           gaya (header & #tabs di-display:none; navigasi lewat dock)
data/world.js provinces.js logos.js    data statis
js/01-inti.js              utilitas ($, esc), riwayat analisis (localStorage bs_h)
js/02-analisis.js          Analisis Konten: heur(), arahNarasi(), dashboard sesi
js/03-buzzer.js            Deteksi Buzzer: toks/shingle/Jaccard, runB(), parseBV(), validasi internal
js/04-peta-dini.js         Peta Peringatan Dini 38 provinsi (bs_m), skor wilayah, PNG/PDF
js/05-peta-live.js         Peta Dunia Live (canvas), dock jendela, Mode Simulasi
js/06-disarm.js            Pemetaan indikator → DISARM Red Framework
js/07-feed.js              Feed Bluesky/kolektor SSE, tinjauan manual (bs_rev), ekspor CSV
js/08-laporan.js           Laporan Komando (bs_cmd): rSnap/rHtml/cetak/JSON/CSV
js/10-data.js              Pusat Data: cadangan JSON, IndexedDB auto/undo, validasi impor
collector/server.js        HTTP+SSE: Jetstream Bluesky, bot pencarian, RSS, teks kembar
collector/ambil-*.js       pengambil CSV (Bluesky/YouTube/Facebook) via API resmi
tools/build.js             gabung ke dist/kartika-shield.html (satu berkas)
```

Entry point: `index.html` (atau `dist/kartika-shield.html`); `collector/server.js` (opsional).

## 3. Arsitektur data `[KODE]`

- **Penyimpanan peramban:** `localStorage` kunci `bs_h` (riwayat analisis), `bs_m` (laporan peta dini), `bs_rev` (tinjauan feed), `bs_cmd` (laporan komando), `bs_bk` (waktu cadangan). IndexedDB `kartika/kv`: `auto` (salinan otomatis tiap 10 dtk) dan `undo`.
- **Memori sesi (hilang saat muat ulang):** hasil `runB` terakhir (`lastR`), hasil feed (`fAll`), agregat peta live (`kagg`).
- **Tidak ada database server.** Kolektor hanya meneruskan data lewat SSE; akun dipseudonimkan (HMAC-SHA256 bergaram per proses).
- **Format impor Buzzer:** `akun,umur_hari,follower,following,HH:MM,teks|KODE` — **jam tanpa tanggal**.

## 4. Alur kerja `[KODE]` + `[UJI]`

```
teks / CSV / Bluesky / RSS ──► heur() | runB() ──► kEmit() ──► Peta Live (kagg)
                                   │                             │ "Sinkronkan"
                                   ▼                             ▼
                        hist (bs_h) / lastR            Peta Dini (mr, bs_m) ──► rSnap() ──► Laporan Komando
```

Penilaian: aturan regex (skor 0–100) untuk teks; Jaccard bigram ≥ 0,5 + union-find + skor profil akun untuk klaster. **Tidak ada model AI terlatih**, namun jalur panggilan AI opsional masih ada (§6, B-01).

## 5. Status fitur (hasil probe dinamis `[UJI]`, skrip `tests/baseline_probe.py`)

| Fitur | Status | Bukti |
|---|---|---|
| Muat `index.html` | **Berfungsi** | 0 `pageerror`, 0 error konsol |
| Navigasi 7 jendela via dock (Analisis, Buzzer, Feed, Peta Dini, Laporan, Dashboard, Data) | **Berfungsi** | ketujuhnya terbuka |
| Analisis Konten (`heur`) | Berfungsi, **dengan kesalahan penilaian** | tabel §6 |
| Deteksi Buzzer (`runB`, contoh bawaan) | Berfungsi | idx 67, 2 klaster, 8 akun ≥70 |
| Peta Dini, Laporan Komando, Pusat Data, Peta Live | Dimuat tanpa error; fungsi mendalam **belum saya uji ulang** di baseline (diuji pada versi final, lihat `TEST_REPORT.md`) | — |
| Kolektor, Feed Bluesky/RSS, bot pencarian | **Tidak dapat diuji** (jaringan sandbox) kecuali dengan server tiruan | — |
| Mode AI (`claude.use('sample')`) | **Tidak berfungsi di luar lingkungan Claude** (objek `claude` tidak ada; tombol AI tersembunyi) | `typeof claude === "undefined"` |

"Tombol tersedia" tidak dianggap berfungsi: untuk setiap fitur kolom bukti menyebut apa yang dijalankan.

## 6. Bug dan kelemahan yang ditemukan

### 6.1 Terbukti dengan eksekusi `[UJI]`

| ID | Temuan | Bukti baseline |
|---|---|---|
| B-01 | **Komponen AI masih tertanam** (bertentangan dengan keputusan "tanpa AI"): `analyze()` memanggil `sample.json(...)`, tombol "Ringkasan & respons AI" (Buzzer) dan "Laporan peringatan dini AI" (Peta Dini). Teks pengguna disisipkan mentah ke prompt (risiko *prompt injection*, F-20 lama) | `sample` = null di luar Claude; kode jalur AI ada (`02-analisis.js`, `03-buzzer.js`, `04-peta-dini.js`) |
| B-02 | **Bantahan cek fakta salah baca**: teks klarifikasi "…adalah hoaks. Menurut Kemenkes…" → risiko 0 tetapi arah narasi "Menyerang/mendiskreditkan" dan DISARM T0022 + T0075.001 | `heur_cases.bantahan` |
| B-03 | **Ujaran kebencian eksplisit lolos**: "Binatang pendatang itu tidak pantas hidup…" → risiko 10 (RENDAH), sementara DISARM menampilkan T0140.003 — skor dan pemetaan saling bertentangan | `heur_cases.kebencian` |
| B-04 | **Evasi ejaan trivial**: "s3b4rk4n sebelum d1hapus…" → risiko 10 (normalisasi leet hanya ada di modul Buzzer, tidak di `heur`) | `heur_cases.evasi_leet` |
| B-05 | **Clickbait tidak terdeteksi sebagai clickbait**: "Kamu tidak akan percaya… Rahasia yang disembunyikan dokter…" → 30, teknik "Teori konspirasi" (kata *disembunyikan*), tidak ada indikator clickbait/rasa penasaran | `heur_cases.clickbait` |
| B-06 | **Teks kosong bernilai 10** (penalti "tanpa sumber") — tidak ada penanganan data kosong di fungsi (UI menahannya, pemanggil lain tidak) | `heur_cases.kosong` |
| B-07 | **`runB` O(n²)**: 200 baris 83 ms · 1000: 211 ms · 2000: 559 ms · **5000: 3025 ms** (memblokir UI) | `runB_perf` |
| B-08 | Narasi ancaman/ketakutan memicu label SARA hanya karena kata "asing": "…serbuan orang asing…" → `sara: true` (indikasi, bukan bukti; perlu konteks) | `heur_cases.emosional_fear` |

### 6.2 Terbukti dari pembacaan kode `[KODE]`

| ID | Temuan |
|---|---|
| B-09 | **Tiga implementasi penilai yang menyimpang**: `heur()` klien (`02-analisis.js`), `heur()` server (`collector/server.js`, logika SARA berbeda), dan `disarmText()` (aturan sendiri). Memicu inkonsistensi skor vs pemetaan (B-02/B-03). |
| B-10 | **Ketergantungan CDN** untuk d3 dan topojson tanpa SRI; README menyebut berkas tunggal "mandiri" padahal butuh internet. Tanpa CDN, Peta Live dan Peta Dini gagal (pesan "Pustaka peta gagal dimuat"). Skrip pihak ketiga tanpa integritas = risiko rantai pasok. |
| B-11 | **Waktu hanya HH:MM tanpa tanggal**: kronologi multi-hari tidak mungkin; jendela "serempak" tidak membungkus tengah malam (selisih menit absolut). |
| B-12 | Pola `\|xx` di akhir teks dibaca sebagai kode provinsi dan dipotong (mis. teks berakhiran `\|ok`). |
| B-13 | Kode mati: penangan klik `#tabs` di `01-inti.js` ditimpa `05-peta-live.js` dan elemennya `display:none`. |
| B-14 | Pemetaan DISARM: T0049.003 ("Bots Amplify…") dipicu oleh ≥3 akun berteks sama — koordinasi ≠ otomasi; T0143.002 dari pola nama angka saja; T0145 tak pernah aktif (`media:false` konstan). 14 ID belum diverifikasi ke sumber resmi (menurut audit lama). |
| B-15 | "Validasi internal" memakai 18 akun sintetis yang dirancang bersama aturan (sirkular) — angka bukan akurasi lapangan. |
| B-16 | `hist` dan `bs_rev` tumbuh tanpa batas; kegagalan simpan di tab Analisis senyap. |
| B-17 | Tabel kota ganda di `server.js`, `07-feed.js`, dan 3 skrip `ambil-*` (risiko *drift*). |
| B-18 | Tidak ada tes otomatis dan CI pada repositori `fixed` (skrip uji audit ada di paket terpisah dan bergantung pada jalur absolut mesin auditor). |

### 6.3 Dilaporkan audit sebelumnya, **tidak saya ulang di baseline** `[LAPORAN]`

F-01 DOM-XSS kolektor (diperbaiki), F-02 CSRF/Host/Origin kolektor (sebagian), F-03 cadangan beracun (diperbaiki), F-04 data simulasi masuk laporan (diperbaiki), F-11 anonimisasi (diperbaiki), F-12/F-13 ketahanan server (diperbaiki), F-17 checksum cadangan hanya deteksi kerusakan. Semuanya akan **diuji ulang pada versi final** (bagian Security Testing di `TEST_REPORT.md`) alih-alih dipercaya.

## 7. Risiko keamanan dan kepatuhan

| Risiko | Tingkat | Catatan |
|---|---|---|
| **`AUTO IG`: bot komentar/like Instagram multi-akun** (`puppeteer-extra-plugin-stealth`, "Anti-Deteksi" di README, komentar buatan LLM "natural", antrean ke URL target, hingga 7 akun) `[KODE]` | **Kritis (kepatuhan)** | Pola *coordinated inauthentic behaviour* — persis yang dideteksi aplikasi. Ditambah: perintah Telegram tanpa daftar-putih `chat.id`, sesi login plaintext. **Tidak dijalankan dan tidak diuji.** Tidak dimasukkan ke produk final (lihat `CHANGELOG.md`). |
| Skrip d3/topojson dari CDN tanpa SRI | Sedang | B-10 |
| Kolektor tanpa autentikasi bila `HOST=0.0.0.0` | Sedang | Default 127.0.0.1; `Origin: null` tetap diizinkan demi `file://` (diketahui) |
| Teks pengguna ke prompt AI | Sedang | Hilang bersama penghapusan jalur AI (B-01) |
| Kebocoran kredensial | Rendah | Pindai pola kunci (Google/Telegram/Meta/OpenAI/PEM) pada seluruh repo selain data gambar: **nihil** `[UJI]`; token dibaca dari variabel lingkungan |
| Pseudonimisasi ≠ anonimisasi | Rendah | HMAC bergaram; teks isi tetap dapat mengidentifikasi |

## 8. Materi Cognitive Warfare — catatan penerimaan sumber `[UJI]`

15 gambar = **satu carousel Instagram** (bukan dokumen doktrin atau jurnal). Penulis akun bergaya aktivis siber; materi merujuk NATO ACT (act-nato.int) dan Burda (2024, *Cognitive Warfare Problem for the Brain, Opportunity for the Machine*) — **rujukan itu belum saya verifikasi** dan dikutip hanya sebagaimana tertulis pada slide. Kandungan dipakai sebagai **kerangka konsep** (tidak disalin), dipetakan pada `ARCHITECTURE.md` §3:

1. Definisi: perang kognitif = memengaruhi/melindungi/mengganggu kognisi individu & kelompok untuk keuntungan strategis (slide 2, 7).
2. Teknik: disinformasi, manipulasi media sosial (polarisasi, bias kognitif, *ilusi konsensus*), operasi psikologis (pesan menakutkan/membingungkan), *microtargeting*, deepfake, manipulasi algoritma (slide 7, 9).
3. Alat serangan digital dan dampak (slide 14/15): video pendek, **clickbait & headline sensasional**, algoritma (filter bubble/echo chamber), influencer, deepfake/konten AI → dampak jangka pendek (turunnya berpikir kritis, polarisasi, hoaks cepat) dan jangka panjang (*cognitive conditioning*).
4. Rantai pengaruh: konten viral → disukai/dibagikan → algoritma menguatkan → influencer meng-endorse → meme/clickbait pendukung → polarisasi → FOMO → kognisi terkondisi.
5. Ketahanan: literasi digital, pertahanan kognitif lewat pendidikan, kemampuan deteksi dan respons.
6. Profiling biometrik/psikografis (slide 13) dan volume data global (slide 11) = konteks ancaman; **tidak ada data biometrik yang diproses aplikasi** dan tidak akan ditambahkan.

Keterbatasan penting: apa yang dapat diukur aplikasi dari teks/metadata unggahan hanyalah **indikator permukaan** (pola bahasa, pengulangan, kecepatan, kemiripan, waktu). Efek kognitif pada audiens (mis. "kognisi terkondisi") **tidak dapat diukur** oleh sistem ini dan tidak diklaim.

## 9. Kesimpulan baseline

Fondasi **stabil** (tanpa error runtime, build deterministik `[UJI]`, tanpa rahasia). Kelemahan yang harus diperbaiki sebelum integrasi: komponen AI sisa (B-01), tiga penilai yang menyimpang (B-09), kesalahan penilaian (B-02–B-06, B-08), performa klaster (B-07), ketergantungan CDN (B-10), dan data waktu tanpa tanggal (B-11). Folder `AUTO IG` tidak sesuai misi dan dikeluarkan.
