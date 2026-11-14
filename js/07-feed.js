// Feed: Bluesky langsung, kolektor SSE, tinjauan manual dan ekspor CSV
function kCity(t){return window.KS_KODAM_SCOPE?.targetFromText(t)||null}
function kProvinceTarget(code){return window.KS_KODAM_SCOPE?.targetFromProvince(code)||null}
function kStoredTarget(value){return window.KS_KODAM_SCOPE?.fromStoredLocation(value)?kProvinceTarget(window.KS_KODAM_SCOPE.fromStoredLocation(value).provinceCode):null}
function kEmit(y,g,risk,txt,src){
  if(!kbuilt)return;
  const up=(o,k)=>{o[k]=(o[k]||0)+1},s=String(txt||'').slice(0,80);
  if(g)kev.push({t:g,y,b:kwt,loc:1});
  kct[y]++;kc++;kbk[y][179]++;
  up(kas,src);if(g)up(kts,g[1]);up(kvt,KT[y][0]);up(knr,s.slice(0,48));
  if(g){
    const k=g[0]+'|'+s,o=kagg[k]=kagg[k]||{p:g[0],i:s,v:0,rs:0};
    o.v++;o.rs+=Number(risk)||0;
    // Alirkan peristiwa yang sama ke Peta Dini dan Laporan.
    // p memakai kode provinsi representatif demi kompatibilitas skema lama;
    // kodamCode adalah identitas agregasi utama.
    const provinceCodes=window.KS_KODAM_SCOPE?.provinceCodesForKodam(g[0])||[];
    if(provinceCodes.length&&typeof mr!=='undefined'){
      mr.push({p:provinceCodes[0],kodamCode:g[0],i:s,v:1,
        r:Math.max(0,Math.min(100,Number(risk)||0)),
        s:/sara|agama|ras|etnis/i.test(s),sourceType:'event',source:src,
        createdAt:new Date().toISOString()});
      if(typeof svM==='function')svM();
      if(typeof renderM==='function')renderM();
    }
  }
  klg.unshift(new Date().toISOString().slice(11,19)+' '+src+' · '+(g?g[1]:'tanpa lokasi')+' · risiko '+risk);
  klg.length=Math.min(klg.length,5);kUI();
}
function kAnalysisTypes(text,r){
  const t=String(text||'');
  const cat=r&&r.kategori||{};
  const score=k=>Number(cat[k]&&cat[k].skor)||0;
  const out=[];
  // SARA hanya ditandai bila mesin analisis menemukan identitas + pola manipulasi,
  // atau ada indikator identitas yang kuat. Bukan sekadar menyebut kelompok.
  if(r&&r.sara)out.push(0);
  // Buzzer/koordinasi: perlu petunjuk eksplisit koordinasi akun/konten.
  // Satu teks tidak cukup untuk menyimpulkan operasi buzzer yang terkoordinasi.
  if(/\b(buzzer|akun bot|akun palsu|akun anonim|akun koordinasi|akun terkoordinasi|serentak|secara serentak|unggahan seragam|narasi seragam|copy[\s-]?paste massal|salin[\s-]?tempel massal|koordinasi akun|jaringan akun)\b/i.test(t))out.push(1);
  if(/\b(deepfake|deep fake|video hasil ai|suara hasil ai|voice cloning|kloning suara|wajah palsu|video manipulasi|audio manipulasi|gambar hasil ai|rekayasa wajah|rekayasa suara)\b/i.test(t))out.push(2);
  if(score('PROVOKATIF')>0 || /\b(serbu|serang|bakar|kerahkan massa|turun ke jalan|bentrok|rusuh|anarkis|hasut|provokasi|sebarkan sekarang|viralkan sekarang)\b/i.test(t))out.push(3);
  if(/\b(phishing|otp|kode verifikasi|kata sandi|password|login|akun diblokir|verifikasi akun|tautan palsu|link palsu|klik tautan|klik link|rekening|paket tertahan|hadiah gratis)\b/i.test(t))out.push(4);
  return [...new Set(out)];
}
function kRecordAnalysis(text,r,target){
  // Statistik sesi diperbarui untuk SETIAP analisis yang selesai, walaupun
  // lokasi/Kodam belum dapat diidentifikasi. Peta hanya menerima lokasi terpetakan.
  const types=kAnalysisTypes(text,r), risk=Math.max(0,Math.min(100,Number(r&&r.risk)||0));
  const up=(o,k)=>{o[k]=(o[k]||0)+1}, brief=String(text||'').replace(/\s+/g,' ').slice(0,80);
  const now=new Date(),stamp=now.toISOString();
  kc++;
  const source='Analisis Konten';
  up(kas,source);
  up(knr,brief.slice(0,48));
  types.forEach(y=>{
    kct[y]++;kbk[y][179]++;up(kvt,KT[y][0]);
    if(target)kev.push({t:target,y,b:kwt,loc:1});
  });
  if(target)up(kts,target[1]);
  klg.unshift(now.toISOString().slice(11,19)+' '+source+' · '+(target?target[1]:'Kodam belum teridentifikasi')+' · '+(types.length?types.map(y=>KT[y][0]).join(', '):'tanpa kategori ancaman spesifik')+' · risiko '+risk);
  klg.length=Math.min(klg.length,5);
  if(target){
    const kodamCode=target[0], provinceCodes=window.KS_KODAM_SCOPE?.provinceCodesForKodam(kodamCode)||[];
    if(provinceCodes.length&&typeof mr!=='undefined'){
      mr.push({p:provinceCodes[0],kodamCode,i:brief,v:1,r:risk,s:!!(r&&r.sara),
        sourceType:'event',source,createdAt:stamp,threatTypes:types.map(y=>KT[y][0])});
      if(mr.length>5000)mr=mr.slice(-5000);
      if(typeof svM==='function')svM();
      if(typeof renderM==='function')renderM();
    }
    const key=kodamCode+'|'+brief,o=kagg[key]=kagg[key]||{p:kodamCode,i:brief,v:0,rs:0};
    o.v++;o.rs+=risk;
  }
  kUI();
}
function kReal(t,r,target){
  if(!r)return;
  // Hanya terima target hasil ekstraksi lokasi dari teks; tidak menggunakan
  // pilihan manual atau lokasi bawaan. Tanpa petunjuk eksplisit: tidak diatribusikan.
  const resolvedTarget=target||kCity(t);
  kRecordAnalysis(t,r,resolvedTarget);
}
function kBuzz(r){r.cls.forEach(c=>{const pv=c.ix.map(k=>r.rows[k].pv).filter(Boolean);const freq={};pv.forEach(v=>freq[v]=(freq[v]||0)+1);const p=Object.keys(freq).sort((a,b)=>freq[b]-freq[a])[0];const pCode=p?(window.KS_KODAM_SCOPE?.fromStoredLocation(p)?.provinceCode||p):null;const target=pCode?kProvinceTarget(pCode):kCity(c.ix.map(i=>r.rows[i].tx).join(' '));if(target)kEmit(1,target,Math.min(100,(((r.D||[]).find(x=>c.k&&x.klaster===c.k.id))||{skor:r.idx}).skor),r.rows[c.ix[0]].tx,'Deteksi Buzzer ('+c.us.size+' akun)')})}
let fws=null,fc=[0,0,0];const fSt=m=>{$('#fst').textContent=m};
$('#fgo').onclick=()=>{if(fws){fws.close();return}
try{fws=new WebSocket('wss://jetstream2.us-east.bsky.network/subscribe?wantedCollections=app.bsky.feed.post')}catch(e){fws=null;fSt('Koneksi tidak diizinkan pada halaman ini. Buka aplikasi dari berkas lokal.');return}
fSt('Menyambung...');$('#fgo').textContent='Putuskan';fws.onopen=()=>fSt('Tersambung. Menunggu unggahan berbahasa Indonesia...');
fws.onerror=()=>fSt('Gagal tersambung. Buka aplikasi dari berkas lokal lalu coba lagi.');fws.onclose=()=>{fws=null;$('#fgo').textContent='Sambungkan'};
fws.onmessage=e=>{fc[0]++;if(fc[0]%20===0)$('#fn1').textContent=fc[0];const d=e.data;if(d.indexOf('"id"')<0)return;let j;try{j=JSON.parse(d)}catch(x){return}const r=j.commit&&j.commit.record;if(!r||j.commit.operation!=='create'||!r.text||!(r.langs||[]).includes('id'))return;fc[1]++;$('#fn2').textContent=fc[1];
const h=heur(r.text);if(h.risk<45)return;fc[2]++;$('#fn3').textContent=fc[2];const g=kCity(r.text);kEmit(h.sara?0:3,g,h.risk,r.text,'Bluesky');
fAdd({risk:h.risk,src:'Bluesky (langsung)',text:r.text},g)}};
let fes=null,fViral=0,botAuto=false;
const botBase=()=>($('#fk').value.trim()||'http://localhost:8787').replace(/\/$/,'');
const botBody=()=>({keywords:$('#botk').value,intervalMin:+$('#boti').value||10});
async function botApi(path,body){const r=await fetch(botBase()+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});let j={};try{j=await r.json()}catch(e){}if(!r.ok)throw new Error(j.error||('HTTP '+r.status));return j}
const botTime=s=>{try{return s?new Date(s).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}):'-'}catch(e){return '-'}};
function botStatus(t){$('#botst').textContent=t}
function botRender(b){if(!b)return;botAuto=!!b.auto;if(document.activeElement!==$('#botk'))$('#botk').value=(b.keywords||[]).join(', ');if(document.activeElement!==$('#boti'))$('#boti').value=b.intervalMin||10;$('#botauto').textContent=botAuto?'Hentikan otomatis':'Aktifkan otomatis';$('#botnow').disabled=!!b.running;let t=b.running?'Mencari unggahan publik...':b.lastRun?('Terakhir '+botTime(b.lastRun)+' · '+(b.lastFound||0)+' baru · '+(b.lastEmitted||0)+' dikirim'):'Bot belum berjalan.';if(botAuto&&b.nextRun)t+=' · otomatis tiap '+(b.intervalMin||10)+' menit';if(b.lastError&&!b.running)t+=' · '+b.lastError;botStatus(t)}
function botConnect(){if(!fes)$('#fkc').click()}
async function botRefresh(){try{botRender(await botApi('/bot/status'))}catch(e){}}
$('#botnow').onclick=async()=>{try{botConnect();botStatus('Menghubungkan dan menjalankan pencarian...');$('#botnow').disabled=true;const r=await botApi('/bot/search',botBody());botRender(r.bot||r)}catch(e){$('#botnow').disabled=false;botStatus('Gagal menjalankan bot: '+e.message)}};
$('#botauto').onclick=async()=>{try{botConnect();const r=await botApi('/bot/config',{...botBody(),auto:!botAuto});botRender(r.bot||r)}catch(e){botStatus('Gagal mengatur bot: '+e.message)}};
let fAll=[],fRev=[];try{fRev=JSON.parse(localStorage.getItem('bs_rev')||'[]')}catch(e){}
const svRev=()=>{try{localStorage.setItem('bs_rev',JSON.stringify(fRev))}catch(e){}};
const csvc=v=>{v=String(v==null?'':v);if(/^[=+\-@\t\r]/.test(v))v="'"+v;return /[",\n\r]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
const csvOf=(hd,rows)=>'﻿'+[hd.join(',')].concat(rows.map(r=>r.map(csvc).join(','))).join('\r\n');
const dlFile=(name,blob)=>{const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000)};
const stamp=()=>new Date().toISOString().slice(0,16).replace(/[-:T]/g,'');
function fSum(){const n=fRev.length,ok=fRev.filter(x=>x.v).length;$('#frs').innerHTML=n?`Ditinjau <b>${n}</b> · tepat <b>${ok}</b> · salah tandai <b>${n-ok}</b> · presisi <b>${Math.round(ok/n*100)}%</b>${n<30?' <span class=note>(sampel belum cukup, targetkan minimal 30)</span>':''}`:'Belum ada tinjauan. Tandai hasil di bawah untuk mengukur presisi penilaian.'}
function fAdd(h,g){const vs=(h.viral&&Array.isArray(h.viral.sources))?h.viral.sources.map(String):[];const ts=new Date().toISOString(),ar=typeof arahNarasi==='function'?arahNarasi(h.text):null,ds=typeof disarmText==='function'?disarmText(h.text):[];
const cid=h.case_id||ksBuatCaseId();fAll.unshift({id:cid,ts,src:h.src,risk:h.risk,co:h.coordinated||0,city:g?g[1]:'',kodam:g?g[1]:'',provinceCode:h.provinceCode||(window.KS_KODAM_SCOPE?.fromStoredLocation(h.city)?.provinceCode||''),acct:h.acct||'',text:h.text.slice(0,280),viral:h.viral?h.viral.n:0,sources:vs.join('; '),arah:ar?ar.arah:'',sasaran:ar?ar.sasaran.join(', '):'',isu:ar?ar.isu:'',disarm:ds.map(x=>x.id).join(' ')});if(fAll.length>1000)fAll.pop();
const L=$('#flist'),d=document.createElement('div');d.className='bti';d.style.marginBottom='6px';
d.innerHTML=`${h.viral?`<span class=chip style="border-color:#ff4d5e;color:#ff8a94">VIRAL · ${+h.viral.n||0} sumber · ${+h.viral.windowMin||0} menit</span><br>`:''}<b>${h.risk}</b> · ${esc(h.src)}${h.coordinated?' · '+(+h.coordinated||0)+' akun, teks serupa':''}${g?' · '+esc(g[1]):''}<br>${esc(h.text.slice(0,160))}${h.meta?`<br><span class=note>sampel akun: ${+h.meta.newAccounts||0}/${+h.meta.sampled||0} berusia kurang dari 30 hari, median ${+h.meta.medianAgeDays||0} hari</span>`:''}${vs.length?`<br><span class=note>Sumber: ${vs.map(esc).join(', ')}</span>`:''}${ar?`<br><span class=note>Arah: ${esc(ar.arah)} · Sasaran: ${esc(ar.sasaran.join(', ')||'tidak jelas')} · Isu: ${esc(ar.isu||'-')}</span>`:''}${ds.length?`<div style="margin-top:4px">${ds.map(x=>`<span class=chip title="${esc(x.why)}">${esc(x.id)} ${esc(x.short)}</span>`).join('')}</div>`:''}<div class=row style=margin-top:6px><button class='btn alt' data-v=1>Tepat</button><button class='btn alt' data-v=0>Salah tandai</button></div>`;
d.querySelectorAll('button[data-v]').forEach(b=>b.onclick=()=>{const v=+b.dataset.v;fRev.push({ts,src:h.src,risk:h.risk,v,text:h.text.slice(0,200),id:cid});svRev();fSum();kirimTinjauan(cid,v?'tepat':'salah_tandai');d.querySelector('.row').innerHTML='<span class=note>Tercatat: '+(v?'tepat':'salah tandai')+'</span>'});
L.prepend(d);while(L.children.length>8)L.lastChild.remove()}
$('#fkc').onclick=()=>{if(fes){fes.close();fes=null;$('#fkc').textContent='Hubungkan kolektor';fSt('Kolektor diputus.');return}
if(ksim)$('#ksm').click();const u=($('#fk').value.trim()||'http://localhost:8787').replace(/\/$/,'');
try{fes=new EventSource(u+'/events')}catch(e){fes=null;fSt('Koneksi tidak diizinkan di halaman ini. Buka versi berkas mandiri dari komputer Anda.');return}
fSt('Menyambung ke kolektor...');$('#fkc').textContent='Putuskan';
fes.onopen=()=>{fSt('Kolektor tersambung: '+u);botRefresh()};
fes.onerror=()=>{fSt('Kolektor tidak terjangkau. Pastikan server berjalan dan aplikasi dibuka dari berkas lokal.');$('#botnow').disabled=false};
fes.addEventListener('stat',e=>{const s=JSON.parse(e.data);$('#fn1').textContent=+s.seen||0;$('#fn2').textContent=+s.id||0;$('#fn3').textContent=+s.flagged||0;if(s.viral!=null){fViral=+s.viral||0;$('#fn4').textContent=fViral}});
fes.addEventListener('bot',e=>{try{botRender(JSON.parse(e.data))}catch(x){}});
fes.addEventListener('hit',e=>{let h;try{h=JSON.parse(e.data)}catch(x){return}if(!h||typeof h!=='object'||typeof h.text!=='string'||!(+h.risk>=0))return;const g=h.provinceCode?kProvinceTarget(h.provinceCode):kStoredTarget(h.city);if(h.viral){fViral++;$('#fn4').textContent=fViral}kEmit(h.type,g,h.risk,h.text,h.src);fAdd(h,g)})};
fSum();
$('#fcsv').onclick=()=>{if(!fAll.length){fSt('Belum ada hasil untuk diunduh.');return}dlFile('hasil-feed-'+stamp()+'.csv',new Blob([csvOf(['waktu','sumber','risiko','akun_serentak','kodam','kode_provinsi','akun_hash','teks','viral_sumber','viral_penerbit','arah_narasi','sasaran_narasi','isu','disarm'],fAll.map(r=>[r.ts,r.src,r.risk,r.co,r.kodam||r.city,r.provinceCode,r.acct,r.text,r.viral,r.sources,r.arah,r.sasaran,r.isu,r.disarm]))],{type:'text/csv;charset=utf-8'}))};
$('#frcsv').onclick=()=>{if(!fRev.length){fSt('Belum ada tinjauan.');return}dlFile('tinjauan-'+stamp()+'.csv',new Blob([csvOf(['waktu','sumber','risiko','penilaian','teks'],fRev.map(r=>[r.ts,r.src,r.risk,r.v?'tepat':'salah_tandai',r.text]))],{type:'text/csv;charset=utf-8'}))};
$('#frclr').onclick=()=>{if(fRev.length&&!confirm('Hapus semua tinjauan di peramban ini?'))return;fRev=[];svRev();fSum()};
