===================================================
   🤖 Instagram Comment Bot via Telegram 🤖
===================================================

Versi: 6.6

Deskripsi:
Bot ini adalah alat automasi untuk Instagram yang memungkinkan Anda memberikan komentar dan "like" pada postingan secara otomatis. Semua perintah dikontrol melalui bot Telegram, dan komentar yang dihasilkan menggunakan kecerdasan buatan (AI) dari Google Gemini untuk memastikan relevansinya. Bot ini mendukung banyak akun Instagram dan dirancang agar sulit terdeteksi.

---------------------------------------------------
## FITUR UTAMA
---------------------------------------------------
- 🗣️ **Komentar Cerdas Berbasis AI:** Menggunakan Google Gemini untuk membuat komentar yang relevan dan natural berdasarkan caption postingan.
- 💬 **Kontrol Penuh via Telegram:** Semua perintah, mulai dari memulai tugas hingga mendapatkan laporan, dilakukan melalui chat Telegram.
- **Sesi Otomatis:** Antrean tugas berjalan sendiri dengan batas per akun, percobaan ulang, dan status yang bisa dijeda dari Telegram.
- 👥 **Dukungan Multi-Akun:** Dapat mengelola dan menjalankan banyak akun Instagram secara bersamaan atau berurutan.
- 🛡️ **Anti-Deteksi:** Menggunakan teknik canggih (Puppeteer Stealth & Injeksi Sesi) untuk mengurangi risiko akun ditandai atau diblokir.
- 🧠 **Deteksi Selektor Otomatis:** Jika Instagram mengubah tampilannya, bot dapat menggunakan AI untuk mencoba menemukan "alamat" elemen baru secara otomatis.
- ⚙️ **Otomatis & Siap Skala:** Cukup daftarkan akun dan buat sesi login sekali, bot akan mendeteksi akun yang siap secara otomatis.

---------------------------------------------------
## PRASYARAT
---------------------------------------------------
Sebelum memulai, pastikan Anda memiliki:
1.  **Node.js:** Versi 18 atau yang lebih baru.
2.  **Akun Instagram:** Siapkan satu atau lebih akun yang akan digunakan oleh bot.
3.  **Akun Telegram & Bot Token:**
    - Buat bot baru di Telegram dengan berbicara pada @BotFather untuk mendapatkan `TELEGRAM_TOKEN`.
4.  **OpenRouter API Key:**
    - Dapatkan `OPENROUTER_API_KEY` dari https://openrouter.ai/keys
    - Model bawaan: `google/gemini-2.5-flash` (bisa diganti lewat `OPENROUTER_MODEL`).

---------------------------------------------------
## INSTALASI & KONFIGURASI
---------------------------------------------------
Ikuti langkah-langkah ini secara berurutan:

**1. Unduh atau Clone Proyek**
   - Pastikan semua file proyek berada dalam satu folder.

**2. Instal Dependensi**
   - Buka terminal atau Command Prompt di folder proyek.
   - Jalankan perintah:
     ```
     npm install
     ```

**3. Konfigurasi Kunci API (.env)**
   - Salin file `.env.example` dan ubah namanya menjadi `.env`.
   - Buka file `.env` dan isi dengan kunci API yang sudah Anda dapatkan:
     ```
     TELEGRAM_TOKEN=TOKEN_BOT_TELEGRAM_ANDA
     OPENROUTER_API_KEY=KUNCI_OPENROUTER_ANDA
     OPENROUTER_MODEL=google/gemini-2.5-flash
     ```

**4. Daftarkan Akun Instagram (profiles.json)**
   - Buka file `profiles.json`.
   - Daftarkan semua akun yang ingin Anda gunakan. `profileDir` harus unik untuk setiap akun.
     ```json
     {
       "account1": { "profileDir": "./profiles/account1", "displayName": "Akun Utama" },
       "account2": { "profileDir": "./profiles/account2", "displayName": "Akun Cadangan" }
     }
     ```
   - Anda bisa menambahkan `account3`, `account4`, dan seterusnya.

---------------------------------------------------
## CARA PENGGUNAAN
---------------------------------------------------
Prosesnya terdiri dari dua tahap utama: membuat sesi login dan menjalankan bot.

**TAHAP 1: Membuat Sesi Login (Hanya Sekali per Akun)**
Untuk setiap akun yang Anda daftarkan di `profiles.json`, Anda harus membuat sesi loginnya terlebih dahulu.

- Buka terminal di folder proyek.
- Jalankan perintah `node login.js` diikuti dengan nama akun. Contoh:
node login.js account1

- Sebuah browser akan terbuka. **Login manual** ke akun Instagram Anda.
- Setelah berhasil login dan feed muncul, **lakukan sedikit interaksi** (scroll atau like) untuk "memanaskan" sesi.
- Tekan **Enter** di terminal untuk menyimpan sesi (cookies & localStorage).
- Ulangi untuk akun lain (misalnya, `node login.js account2`).

**TAHAP 2: Menjalankan Bot Utama**
- Buka terminal di folder proyek.
- Jalankan perintah:
npm start

- Anda akan melihat pesan "✅ Bot Telegram berhasil dijalankan...".

**TAHAP 3: Memberi Perintah via Telegram**
- Buka chat dengan bot Anda di Telegram.
- Kirim perintah `/start` untuk melihat daftar perintah yang tersedia.
- Untuk menjalankan semua akun yang siap, gunakan perintah:
/komen_all https://www.instagram.com/p/URL_POSTINGAN_TARGET/

- Bot akan memproses permintaan dan memberikan laporan di chat Telegram.

---------------------------------------------------
## SESI OTOMATIS (ANTREAN)
Sesi otomatis berjalan saat `npm start` dan memproses antrean satu akun pada satu waktu. Tugas disimpan di `queue.json`, jadi antrean tetap ada setelah bot dimulai ulang.

Perintah:
```
/antre <URL Instagram> [akun1,akun2]   masukkan ke antrean; tanpa daftar akun = semua akun siap
/status                               status antrean dan batas
/jeda                                 hentikan sementara
/lanjut                               lanjutkan antrean
/hapusantre                           hapus tugas yang belum berjalan
/sesi                                 cek akun yang punya folder + cookies.json
```

Batas bawaan: satu tugas per akun setiap 30 menit, maksimal 10 tugas sukses per akun per hari, jeda 2 menit antar tugas, dan percobaan ulang maksimal 2 kali. Ubah lewat `.env`:
```
SCHEDULER_ENABLED=1
SCHEDULER_COOLDOWN_MIN=30
SCHEDULER_DAILY_MAX=10
SCHEDULER_START_DELAY_MIN=2
SCHEDULER_GAP_MIN=2
SCHEDULER_POLL_SEC=30
SCHEDULER_MAX_ATTEMPTS=2
SCHEDULER_RETRY_MIN=10
```

Akun dianggap siap bila folder profil dan `cookies.json` tersedia. Sesi yang kedaluwarsa akan gagal dan muncul di laporan Telegram; buat ulang dengan `node login.js <namaAkun>`.

---------------------------------------------------
## PERINGATAN & PRAKTIK TERBAIK
---------------------------------------------------
- ⚠️ **RISIKO AKUN:** Automasi melanggar ketentuan layanan Instagram. Gunakan bot ini dengan bijak. Ada risiko akun Anda dibatasi atau diblokir.
- **JANGAN COMMIT RAHASIA:** Folder `profiles/` berisi cookies sesi, `.env` berisi token, dan `queue.json` berisi riwayat tugas. Jangan unggah ketiganya ke GitHub.
- 🖥️ **BEBAN KOMPUTER:** Menjalankan banyak akun secara bersamaan akan memakan banyak RAM. Jika Anda memiliki banyak akun (lebih dari 3-4), disarankan untuk mengubah mode eksekusi menjadi sekuensial (satu per satu).
- 🌐 **BLOKIR IP:** Menjalankan banyak akun dari satu alamat IP yang sama sangat berisiko. Untuk skala besar, penggunaan **proxy residensial** sangat direkomendasikan.
- ⏳ **JANGAN BERLEBIHAN:** Hindari menjalankan bot terlalu sering. Beri jeda yang cukup antar setiap tugas untuk meniru perilaku manusia.
