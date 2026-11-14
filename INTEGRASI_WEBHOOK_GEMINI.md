# Integrasi Verifikasi Data — n8n Gemini

Frontend mengirim foto ke Production Webhook melalui `POST multipart/form-data`.

Endpoint: `https://sukirman.app.n8n.cloud/webhook/kartika-shield-analyze`

Field:
- `foto`: file asli (JPEG, PNG, WEBP, HEIC/HEIF; maksimal 15 MB)
- `id_unggahan`: ID pemeriksaan unik
- `catatan`: teks/konteks tambahan dari pengguna

Frontend tidak menetapkan `Content-Type` secara manual agar browser membentuk multipart boundary.
Timeout request: 120 detik.

Respons sukses yang digunakan:
- `vonis`
- `alasan_vonis`
- `skor_kredibilitas`
- `ada_provokasi`
- `skor_provokasi`
- `unsur_provokasi`
- `ringkasan`
- `dari_memori`

Jika respons HTTP gagal atau tidak memiliki `vonis`, dashboard menandainya sebagai belum terverifikasi oleh n8n. Skor lokal tidak diperlakukan sebagai hasil analisis foto.

Catatan: webhook yang tidak memakai autentikasi dapat dipanggil siapa saja yang mengetahui URL. Terapkan rate limit, validasi input, dan mekanisme proteksi di n8n sebelum penggunaan publik.
