// Deteksi Buzzer & Peta Narasi/Pengaruh: antarmuka untuk KS.narasi (klaster, koordinasi berlapis, graf, kronologi)
// dan KS.dini (peringatan dini kognitif). Skor adalah INDIKATOR korelasi, bukan bukti buzzer atau niat pelaku.
const SMP=["patriot_77123,5,8,1020,19:02,Pemerintah gagal total! Bangsa kita dijual ke asing #IndonesiaDijual","rakyat_99231,9,15,870,19:03,Pemerintah gagal total, bangsa kita dijual ke asing!! #IndonesiaDijual","user88412093,3,4,1300,19:03,Pemerintah gagal total bangsa kita dijual ke asing #IndonesiaDijual #SadarBangsa","nusa_bela_55610,12,22,990,19:05,Pemerintah gagal total! bangsa kita dijual ke asing #IndonesiaDijual","garuda_sejati_31,20,40,1100,19:06,WASPADA bangsa kita dijual ke asing pemerintah gagal total #IndonesiaDijual","siti_rahma,2100,540,380,19:10,Hari ini ngopi di warung dekat kampus, enak banget kopi tubruknya","budi.santoso,1650,820,410,19:34,Ada yang tahu kenapa harga cabai naik minggu ini?","made_wirawan,3000,1200,600,20:15,Gotong royong bersih sungai di desa kami berjalan lancar hari ini","anon_66120987,4,3,1500,21:40,Kelompok tertentu mau kuasai desa kita! Sebarkan sebelum dihapus #BelaAgama","suara_umat_44120,7,10,920,21:41,Kelompok tertentu mau menguasai desa kita, sebarkan sebelum dihapus! #BelaAgama","pejuang_71299,11,19,1010,21:42,KELOMPOK TERTENTU mau kuasai desa kita sebarkan sebelum dihapus #BelaAgama","ayu_lestari,900,300,250,22:05,Terima kasih tetangga yang sudah bantu pindahan kemarin"];
const EV=[['ba_881234,4,6,1100,10:00,Vaksin ini racun untuk umat kita sebarkan segera',1],['info_umat_5521,8,9,900,10:01,vaksin ini racun untuk umat kita, sebarkan!!',1],['peduli_bangsa99120,15,14,1300,10:01,V4ksin ini racun untuk umat kita sebarkan segera',1],['wargaresah_207,700,150,300,10:02,Vaksin ini racun untuk umat kita sebarkan segera',1],['sahabat_nkri,520,60,200,10:04,vaksin ini racun untuk umat kita sebarkan segera ya',1],['dewi_k,1200,430,380,10:03,Ada yang tahu jadwal vaksin di puskesmas Gubeng?',0],['rudi_hartono,15,5,60,10:05,Baru pindah kerja nih, mohon doanya',0],['nadia88,25,10,120,10:06,Resep soto ayam favoritku akhirnya kucoba',0],['kopi_pagi,2400,900,500,10:10,Vaksin booster dosis kedua sudah selesai tadi pagi',0],['joko_p,300,120,200,10:12,Harga bensin naik lagi ya bulan ini',0],['pasukan_aksi_44120,6,5,1400,14:00,Hentikan impor beras kita dijajah pangan asing #BoikotImpor',1],['aksi_nyata_90231,9,8,1200,14:00,Hentikan impor beras!! kita dijajah pangan asing #BoikotImpor',1],['patriot_pangan_5512,11,12,990,14:01,hentikan impor beras kita dijajah pangan asing',1],['relawan_donor1,900,300,250,16:00,Ayo donor darah Minggu ini di balai desa jam 8 pagi',0],['relawan_donor2,1500,420,300,16:01,Ayo donor darah Minggu ini di balai desa jam 8 pagi',0],['relawan_donor3,700,210,260,16:02,ayo donor darah minggu ini di balai desa jam 8 pagi',0],['relawan_donor4,1100,380,320,16:03,Ayo donor darah Minggu ini di balai desa jam 8 pagi!',0],['spam_user73381920,3,2,2000,15:00,Klik link ini untuk hadiah gratis sekarang',1]];
const BMAKS = 20000;
let lastB = "", lastR = null, bRej = [];

// ---------- Impor & validasi CSV: akun,umur_hari,follower,following,waktu,teks[|KODE] ----------
// waktu = HH:MM (tanpa tanggal) ATAU YYYY-MM-DDTHH:MM (disarankan: kronologi lintas hari)
function parseBV(t) {
  const R = { rows: [], rej: [], dup: 0, warn: [], total: 0, hdr: false, cut: false }, seen = new Set(); let first = true;
  t = String(t || '').replace(/^\uFEFF/, '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  t.split(/\r?\n/).forEach((raw, i) => {
    const l = raw.trim(); if (!l) return; const p = l.split(',');
    if (first) { first = false; if (p.length >= 2 && isNaN(+p[1].trim())) { R.hdr = true; return } }
    R.total++; const no = i + 1, bad = w => R.rej.push({ n: no, w, l: l.slice(0, 90) });
    if (R.rows.length >= BMAKS) { R.cut = true; return }
    if (p.length < 6) return bad('kolom kurang dari 6');
    const u = p[0].trim().replace(/^@/, ''); if (!u) return bad('akun kosong'); if (u.length > 64) return bad('akun lebih dari 64 karakter'); if (/\s/.test(u)) return bad('akun mengandung spasi');
    const nm = [p[1], p[2], p[3]].map(x => x.trim()); if (nm.some(x => !/^\d+$/.test(x))) return bad('umur, follower, atau following bukan angka bulat');
    const [age, fo, fi] = nm.map(Number); if (age > 36500 || fo > 2e9 || fi > 2e9) return bad('angka di luar rentang wajar');
    const wk = p[4].trim();
    if (!/^([01]?\d|2[0-3]):[0-5]\d$/.test(wk) && !/^\d{4}-\d{2}-\d{2}[T ]([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(wk)) return bad('waktu tidak valid, harus HH:MM atau YYYY-MM-DDTHH:MM');
    const w = KS.narasi.parseWaktu(wk); if (!w) return bad('waktu tidak valid');
    let tail = p.slice(5).join(',').trim(), pv = '';
    const mk = tail.match(/\|([A-Za-z]{2})\s*$/);
    if (mk) { const kd = mk[1].toUpperCase(); if (PV.some(x => x.c === kd)) { pv = kd; tail = tail.replace(/\|[A-Za-z]{2}\s*$/, '') } else if (mk[1] === kd) { R.warn.push({ n: no, w: 'kode provinsi "' + kd + '" tidak dikenal, dikosongkan' }); tail = tail.replace(/\|[A-Za-z]{2}\s*$/, '') } }
    tail = tail.trim().replace(/^"(.*)"$/, '$1').replace(/\s+/g, ' ');
    if (tail.length < 3) return bad('teks kosong atau terlalu pendek');
    if (tail.length > 2000) { tail = tail.slice(0, 2000); R.warn.push({ n: no, w: 'teks dipotong 2000 karakter' }) }
    const k = u + '|' + wk + '|' + tail.toLowerCase(); if (seen.has(k)) { R.dup++; return } seen.add(k);
    R.rows.push({ id: R.rows.length + 1, u, age, fo, fi, tm: w.tm, ts: w.ts, wk, tx: tail, pv });
  });
  return R;
}
const bClean = R => R.rows.map(r => [r.u, r.age, r.fo, r.fi, r.wk, r.tx + (r.pv ? '|' + r.pv : '')].join(',')).join('\n');
function bRep(R) {
  bRej = R.rej; const bad = R.rej.length, ok = R.rows.length;
  const li = R.rej.slice(0, 12).map(x => `<li>baris ${x.n}: ${esc(x.w)} <span class=note>(${esc(x.l)})</span></li>`).join(''), wi = R.warn.slice(0, 5).map(x => `<li>baris ${x.n}: ${esc(x.w)}</li>`).join('');
  $('#bq').innerHTML = R.total || R.hdr ? `<div class="card"><b>Pemeriksaan data</b>: ${R.total} baris dibaca · <b style="color:#15803d">${ok} diterima</b> · <b style="color:${bad ? '#b3202a' : 'inherit'}">${bad} ditolak</b> · ${R.dup} duplikat dibuang${R.warn.length ? ' · ' + R.warn.length + ' peringatan' : ''}${R.cut ? ' · dibatasi ' + BMAKS + ' baris pertama' : ''}${R.hdr ? ' · baris judul dilewati' : ''}${bad ? `<ul style="margin:8px 0 0 18px">${li}</ul>${bad > 12 ? `<p class=note>…dan ${bad - 12} baris lain.</p>` : ''}` : ''}${wi ? `<ul style="margin:8px 0 0 18px">${wi}</ul>` : ''}<div class="row">${bad || R.dup ? '<button class="btn alt" id="bcl">Pakai data bersih</button>' : ''}${bad ? '<button class="btn alt" id="brj">Unduh baris ditolak</button>' : ''}</div></div>` : '';
  const c = $('#bcl'); if (c) c.onclick = () => { $('#bin').value = bClean(R); bRep(parseBV($('#bin').value)) };
  const j = $('#brj'); if (j) j.onclick = () => dlFile('baris-ditolak-' + stamp() + '.csv', new Blob(['\uFEFFbaris,alasan,isi\n' + bRej.map(x => [x.n, csvc(x.w), csvc(x.l)].join(',')).join('\n')], { type: 'text/csv' }));
}

// ---------- Analisis: membungkus KS.narasi + KS.dini dalam bentuk lama (n, acc, cls, idx, nb, burst, tags, rows) ----------
function runB(rows) {
  const N = KS.narasi.analisis(rows), D = KS.dini.peringatanDini(N), por = new Map(N.akun.map(a => [a.u, a]));
  const cls = N.klaster.filter(k => k.akun >= 3).map(k => {
    const ix = k.idx.slice(), us = new Set(ix.map(i => rows[i].u)), ak = [...us].map(u => N._d.byU.get(u));
    const kd = k.koordinasi.bukti.map(b => b.kode), nw = ak.filter(a => a.age < 30).length;
    const dis = typeof disarmCluster === 'function' ? disarmCluster(rows[ix[0]].tx, { copy: true, accounts: us.size, burst: !!k.koordinasi.keluarga.waktu, tags: (k.tagar[0] || [0, 0])[1], newAccounts: nw, sameAge: kd.includes('K4'), numericNames: kd.includes('K5') }) : [];
    return { ix, us, src: ix[0], srcRow: rows[ix[0]], dis, k };
  });
  const role = new Map(); cls.forEach(c => c.ix.forEach(i => role.set(i, i === c.src ? 'Sumber awal' : 'Penguat')));
  const acc = rows.map((r, i) => { const a = por.get(r.u); return { u: r.u, s: a.s, w: a.sinyal, i, label: a.label, role: role.get(i) || '' }; }).sort((a, b) => b.s - a.s);
  const tags = Object.create(null); rows.forEach(r => (r.tx.match(/#[\p{L}\p{N}_]+/gu) || []).forEach(h => tags[h.toLowerCase()] = (tags[h.toLowerCase()] || 0) + 1));
  const burst = N.klaster.reduce((s, k) => s + (k.koordinasi.serempakIdx || []).length, 0);
  return { n: rows.length, acc, cls, idx: N.indeksKoordinasi, nb: N.akun.filter(a => a.label === 'Indikasi kuat tidak autentik').length, nv: N.akun.filter(a => /^Perlu verifikasi/.test(a.label)).length, burst, tags, rows, N, D };
}
$("#bex").onclick = () => $("#bin").value = SMP.map((l, i) => l + "|" + ["JK", "JB", "JT", "JI", "KI", "JK", "JB", "BA", "PA", "PH", "SN", "JK"][i]).join("\n");

// ---------- Tampilan ----------
const KAT_KOOR = { 'indikasi kuat': '#b3202a', 'indikasi sedang': '#c2410c', 'indikasi lemah': '#a16207', 'tidak ada indikasi': '#15803d' };
const COL_EW = { AWAS: '#b3202a', SIAGA: '#c2410c', WASPADA: '#a16207', AMAN: '#15803d' };
const lvAkun = l => /^Indikasi kuat/.test(l) ? '#b3202a' : /^Perlu verifikasi/.test(l) ? '#c2410c' : l === 'Perhatian' ? '#a16207' : '#15803d';

function bGraf(N) {
  const G = N.graf, el = $('#bgraf'); if (!el) return;
  if (!G.nodes.length) { el.innerHTML = '<p class="note">Tidak ada narasi dengan ≥ 2 akun: graf kosong.</p>'; return }
  const W = 720, H = 440, MAXN = 120;
  const nodes = G.nodes.slice().sort((a, b) => b.derajat - a.derajat).slice(0, MAXN).map(n => Object.assign({}, n)), ids = new Set(nodes.map(n => n.id));
  const edges = G.edges.filter(e => ids.has(e.dari) && ids.has(e.ke)).map(e => Object.assign({}, e, { source: e.dari, target: e.ke }));
  const info = `<p class="note">Graf: ${nodes.length} simpul, ${edges.length} sisi${G.nodes.length > MAXN ? ' (dibatasi ' + MAXN + ' simpul berderajat tertinggi dari ' + G.nodes.length + ')' : ''}. Persegi = narasi, lingkaran = akun (warna = skor akun), belah ketupat = tagar. ${esc(G.catatan)}${G.jembatan.length ? ' Akun penghubung ≥ 2 narasi: ' + esc(G.jembatan.slice(0, 8).join(', ')) + '.' : ''}</p>`;
  if (typeof d3 === 'undefined') { el.innerHTML = info + '<p class="note">Pustaka d3 tidak tersedia: visual graf tidak dapat digambar. Data hubungan tetap ada pada ekspor JSON.</p>'; return }
  const sim = d3.forceSimulation(nodes).randomSource(d3.randomLcg(42)).force('link', d3.forceLink(edges).id(n => n.id).distance(e => e.tipe === 'serempak' ? 40 : 70).strength(.6)).force('charge', d3.forceManyBody().strength(-90)).force('center', d3.forceCenter(W / 2, H / 2)).force('col', d3.forceCollide(12)).stop();
  for (let i = 0; i < 250; i++) sim.tick();
  const cl = (v, a, b) => Math.max(a, Math.min(b, v)), px = n => cl(n.x, 14, W - 14), py = n => cl(n.y, 14, H - 14);
  const ec = { unggah: '#5b7bb5', tagar: '#9aa3b2', serempak: '#b3202a' };
  const svg = `<svg id="bsvg" role="img" aria-label="Graf hubungan akun, narasi, dan tagar" viewBox="0 0 ${W} ${H}" style="width:100%;max-width:${W}px;background:#fff;border:1px solid #d8dee9;border-radius:8px" data-nodes="${nodes.length}" data-edges="${edges.length}">` +
    edges.map(e => `<line class="gedge" data-tipe="${esc(e.tipe)}" x1="${px(e.source)}" y1="${py(e.source)}" x2="${px(e.target)}" y2="${py(e.target)}" stroke="${ec[e.tipe] || '#999'}" stroke-width="${Math.min(4, .8 + e.bobot * .4)}" opacity=".55"/>`).join('') +
    nodes.map(n => {
      const x = px(n), y = py(n), t = `<title>${esc(n.tipe)}: ${esc(n.label)}${n.skor != null ? ' · skor ' + n.skor : ''}${n.sumber && n.sumber.length ? ' · baris ' + esc(n.sumber.slice(0, 8).join(',')) : ''}</title>`;
      if (n.tipe === 'narasi') return `<g class="gnode" data-id="${esc(n.id)}"><rect x="${x - 9}" y="${y - 9}" width="18" height="18" fill="#17335f"/>${t}<text x="${x + 12}" y="${y + 4}" font-size="10" fill="#17335f">${esc(String(n.label).slice(0, 34))}</text></g>`;
      if (n.tipe === 'tagar') return `<g class="gnode" data-id="${esc(n.id)}"><path d="M${x} ${y - 8}L${x + 8} ${y}L${x} ${y + 8}L${x - 8} ${y}Z" fill="#8a94a6"/>${t}<text x="${x + 10}" y="${y + 3}" font-size="9" fill="#555">${esc(n.label)}</text></g>`;
      return `<g class="gnode" data-id="${esc(n.id)}"><circle cx="${x}" cy="${y}" r="${5 + Math.min(5, n.derajat / 3)}" fill="${n.skor >= 70 ? '#b3202a' : n.skor >= 40 ? '#c2410c' : '#15803d'}"/>${t}</g>`;
    }).join('') + '</svg>';
  el.innerHTML = info + '<div style="overflow-x:auto">' + svg + '</div>';
}

function showB(r) {
  const N = r.N, D = r.D, sk = N._sk, kls = N.klaster.filter(k => k.akun >= 2), maxK = kls.reduce((m, k) => k.koordinasi.skor > m.skor ? { skor: k.koordinasi.skor, kat: k.koordinasi.kategori } : m, { skor: 0, kat: 'tidak ada indikasi' });
  const vcol = KAT_KOOR[maxK.kat], ew = new Map(D.map(x => [x.klaster, x]));
  const rel = N._d.map(x => sk.rel(x)), mn = Math.min(...rel), mx = Math.max(...rel), B = Math.min(24, Math.max(6, Math.ceil((mx - mn + 1) / 10))), sz = (mx - mn + 1) / B, bk = Array(B).fill(0), hot = Array(B).fill(0);
  const panas = new Set(); N.klaster.filter(k => k.akun >= 3 && k.koordinasi.skor >= 50).forEach(k => k.idx.forEach(i => panas.add(i)));
  rel.forEach((v, i) => { const k = Math.min(B - 1, Math.floor((v - mn) / sz)); bk[k]++; if (panas.has(i)) hot[k]++ }); const mb = Math.max(...bk, 1);
  const tg = Object.entries(r.tags).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const disAll = {}; r.cls.forEach(c => (c.dis || []).forEach(d => disAll[d.id] = d)); const dis = Object.values(disAll);
  const tgl = N.waktuMode === 'tanggal' ? 'tanggal & jam' : 'jam saja (tanpa tanggal)';
  lastB = `Koordinasi tertinggi ${maxK.skor}/100 (${maxK.kat}). ${r.n} unggahan, ${kls.length} klaster narasi (≥2 akun), ${r.nb} akun dengan indikasi kuat tidak autentik, ${r.nv} perlu verifikasi. Peringatan dini tertinggi: ${D[0] ? D[0].kategori + ' ' + D[0].skor : 'tidak ada'}. DISARM: ${dis.map(x => x.id).join(', ') || '-'}.`;
  const akunU = [], visto = new Set(); r.acc.forEach(a => { if (!visto.has(a.u)) { visto.add(a.u); akunU.push(a) } });
  const tabelNarasi = kls.length ? `<div class="tw"><table id="btn"><tr><th>#</th><th>Narasi (kata kunci)</th><th>Akun</th><th>Unggahan</th><th>Durasi</th><th>Koordinasi</th><th>Manipulasi</th><th>Peringatan dini</th></tr>${kls.map(k => { const e = ew.get(k.id); return `<tr data-klaster="${k.id}"><td>${k.id}</td><td>${esc(k.label)}<br><span class=note>mulai ${esc(k.mulai)} · ${k.bantahan ? k.bantahan + ' bantahan · ' : ''}${k.varian} varian</span></td><td>${k.akun}</td><td>${k.n}</td><td>${k.durasiMenit} mnt</td><td><b style="color:${KAT_KOOR[k.koordinasi.kategori]}">${k.koordinasi.skor}</b><br><span class=note>${esc(k.koordinasi.kategori)}</span></td><td>${k.manipulasi}/${k.manipulasiMaks}</td><td>${e ? `<b style="color:${COL_EW[e.kategori]}">${e.kategori}</b> ${e.skor}` : '-'}</td></tr>` }).join('')}</table></div>` : '<p class="note">Tidak ada narasi yang dibagikan ≥ 2 akun.</p>';
  const ewHtml = D.length ? D.map(x => `<div class=bti style="margin-bottom:8px" data-ew="${x.klaster}"><b style="color:${COL_EW[x.kategori]}">${x.kategori} ${x.skor}</b> · narasi #${x.klaster} <span class=note>(keyakinan ${esc(x.keyakinan)})</span><br>${Object.entries(x.komponen).map(([k, v]) => `<div class="bar" title="${esc(KS.dini.DEF_KOMPONEN[k])}"><span style="width:110px">${esc(k)}</span><i style="width:${Math.max(2, v.nilai * 1.2)}px;background:var(--gr)"></i>${v.nilai} <span class=note>&nbsp;${esc(v.metrik)}</span></div>`).join('')}${x.gerbang.length ? '<ul>' + x.gerbang.map(g => '<li class=note>' + esc(g) + '</li>').join('') + '</ul>' : ''}<details><summary class=note>Rekomendasi respons defensif &amp; keterbatasan</summary><ul>${x.rekomendasi.map(g => '<li>' + esc(g) + '</li>').join('')}</ul><ul>${x.keterbatasan.map(g => '<li class=note>' + esc(g) + '</li>').join('')}</ul></details></div>`).join('') : '<p class="note">Tidak ada narasi yang memenuhi syarat peringatan dini.</p>';
  const evidKoor = kls.map(k => `<details><summary>Narasi #${k.id}: bukti koordinasi (${k.koordinasi.bukti.length} indikator)</summary><ul>${k.koordinasi.bukti.map(b => `<li><b>${esc(b.kode)}</b> +${b.poin}: ${esc(b.ket)}</li>`).join('') || '<li class=note>Tidak ada.</li>'}</ul>${k.koordinasi.catatan.map(c => '<p class=note>' + esc(c) + '</p>').join('')}${k.koordinasi.alternatif.length ? '<p class=note><b>Penjelasan alternatif yang perlu dipertimbangkan:</b></p><ul>' + k.koordinasi.alternatif.map(a => '<li class=note>' + esc(a) + '</li>').join('') + '</ul>' : ''}</details>`).join('');
  const kron = N.kronologi.slice(0, 25).map(e => `<li><b>${esc(e.waktu)}</b> · narasi #${e.klaster} · ${esc(e.aksi)} <span class=note>(${esc(e.akun)})</span></li>`).join('');
  $("#bres").innerHTML = `<div class="card"><div class="verdict"><span class="badge" style="background:${vcol}">Koordinasi: ${esc(maxK.kat)}</span><div class="meter"><i style="width:${maxK.skor}%;background:${vcol}"></i></div><b>${maxK.skor}/100</b></div>
<p class="note">Nilai tertinggi di antara klaster narasi (tidak diencerkan oleh unggahan organik). Kesamaan teks dan waktu saja tidak cukup menyimpulkan koordinasi; skor dibatasi 60 tanpa indikator profil akun.</p>
<div class="grid" style="margin-top:12px"><div class="stat"><b>${r.n}</b>Unggahan</div><div class="stat"><b>${kls.length}</b>Narasi (≥2 akun)</div><div class="stat"><b>${r.nb}</b>Indikasi kuat tidak autentik</div><div class="stat"><b>${r.nv}</b>Perlu verifikasi</div><div class="stat"><b>${r.burst}</b>Unggahan serempak</div></div>
<p class=note>Waktu data: ${tgl}. Proses ${N.durasiProsesMs} ms. ${N.catatan.map(esc).join(' ')}</p>
<h3>Narasi utama &amp; pengelompokan konten serupa</h3>${tabelNarasi}
<h3>Peringatan dini kognitif</h3><p class=note>Skor komposit 6 komponen berbobot dengan gerbang level (AWAS/SIAGA/WASPADA/AMAN). Arahkan kursor ke nama komponen untuk definisi.</p>${ewHtml}
<h3>Bukti indikasi koordinasi</h3>${evidKoor || '<p class=note>-</p>'}
<h3>Peta hubungan akun – narasi – tagar</h3><div id="bgraf"></div>
<h3>Kronologi penyebaran</h3>${kron ? '<ol id="bkron">' + kron + '</ol>' : '<p class=note>-</p>'}
<h3>Garis waktu (merah = bagian narasi dengan koordinasi ≥ 50)</h3><div class="tl">${bk.map((v, k) => `<i class="${hot[k] / Math.max(v, 1) > .5 ? 'hot' : ''}" style="height:${v / mb * 100}%" title="${v}"></i>`).join('')}</div>
${tg.length ? '<h3>Tagar teramplifikasi</h3>' + tg.map(([h, v]) => `<span class="chip">${esc(h)} ×${v}</span>`).join('') : ''}
${dis.length ? `<h3>Taktik/teknik DISARM (isyarat)</h3>${dis.map(d => `<span class="chip" title="${esc(d.name)} · ${esc(DISARM_TACTICS[d.tactic] || d.tactic)}">${esc(d.id)} · ${esc(d.short)}</span>`).join('')}<p class=note>Rujukan DISARM Red Framework (CC BY-SA 4.0). Isyarat korelasi, bukan atribusi.</p>` : ''}
<h3>Skor per akun (berlapis: profil, teks, waktu)</h3><div class="tw"><table><tr><th>Akun</th><th>Skor</th><th>Status</th><th>Sinyal</th></tr>${akunU.map(a => `<tr><td>${esc(a.u)}</td><td>${a.s}</td><td><b style="color:${lvAkun(a.label)}">${esc(a.label)}</b></td><td>${esc(a.w.join('; ') || '-')}</td></tr>`).join('')}</table></div>
<p class="note">Status "Indikasi kuat tidak autentik" memerlukan ≥ 2 sinyal profil DAN korelasi teks/waktu. Skor adalah indikator, bukan bukti. Verifikasi manual sebelum menindak akun mana pun.</p>
<div class="row"><button class="btn" id="bsit">Laporan situasi kognitif</button><button class="btn alt" id="bcp">Salin ringkasan</button><button class="btn alt" id="bgj">Ekspor hasil (JSON)</button></div><div id="bout" class="bti hidden" style="margin-top:10px;white-space:pre-wrap"></div></div>`;
  bGraf(N);
  $("#bcp").onclick = () => { try { navigator.clipboard.writeText(lastB + "\n" + akunU.filter(a => a.s >= 40).map(a => a.u + " (" + a.s + "): " + a.w.join(", ")).join("\n")); $("#bcp").textContent = "Tersalin" } catch (e) { } };
  $("#bsit").onclick = () => { const o = $("#bout"); o.classList.remove("hidden"); o.textContent = KS.dini.laporanTeks(KS.dini.laporanSituasi(N, D, { namaWilayah: Object.fromEntries(PV.map(p => [p.c, p.n || p.c])) })) };
  $("#bgj").onclick = () => { const { _d, _sk, ...ringan } = N; dlFile('analisis-narasi-' + stamp() + '.json', new Blob([JSON.stringify({ narasi: ringan, peringatanDini: D }, null, 1)], { type: 'application/json' })) };
}

$("#bgo").onclick = () => {
  const R = parseBV($("#bin").value); bRep(R);
  if (R.rows.length < 3) { $("#bres").innerHTML = '<div class="card">Minimal 3 baris valid. Periksa data atau gunakan contoh.</div>'; return }
  try { showB(lastR = runB(R.rows)); kBuzz(lastR) } catch (e) { $("#bres").innerHTML = '<div class="card">Analisis gagal: ' + esc(e && e.message || e) + '</div>' }
};

// Kirim ke Peta Dini: satu catatan per (provinsi, narasi); risiko = skor peringatan dini narasi
$('#bpm').onclick = () => {
  if (!lastR) return; const g = {};
  lastR.N.klaster.filter(k => k.akun >= 3).forEach(k => {
    const e = lastR.D.find(x => x.klaster === k.id), t = lastR.rows[k.idx[0]].tx;
    k.idx.forEach(i => { const r = lastR.rows[i]; if (!PV.some(x => x.c === r.pv)) return; const o = g[r.pv + '|' + k.id] = g[r.pv + '|' + k.id] || { p: r.pv, i: t, v: 0, r: e ? e.skor : 0, s: !!k.sara }; o.v++ });
  });
  const L = Object.values(g); if (!L.length) { $('#bpm').textContent = 'Tambahkan |KODE di tiap baris'; return }
  L.forEach(o => mr.push({ p: o.p, i: o.i, v: o.v, r: o.r, s: o.s })); svM(); renderM(); document.querySelector('[data-t=m]').click();
};

$('#bev').onclick = () => {
  const r = runB(parseBV(EV.map(e => e[0]).join('\n')).rows), sc = [];
  r.acc.forEach(a => sc[a.i] = a.s);
  const pc = v => Math.round(v * 100) + '%', m = T => {
    let tp = 0, fp = 0, fn = 0, tn = 0;
    EV.forEach((e, i) => { const p = sc[i] >= T; if (p && e[1]) tp++; else if (p) fp++; else if (e[1]) fn++; else tn++ });
    const pr = tp / Math.max(tp + fp, 1), rc = tp / Math.max(tp + fn, 1);
    return `<tr><td>${T}+</td><td>${tp}</td><td>${fp}</td><td>${fn}</td><td>${tn}</td><td>${pc(pr)}</td><td>${pc(rc)}</td><td>${pc(2 * pr * rc / Math.max(pr + rc, 1e-9))}</td></tr>`;
  };
  $('#bev2').innerHTML = `<div class=card><h2>Validasi internal (${EV.length} akun berlabel)</h2><div class=tw><table><tr><th>Ambang skor</th><th>TP</th><th>FP</th><th>FN</th><th>TN</th><th>Precision</th><th>Recall</th><th>F1</th></tr>${m(70)}${m(40)}</table></div><p class=note>Evaluasi memakai data sintetis yang dirancang bersama aturan (sirkular), termasuk kasus sulit. Hasil menunjukkan trade-off ambang, bukan akurasi lapangan. Pengujian lebih lengkap: TEST_REPORT.md.</p></div>`;
};
$('#bfile').onchange = e => {
  const f = e.target.files[0]; if (!f) return;
  if (f.size > 5e6) { $('#bq').innerHTML = '<div class="card">Berkas lebih dari 5 MB. Pecah menjadi beberapa berkas.</div>'; return }
  f.text().then(t => { $('#bin').value = t.replace(/^\uFEFF/, ''); bRep(parseBV(t)) });
};
