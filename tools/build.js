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
// Gambar lokal
html = html.replace(/src='(assets\/[^']+)'/g, (_, f) => {
  const b = fs.readFileSync(path.join(root, f));
  return "src='data:" + (mime[path.extname(f)] || 'application/octet-stream') + ';base64,' + b.toString('base64') + "'";
});

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const out = path.join(root, 'dist', 'kartika-shield.html');
fs.writeFileSync(out, html);
console.log('Selesai:', path.relative(process.cwd(), out), (html.length / 1024).toFixed(0) + ' KB');
