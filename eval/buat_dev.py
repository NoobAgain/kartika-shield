# Set DEV: dipakai pengembang untuk menyetel aturan. BUKAN dasar klaim akurasi (lihat set uji tertahan).
# Kolom: perhatian = 1 bila teks memuat teknik manipulasi yang layak dilihat analis; tinggi = 1 bila serius (ancaman+konspirasi/kebencian/ajakan agresif).
import csv
D=[
('normal',"Rapat koordinasi RT dilaksanakan Sabtu pukul 19.00 di balai warga membahas jadwal ronda.",0,0),
('normal',"Hari ini ngopi di warung dekat kampus, kopi tubruknya enak banget.",0,0),
('normal',"Pengumuman: layanan perpanjangan SIM keliling hadir di alun-alun Minggu pagi, bawa KTP asli.",0,0),
('normal',"Terima kasih tetangga yang sudah membantu pindahan kemarin, semoga sehat selalu.",0,0),
('normal',"Jadwal kereta ke Bandung berubah mulai bulan depan, cek aplikasi resmi operator untuk detailnya.",0,0),
('normal',"Anak saya juara dua lomba menggambar tingkat kecamatan, bangga sekali.",0,0),
('clickbait',"Kamu tidak akan percaya apa yang terjadi selanjutnya! Rahasia yang disembunyikan dokter terungkap",1,0),
('clickbait',"Heboh! Artis ini ternyata begini kehidupan aslinya, wajib baca sampai habis",1,0),
('clickbait',"Klik link di bio untuk hadiah gratis, kamu pasti menang undian hari ini",1,0),
('clickbait',"Fakta mengejutkan tentang makanan sehari-hari yang bikin geger netizen",1,0),
('emosional',"Biadab! Tega sekali mereka memperlakukan nenek itu, darah mendidih lihatnya!!!",1,0),
('emosional',"Keterlaluan, memalukan, kurang ajar sekali pelakunya, air mata kami tak habis!!",1,0),
('disinformasi',"VIRAL!!! Segera sebarkan ke semua grup! Kelompok tertentu akan menguasai desa kita dan menghancurkan rumah ibadah. Pemerintah menutupi semuanya, media tidak berani menayangkan. Share sebelum dihapus!!!",1,1),
('disinformasi',"Vaksin ini racun untuk umat kita, sebarkan segera sebelum dihapus, pemerintah menutupi kebenarannya",1,1),
('disinformasi',"Awas! Bahaya mengancam anak-anak kita, serbuan orang asing sudah dekat, jangan diam saja!",1,1),
('disinformasi',"Info dari grup sebelah: pendatang akan menguasai kampung kita, aparat sengaja menutupi. Sebarkan!",1,1),
('bantahan',"KLARIFIKASI: Klaim bahwa pemerintah menutupi data vaksin adalah hoaks. Menurut Kemenkes, data terbuka di situs resmi.",0,0),
('bantahan',"Cek fakta: kabar bahwa sembako akan dihapus adalah hoaks menurut siaran pers Kementerian Sosial.",0,0),
('bantahan',"Bantahan resmi: video yang beredar tidak benar, menurut Polri kejadian itu terjadi di tahun berbeda.",0,0),
('ejaan',"s3b4rk4n sebelum d1hapus, pemerintah menutupi kebenaran",1,1),
('ejaan',"S e b a r k a n sekarang juga sebelum dihapus ditutupi pemerintah",1,1),
('ejaan',"sebaaarkan seeegera, kelompok tertentu mau kuasai desa kita, pemerintah menutupi!!",1,1),
('ambigu',"Waspada demam berdarah di musim hujan, kuras bak mandi seminggu sekali menurut Dinas Kesehatan.",0,0),
('ambigu',"Serbu diskon akhir tahun di toko buku, hanya sampai Minggu!",0,0),
('ambigu',"Ayo lawan korupsi dengan melapor ke KPK secara resmi lewat kanal pengaduan.",0,0),
('ambigu',"Bahaya banjir mengancam, BMMKG minta warga di bantaran sungai waspada dan siapkan tas siaga.",0,0),
('provokatif',"Turun ke jalan sekarang! Serbu kantor mereka, jangan diam saja, hajar yang berkhianat!",1,1),
('provokatif',"Kita lawan mereka, musuh bersama bangsa ini, ganyang antek asing!",1,1),
('provokatif',"Ayo donor darah di masjid hari Minggu!! Segera share ke teman-teman ya",0,0),
('kebencian',"Binatang pendatang itu tidak pantas hidup di sini",1,1),
('kebencian',"Habisi semua kafir di kampung ini, usir mereka",1,1),
('irrelevan',"Resep nasi goreng: tumis bawang putih, masukkan nasi, tambahkan kecap manis dan telur.",0,0),
('irrelevan',"Pertandingan semalam berakhir 2-1, gol penentu dicetak menit ke-89.",0,0),
]
with open('eval/dataset_dev.csv','w',newline='',encoding='utf-8') as f:
    w=csv.writer(f); w.writerow(['id','jenis','teks','perhatian','tinggi'])
    for i,(j,t,a,b) in enumerate(D,1): w.writerow([f'D{i:03d}',j,t,a,b])
print(len(D),'dev')
