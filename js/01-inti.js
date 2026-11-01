// Inti: utilitas, riwayat analisis, tab, mode AI opsional
const $=s=>document.querySelector(s),esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const COL={"RISIKO TINGGI":"#b3202a","RISIKO SEDANG":"#c2410c","PERLU DIVERIFIKASI":"#a16207","RISIKO RENDAH":"#15803d"};
const NV={HOAKS:"RISIKO TINGGI",MENYESATKAN:"RISIKO SEDANG","KEMUNGKINAN VALID":"RISIKO RENDAH"};
let hist=[];try{hist=JSON.parse(localStorage.getItem("bs_h")||"[]")}catch(e){}
hist.forEach(x=>{if(x&&NV[x.v])x.v=NV[x.v]});
const save=()=>{try{localStorage.setItem("bs_h",JSON.stringify(hist))}catch(e){}};
document.querySelectorAll("#tabs button").forEach(b=>b.onclick=()=>{document.querySelectorAll("#tabs button").forEach(x=>x.classList.toggle("on",x===b));["a","b","m","k","w","c","d","e"].forEach(k=>$("#"+k).classList.toggle("hidden",k!==b.dataset.t));if(b.dataset.t==="d")dash();if(b.dataset.t==="k")kInit()});
let curT="",sample=null;(async()=>{try{sample=await claude.use("sample")}catch(e){}})();
$("#ex").onclick=()=>$("#inp").value="VIRAL!!! Segera sebarkan ke semua grup! Kelompok tertentu akan menguasai desa kita dan menghancurkan rumah ibadah. Pemerintah menutupi semuanya, media tidak berani menayangkan. Share sebelum dihapus!!!";
$("#clr").onclick=()=>{$("#inp").value="";$("#res").innerHTML=""};
