// Peta Peringatan Dini: agregasi pemantauan 27 Kodam; provinsi tetap menjadi metadata geografi sumber.
const PV="AC:Aceh:0:0,SU:Sumatera Utara:1:0,SB:Sumatera Barat:1:1,RI:Riau:2:1,KR:Kepulauan Riau:3:0,JA:Jambi:2:2,BE:Bengkulu:1:2,SS:Sumatera Selatan:2:3,BB:Kepulauan Bangka Belitung:3:2,LA:Lampung:2:4,BT:Banten:3:5,JK:DKI Jakarta:4:5,JB:Jawa Barat:5:5,JT:Jawa Tengah:6:5,YO:DI Yogyakarta:6:6,JI:Jawa Timur:7:5,BA:Bali:8:6,NB:Nusa Tenggara Barat:9:6,NT:Nusa Tenggara Timur:10:6,KB:Kalimantan Barat:4:2,KT:Kalimantan Tengah:5:3,KS:Kalimantan Selatan:6:3,KI:Kalimantan Timur:6:1,KU:Kalimantan Utara:6:0,SA:Sulawesi Utara:9:0,GO:Gorontalo:8:1,ST:Sulawesi Tengah:8:2,SR:Sulawesi Barat:7:3,SN:Sulawesi Selatan:8:3,SG:Sulawesi Tenggara:9:3,MU:Maluku Utara:10:1,MA:Maluku:10:2,PD:Papua Barat Daya:11:1,PB:Papua Barat:12:1,PA:Papua:13:1,PH:Papua Tengah:12:2,PP:Papua Pegunungan:13:2,PS:Papua Selatan:13:3".split(',').map(s=>{const a=s.split(':');return{c:a[0],n:a[1],x:+a[2],y:+a[3]}});
let mr=[],selM=null,lastM='',publicNews=[],newsTimer=null;
try{
  const primary=JSON.parse(localStorage.getItem('bs_m')||'null');
  const legacy=JSON.parse(localStorage.getItem('bs_m_public_v1')||'[]');
  const merged=[...(Array.isArray(primary)?primary:[]),...(Array.isArray(legacy)?legacy:[])];
  const seen=new Set();
  mr=merged.filter(o=>{
    if(!o||typeof o!=='object')return false;
    const key=[o.p,o.kodamCode||'',String(o.i||'').trim().toLowerCase(),o.v,o.r,o.createdAt||''].join('|');
    if(seen.has(key))return false;seen.add(key);return true;
  });
}catch(e){mr=[]}
const svM=()=>{
  try{
    const data=JSON.stringify(mr);
    // bs_m adalah sumber utama yang dibaca Pusat Data; kunci lama tetap
    // disinkronkan agar versi/komponen lama tidak kehilangan kompatibilitas.
    localStorage.setItem('bs_m',data);
    localStorage.setItem('bs_m_public_v1',data);
  }catch(e){}
};
const LV=s=>s>=75?['Verifikasi segera','#b3202a']:s>=50?['Perlu verifikasi','#c2410c']:s>=25?['Pantau','#a16207']:['Indikator rendah','#15803d'];
const REC={'Verifikasi segera':'Periksa artikel asli, tanggal, konteks, dan sumber primer. Cari konfirmasi independen sebelum menyimpulkan.', 'Perlu verifikasi':'Bandingkan dengan sedikitnya satu sumber independen dan periksa apakah judul sesuai isi berita.', 'Pantau':'Pantau pembaruan sumber dan perubahan jumlah artikel; hindari menyimpulkan tren dari satu artikel.', 'Indikator rendah':'Simpan sebagai referensi; tidak ada dasar untuk menaikkan prioritas dari indikator teks saat ini.'};
const LG=window.DATA_LG||{}; // Data provinsi tetap menjadi metadata geografis; klasifikasi pemantauan dan statistik memakai Kodam.
const kodamForProvince=c=>(window.KODAM_DATA||[]).find(k=>k.code===(window.KODAM_BY_PROVINCE||{})[c])||null;
const kodamLogoForProvince=c=>{const k=kodamForProvince(c);return k?((window.KODAM_INSIGNIA||{})[k.code]||''):''};
const PCAP={"AC":[5.55,95.32],"SU":[3.59,98.67],"SB":[-0.95,100.35],"RI":[0.51,101.45],"KR":[0.92,104.45],"JA":[-1.61,103.61],"BE":[-3.8,102.26],"SS":[-2.99,104.76],"BB":[-2.13,106.12],"LA":[-5.43,105.26],"BT":[-6.12,106.15],"JK":[-6.21,106.85],"JB":[-6.92,107.61],"JT":[-6.97,110.42],"YO":[-7.8,110.37],"JI":[-7.25,112.75],"BA":[-8.65,115.22],"NB":[-8.58,116.12],"NT":[-10.17,123.61],"KB":[-0.03,109.33],"KT":[-2.21,113.92],"KS":[-3.44,114.83],"KI":[-0.5,117.15],"KU":[2.84,117.37],"SA":[1.47,124.84],"GO":[0.54,123.06],"ST":[-0.9,119.87],"SR":[-2.68,118.89],"SN":[-5.15,119.43],"SG":[-3.97,122.51],"MU":[0.74,127.57],"MA":[-3.7,128.18],"PD":[-0.88,131.26],"PB":[-0.86,134.08],"PA":[-2.53,140.72],"PH":[-3.37,135.48],"PP":[-4.09,138.95],"PS":[-8.49,140.4]}; // [lintang, bujur] ibu kota provinsi
const KLG={};Object.keys(LG).forEach(c=>{const m=new Image();m.src=LG[c];KLG[c]=m});
let pmG=null,pmLogo=true,pmForce=false;
function pmList(T,d){T.style.display='block';T.style.overflowX='';T.style.gap='0';
const L=(window.KODAM_DATA||[]).slice().sort((a,b)=>((d.sc[b.code]==null?-1:d.sc[b.code])-(d.sc[a.code]==null?-1:d.sc[a.code]))||a.name.localeCompare(b.name));
T.innerHTML='<label class="note" style="display:block;margin-bottom:6px"><input type="checkbox" id="pmm" style="width:auto"> Tampilkan peta provinsi pendukung (geser ke samping)</label>'+L.map(k=>{const s=d.sc[k.code],lv=s!=null?LV(s):null,logo=(window.KODAM_INSIGNIA||{})[k.code]||'',codes=(window.KS_KODAM_SCOPE?.provinceCodesForKodam(k.code)||[]),names=codes.map(c=>PV.find(p=>p.c===c)?.n||c);return'<div data-kodam="'+k.code+'" style="display:flex;align-items:center;gap:10px;padding:8px;border-bottom:1px solid var(--bd);cursor:pointer'+(selM&&codes.includes(selM)?';background:var(--sf)':'')+'"><img src="'+logo+'" alt="Lambang '+esc(k.name)+'" style="width:30px;height:34px;object-fit:contain;background:#fff;border:1px solid #aab4c4;border-radius:5px;padding:2px"><span style="flex:1"><b>'+esc(k.name)+'</b><small style="display:block;color:var(--muted,#9ca3af)">'+esc(names.join(', '))+'</small></span>'+(lv?'<span class="badge" style="background:'+lv[1]+';font-size:.72rem">'+lv[0]+' · '+s+'</span>':'<span class="note">tanpa data</span>')+'</div>'}).join('');
T.querySelectorAll('[data-kodam]').forEach(g=>g.onclick=()=>{const codes=window.KS_KODAM_SCOPE?.provinceCodesForKodam(g.dataset.kodam)||[];selM=codes[0]||null;renderM()});$('#pmm').onchange=e=>{pmForce=e.target.checked;renderM()};return true}

function mapPNG(cb){let svg=document.querySelector('#mmap svg.pm');if(!svg){pmForce=true;renderM();svg=document.querySelector('#mmap svg.pm')}if(!svg)return;
const W=1000,H=420,S=2,B=[...svg.querySelectorAll('*')],cl=svg.cloneNode(true),C=[...cl.querySelectorAll('*')],bs=getComputedStyle(document.body),pg=getComputedStyle(svg),
PR=['fill','fill-opacity','stroke','stroke-width','stroke-opacity','opacity','font-size','font-weight','font-family','text-anchor','paint-order'];
[svg].concat(B).forEach((a,i)=>{const c=getComputedStyle(a),b=i?C[i-1]:cl;PR.forEach(k=>b.style.setProperty(k,c.getPropertyValue(k)))});
cl.style.background=pg.backgroundColor;cl.style.minWidth='';cl.setAttribute('xmlns','http://www.w3.org/2000/svg');cl.setAttribute('width',W);cl.setAttribute('height',H);
const img=new Image();img.onerror=()=>alert('Gagal membuat gambar peta.');
img.onload=()=>{const d=calcM(),ks=Object.keys(d.sc).sort((a,b)=>d.sc[b]-d.sc[a]).slice(0,10),HH=H+150+ks.length*24+56,cv=document.createElement('canvas');cv.width=W*S;cv.height=HH*S;const x=cv.getContext('2d');x.scale(S,S);
x.fillStyle=bs.backgroundColor;x.fillRect(0,0,W,HH);x.fillStyle=bs.color;x.font='700 26px system-ui,sans-serif';x.fillText('Peta Peringatan Dini Pemantauan 27 Kodam',24,42);
x.font='14px system-ui,sans-serif';x.globalAlpha=.7;x.fillText('Kartika Shield \u00b7 '+new Date().toLocaleString('id-ID',{dateStyle:'long',timeStyle:'short'})+' \u00b7 '+mr.length+' laporan \u00b7 '+Object.keys(d.sc).length+' Kodam terkait',24,66);x.globalAlpha=1;
x.drawImage(img,0,80,W,H);let y=H+80+30;[['Indikator rendah','#15803d'],['Pantau','#a16207'],['Perlu verifikasi','#c2410c'],['Verifikasi segera','#b3202a']].forEach(([n,c],i)=>{x.fillStyle=c;x.fillRect(24+i*110,y-12,14,14);x.fillStyle=bs.color;x.font='13px system-ui,sans-serif';x.fillText(n,44+i*110,y)});
y+=34;x.font='700 16px system-ui,sans-serif';x.fillText('Prioritas Kodam',24,y);y+=8;
ks.forEach(k=>{y+=24;const l=LV(d.sc[k]);x.fillStyle=l[1];x.fillRect(24,y-13,12,12);x.fillStyle=bs.color;x.font='14px system-ui,sans-serif';x.fillText(((window.KODAM_DATA||[]).find(kd=>kd.code===k)||{name:k}).name+' \u00b7 '+l[0]+' \u00b7 skor '+d.sc[k]+' \u00b7 volume '+d.sv[k],44,y)});
y+=34;x.globalAlpha=.6;x.font='11px system-ui,sans-serif';x.fillText('Skor adalah indikator dari laporan masukan, bukan bukti. Verifikasi manual sebelum bertindak.',24,y);x.fillText('Batas wilayah: CC BY 4.0, indonesia-geojson-topojson-maps-with-38-provinces (disederhanakan).',24,y+16);
cb(cv)};
img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(cl))}
function pmap(T,d){if(window.innerWidth<760&&!pmForce)return pmList(T,d); // satu lambang untuk setiap Kodam, bukan satu lambang per provinsi
if(!window.d3||!window.topojson)return false;
try{const W=1000,H=420,R=17;
if(!pmG){const w=window.DATA_WD,f=topojson.feature(w,w.objects.countries).features,
pr=d3.geoMercator().fitExtent([[10,10],[W-10,H-10]],{type:'MultiPoint',coordinates:[[94.5,6.8],[141.5,-11.3]]}),P=d3.geoPath(pr);
const nodes=(window.KODAM_DATA||[]).map(k=>{const q=pr([k.lon,k.lat]);const codes=window.KS_KODAM_SCOPE?.provinceCodesForKodam(k.code)||[];return{c:k.code,kd:k,codes,x0:q[0],y0:q[1],x:q[0],y:q[1]}});
for(let it=0;it<500;it++){for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){const a=nodes[i],b=nodes[j];let dx=b.x-a.x,dy=b.y-a.y,dd=Math.hypot(dx,dy);const m=2*R+5;if(dd<m){if(dd<.01){dx=1;dy=0;dd=1}const k=(m-dd)/2/dd;a.x-=dx*k;a.y-=dy*k;b.x+=dx*k;b.y+=dy*k}}
nodes.forEach(n=>{n.x+=(n.x0-n.x)*.018;n.y+=(n.y0-n.y)*.018;n.x=Math.max(R,Math.min(W-R,n.x));n.y=Math.max(R,Math.min(H-R,n.y))})}
let pv=[];try{pv=window.DATA_PG.features.map(x=>({c:x.properties.c,d:P(x)||''}))}catch(e){}
pmG={nodes,pv,land:f.filter(x=>String(x.id)!=='360'||!pv.length).map(x=>'<path d="'+(P(x)||'')+'" class="'+(String(x.id)==='360'?'pid':'pco')+'"/>').join('')}}
const cl=c=>{const s=d.sc[c];return s!=null?LV(s)[1]:'#8a94a6'};
T.style.display='block';T.style.overflowX='auto';T.style.gap='0';
T.innerHTML='<label class="note" style="display:block;margin-bottom:6px"><input type="checkbox" id="pml" style="width:auto"'+(pmLogo?' checked':'')+'> Tampilkan satu lambang untuk setiap Kodam (27 Kodam)</label><svg class="pm" viewBox="0 0 '+W+' '+H+'" style="width:100%;min-width:720px" role="img" aria-label="Peta 27 Kodam Indonesia">'+pmG.land+pmG.pv.map(q=>{const s=d.scProvince[q.c],p=PV.find(z=>z.c===q.c),kd=kodamForProvince(q.c);return'<path class="pv" data-c="'+q.c+'" d="'+q.d+'" fill="'+(s!=null?LV(s)[1]:'var(--bd)')+'" fill-opacity="'+(s!=null?.8:.9)+'"'+(selM===q.c?' stroke="#111" stroke-width="2"':'')+'><title>'+esc((kd?.name||p.n)+' · '+p.n+(s!=null?' · skor '+s:' · tanpa data'))+'</title></path>'}).join('')+
(pmLogo?pmG.nodes.map(n=>Math.hypot(n.x-n.x0,n.y-n.y0)>8?'<line class="ld" x1="'+n.x0+'" y1="'+n.y0+'" x2="'+n.x+'" y2="'+n.y+'"/>':'').join('')+
pmG.nodes.map(n=>'<circle cx="'+n.x0+'" cy="'+n.y0+'" r="2.6" fill="'+cl(n.c)+'"/>').join('')+
pmG.nodes.map(n=>{const kd=n.kd,s=d.sc[kd.code],sel=!!(selM&&n.codes.includes(selM)),logo=(window.KODAM_INSIGNIA||{})[kd.code]||'';return'<g data-kodam="'+kd.code+'" transform="translate('+n.x+' '+n.y+')" style="cursor:pointer"><title>'+esc(kd.name+' · '+(s!=null?'skor '+s:'tanpa data')+' · '+(n.codes.length+' provinsi dalam cakupan'))+'</title><rect x="-17" y="-18" width="34" height="36" rx="6" fill="#fff" stroke="'+(sel?'#111':cl(kd.code))+'" stroke-width="'+(sel?4:2.5)+'" opacity="'+(s==null?.94:1)+'"/><image href="'+logo+'" x="-15" y="-16" width="30" height="32" preserveAspectRatio="xMidYMid meet"/>'+(s!=null?'<circle cx="15" cy="-16" r="5" fill="'+cl(kd.code)+'" stroke="#fff" stroke-width="1.2"/>':'')+'<text y="28">'+esc(kd.code)+'</text><text class="kodam-map-label" y="40" style="font-size:7px;font-weight:700;fill:#f8fafc;stroke:#101827;stroke-width:2px;paint-order:stroke;">'+esc(kd.name.replace(/^Kodam\s*/,''))+'</text></g>'}).join(''):pmG.nodes.map(n=>'<circle cx="'+n.x0+'" cy="'+n.y0+'" r="3" fill="var(--tx)" opacity=".55" pointer-events="none"/>').join(''))+'</svg>';
T.querySelectorAll('[data-kodam]').forEach(g=>g.onclick=()=>{const codes=window.KS_KODAM_SCOPE?.provinceCodesForKodam(g.dataset.kodam)||[];selM=codes[0]||null;renderM()});
T.querySelectorAll('[data-c]').forEach(g=>g.onclick=()=>{selM=g.dataset.c;renderM()});$('#pml').onchange=e=>{pmLogo=e.target.checked;renderM()};if(window.innerWidth<760){T.insertAdjacentHTML('afterbegin','<button id="pmb" class="btn alt" style="margin-bottom:6px">Kembali ke daftar</button>');$('#pmb').onclick=()=>{pmForce=false;renderM()}}
return true}catch(e){return false}}
function calcM(){
const byProvince={},svProvince={},scProvince={},byKodam={},sv={},sc={},is={};
mr.forEach(r=>{(byProvince[r.p]=byProvince[r.p]||[]).push(r);const code=r.kodamCode||(window.KODAM_BY_PROVINCE||{})[r.p];if(code)(byKodam[code]=byKodam[code]||[]).push(r)});
let mx=1;Object.keys(byKodam).forEach(k=>{sv[k]=byKodam[k].reduce((a,r)=>a+r.v,0);mx=Math.max(mx,sv[k])});
Object.keys(byKodam).forEach(k=>{const L=byKodam[k],wr=L.reduce((a,r)=>a+r.r*r.v,0)/Math.max(sv[k],1);sc[k]=Math.min(100,Math.round(.6*wr+40*sv[k]/mx+(L.some(r=>r.s)?10:0)))});
PV.forEach(p=>{const code=(window.KODAM_BY_PROVINCE||{})[p.c];if(code&&sc[code]!=null){scProvince[p.c]=sc[code];svProvince[p.c]=sv[code];byProvince[p.c]=byProvince[p.c]||[]}});
mr.forEach(r=>{const code=r.kodamCode||(window.KODAM_BY_PROVINCE||{})[r.p];if(!code)return;const key=r.i.trim().toLowerCase();(is[key]=is[key]||{t:r.i,p:new Set()}).p.add(code)});
return{by:byProvince,byKodam,sv,sc,svProvince,scProvince,cross:Object.values(is).filter(o=>o.p.size>=2)}
}
function renderM(){
const d=calcM(),T=$('#mmap'),kdByCode=new Map((window.KODAM_DATA||[]).map(k=>[k.code,k])),kdName=c=>kdByCode.get(c)?.name||c,provinceName=c=>PV.find(p=>p.c===c)?.n||c,ks=Object.keys(d.sc).sort((a,b)=>d.sc[b]-d.sc[a]);T.innerHTML='';
if(!pmap(T,d)){T.style.display='';T.style.overflowX='';T.style.gap='';PV.forEach(p=>{const code=(window.KODAM_BY_PROVINCE||{})[p.c],s=d.sc[code],b=document.createElement('button');b.textContent=p.c;b.title=kdName(code)+' · '+p.n+(s!=null?' · skor '+s:' · tanpa data');b.style.gridColumn=p.x+1;b.style.gridRow=p.y+1;if(s==null)b.className='off';else b.style.background=LV(s)[1];if(selM===p.c)b.style.outline='3px solid var(--tx)';b.onclick=()=>{selM=p.c;renderM()};T.appendChild(b)})}
$('#msum').innerHTML=mr.length?`<div class=grid><div class=stat><b>${mr.length}</b>Laporan isu</div><div class=stat><b>${ks.length}</b>Kodam terkait</div><div class=stat><b>${ks.filter(k=>d.sc[k]>=75).length}</b>Kodam prioritas verifikasi segera</div><div class=stat><b>${d.cross.length}</b>Narasi lintas Kodam</div></div>`:'<p class=note>Belum ada data. Tambahkan laporan atau gunakan contoh.</p>';
$('#mdet').innerHTML=selM?(()=>{const kd=kodamForProvince(selM),code=kd?.code,provs=window.KS_KODAM_SCOPE?.provinceCodesForKodam(code)||[selM],L=(d.byKodam[code]||[]).slice().sort((a,b)=>b.v-a.v),s=d.sc[code],lv=s!=null?LV(s):null;return`<h3>${esc(kd?.name||'Kodam belum dipetakan')}</h3><p class=note><b>Provinsi terkait:</b> ${esc(provs.map(provinceName).join(', '))}</p>`+(lv?`<p><span class=badge style=background:${lv[1]}>${lv[0]} · ${s}</span></p><ul>${L.map(r=>`<li>${esc(r.i)} <span class=chip>${r.v} artikel/laporan</span><span class=chip>indikator ${r.r}</span><span class=chip>${esc(provinceName(r.p))}</span>${r.source?'<span class=chip>'+esc(r.source)+'</span>':''}${r.url?'<br><a href="'+esc(r.url)+'" target="_blank" rel="noopener noreferrer">Buka sumber berita</a>':''}${r.publishedAt?'<span class=note> · '+esc(new Date(r.publishedAt).toLocaleString('id-ID'))+'</span>':''}</li>`).join('')}</ul><div class=bti><b>Tindakan:</b> ${REC[lv[0]]}</div>`:'<p class=note>Belum ada laporan untuk Kodam ini.</p>')})():'<p class=note>Pilih marker untuk melihat Kodam terkait, provinsi cakupan, dan laporan.</p>';
lastM=`Prioritas Kodam: ${ks.slice(0,8).map(k=>kdName(k)+' ('+LV(d.sc[k])[0]+' '+d.sc[k]+')').join('; ')||'-'}. Narasi lintas Kodam: ${d.cross.map(o=>o.t+' di '+[...o.p].map(kdName).join(', ')).join(' | ')||'-'}.`;
$('#mx').innerHTML=mr.length?`<h2>Narasi lintas Kodam</h2>${d.cross.length?d.cross.map(o=>`<div class=bti style=margin-bottom:8px><b>${o.p.size} Kodam</b> · ${esc(o.t)}<br><span class=note>${[...o.p].map(k=>esc(kdName(k))).join(', ')}</span></div>`).join(''):'<p class=note>Belum ada narasi yang sama pada dua Kodam atau lebih.</p>'}<h3>Prioritas Kodam</h3><div class=tw><table><tr><th>Kodam</th><th>Status</th><th>Skor</th><th>Artikel/laporan</th></tr>${ks.slice(0,12).map(k=>{const l=LV(d.sc[k]);return`<tr><td>${esc(kdName(k))}</td><td><span class=badge style=background:${l[1]};font-size:.75rem>${l[0]}</span></td><td>${d.sc[k]}</td><td>${d.sv[k]}</td></tr>`}).join('')}</table></div><div class=row><button class='btn alt' id=mcp>Salin ringkasan</button></div><p class=note>Skor dihitung dari laporan provinsi yang dipetakan ke Kodam. Skor adalah indikator prioritas, bukan ukuran ancaman terkonfirmasi. Sumber dan provinsi asal tetap disimpan untuk penelusuran.</p>`:'';
if(mr.length){$('#mcp').onclick=()=>{try{navigator.clipboard.writeText(lastM);$('#mcp').textContent='Tersalin'}catch(e){}}}
if(typeof lastR!=='undefined'&&lastR&&lastR.D&&lastR.D.length){const CE={AWAS:'#b3202a',SIAGA:'#c2410c',WASPADA:'#a16207',AMAN:'#15803d'};$('#mx').insertAdjacentHTML('beforeend',`<h2 style=margin-top:16px>Peringatan dini kognitif (analisis narasi terakhir)</h2><div class=tw><table id=mew><tr><th>Narasi</th><th>Level</th><th>Skor</th><th>Intensitas</th><th>Kecepatan</th><th>Pengulangan</th><th>Manipulasi</th><th>Koordinasi</th><th>Dampak</th><th>Keyakinan</th></tr>${lastR.D.slice(0,8).map(x=>`<tr><td>#${x.klaster} ${esc(String(x.label).slice(0,40))}</td><td><span class=badge style=background:${CE[x.kategori]};font-size:.75rem>${x.kategori}</span></td><td>${x.skor}</td>${['intensitas','kecepatan','pengulangan','manipulasi','koordinasi','dampak'].map(c=>`<td>${x.komponen[c].nilai}</td>`).join('')}<td>${esc(x.keyakinan)}</td></tr>`).join('')}</table></div><p class=note>Sumber: data yang dianalisis di Deteksi Buzzer &amp; Peta Narasi. Indikator, bukan bukti niat pelaku.</p>`)}
}
$('#mpv').innerHTML=(window.KODAM_DATA||[]).slice().sort((a,b)=>a.name.localeCompare(b.name)).map(k=>`<option value=${k.code}>${esc(k.name)}</option>`).join('');
$('#madd').onclick=()=>{const i=$('#mis').value.trim(),v=+$('#mvl').value,r=+$('#mrk').value;if(!i||!(v>0)||v>1e7)return;const kdCode=$('#mpv').value,provCodes=window.KS_KODAM_SCOPE?.provinceCodesForKodam(kdCode)||[];if(!provCodes.length)return;mr.push({p:provCodes[0],i,v,r:Math.max(0,Math.min(100,r||0)),s:$('#msr').checked,sourceType:'manual',kodamCode:kdCode});svM();selM=provCodes[0];$('#mis').value='';renderM()};
$('#mlast').onclick=()=>{const h=hist[hist.length-1];if(!h)return;$('#mrk').value=h.r;$('#msr').checked=h.s};

$('#mrs').onclick=()=>{mr=[];selM=null;svM();renderM()};
function renderPublicNews(){
 const box=$('#mnews');if(!box)return;
 const query=($('#newsSearch')?.value||'').trim().toLowerCase(),level=$('#newsStatus')?.value||'',source=$('#newsSource')?.value||'';
 const rows=publicNews.filter(a=>{const z=a.analysis||{};const hay=[a.title,a.summary,a.source,a.sourceHost].join(' ').toLowerCase();return(!query||hay.includes(query))&&(!level||z.status===level)&&(!source||(a.source||a.sourceHost||'')===source)});
 const colors={AMAN:'#15803d',WASPADA:'#a16207',SIAGA:'#c2410c',KRITIS:'#b3202a'};
 box.innerHTML=rows.slice(0,60).map(a=>{const z=a.analysis||{},status=z.status||'AMAN',risk=Number.isFinite(+z.riskScore)?z.riskScore:(+a.risk||0),confidence=Number.isFinite(+z.confidenceScore)?z.confidenceScore:0;return `<article class="bti" style="margin-bottom:8px;border-left-color:${colors[status]||'var(--gr)'}"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="badge" style="background:${colors[status]||'var(--gr)'}">${esc(status)}</span><span class="chip">Risk ${risk}/100</span><span class="chip">Confidence ${confidence}/100</span></div><b style="display:block;margin-top:6px">${esc(a.title)}</b><span class="note">${esc(a.source||a.sourceHost||'Sumber tidak diketahui')} · ${a.publishedAt?esc(new Date(a.publishedAt).toLocaleString('id-ID')):'tanggal publikasi tidak tersedia'} · ${a.province?esc((window.KS_KODAM_SCOPE?.nameForProvince(a.province)||'Kodam belum terpetakan')+' · '+(PV.find(p=>p.c===a.province)?.n||a.province)):'Kodam belum teridentifikasi'}</span><div class="row" style="margin-top:6px"><a href="${esc(a.url)}" target="_blank" rel="noopener noreferrer">Buka berita asli</a></div><details style="margin-top:6px"><summary>Detail analisis awal · ${esc(z.statusLabel||'Informasional')}</summary><p class="note">${(z.dimensions||[]).map(d=>esc(d.label)).join(' · ')||'Tidak ada dimensi risiko yang menonjol.'}</p><ul>${(z.reasons||['Analisis belum tersedia.']).map(r=>`<li>${esc(r)}</li>`).join('')}</ul><p class="note">Metode: ${esc(z.method||'metadata RSS')} · Analisis: ${z.analyzedAt?esc(new Date(z.analyzedAt).toLocaleString('id-ID')):'belum tersedia'}. ${esc(z.caveat||'')}</p></details></article>`}).join('')||'<p class="note">Tidak ada berita yang cocok dengan pencarian atau filter.</p>';
}
async function fetchPublicNews(){
 const status=$('#mnewsstatus'),box=$('#mnews');status.textContent='Menghubungi Collector dan mengambil artikel RSS…';
 try{
  const base=(localStorage.getItem('ks_collector_url')||'http://127.0.0.1:8787').replace(/\/$/,'');
  const res=await fetch(base+'/news?limit=300',{cache:'no-store'});if(!res.ok)throw new Error('HTTP '+res.status);
  const data=await res.json();if(!data.ok||!Array.isArray(data.items))throw new Error('Format respons Collector tidak sesuai');
  publicNews=data.items;
  const mapped=publicNews.filter(a=>a.province&&PV.some(p=>p.c===a.province));
  const byId=new Map(mapped.map(a=>[a.id,{p:a.province,i:a.title,v:1,r:Math.max(0,Math.min(100,+(a.analysis?.riskScore??a.risk)||0)),s:!!a.sara,sourceType:'public_news',url:a.url,source:a.source||a.sourceHost,publishedAt:a.publishedAt,articleId:a.id}]));
  const manual=mr.filter(x=>x.sourceType==='manual');mr=[...byId.values(),...manual];svM();
  status.textContent=`${data.count} artikel ditampilkan · ${data.totalStored||data.count} tersimpan · ${mapped.length} memiliki petunjuk wilayah yang dapat dipetakan ke Kodam · analisis awal lokal aktif.`;
  const sourceSelect=$('#newsSource');if(sourceSelect){const selected=sourceSelect.value,sources=[...new Set(publicNews.map(a=>a.source||a.sourceHost).filter(Boolean))].sort();sourceSelect.innerHTML='<option value="">Semua media</option>'+sources.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');sourceSelect.value=sources.includes(selected)?selected:'';}
  renderPublicNews();renderM();
 }catch(e){status.textContent='Tidak dapat mengambil berita: '+e.message+'. Jalankan collector/server.js dan pastikan RSS terhubung.';box.innerHTML='<p class="note">Data berita publik belum tersedia. Peta tidak akan mengisi data contoh secara otomatis.</p>';}
}
$('#mfetch').onclick=fetchPublicNews;
['newsSearch','newsStatus','newsSource'].forEach(id=>{const el=$('#'+id);if(el)el.addEventListener('input',renderPublicNews)});
$('#airesearchrun').onclick=async()=>{
 const status=$('#airesearchstatus'),out=$('#airesearchresult'),query=$('#airesearchquery').value.trim(),provider=$('#airesearchprovider').value;
 if(query.length<8){status.textContent='Masukkan pertanyaan minimal 8 karakter.';return;}
 status.textContent='AI sedang menyusun analisis berdasarkan provider dan konteks sumber yang tersedia…';out.innerHTML='';
 try{
  const base=(localStorage.getItem('ks_collector_url')||'http://127.0.0.1:8787').replace(/\/$/,'');
  const res=await fetch(base+'/api/ai/research',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query,provider}),signal:AbortSignal.timeout(100000)});
  const data=await res.json();if(!res.ok||!data.ok)throw new Error((data.results||[]).map(x=>x.error).filter(Boolean).join(' | ')||data.error||'Permintaan AI gagal');
  status.textContent='Riset selesai · '+new Date(data.generatedAt).toLocaleString('id-ID');
  out.innerHTML=(data.results||[]).map(r=>r.error?`<div class="bti"><b>${esc(r.error)}</b></div>`:`<div class="bti" style="margin-bottom:8px"><b>${esc(r.provider)} · ${esc(r.model)}</b> · ${r.searched?'Web search digunakan':'Tidak ada bukti search pada metadata respons'}<div style="white-space:pre-wrap;margin-top:8px">${esc(r.text||'Tidak ada teks keluaran.')}</div><h4>Sumber yang dikembalikan API</h4>${(r.citations||[]).map(c=>`<div><a href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">${esc(c.title)}</a></div>`).join('')||'<span class="note">API tidak mengembalikan daftar sitasi terstruktur. Periksa sitasi yang tercantum di teks dan jangan anggap jawaban terverifikasi.</span>'}</div>`).join('')+`<p class="note">${esc(data.notice||'')}</p>`;
 }catch(e){status.textContent='Gagal: '+e.message;out.innerHTML='<p class="note">Periksa Collector, koneksi internet, konfigurasi API key server, dan kuota penyedia AI.</p>';}
};
renderM();
fetchPublicNews();
newsTimer=setInterval(fetchPublicNews,5*60*1000);
$('#mpng').onclick=()=>mapPNG(cv=>cv.toBlob(b=>dlFile('peta-peringatan-dini-'+stamp()+'.png',b)));
$('#mpdf').onclick=()=>mapPNG(cv=>{const w=window.open('','_blank');if(!w){alert('Pop-up diblokir. Izinkan pop-up lalu coba lagi.');return}w.document.write('<title>Peta Peringatan Dini</title><style>body{margin:0}img{width:100%}@page{margin:8mm}</style><img src="'+cv.toDataURL('image/png')+'" onload="setTimeout(function(){print()},300)">');w.document.close()});
