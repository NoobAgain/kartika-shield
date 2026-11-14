// Menggabungkan index.html + assets + data + js menjadi SATU berkas mandiri: dist/kartika-shield.html
// Pemakaian: node tools/build.js   (tanpa dependensi, Node 18+)
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
let html = read('index.html');

// CSS
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, f) => '<style>\n' + read(f) + '</style>');
// Skrip lokal (yang bukan http)
html = html.replace(/<script src="((?!https?:)[^"]+)"><\/script>/g, (_, f) => {
  const code = read(f);
  if (/<\/script/i.test(code)) throw new Error('Mengandung </script>: ' + f);
  return '<script>\n' + code + '</script>';
});
// Aset lambang Kodam yang direferensikan dari JavaScript ikut di-inline
// agar dist/kartika-shield.html tetap mandiri saat dibuka tanpa server.
html = html.replace(/(['"])assets\/kodam-insignia\/([^'"]+)\1/g, (_, q, f) => {
  const p = path.join(root, 'assets', 'kodam-insignia', f);
  const b = fs.readFileSync(p);
  const ext = path.extname(f).toLowerCase();
  const type = ext === '.webp' ? 'image/webp' : ext === '.svg' ? 'image/svg+xml' : 'image/png';
  return q + 'data:' + type + ';base64,' + b.toString('base64') + q;
});
// Gambar lokal
html = html.replace(/src='(assets\/[^']+)'/g, (_, f) => {
  const b = fs.readFileSync(path.join(root, f));
  return "src='data:" + (mime[path.extname(f)] || 'application/octet-stream') + ';base64,' + b.toString('base64') + "'";
});
// Favicon lokal
html = html.replace(/<link rel="icon" href="((?!https?:|data:)[^"]+)">/g, (_, f) => {
  const b = fs.readFileSync(path.join(root, f));
  return '<link rel="icon" href="data:' + (mime[path.extname(f)] || 'application/octet-stream') + ';base64,' + b.toString('base64') + '">';
});

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const out = path.join(root, 'dist', 'kartika-shield.html');
fs.writeFileSync(out, html);
console.log('Selesai:', path.relative(process.cwd(), out), (html.length / 1024).toFixed(0) + ' KB');
