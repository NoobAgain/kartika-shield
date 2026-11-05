// services/instagram.js — versi stabil AI + fallback manual
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
// PERBAIKAN DI SINI:
// 1. Pakai { } karena ini named export.
// 2. Ubah path jadi './' karena satu folder.
// 3. Tambahkan '.js'.
import { detectSelectorWithGemini } from './detectSelector.js'; 

puppeteer.use(StealthPlugin());

// 🔹 Helper delay acak
export async function randomDelay(min = 1200, max = 3500) {
  return new Promise(res => setTimeout(res, Math.floor(Math.random() * (max - min + 1)) + min));
}

// 🔹 Launch browser pakai profil
export async function launchBrowser(profileKey = 'account1') {
  const profileDir = path.resolve(process.cwd(), 'profiles', profileKey);
  const cookiesPath = path.join(profileDir, 'cookies.json');
  const localStoragePath = path.join(profileDir, 'localStorage.json');

  console.log(chalk.cyan(`🚀 Membuka browser dengan profil: ${profileDir}`));

  const isWindows = process.platform === "win32";

  const browser = await puppeteer.launch({
    headless: "new", 
    executablePath: isWindows ? undefined : '/usr/bin/chromium-browser',
    args: [
      `--user-data-dir=${profileDir}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled'
    ],
    defaultViewport: { width: 1280, height: 800 },
  });

  const page = await browser.newPage();

  // Terapkan cookies
  if (fs.existsSync(cookiesPath)) {
    const cookies = await fs.readJson(cookiesPath);
    await page.setCookie(...cookies);
    console.log(chalk.green(`✅ Cookies diterapkan (${cookies.length} items)`));
  }

  // Terapkan localStorage
  if (fs.existsSync(localStoragePath)) {
    const data = await fs.readJson(localStoragePath);
    await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2' });
    await page.evaluate(d => {
      for (const k in d) localStorage.setItem(k, d[k]);
    }, data);
    await page.reload({ waitUntil: 'networkidle2' });
    console.log(chalk.green('✅ LocalStorage diterapkan'));
  }

  try {
    await page.waitForSelector('svg[aria-label="Beranda"], svg[aria-label="Home"]', { timeout: 10000 });
    console.log(chalk.green(`🎉 Login valid untuk ${profileKey}`));
  } catch (err) {
    console.warn(chalk.red('⚠️ Login gagal diverifikasi (mungkin butuh login ulang manual).'));
  }

  return { browser, page };
}

// 🔹 Ambil caption dari postingan IG
export async function getCaptionFromPage(page, postUrl) {
  console.log(chalk.yellow(`📸 Mengambil caption dari: ${postUrl}`));

  try {
    await page.goto(postUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await randomDelay(3000, 5000);

    // 1️⃣ Coba meta description dulu
    const og = await page.$('meta[property="og:description"]');
    if (og) {
      const content = await page.$eval('meta[property="og:description"]', el => el.getAttribute('content'));
      if (content && content.trim().length) {
        console.log(chalk.green('✅ Caption ditemukan via meta[property="og:description"]'));
        return content.trim();
      }
    }

    // 2️⃣ Coba selector manual umum
    const selectors = [
      'article span[dir="auto"]',
      'article h1',
      'div._a9zs > span',
      'article span:not([aria-hidden="true"]):not([role])'
    ];

    for (const sel of selectors) {
      try {
        const el = await page.$(sel);
        if (el) {
          const text = await page.evaluate(e => e.textContent, el);
          if (text && text.trim().length > 5) {
            console.log(chalk.green(`✅ Caption ditemukan dengan selector manual: ${sel}`));
            return text.trim();
          }
        }
      } catch (_) {}
    }

    // 3️⃣ Kalau semua gagal, panggil AI
    console.log(chalk.yellow('🧠 Semua selector manual gagal. Memanggil Gemini (OpenRouter)...'));
    const htmlContent = await page.content();
    
    // Panggil fungsi yang sudah diimport dengan benar
    const aiSelector = await detectSelectorWithGemini(htmlContent);

    if (aiSelector) {
      console.log(chalk.magenta(`🤖 AI memberi selector: ${aiSelector}`));
      try {
        await page.waitForSelector(aiSelector, { timeout: 8000 });
        const el = await page.$(aiSelector);
        const text = await page.evaluate(e => e.textContent, el);
        if (text && text.trim().length > 5) {
          console.log(chalk.green(`✅ Caption berhasil diambil via AI selector: ${aiSelector}`));
          return text.trim();
        } 
      } catch (err) {
        console.warn(chalk.red(`⚠️ Gagal memakai selector AI: ${err.message}`));
      }
    }

    throw new Error('Tidak berhasil menemukan caption.');

  } catch (error) {
    console.error(chalk.red(`❌ Gagal total mengambil caption: ${error.message}`));
    return null;
  }
}

// 🔹 Fungsi kirim komentar dan like
export async function postCommentAndLike(page, postUrl, commentText) {
  console.log(chalk.cyan('💬 Mencoba like & komentar...'));

  try {
    if (page.url() !== postUrl) {
      await page.goto(postUrl, { waitUntil: 'networkidle2' });
      await randomDelay(2000, 4000);
    }

    // Like post
    const likeSelectors = [
      'svg[aria-label="Like"]',
      'svg[aria-label="Suka"]',
      'span[class*="xp7jhwk"] svg' // Selector alternatif
    ];
    
    let liked = false;
    for (const s of likeSelectors) {
      const btn = await page.$(s);
      if (btn) {
        // Cek apakah sudah dilike (biasanya warna merah/aktif, tapi kita klik saja untuk amannya)
        await btn.click();
        liked = true;
        console.log(chalk.green('❤️ Tombol like diklik.'));
        await randomDelay(800, 1500);
        break;
      }
    }
    if (!liked) console.log(chalk.yellow('⚠️ Tidak menemukan tombol like (mungkin sudah dilike).'));

    // Tambah komentar
    const inputSel = 'textarea[aria-label="Tambahkan komentar…"], textarea[aria-label="Add a comment…"]';
    await page.waitForSelector(inputSel, { timeout: 8000 });
    await page.type(inputSel, commentText, { delay: 80 });
    await randomDelay(800, 1200);
    await page.keyboard.press('Enter');
    console.log(chalk.green('💬 Komentar dikirim.'));

  } catch (err) {
    console.error(chalk.red(`�?O Gagal mengirim komentar/like: ${err.message}`));
    throw new Error(`Like/komentar gagal: ${err.message}`);
  }
}