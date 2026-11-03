// Uji akurasi penilai konten: unggah CSV berlabel (teks,label), hitung presisi, recall, F1, AUC
function csvRows(t){const o=[];let r=[],f='',q=false;t=String(t).replace(/^﻿/,'');
for(let i=0;i<t.length;i++){const c=t[i];if(q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++}else q=false}else f+=c}
else if(c==='"')q=true;else if(c===','){r.push(f);f=''}else if(c==='\n'||c==='\r'){if(c==='\r'&&t[i+1]==='\n')i++;r.push(f);f='';if(r.some(x=>x.trim()))o.push(r);r=[]}else f+=c}
r.push(f);if(r.some(x=>x.trim()))o.push(r);return o}
const accLab=v=>{v=String(v).trim().toLowerCase();if(/^(1|hoax|hoaks|true|ya|salah|manipulatif)$/.test(v))return 1;if(/^(0|valid|false|tidak|benar|normal|bukan)$/.test(v))return 0;return -1};
function accAUC(pos,neg){if(!pos.length||!neg.length)return null;const a=pos.map(x=>[x,1]).concat(neg.map(x=>[x,0])).sort((p,q)=>p[0]-q[0]);let rk=0,i=0,sp=0;while(i<a.length){let j=i;while(j<a.length&&a[j][0]===a[i][0])j++;const m=(i+j+1)/2;for(let k=i;k<j;k++)if(a[k][1])sp+=m;i=j}return(sp-pos.length*(pos.length+1)/2)/(pos.length*neg.length)}
function accRun(text){const R=csvRows(text);if(!R.length)return null;let hd=false;if(R[0].length>=2&&accLab(R[0][R[0].length-1])<0&&accLab(R[0][1])<0)hd=true;
const D=[];let skip=0;R.slice(hd?1:0).forEach(r=>{if(r.length<2){skip++;return}const lab=accLab(r[r.length-1]),tx=r.slice(0,-1).join(',').trim();if(lab<0||tx.length<3){skip++;return}D.push({t:tx.slice(0,1500),y:lab})});
const cap=D.length>20000;const S=D.slice(0,20000).map(d=>({y:d.y,r:heur(d.t).risk,m:mlScore(d.t)}));
const pos=S.filter(s=>s.y).map(s=>s.r),neg=S.filter(s=>!s.y).map(s=>s.r);
const th=[20,45,65].map(T=>{const tp=pos.filter(x=>x>=T).length,fp=neg.filter(x=>x>=T).length,fn=pos.length-tp,tn=neg.length-fp,p=tp/(tp+fp||1),r=tp/(pos.length||1);return{T,tp,fp,fn,tn,p,r,f:2*p*r/(p+r||1),fpr:fp/(neg.length||1)}});
return{n:S.length,np:pos.length,nn:neg.length,skip,hd,cap,th,auc:accAUC(pos,neg)}}
function accShow(o){if(!o){$('#xar').innerHTML='<p class=note>Berkas kosong.</p>';return}
if(!o.np||!o.nn){$('#xar').innerHTML=`<p style="color:#b3202a">Butuh minimal satu contoh hoaks dan satu contoh valid. Terbaca ${o.np} hoaks, ${o.nn} valid, ${o.skip} baris dilewati.</p>`;return}
const pc=x=>(x*100).toFixed(1)+'%',nm={20:'Perlu diverifikasi ke atas (risiko ≥20)',45:'Risiko sedang ke atas (≥45)',65:'Risiko tinggi (≥65)'};
$('#xar').innerHTML=`<p style="margin-top:10px"><b>${o.n}</b> baris diuji (${o.np} hoaks, ${o.nn} valid${o.skip?', '+o.skip+' dilewati':''}${o.cap?', dibatasi 20.000':''}). Kemampuan memisahkan (AUC): <b>${o.auc==null?'-':o.auc.toFixed(3)}</b> <span class=note>(0,5 = tebakan acak, 1 = sempurna)</span></p>
<table style="width:100%;border-collapse:collapse;font-size:.82rem"><tr style="text-align:left"><th>Tanda dianggap hoaks bila</th><th style="text-align:right">Presisi</th><th style="text-align:right">Recall</th><th style="text-align:right">F1</th><th style="text-align:right">Salah tandai</th></tr>${o.th.map(t=>`<tr><td>${nm[t.T]}</td><td style="text-align:right">${pc(t.p)}</td><td style="text-align:right">${pc(t.r)}</td><td style="text-align:right">${pc(t.f)}</td><td style="text-align:right">${pc(t.fpr)} (${t.fp} dari ${o.nn})</td></tr>`).join('')}</table>
<p class=note>Presisi dan F1 bergantung pada perbandingan jumlah hoaks dan valid di data Anda. Jangan menguji pada data yang sama dengan data latih model (IDNHoaxCorpus), hasilnya terlalu optimistis.</p>`}
$('#xaf').onchange=e=>{const f=e.target.files[0];e.target.value='';if(!f)return;if(f.size>10e6){$('#xar').innerHTML='<p>Berkas lebih dari 10 MB.</p>';return}
f.text().then(t=>{$('#xar').innerHTML='<p class=note>Menghitung…</p>';setTimeout(()=>{try{accShow(accRun(t))}catch(x){$('#xar').innerHTML='<p>Berkas tidak bisa diproses.</p>'}},30)})};
