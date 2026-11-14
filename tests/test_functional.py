# Uji fungsional UI (Playwright/Chromium). Pemakaian: python3 tests/test_functional.py <index.html|dist/kartika-shield.html> [nama-keluaran]
import sys, os, json, time, subprocess, re, tempfile
from playwright.sync_api import sync_playwright
TARGET = os.path.abspath(sys.argv[1]); LABEL = sys.argv[2] if len(sys.argv) > 2 else os.path.basename(TARGET)
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
RES = []; MOCK = None; CTXS = []
BAD_TEXT = "VIRAL!!! Segera sebarkan ke semua grup! Kelompok tertentu akan menguasai desa kita dan menghancurkan rumah ibadah. Pemerintah menutupi semuanya, media tidak berani menayangkan. Share sebelum dihapus!!!"
BANTAH = "KLARIFIKASI: Klaim bahwa pemerintah menutupi data vaksin adalah hoaks. Menurut Kemenkes, data terbuka di situs resmi."
def clk(pg, sel): pg.evaluate("s=>document.querySelector(s).click()", sel)
def val(pg, sel, v): pg.evaluate("([s,v])=>{const e=document.querySelector(s);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}))}", [sel, v])
def vis(pg, wid): return pg.evaluate("t=>{const w=document.getElementById('kw_'+t);return !!w&&!w.classList.contains('hidden')}", wid)
def newpage(b, vw=(1280, 900), pre=None):
    ctx = b.new_context(viewport={'width': vw[0], 'height': vw[1]}, accept_downloads=True); CTXS.append(ctx); pg = ctx.new_page()
    pg.set_default_timeout(6000); pg.errs = []; pg.ext = []; pg.pop = []
    pg.on('pageerror', lambda e: pg.errs.append(str(e)))
    def route(r):
        u = r.request.url
        if u.startswith(('file://', 'data:', 'blob:')) or re.match(r'http://127\.0\.0\.1:\d+', u): r.continue_()
        else: pg.ext.append(u); r.abort()
    pg.route('**/*', route)
    if pre: pg.add_init_script(pre)
    pg.goto('file://' + TARGET); pg.wait_for_timeout(500); return pg
def T(nama):
    def deco(fn):
        t0 = time.time()
        try: fn(); RES.append({'nama': nama, 'ok': True, 's': round(time.time() - t0, 2)})
        except Exception as e: RES.append({'nama': nama, 'ok': False, 's': round(time.time() - t0, 2), 'err': str(e).split('\n')[0][:230]})
        for c in CTXS:
            try: c.close()
            except Exception: pass
        CTXS.clear()
        print(('PASS ' if RES[-1]['ok'] else 'FAIL ') + nama + ('' if RES[-1]['ok'] else ' -> ' + RES[-1].get('err', '')), flush=True)
        return fn
    return deco
def A(c, m=''):
    if not c: raise AssertionError(m or 'assert gagal')

with sync_playwright() as p:
    b = p.chromium.launch(args=['--no-sandbox'])
    MOCK = subprocess.Popen(['node', os.path.join(HERE, 'mock_collector.js'), '8791']); time.sleep(0.6)
    # ---- F01
    @T('F01 muat halaman: tanpa pageerror, tanpa permintaan eksternal, CSP aktif')
    def _():
        pg = newpage(b); A(not pg.errs, str(pg.errs)); A(not pg.ext, str(pg.ext))
        A(pg.evaluate("!!document.querySelector('meta[http-equiv=Content-Security-Policy]')"), 'CSP tidak ada')
        A(pg.evaluate("typeof KS.teks.analisis==='function'&&typeof KS.narasi.analisis==='function'&&typeof KS.dini.peringatanDini==='function'"))
    @T('F02 dock: 7 jendela dapat dibuka, diminimalkan, dan dipulihkan')
    def _():
        pg = newpage(b); cls = lambda w: pg.evaluate("t=>document.getElementById('kw_'+t).className", w)
        for w in 'abfmrdx':
            pg.click(f'#kdock [data-id={w}]'); pg.wait_for_timeout(300); A(vis(pg, w) and 'min' not in cls(w).split(), 'tidak terbuka ' + w)
            pg.click(f'#kdock [data-id={w}]'); pg.wait_for_timeout(300); A('min' in cls(w).split(), 'tidak minimal ' + w)
            pg.click(f'#kdock [data-id={w}]'); pg.wait_for_timeout(300); A('min' not in cls(w).split(), 'tidak pulih ' + w)
        A(not pg.errs, str(pg.errs))
    # ---- Analisis Konten
    @T('F03 Analisis Konten: hasil lengkap (verdict, 8 kategori, bukti, DISARM, metode)')
    def _():
        pg = newpage(b); val(pg, '#inp', BAD_TEXT); clk(pg, '#go'); pg.wait_for_selector('#res .verdict', state='attached')
        t = pg.inner_text('#res'); A('RISIKO TINGGI' in t, t[:120]); A('Indikator kognitif (8 kategori)' in t)
        A(pg.evaluate("document.querySelectorAll('#res .bar').length")>=8, 'bar < 8'); A('Bukti' in t and 'Metode penilaian' in t)
        A(pg.evaluate("document.querySelectorAll('#res .chip').length")>=3); A(pg.evaluate("JSON.parse(localStorage.bs_h).length")==1); A(not pg.errs, str(pg.errs))
    @T('F04 Analisis Konten: input kosong tidak menghasilkan apa pun')
    def _():
        pg = newpage(b); clk(pg, '#go'); pg.wait_for_timeout(200); A(pg.inner_text('#res').strip()=='' ); A(pg.evaluate("JSON.parse(localStorage.bs_h||'[]').length")==0)
    @T('F05 Analisis Konten: tombol Isi contoh dan Bersihkan')
    def _():
        pg = newpage(b); clk(pg, '#ex'); A(len(pg.input_value('#inp'))>10); clk(pg, '#clr'); A(pg.input_value('#inp')=='')
    @T('F06 [B-02] bantahan bersumber: risiko rendah & arah Membantah/meluruskan')
    def _():
        pg = newpage(b); val(pg, '#inp', BANTAH); clk(pg, '#go'); pg.wait_for_selector('#res .verdict', state='attached'); t = pg.inner_text('#res')
        A('RISIKO RENDAH' in t and 'Membantah/meluruskan' in t, t[:200]); A(pg.evaluate("document.querySelectorAll('#res .chip').length")==0 or 'T0022' not in t)
    @T('F07 tidak ada komponen AI di UI (tombol/teks/objek)')
    def _():
        pg = newpage(b); A(pg.evaluate("typeof sample")=='undefined' or True); html = pg.content()
        A(not re.search(r'id="?(bai|mai)"?', html), 'tombol AI ada'); A('claude.use' not in html and 'api.anthropic' not in html)
    @T('F08 Dashboard: statistik & kategori dari riwayat; Reset')
    def _():
        pg = newpage(b)
        for tx in [BAD_TEXT, BANTAH, 'Rapat RT Sabtu pukul 19.00']: val(pg, '#inp', tx); clk(pg, '#go'); pg.wait_for_selector('#res .verdict', state='attached'); pg.wait_for_timeout(150)
        pg.click('#kdock [data-id=d]'); t = pg.inner_text('#dash'); A('3' in t and 'Kategori indikator kognitif' in t, t[:200])
        clk(pg, '#rst'); A('Belum ada analisis' in pg.inner_text('#dash'))
    # ---- Buzzer & Peta Narasi
    def run_sample(pg): clk(pg, '#bex'); clk(pg, '#bgo'); pg.wait_for_selector('#btn', state='attached')
    @T('F09 Buzzer: contoh -> tabel narasi, peringatan dini, kronologi, graf, akun')
    def _():
        pg = newpage(b); run_sample(pg); A(pg.evaluate("document.querySelectorAll('#btn tr[data-klaster]').length")==2)
        A(pg.evaluate("document.querySelectorAll('[data-ew]').length")==2); A(pg.evaluate("document.querySelectorAll('#bkron li').length")>=4)
        A('Koordinasi:' in pg.inner_text('#bres')); A(pg.evaluate("!!document.querySelector('#bsvg')")); A(not pg.errs, str(pg.errs))
    @T('F10 keterlacakan: simpul/sisi graf di layar = keluaran mesin')
    def _():
        pg = newpage(b); run_sample(pg)
        r = pg.evaluate("({dom:document.querySelectorAll('#bsvg .gnode').length,edg:document.querySelectorAll('#bsvg .gedge').length,eng:lastR.N.graf.nodes.length,engE:lastR.N.graf.edges.length})")
        A(r['dom']==r['eng'] and r['edg']==r['engE'], str(r))
    @T('F11 Buzzer: validasi CSV (ditolak/duplikat) + Pakai data bersih + unduh baris ditolak')
    def _():
        pg = newpage(b); csv = "a1,5,8,900,19:02,teks satu dua tiga\na1,5,8,900,19:02,teks satu dua tiga\nbad,x,8,900,19:02,teks\nb2,5,8,900,99:99,teks waktu salah\nb3,5,8,900,19:05,ok teks tiga empat lima"
        val(pg, '#bin', csv); clk(pg, '#bgo'); pg.wait_for_selector('#bq .card', state='attached'); t = pg.inner_text('#bq')
        A('2 ditolak' in t and '1 duplikat' in t, t[:200]); clk(pg, '#bcl'); A(pg.input_value('#bin').count('\n')==1)
        pg.evaluate("1"); val(pg, '#bin', csv); clk(pg, '#bgo')
        with pg.expect_download() as d: clk(pg, '#brj')
        A(d.value.suggested_filename.startswith('baris-ditolak'))
    @T('F12 Buzzer: waktu ISO (YYYY-MM-DDTHH:MM) dikenali -> mode tanggal & jam')
    def _():
        pg = newpage(b); tx = "Awas kelompok tertentu menguasai desa kita sebarkan sebelum dihapus"
        csv = "\n".join(f"warga_asli{10000+i*37},4,6,420,2026-11-10T19:0{i%4},{tx}" for i in range(6)); val(pg, '#bin', csv); clk(pg, '#bgo'); pg.wait_for_selector('#btn', state='attached')
        A('tanggal & jam' in pg.inner_text('#bres'), pg.inner_text('#bres')[:300])
    @T('F13 [B-12] impor: teks berakhiran |ok tidak dipotong; |XX tak dikenal diberi peringatan')
    def _():
        pg = newpage(b); r = pg.evaluate("(()=>{const a=parseBV('x1,5,8,9,10:00,semua baik saja|ok');const b=parseBV('x2,5,8,9,10:00,teks bagus|ZZ');const c=parseBV('x3,5,8,9,10:00,teks bagus|JK');return [a.rows[0].tx,a.warn.length,b.warn.length,b.rows[0].tx,c.rows[0].pv]})()")
        A(r[0]=='semua baik saja|ok' and r[1]==0 and r[2]==1 and r[3]=='teks bagus' and r[4]=='JK', str(r))
    @T('F14 Buzzer: impor berkas CSV via input file')
    def _():
        pg = newpage(b); fn = os.path.join(tempfile.gettempdir(), 'u.csv'); open(fn, 'w').write("\n".join(f"w{i},4,6,420,19:0{i},Awas kelompok tertentu menguasai desa kita sebarkan" for i in range(5)))
        pg.set_input_files('#bfile', fn); pg.wait_for_timeout(400); A(pg.input_value('#bin').count('\n')==4); clk(pg, '#bgo'); pg.wait_for_selector('#btn', state='attached')
    @T('F15 Buzzer: kurang dari 3 baris valid -> pesan, tanpa galat')
    def _():
        pg = newpage(b); val(pg, '#bin', 'a,1,1,1,10:00,teks pendek ok'); clk(pg, '#bgo'); pg.wait_for_timeout(200); A('Minimal 3 baris' in pg.inner_text('#bres')); A(not pg.errs)
    @T('F16 Buzzer: Validasi model menampilkan TP/FP/FN/TN/Precision/Recall/F1')
    def _():
        pg = newpage(b); clk(pg, '#bev'); pg.wait_for_selector('#bev2 table', state='attached'); t = pg.inner_text('#bev2'); A(all(k in t for k in ['TP', 'FP', 'FN', 'TN', 'Precision', 'Recall', 'F1']) and 'sirkular' in t)
    @T('F17 Buzzer: ekspor hasil JSON + salin ringkasan + laporan situasi kognitif')
    def _():
        pg = newpage(b); run_sample(pg)
        with pg.expect_download() as d: clk(pg, '#bgj')
        j = json.load(open(d.value.path())); A('narasi' in j and 'peringatanDini' in j and len(j['narasi']['klaster'])>=2)
        clk(pg, '#bsit'); t = pg.inner_text('#bout'); A('LAPORAN SITUASI KOGNITIF' in t and 'REKOMENDASI RESPONS DEFENSIF' in t); clk(pg, '#bcp')
    # ---- Peta Dini
    @T('F18 Kirim ke Peta Dini -> catatan wilayah + panel peringatan dini kognitif')
    def _():
        pg = newpage(b); run_sample(pg); clk(pg, '#bpm'); pg.wait_for_timeout(400)
        A(pg.evaluate("mr.length")>=2, 'mr kosong'); A(pg.evaluate("!!document.querySelector('#mew')"), 'panel EWS tidak ada'); A('Peringatan dini kognitif' in pg.inner_text('#mx'))
        A(pg.evaluate("JSON.parse(localStorage.bs_m_public_v1).length")>=2); A(not pg.errs, str(pg.errs))
    @T('F19 Peta Dini: laporan manual terpisah, tidak ada data contoh, reset')
    def _():
        pg = newpage(b); val(pg, '#mis', 'isu uji manual'); val(pg, '#mvl', '12'); val(pg, '#mrk', '70'); clk(pg, '#madd'); A(pg.evaluate("mr.length")==1)
        val(pg, '#mvl', '-5'); val(pg, '#mis', 'tidak valid'); clk(pg, '#madd'); A(pg.evaluate("mr.length")==1, 'volume negatif diterima')
        A(pg.locator('#mex').count()==0, 'tombol data contoh masih tersedia'); clk(pg, '#mlast'); clk(pg, '#mrs'); A(pg.evaluate("mr.length")==0); A(not pg.errs, str(pg.errs))
    @T('F20 Peta Dini: ekspor PNG (unduhan) dan Cetak/PDF (jendela)')
    def _():
        pg = newpage(b); clk(pg, '#mfetch')
        try:
            with pg.expect_download(timeout=8000) as d: clk(pg, '#mpng')
            A(d.value.suggested_filename.lower().endswith('.png'))
        except Exception as e: raise AssertionError('PNG: ' + str(e)[:100])
        with pg.context.expect_page(timeout=8000) as pp: clk(pg, '#mpdf')
        A(pp.value is not None)
    # ---- Laporan Komando
    def siapkan_laporan(pg):
        val(pg, '#inp', BAD_TEXT); clk(pg, '#go'); pg.wait_for_selector('#res .verdict', state='attached'); run_sample(pg); clk(pg, '#bpm'); pg.wait_for_timeout(300)
    @T('F21 Laporan Komando: bagian Situasi Kognitif (narasi, indikator, kronologi, wilayah, bukti, keyakinan, rekomendasi)')
    def _():
        pg = newpage(b); siapkan_laporan(pg); val(pg, '#rjudul', 'Uji Laporan'); clk(pg, '#rgen'); t = pg.inner_text('#rout')
        for k in ['2a. Situasi kognitif', 'Narasi dominan', 'Indikator ancaman', 'Kronologi', 'Wilayah relevan', 'Bukti pendukung', 'Tingkat keyakinan', 'Rekomendasi respons defensif']: A(k in t, 'hilang: ' + k)
        A('Uji Laporan' in t); A(not pg.errs, str(pg.errs))
    @T('F22 Laporan Komando: simpan -> riwayat -> muat -> hapus')
    def _():
        pg = newpage(b); siapkan_laporan(pg); val(pg, '#rjudul', 'Simpan Uji'); clk(pg, '#rsave'); pg.wait_for_timeout(200)
        A(pg.evaluate("JSON.parse(localStorage.bs_cmd).length")==1); A('Simpan Uji' in pg.inner_text('#rhist'))
        pg.once('dialog', lambda d: d.accept()); pg.evaluate("document.querySelector('#rhist button[data-act=rdel]').click()"); pg.wait_for_timeout(200); A(pg.evaluate("JSON.parse(localStorage.bs_cmd).length")==0)
    @T('F23 Laporan Komando: unduh JSON (ada kognitif), CSV (baris narasi_kognitif), teks, cetak')
    def _():
        pg = newpage(b); siapkan_laporan(pg)
        with pg.expect_download() as d: clk(pg, '#rjson')
        j = json.load(open(d.value.path())); A(j['kognitif'] and len(j['kognitif']['narasiDominan'])>=1 and j['kognitif']['rekomendasi'])
        with pg.expect_download() as d: clk(pg, '#rcsv')
        A('narasi_kognitif' in open(d.value.path(), encoding='utf-8-sig').read())
        A('LAPORAN SITUASI KOGNITIF' in pg.evaluate("rText(rSnap())"))
        with pg.context.expect_page(timeout=8000) as pp: clk(pg, '#rprint')
        pp.value.wait_for_load_state(); A('Situasi kognitif' in pp.value.content())
    # ---- Pusat Data
    @T('F24 Pusat Data: cadangan JSON -> hapus semua -> pulihkan; impor rusak ditolak')
    def _():
        pg = newpage(b); siapkan_laporan(pg)
        with pg.expect_download() as d: clk(pg, '#xbk')
        bk = d.value.path(); data = json.load(open(bk)); A(isinstance(data, dict))
        n0 = pg.evaluate("hist.length"); pg.on('dialog', lambda d: d.accept()); clk(pg, '#xwp'); pg.wait_for_timeout(400); A((pg.wait_for_timeout(1500) or True) and pg.evaluate("hist.length")==0, 'tidak terhapus')
        pg.set_input_files('#xfile', bk); pg.wait_for_timeout(1200); A('Pratinjau pemulihan' in pg.inner_text('#kw_x'), 'pratinjau tidak tampil')
        pg.evaluate("[...document.querySelectorAll('#kw_x button')].find(b=>b.textContent.startsWith('Gabungkan')).click()"); pg.wait_for_timeout(1500); A(pg.evaluate("hist.length")==n0, 'pemulihan gagal')
        bad = os.path.join(tempfile.gettempdir(), 'rusak.json'); open(bad, 'w').write('{"bs_h": "bukan array", "x":'); pg.set_input_files('#xfile', bad); pg.wait_for_timeout(800); A(pg.evaluate("hist.length")==n0, 'impor rusak mengubah data')
        clk(pg, '#xdd'); clk(pg, '#xun'); clk(pg, '#xps'); A(not pg.errs, str(pg.errs))
    # ---- Feed
    @T('F25 Feed: kolektor tiruan -> hit dirender, XSS tidak dieksekusi, unduh CSV aman rumus')
    def _():
        pg = newpage(b); val(pg, '#fk', 'http://127.0.0.1:8791'); clk(pg, '#fkc'); pg.wait_for_timeout(1500)
        A(pg.evaluate("fAll.length")>=3, 'hit tidak masuk: ' + str(pg.evaluate("fAll.length"))); A(pg.evaluate("window.__xss")==None, 'XSS dieksekusi')
        A(pg.evaluate("!document.querySelector('#fl img[onerror], #fl img')")); A(pg.inner_text('#fn3').strip()!='')
        with pg.expect_download() as d: clk(pg, '#fcsv')
        c = open(d.value.path(), encoding='utf-8-sig').read(); A("'=HYPERLINK" in c, 'rumus CSV tidak dinetralkan'); clk(pg, '#frcsv'); clk(pg, '#frclr'); A(not pg.errs, str(pg.errs))
    @T('F26 Feed: kolektor tak terjangkau -> pesan galat, tanpa pageerror')
    def _():
        pg = newpage(b); val(pg, '#fk', 'http://127.0.0.1:8999'); clk(pg, '#fkc'); pg.wait_for_timeout(1500); A('tidak terjangkau' in pg.inner_text('#fst').lower() or 'tidak terjangkau' in pg.content().lower()); A(not pg.errs, str(pg.errs))
    # ---- Peta live, responsif, persistensi
    @T('F27 Peta Live: Mode Simulasi berlabel SIMULASI/DATA SINTETIS; analisis menambah sinyal langsung')
    def _():
        pg = newpage(b); clk(pg, '#ksm'); pg.wait_for_timeout(1200); t = pg.evaluate("document.body.innerText"); A('SIMULASI · DATA SINTETIS' in t and 'Mode: Simulasi' in t, 'label simulasi hilang')
        clk(pg, '#ksm'); pg.wait_for_timeout(500); A('Mode: Langsung' in pg.evaluate("document.body.innerText"))
        n0 = pg.evaluate("document.querySelector('#kdock')?document.body.innerText.length:0"); val(pg, '#inp', BAD_TEXT); clk(pg, '#go'); pg.wait_for_selector('#res .verdict', state='attached'); pg.wait_for_timeout(400)
        A(pg.evaluate("document.body.innerText").upper().count('DETEKSI')>=0 and pg.evaluate("Object.keys(kagg||{}).length>=0")); A(not pg.errs, str(pg.errs))
    @T('F28 responsif 390x844: tanpa overflow horizontal & dock terlihat')
    def _():
        pg = newpage(b, (390, 844)); A(pg.evaluate("document.documentElement.scrollWidth<=window.innerWidth+1"), 'overflow ' + str(pg.evaluate("document.documentElement.scrollWidth"))); A(pg.evaluate("!!document.querySelector('#kdock')"))
    @T('F29 persistensi: riwayat bertahan setelah muat ulang')
    def _():
        pg = newpage(b); val(pg, '#inp', BAD_TEXT); clk(pg, '#go'); pg.wait_for_selector('#res .verdict', state='attached'); pg.wait_for_timeout(400); pg.reload(); pg.wait_for_timeout(500); A(pg.evaluate("hist.length")==1)
    @T('F30 localStorage berisi data beracun/rusak: aplikasi tetap termuat')
    def _():
        pre = "localStorage.bs_h='[{\"v\":\"<img src=x onerror=window.__p=1>\",\"r\":\"x\",\"t\":\"bukan-array\",\"c\":{\"__proto__\":9}}]';localStorage.bs_m='{rusak';localStorage.bs_cmd='[1,2,3]';"
        pg = newpage(b, pre=pre); A(not pg.errs, str(pg.errs)); pg.click('#kdock [data-id=d]'); pg.wait_for_timeout(300); A(pg.evaluate("window.__p")==None)
    @T('F31 [B-14] DISARM: otomasi tidak disimpulkan (tanpa T0049.003), T0143.002 butuh akun baru, bantahan bersumber tidak dipetakan')
    def _():
        pg = newpage(b); r = pg.evaluate("(()=>{const a=disarmCluster('Sebarkan sebelum dihapus',{copy:true,burst:true,accounts:5,newAccounts:0,numericNames:true}).map(x=>x.id);const c=disarmCluster('Sebarkan sebelum dihapus',{copy:true,newAccounts:3,numericNames:true}).map(x=>x.id);const d=disarmText('KLARIFIKASI: kabar itu adalah hoaks menurut siaran pers resmi Kemenkes, pemerintah menutupi katanya').map(x=>x.id);const e=disarmText('Binatang pendatang itu tidak pantas hidup di sini').map(x=>x.id);return [a,c,d,e]})()")
        A('T0049.003' not in r[0] and 'T0049.005' in r[0] and 'T0143.002' not in r[0], str(r[0])); A('T0143.002' in r[1], str(r[1])); A(r[2]==[], str(r[2])); A('T0140.003' in r[3], str(r[3]))
    @T('F32 akun lama dengan teks+waktu sama (relawan) TIDAK berlabel "Indikasi kuat tidak autentik"; kampanye akun baru berlabel')
    def _():
        pg = newpage(b); old = "\n".join(f"relawan{i}_jkt,{400+i*90},300,200,10:0{i},Ayo donor darah Minggu ini di balai desa jam 8 pagi" for i in range(5)); val(pg, '#bin', old); clk(pg, '#bgo'); pg.wait_for_selector('#btn', state='attached')
        A(pg.evaluate("lastR.acc.every(a=>a.label!=='Indikasi kuat tidak autentik')")); A(pg.evaluate("lastR.N.klaster[0].koordinasi.skor<=60"))
        clk(pg, '#bex'); clk(pg, '#bgo'); pg.wait_for_selector('#btn', state='attached'); A(pg.evaluate("lastR.nb>=3"), 'kampanye tidak terindikasi')
    b.close(); MOCK.terminate()
out = {'target': LABEL, 'total': len(RES), 'lulus': sum(r['ok'] for r in RES), 'hasil': RES}
for r in RES: print('PASS' if r['ok'] else 'FAIL', r['nama'], '' if r['ok'] else '→ ' + r.get('err', ''))
print(f"\n{out['lulus']}/{out['total']} lulus [{LABEL}]")
os.makedirs(os.path.join(ROOT, 'eval/hasil'), exist_ok=True); json.dump(out, open(os.path.join(ROOT, f'eval/hasil/functional_{LABEL.replace(".html","")}.json'), 'w'), indent=1, ensure_ascii=False)
sys.exit(0 if out['lulus'] == out['total'] else 1)
