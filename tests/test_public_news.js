'use strict';
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');
const feed = `<?xml version="1.0"?><rss><channel>
<item><title>Hujan deras melanda Jakarta Selatan</title><link>https://publisher.example/jakarta-hujan</link><description>Berita publik mengenai kondisi cuaca di Jakarta.</description><pubDate>Thu, 12 Nov 2026 08:00:00 GMT</pubDate><source>Media Uji</source></item>
<item><title>Festival budaya berlangsung meriah</title><link>https://publisher.example/festival</link><description>Kegiatan budaya berlangsung di berbagai daerah.</description><pubDate>Thu, 12 Nov 2026 07:00:00 GMT</pubDate></item>
</channel></rss>`;
(async () => {
  const mock = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'application/rss+xml' }); r.end(feed); });
  await new Promise(resolve => mock.listen(8890, '127.0.0.1', resolve));
  const store = path.join(os.tmpdir(), `ks-news-${process.pid}.json`);
  const startCollector = () => spawn(process.execPath, ['collector/server.js'], { cwd: path.join(__dirname, '..'), env: { ...process.env, HOST: '127.0.0.1', PORT: '8788', RSS_URLS: 'http://127.0.0.1:8890/feed', BOT_AUTO: '0', NEWS_STORE: store } });
  let child = startCollector(), log = ''; child.stderr.on('data', x => log += x); child.stdout.on('data', x => log += x);
  try {
    let data;
    for (let i = 0; i < 30; i++) {
      try { const r = await fetch('http://127.0.0.1:8788/news?limit=10'); if (r.ok) { data = await r.json(); if (data.count >= 2) break; } } catch (e) {}
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    assert(data && data.ok, 'endpoint /news harus merespons');
    assert.strictEqual(data.count, 2, 'dua artikel RSS harus terbaca');
    const mapped = data.items.find(x => x.title.includes('Jakarta'));
    assert(mapped, 'artikel Jakarta harus ada');
    assert.strictEqual(mapped.province, 'JK', 'lokasi Jakarta harus terpetakan');
    assert.strictEqual(mapped.url, 'https://publisher.example/jakarta-hujan', 'tautan asli harus dipertahankan');
    assert.strictEqual(mapped.source, 'Media Uji', 'nama penerbit harus dipertahankan');
    assert(mapped.publishedAt, 'tanggal publikasi harus diparse');
    assert(mapped.analysis && ['AMAN','WASPADA','SIAGA','KRITIS'].includes(mapped.analysis.status), 'analisis awal lokal harus tersedia');
    assert(Number.isFinite(mapped.analysis.riskScore) && Number.isFinite(mapped.analysis.confidenceScore), 'risk dan confidence score harus tersedia');
    const unmapped = data.items.find(x => x.title.includes('Festival'));
    assert.strictEqual(unmapped.province, null, 'artikel tanpa petunjuk wilayah tidak boleh ditebak');
    assert(fs.existsSync(store), 'metadata berita harus tersimpan persisten');
    const saved = JSON.parse(fs.readFileSync(store, 'utf8'));
    assert.strictEqual(saved.length, 2, 'arsip lokal harus berisi dua artikel');
    assert(saved.every(x => x.analysis && x.analysis.method === 'local_rules_preliminary'), 'analisis awal harus ikut tersimpan di JSON');
    child.kill(); await new Promise(resolve => child.once('exit', resolve));
    child = startCollector(); child.stderr.on('data', x => log += x); child.stdout.on('data', x => log += x);
    let restarted;
    for (let i = 0; i < 30; i++) { try { const r = await fetch('http://127.0.0.1:8788/news?limit=10'); if (r.ok) { restarted = await r.json(); break; } } catch (e) {} await new Promise(resolve => setTimeout(resolve, 150)); }
    assert(restarted && restarted.totalStored === 2, 'Collector restart tidak boleh menggandakan arsip RSS yang sama');
    console.log('PASS RSS provenance, local analysis, risk/confidence, province mapping, persistence, restart deduplication');
  } catch (e) { console.error('FAIL public news:', e.message, log); process.exitCode = 1; }
  finally { child.kill(); mock.close(); try { fs.unlinkSync(store); } catch (e) {} }
})();
