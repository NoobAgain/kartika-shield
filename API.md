# API, Kolektor HTTP dan API JavaScript mesin kognitif

## A. Kolektor (`collector/server.js`)
Dasar: `http://127.0.0.1:8787`. Semua jawaban JSON kecuali `/events` (SSE).

| Metode & jalur | Fungsi | Catatan |
|---|---|---|
| `GET /events` | Aliran SSE: `hit` (temuan), `stat`, `bot` | Maks `MAX_CLIENTS` klien (lebih → 503). Mengirim ≤20 `hit` terakhir saat tersambung |
| `GET /stats`, `/health` | Statistik, uptime, status bot | |
| `GET /bot`, `/bot/status` | Status bot pencarian | |
| `POST /bot/config` | `{keywords, intervalMin, auto}` | Interval 1–120 menit; kata kunci dibatasi |
| `POST /bot/search` | Jalankan pencarian publik sekarang (202) | Membaca hasil publik Bluesky saja |
| `OPTIONS *` | Preflight CORS | |

Proteksi: header `Host` harus `localhost`/`127.0.0.1`/`[::1]`/`ALLOW_HOST` (selain itu 403); POST wajib `Content-Type: application/json` dan Origin tepercaya (selain itu 403); body > 64 KB → 413; JSON rusak → 400; jalur lain → 404 (tidak ada berkas statis). CORS hanya untuk Origin tepercaya (termasuk `null` untuk berkas lokal).

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
