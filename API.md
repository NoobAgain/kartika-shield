# API, Kolektor HTTP dan API JavaScript mesin kognitif

## A. Kolektor (`collector/server.js`)
Dasar: `http://127.0.0.1:8787`. Semua jawaban JSON kecuali `/events` (SSE).

| Metode & jalur | Fungsi | Catatan |
|---|---|---|
| `GET /events` | Aliran SSE: `hit` (temuan), `stat`, `bot`, `buzzer-data` | Maks `MAX_CLIENTS` klien (lebih → 503). `buzzer-data` berisi batch unggahan publik Bluesky yang baru dikumpulkan |
| `GET /stats`, `/health` | Statistik, uptime, status bot | |
| `GET /news` | Arsip RSS lokal; mendukung `limit`, `province`, `status`, `source`, dan `q` | Artikel baru menyertakan analisis awal lokal (`riskScore`, `confidenceScore`, `status`, alasan, dimensi, waktu analisis) |
| `GET /bot`, `/bot/status` | Status bot pencarian | |
| `GET /buzzer/data?limit=500` | Buffer unggahan Bluesky terbaru untuk analisis buzzer otomatis | Limit 1–1000; akun dipseudonimkan; tautan unggahan asli disertakan; buffer berada di memori Collector |
| `POST /bot/config` | `{keywords, intervalMin, auto}` | Interval 1–120 menit; kata kunci dibatasi |
| `POST /bot/search` | Jalankan pencarian publik sekarang (202) | Membaca hasil publik Bluesky saja |
| `OPTIONS *` | Preflight CORS | |

Proteksi: header `Host` harus `localhost`/`127.0.0.1`/`[::1]`/`ALLOW_HOST` (selain itu 403); POST wajib `Content-Type: application/json` dan Origin tepercaya (selain itu 403); body > 64 KB → 413; JSON rusak → 400. Server juga menyajikan dashboard dan aset lokal melalui HTTP; path traversal serta berkas tersembunyi/`.env` ditolak. CORS hanya untuk Origin tepercaya.

Format event `buzzer-data` (data JSON): `{generatedAt, count, items:[{id, source, account, createdAt, accountCreatedAt, ageDays, followers, following, text, provinceCode, locationBasis, postUrl, collectedAt}]}`. `provinceCode` hanya berasal dari penyebutan wilayah dalam teks, bukan lokasi akun. Pseudonim akun dihitung lokal dan DID mentah tidak dikirim ke browser.

Format event `hit` (data JSON): `{type:0..4, risk:0..100, text, city?, src, sara?, acct?(hash 8), coordinated?, viral?:{n,sources[],windowMin}, meta?, ts}`. Klien memvalidasi: `text` string dan `risk` angka ≥ 0; `viral.sources` yang bukan larik diabaikan.

## B. API JavaScript mesin (UMD: peramban `KS.*`, Node `require`)
```js
const T = require('./js/00a-kognitif-teks.js');   // peramban: KS.teks
const N = require('./js/00b-kognitif-narasi.js'); // KS.narasi
const D = require('./js/00c-kognitif-dini.js');   // KS.dini
```
### `T.analisis(teks) → objek`
`{versi, kosong, verdict, risk 0..100, sara, ringkasan, tanda[], teknik[], kategori:{<K>:{skor,maks,indikator:[{id,nama,nilai,faktor[]}]}}, bukti:[{indikator,kategori,nama,kutipan,konteks}], konteks:'netral'|'bantahan_bersumber'|'kemungkinan_bantahan', keyakinan, metode, keterbatasan[], narasi_tandingan, tabayyun[], sasaran[], arah, isu, emosi, lantai, jumlahKata}`. Juga: `T.normalisasi(t) → {mentah, leet}`, `T.tokens(t)`, `T.verdictDari(skor)`, `T.KATEGORI`, `T.INDIKATOR`, `T.AMBANG`.

### `N.analisis(rows, opsi?) → hasil`
`rows[i] = {u, age, fo, fi, tm | ts, tx, pv?, id?}` (`ts` = `'YYYY-MM-DDTHH:MM'` atau epoch ms; `tm` = menit dalam hari).
Hasil: `{n, waktuMode:'tanggal'|'jam-saja', klaster:[{id, idx[], n, akun, label, rep, repId, mulai, akhir, durasiMenit, waktuKe3AkunMenit, varian, bantahan, tagar, koordinasi:{skor,kategori,akun,bukti[],keluarga,catatan[],alternatif[],puncak,rasioSerempak,serempakIdx[]}, manipulasi, manipulasiMaks, sasaran, sara, kebencian, wilayah, jangkauan}], akun:[{u,s,label,sinyal[],profil,klaster}], graf:{nodes,edges,jembatan,catatan}, kronologi[], indeksKoordinasi, tanpaWaktu, tanpaKlaster, durasiProsesMs, catatan[]}`. `N.parseWaktu(v)`, `N.PARAM`.

### `D.peringatanDini(hasilNarasi) → [{klaster, label, skor, kategori, komponen:{<c>:{nilai,metrik}}, gerbang[], keyakinan, rekomendasi[], keterbatasan[], sumberBaris[], wilayah[]}]`
Konstanta: `D.BOBOT`, `D.DEF_KOMPONEN`, `D.AMBANG`, `D.REKOMENDASI`.

### `D.laporanSituasi(hasilNarasi, dini, {topN, namaWilayah}) → laporan` dan `D.laporanTeks(laporan) → string`
Struktur laporan: lihat ARCHITECTURE.md §4.4.

Semua fungsi murni (tanpa efek samping), deterministik, dan tidak melempar galat untuk masukan kosong/aneh (diuji di `tests/unit_engine.js`).


### POST `/api/ai/research`

Body JSON: `{ "query": "pertanyaan riset publik", "provider": "gemini|openai|both" }`. Kunci API wajib berada pada environment Collector (`GEMINI_API_KEY` / `OPENAI_API_KEY`). Respons berisi hasil per provider, model, teks, metadata apakah search digunakan, serta URL sitasi terstruktur bila dikembalikan API. Endpoint tidak menyimpan prompt atau jawaban sebagai data permanen.


### Analisis awal berita lokal

Setiap artikel RSS baru diberi analisis deterministik melalui `collector/services/news-analysis.js` sebelum disimpan ke `collector/data/news-articles.json`. Metode ini bukan analisis AI dan bukan verifikasi fakta. `riskScore` dan `confidenceScore` merupakan dua metrik terpisah. Status `KRITIS` memiliki gerbang konservatif: skor tinggi, penanda waktu terkini, indikator dampak keselamatan, lokasi eksplisit, dan minimal dua sumber independen yang tercatat. Pada pipeline RSS saat ini sumber independen default adalah satu, sehingga status kritis tidak diberikan hanya dari satu artikel. Kritik dan aksi damai tidak otomatis dikategorikan sebagai ancaman.


### Mini TV

Dashboard menyematkan pemutar YouTube resmi untuk tvOne, Metro TV, dan Kompas TV melalui endpoint live-stream embed berbasis channel ID. Status LIVE tidak dinyatakan oleh dashboard karena status siaran aktual tidak diperiksa melalui YouTube Data API; operator dapat memeriksa indikator di player atau membuka kanal resmi. Jika embed dibatasi atau siaran tidak tersedia, tautan kanal resmi tetap disediakan. Volume dan mute memakai kontrol native YouTube.
