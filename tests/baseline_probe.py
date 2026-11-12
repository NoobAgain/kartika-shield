import os, json, time, sys
from playwright.sync_api import sync_playwright
ROOT=os.environ.get('KS_ROOT','/home/claude/work/pkg1/fixed')
NM='/home/claude/harness/node_modules'
ROUTES={'https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js':NM+'/d3/dist/d3.min.js',
        'https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js':NM+'/topojson-client/dist/topojson-client.min.js'}
res={}
with sync_playwright() as p:
    b=p.chromium.launch(args=['--no-sandbox']); ctx=b.new_context(viewport={'width':1280,'height':800}); pg=ctx.new_page()
    errs=[];cons=[];ext=[]
    pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m:cons.append((m.type,m.text)) if m.type in('error','warning') else None)
    def h(r):
        u=r.request.url
        if u in ROUTES: r.fulfill(path=ROUTES[u],content_type='application/javascript')
        elif u.startswith(('file://','data:','blob:')): r.continue_()
        else: ext.append(u); r.abort()
    pg.route('**/*',h); pg.goto('file://'+ROOT+'/index.html'); pg.wait_for_timeout(1000)
    res['pageerrors_on_load']=errs[:]; res['external_requests_blocked']=ext[:]
    # navigasi tab
    nav={}
    for t in ['a','b','f','m','r','d','x']:
        pg.click(f'#kdock [data-id={t}]'); pg.wait_for_timeout(300)
        nav[t]=pg.evaluate("t=>{const w=document.getElementById('kw_'+t);return w?!w.classList.contains('hidden'):null}",t)
    res['nav_window_visible']=nav
    res['pageerrors_after_nav']=errs[:]
    res['claude_global_defined']=pg.evaluate("typeof claude")
    res['sample_defined']=pg.evaluate("sample!==null")
    # kasus teks
    cases={
     'viral_contoh':"VIRAL!!! Segera sebarkan ke semua grup! Kelompok tertentu akan menguasai desa kita dan menghancurkan rumah ibadah. Pemerintah menutupi semuanya, media tidak berani menayangkan. Share sebelum dihapus!!!",
     'donor_darah':"Ayo donor darah di masjid hari Minggu!! Segera share ke teman-teman ya",
     'bantahan':"KLARIFIKASI: Klaim bahwa pemerintah menutupi data vaksin adalah hoaks. Menurut Kemenkes, data terbuka di situs resmi.",
     'netral':"Rapat koordinasi RT dilaksanakan Sabtu pukul 19.00 di balai warga membahas jadwal ronda.",
     'kebencian':"Binatang pendatang itu tidak pantas hidup di sini",
     'evasi_spasi':"S e b a r k a n sekarang juga sebelum dihapus ditutupi pemerintah",
     'evasi_leet':"s3b4rk4n sebelum d1hapus, pemerintah menutupi kebenaran",
     'clickbait':"Kamu tidak akan percaya apa yang terjadi selanjutnya! Rahasia yang disembunyikan dokter terungkap",
     'emosional_fear':"Awas! Bahaya mengancam anak-anak kita, serbuan orang asing sudah dekat, jangan diam saja!",
     'kosong':""}
    out={}
    for k,v in cases.items():
        try: r=pg.evaluate("t=>{const r=heur(t);return {v:r.verdict,risk:r.risk,sara:r.sara,teknik:r.teknik,arah:r.arah,disarm:disarmText(t).map(x=>x.id)}}",v)
        except Exception as e: r={'error':str(e)[:120]}
        out[k]=r
    res['heur_cases']=out
    # performa runB
    perf={}
    for n in (200,500,1000,2000,5000):
        t0=time.time()
        r=pg.evaluate("""n=>{const rows=[];for(let i=0;i<n;i++){const g=i%40;rows.push({u:'u'+i,age:100+i%900,fo:100,fi:100,tm:(i*3)%1440,tx:'topik nomor '+g+' dibahas warga '+(i%7)+' hari ini di kota kita bersama pak rt',pv:''})}
          const t0=performance.now();const r=runB(rows);return {ms:Math.round(performance.now()-t0),cls:r.cls.length}}""",n)
        perf[n]=r
    res['runB_perf']=perf
    # sampel buzzer
    res['sample_buzzer']=pg.evaluate("()=>{const r=runB(parseB(SMP.join('\\n')));return {idx:r.idx,cls:r.cls.length,nb:r.nb}}")
    res['pageerrors_final']=errs[:]; res['console_errors']=cons[:5]
    b.close()
print(json.dumps(res,indent=1,ensure_ascii=False))
