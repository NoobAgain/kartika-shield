# Upgrade Lambang Kodam – KARTIKA SHIELD

## Ruang lingkup
Upgrade ini memasangkan 27 kode pada `data/kodam.js` dengan 27 aset lambang yang sudah berada di `assets/kodam-insignia/`.
Struktur `data/kodam.js`, `data/provinces.js`, penyimpanan browser, dan data analisis tidak diubah.

## Implementasi
- Menambahkan `js/11-kodam-insignia.js` sebagai manifest aset berdasarkan `KODAM_DATA.code`.
- Memperbarui `js/05-peta-live.js` agar marker markas Kodam menggunakan lambang lokal dan label nama Kodam.
- Menambahkan script manifest ke `index.html`.
- Memperbarui `tools/build.js` agar referensi aset Kodam di-inline ke `dist/kartika-shield.html`; hasil dist tetap mandiri.
- Peta Peringatan Dini tetap menggunakan lambang provinsi dari `data/logos.js`. Lambang provinsi tidak diganti dengan lambang Kodam.

## Pasangan kode dan aset
| Kode | Nama pada data | Aset |
|---|---|---|
| KIM | Kodam Iskandar Muda | `Lambang_Kodam_Iskandar_Muda.png` |\n| K1 | Kodam I/Bukit Barisan | `Lambang_Kodam_Bukit_Barisan.png` |\n| K2 | Kodam II/Sriwijaya | `Lambang_Kodam_Sriwijaya.svg.webp` |\n| K3 | Kodam III/Siliwangi | `Lambang_Kodam_Siliwangi.png` |\n| K4 | Kodam IV/Diponegoro | `Lambang_Kodam_Diponegoro.png` |\n| K5 | Kodam V/Brawijaya | `Lambang_Kodam_Brawijaya.svg.webp` |\n| K6 | Kodam VI/Mulawarman | `Lambang_Kodam_Mulawarman.png` |\n| K9 | Kodam IX/Udayana | `Lambang_Kodam_Udayana.svg.webp` |\n| K12 | Kodam XII/Tanjungpura | `Lambang_Kodam_Tanjungpura.svg.webp` |\n| K13 | Kodam XIII/Merdeka | `Lambang_Kodam_Merdeka.png` |\n| K14 | Kodam XIV/Hasanuddin | `Lambang_Kodam_Hasanuddin.svg.webp` |\n| K16 | Kodam XVI/Pattimura | `Lambang_Kodam_Pattimura.png` |\n| K17 | Kodam XVII/Cenderawasih | `Lambang_Kodam_Cenderawasih.svg.webp` |\n| K18 | Kodam XVIII/Kasuari | `Lambang_Kodam_Kasuari.png` |\n| K19 | Kodam XIX/Tuanku Tambusai | `Lambang_Kodam_Tuanku_Tambusai.png` |\n| K20 | Kodam XX/Tuanku Imam Bonjol | `Lambang_Kodam_Tuanku_Imam_Bonjol.png` |\n| K21 | Kodam XXI/Radin Inten | `Lambang_Komando_Daerah_Militer_Radin_Inten.png` |\n| K22 | Kodam XXII/Tambun Bungai | `Lambang_Kodam_XXII_Tambun_Bungai_(2025).png` |\n| K23 | Kodam XXIII/Palaka Wira | `Lambang_Kodam_Palaka_Wira.png` |\n| K24 | Kodam XXIV/Mandala Trikora | `Lambang_Kodam_XXIII_Mandala_Trikora.png` |\n| K25 | Kodam XXV/Sultan Mahmud Riayat Syah | `LOGO_KODAM_XXV_SMR.png` |\n| K26 | Kodam XXVI/Mataram | `LOGO_KODAM_XXVI_MATARAM.png` |\n| K27 | Kodam XXVII/Sobe Sonbai | `LOGO_KODAM_XXVII_SOBE_SONBAI.png` |\n| K28 | Kodam XXVIII/Moloku Kie Raha | `LOGO_KODAM_XXVII_MOLOKU_KIE_RAHA.png` |\n| K29 | Kodam XXIX/Mambruk | `LOGO_KODAM_XXIX_MAMBRUK.png` |\n| K30 | Kodam XXX/Rinambora | `LOGO_KODAM_XXX_RINAMBORA.png` |\n| KJ | Kodam Jaya/Jayakarta | `Lambang_Kodam_Jaya.svg.webp` |\n
## Catatan posisi
Marker pada Peta Dunia Live memakai koordinat `lat`/`lon` yang sudah tersedia pada objek `KODAM_DATA`. Posisi ini dimaksudkan sebagai titik kedudukan/marker referensi Kodam, bukan poligon batas teritorial atau lokasi satuan operasional. Pemetaan provinsi ke Kodam tetap mengikuti `KODAM_BY_PROVINCE` yang sudah ada dalam dataset proyek.

## Validasi
- 27 kode pada `KODAM_DATA` cocok satu per satu dengan manifest lambang.
- 27 nama aset unik; satu duplikat file Mandala Trikora yang identik tidak dipakai dua kali.
- JavaScript syntax check: lulus.
- Build `node tools/build.js`: berhasil.
- Build mandiri mengandung data URI lambang, tanpa ketergantungan path relatif `assets/kodam-insignia/`.
- Test unit: 68/68 lulus.
- Test news/public news, mini TV, dan automatic buzzer: lulus.

## Catatan kehati-hatian
Nama, lambang, kedudukan, dan pembagian wilayah perlu disesuaikan lagi bila ada keputusan organisasi resmi terbaru. Lambang dalam arsip ini dipasangkan berdasarkan nama file dan isi aset yang disediakan di ZIP pengguna; ini bukan sertifikasi keaslian atau pengesahan resmi aset.

## Sinkronisasi Peta Peringatan Dini (mini map)

Pembaruan sinkronisasi berikutnya: renderer `js/04-peta-dini.js` kini mengambil lambang dari `window.KODAM_INSIGNIA` berdasarkan relasi `KODAM_BY_PROVINCE`, sama seperti peta utama. Marker mini map berada pada koordinat ibu kota provinsi (bukan koordinat markas Kodam), sehingga setiap provinsi menampilkan lambang Kodam yang membawahi provinsi tersebut; label provinsi dan nama Kodam ditampilkan bersama. Panel daftar pada layar sempit juga memakai lambang Kodam yang sama. Data `data/kodam.js`, `data/provinces.js`, `data/logos.js`, dan penyimpanan browser tidak diubah.
