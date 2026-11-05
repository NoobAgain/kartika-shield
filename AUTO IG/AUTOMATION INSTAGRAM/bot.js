import TelegramBot from 'node-telegram-bot-api';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config.js';
import { generateComment } from './services/gemini.js';
import { launchBrowser, getCaptionFromPage, postCommentAndLike, randomDelay } from './services/instagram.js';
import { QueueScheduler } from './scheduler.js';
import { getReadyAccounts } from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bot = new TelegramBot(config.telegramToken, { polling: true });

async function runBotTask(accountKey, postUrl, chatId) {
  console.log(`[${accountKey}] Memulai proses...`);
  let browser;
  try {
    await bot.sendMessage(chatId, `[${accountKey}] Memulai...`);

    const { browser: newBrowser, page } = await launchBrowser(accountKey);
    browser = newBrowser;

    console.log(`[${accountKey}] Pemanasan sesi...`);
    await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2' });
    await randomDelay(3000, 5000);

    const caption = await getCaptionFromPage(page, postUrl);
    if (!caption) throw new Error('Gagal mendapatkan caption.');

    const commentText = await generateComment(caption) || 'Komentar fallback!';
    await bot.sendMessage(chatId, `[${accountKey}] Komentar AI: "${commentText}"`);

    await postCommentAndLike(page, postUrl, commentText);

    await bot.sendMessage(chatId, `[${accountKey}] Selesai tanpa error.`);
    return { ok: true };
  } catch (err) {
    console.error(`[${accountKey}] Error: ${err.message}`);
    await bot.sendMessage(chatId, `[${accountKey}] Gagal: ${err.message.slice(0, 100)}`);
    return { ok: false, error: err.message };
  } finally {
    if (browser) {
      try {
        await randomDelay(5000, 5000);
      } catch (e) {}
      await browser.close();
    }
  }
}

function formatResult(accountKey, result) {
  return result.ok ? `OK [${accountKey}] Sukses!` : `GAGAL [${accountKey}] ${String(result.error || 'tanpa detail').slice(0, 100)}`;
}

async function runInBatches(accountKeys, batchSize, postUrl, chatId) {
  const results = [];
  for (let i = 0; i < accountKeys.length; i += batchSize) {
    const batch = accountKeys.slice(i, i + batchSize);
    await bot.sendMessage(chatId, `Menjalankan batch ${i / batchSize + 1} dari ${Math.ceil(accountKeys.length / batchSize)}:\n${batch.join(', ')}`);

    const batchResults = await Promise.all(batch.map(key => runBotTask(key, postUrl, chatId)));
    results.push(...batchResults.map((r, ix) => formatResult(batch[ix], r)));

    if (i + batchSize < accountKeys.length) {
      await bot.sendMessage(chatId, 'Menunggu 10-20 detik sebelum batch berikutnya...');
      await randomDelay(10000, 20000);
    }
  }
  return results;
}

const queueFile = path.join(__dirname, 'queue.json');
const scheduler = new QueueScheduler({
  file: queueFile,
  options: config.scheduler,
  runTask: task => runBotTask(task.account, task.postUrl, task.chatId),
  notify: (chatId, text) => bot.sendMessage(chatId, text)
});

function queueStatusText() {
  const s = scheduler.status();
  const next = s.nextDueAt ? new Date(s.nextDueAt).toLocaleString('id-ID') : '-';
  return [
    `Sesi otomatis: ${config.scheduler.enabled ? (s.paused ? 'dijeda' : 'aktif') : 'nonaktif'}`,
    `Menunggu: ${s.pending} · berjalan: ${s.running ? s.running.account : '-'}`,
    `Selesai hari ini: ${s.doneToday} · gagal hari ini: ${s.failedToday}`,
    `Berikutnya: ${s.nextAccount || '-'} pada ${next}`,
    `Batas: ${config.scheduler.cooldownMin} menit/akun, ${config.scheduler.dailyMax} sukses/hari`
  ].join('\n');
}

bot.onText(/^\/antre(?:@\w+)?(?:\s+(.+))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const args = (match[1] || '').trim().split(/\s+/).filter(Boolean);
  const postUrl = args[0] || '';
  if (!postUrl.includes('instagram.com')) {
    return bot.sendMessage(chatId, 'Format: /antre <URL Instagram> [akun1,akun2]\nContoh: /antre https://www.instagram.com/p/XXXX account1,account2');
  }

  const ready = getReadyAccounts();
  const requested = args[1] ? args[1].split(',').map(s => s.trim()).filter(Boolean) : ready;
  const accounts = requested.filter(a => ready.includes(a));
  if (!accounts.length) {
    return bot.sendMessage(chatId, 'Tidak ada akun siap. Buat sesi dengan: node login.js <namaAkun>');
  }

  const invalid = requested.filter(a => !ready.includes(a));
  const result = scheduler.queue({ accounts, postUrl, chatId });
  const next = new Date(result.dueAt).toLocaleString('id-ID');
  const lines = [
    `Antrean ditambahkan: ${result.added} akun.`,
    result.skipped ? `Dilewati karena sudah ada: ${result.skipped}.` : '',
    invalid.length ? `Akun tidak siap: ${invalid.join(', ')}.` : '',
    `Mulai sekitar: ${next}`,
    queueStatusText()
  ].filter(Boolean);
  return bot.sendMessage(chatId, lines.join('\n'));
});

bot.onText(/^\/status(?:@\w+)?$/, msg => bot.sendMessage(msg.chat.id, queueStatusText()));

bot.onText(/^\/jeda(?:@\w+)?$/, msg => {
  scheduler.pause(true);
  bot.sendMessage(msg.chat.id, 'Sesi otomatis dijeda. Antrean tetap tersimpan.');
});

bot.onText(/^\/lanjut(?:@\w+)?$/, msg => {
  scheduler.resume();
  bot.sendMessage(msg.chat.id, 'Sesi otomatis dilanjutkan.');
});

bot.onText(/^\/hapusantre(?:@\w+)?$/, msg => {
  const n = scheduler.clearPending();
  bot.sendMessage(msg.chat.id, `${n} tugas menunggu dihapus. Tugas yang sedang berjalan dibiarkan selesai.`);
});

bot.onText(/^\/sesi(?:@\w+)?$/, msg => {
  const ready = getReadyAccounts();
  const all = Object.keys(config.profiles);
  bot.sendMessage(msg.chat.id, [
    `Akun siap: ${ready.length}/${all.length}`,
    ready.length ? ready.join(', ') : 'Belum ada sesi. Jalankan: node login.js <namaAkun>',
    'Sesi dianggap siap bila folder profil dan cookies.json tersedia.'
  ].join('\n'));
});

bot.onText(/^\/komen_all(?:@\w+)?\s+(.+)$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const postUrl = match[1].trim();
  const accountKeys = getReadyAccounts();

  if (!postUrl.includes('instagram.com') || accountKeys.length === 0) {
    return bot.sendMessage(chatId, 'Perintah salah atau tidak ada akun siap. Buat sesi dengan node login.js <namaAkun>.');
  }

  await bot.sendMessage(chatId, `Memulai komentar untuk ${accountKeys.length} akun (2 akun sekaligus)...`);
  const results = await runInBatches(accountKeys, 2, postUrl, chatId);
  await bot.sendMessage(chatId, `Semua tugas selesai!\n\nHasil Akhir:\n${results.join('\n')}`);
});

bot.onText(/^\/start(?:@\w+)?$/, msg => {
  bot.sendMessage(msg.chat.id, [
    'Bot siap (OpenRouter Version).',
    '',
    'Perintah:',
    '/antre <URL IG> [akun1,akun2] - masukkan ke sesi otomatis',
    '/status - status antrean',
    '/jeda - hentikan sementara',
    '/lanjut - lanjutkan antrean',
    '/hapusantre - hapus tugas menunggu',
    '/sesi - cek akun yang siap',
    '/komen_all <URL IG> - jalankan sekarang tanpa antrean',
    '',
    `Sesi otomatis ${config.scheduler.enabled ? 'aktif' : 'nonaktif'}.`
  ].join('\n'), { parse_mode: 'Markdown' });
});

if (config.scheduler.enabled) scheduler.start();
console.log(`Bot Telegram berhasil dijalankan. Sesi otomatis: ${config.scheduler.enabled ? 'aktif' : 'nonaktif'}.`);
