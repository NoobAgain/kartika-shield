import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const clamp = (value, min, max, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : fallback;
};

const dayKey = ts => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export class QueueScheduler {
  constructor({ file, runTask, notify, options = {}, now = () => Date.now() }) {
    this.file = file;
    this.runTask = runTask;
    this.notify = notify || (() => {});
    this.now = now;
    this.options = {
      cooldownMin: clamp(options.cooldownMin, 1, 1440, 30),
      dailyMax: clamp(options.dailyMax, 1, 200, 10),
      startDelayMin: clamp(options.startDelayMin, 0, 1440, 2),
      gapMin: clamp(options.gapMin, 0, 1440, 2),
      pollSec: clamp(options.pollSec, 5, 600, 30),
      maxAttempts: clamp(options.maxAttempts, 1, 5, 2),
      retryMin: clamp(options.retryMin, 1, 1440, 10)
    };
    this.timer = null;
    this.busy = false;
    this.state = this.load();
    this.state.tasks.filter(t => t.status === 'running').forEach(t => {
      t.status = 'pending';
      t.dueAt = this.now() + 60000;
    });
    this.save();
  }

  empty() {
    return { paused: false, tasks: [], lastRun: {}, history: [] };
  }

  load() {
    try {
      if (!fs.existsSync(this.file)) return this.empty();
      const raw = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      return {
        paused: !!raw.paused,
        tasks: Array.isArray(raw.tasks) ? raw.tasks : [],
        lastRun: raw.lastRun && typeof raw.lastRun === 'object' ? raw.lastRun : {},
        history: Array.isArray(raw.history) ? raw.history : []
      };
    } catch (err) {
      console.error('Gagal membaca antrean:', err.message);
      return this.empty();
    }
  }

  save() {
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      const tmp = this.file + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(this.state, null, 2));
      fs.renameSync(tmp, this.file);
    } catch (err) {
      console.error('Gagal menyimpan antrean:', err.message);
    }
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick().catch(err => console.error('Antrean:', err.message)), this.options.pollSec * 1000);
    if (this.timer.unref) this.timer.unref();
    this.tick().catch(err => console.error('Antrean:', err.message));
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  pause(on = true) {
    this.state.paused = !!on;
    this.save();
  }

  resume() {
    this.pause(false);
  }

  clearPending() {
    const before = this.state.tasks.filter(t => t.status === 'pending').length;
    this.state.tasks = this.state.tasks.filter(t => t.status !== 'pending');
    this.save();
    return before;
  }

  todayCount(account) {
    const today = dayKey(this.now());
    return this.state.tasks.filter(t => t.account === account && t.status === 'done' && t.finishedAt && dayKey(t.finishedAt) === today).length;
  }

  queue({ accounts, postUrl, chatId, dueAt = 0 }) {
    const now = this.now();
    const base = Math.max(now + this.options.startDelayMin * 60000, Number(dueAt) || 0);
    let prev = 0, added = 0, skipped = 0;
    for (const account of [...new Set(accounts.filter(Boolean))]) {
      if (this.state.tasks.some(t => (t.status === 'pending' || t.status === 'running') && t.account === account && t.postUrl === postUrl)) {
        skipped++;
        continue;
      }
      let due = Math.max(base, (this.state.lastRun[account] || 0) + this.options.cooldownMin * 60000);
      if (prev) due = Math.max(due, prev + this.options.gapMin * 60000);
      this.state.tasks.push({
        id: crypto.randomUUID(), account, postUrl, chatId, status: 'pending', attempts: 0,
        createdAt: now, dueAt: due, startedAt: null, finishedAt: null, error: ''
      });
      prev = due;
      added++;
    }
    this.save();
    return { added, skipped, dueAt: prev || base };
  }

  status() {
    const pending = this.state.tasks.filter(t => t.status === 'pending').sort((a, b) => a.dueAt - b.dueAt);
    const running = this.state.tasks.find(t => t.status === 'running');
    const today = dayKey(this.now());
    return {
      paused: this.state.paused,
      pending: pending.length,
      running: running ? { account: running.account, postUrl: running.postUrl } : null,
      doneToday: this.state.tasks.filter(t => t.status === 'done' && t.finishedAt && dayKey(t.finishedAt) === today).length,
      failedToday: this.state.tasks.filter(t => t.status === 'failed' && t.finishedAt && dayKey(t.finishedAt) === today).length,
      nextDueAt: pending.length ? pending[0].dueAt : null,
      nextAccount: pending.length ? pending[0].account : null,
      total: this.state.tasks.length
    };
  }

  pushHistory(task) {
    if (task.status !== 'done' && task.status !== 'failed') return;
    this.state.history.unshift({
      id: task.id, account: task.account, postUrl: task.postUrl, status: task.status,
      attempts: task.attempts, error: task.error, finishedAt: task.finishedAt
    });
    this.state.history = this.state.history.slice(0, 100);
  }

  async say(task, text) {
    try { await this.notify(task.chatId, text); } catch (err) { console.error('Notifikasi gagal:', err.message); }
  }

  async tick() {
    if (this.busy || this.state.paused) return;
    const now = this.now();
    const task = this.state.tasks
      .filter(t => t.status === 'pending' && t.dueAt <= now)
      .sort((a, b) => a.dueAt - b.dueAt)[0];
    if (!task) return;

    if (this.todayCount(task.account) >= this.options.dailyMax) {
      task.status = 'failed';
      task.finishedAt = now;
      task.error = 'Batas harian akun tercapai';
      this.pushHistory(task);
      this.save();
      await this.say(task, `⏸️ [${task.account}] dilewati: batas harian ${this.options.dailyMax} tercapai.`);
      return;
    }

    this.busy = true;
    task.status = 'running';
    task.startedAt = now;
    task.attempts = (task.attempts || 0) + 1;
    this.save();

    let result;
    try {
      result = await this.runTask(task);
    } catch (err) {
      result = { ok: false, error: err.message || String(err) };
    }

    this.state.lastRun[task.account] = this.now();
    const error = result && result.error ? String(result.error).slice(0, 180) : '';

    if (result && result.ok) {
      task.status = 'done';
      task.finishedAt = this.now();
      task.error = '';
      this.pushHistory(task);
      this.save();
      await this.say(task, `✅ [${task.account}] sesi otomatis selesai.`);
    } else if (task.attempts < this.options.maxAttempts) {
      task.status = 'pending';
      task.dueAt = this.now() + this.options.retryMin * 60000;
      task.error = error || 'Gagal tanpa detail';
      this.save();
      await this.say(task, `⚠️ [${task.account}] gagal, dicoba lagi dalam ${this.options.retryMin} menit: ${task.error}`);
    } else {
      task.status = 'failed';
      task.finishedAt = this.now();
      task.error = error || 'Gagal tanpa detail';
      this.pushHistory(task);
      this.save();
      await this.say(task, `❌ [${task.account}] gagal setelah ${task.attempts} percobaan: ${task.error}`);
    }

    this.busy = false;
    this.save();
  }
}
