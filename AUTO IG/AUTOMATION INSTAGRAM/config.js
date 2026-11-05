// config.js (Updated for OpenRouter)
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// --- Setup path __dirname karena di ESM tidak otomatis tersedia
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Load environment variables dari .env
dotenv.config();

// --- Validasi Environment Variables
const requiredEnv = ['TELEGRAM_TOKEN', 'OPENROUTER_API_KEY'];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`❌ Error: Environment variable ${key} tidak ditemukan di file .env`);
    process.exit(1);
  }
}

// --- Buat objek config dasar
const config = {
  telegramToken: process.env.TELEGRAM_TOKEN,
  openRouter: {
    apiKey: process.env.OPENROUTER_API_KEY,
    // Gunakan endpoint standar OpenRouter (kompatibel dengan OpenAI API)
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    model: process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash",
    siteUrl: "https://my-telegram-bot.local", // Optional headers untuk OpenRouter
    appName: "InstagramAutoBot" // Optional headers untuk OpenRouter
  },
  scheduler: {
    enabled: process.env.SCHEDULER_ENABLED !== '0',
    cooldownMin: +process.env.SCHEDULER_COOLDOWN_MIN || 30,
    dailyMax: +process.env.SCHEDULER_DAILY_MAX || 10,
    startDelayMin: +process.env.SCHEDULER_START_DELAY_MIN || 2,
    gapMin: +process.env.SCHEDULER_GAP_MIN || 2,
    pollSec: +process.env.SCHEDULER_POLL_SEC || 30,
    maxAttempts: +process.env.SCHEDULER_MAX_ATTEMPTS || 2,
    retryMin: +process.env.SCHEDULER_RETRY_MIN || 10
  },
  profiles: {}
};

// --- Memuat profil dari profiles.json
try {
  const profilesPath = path.join(__dirname, 'profiles.json');
  if (fs.existsSync(profilesPath)) {
    const fileData = fs.readFileSync(profilesPath, 'utf-8');
    config.profiles = JSON.parse(fileData);

    if (Object.keys(config.profiles).length === 0) {
      console.warn('⚠️  Peringatan: file profiles.json kosong atau belum diisi akun.');
    }
  } else {
    console.warn('⚠️  File profiles.json tidak ditemukan. Pastikan Anda membuatnya.');
  }
} catch (error) {
  console.error('❌ Error: Gagal membaca atau mem-parse profiles.json:', error.message);
  process.exit(1);
}

export default config;