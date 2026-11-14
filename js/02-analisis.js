// Verifikasi Data: pemeriksaan pola teks dan pengiriman lampiran gambar ke n8n bila tersedia.
let lastH=null;
// Seluruh penilaian berbasis aturan yang transparan; tidak ada AI dan teks tidak dikirim ke server.
const heur = t => KS.teks.analisis(t);
let verifyImage = null;
const verifyImageInput = document.getElementById('verify-image');
const verifyImagePreviewWrap = document.getElementById('verify-image-preview-wrap');
const verifyImagePreview = document.getElementById('verify-image-preview');
const verifyImageStatus = document.getElementById('verify-image-status');
const verifyImageRemove = document.getElementById('verify-image-remove');
if (verifyImageInput) verifyImageInput.addEventListener('change', () => {
  const file = verifyImageInput.files && verifyImageInput.files[0];
  verifyImage = null;
  if (!file) { if (verifyImagePreviewWrap) verifyImagePreviewWrap.hidden = true; return; }
  if (!['image/jpeg','image/png','image/webp','image/heic','image/heif'].includes(file.type)) {
    verifyImageInput.value = '';
    if (verifyImageStatus) verifyImageStatus.textContent = 'Format tidak didukung. Pilih JPG, PNG, WEBP, atau HEIC.';
    return;
  }
  if (file.size > 15 * 1024 * 1024) {
    verifyImageInput.value = '';
    if (verifyImageStatus) verifyImageStatus.textContent = 'Ukuran foto melebihi batas 15 MB.';
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result !== 'string' || !reader.result.startsWith('data:image/')) {
      if (verifyImageStatus) verifyImageStatus.textContent = 'Foto gagal dibaca.';
      return;
    }
    verifyImage = { name: file.name, mime_type: file.type, size_bytes: file.size, file: file };
    if (verifyImagePreview && !['image/heic','image/heif'].includes(file.type)) verifyImagePreview.src = reader.result;
    if (verifyImagePreviewWrap) verifyImagePreviewWrap.hidden = false;
    if (verifyImageStatus) verifyImageStatus.textContent = 'Foto siap dikirim ke n8n (multipart/form-data, maksimal 15 MB).';
  };
  reader.onerror = () => { if (verifyImageStatus) verifyImageStatus.textContent = 'Foto gagal dibaca.'; };
  reader.readAsDataURL(file);
});
if (verifyImageRemove) verifyImageRemove.addEventListener('click', () => {
  verifyImage = null;
  if (verifyImageInput) verifyImageInput.value = '';
  if (verifyImagePreview) verifyImagePreview.removeAttribute('src');
  if (verifyImagePreviewWrap) verifyImagePreviewWrap.hidden = true;
  if (verifyImageStatus) verifyImageStatus.textContent = 'Foto dihapus.';
});
const arahNarasi = t => { const a = KS.teks.analisis(t); return { sasaran: a.sasaran, isu: a.isu, arah: a.arah, emosi: a.emosi }; };
async function analyze(t) { return heur(t); }

$("#go").onclick = async () => {
  const typedText = $("#inp").value.trim();
  const imageAttachment = verifyImage;
  if (!typedText && !imageAttachment) { if (verifyImageStatus) verifyImageStatus.textContent = 'Masukkan teks atau pilih foto terlebih dahulu.'; return; }
  const t = typedText || '[Foto terlampir]';
  const n8nText = typedText;
  const b = $("#go"); b.disabled = true; b.textContent = "Memverifikasi…";
  try {
    const r = await analyze(typedText || '');
    r.risk = Math.max(0, Math.min(100, +r.risk || 0)); r.verdict = NV[r.verdict] || r.verdict; curT = t;
    const c = {}; Object.entries(r.kategori || {}).forEach(([k, v]) => { if (v.skor > 0) c[k] = v.skor; });
    const cid = ksBuatCaseId();
    // Atribusi Kodam hanya berasal dari petunjuk lokasi eksplisit dalam narasi.
    // Tidak ada fallback ke pilihan manual agar hasil tidak diarahkan ke Kodam yang salah.
    const kc = kCity(typedText);
    const locationStatus = document.getElementById('kodam-auto-status');
    if (locationStatus) {
      locationStatus.textContent = kc
        ? 'Kodam terdeteksi otomatis dari petunjuk lokasi dalam narasi: ' + kc[1] + '. Kecocokan lokasi perlu diverifikasi dengan sumber primer.'
        : 'Kodam belum teridentifikasi dari narasi. Tambahkan nama Kodam, provinsi, atau kota yang jelas; sistem tidak akan menebak.';
    }
    hist.push({ v: r.verdict, r: r.risk, s: !!r.sara, t: (r.teknik || []).slice(0, 5), a: (r.sasaran || []).join(', '), dir: r.arah || '', i: r.isu || '', c, d: Date.now(), id: cid });
    if (hist.length > 2000) hist = hist.slice(-2000);
    // Skor aturan (r.risk) tidak diubah; n8n dipanggil terpisah dan gagal dengan tenang (mode offline).
    const ind = (r.teknik || []).concat(Object.keys(c).map(k => (KS.teks.KATEGORI[k] || { nama: k }).nama));
    const g = await analisisGabungan({ id: cid, text: n8nText, ruleScore: r.risk, indicators: ind, source: 'Verifikasi Data', region: kc ? kc[1] : '', image: imageAttachment });
    save(); show(r, g); kReal(typedText || '[Foto terlampir]', r, kc); lastH = { t, r };
    if (imageAttachment && verifyImageStatus) {
      verifyImageStatus.textContent = g.mode === 'online'
        ? 'Workflow n8n mengembalikan hasil. Periksa vonis, alasan, dan skor pada laporan di bawah.'
        : 'Foto belum berhasil dianalisis oleh n8n. Periksa status dan pesan error; hasil lokal bukan analisis isi foto.';
    }
  } catch (e) { $("#res").innerHTML = '<div class="card">Gagal menganalisis. Coba lagi sebentar.</div>'; }
  b.disabled = false; b.textContent = "Verifikasi Data";
};

function fcLinks(t) {
  const q = encodeURIComponent((t || "").replace(/https?:\/\/\S+/g, " ").replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean).slice(0, 12).join(" "));
  const S = [["turnbackhoax.id", "turnbackhoax.id"], ["cekfakta.com", "cekfakta.com"], ["komdigi.go.id", "Komdigi (hoaks)"]];
  return '<p class="note">Tautan membuka pencarian di situs cek fakta. Ada atau tidaknya hasil bukan penentu benar atau salah. Selalu baca laporan aslinya.</p><div class="row" style="margin-top:0">' +
    S.map(([d, n]) => '<a class="btn alt" style="text-decoration:none" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=site%3A' + d + '+' + q + '">Cari di ' + n + '</a>').join("") + '</div>';
}

const KONTEKS_LABEL = { netral: 'Netral', bantahan_bersumber: 'Bantahan/klarifikasi bersumber (skor diturunkan)', kemungkinan_bantahan: 'Kemungkinan bantahan tanpa sumber (skor diturunkan separuh)', tidak_ada_teks: 'Tidak ada teks' };
function kategoriBars(kat) {
  return Object.entries(kat || {}).map(([k, v]) => {
    const meta = KS.teks.KATEGORI[k] || { nama: k, def: '' };
    return `<div class="bar" title="${esc(meta.def)}"><span style="width:190px">${esc(meta.nama)}</span><i style="width:${Math.max(2, v.skor / v.maks * 120)}px;background:${v.skor ? 'var(--gr)' : '#ddd'}"></i>${v.skor}/${v.maks}</div>`;
  }).join("");
}
function show(r, g) {
  const c = COL[r.verdict] || "#a16207", L = a => (a && a.length) ? "<ul>" + a.map(x => "<li>" + esc(x) + "</li>").join("") + "</ul>" : "<p class='note'>Tidak ada.</p>",
    dsn = typeof disarmText === 'function' ? disarmText(curT) : [];
  const bukti = (r.bukti || []).slice(0, 12).map(b => `<li><b>${esc(b.indikator)}</b> ${esc(b.nama)}: <code>${esc(b.kutipan)}</code> <span class="note">…${esc(b.konteks)}…</span></li>`).join("");
  $("#res").innerHTML = `<div class="card"><div class="verdict"><span class="badge" style="background:${c}">${esc(r.verdict)}</span><div class="meter"><i style="width:${r.risk}%;background:${c}"></i></div><b>Risiko ${r.risk}/100</b></div>
${r.sara ? '<p><span class="chip" style="border-color:' + c + '">⚠ Indikasi isu SARA bersama pola manipulasi</span></p>' : ""}${r.lantai ? '<p><span class="chip" style="border-color:' + c + '">⚠ Aturan lantai: indikasi dehumanisasi/kekerasan terhadap kelompok</span></p>' : ""}
${ksPanelHtml(g)}<p class="note" style="margin:6px 0">Penilaian pola bahasa dan teknik manipulasi, bukan pemeriksaan fakta.</p><p>${esc(r.ringkasan)}</p>
<div class=bti><b>Tingkat keyakinan:</b> ${esc(r.keyakinan || '-')} · <b>Konteks:</b> ${esc(KONTEKS_LABEL[r.konteks] || r.konteks || '-')}<br><b>Arah narasi:</b> ${esc(r.arah || 'Netral/tidak jelas')}<br><b>Sasaran:</b> ${esc((r.sasaran || []).join(', ') || 'Tidak spesifik')}<br><b>Isu:</b> ${esc(r.isu || '-')} · <b>Emosi:</b> ${esc(r.emosi || 'Netral')}</div>
<p class=note>Arah dan sasaran adalah perkiraan dari pola bahasa, bukan penilaian benar/salah atau niat pelaku.</p>
<h3>Indikator kognitif (8 kategori)</h3>${kategoriBars(r.kategori)}
<h3>Bukti (kutipan teks ternormalisasi)</h3>${bukti ? '<ul>' + bukti + '</ul>' : "<p class='note'>Tidak ada indikator yang cocok.</p>"}
<h3>Tanda mencurigakan</h3>${L(r.tanda)}<h3>Teknik manipulasi</h3>${(r.teknik || []).map(x => '<span class="chip">' + esc(x) + '</span>').join("") || "-"}
<h3>Pemetaan DISARM</h3>${dsn.length ? dsn.map(d => `<span class="chip" title="${esc(d.name)} · ${esc(DISARM_TACTICS[d.tactic] || d.tactic)}">${esc(d.id)} · ${esc(d.short)}</span>`).join("") : "-"}<p class=note>Rujukan DISARM Red Framework (DISARM Foundation, CC BY-SA 4.0). Isyarat berbasis aturan, bukan atribusi resmi.</p>
<details><summary><b>Metode penilaian &amp; keterbatasan</b></summary><p class=note>${esc(r.metode || '')}</p>${L(r.keterbatasan)}</details>
<h3>Langkah tabayyun</h3>${L(r.tabayyun)}<h3>Cari rujukan cek fakta</h3>${fcLinks(curT)}<h3>Narasi tandingan (nilai Bhinneka)</h3><div class="bti">${esc(r.narasi_tandingan)}</div>
<div class="row"><button class="btn alt" id="cp">Salin narasi tandingan</button></div></div>`;
  $("#cp").onclick = () => { try { navigator.clipboard.writeText(r.narasi_tandingan); $("#cp").textContent = "Tersalin" } catch (e) { } };
}

function dash() {
  const n = hist.length; if (!n) { $("#dash").innerHTML = "<p>Belum ada analisis. Buka Verifikasi Data untuk memulai.</p>"; return }
  const cnt = Object.create(null); hist.forEach(h => cnt[h.v] = (cnt[h.v] || 0) + 1);
  const tk = Object.create(null); hist.forEach(h => (Array.isArray(h.t) ? h.t : []).forEach(x => tk[x] = (tk[x] || 0) + 1));
  const kg = Object.create(null); hist.forEach(h => Object.keys(h.c || {}).forEach(k => { const nm = (KS.teks.KATEGORI[k] || { nama: k }).nama; kg[nm] = (kg[nm] || 0) + 1; }));
  const avg = Math.round(hist.reduce((a, h) => a + h.r, 0) / n), sa = hist.filter(h => h.s).length;
  const bars = (o, col) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `<div class="bar"><span style="width:190px">${esc(k)}</span><i style="width:${v / n * 180 + 4}px;background:${col ? col(k) : "var(--gr)"}"></i>${v}</div>`).join("");
  $("#dash").innerHTML = `<div class="grid"><div class="stat"><b>${n}</b>Konten dianalisis</div><div class="stat"><b>${avg}</b>Rata-rata risiko</div><div class="stat"><b>${sa}</b>Terindikasi SARA</div></div><h3>Sebaran status</h3>${bars(cnt, k => COL[k] || "#999")}<h3>Kategori indikator kognitif (jumlah konten yang memuatnya)</h3>${bars(kg) || "-"}<h3>Teknik manipulasi terbanyak</h3>${bars(tk) || "-"}<p class=note>Setiap angka berasal dari riwayat verifikasi di peramban ini (Verifikasi Data).</p>`; 
  // Ringkasan terpadu: seluruh modul memakai agregasi Kodam yang sama.
  const kd = typeof calcM === 'function' ? calcM() : {sc:{},sv:{}};
  const kdRows = Object.keys(kd.sc||{}).sort((x,y)=>(kd.sc[y]||0)-(kd.sc[x]||0)).slice(0,8);
  const kdName = code => (window.KODAM_DATA||[]).find(k=>k.code===code)?.name || code;
  const eventCount = typeof kc === 'number' ? kc : 0;
  const earlyCount = typeof mr !== 'undefined' && Array.isArray(mr) ? mr.length : 0;
  const feedCount = typeof fAll !== 'undefined' && Array.isArray(fAll) ? fAll.length : 0;
  const reviewCount = typeof fRev !== 'undefined' && Array.isArray(fRev) ? fRev.length : 0;
  const buzzerClusters = typeof lastR !== 'undefined' && lastR ? (lastR.cls||[]).length : 0;
  $("#dash").insertAdjacentHTML('beforeend',
    `<h3>Ringkasan pemantauan 27 Kodam</h3>
     <div class="grid">
       <div class="stat"><b>${eventCount}</b>Peristiwa peta sesi ini</div>
       <div class="stat"><b>${earlyCount}</b>Catatan Peta Dini</div>
       <div class="stat"><b>${feedCount}</b>Item feed</div>
       <div class="stat"><b>${reviewCount}</b>Tinjauan feed</div>
       <div class="stat"><b>${buzzerClusters}</b>Klaster buzzer terakhir</div>
       <div class="stat"><b>${Object.keys(kd.sc||{}).length}</b>Kodam dengan catatan</div>
     </div>
     <h3>Prioritas Kodam dari Peta Dini</h3>
     ${kdRows.length ? kdRows.map(code=>`<div class="bar"><span style="width:240px">${esc(kdName(code))}</span><i style="width:${Math.max(4,(kd.sc[code]||0)*1.8)}px;background:var(--gr)"></i>${kd.sc[code]} · ${kd.sv[code]||0} laporan</div>`).join('') : '<p class="note">Belum ada catatan terpetakan. Jalankan analisis dengan petunjuk Kodam/provinsi/kota, terima feed, atau tambahkan laporan manual di Peta Dini.</p>'}
     <p class="note">Ringkasan ini menggabungkan riwayat Verifikasi Data, Deteksi Buzzer, data kolektor, dan Peta Dini. Data simulasi ditandai terpisah dan tidak dihitung sebagai kejadian nyata.</p>`
  );

}
$("#rst").onclick = () => { hist = []; save(); dash() };
