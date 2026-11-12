# LAPORAN AUDIT INDEPENDEN — KARTIKA SHIELD v1.1.0

Tanggal audit: 8–9 November 2026 · Objek: `kartika-shield-main.zip` (59 berkas, 1,6 MB terekstrak)
Lingkungan uji: Linux sandbox, Node.js v22.23.4, Chromium (Playwright), Python 3.12. CDN diblokir sandbox, sehingga d3 7.9.0 dan topojson-client 3.1.0 (versi yang sama dengan `index.html`) disajikan dari npm lewat route lokal. Kode repository tidak diubah untuk pengujian; semua uji dapat diulang dengan skrip pada `kartika-shield-audit-tests.zip`.

**Legenda status bukti:** `[UJI]` terbukti dengan eksekusi · `[KODE]` hanya dari pembacaan kode · `[TIDAK DIUJI]` tidak dapat/tidak dilakukan.

---

## BAB I — IDENTIFIKASI ALAT

**Tujuan.** Dasbor anti-disinformasi (Cognitive Domain) berbasis nilai Bhinneka Tunggal Ika: menilai pola bahasa konten, mendeteksi klaster buzzer terkoordinasi, memetakan peringatan dini per provinsi, memetakan indikator ke DISARM Red Framework, dan menyusun Laporan Komando.

**Komponen (hasil membaca kode, bukan README):**

| Komponen | Isi | Teknologi |
|---|---|---|
| Front-end (`index.html`, `js/01–10`, `dist/`) | 8 jendela: Analisis, Buzzer, Feed, Peta Dini, Laporan, Dashboard, Data, Peta Dunia Live | HTML/JS murni, d3 7.9.0, topojson-client 3.1.0 (CDN), tanpa build selain `tools/build.js` |
| Kolektor (`collector/server.js`) | Server HTTP+SSE: Jetstream Bluesky, bot pencarian Bluesky, RSS, deteksi teks kembar | Node ≥22, tanpa dependensi |
| Pengambil data (`ambil-buzzer/youtube/facebook.js`) | Menulis CSV untuk tab Buzzer | Node ≥22, API resmi |
| `AUTO IG/AUTOMATION INSTAGRAM/` | Bot komentar+like Instagram multi-akun via Telegram, Puppeteer Stealth | Node ESM, puppeteer, node-telegram-bot-api |

**Alur kerja.** Teks/CSV/aliran data → `heur()` (aturan regex, skor 0–100) atau `runB()` (Jaccard bigram ≥0,5 + union-find + skor akun) → `kEmit()` ke peta live → agregat ke Peta Dini (`mr`, localStorage) → `rSnap()` menyusun Laporan Komando. Penyimpanan: localStorage + IndexedDB. Tidak ada model terlatih; semua penilaian berbasis aturan (sesuai `docs/EVALUASI.md`).

**Temuan struktural penting:** folder `AUTO IG` **bukan bagian dari dasbor** dan berfungsi sebagai alat amplifikasi akun (lihat F-05).

---

## BAB II — METODOLOGI

1. **Source code review** manual seluruh `js/`, `collector/`, `tools/`, dokumen, dan entry point `AUTO IG`.
2. **Eksekusi dinamis:** 8 skrip uji (Playwright + Node) terhadap `index.html`, `dist/`, dan server kolektor dengan server Jetstream/Bluesky/RSS tiruan lokal.
3. **Functional/negative/boundary/edge testing:** 16 kasus teks, 12 kasus CSV, skenario evasi, lintas tengah malam, impor cadangan beracun.
4. **Security testing:** XSS (payload dari pengguna, CSV, cadangan, kolektor hostile), CSRF/CORS/Host header, DoS (RSS hostile, 5000 baris), anonimisasi, integritas data.
5. **Performance:** waktu `runB` pada 500–5000 baris, kasus terburuk.
6. **Riset referensi:** sumber utama dibuka dan dicocokkan (Bab VI).
7. Pemetaan temuan ke CWE dan OWASP Top 10:2025. CVSS formal tidak dihitung; tingkat risiko adalah penilaian kualitatif auditor.

**Yang sengaja tidak dilakukan:** bot Instagram **tidak dijalankan, tidak diuji, dan tidak diperbaiki** (alasan di F-05).

---

## BAB III — HASIL PEMERIKSAAN

**Eksekusi.** `index.html` dan `dist/kartika-shield.html` termuat tanpa error konsol/pageerror `[UJI]`. `dist/` identik byte-per-byte dengan hasil `node tools/build.js` `[UJI]`. Server kolektor binding default 127.0.0.1 (tidak terjangkau dari IP non-loopback), `HOST=0.0.0.0` membukanya tanpa autentikasi `[UJI]`. Pemindaian rahasia (kunci API, token Telegram/Meta/Google) pada seluruh repo: nihil `[UJI]`. Ekspor PNG peta dini (2000×1732), JSON laporan, cetak, CSV feed (injeksi rumus dinetralkan), validasi CSV Buzzer (12 kasus), validasi cadangan checksum: berfungsi `[UJI]`. Tampilan ponsel 390 px tanpa overflow horizontal `[UJI]`.

**Kemampuan deteksi (hasil uji):**

| Kasus | Hasil | Penilaian |
|---|---|---|
| Contoh bawaan viral | RISIKO TINGGI 95 | Benar |
| Ajakan donor darah di masjid (“segera share!!”) | **RISIKO TINGGI 65 + SARA** | **False positive** (F-06) |
| Bantahan cek fakta (mengutip klaim hoaks) | PERLU DIVERIFIKASI 40, arah “Menyerang”, DISARM T0022 | Salah baca (F-10) |
| Ujaran kebencian eksplisit tanpa kata kunci pola | RISIKO RENDAH 10 (DISARM T0140.003 muncul, skor tidak) | **False negative** (F-09) |
| “S e b a r k a n …”, “s3barkan …” | 10 | Evasi trivial (F-08) |
| “Sampai … berita … teks” | DISARM T0085.001 “teks AI” | **False positive** substring “ai” (F-06) |
| “Umat Islam dan umat Kristen bergotong royong”; “Turis asing lomba dayung” | DISARM T0083 “eksploitasi kerentanan audiens” | **False positive** (F-06) |
| 6 akun baru, teks identik + 20 akun organik | Akun 100 (“bot”), tetapi vonis **“Dominan organik” 23/100** | Kontradiksi (F-07) |
| 6 akun lama (≥800 hari), teks identik, serempak | idx 18, tak ada akun “bot” | Sesuai desain, tapi vonis menyesatkan (F-07) |
| 6 akun baru, kalimat diparafrase ringan | **cls=0, idx 5** | Evasi klaster (F-08) |

**Performa.** `runB`: 500 baris 79 ms · 1000: 143 ms · 2000: 494 ms · 5000: 3426 ms (O(n²), memblokir UI) `[UJI]`. Server: tidak ada kebocoran yang teramati pada uji singkat; uji ketahanan jangka panjang `[TIDAK DIUJI]`.

**Validasi internal bawaan** (18 akun sintetis): ambang 70 → P 100%/R 67%; ambang 40 → P 69%/R 100% `[UJI]` (cocok dengan tabel di aplikasi). Data uji dan aturan dirancang bersamaan oleh pengembang sehingga angka ini bukan ukuran akurasi lapangan (F-25).

**Tidak dapat diuji:** koneksi Bluesky/Jetstream/RSS/YouTube/Facebook nyata (jaringan sandbox), mode AI `claude.use('sample')` (tidak ada di luar lingkungan Claude), browser selain Chromium, perangkat ponsel nyata, kuota localStorage nyata (uji saya tidak diskriminatif; hanya `[KODE]`), konsumsi CPU animasi peta dalam jangka panjang.

---

## BAB IV — TEMUAN DAN ANALISIS (BUG & VULNERABILITY LIST)

Prioritas: **K**ritis · **T**inggi · **S**edang · **R**endah · **I**nfo. Status perbaikan: ✔ diperbaiki+diuji ulang · ◐ diperbaiki, sebagian diuji · ✘ tidak diperbaiki.

### K / T
**F-05 [K] Bot komentar/like Instagram multi-akun dalam repo anti-disinformasi** `[KODE]` ✘ (sengaja)
Lokasi: `AUTO IG/AUTOMATION INSTAGRAM/` (`bot.js`, `services/gemini.js`, `login.js`, README). Kode menjalankan hingga 7 akun, memakai Puppeteer Stealth “anti-deteksi”, menyarankan proxy residensial, membuat komentar “gaul, natural seperti anak muda” via LLM, dan menjadwalkan antrean ke URL postingan target. README sendiri mengakui pelanggaran ketentuan layanan Instagram. Ini adalah pola *coordinated inauthentic behavior* — tepatnya yang dideteksi dasbor Anda (DISARM T0049.003, T0143.002, T0150.x), dan README dasbor menyatakan peniruan login pribadi melanggar ketentuan layanan.
Dampak: kontradiksi dengan klaim proyek; risiko ketentuan layanan/hukum (konsultasikan ke pembimbing/bagian hukum; saya bukan penasihat hukum); risiko reputasi bila dilihat juri/institusi; bila repo dipublikasikan, alat itu ikut tersebar.
Temuan keamanan terkait `[KODE]`: perintah Telegram tanpa daftar-putih `chat.id` — siapa pun yang menemukan bot dapat memerintah akun Anda (CWE-306, A01:2025); cookies sesi plaintext di `profiles/` (dikecualikan `.gitignore` bersarang, tetapi tidak oleh `.gitignore` akar).
Rekomendasi: **pisahkan dari repo ini** (repo privat terpisah atau hapus) sebelum dipublikasikan atau dipresentasikan. Saya tidak menjalankan, memperbaiki, atau meningkatkan fitur penyamarannya.

**F-04 [T] Data simulasi masuk Peta Dini dan Laporan Komando tanpa penanda** `[UJI]` ✔
Lokasi: `js/05-peta-live.js` (`kSpawn` mengisi `kagg`; tombol `#ksy`). Bukti: setelah Mode Simulasi 5 detik dan “Sinkronkan”, `mr` bertambah 6 record, tersimpan di `bs_m`, dan laporan memuat Bengkulu “Awas 97”, tanpa kata “simulasi”. Dampak: laporan komando dapat memuat peristiwa fiktif sebagai situasi nyata (integritas data). Perbaikan: sinkron diblokir saat simulasi, `kagg` tidak diisi oleh simulasi. Uji ulang: `mr`=0, pesan penolakan tampil.

**F-06 [T] False positive SARA dan pemetaan DISARM berbasis substring** `[UJI]` ✔ (sebagian)
Lokasi: `js/02-analisis.js:heur`, `js/06-disarm.js:disarmText`, `collector/server.js:heur`. Penyebab: SARA aktif bila kata sensitif (masjid, gereja…) muncul bersama pola apa pun, termasuk sekadar tanda seru/“share”; regex `(ai|…)` dan `(…asing|umat…)` tanpa batas kata. Dampak: konten benign diberi label SARA/“eksploitasi kerentanan” — berbahaya untuk alat yang dipakai sebagai dasar tindakan. Perbaikan: SARA butuh pola konspirasi/ancaman; T0083 butuh kata identitas **bersama** pola manipulasi; `\b` pada `ai`. Uji ulang: donor darah turun dari TINGGI 65/SARA → SEDANG 45/non-SARA; “sampai…teks”, “umat…gotong royong”, “turis asing” tidak lagi memicu DISARM. **Sisa:** donor darah tetap SEDANG (huruf kapital/!! + “share” + tanpa sumber).

**F-07 [T] Indeks koordinasi terdilusi: vonis “Dominan organik” meski klaster bot jelas** `[UJI]` ✔
Lokasi: `js/03-buzzer.js:runB` (`idx`) dan `showB`. `idx` = proporsi data, bukan kekuatan klaster. Bukti: 6 akun bot (skor 100) di antara 20 akun organik → idx 23 → “Dominan organik”. Dalam pemakaian nyata (pencarian kata kunci) mayoritas data organik sehingga operasi nyata akan hampir selalu lolos. Perbaikan: vonis naik ke “Indikasi sedang (klaster terkoordinasi terdeteksi)” bila ≥3 akun bot atau klaster ≥5 akun. Indeks numerik sengaja tidak diubah. Uji ulang: label berubah, indeks tetap 23.

### S
**F-01 [S] DOM-XSS dari payload kolektor (CWE-79, A05:2025 Injection)** `[UJI]` ✔
Lokasi: `js/07-feed.js:fAdd` dan listener `stat`. Bidang `coordinated`, `viral.n`, `viral.windowMin`, `meta.newAccounts/sampled/medianAgeDays`, `stat.viral` masuk `innerHTML` tanpa `esc()`. Bukti: kolektor tiruan mengirim `<img onerror>` → `window.__xss = 4`. Prasyarat: pengguna menyambung ke kolektor yang dikendalikan penyerang (URL diketik manual) atau ada proses jahat di port yang sama. Dampak: eksekusi skrip di origin aplikasi → baca localStorage/IndexedDB (riwayat, teks tinjauan, laporan komando). Kolom teks (`src`, `text`) sudah benar ter-escape. Perbaikan: paksa angka (`+x||0`). Uji ulang: `__xss` tidak terdefinisi.

**F-02 [S] Kolektor: CSRF + tanpa validasi Host + Origin `null` dipantulkan (CWE-352, CWE-346, A01/A02:2025)** `[UJI]` ✔ (sebagian)
Lokasi: `collector/server.js` handler `/bot/config`, `/bot/search`. Bukti: POST `text/plain` dari `Origin: http://evil.example` → 200, kata kunci bot berubah; `/bot/search` → 202 dan memicu permintaan keluar; `Host: attacker.example` dilayani (DNS rebinding); `Origin: null` mendapat `ACAO: null`. Dampak: situs web mana pun yang dibuka di mesin Anda dapat mengubah/menjalankan bot (set interval 1 menit → lalu lintas keluar tak terkendali). Perbaikan: tolak POST bila Origin ada tetapi tidak diizinkan atau Content-Type bukan JSON; daftar-putih Host (`ALLOW_HOST` untuk `HOST=0.0.0.0`). Uji ulang: 403 untuk Origin asing/`text/plain`/Host palsu; permintaan sah dari dasbor tetap 200/202. **Sisa:** `Origin: null` tetap diizinkan (diperlukan agar dasbor dari `file://` bekerja); halaman dalam iframe sandbox masih dapat membaca `/events`. Mitigasi lanjutan: token per-proses.

**F-03 [S] Cadangan JSON beracun merusak Dashboard secara persisten (CWE-20)** `[UJI]` ✔
`js/10-data.js:XV.bs_h` hanya memeriksa `v,r,d`; `t:'abc'` lolos, lalu `dash()` melempar `forEach is not a function` setiap dibuka (tersimpan di localStorage). Tidak ada XSS dari bidang lain (semua ter-escape). Perbaikan: validasi `t/a/dir/i`, `dash()` tahan tipe, batas `v≤1e7` pada `bs_m`. Uji ulang: lolos.

**F-07b [S] Hanya dua kelemahan desain yang tidak diperbaiki** ✘
- **F-08 Evasi trivial** `[UJI]`: spasi/leet menurunkan skor ke 10; parafrase ringan (urutan kata) membuat klaster tidak terbentuk (cls=0) → hanya skor profil 60. Konsisten dengan keterbatasan yang sudah ditulis di `EVALUASI.md`, tetapi vonis tidak memberi peringatan.
- **F-09 False negative ujaran kebencian** `[UJI]`: “binatang… pendatang tidak pantas hidup” → 10; DISARM T0140.003 muncul, skor tidak mencerminkan. Inkonsistensi skor vs DISARM.
- **F-10 Bantahan cek fakta dibaca sebagai konspirasi** `[UJI]` (40, T0022, arah “Menyerang”).
- **F-11 Anonimisasi bukan anonimisasi (CWE-759)** `[UJI]` ✔: `sha256(DID).slice(0,8)` tanpa garam; DID bersifat publik sehingga siapa pun dapat mencocokkan (terbukti: hash yang dihitung pihak luar = `akun_hash`). Perbaikan: HMAC-SHA256 dengan garam acak per proses (`ANON_SALT` opsional) pada `server.js`; hasil uji: tidak lagi cocok. Tiga skrip `ambil-*.js` diperbaiki serupa tetapi **hanya cek sintaks** (butuh kredensial) ◐.

### R / I
| ID | Temuan | Bukti | Status |
|---|---|---|---|
| F-12 | Server crash (exit 1) bila `JETSTREAM` tidak valid (CWE-248, A10:2025) | `[UJI]` | ✔ |
| F-13 | Feed RSS hostile 644 KB memblokir event loop ≥3 s (regex lazy kuadratik, tanpa batas ukuran) (CWE-1333) | `[UJI]` | ✔ (5 ms setelah perbaikan) |
| F-14 | `MIN_RISK=0` diganti 45 (`+x \|\| 45`) | `[KODE]` | ◐ diperbaiki, perilaku belum diuji |
| F-15 | CSV Laporan memiliki BOM ganda (`efbbbf efbbbf`) → header kolom pertama bermuatan karakter tak terlihat | `[UJI]` | ✔ |
| F-16 | Peta Dini: volume tanpa batas atas (1e9 mendominasi seluruh skor) | `[UJI]` | ✔ (≤1e7) |
| F-17 | Checksum cadangan opsional dan FNV-1a 32-bit: bisa dilewati dengan menghapus `sha` | `[UJI]` | ✘ (hanya deteksi kerusakan, bukan keaslian; perbaiki teks README) |
| F-18 | `runB` O(n²): 3,4 s pada 5000 baris memblokir UI | `[UJI]` | ✘ |
| F-19 | Jendela “serempak” memakai menit-dalam-sehari tanpa wrap 00:00 | `[KODE]`; dampak pada uji tidak terlihat karena rantai tetangga | ✘ |
| F-20 | Teks pengguna disisipkan mentah ke prompt AI (`"""${t}"""`): prompt injection mengubah verdict/ringkasan (keluaran sudah di-`esc`) | `[KODE]`, mode AI tak dapat diuji | ✘ |
| F-21 | Teks berakhiran `\|xx` (2 huruf) kehilangan akhiran (dibaca sebagai kode provinsi) | `[UJI]` | ✘ |
| F-22 | Tabel kota 3× duplikat (`server.js`, `07-feed.js`, 3 skrip), `heur()` ganda klien/server → risiko drift | `[KODE]` | ✘ |
| F-23 | Tidak ada tes otomatis/CI; `package.json` AUTO IG memuat `puppeteer` dan `puppeteer-core` sekaligus | `[KODE]` | ✘ (skrip uji audit dapat dijadikan dasar) |
| F-24 | Pemetaan DISARM: (a) T0049.003 “bot” dipicu oleh ≥3 akun berteks sama, padahal koordinasi ≠ otomasi; (b) T0143.002 “Fabricated Persona” dipicu pola nama angka; (c) 14 ID belum terverifikasi (Bab VI); (d) T0145 mati (`media:false` selalu) | `[KODE]` + referensi | ✘ |
| F-25 | “Validasi model” memakai 18 akun sintetis yang dirancang bersama aturan (sirkular); label UI “Validasi model” vs README “Uji akurasi” | `[UJI]`+`[KODE]` | ✘ |
| F-26 | `hist` dan `bs_rev` tumbuh tanpa batas; kegagalan simpan localStorage senyap di tab Analisis (peringatan hanya di Pusat Data) | `[KODE]` | ✘ |

**Hal yang berfungsi baik (dengan bukti):** escaping `esc()` pada semua bidang teks dari pengguna, CSV, cadangan, dan kolektor (XSS payload gagal di 3 jalur) `[UJI]`; validasi CSV Buzzer ketat dan informatif `[UJI]`; netralisasi injeksi rumus CSV `[UJI]`; token/kunci API tidak pernah dicetak dan dikirim via header (skrip Facebook/YouTube) `[KODE]`; batas klien SSE (503) `[UJI]`; ketahanan terhadap body besar dan JSON rusak `[UJI]`; label “bukan putusan benar/salah” konsisten di UI.

---

## BAB V — PERBAIKAN DAN VALIDASI

**Berkas berubah (12):** `collector/server.js`, `collector/ambil-buzzer.js`, `ambil-youtube.js`, `ambil-facebook.js`, `js/02-analisis.js`, `03-buzzer.js`, `04-peta-dini.js`, `05-peta-live.js`, `06-disarm.js`, `07-feed.js`, `08-laporan.js`, `10-data.js`; `dist/` dibangun ulang. Patch: `kartika-shield-audit.patch` (285 baris). Fitur tidak ada yang dihapus; arsitektur tidak diubah. Folder `AUTO IG` tidak disentuh.

| No | Fitur/Test | Kondisi Awal | Perbaikan | Hasil Akhir | Status |
|---|---|---|---|---|---|
| 1 | XSS payload kolektor (F-01) | `__xss=4` | `+x\|\|0` | `__xss` tak terdefinisi, 0 elemen injeksi | PASS |
| 2 | CSRF `text/plain` + Origin asing (F-02) | 200, konfigurasi berubah | cek Origin+Content-Type | 403; konfigurasi tetap | PASS |
| 3 | Host palsu / rebinding (F-02) | 200 | daftar-putih Host | 403 | PASS |
| 4 | Origin `null` (F-02) | ACAO `null` | — | tetap diizinkan (dibutuhkan `file://`) | PARTIAL |
| 5 | Cadangan beracun (F-03) | Dashboard error persisten | validasi + `Array.isArray` | record dibuang; Dashboard normal | PASS |
| 6 | Simulasi → Peta Dini (F-04) | 6 record palsu masuk laporan | blokir sinkron | `mr`=0, pesan tampil | PASS |
| 7 | SARA pada donor darah (F-06) | TINGGI 65 + SARA | SARA butuh pola kuat | SEDANG 45, non-SARA | PARTIAL |
| 8 | DISARM substring `ai`/`umat`/`asing` (F-06) | T0085.001/T0083 salah | batas kata + syarat | tidak muncul | PASS |
| 9 | Vonis indeks terdilusi (F-07) | “Dominan organik” | override klaster | “Indikasi sedang…” | PASS |
| 10 | Anonimisasi `server.js` (F-11) | hash dapat direproduksi | HMAC+garam | tidak cocok | PASS |
| 11 | Anonimisasi `ambil-*.js` (F-11) | sama | HMAC+garam | cek sintaks saja | NOT TESTED |
| 12 | `JETSTREAM` tidak valid (F-12) | crash exit 1 | try/catch+retry | proses hidup | PASS |
| 13 | RSS hostile (F-13) | blokir ≥3000 ms | batas 2 MB + pemindai linear | 5 ms | PASS |
| 14 | `MIN_RISK=0` (F-14) | diganti 45 | parse eksplisit | belum diuji perilaku | NOT TESTED |
| 15 | BOM ganda (F-15) | 2 BOM | hapus duplikat | 1 BOM | PASS |
| 16 | Volume peta 1e9 (F-16) | diterima | batas 1e7 | ditolak | PASS (kode; UI tidak diuji ulang) |
| 17 | Body 70 KB / JSON rusak | ECONNRESET / 400 | respons 413 | 413 / 400, server hidup | PASS |
| 18 | Regresi fungsi sah | — | — | POST JSON sah 200/202; koordinasi (3 dan 4 akun) terdeteksi; muat `index.html`/`dist` tanpa error | PASS |

**Belum diperbaiki:** F-05 (keputusan Anda), F-08–F-10, F-17–F-26. **Kondisi:** perbaikan hanya diuji pada Chromium dan server tiruan; tidak ada pengujian regresi pada data/jaringan nyata.

---

## BAB VI — REFERENSI TERVERIFIKASI DAN PENGEMBANGAN

Verifikasi dilakukan dengan membuka sumber/halaman metadata (tanggal akses 8–9 Nov 2026). Hanya yang tercantum di sini yang terverifikasi.

### A. Referensi utama (paling relevan)
1. Pacheco, D., Hui, P.-M., Torres-Lugo, C., Truong, B. T., Flammini, A., Menczer, F. (2021). *Uncovering Coordinated Networks on Social Media: Methods and Case Studies.* Proc. ICWSM 2021, hlm. 455–466. arXiv:2001.05658 (DOI arXiv: 10.48550/arXiv.2001.05658). https://ojs.aaai.org/index.php/ICWSM/article/view/18075. **Relevansi:** metode jaringan koordinasi tak-terawasi (kemiripan perilaku/sinkronisasi) ≈ klaster teks+serempak Anda; temuan bahwa **koordinasi tidak berarti otomasi** menantang pemetaan T0049.003 “bot” (F-24). Sumber untuk memperluas ke jaringan koordinasi berbobot, bukan ambang tunggal.
2. DISARM Foundation. *DISARM Frameworks* (Red). https://github.com/DISARMFoundation/DISARMframeworks. ID yang **terverifikasi** (nama dan taktik cocok dengan kode): T0015.002 Create New Hashtag (TA06), T0016 Create Clickbait (TA05), T0022 Leverage Conspiracy Theory Narratives (TA14), T0049.003 Bots Amplify via Automated Forwarding and Reposting (TA17), T0083 Integrate Target Audience Vulnerabilities into Narrative (TA14), T0140.003 Spread Hate (TA02), T0143.002 Fabricated Persona (TA16), T0150.001 Newly Created Asset (TA15), T0150.008 Bulk Created Asset (TA15). **Belum diverifikasi** dalam audit ini: T0049.001, T0049.002, T0049.005, T0049.008, T0075.001, T0079, T0084.001, T0085.001, T0085.003, T0086.002, T0086.003, T0087.001, T0088.001, T0145 (taktik). Verifikasi dilakukan lewat mirror repository resmi; cek ulang di GitHub asli. Lisensi (README menyebut CC BY-SA 4.0) tidak saya verifikasi.

### B. Teknologi
3. Broder, A. Z. (1997). *On the Resemblance and Containment of Documents.* Compression and Complexity of Sequences, IEEE CS Press, hlm. 21–29 (Salerno). Salinan: https://www.cs.princeton.edu/courses/archive/spring13/cos598C/broder97resemblance.pdf. **Relevansi:** dasar Jaccard atas shingle (bigram kata) yang Anda pakai; juga MinHash/LSH sebagai jalan keluar dari O(n²) (F-18).
4. OWASP. *OWASP Top 10:2025.* https://owasp.org/Top10/2025/0x00_2025-Introduction/ — A01 Broken Access Control, A02 Security Misconfiguration, A05 Injection, A10 Mishandling of Exceptional Conditions (dipakai untuk memetakan F-01, F-02, F-12). Pemetaan CWE per kategori sebaiknya dicek langsung di halaman kategori.

### C. Keamanan
5. Daftar CWE yang dipakai di laporan (CWE-79, -352, -346, -759, -248, -1333, -20, -306) **tidak saya buka satu per satu**; nama-nama tersebut dari pengetahuan auditor dan perlu dicocokkan di https://cwe.mitre.org sebelum dikutip dalam dokumen resmi.

### D. Penelitian terdahulu (dapat dibandingkan)
6. Cresci, S. (2020). *A Decade of Social Bot Detection.* Communications of the ACM 63(10): 72–83. DOI 10.1145/3409116 (arXiv:2007.03604). Survei deteksi bot; landasan keterbatasan fitur-per-akun.
7. Rahutomo, F., Yanuar, I., Asmara, R. A. (2018). *Indonesian Hoax News Detection Dataset.* Mendeley Data, V1. DOI 10.17632/p3hfgr5j3m.1 (dataset 250 dan 600 berita berlabel; studi terkait: Pratiwi, Asmara, Rahutomo, ICTS 2017, hlm. 73–78, DOI 10.1109/ICTS.2017.8265649 — daftar penulis studi ini hanya terkonfirmasi sebagian dari halaman dataset).
8. Rahutomo, F. (2019). *Eksperimen Naïve Bayes pada Deteksi Berita Hoax Berbahasa Indonesia.* Jurnal Penelitian Komunikasi dan Opini Publik 23(1) — akurasi 82,6% (uji statis) dan 68,33% (uji dinamis) pada 600 artikel (menurut abstrak).
9. Awalina, A., Fawaid, J. (2021). *Indonesia's Fake News Detection using Transformer Network.* arXiv:2107.06796 — **preprint; status publikasi tidak diverifikasi.** Memakai 1116 data dari turnbackhoax.id.
10. Mintarsih, F. (2026). *Detecting Hoax News in Indonesian Language Using Web-Based Multinomial Naïve Bayes.* Jurnal Teknik Informatika 19(1): 211–220. DOI 10.15408/jti.v19i1.50385.

**Penelitian yang identik tidak ditemukan.** Yang ditemukan: deteksi koordinasi (1), survei bot (6), dan klasifikasi hoaks teks Indonesia (7–10). Kombinasi “dasbor DISARM + peringatan dini provinsi Indonesia + kolektor Bluesky” tidak saya temukan dalam literatur yang diperiksa; ini **bukan** klaim bahwa alat ini yang pertama.

**Rekomendasi pengembangan**
- **A. Wajib:** pisahkan/hapus `AUTO IG` (F-05); terapkan perbaikan 1–18; hapus/ganti klaim “anonim” menjadi “pseudonim”; beri penanda sintetis permanen pada semua data simulasi.
- **B. Sebaiknya:** perbaiki F-08–F-10 (ejaan/leet normalisasi pada `heur`, bobot ujaran kebencian, deteksi konteks bantahan); tambahkan korpus berlabel nyata dan ukur precision/recall dengan data bukan buatan sendiri (n≥30 sudah ada fiturnya); token per-proses untuk kolektor; pindahkan tabel kota dan `heur` ke satu modul bersama; tes otomatis + CI.
- **C. Fitur tambahan:** klasifikator teks terawasi sebagai pembanding aturan (referensi 7–10); jaringan koordinasi berbobot (referensi 1); MinHash/LSH untuk >5000 baris.
- **D. Jangka panjang:** validasi pemetaan DISARM oleh pakar; evaluasi lintas bahasa daerah; mode kolaboratif antar-analis dengan autentikasi.

---

## BAB VII — KESIMPULAN

**Kondisi saat ini.** Dasbor dan kolektor berjalan dan stabil pada semua jalur yang saya uji; kontrol privasi dan escaping dasar baik. Alat ini layak sebagai **prototipe demo dengan data dummy/simulasi berizin** bila perbaikan diterapkan dan keterbatasan disebut jujur. Alat ini **belum layak** dipakai sebagai dasar tindakan terhadap akun/konten nyata: penilaian berbasis aturan menghasilkan false positive/negative nyata (F-06, F-09, F-10), mudah dievasi (F-08), dan vonis koordinasi menyesatkan (F-07 sebelum perbaikan).

**Kelemahan tersisa:** F-05 (keputusan Anda), F-08–F-10, F-17–F-26, Origin `null` pada kolektor, dan semua hal pada daftar “tidak diuji”.

**Pernyataan kejujuran.** Semua angka pada laporan berasal dari eksekusi di sandbox ini; skenario 3d–3f pertama saya tercemar data uji buatan saya sendiri dan **diulang** dengan data bersih sebelum disimpulkan; satu uji XSS awal (kolektor) tidak sah karena harness memblokir koneksi dan **diulang** sebelum disimpulkan. Uji kuota localStorage tidak diskriminatif sehingga tidak dijadikan temuan. Tidak ada hasil, log, atau referensi yang dikarang.
