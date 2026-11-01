// Live Berita: sematan YouTube
let tv=[];try{tv=JSON.parse(localStorage.getItem('bs_tv')||'[]')}catch(e){}
function vch(s){const m=s.match(/(UC[A-Za-z0-9_-]{22})/);return m?m[1]:''}
function vid(s){s=s.trim();const m=s.match(/(?:v=|youtu\.be\/|\/live\/|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/);return m?m[1]:/^[A-Za-z0-9_-]{11}$/.test(s)?s:''}
function vTabs(a){$('#vt').innerHTML=tv.map((t,i)=>`<button class='btn alt' data-i=${i} style='${i===a?'outline:2px solid #5fd3c8':''}'>${esc(t.n)}</button>`).join('')}
function vShow(i){const t=tv[i];if(!t)return;$('#vp').innerHTML=`<iframe src='${t.ch?'https://www.youtube-nocookie.com/embed/live_stream?channel='+t.ch+'&autoplay=1&mute=1':'https://www.youtube-nocookie.com/embed/'+t.id+'?autoplay=1&mute=1&rel=0'}' style='width:100%;height:100%;border:0' allow='autoplay; encrypted-media; picture-in-picture; fullscreen' allowfullscreen referrerpolicy='strict-origin-when-cross-origin'></iframe>`;$('#vo').href=t.ch?'https://www.youtube.com/channel/'+t.ch+'/live':'https://www.youtube.com/watch?v='+t.id;vTabs(i)}
$('#vs').onclick=()=>{const v0=$('#vu').value,ch=vch(v0),id=ch?'':vid(v0),n=$('#vn').value.trim()||'Saluran';if(!id&&!ch){$('#vp').innerHTML='<p class=note style=padding:16px>Tautan atau ID video tidak valid.</p>';return}const k=tv.findIndex(t=>t.n===n);if(k>=0)tv[k]={n,id,ch};else{tv.push({n,id,ch});if(tv.length>4)tv.shift()}try{localStorage.setItem('bs_tv',JSON.stringify(tv))}catch(e){}vShow(tv.findIndex(t=>t.n===n))};
$('#vt').onclick=e=>{const b=e.target.closest('button');if(b)vShow(+b.dataset.i)};
$('#vx').onclick=()=>{const q=$('#vq').value.trim();if(!q)return;$('#inp').value=q;kOpen('a');$('#go').click()};
document.addEventListener('securitypolicyviolation',e=>{if(/frame|child/.test(e.violatedDirective))$('#vp').innerHTML='<p class=note style=padding:16px>Peramban memblokir penyematan video di halaman ini. Gunakan tombol Buka di YouTube, atau jalankan versi file mandiri.</p>'});
vTabs(-1);
