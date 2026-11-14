# Integrasi foto Verifikasi Data ke n8n

UI Verifikasi Data menerima JPG, PNG, dan WebP hingga 5 MB. File dibaca di browser sebagai data URL dan dikirim bersama teks ke webhook yang sudah dikonfigurasi di `js/n8n-bridge.js`.

## Payload tambahan

Permintaan JSON ke webhook `kartika-shield-analyze` kini menyertakan:

- `image.name`: nama file asli
- `image.mime_type`: MIME image yang divalidasi browser
- `image.size_bytes`: ukuran file dalam byte
- `image.data_url`: data URL base64 (`data:image/...;base64,...`)
- `image_instruction`: instruksi agar workflow memproses gambar dengan model vision dan memisahkan observasi dari inferensi

Jika tidak ada foto, `image` bernilai `null`.

## Konfigurasi workflow yang diperlukan

1. Pastikan Webhook menerima JSON POST dengan body yang cukup besar untuk foto (maksimal sekitar 6.7 MB setelah base64 untuk file 5 MB; atur batas payload/proxy sesuai kebutuhan).
2. Tambahkan node vision/model yang menerima gambar dari `image.data_url` (atau ekstrak base64 dan MIME type sesuai format node provider).
3. Sertakan observasi visual dan keterbatasan gambar pada analisis. Jangan mengklaim keaslian foto, waktu, lokasi, atau identitas hanya dari tampilan visual.
4. Kembalikan kontrak respons yang dipakai dashboard, minimal `final_score` numerik, dan sebaiknya `rule_score`, `ai_score`, `risk_level`, `narrative_direction`, `target`, serta `summary`.
5. Uji dengan foto sintetis/non-sensitif terlebih dahulu.

**Batas integrasi:** perubahan ini menyiapkan dan menguji pengiriman payload dari browser. Workflow n8n Cloud milik pengguna tidak diubah dari sini, sehingga analisis vision belum dapat dianggap aktif sampai node vision dipasang dan diuji pada workflow tersebut. Bila n8n menerima payload tetapi workflow tidak memproses `image.data_url`, status online saja bukan bukti bahwa isi foto telah dianalisis.
