# Patch Verifikasi Data — basis FIXED17

- Mengganti label antarmuka Analisis Konten menjadi Verifikasi Data.
- Menghapus Feed dari dock navigasi peta. Modul feed dan data internal tetap disimpan agar integrasi kolektor/laporan yang sudah ada tidak terputus.
- Menambahkan upload foto JPG/PNG/WebP maksimal 5 MB, pratinjau, hapus lampiran, dan validasi.
- Memperluas payload webhook n8n agar menyertakan `image.data_url` dan instruksi pemrosesan vision.
- Memperbaiki konfigurasi Mini Live TV: `youtube-nocookie.com`, `referrerpolicy=origin`, eager loading, dan percobaan autoplay mute.

Tidak ada perubahan pada mesin penilaian teks inti, peta 27 Kodam, atau modul deteksi buzzer.
