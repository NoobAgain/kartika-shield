// test.js
const config = require('./config');
const { launchBrowser, getCaptionFromPage, postCommentAndLike, randomDelay } = require('./services/instagram');

// --- KONFIGURASI TEST ---
const postUrl = "https://www.instagram.com/p/C3c6BtwP6JaT_V2Ffq8UgKaniAhrfonC_4BaWU0/?img_index=1"; // Ganti dengan URL target
const testComment = "Ini adalah komentar untuk keperluan testing! ✨";
const accountsToTest = ['account1', 'account2']; // Ganti dengan akun yg ingin di test
// ------------------------

(async () => {
  console.log('🧪 Memulai skrip testing...');

  for (const accountKey of accountsToTest) {
    if (!config.profiles[accountKey]) {
      console.warn(`⚠️ Akun "${accountKey}" dilewati karena tidak ada di profiles.json.`);
      continue;
    }

    console.log(`\n--- Menjalankan test untuk: ${accountKey} ---`);
    let browser;
    try {
      const { browser: newBrowser, page } = await launchBrowser(accountKey);
      browser = newBrowser;

      // Alur kerja sama seperti di bot
      const caption = await getCaptionFromPage(page, postUrl);
      if (caption) {
        console.log(`   ✅ Caption ditemukan: "${caption.substring(0, 50)}..."`);
      } else {
        console.warn('   ⚠️ Gagal mendapatkan caption, tetap melanjutkan...');
      }

      const result = await postCommentAndLike(page, testComment);
      console.log(`   ✅ Hasil: ${result.message}`);

    } catch (err) {
      console.error(`   ❌ Error pada akun ${accountKey}: ${err.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
      console.log(`--- Test untuk ${accountKey} selesai ---`);
    }

    // JEDA PENTING untuk menghindari rate-limit/ban
    if (accountsToTest.indexOf(accountKey) < accountsToTest.length - 1) {
        const delaySeconds = Math.floor(Math.random() * (180 - 60 + 1)) + 60; // Jeda 1-3 menit
        console.log(`\n💤 Menunggu ${delaySeconds} detik sebelum lanjut ke akun berikutnya...`);
        await new Promise(res => setTimeout(res, delaySeconds * 1000));
    }
  }

  console.log('\n✅ Skrip testing selesai.');
})();