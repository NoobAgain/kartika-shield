// Narrative & Influence Mapping: pengelompokan narasi, kronologi, indikator koordinasi, graf akun-narasi-tagar.
// Berbasis kemiripan teks (Jaccard bigram + himpunan kata isi), korelasi waktu, dan profil akun. Tanpa AI.
// PRINSIP: kemiripan kata dan waktu unggah saja TIDAK cukup menyimpulkan koordinasi atau "buzzer".
// Hasil memuat penjelasan alternatif dan batas keyakinan; skor adalah indikator, bukan bukti niat.
(function (g) {
  'use strict';
  const T = (typeof require === 'function' && typeof module !== 'undefined' && module.exports) ? require('./00a-kognitif-teks.js') : g.KS.teks;
  const PARAM = { jendelaMenit: 5, simBigram: 0.5, simKata: 0.7, minKataIsi: 4, akunBaruHari: 30, akunMudaHari: 90, sampelAnalisis: 25, pindaiMaks: 150 };

  // ---------- Waktu ----------
  function parseWaktu(v) {
    if (v == null || v === '') return null;
    if (typeof v === 'number' && isFinite(v)) {
      if (v > 1e11) { const dt = new Date(v); return { tm: dt.getUTCHours() * 60 + dt.getUTCMinutes(), ts: v }; }   // epoch ms (mis. dari parseBV)
      return { tm: ((Math.round(v) % 1440) + 1440) % 1440, ts: null };                                          // menit dalam hari
    }
    const s = String(v).trim();
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (m) { const ts = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)); return { tm: +m[4] * 60 + +m[5], ts }; }
    m = s.match(/^(\d{1,2}):(\d{2})$/);
    if (m && +m[1] < 24 && +m[2] < 60) return { tm: +m[1] * 60 + +m[2], ts: null };
    return null;
  }
  const selisihSirkular = (a, b) => { const d = Math.abs(a - b) % 1440; return Math.min(d, 1440 - d); };

  // ---------- Util ----------
  function jaccard(a, b) { if (!a.size || !b.size) return 0; let i = 0; const [k, l] = a.size < b.size ? [a, b] : [b, a]; for (const x of k) if (l.has(x)) i++; return i / (a.size + b.size - i); }
  class UF { constructor(n) { this.p = Int32Array.from({ length: n }, (_, i) => i); } f(x) { while (this.p[x] !== x) { this.p[x] = this.p[this.p[x]]; x = this.p[x]; } return x; } u(a, b) { a = this.f(a); b = this.f(b); if (a !== b) this.p[Math.max(a, b)] = Math.min(a, b); } }
  const median = a => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const polaNama = u => /\d{4,}$/.test(u) || /\d{5,}/.test(u) || /^[a-z]+_?\d{3,}$/i.test(u);

  // ---------- Persiapan ----------
  function siapkan(rows) {
    return rows.map((r, i) => {
      const w = parseWaktu(r.ts != null ? r.ts : (r.tm != null ? r.tm : r.waktu));
      const tk = T.tokens(r.tx || '');
      const isi = tk.filter(x => (x.length >= 3 || /^\d+$/.test(x)) && !T.STOP.has(x));
      const bg = new Set(); for (let k = 0; k < tk.length - 1; k++) bg.add(tk[k] + ' ' + tk[k + 1]); if (!bg.size) tk.forEach(x => bg.add(x));
      const tagar = ((r.tx || '').toLowerCase().match(/#[\p{L}\p{N}_]+/gu) || []);
      const norm = T.normalisasi(r.tx || '').mentah;
      return { i, id: r.id != null ? r.id : i + 1, u: String(r.u || ('akun' + i)), age: +r.age || 0, fo: +r.fo || 0, fi: +r.fi || 0, tm: w ? w.tm : null, ts: w ? w.ts : null,
        tx: r.tx || '', pv: r.pv || '', tk, isi: new Set(isi), bg, key: tk.join(' '), tagar, bantahan: T.debunkKuat.test(' ' + norm + ' ') };
    });
  }

  function klasterkan(d, P) {
    const n = d.length, uf = new UF(n), sim = new Float32Array(n).fill(0);
    // 1) duplikat persis
    const kunci = new Map(), rep = [];
    d.forEach(x => { if (!x.key) return; if (kunci.has(x.key)) { const r = kunci.get(x.key); uf.u(r, x.i); sim[x.i] = 1; } else { kunci.set(x.key, x.i); rep.push(x.i); } });
    // 2) pencarian kandidat dengan prefix filtering: kata diurutkan dari yang paling langka; dua teks yang cukup mirip
    //    pasti berbagi minimal satu kata pada awalan (prefix) urutan itu. Pemindaian per kata dibatasi agar tetap linear.
    const df = new Map(); rep.forEach(i => d[i].isi.forEach(w => df.set(w, (df.get(w) || 0) + 1)));
    const urutKata = (x, y) => (df.get(x) - df.get(y)) || (x < y ? -1 : x > y ? 1 : 0);
    const post = new Map();
    for (const i of rep) {
      const srt = [...d[i].isi].sort(urutKata), L = srt.length;
      const pj = L ? Math.max(1, L - Math.ceil(0.4 * L) + 1) : 0, awal = srt.slice(0, pj);
      const kand = new Set(), ri = uf.f(i);
      for (const w of awal) { const l = post.get(w); if (!l) continue; for (let k = l.length - 1, c = 0; k >= 0 && c < P.pindaiMaks; k--, c++) if (uf.f(l[k]) !== ri) kand.add(l[k]); }
      const dicoba = new Map();   // paling banyak 2 perbandingan per klaster kandidat (anggota klaster saling mirip)
      for (const j of kand) {
        const rj = uf.f(j); if (uf.f(i) === rj) continue;
        const c = dicoba.get(rj) || 0; if (c >= 2) continue; dicoba.set(rj, c + 1);
        const a = d[i], b = d[j];
        const jb = jaccard(a.bg, b.bg);
        const jk = (a.isi.size >= P.minKataIsi && b.isi.size >= P.minKataIsi) ? jaccard(a.isi, b.isi) : 0;
        if (jb >= P.simBigram || jk >= P.simKata) { uf.u(i, j); sim[i] = Math.max(sim[i], jb, jk); }
      }
      for (const w of awal) { let l = post.get(w); if (!l) post.set(w, l = []); l.push(i); }
    }
    const grup = new Map(); d.forEach(x => { if (!x.key) return; const r = uf.f(x.i); let l = grup.get(r); if (!l) grup.set(r, l = []); l.push(x.i); });
    return { grup: [...grup.values()], uf };
  }

  // ---------- Waktu relatif / kronologi ----------
  function skalaWaktu(d) {
    const semuaTs = d.length && d.every(x => x.ts != null);
    if (semuaTs) { const m = Math.min(...d.map(x => x.ts)); return { mode: 'tanggal', rel: x => (x.ts - m) / 60000, label: x => new Date(x.ts).toISOString().slice(0, 16).replace('T', ' ') }; }
    const tms = d.filter(x => x.tm != null).map(x => x.tm).sort((a, b) => a - b);
    let mulai = 0;
    if (tms.length > 1) { let gap = -1; for (let k = 0; k < tms.length; k++) { const nx = k === tms.length - 1 ? tms[0] + 1440 : tms[k + 1]; if (nx - tms[k] > gap) { gap = nx - tms[k]; mulai = nx % 1440; } } }
    else if (tms.length === 1) mulai = tms[0];
    const hh = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
    return { mode: 'jam-saja', rel: x => x.tm == null ? 0 : ((x.tm - mulai) + 1440) % 1440, label: x => x.tm == null ? '-' : hh(x.tm) };
  }

  // ---------- Koordinasi per klaster ----------
  function koordinasi(anggota, d, sk, P) {
    const penguat = anggota.filter(i => !d[i].bantahan);
    const akun = new Map();
    penguat.forEach(i => { const x = d[i]; if (!akun.has(x.u)) akun.set(x.u, { u: x.u, age: x.age, fo: x.fo, fi: x.fi, posts: [] }); akun.get(x.u).posts.push(i); });
    const A = [...akun.values()], a = A.length;
    const bukti = [], keluarga = { teks: false, waktu: false, profil: false };
    let skor = 0;
    const tambah = (poin, kode, ket, fam) => { skor += poin; bukti.push({ kode, poin, ket }); if (fam) keluarga[fam] = true; };
    if (a < 2) return { skor: 0, kategori: 'tidak ada indikasi', akun: a, bukti: [], keluarga, catatan: ['Kurang dari 2 akun penguat; tidak dinilai.'], alternatif: [], puncak: a, rasioSerempak: 0 };

    // TEKS
    if (a >= 10) tambah(25, 'K1', a + ' akun berbeda memuat teks nyaris sama', 'teks'); else if (a >= 5) tambah(20, 'K1', a + ' akun berbeda memuat teks nyaris sama', 'teks'); else if (a >= 3) tambah(15, 'K1', a + ' akun berbeda memuat teks nyaris sama', 'teks');
    else tambah(6, 'K1', '2 akun memuat teks nyaris sama (lemah)', 'teks');
    // WAKTU: puncak akun berbeda dalam jendela, dan rasio posting yang punya pasangan akun lain dalam jendela
    const ev = penguat.map(i => ({ i, u: d[i].u, t: sk.rel(d[i]) })).sort((x, y) => x.t - y.t);
    let puncak = 0, awalPuncak = 0, serempak = new Set(); const W = P.jendelaMenit;
    for (let l = 0, r = 0; r < ev.length; r++) {
      while (ev[r].t - ev[l].t > W) l++;
      const us = new Set(); for (let k = l; k <= r; k++) us.add(ev[k].u);
      if (us.size > puncak) { puncak = us.size; awalPuncak = ev[l].t; }
      if (us.size >= 2) for (let k = l; k <= r; k++) serempak.add(ev[k].i);
    }
    const rasio = serempak.size / penguat.length;
    if (puncak >= 3 && rasio >= 0.5) tambah(20, 'K2', 'Serempak: ' + puncak + ' akun dalam ' + W + ' menit; ' + Math.round(rasio * 100) + '% unggahan punya pasangan akun lain dalam jendela', 'waktu');
    else if (puncak >= 3 && rasio >= 0.3) tambah(10, 'K2', 'Sebagian serempak: ' + puncak + ' akun dalam ' + W + ' menit (' + Math.round(rasio * 100) + '%)', 'waktu');
    // PROFIL
    const baru = A.filter(x => x.age < P.akunBaruHari), muda = A.filter(x => x.age < P.akunMudaHari);
    if (baru.length >= 3 && baru.length / a >= 0.5) tambah(20, 'K3', baru.length + ' dari ' + a + ' akun berumur < ' + P.akunBaruHari + ' hari', 'profil');
    else if (muda.length >= 3 && muda.length / a >= 0.5) tambah(10, 'K3', muda.length + ' dari ' + a + ' akun berumur < ' + P.akunMudaHari + ' hari', 'profil');
    const med = median(A.map(x => x.age)), seragam = A.filter(x => Math.abs(x.age - med) <= 1);
    if (seragam.length >= 3 && seragam.length / a >= 0.5 && med < P.akunMudaHari) tambah(10, 'K4', seragam.length + ' akun berumur seragam (±1 hari dari ' + med + ')', 'profil');
    const nama = A.filter(x => polaNama(x.u));
    if (nama.length >= 2 && nama.length / a >= 0.4) tambah(10, 'K5', nama.length + ' akun bernama berpola angka', 'profil');
    const ff = A.filter(x => x.fi >= 100 && x.fi >= 10 * Math.max(x.fo, 1));
    if (ff.length >= 2 && ff.length / a >= 0.4) tambah(5, 'K6', ff.length + ' akun dengan following ≫ follower', 'profil');
    // TAGAR
    const tg = Object.create(null); penguat.forEach(i => new Set(d[i].tagar).forEach(h => { (tg[h] = tg[h] || new Set()).add(d[i].u); }));
    const tgTop = Object.entries(tg).sort((x, y) => y[1].size - x[1].size)[0];
    if (tgTop && tgTop[1].size >= 3) tambah(5, 'K7', 'Tagar identik ' + tgTop[0] + ' dari ' + tgTop[1].size + ' akun', null);

    const catatan = [];
    const fam = Object.values(keluarga).filter(Boolean).length;
    if (!keluarga.profil && skor <= 60) catatan.push('Tidak ada indikator profil akun (umur, nama, rasio): kesamaan teks dan waktu saja tidak cukup untuk menyimpulkan koordinasi.');
    if (!keluarga.profil && skor > 60) { skor = 60; catatan.push('Dibatasi 60: tidak ada indikator profil akun. Kesamaan teks dan waktu saja tidak cukup untuk menyimpulkan koordinasi.'); }
    if (fam <= 1 && skor > 40) { skor = 40; catatan.push('Dibatasi 40: hanya satu keluarga indikator.'); }
    skor = Math.min(100, Math.round(skor));
    const alternatif = [];
    const tua = A.filter(x => x.age >= 365).length / a;
    if (tua >= 0.5) alternatif.push('Mayoritas akun berumur ≥ 1 tahun: kampanye sah, relawan, atau komunitas yang berbagi pesan serupa.');
    alternatif.push('Peristiwa nyata atau berita bersama yang dikutip banyak orang dengan kalimat serupa.');
    if (!keluarga.profil) alternatif.push('Pesan berantai atau templat organik yang disalin warga (tanpa bukti keterkaitan akun).');
    return { skor, kategori: skor >= 75 ? 'indikasi kuat' : skor >= 50 ? 'indikasi sedang' : skor >= 25 ? 'indikasi lemah' : 'tidak ada indikasi', akun: a, bukti, keluarga, catatan, alternatif, puncak, rasioSerempak: Math.round(rasio * 100) / 100,
      serempakIdx: [...serempak], awalPuncak };
  }

  // ---------- Skor akun (berlapis; tidak menyimpulkan dari teks/waktu saja) ----------
  function skorAkun(a, ctx) {
    const w = [], sinyalProfil = []; let s = 0;
    if (a.age < PARAM.akunBaruHari) { s += 22; sinyalProfil.push('umur < 30 hari'); } else if (a.age < PARAM.akunMudaHari) { s += 10; sinyalProfil.push('umur < 90 hari'); }
    if (a.fi >= 100 && a.fi >= 10 * Math.max(a.fo, 1)) { s += 12; sinyalProfil.push('following ≫ follower'); }
    if (a.fo < 20) { s += 6; sinyalProfil.push('follower < 20'); }
    if (polaNama(a.u)) { s += 12; sinyalProfil.push('nama berpola angka'); }
    if (ctx.teks) { s += 28; w.push('teks nyaris sama dengan ' + (ctx.akunKlaster - 1) + ' akun lain'); }
    if (ctx.waktu) { s += 15; w.push('unggah serempak dengan akun lain'); }
    w.push(...sinyalProfil);
    const profil = sinyalProfil.length, korelasi = ctx.teks || ctx.waktu;
    let label = 'Rendah';
    if (s >= 70 && profil >= 2 && korelasi) label = 'Indikasi kuat tidak autentik';
    else if (s >= 50 || (s >= 70)) label = 'Perlu verifikasi' + (profil < 2 ? ' (korelasi teks/waktu tanpa dukungan profil)' : '');
    else if (s >= 30) label = 'Perhatian';
    return { u: a.u, s: Math.min(100, s), label, sinyal: w, profil, klaster: ctx.klaster };
  }

  // ---------- Graf ----------
  function bangunGraf(klaster, d, akunSkor) {
    const nodes = [], edges = [], ada = new Set();
    const tambahNode = (n) => { if (!ada.has(n.id)) { ada.add(n.id); nodes.push(n); } };
    klaster.filter(k => k.akun >= 2).forEach(k => {
      tambahNode({ id: 'n:' + k.id, tipe: 'narasi', label: k.label, ukuran: k.n, skor: k.koordinasi.skor, sumber: k.idx.map(i => d[i].id) });
      const per = Object.create(null); k.idx.forEach(i => { (per[d[i].u] = per[d[i].u] || []).push(d[i].id); });
      Object.entries(per).forEach(([u, ids]) => {
        const sa = akunSkor.get(u);
        tambahNode({ id: 'a:' + u, tipe: 'akun', label: u, skor: sa ? sa.s : 0, umur: d.byU.get(u).age, sumber: ids });
        edges.push({ dari: 'a:' + u, ke: 'n:' + k.id, tipe: 'unggah', bobot: ids.length, sumber: ids });
      });
      const tg = Object.create(null); k.idx.forEach(i => new Set(d[i].tagar).forEach(h => { (tg[h] = tg[h] || new Set()).add(d[i].u); }));
      Object.entries(tg).filter(([, s]) => s.size >= 2).forEach(([h, s]) => { tambahNode({ id: 'h:' + h, tipe: 'tagar', label: h, ukuran: s.size, sumber: [] }); s.forEach(u => edges.push({ dari: 'a:' + u, ke: 'h:' + h, tipe: 'tagar', bobot: 1, sumber: [] })); });
      // sisi akun–akun: serempak dalam klaster yang sama (dibatasi agar graf tetap terbaca dan tidak kuadratik)
      const sr = k.koordinasi.serempakIdx || [];
      if (sr.length <= 300) {
        const urutSr = [...sr].sort((x, y) => (d[x].ts != null ? d[x].ts : d[x].tm) - (d[y].ts != null ? d[y].ts : d[y].tm));
        const peta = new Map();
        for (let x = 0; x < urutSr.length; x++) for (let y = x + 1; y < urutSr.length; y++) {
          const A = d[urutSr[x]], B = d[urutSr[y]];
          if (A.u === B.u || selisih(A, B) > PARAM.jendelaMenit) continue;
          const key = [A.u, B.u].sort().join('|'); let e = peta.get(key);
          if (e) { e.bobot++; e.sumber.push(A.id, B.id); } else { e = { dari: 'a:' + A.u, ke: 'a:' + B.u, tipe: 'serempak', bobot: 1, sumber: [A.id, B.id] }; peta.set(key, e); edges.push(e); }
        }
      }
    });
    const deg = Object.create(null); edges.forEach(e => { deg[e.dari] = (deg[e.dari] || 0) + e.bobot; deg[e.ke] = (deg[e.ke] || 0) + e.bobot; });
    nodes.forEach(n => n.derajat = deg[n.id] || 0);
    const nar = new Map(); edges.forEach(e => { if (e.tipe === 'unggah') { let st = nar.get(e.dari); if (!st) nar.set(e.dari, st = new Set()); st.add(e.ke); } });
    const jembatan = nodes.filter(n => n.tipe === 'akun' && nar.has(n.id) && nar.get(n.id).size >= 2).map(n => n.label);
    return { nodes, edges, jembatan, catatan: 'Sisi "serempak" = dua akun mengunggah dalam jendela ' + PARAM.jendelaMenit + ' menit pada narasi yang sama (korelasi, bukan bukti hubungan).' };
  }
  function selisih(a, b) { return (a.ts != null && b.ts != null) ? Math.abs(a.ts - b.ts) / 60000 : selisihSirkular(a.tm || 0, b.tm || 0); }

  // ---------- Analisis utama ----------
  function analisis(rows, opsi) {
    const P = Object.assign({}, PARAM, opsi || {});
    const t0 = Date.now();
    const d = siapkan(Array.isArray(rows) ? rows : []);
    d.byU = new Map(); d.forEach(x => { if (!d.byU.has(x.u)) d.byU.set(x.u, x); });
    const sk = skalaWaktu(d);
    const { grup } = klasterkan(d, P);
    const akunSkor = new Map(), klaster = [];
    let seq = 0;
    const multi = grup.filter(a => a.length >= 2).sort((x, y) => y.length - x.length);
    for (const anggota of multi) {
      const urut = [...anggota].sort((x, y) => sk.rel(d[x]) - sk.rel(d[y]) || x - y);
      const penguatU = urut.filter(i => !d[i].bantahan);
      const repI = penguatU.length ? penguatU[0] : urut[0];
      const akunSet = new Set(anggota.map(i => d[i].u));
      const cnt = Object.create(null); anggota.forEach(i => d[i].isi.forEach(w => cnt[w] = (cnt[w] || 0) + 1));
      const label = Object.entries(cnt).sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1)).slice(0, 5).map(x => x[0]).join(' ');
      const co = koordinasi(anggota, d, sk, P);
      const rels = urut.map(i => sk.rel(d[i]));
      const durasi = rels.length ? Math.max(...rels) - Math.min(...rels) : 0;
      // waktu ke-3 akun berbeda
      let ke3 = null; { const s = new Set(); for (const i of urut) { s.add(d[i].u); if (s.size === 3) { ke3 = sk.rel(d[i]) - rels[0]; break; } } }
      const tg = Object.create(null); anggota.forEach(i => new Set(d[i].tagar).forEach(h => tg[h] = (tg[h] || 0) + 1));
      const sampel = urut.filter((_, k) => k % Math.max(1, Math.ceil(urut.length / P.sampelAnalisis)) === 0).slice(0, P.sampelAnalisis);
      const an = sampel.map(i => T.analisis(d[i].tx));
      const manip = Math.round(an.reduce((s, x) => s + x.risk, 0) / Math.max(1, an.length));
      const manipMaks = Math.max(0, ...an.map(x => x.risk));
      const k = { id: ++seq, idx: urut, n: anggota.length, akun: akunSet.size, label, rep: d[repI].tx, repId: d[repI].id, mulai: sk.label(d[urut[0]]), akhir: sk.label(d[urut[urut.length - 1]]),
        durasiMenit: Math.round(durasi), waktuKe3AkunMenit: ke3 == null ? null : Math.round(ke3), varian: new Set(anggota.map(i => d[i].key)).size, bantahan: anggota.filter(i => d[i].bantahan).length,
        tagar: Object.entries(tg).sort((x, y) => y[1] - x[1]).slice(0, 5), koordinasi: co, manipulasi: manip, manipulasiMaks: manipMaks, analisisSampel: an.length,
        sasaran: [...new Set(an.flatMap(x => x.sasaran))].filter(x => x !== 'Tidak spesifik'), sara: an.some(x => x.sara), kebencian: an.some(x => x.lantai),
        wilayah: [...new Set(anggota.map(i => d[i].pv).filter(Boolean))], jangkauan: Math.round([...akunSet].reduce((s, u) => s + Math.log10(1 + d.byU.get(u).fo), 0) * 10) / 10 };
      klaster.push(k);
    }
    // skor akun
    const per = new Map();
    klaster.forEach(k => {
      const sinkron = new Set(k.koordinasi.serempakIdx || []);
      const hit = Object.create(null); k.idx.forEach(i => { const x = d[i]; if (x.bantahan) return; (hit[x.u] = hit[x.u] || { a: x, serempak: false, klaster: k.id }); if (sinkron.has(i)) hit[x.u].serempak = true; });
      Object.values(hit).forEach(h => { const ctx = { teks: k.akun >= 3, waktu: h.serempak, akunKlaster: k.akun, klaster: k.id }; const sa = skorAkun(h.a, ctx); const lama = per.get(h.a.u); if (!lama || sa.s > lama.s) per.set(h.a.u, sa); });
    });
    // akun di luar klaster multi: skor profil saja (tanpa korelasi)
    d.forEach(x => { if (!per.has(x.u)) per.set(x.u, skorAkun(x, { teks: false, waktu: false, akunKlaster: 1, klaster: null })); });
    per.forEach((v, k) => akunSkor.set(k, v));
    const graf = bangunGraf(klaster, d, akunSkor);
    // kronologi global
    const kron = [];
    klaster.forEach(k => {
      const ev = k.idx.map(i => ({ i, t: sk.rel(d[i]) }));
      const p = d[k.idx[0]]; kron.push({ t: sk.rel(p), klaster: k.id, aksi: 'Narasi muncul pertama kali', waktu: sk.label(p), akun: p.u, sumber: [p.id] });
      if (k.waktuKe3AkunMenit != null) { const s = new Set(); for (const i of k.idx) { s.add(d[i].u); if (s.size === 3) { kron.push({ t: sk.rel(d[i]), klaster: k.id, aksi: 'Akun ke-3 ikut menyebarkan (+' + k.waktuKe3AkunMenit + ' mnt)', waktu: sk.label(d[i]), akun: d[i].u, sumber: [d[i].id] }); break; } } }
      const b = k.idx.find(i => d[i].bantahan); if (b != null) kron.push({ t: sk.rel(d[b]), klaster: k.id, aksi: 'Konten bantahan pertama', waktu: sk.label(d[b]), akun: d[b].u, sumber: [d[b].id] });
    });
    kron.sort((a, b) => a.t - b.t || a.klaster - b.klaster);
    const idxK = klaster.reduce((m, k) => Math.max(m, k.koordinasi.skor), 0);
    return { versi: T.VERSI, parameter: P, n: d.length, waktuMode: sk.mode, klaster, akun: [...akunSkor.values()].sort((a, b) => b.s - a.s), graf, kronologi: kron,
      indeksKoordinasi: idxK, tanpaWaktu: d.filter(x => x.tm == null).length, tanpaKlaster: d.length - multi.reduce((s, a) => s + a.length, 0), durasiProsesMs: Date.now() - t0, _d: d, _sk: sk,
      catatan: ['Klaster = kesamaan teks (Jaccard bigram ≥ ' + P.simBigram + ' atau kata isi ≥ ' + P.simKata + '). Koordinasi dinilai berlapis (teks, waktu, profil); tanpa indikator profil skor dibatasi 60.',
        sk.mode === 'jam-saja' ? 'Data hanya memuat jam (HH:MM) tanpa tanggal: kronologi lintas hari tidak dapat dibedakan; gunakan format YYYY-MM-DDTHH:MM untuk analisis multi-hari.' : 'Waktu berisi tanggal lengkap.',
        d.some(x => x.tm == null) ? d.filter(x => x.tm == null).length + ' baris tidak memiliki waktu yang dapat dibaca (diperlakukan sebagai waktu 0 untuk urutan, diabaikan pada indikator waktu).' : 'Semua baris memiliki waktu.',
        'Hasil adalah indikator korelasi, bukan bukti operasi pengaruh atau niat pelaku.'] };
  }

  const api = { PARAM, parseWaktu, analisis, jaccard };
  g.KS = g.KS || {}; g.KS.narasi = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
