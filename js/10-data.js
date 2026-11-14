// Pusat Data: status penyimpanan, cadangan JSON, salinan otomatis IndexedDB, validasi impor, duplikat
const XK=[['bs_h','Riwayat analisis'],['bs_m','Laporan peta dini'],['bs_rev','Tinjauan feed'],['bs_cmd','Laporan komando']];
const XMEM=()=>({bs_h:hist,bs_m:mr,bs_rev:fRev,bs_cmd:cmd});
const isO=o=>o&&typeof o==='object'&&!Array.isArray(o),isS=(v,n)=>typeof v==='string'&&v.length<=n,isN=v=>typeof v==='number'&&isFinite(v);
// Pemeriksa bentuk tiap koleksi. Mengembalikan true bila record layak disimpan.
const XV={
bs_h:o=>isO(o)&&isS(o.v,40)&&isN(o.r)&&isN(o.d)&&(o.t==null||(Array.isArray(o.t)&&o.t.length<=10&&o.t.every(x=>isS(x,80))))&&isS(o.a||'',300)&&isS(o.dir||'',80)&&isS(o.i||'',200)&&(o.c==null||(isO(o.c)&&Object.keys(o.c).length<=8&&Object.entries(o.c).every(([k,v])=>/^[A-Z_]{3,20}$/.test(k)&&isN(v)))),
bs_m:o=>isO(o)&&isS(o.p,4)&&PV.some(x=>x.c===o.p)&&isS(o.i,400)&&o.i&&isN(o.v)&&o.v>0&&o.v<=1e7&&isN(o.r)&&o.r>=0&&o.r<=100,
bs_rev:o=>isO(o)&&isS(o.ts,40)&&isN(o.risk)&&(o.v===0||o.v===1)&&isS(o.text,400),
bs_cmd:o=>isO(o)&&isS(o.id,40)&&isS(o.ts,40)&&isS(o.judul,160)&&isS(o.status,20)&&isS(o.pic||'',80)&&isS(o.deadline||'',20)&&isS(o.catatan||'',400)&&isN(o.risiko)&&isS(o.ringkas||'',200)};
const XD={ // kunci duplikat
bs_h:o=>o.d+'|'+o.v+'|'+o.r,bs_m:o=>[o.p,o.i.trim().toLowerCase(),o.v,o.r].join('|'),
bs_rev:o=>o.ts+'|'+o.text,bs_cmd:o=>o.id};
function xDedupe(k,a){const seen=new Set(),out=[];let d=0;a.forEach(o=>{const keys=[XD[k](o)];if(keys.some(x=>seen.has(x))){d++;return}keys.forEach(x=>seen.add(x));out.push(o)});return{out,d}}
const xHash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0}return h.toString(16).padStart(8,'0')};
const xKB=n=>n<1024?n+' B':(n/1024).toFixed(1)+' KB';
const xLs=k=>{try{return localStorage.getItem(k)||''}catch(e){return''}};
const xCount=d=>XK.reduce((n,[k])=>n+(d[k]||[]).length,0);
// ---- cadangan berkas
function xBuild(){const d=XMEM();const j=JSON.stringify(d);return{app:'kartika-shield',format:1,dibuat:new Date().toISOString(),jumlah:Object.fromEntries(XK.map(([k])=>[k,d[k].length])),sha:xHash(j),data:d}}
function xValidate(b){const r={ok:false,err:'',per:{},data:{}};
if(!isO(b)||b.app!=='kartika-shield'||!isO(b.data)){r.err='Berkas bukan cadangan Kartika Shield.';return r}
if(b.format!==1){r.err='Versi format cadangan tidak dikenal ('+esc(b.format)+').';return r}
if(b.sha&&b.sha!==xHash(JSON.stringify(b.data))){r.err='Checksum tidak cocok: berkas rusak atau diubah. Pemulihan dibatalkan.';return r}
XK.forEach(([k])=>{const a=Array.isArray(b.data[k])?b.data[k]:[],good=a.filter(XV[k]);r.data[k]=good;r.per[k]={n:a.length,bad:a.length-good.length}});
r.ok=true;return r}
// ---- IndexedDB: salinan otomatis dan cadangan "urungkan"
const xdb=()=>new Promise((ok,no)=>{try{const q=indexedDB.open('kartika',1);q.onupgradeneeded=()=>q.result.createObjectStore('kv');q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error)}catch(e){no(e)}});
const xGet=k=>xdb().then(db=>new Promise((ok,no)=>{const r=db.transaction('kv').objectStore('kv').get(k);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})).catch(()=>undefined);
const xPut=(k,v)=>xdb().then(db=>new Promise((ok,no)=>{const t=db.transaction('kv','readwrite');t.objectStore('kv').put(v,k);t.oncomplete=()=>ok(true);t.onerror=()=>no(t.error)})).catch(()=>false);
let xLast='',xIgn=false,xHasAuto=false;
async function xAuto(force){const d=XMEM(),n=xCount(d);if(n===0&&xHasAuto&&!xIgn)return; // jangan menimpa salinan dengan keadaan kosong tanpa persetujuan
const j=JSON.stringify(d);if(j===xLast&&!force)return;if(await xPut('auto',{ts:Date.now(),data:d})){xLast=j;xHasAuto=true}}
function xApply(data,mode){return xPut('undo',{ts:Date.now(),data:XMEM()}).then(()=>{XK.forEach(([k])=>{let v=data[k]||[];if(mode==='gabung')v=xDedupe(k,(XMEM()[k]).concat(v)).out;try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}});return xAuto(true)}).then(()=>{xMsg('Selesai. Memuat ulang aplikasi…');setTimeout(()=>location.reload(),600)})}
// ---- tampilan
const xMsg=h=>{$('#xprev').innerHTML=h?'<div style="margin-top:12px">'+h+'</div>':''};

// ---- Arsip berita nyata dari Collector RSS dengan filter tanggal publikasi
let xNewsItems=[];
const xNewsDate=d=>{if(!d)return null;const z=new Date(d);return Number.isNaN(z.getTime())?null:z};
const xNewsDay=d=>new Date(d.getFullYear(),d.getMonth(),d.getDate());
function xNewsRange(){
 const mode=$('#xnewsPeriod')?.value||'month',now=new Date(),today=xNewsDay(now);
 if(mode==='today')return{from:today,to:new Date(today.getTime()+86400000-1),label:'Hari ini'};
 if(mode==='7d'){const from=new Date(today);from.setDate(from.getDate()-6);return{from,to:new Date(today.getTime()+86400000-1),label:'7 hari terakhir'};}
 if(mode==='30d'){const from=new Date(today);from.setDate(from.getDate()-29);return{from,to:new Date(today.getTime()+86400000-1),label:'30 hari terakhir'};}
 if(mode==='month')return{from:new Date(now.getFullYear(),now.getMonth(),1),to:new Date(now.getFullYear(),now.getMonth()+1,1)-1,label:'Bulan ini'};
 if(mode==='pickmonth'){
  const v=$('#xnewsMonth')?.value;if(!v)return{from:null,to:null,label:'Pilih bulan dan tahun'};
  const [y,m]=v.split('-').map(Number);return{from:new Date(y,m-1,1),to:new Date(y,m,1)-1,label:new Date(y,m-1,1).toLocaleDateString('id-ID',{month:'long',year:'numeric'})};
 }
 if(mode==='custom'){
  const a=$('#xnewsFrom')?.value,b=$('#xnewsTo')?.value;
  return{from:a?new Date(a+'T00:00:00'):null,to:b?new Date(b+'T23:59:59.999'):null,label:'Rentang tanggal'};
 }
 return{from:null,to:null,label:'Semua tanggal'};
}
function xRenderNews(){
 const list=$('#xnewsList');if(!list)return;
 const range=xNewsRange(),src=$('#xnewsSource')?.value||'',q=($('#xnewsQuery')?.value||'').trim().toLowerCase();
 const filtered=xNewsItems.filter(a=>{
  const d=xNewsDate(a.publishedAt),source=String(a.source||a.sourceHost||'');
  if(range.from||range.to){if(!d)return false;if(range.from&&d<range.from)return false;if(range.to&&d>range.to)return false;}
  if(src&&source!==src)return false;
  const hay=[a.title,a.summary,source].join(' ').toLowerCase();return !q||hay.includes(q);
 });
 $('#xnewsSummary').textContent=`${filtered.length} artikel cocok · ${xNewsItems.length} artikel dimuat dari Collector · Periode: ${range.label}.`;
 const fmt=d=>d?new Date(d).toLocaleString('id-ID'):'Tanggal publikasi tidak tersedia';
 list.innerHTML=filtered.slice(0,100).map(a=>`<article class="bti" style="margin:7px 0;border-left:3px solid #5b9cbd"><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><span class="chip">${esc(a.source||a.sourceHost||'Media tidak diketahui')}</span><span class="note">${esc(fmt(a.publishedAt))}</span></div><b style="display:block;margin-top:5px">${esc(a.title||'Tanpa judul')}</b><p class="note" style="margin:5px 0">${esc(a.summary||'Ringkasan tidak tersedia dari feed.')}</p>${a.url?`<a href="${esc(a.url)}" target="_blank" rel="noopener noreferrer">Buka berita asli</a>`:''}</article>`).join('')||'<p class="note">Tidak ada artikel yang cocok dengan periode, media, atau pencarian ini. Coba periode lebih luas atau muat ulang Collector.</p>';
 if(filtered.length>100)list.insertAdjacentHTML('beforeend',`<p class="note">Menampilkan 100 dari ${filtered.length} artikel cocok. Persempit filter untuk melihat hasil lainnya.</p>`);
}
async function xLoadNews(){
 const status=$('#xnewsStatus'),button=$('#xnewsLoad');if(!status)return;
 button.disabled=true;status.textContent='Mengambil artikel nyata dari Collector RSS…';
 try{
  const base=(localStorage.getItem('ks_collector_url')||'http://127.0.0.1:8787').replace(/\/$/,'');
  const res=await fetch(base+'/news?limit=1500',{cache:'no-store',signal:AbortSignal.timeout(20000)});
  if(!res.ok)throw new Error('HTTP '+res.status);
  const data=await res.json();if(!data.ok||!Array.isArray(data.items))throw new Error('Format respons Collector tidak sesuai');
  xNewsItems=data.items;
  const sources=[...new Set(xNewsItems.map(a=>a.source||a.sourceHost).filter(Boolean))].sort();
  const select=$('#xnewsSource'),selected=select.value;
  select.innerHTML='<option value="">Semua media</option>'+sources.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
  select.value=sources.includes(selected)?selected:'';
  const dated=xNewsItems.filter(a=>xNewsDate(a.publishedAt)).length;
  status.textContent=`Berhasil memuat ${xNewsItems.length} artikel dari Collector · ${sources.length} media · ${dated} memiliki tanggal publikasi. Data mengikuti artikel yang benar-benar tersimpan di Collector.`;
  xRenderNews();
 }catch(e){status.textContent='Gagal mengambil arsip berita: '+e.message+'. Pastikan Collector berjalan dan alamat Collector benar.';$('#xnewsList').innerHTML='<p class="note">Tidak ada data contoh yang dibuat. Arsip hanya menampilkan berita yang benar-benar diterima Collector.</p>';}
 finally{button.disabled=false;}
}
$('#xnewsLoad')?.addEventListener('click',xLoadNews);
['xnewsPeriod','xnewsMonth','xnewsFrom','xnewsTo','xnewsSource','xnewsQuery'].forEach(id=>{
 const el=$('#'+id);if(!el)return;
 el.addEventListener('input',()=>{
  const mode=$('#xnewsPeriod').value;
  $('#xnewsMonthWrap').style.display=mode==='pickmonth'?'block':'none';
  $('#xnewsFromWrap').style.display=mode==='custom'?'block':'none';
  $('#xnewsToWrap').style.display=mode==='custom'?'block':'none';
  xRenderNews();
 });
});
$('#xnewsPeriod')?.dispatchEvent(new Event('input'));

async function xStatus(){let per='belum diketahui',q='';try{if(navigator.storage){per=(await navigator.storage.persisted())?'<b style="color:#15803d">aktif</b> (peramban tidak akan menghapus otomatis)':'<b style="color:#c2410c">belum</b> (peramban boleh menghapus saat ruang menipis)';const e=await navigator.storage.estimate();q=` · terpakai ${xKB(e.usage||0)} dari ${xKB(e.quota||0)}`}}catch(e){}
const d=XMEM();const auto=await xGet('auto'),bk=+xLs('bs_bk')||0,n=xCount(d),days=bk?Math.floor((Date.now()-bk)/864e5):null,warn=n>0&&(bk===0||days>=7);
const rows=XK.map(([k,nm])=>{const s=xLs(k),ok=s===''?d[k].length===0:s===JSON.stringify(d[k]);return`<tr><td>${nm}</td><td style="text-align:right">${d[k].length}</td><td style="text-align:right">${xKB(s.length)}</td><td>${ok?'':'<b style="color:#b3202a">tidak tersimpan, ruang peramban penuh atau diblokir</b>'}</td></tr>`}).join('');
$('#xst').innerHTML=`<table style="width:100%;border-collapse:collapse;font-size:.85rem"><tr style="text-align:left"><th>Data</th><th style="text-align:right">Jumlah</th><th style="text-align:right">Ukuran</th><th></th></tr>${rows}</table>
<p class=note style="margin-top:8px">Penyimpanan permanen: ${per}${q}<br>Salinan otomatis di peramban: ${auto?new Date(auto.ts).toLocaleString('id-ID')+' ('+xCount(auto.data||{})+' data)':'belum ada'}<br>Cadangan berkas terakhir: ${bk?new Date(bk).toLocaleString('id-ID')+' ('+days+' hari lalu)':'belum pernah'}</p>${warn?'<p style="color:#b3202a;font-size:.85rem"><b>Disarankan unduh cadangan sekarang.</b> '+(bk?'Cadangan terakhir sudah '+days+' hari.':'Belum pernah ada cadangan berkas.')+'</p>':''}`;
const b=document.querySelector('#kdock [data-id=x]');if(b)b.style.boxShadow=warn?'inset 0 -2px 0 #ef4444':'';return{auto}}
$('#xbk').onclick=()=>{const b=xBuild();dlFile('kartika-shield-cadangan-'+stamp()+'.json',new Blob([JSON.stringify(b)],{type:'application/json'}));try{localStorage.setItem('bs_bk',String(Date.now()))}catch(e){}xStatus();xMsg('Cadangan diunduh ('+Object.values(b.jumlah).reduce((a,c)=>a+c,0)+' data). Simpan juga di media penyimpanan lain.')};
$('#xfile').onchange=e=>{const f=e.target.files[0];e.target.value='';if(!f)return;if(f.size>20e6){xMsg('Berkas lebih dari 20 MB, ditolak.');return}
f.text().then(t=>{let b;try{b=JSON.parse(t)}catch(x){xMsg('Berkas bukan JSON yang valid.');return}const r=xValidate(b);if(!r.ok){xMsg('<b style="color:#b3202a">'+r.err+'</b>');return}
const cur=XMEM(),tb=XK.map(([k,nm])=>{const m=xDedupe(k,cur[k].concat(r.data[k])).out.length;return`<tr><td>${nm}</td><td style="text-align:right">${r.per[k].n}</td><td style="text-align:right">${r.per[k].bad?'<b style="color:#b3202a">'+r.per[k].bad+'</b>':0}</td><td style="text-align:right">${cur[k].length}</td><td style="text-align:right">${m}</td></tr>`}).join('');
xMsg(`<b>Pratinjau pemulihan</b> (dibuat ${esc(new Date(b.dibuat||0).toLocaleString('id-ID'))})<table style="width:100%;border-collapse:collapse;font-size:.85rem"><tr style="text-align:left"><th>Data</th><th style="text-align:right">Di berkas</th><th style="text-align:right">Rusak, dibuang</th><th style="text-align:right">Sekarang</th><th style="text-align:right">Hasil gabung</th></tr>${tb}</table><div class=row><button class=btn id=xmg>Gabungkan (tanpa duplikat)</button><button class="btn alt" id=xov>Timpa semua</button></div><p class=note>Keadaan saat ini disimpan dulu, bisa dibatalkan lewat Urungkan pemulihan.</p>`);
$('#xmg').onclick=()=>xApply(r.data,'gabung');$('#xov').onclick=()=>{if(confirm('Ganti seluruh data saat ini dengan isi cadangan?'))xApply(r.data,'timpa')}}).catch(()=>xMsg('Berkas tidak bisa dibaca.'))};
$('#xun').onclick=async()=>{const u=await xGet('undo');if(!u||!u.data){xMsg('Belum ada pemulihan yang bisa diurungkan.');return}if(confirm('Kembalikan data ke keadaan sebelum pemulihan terakhir ('+new Date(u.ts).toLocaleString('id-ID')+')?'))xApply(u.data,'timpa')};
$('#xdd').onclick=()=>{const cur=XMEM(),res=XK.map(([k,nm])=>({k,nm,...xDedupe(k,cur[k])})),tot=res.reduce((a,r)=>a+r.d,0);
if(!tot){xMsg('Tidak ada duplikat ditemukan.');return}
xMsg(`<b>${tot} duplikat ditemukan</b><ul style="margin:6px 0 0 18px">${res.filter(r=>r.d).map(r=>`<li>${r.nm}: ${r.d}</li>`).join('')}</ul><div class=row><button class=btn id=xcl>Hapus duplikat</button></div><p class=note>Duplikat = record identik. Yang pertama dipertahankan.</p>`);
$('#xcl').onclick=()=>xPut('undo',{ts:Date.now(),data:cur}).then(()=>{res.forEach(r=>{try{localStorage.setItem(r.k,JSON.stringify(r.out))}catch(e){}});return xAuto(true)}).then(()=>{xMsg('Duplikat dihapus. Memuat ulang…');setTimeout(()=>location.reload(),600)})};
$('#xps').onclick=async()=>{let ok=false;try{ok=await navigator.storage.persist()}catch(e){}xStatus();xMsg(ok?'Penyimpanan permanen aktif.':'Peramban menolak. Biasanya diberikan otomatis setelah situs sering dipakai atau dipasang sebagai aplikasi. Cadangan berkas tetap pengaman utama.')};
$('#xwp').onclick=()=>{if(!confirm('Hapus SEMUA data aplikasi di peramban ini? Unduh cadangan dulu bila perlu.'))return;if(!confirm('Yakin? Ini tidak bisa dibatalkan kecuali ada cadangan.'))return;xPut('undo',{ts:Date.now(),data:XMEM()}).then(()=>{xIgn=true;XK.forEach(([k])=>{try{localStorage.removeItem(k)}catch(e){}});return xPut('auto',{ts:Date.now(),data:{}})}).then(()=>{xMsg('Data dihapus. Memuat ulang…');setTimeout(()=>location.reload(),600)})};
// ---- inisialisasi: pulihkan salinan otomatis bila data lokal hilang, jadwalkan simpan otomatis
(async()=>{const a=await xGet('auto');xHasAuto=!!a;const n=a&&a.data?xCount(a.data):0;
if(xCount(XMEM())===0&&n>0){const b=document.createElement('div');b.style.cssText='position:fixed;left:50%;bottom:64px;transform:translateX(-50%);z-index:99999;background:#10233f;color:#fff;border:1px solid #5fd3c8;border-radius:8px;padding:12px 14px;max-width:92vw;font-size:.85rem;box-shadow:0 8px 30px #0008';
b.innerHTML=`Data lokal kosong, tetapi ada salinan otomatis (${n} data, ${esc(new Date(a.ts).toLocaleString('id-ID'))}). <button class=btn id=xrs style="margin:6px 6px 0 0">Pulihkan</button><button class="btn alt" id=xig style="margin-top:6px">Abaikan</button>`;document.body.appendChild(b);
$('#xrs').onclick=()=>{const g={};XK.forEach(([k])=>{g[k]=(a.data[k]||[]).filter(XV[k])});b.remove();xApply(g,'timpa')};$('#xig').onclick=()=>{xIgn=true;b.remove();xAuto(true)}}
else xAuto(true);
setInterval(()=>xAuto(false),10000);addEventListener('pagehide',()=>xAuto(false));document.addEventListener('visibilitychange',()=>{if(document.hidden)xAuto(false)});
try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist()}catch(e){}
xStatus()})();
const xKo=kOpen;kOpen=function(id){xKo(id);if(id==='x')xStatus()};
