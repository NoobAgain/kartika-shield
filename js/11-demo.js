// Demo terpandu: layar pembuka + alur 4 langkah memakai data contoh.
// Data pengguna dicadangkan sebelum demo dan dikembalikan sesudahnya, jadi demo tidak mencemari data nyata.
window.KDEMO=false;
const DTX='VIRAL!!! Warga Makassar harus waspada! Kelompok tertentu akan menguasai desa kita dan menghancurkan rumah ibadah. Pemerintah menutupi semuanya, media tidak berani menayangkan. Share sebelum dihapus!!!';
const dPlace=id=>{const w=document.getElementById('kw_'+id);if(w&&innerWidth>760){w.style.left='440px';w.style.top='84px'}};
const dsleep=ms=>new Promise(r=>setTimeout(r,ms));
async function dwait(f,ms){const t=Date.now();while(Date.now()-t<ms){try{if(f())return true}catch(e){}await dsleep(80)}return false}
const DB_KEY='bs_demo_bk';
let DM={i:-1,auto:true,run:0,badge:''};
const dEl=()=>document.getElementById('kdemo');
function dRestore(){try{const s=localStorage.getItem(DB_KEY);if(!s)return;const b=JSON.parse(s);
['bs_h','bs_m','bs_rev'].forEach(k=>{try{localStorage.setItem(k,JSON.stringify(b[k]||[]))}catch(e){}});
hist.length=0;(b.bs_h||[]).forEach(x=>hist.push(x));mr.length=0;(b.bs_m||[]).forEach(x=>mr.push(x));fRev.length=0;(b.bs_rev||[]).forEach(x=>fRev.push(x));
localStorage.removeItem(DB_KEY)}catch(e){}}
dRestore(); // bila halaman sempat ditutup di tengah demo, kembalikan data pengguna
function dStart(){if(window.KDEMO)return;
try{localStorage.setItem(DB_KEY,JSON.stringify({bs_h:hist,bs_m:mr,bs_rev:fRev}))}catch(e){}
window.KDEMO=true;DM.badge=$('#kbg').textContent;$('#kbg').textContent='DEMO · DATA CONTOH';$('#kbg').classList.add('s');
if(typeof ksim!=='undefined'&&ksim)$('#ksm').click();
hist.length=0;mr.length=0;kReset();document.querySelectorAll('.kw').forEach(w=>w.classList.add('hidden'));kDk();
$('#ksub').textContent='STATISTIK DEMO (DATA CONTOH)';$('#kcl').textContent='SINYAL CONTOH DEMO';dIntroHide();dShow();dGo(0)}
function dEnd(){if(!window.KDEMO){dHide();return}DM.run++;
window.KDEMO=false;document.querySelectorAll('.kw').forEach(w=>w.classList.add('hidden'));kDk();
const b=(()=>{try{return JSON.parse(localStorage.getItem(DB_KEY)||'{}')}catch(e){return{}}})();
hist.length=0;(b.bs_h||[]).forEach(x=>hist.push(x));mr.length=0;(b.bs_m||[]).forEach(x=>mr.push(x));fRev.length=0;(b.bs_rev||[]).forEach(x=>fRev.push(x));
save();svM();svRev();try{localStorage.removeItem(DB_KEY)}catch(e){}
$('#kbg').textContent=DM.badge||'DATA NYATA';$('#kbg').classList.toggle('s',typeof ksim!=='undefined'&&ksim);const sm=typeof ksim!=='undefined'&&ksim;$('#ksub').textContent='STATISTIK SESI '+(sm?'SIMULASI':'NYATA');$('#kcl').textContent=sm?'SINYAL SEJAK 00:00 UTC (SIMULASI)':'SINYAL NYATA SESI INI';kReset();try{renderM()}catch(e){}dHide()}
const DSTEPS=[
{t:'Periksa konten',run:async()=>{kOpen('a');dPlace('a');$('#inp').value=DTX;$('#go').click();await dwait(()=>/RISIKO|DIVERIFIKASI/.test($('#res').textContent),5000);const h=hist[hist.length-1];
return h?`Penilai membaca pola bahasa: huruf kapital dan tanda seru, desakan menyebar, klaim penyembunyian, ancaman, dan isu SARA. Hasil: <b>${esc(h.v)}</b> (${h.r}/100). Tiap temuan dijelaskan, bukan kotak hitam.`:'Konten dinilai dari pola bahasa dan teknik manipulasi.'}},
{t:'Deteksi jaringan buzzer',run:async()=>{kOpen('b');dPlace('b');$('#bex').click();$('#bgo').click();await dwait(()=>document.querySelector('#bres .badge'),5000);
return lastR?`Sistem membandingkan teks antar akun dan waktu unggah. Hasil: indeks koordinasi <b>${lastR.idx}/100</b>, ${lastR.cls.length} klaster narasi, ${lastR.nb} akun terindikasi. Skor akun memakai umur akun, rasio follower, dan unggahan serempak.`:'Kemiripan teks, lonjakan waktu, dan profil akun digabung menjadi indeks koordinasi.'}},
{t:'Peringatan dini per wilayah',run:async()=>{$('#bpm').click();kOpen('m');dPlace('m');await dsleep(700);const n=mr.length;
return `Klaster buzzer dikirim ke peta dan dihitung per provinsi: <b>${n}</b> isu aktif di wilayah masing-masing. Satuan teritorial melihat provinsi mana yang paling diserang dan isu apa yang beredar.`}},
{t:'Pantauan langsung',run:async()=>{document.querySelectorAll('.kw').forEach(w=>w.classList.add('hidden'));kDk();await dsleep(500);
return `Setiap temuan juga masuk ke peta langsung. Data bisa datang dari analisis, impor CSV, atau bot pengambil data (Bluesky, YouTube, Facebook Halaman sendiri). Semua berjalan di peramban, tanpa server, dan tanpa mengirim data keluar.`}}];
function dCard(){let e=dEl();if(!e){e=document.createElement('div');e.id='kdemo';document.body.appendChild(e)}return e}
function dHide(){const e=dEl();if(e)e.remove()}
async function dGo(i){const my=++DM.run;if(i<0)i=0;if(i>=DSTEPS.length){dFinish();return}DM.i=i;const s=DSTEPS[i],e=dCard();
e.className='dm';e.innerHTML=`<div class=dh><b>Demo ${i+1} dari ${DSTEPS.length} · ${s.t}</b><span class=dtag>DATA CONTOH</span></div><div class=db>Menjalankan…</div><div class=dbar><i></i></div><div class=dr><button class="btn alt" data-a=p>Sebelumnya</button><button class="btn alt" data-a=a>${DM.auto?'Jeda':'Putar otomatis'}</button><button class=btn data-a=n>Lanjut</button><button class="btn alt" data-a=x>Hentikan</button></div>`;
dWire(e);let msg='';try{msg=await s.run()}catch(x){msg='Langkah ini tidak bisa dijalankan di peramban Anda.'}
if(my!==DM.run||!window.KDEMO)return;e.querySelector('.db').innerHTML=msg;
if(DM.auto){const bar=e.querySelector('.dbar i');bar.style.transition='width 11s linear';requestAnimationFrame(()=>bar.style.width='100%');
await dsleep(11000);if(my===DM.run&&DM.auto&&window.KDEMO)dGo(i+1)}}
function dWire(e){e.querySelector('.dr').onclick=ev=>{const b=ev.target.closest('button');if(!b)return;const a=b.dataset.a;
if(a==='x')dEnd();else if(a==='n')dGo(DM.i+1);else if(a==='p')dGo(DM.i-1);else if(a==='a'){DM.auto=!DM.auto;if(DM.auto)dGo(DM.i);else{DM.run++;b.textContent='Putar otomatis';const bar=e.querySelector('.dbar i');if(bar){bar.style.transition='none'}}}}}
function dFinish(){DM.run++;const e=dCard();e.className='dm';
e.innerHTML=`<div class=dh><b>Demo selesai</b><span class=dtag>DATA CONTOH</span></div><div class=db>Data contoh akan dibersihkan dan data Anda dikembalikan. Untuk memakai data nyata: impor CSV dari bot di tab <b>Buzzer</b>, atau sambungkan tab <b>Feed</b>.</div><div class=dr><button class="btn alt" data-a=r>Ulangi demo</button><button class=btn data-a=x>Akhiri dan pakai data saya</button></div>`;
e.querySelector('.dr').onclick=ev=>{const b=ev.target.closest('button');if(!b)return;if(b.dataset.a==='x')dEnd();else{DM.auto=true;dGo(0)}}}
function dShow(){dCard()}
// ---- layar pembuka
function dIntroHide(){const e=document.getElementById('kintro');if(e)e.remove();try{localStorage.setItem('bs_intro','1')}catch(e){}}
function dIntro(){if(document.getElementById('kintro'))return;const e=document.createElement('div');e.id='kintro';
e.innerHTML=`<div class=ic><h2>Kartika Shield</h2><p class=is>Pusat peringatan dini disinformasi untuk ruang siber sosial.</p>
<div class=ig><div><b>Masalah</b>Hoaks SARA dan jaringan buzzer menyebar lebih cepat daripada klarifikasi, dan sulit dipantau per wilayah.</div><div><b>Solusi</b>Menilai isi konten, mendeteksi akun yang bergerak serempak, lalu memetakan serangan per provinsi.</div><div><b>Alur</b>Data masuk (analisis, CSV, bot) menjadi klaster narasi, lalu peringatan dini per wilayah. Berjalan lokal, tanpa server.</div></div>
<div class=ir><button class=btn id=idemo>Mulai demo 60 detik</button><button class="btn alt" id=iskip>Lewati, pakai langsung</button></div><p class=in>Demo memakai data contoh dan tidak mengubah data Anda.</p></div>`;
document.body.appendChild(e);$('#idemo').onclick=dStart;$('#iskip').onclick=dIntroHide}
$('#kb_demo')&&($('#kb_demo').onclick=()=>window.KDEMO?dEnd():dStart());
try{if(!localStorage.getItem('bs_intro')&&!hist.length&&!mr.length)setTimeout(dIntro,500)}catch(e){setTimeout(dIntro,500)}
