'use strict';
const assert = require('node:assert/strict');
const http = require('node:http');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const root = path.resolve(__dirname, '..');
const mockPort = 18891 + Math.floor(Math.random() * 300);
const appPort = mockPort + 400;
const now = Date.now();
const posts = [0, 1, 2].map(i => ({
  uri: `at://did:plc:testaccount${i}/app.bsky.feed.post/post${i}`,
  indexedAt: new Date(now - i * 30000).toISOString(),
  record: { createdAt: new Date(now - i * 30000).toISOString(), text: 'Informasi layanan publik di Jakarta perlu diperiksa bersama sumber resmi dan data terbuka.' },
  author: { did: `did:plc:testaccount${i}`, handle: i === 2 ? 'handle.invalid' : (i === 1 ? 'public-user-12345.bsky.social' : `public-user-${i}.bsky.social`), createdAt: new Date(now - 365 * 86400000).toISOString(), followersCount: 120 + i, followsCount: 80 + i }
}));
let fallbackRequests = 0;
const mock = http.createServer((req, res) => {
  if (req.url.startsWith('/fallback/')) fallbackRequests++;
  else { res.writeHead(403, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Forbidden' })); return; }
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ posts, cursor: null }));
});
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(url) { const r = await fetch(url); return { status: r.status, json: await r.json() }; }
(async () => {
  let child;
  try {
    await new Promise(resolve => mock.listen(mockPort, '127.0.0.1', resolve));
    child = spawn(process.execPath, ['collector/server.js'], {
      cwd: root,
      env: { ...process.env, PORT: String(appPort), HOST: '127.0.0.1', RSS_URLS: 'off', BOT_AUTO: '0', BOT_KEYWORDS: 'layanan publik', BOT_BSKY_ENDPOINT: `http://127.0.0.1:${mockPort}/xrpc/app.bsky.feed.searchPosts`, BOT_BSKY_FALLBACK_ENDPOINT: `http://127.0.0.1:${mockPort}/fallback/xrpc/app.bsky.feed.searchPosts`, ANON_SALT: 'test-salt-stable' },
      stdio: 'ignore'
    });
    let ready = false;
    for (let i = 0; i < 40; i++) { try { const h = await get(`http://127.0.0.1:${appPort}/health`); if (h.status === 200) { ready = true; break; } } catch {} await sleep(100); }
    assert.ok(ready, 'Collector starts');
    const start = await fetch(`http://127.0.0.1:${appPort}/bot/search`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ auto: false }) });
    assert.equal(start.status, 202, 'manual trigger accepted');
    let data;
    for (let i = 0; i < 60; i++) { const r = await get(`http://127.0.0.1:${appPort}/buzzer/data?limit=10`); data = r.json; if (data.count === 3) break; await sleep(150); }
    assert.equal(data.ok, true);
    assert.equal(data.source, 'Bluesky public search');
    assert.equal(data.count, 3, 'three public posts collected');
    const x = data.items[0];
    assert.match(x.account, /^akun_[a-f0-9]{10}$/);
    assert.equal(typeof x.ageDays, 'number');
    assert.equal(typeof x.followers, 'number');
    assert.equal(typeof x.following, 'number');
    assert.equal(typeof x.namePattern, 'boolean');
    assert.ok(data.items.some(item => item.namePattern === true), 'numeric pattern comes from the original public handle');
    assert.equal(x.provinceCode, 'JK');
    assert.equal(x.locationBasis, 'nama_wilayah_disebut_dalam_teks');
    assert.match(x.postUrl, /^https:\/\/bsky\.app\/profile\//);
    assert.ok(fallbackRequests > 0, '403 on primary search endpoint falls back');
    assert.ok(data.items.every(item => !String(item.postUrl).includes('handle.invalid')), 'invalid synthetic handles are not used in source links');
    const fallbackUrl = data.items.find(item => item.postUrl.includes('did%3Aplc%3Atestaccount2'));
    assert.ok(fallbackUrl, 'invalid handle falls back to the public DID profile route');
    const status = await get(`http://127.0.0.1:${appPort}/bot/status`);
    assert.equal(status.json.lastErrors, 0, 'successful fallback is not reported as a failed keyword');
    assert.equal(status.json.lastFound, 3, 'run status exposes newly collected count');
    assert.equal(JSON.stringify(data).includes('did:plc:testaccount'), false, 'raw DID not exposed in data payload');
    const ui = fs.readFileSync(path.join(root, 'js/03-buzzer.js'), 'utf8');
    assert.match(ui, /await bAutoApi\('\/bot\/search'/, 'button waits for online search request');
    assert.match(ui, /const r = runB\(rows\); lastR = r; showB\(r\); kBuzz\(r\)/, 'automatic data uses the same full renderer as manual analysis');
    assert.match(ui, /bAutoAnalyze\(\{ \.\.\.st, manual: true \}\)/, 'manual trigger forces analysis after collection');
    assert.match(ui, /polaNama: x\.namePattern === true/, 'automatic pseudonym does not generate fake numeric-name signals');
    assert.match(ui, /excluded\.missingProfile\+\+;\s*const w = KS\.narasi\.parseWaktu/, 'missing profile data is recorded but not used to discard a valid post');
    console.log('PASS automatic buzzer: 403 fallback, source/profile data, pseudonymization, full shared analysis pipeline, status reporting');
  } catch (e) {
    console.error('FAIL automatic buzzer collection:', e.message);
    process.exitCode = 1;
  } finally {
    if (child) child.kill();
    await new Promise(resolve => mock.close(resolve));
  }
})();
