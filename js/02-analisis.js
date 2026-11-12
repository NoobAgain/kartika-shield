// Analisis Konten: antarmuka untuk Cognitive Threat Analysis (js/00a-kognitif-teks.js), tautan cek fakta, dashboard sesi.
let lastH=null;
// Seluruh penilaian berbasis aturan yang transparan; tidak ada AI dan teks tidak dikirim ke server.
const heur = t => KS.teks.analisis(t);
const arahNarasi = t => { const a = KS.teks.analisis(t); return { sasaran: a.sasaran, isu: a.isu, arah: a.arah, emosi: a.emosi }; };
async function analyze(t) { return heur(t); }

$("#go").onclick = async () => {
  const t = $("#inp").value.trim(); if (!t) return;
  const b = $("#go"); b.disabled = true; b.textContent = "Menganalisis…";
  try {
    const r = await analyze(t);
    r.risk = Math.max(0, Math.min(100, +r.risk || 0)); r.verdict = NV[r.verdict] || r.verdict; curT = t;
    const c = {}; Object.entries(r.kategori || {}).forEach(([k, v]) => { if (v.skor > 0) c[k] = v.skor; });
    const cid = ksBuatCaseId(), kc = kCity(t);
    hist.push({ v: r.verdict, r: r.risk, s: !!r.sara, t: (r.teknik || []).slice(0, 5), a: (r.sasaran || []).join(', '), dir: r.arah || '', i: r.isu || '', c, d: Date.now(), id: cid });
    if (hist.length > 2000) hist = hist.slice(-2000);
    // Skor aturan (r.risk) tidak diubah; n8n dipanggil terpisah dan gagal dengan tenang (mode offline).
    const ind = (r.teknik || []).concat(Object.keys(c).map(k => (KS.teks.KATEGORI[k] || { nama: k }).nama));
    const g = await analisisGabungan({ id: cid, text: t, ruleScore: r.risk, indicators: ind, source: 'Analisis Konten', region: kc ? kc[1] : '' });
    save(); show(r, g); kReal(t, r); lastH = { t, r };
  } catch (e) { $("#res").innerHTML = '<div class="card">Gagal menganalisis. Coba lagi sebentar.</div>'; }
  b.disabled = false; b.textContent = "Analisis";
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
  const n = hist.length; if (!n) { $("#dash").innerHTML = "<p>Belum ada analisis. Buka Analisis Konten untuk memulai.</p>"; return }
  const cnt = Object.create(null); hist.forEach(h => cnt[h.v] = (cnt[h.v] || 0) + 1);
  const tk = Object.create(null); hist.forEach(h => (Array.isArray(h.t) ? h.t : []).forEach(x => tk[x] = (tk[x] || 0) + 1));
  const kg = Object.create(null); hist.forEach(h => Object.keys(h.c || {}).forEach(k => { const nm = (KS.teks.KATEGORI[k] || { nama: k }).nama; kg[nm] = (kg[nm] || 0) + 1; }));
  const avg = Math.round(hist.reduce((a, h) => a + h.r, 0) / n), sa = hist.filter(h => h.s).length;
  const bars = (o, col) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `<div class="bar"><span style="width:190px">${esc(k)}</span><i style="width:${v / n * 180 + 4}px;background:${col ? col(k) : "var(--gr)"}"></i>${v}</div>`).join("");
  $("#dash").innerHTML = `<div class="grid"><div class="stat"><b>${n}</b>Konten dianalisis</div><div class="stat"><b>${avg}</b>Rata-rata risiko</div><div class="stat"><b>${sa}</b>Terindikasi SARA</div></div><h3>Sebaran status</h3>${bars(cnt, k => COL[k] || "#999")}<h3>Kategori indikator kognitif (jumlah konten yang memuatnya)</h3>${bars(kg) || "-"}<h3>Teknik manipulasi terbanyak</h3>${bars(tk) || "-"}<p class=note>Setiap angka berasal dari riwayat analisis di peramban ini (Analisis Konten).</p>`;
}
$("#rst").onclick = () => { hist = []; save(); dash() };
