// login.js (Penyimpan Sesi Manual)
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import path from 'path';
import fs from 'fs-extra';
import readline from 'readline';

puppeteer.use(StealthPlugin());

const profileKey = process.argv[2];
if (!profileKey) {
  console.error('❌ Cara penggunaan: node login.js <namaAkun>');
  process.exit(1);
}

const profileDir = path.resolve(process.cwd(), 'profiles', profileKey);
const cookiesPath = path.join(profileDir, 'cookies.json');
const localStoragePath = path.join(profileDir, 'localStorage.json');

(async () => {
  console.log(`🚀 Membuka browser untuk membuat sesi bagi: ${profileKey}`);
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto('https://www.instagram.com', { waitUntil: 'networkidle2' });

  console.log('🔎 Silakan login manual. Lakukan sedikit interaksi (scroll/like) untuk memanaskan sesi.');
  
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await new Promise(resolve => {
    rl.question('\nTekan Enter di sini setelah Anda selesai login dan berinteraksi...', resolve);
  });
  rl.close();

  console.log('\n💾 Menyimpan cookies dan localStorage...');
  
  // Simpan Cookies
  const cookies = await page.cookies();
  await fs.ensureDir(profileDir);
  await fs.writeJson(cookiesPath, cookies);
  console.log(`✅ Cookies disimpan di: ${cookiesPath}`);

  // Simpan Local Storage
  const localStorageData = await page.evaluate(() => {
    let data = {};
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        data[key] = localStorage.getItem(key);
      }
    }
    return data;
  });
  await fs.writeJson(localStoragePath, localStorageData);
  console.log(`✅ LocalStorage disimpan di: ${localStoragePath}`);

  console.log('🎉 Sesi berhasil disimpan!');
  await browser.close();
})();