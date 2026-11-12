// Kolektor TIRUAN untuk uji klien Feed: mengirim event SSE 'hit' berformat sama dengan collector/server.js. Data SINTETIS.
const http = require('http'); const PORT = +process.argv[2] || 8791;
const hits = [
  { type: 0, risk: 82, text: 'VIRAL!!! Sebarkan sebelum dihapus, kelompok tertentu menguasai desa', city: 'Jakarta', src: 'Bluesky', sara: true, acct: 'ab12cd34' },
  { type: 3, risk: 40, text: '=HYPERLINK("http://evil.test","klik") <img src=x onerror="window.__xss=1"> sebarkan', city: 'Surabaya', src: 'Bluesky Bot', acct: 'ee99ff00' },
  { type: 1, risk: 61, text: 'Berita sama dimuat lintas penerbit', city: 'Makassar', src: 'Agregasi Berita', viral: { n: 3 } }
];
http.createServer((q, r) => {
  const h = { 'Access-Control-Allow-Origin': q.headers.origin || '*' };
  if (q.url === '/events') { r.writeHead(200, Object.assign({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' }, h)); r.write('event: stat\ndata: ' + JSON.stringify({ seen: 10, id: 3, flagged: 3, viral: 1 }) + '\n\n'); hits.forEach((x, i) => setTimeout(() => r.write('event: hit\ndata: ' + JSON.stringify(Object.assign({ ts: new Date().toISOString() }, x)) + '\n\n'), 100 + i * 100)); return; }
  r.writeHead(200, Object.assign({ 'Content-Type': 'application/json' }, h)); r.end(JSON.stringify({ ok: true, bot: { auto: false, keywords: [], interval: 10 } }));
}).listen(PORT, '127.0.0.1');
