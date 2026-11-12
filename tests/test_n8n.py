# Uji integrasi n8n (klien). Endpoint n8n DITIRUKAN lewat Playwright route; ini menguji kode dasbor,
# bukan workflow n8n sungguhan. Pemakaian: python3 tests/test_n8n.py [index.html|dist/kartika-shield.html]
import sys, os, json, time, subprocess, re
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
TARGET = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'index.html'))
AN = 'https://adamsmaulanaa.app.n8n.cloud/webhook/kartika-shield-analyze'
RV = 'https://adamsmaulanaa.app.n8n.cloud/webhook/kartika-shield-review'
BAD = "VIRAL!!! Segera sebarkan ke semua grup! Kelompok tertentu akan menguasai desa kita dan menghancurkan rumah ibadah. Pemerintah menutupi semuanya, media tidak berani menayangkan. Share sebelum dihapus!!!"
OKJ = {'rule_score': 94, 'ai_score': 80, 'final_score': 86, 'risk_level': 'tinggi', 'narrative_direction': 'menyerang', 'target': 'pemerintah', 'summary': 'Ringkasan uji.', 'knowledge_used': []}
RES = []; reqs = []
CORS = {'access-control-allow-origin': '*', 'access-control-allow-headers': '*'}

def page(b, handler):
    ctx = b.new_context(viewport={'width': 1280, 'height': 900}); pg = ctx.new_page(); pg.set_default_timeout(8000)
    pg.errs = []; pg.cons = []; pg.reqs = []
    pg.on('pageerror', lambda e: pg.errs.append(str(e)))
    pg.on('console', lambda m: pg.cons.append((m.type, m.text)))
    def route(r):
        u = r.request.url
        if u.startswith(('file://', 'data:', 'blob:')) or re.match(r'http://127\.0\.0\.1:\d+', u): return r.continue_()
        if u in (AN, RV):
            pg.reqs.append({'url': u, 'method': r.request.method, 'headers': r.request.headers, 'body': r.request.post_data})
            return handler(r, u)
        r.abort()
    pg.route('**/*', route); pg.goto('file://' + TARGET); pg.wait_for_timeout(400); return pg

def ok_handler(r, u):
    if u == AN: r.fulfill(status=200, content_type='application/json', headers=CORS, body=json.dumps(OKJ))
    else: r.fulfill(status=200, content_type='text/plain', headers=CORS, body='ok')

def go(pg, text=BAD):
    pg.evaluate("([s,v])=>{const e=document.querySelector(s);e.value=v}", ['#inp', text])
    pg.evaluate("document.querySelector('#go').click()"); pg.wait_for_selector('#res .verdict', state='attached', timeout=12000); pg.wait_for_timeout(200)

def T(nama):
    def deco(fn):
        t0 = time.time()
        try: fn(); RES.append((nama, True, ''))
        except Exception as e: RES.append((nama, False, str(e).split('\n')[0][:240]))
        print(('PASS ' if RES[-1][1] else 'FAIL ') + nama + ('' if RES[-1][1] else ' -> ' + RES[-1][2]), flush=True)
        return fn
    return deco
def A(c, m=''):
    if not c: raise AssertionError(m or 'assert gagal')

with sync_playwright() as p:
    b = p.chromium.launch(args=['--no-sandbox'])
    MOCK = subprocess.Popen(['node', os.path.join(HERE, 'mock_collector.js'), '8791']); time.sleep(0.6)
    try:
        @T('N01 online: badge "AI online", skor akhir/risiko/arah/target/ringkasan tampil; permintaan benar')
        def _():
            pg = page(b, ok_handler); go(pg); t = pg.inner_text('#ksai')
            A('AI online' in t and 'Offline' not in t, t)
            for s in ['86', 'tinggi', 'menyerang', 'pemerintah', 'Ringkasan uji.']: A(s in t, 'hilang: ' + s + ' | ' + t)
            posts = [r for r in pg.reqs if r['url'] == AN and r['method'] == 'POST']; A(len(posts) == 1, 'jumlah POST analisis: %d' % len(posts))
            body = json.loads(posts[0]['body']); A(set(body) == {'case_id', 'text', 'rule_score', 'indicators', 'source', 'region'}, str(set(body)))
            A(re.match(r'^ks-\d+-\w+$', body['case_id']), body['case_id']); A(body['text'] == BAD); A(isinstance(body['indicators'], list) and body['indicators'])
            A(0 <= body['rule_score'] <= 100, 'rule_score'); A(posts[0]['headers'].get('content-type', '').startswith('application/json'))
            A('x-ks-key' not in posts[0]['headers'], 'x-ks-key terkirim padahal kosong'); A(not pg.errs, str(pg.errs))
            # skor aturan tidak berubah & case_id tersimpan di riwayat
            h = pg.evaluate("JSON.parse(localStorage.bs_h)"); A(h[0]['id'] == body['case_id'], 'case_id tidak tersimpan')
            A(h[0]['r'] == body['rule_score'] == pg.evaluate("KS.teks.analisis(%s).risk" % json.dumps(BAD)), 'skor aturan berubah')
            A('RISIKO TINGGI' in pg.inner_text('#res'), 'tampilan lama hilang')
        @T('N02 offline (jaringan mati): badge "Offline (aturan lokal)", hasil lokal tetap lengkap, tanpa pageerror')
        def _():
            pg = page(b, lambda r, u: r.abort('internetdisconnected')); go(pg); A('Offline (aturan lokal)' in pg.inner_text('#ksai')); A('AI online' not in pg.inner_text('#res'))
            A('Indikator kognitif' in pg.inner_text('#res') and 'RISIKO TINGGI' in pg.inner_text('#res')); A(not pg.errs, str(pg.errs))
        @T('N03 HTTP 500 -> offline')
        def _():
            pg = page(b, lambda r, u: r.fulfill(status=500, headers=CORS, body='x')); go(pg); A('Offline (aturan lokal)' in pg.inner_text('#ksai')); A(not pg.errs, str(pg.errs))
        @T('N04 JSON rusak / bentuk salah -> offline')
        def _():
            pg = page(b, lambda r, u: r.fulfill(status=200, content_type='application/json', headers=CORS, body='{rusak')); go(pg); A('Offline (aturan lokal)' in pg.inner_text('#ksai')); A(not pg.errs, str(pg.errs))
            pg = page(b, lambda r, u: r.fulfill(status=200, content_type='application/json', headers=CORS, body='{"foo":1}')); go(pg); A('Offline (aturan lokal)' in pg.inner_text('#ksai')); A(not pg.errs, str(pg.errs))
        @T('N05 timeout (AbortController) -> offline')
        def _():
            pg = page(b, lambda r, u: None)  # permintaan sengaja digantung
            pg.evaluate("KS_CONFIG.timeoutMs=700"); t0 = time.time(); go(pg); A('Offline (aturan lokal)' in pg.inner_text('#ksai')); A(time.time() - t0 < 6); A(not pg.errs, str(pg.errs))
        @T('N06 balasan n8n berisi HTML/skrip di-escape (XSS tidak dieksekusi)')
        def _():
            ev = dict(OKJ, summary='<img src=x onerror="window.__x=1"><script>window.__x=2</script>', target='<b>t</b>')
            pg = page(b, lambda r, u: r.fulfill(status=200, content_type='application/json', headers=CORS, body=json.dumps(ev))); go(pg); pg.wait_for_timeout(300)
            A(pg.evaluate("window.__x") is None, 'XSS dieksekusi'); A(pg.evaluate("document.querySelectorAll('#ksai img, #ksai script').length") == 0, 'tag img/script dari balasan menjadi elemen'); A('<img src=x' in pg.inner_text('#ksai'), 'teks mentah tidak tampil sebagai teks'); A('<b>t</b>' in pg.inner_text('#ksai'), 'target tidak di-escape')
        @T('N07 header x-ks-key dikirim bila KS_CONFIG.apiKey terisi')
        def _():
            pg = page(b, ok_handler); pg.evaluate("KS_CONFIG.apiKey='rahasia-uji'"); go(pg); A(pg.reqs[0]['headers'].get('x-ks-key') == 'rahasia-uji', str(pg.reqs[0]['headers']))
        @T('N08 Feed: tombol Tepat/Salah tandai -> POST tinjauan {case_id,label}; case_id sama dengan data kasus')
        def _():
            pg = page(b, ok_handler); pg.evaluate("document.querySelector('#fk').value='http://127.0.0.1:8791'"); pg.evaluate("document.querySelector('#fkc').click()"); pg.wait_for_timeout(1500)
            A(pg.evaluate("fAll.length") >= 3, 'hit tidak masuk')
            ids = pg.evaluate("fAll.map(x=>x.id)"); A(all(re.match(r'^ks-\d+-\w+$', i or '') for i in ids), str(ids))
            pg.evaluate("document.querySelectorAll('#flist button[data-v=\"1\"]')[0].click()"); pg.wait_for_timeout(600)
            pg.evaluate("document.querySelectorAll('#flist button[data-v=\"0\"]')[1].click()"); pg.wait_for_timeout(600)
            rv = [json.loads(r['body']) for r in pg.reqs if r['url'] == RV]; A(len(rv) == 2, 'jumlah POST tinjauan: %d' % len(rv))
            A(all(set(x) == {'case_id', 'label'} for x in rv)); A({x['label'] for x in rv} == {'tepat', 'salah_tandai'}, str(rv)); A(all(x['case_id'] in ids for x in rv))
            A(pg.evaluate("fRev.length") == 2 and 'Tinjauan terkirim' in pg.inner_text('body')); A(not pg.errs, str(pg.errs))
        @T('N09 Feed: workflow tinjauan belum aktif (404) / jaringan mati -> toast tenang, UI tidak terblokir, tinjauan lokal tetap tercatat')
        def _():
            for h in (lambda r, u: r.fulfill(status=404, headers=CORS, body='not registered'), lambda r, u: r.abort('internetdisconnected')):
                pg = page(b, h); pg.evaluate("document.querySelector('#fk').value='http://127.0.0.1:8791'"); pg.evaluate("document.querySelector('#fkc').click()"); pg.wait_for_timeout(1500)
                pg.evaluate("document.querySelectorAll('#flist button[data-v=\"1\"]')[0].click()"); pg.wait_for_timeout(700)
                A('belum terkirim' in pg.inner_text('body'), 'toast tidak muncul'); A(pg.evaluate("fRev.length") == 1, 'tinjauan lokal hilang'); A('Tercatat' in pg.inner_text('#flist')); A(not pg.errs, str(pg.errs))
        @T('N10 Pusat Data: cadangan JSON tetap valid dengan field id baru (pulihkan tidak membuang data)')
        def _():
            pg = page(b, ok_handler); go(pg)
            r = pg.evaluate("(()=>{const b=xBuild();const v=xValidate(JSON.parse(JSON.stringify(b)));return [v.ok,v.per.bs_h.bad,v.per.bs_h.n]})()"); A(r == [True, 0, 1], str(r))
        @T('N11 kontrol: CSP asli (tanpa domain n8n) memblokir webhook -> bukti perubahan CSP memang perlu')
        def _():
            src = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read().replace(' https://adamsmaulanaa.app.n8n.cloud;', ';')
            tmp = os.path.join(ROOT, '_tmp_csp.html'); open(tmp, 'w', encoding='utf-8').write(src)
            try:
                global TARGET; old = TARGET; TARGET = tmp
                pg = page(b, ok_handler); TARGET = old; go(pg)
                A('Offline (aturan lokal)' in pg.inner_text('#ksai'), 'harusnya offline karena CSP'); A(len(pg.reqs) == 0, 'permintaan lolos CSP?')
                A(any('Content Security Policy' in t or 'Refused to connect' in t for _, t in pg.cons), 'tidak ada pesan CSP di konsol')
            finally: os.path.exists(tmp) and os.remove(tmp)
    finally:
        MOCK.terminate(); b.close()
n = sum(1 for r in RES if r[1]); print('\n%d/%d lulus [%s]' % (n, len(RES), os.path.basename(TARGET))); sys.exit(0 if n == len(RES) else 1)
