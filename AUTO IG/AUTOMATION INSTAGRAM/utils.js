// utils.js
import fs from 'fs';
import path from 'path';
import config from './config.js';

/**
 * Fungsi ini memeriksa file profiles.json dan folder profiles/
 * lalu mengembalikan daftar akun yang sudah siap digunakan (sudah pernah login).
 * @returns {string[]} Array berisi nama akun yang siap, contoh: ['account1', 'account2']
 */
export function getReadyAccounts() {
  const allAccounts = Object.keys(config.profiles);
  const readyAccounts = [];

  for (const accountKey of allAccounts) {
    const configured = config.profiles[accountKey] && config.profiles[accountKey].profileDir;
    const profileDir = configured ? path.resolve(process.cwd(), configured) : path.resolve(process.cwd(), 'profiles', accountKey);
    const cookiesPath = path.join(profileDir, 'cookies.json');
    if (fs.existsSync(profileDir) && fs.existsSync(cookiesPath)) {
      readyAccounts.push(accountKey);
    } else {
      console.warn(`[Peringatan] Akun "${accountKey}" belum punya sesi lengkap (folder + cookies.json). Dilewati.`);
    }
  }

  return readyAccounts;
}