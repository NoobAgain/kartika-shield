// Bot Penjaga: obrolan literasi
let conv=[];
async function ask(q){if(!q)return;const ch=$("#chat"),add=(t,k)=>{const d=document.createElement("div");d.className="m "+k;d.textContent=t;ch.appendChild(d);ch.scrollTop=ch.scrollHeight;return d};
add(q,"u");conv.push("Pengguna: "+q);const w=add("Berpikir…","b");$("#q").value="";
if(!sample){w.textContent="Mode AI tidak tersedia di tampilan ini. Gunakan tab Analisis Konten (mode offline).";return}
try{const a=await sample(`Anda Bot Penjaga Kartika: asisten literasi anti disinformasi dan proxy war informasi untuk masyarakat Indonesia. Jawab singkat, praktis, sejuk, berbasis nilai toleransi, keharmonisan (tabayyun), dan gotong royong. Jangan menyatakan klaim spesifik benar atau salah tanpa sumber; arahkan ke verifikasi. Bahasa Indonesia.\n\nRiwayat:\n${conv.slice(-8).join("\n")}\n\nJawab pesan terakhir pengguna.`,{cache:false});w.textContent=a.text;conv.push("Bot: "+a.text)}
catch(e){w.textContent=(e&&e.code==="rate_limited")?"Terlalu banyak permintaan, coba sesaat lagi.":"Bot belum dapat menjawab saat ini."}}
$("#send").onclick=()=>ask($("#q").value.trim());$("#q").onkeydown=e=>{if(e.key==="Enter")ask($("#q").value.trim())};
document.querySelectorAll(".qk").forEach(b=>b.onclick=()=>ask(b.textContent));
