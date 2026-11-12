# Uji keamanan DEFENSIF pada lingkungan lokal. Pemakaian: python3 tests/test_security.py [index.html]
import sys, os, re, json, time, subprocess, http.client, tempfile, glob
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
TARGET = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(ROOT, 'index.html')
RES = []; CTX = []
PAY = ['<img src=x onerror=window.__x=1>', '"><svg/onload=window.__x=1>', "'><script>window.__x=1</script>", '<iframe srcdoc="<script>parent.__x=1</script>">', 'javascript:window.__x=1', '</script><script>window.__x=1</script>']
def T(n):
    def d(fn):
        t0 = time.time()
        try: fn(); RES.append({'nama': n, 'ok': True, 's': round(time.time() - t0, 2)})
        except Exception as e: RES.append({'nama': n, 'ok': False, 's': round(time.time() - t0, 2), 'err': str(e).split('\n')[0][:230]})
        print(('PASS ' if RES[-1]['ok'] else 'FAIL ') + n + ('' if RES[-1]['ok'] else ' -> ' + RES[-1]['err']), flush=True); return fn
    return d
def A(c, m=''):
    if not c: raise AssertionError(m or 'assert gagal')
def clk(pg, s): pg.evaluate("s=>document.querySelector(s).click()", s)
def val(pg, s, v): pg.evaluate("([s,v])=>{const e=document.querySelector(s);e.value=v}", [s, v])
def page(b, pre=None):
    c = b.new_context(accept_downloads=True); CTX.append(c); pg = c.new_page(); pg.set_default_timeout(6000); pg.errs = []; pg.req = []
    pg.on('pageerror', lambda e: pg.errs.append(str(e)))
    def route(r):
        u = r.request.url
        if u.startswith(('file://', 'data:', 'blob:')): r.continue_()
        else: pg.req.append(u); r.abort()
    pg.route('**/*', route)
    if pre: pg.add_init_script(pre)
    pg.on('dialog', lambda d: d.accept()); pg.goto('file://' + TARGET); pg.wait_for_timeout(400); return pg
def bersih():
    for c in CTX:
        try: c.close()
        except Exception: pass
    CTX.clear()
def http_req(port, method, path, headers=None, body=None):
    c = http.client.HTTPConnection('127.0.0.1', port, timeout=5); c.request(method, path, body=body, headers=headers or {}); r = c.getresponse(); d = r.read(2048); st = r.status; hd = dict(r.getheaders()); c.close(); return st, hd, d

with sync_playwright() as p:
    b = p.chromium.launch(args=['--no-sandbox'])
    @T('S01 XSS: teks Analisis Konten (6 payload) tidak dieksekusi dan di-escape')
    def _():
        for pl in PAY:
            pg = page(b); val(pg, '#inp', 'sebarkan sebelum dihapus ' + pl); clk(pg, '#go'); pg.wait_for_timeout(300)
            A(pg.evaluate("window.__x") is None, 'XSS: ' + pl); A(pg.evaluate("document.querySelectorAll('#res img[onerror],#res svg[onload],#res script,#res iframe').length")==0, 'elemen injeksi: ' + pl); bersih()
    @T('S02 XSS: CSV Buzzer (akun, teks, tagar, kode) -> hasil, graf, tabel, laporan')
    def _():
        for pl in PAY:
            pg = page(b); pl2 = pl.replace(' ', '/')
            rows = [f"{pl2[:40]}{i},4,6,420,19:0{i},Awas kelompok tertentu menguasai desa kita sebarkan #tag{pl2} {pl}|JK" for i in range(5)]
            val(pg, '#bin', "\n".join(rows)); clk(pg, '#bgo'); pg.wait_for_timeout(600); clk(pg, '#bpm'); pg.wait_for_timeout(300); clk(pg, '#rgen'); pg.wait_for_timeout(300)
            A(pg.evaluate("window.__x") is None, 'XSS: ' + pl)
            A(pg.evaluate("document.querySelectorAll('#bres img[onerror],#bres svg[onload],#bres script,#bres iframe,#rout img[onerror],#rout script,#rout iframe,#bsvg script,#bsvg image').length")==0, 'elemen injeksi')
            bersih()
    @T('S03 XSS: Peta Dini manual + Laporan Komando (judul, PIC, catatan) + jendela cetak')
    def _():
        pg = page(b); pl = PAY[0]
        val(pg, '#mis', pl); val(pg, '#mvl', '5'); val(pg, '#mrk', '50'); clk(pg, '#madd')
        val(pg, '#rjudul', pl); val(pg, '#rpic', PAY[1]); val(pg, '#rcat', PAY[2]); clk(pg, '#rgen'); pg.wait_for_timeout(300)
        A(pg.evaluate("window.__x") is None); A(pg.evaluate("document.querySelectorAll('#rout img[onerror],#rout svg[onload],#rout script,#mdet img,#mx img').length")==0)
        with pg.context.expect_page(timeout=8000) as pp: clk(pg, '#rprint')
        w = pp.value; w.wait_for_load_state(); w.wait_for_timeout(300); A(w.evaluate("window.__x") is None and w.evaluate("document.querySelectorAll('img[onerror],svg[onload]').length")==0, 'XSS di jendela cetak')
    @T('S04 XSS: pemulihan cadangan berisi payload & kunci prototipe -> tidak dieksekusi, tidak mencemari Object.prototype')
    def _():
        pg = page(b); bad = {"app": "kartika-shield", "format": 1, "dibuat": "2026-11-11T00:00:00Z", "data": {"bs_h": [{"v": PAY[0], "r": 50, "s": False, "t": [PAY[1]], "a": PAY[2], "dir": PAY[0], "i": PAY[3], "c": {"__proto__": 9, "EMOSI": 5}, "d": 1}], "bs_m": [{"p": "JK", "i": PAY[0], "v": 3, "r": 40, "s": False, "__proto__": {"polluted": 1}}]}}
        fn = os.path.join(tempfile.gettempdir(), 'bad_backup.json'); json.dump(bad, open(fn, 'w')); pg.set_input_files('#xfile', fn); pg.wait_for_timeout(1200)
        pg.evaluate("[...document.querySelectorAll('#kw_x button')].filter(b=>/^(Gabungkan|Timpa)/.test(b.textContent)).slice(0,1).forEach(b=>b.click())"); pg.wait_for_timeout(1200)
        pg.wait_for_timeout(2500); pg.evaluate("['d','m','r','a'].forEach(i=>{const e=document.querySelector('#kdock [data-id='+i+']');if(e)e.click()})"); pg.wait_for_timeout(600)
        A(pg.evaluate("window.__x") is None and pg.evaluate("({}).polluted") is None and pg.evaluate("({}).EMOSI") is None, 'XSS atau polusi prototipe'); A(not pg.errs, str(pg.errs))
    @T('S05 CSP: koneksi keluar ke domain eksternal diblokir; tidak ada permintaan jaringan selama alur penuh')
    def _():
        pg = page(b); r = pg.evaluate("""async()=>{try{await fetch('https://example.com/x');return 'lolos'}catch(e){return 'diblokir'}}"""); A(r == 'diblokir', r)
        pg.evaluate("document.querySelector('#bex').click();document.querySelector('#bgo').click()"); pg.wait_for_timeout(500); val(pg, '#inp', 'sebarkan sebelum dihapus'); clk(pg, '#go'); clk(pg, '#rgen'); pg.wait_for_timeout(300)
        eks = [u for u in pg.req if not u.startswith('https://example.com')]; A(not eks, str(eks))
        csp = pg.evaluate("document.querySelector('meta[http-equiv=Content-Security-Policy]').content"); A("object-src 'none'" in csp and "base-uri 'none'" in csp and "form-action 'none'" in csp and 'connect-src' in csp)
    @T('S06 injeksi rumus CSV: sel berawalan = + - @ dinetralkan di semua ekspor CSV')
    def _():
        pg = page(b); val(pg, '#rjudul', "=cmd|' /C calc'!A0"); val(pg, '#rcat', '+SUM(1+1)'); clk(pg, '#mex')
        with pg.expect_download() as d: clk(pg, '#rcsv')
        c = open(d.value.path(), encoding='utf-8-sig').read(); A("'=cmd" in c and "'+SUM" in c, c[:200]); A(not re.search(r'(^|,)"?[=+@]', c.replace("'=", '').replace("'+", '')), 'sel rumus mentah ada')
    @T('S07 DoS: CSV 30.000 baris dipotong ke batas dan selesai < 25 dtk; baris 100 KB dipotong')
    def _():
        pg = page(b); rows = "\n".join(f"u{i},{30+i%900},100,100,{(i*3)%24:02d}:{i%60:02d},warga kelurahan{i%500} melaporkan kejadian{i%500} hari ke{i%30} semoga cepat ditangani" for i in range(30000))
        t0 = time.time(); val(pg, '#bin', rows); clk(pg, '#bgo'); pg.wait_for_selector('#btn', state='attached', timeout=60000); dt = time.time() - t0
        t = pg.inner_text('#bq'); A('dibatasi 20000' in t, t[:200]); A(dt < 25, f'{dt:.1f}s')
        pg2 = page(b); val(pg2, '#bin', "x,1,1,1,10:00," + "a" * 100000); clk(pg2, '#bgo'); pg2.wait_for_timeout(500); A(pg2.evaluate("parseBV('x,1,1,1,10:00,'+'a'.repeat(100000)).rows[0].tx.length")==2000)
    @T('S08 kunci berbahaya (__proto__/constructor) sebagai akun/teks tidak merusak UI')
    def _():
        pg = page(b); tx = 'awas constructor __proto__ kelompok tertentu menguasai desa kita sebarkan'
        val(pg, '#bin', "\n".join(f"{n},4,6,420,19:0{i},{tx}" for i, n in enumerate(['__proto__', 'constructor', 'toString', 'hasOwnProperty', 'valueOf']))); clk(pg, '#bgo'); pg.wait_for_selector('#btn', state='attached'); A(not pg.errs, str(pg.errs)); A(pg.evaluate("({}).x")is None)
    b.close()

    def collector_tests():
        env = dict(os.environ, PORT='8792', BOT_AUTO='0', RSS_URLS='', JETSTREAM='ws://127.0.0.1:9/subscribe', MAX_CLIENTS='3')
        pr = subprocess.Popen(['node', os.path.join(ROOT, 'collector/server.js')], env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT); time.sleep(1.5)
        try:
            @T('S09 kolektor: /stats 200 JSON; /events text/event-stream')
            def _():
                st, hd, d = http_req(8792, 'GET', '/stats'); A(st == 200 and json.loads(d.decode())['bot'] is not None)
                c = http.client.HTTPConnection('127.0.0.1', 8792, timeout=3); c.request('GET', '/events'); r = c.getresponse(); A(r.status == 200 and 'text/event-stream' in r.getheader('Content-Type')); c.close()
            @T('S10 kolektor: Host asing ditolak (anti DNS rebinding)')
            def _():
                st, _, _ = http_req(8792, 'GET', '/stats', {'Host': 'evil.example.com'}); A(st == 403, st)
            @T('S11 kolektor: POST dari Origin asing / tanpa JSON ditolak (anti CSRF); Origin asing tidak mendapat header CORS')
            def _():
                st, hd, _ = http_req(8792, 'POST', '/bot/config', {'Origin': 'https://evil.example.com', 'Content-Type': 'application/json'}, '{"auto":true}'); A(st == 403, st); A('Access-Control-Allow-Origin' not in hd and 'access-control-allow-origin' not in {k.lower() for k in hd})
                st, _, _ = http_req(8792, 'POST', '/bot/config', {'Content-Type': 'text/plain'}, '{"auto":true}'); A(st == 403, st)
                st, hd, _ = http_req(8792, 'GET', '/stats', {'Origin': 'https://evil.example.com'}); A('access-control-allow-origin' not in {k.lower() for k in hd})
            @T('S12 kolektor: path traversal & path tak dikenal -> 404 (tidak ada berkas statis)')
            def _():
                for pth in ['/../../etc/passwd', '/%2e%2e/%2e%2e/etc/passwd', '/..%2f..%2fetc/passwd', '/index.html', '/collector/server.js', '/.env']:
                    st, _, d = http_req(8792, 'GET', pth); A(st == 404 and b'root:' not in d, f'{pth} -> {st}')
            @T('S13 kolektor: body > 64 KB -> 413; JSON rusak -> 400; metode PUT/DELETE tidak mengubah status')
            def _():
                st, _, _ = http_req(8792, 'POST', '/bot/config', {'Content-Type': 'application/json'}, json.dumps({'keywords': 'a' * 70000})); A(st in (413, 400), st)
                st, _, _ = http_req(8792, 'POST', '/bot/config', {'Content-Type': 'application/json'}, '{rusak'); A(st == 400, st)
                for m in ['PUT', 'DELETE']: st, _, _ = http_req(8792, m, '/bot/config', {'Content-Type': 'application/json'}, '{}'); A(st in (403, 404, 405), (m, st))
            @T('S14 kolektor: batas klien SSE (MAX_CLIENTS=3) -> klien ke-4 ditolak 503')
            def _():
                cs = []
                for i in range(3): c = http.client.HTTPConnection('127.0.0.1', 8792, timeout=3); c.request('GET', '/events'); r = c.getresponse(); A(r.status == 200); cs.append(c)
                st, _, _ = http_req(8792, 'GET', '/events'); A(st == 503, st); [c.close() for c in cs]
            @T('S15 kolektor: konfigurasi bot tervalidasi (interval dibatasi 1..120, kata kunci dibatasi)')
            def _():
                st, _, d = http_req(8792, 'POST', '/bot/config', {'Content-Type': 'application/json'}, json.dumps({'intervalMin': 99999, 'keywords': ','.join(f'k{i}' for i in range(50))})); j = json.loads(d.decode()); b = j['bot']
                A(st == 200 and b['intervalMin'] <= 120 and len(b['keywords']) <= 8, str(b)[:200])
        finally: pr.terminate()
    collector_tests()

    @T('S16 pemindaian rahasia: tidak ada kunci/token/PEM tertanam pada kode & data (selain gambar base64)')
    def _():
        pat = re.compile(r'AIza[0-9A-Za-z_-]{30,}|\b[0-9]{8,10}:[A-Za-z0-9_-]{35}\b|EAA[A-Za-z0-9]{30,}|sk-[A-Za-z0-9]{30,}|BEGIN (RSA |EC )?PRIVATE KEY|ghp_[A-Za-z0-9]{30,}')
        bad = []
        for dp, dn, fn in os.walk(ROOT):
            dn[:] = [d for d in dn if d not in ('node_modules', 'dist', '.git')]
            for f in fn:
                if f in ('logos.js', 'world.js', 'provinces.js') or f.endswith(('.png', '.webp', '.jpg', '.zip')): continue
                try: t = open(os.path.join(dp, f), encoding='utf-8', errors='ignore').read()
                except Exception: continue
                if pat.search(t): bad.append(f)
        A(not bad, str(bad))
    @T('S17 tanpa komponen AI: tak ada pustaka/endpoint/objek AI pada kode aplikasi (js, collector, index.html)')
    def _():
        pat = re.compile(r'claude\.use|sample\(|\bsample\.json|anthropic|openai|gemini|ollama|generativelanguage|api\.openai|chat/completions', re.I); bad = []
        for f in glob.glob(ROOT + '/js/*.js') + glob.glob(ROOT + '/collector/*.js') + [ROOT + '/index.html']:
            t = open(f, encoding='utf-8').read()
            for m in pat.finditer(t): bad.append((os.path.basename(f), m.group(0)))
        A(not bad, str(bad))
    @T('S18 tanpa otomasi interaksi media sosial / anti-deteksi: tak ada puppeteer/stealth/login/komentar-otomatis pada paket')
    def _():
        bad = []
        for dp, dn, fn in os.walk(ROOT):
            dn[:] = [d for d in dn if d not in ('node_modules', 'dist', '.git', 'tests', 'hasil')]
            for f in fn:
                if f.endswith(('.js', '.json', '.md', '.html')) and f not in ('d3.min.js', 'topojson-client.min.js', 'AUDIT_BASELINE.md', 'CHANGELOG.md', 'TEST_REPORT.md', 'ARCHITECTURE.md', 'LAPORAN_AUDIT_KARTIKA_SHIELD.md', 'README.md', 'INSTALLATION.md', 'USAGE.md', 'API.md'):
                    t = open(os.path.join(dp, f), encoding='utf-8', errors='ignore').read()
                    if re.search(r'puppeteer|plugin-stealth|anti-?deteksi|auto-?comment|komentar otomatis|instagram\.com/accounts/login', t, re.I): bad.append(f)
        A(not os.path.exists(os.path.join(ROOT, 'AUTO IG')), 'folder AUTO IG masih ada'); A(not bad, str(bad))
    @T('S19 kolektor tidak memakai dependensi pihak ketiga (package.json bersih) dan pustaka klien memakai berkas lokal (vendor/)')
    def _():
        pj = json.load(open(os.path.join(ROOT, 'collector/package.json'))); A(not pj.get('dependencies')); A(os.path.exists(os.path.join(ROOT, 'vendor/d3.min.js')) and os.path.exists(os.path.join(ROOT, 'vendor/topojson-client.min.js')))
        A('cdn.' not in open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read())
out = {'target': os.path.basename(TARGET), 'total': len(RES), 'lulus': sum(r['ok'] for r in RES), 'hasil': RES}
print(f"\n{out['lulus']}/{out['total']} lulus"); json.dump(out, open(os.path.join(ROOT, 'eval/hasil/security.json'), 'w'), indent=1, ensure_ascii=False); sys.exit(0 if out['lulus'] == out['total'] else 1)
