// Cognitive Threat Early Warning + Cognitive Situation Report.
// Skor komposit transparan (6 komponen berbobot) dengan "gerbang" agar satu indikator (mis. volume) tidak sendirian memicu level tinggi.
// Semua angka dapat ditelusuri ke baris data sumber. Tanpa AI. Rekomendasi hanya bersifat DEFENSIF.
(function (g) {
  'use strict';
  const T = (typeof require === 'function' && typeof module !== 'undefined' && module.exports) ? require('./00a-kognitif-teks.js') : g.KS.teks;

  const BOBOT = { intensitas: 0.15, kecepatan: 0.15, pengulangan: 0.10, manipulasi: 0.25, koordinasi: 0.15, dampak: 0.20 };
  const DEF_KOMPONEN = {
    intensitas: 'Seberapa luas narasi: 20 × log2(1 + jumlah akun berbeda), maks 100 (3 akun = 40, 7 = 60, 31 = 100).',
    kecepatan: 'Laju penyebaran: akun berbeda per 10 menit sepanjang durasi klaster × 20, maks 100 (5 akun/10 mnt = 100).',
    pengulangan: '100 × (1 − varian teks unik / jumlah unggahan), +10 bila rata-rata > 1,5 unggahan per akun.',
    manipulasi: '0,6 × rata-rata + 0,4 × maksimum skor Cognitive Threat Analysis pada sampel unggahan klaster.',
    koordinasi: 'Skor indikasi koordinasi berlapis (teks, waktu, profil); dibatasi bila tidak ada indikator profil.',
    dampak: 'Potensi dampak sosial: SARA +25, ujaran kebencian (indikasi) +25, sasaran sensitif (agama/etnis/kelompok rentan/kesehatan) +20, sebaran wilayah (≥3 = +15, ≥1 = +5), jangkauan akun hingga +15.'
  };
  const LEVEL = [
    { k: 'AWAS', min: 75, def: 'Skor ≥ 75 DAN ≥ 3 komponen ≥ 60 DAN manipulasi ≥ 50 DAN dampak ≥ 40. Respons segera dan terkoordinasi.' },
    { k: 'SIAGA', min: 50, def: 'Skor ≥ 50 DAN ≥ 2 komponen ≥ 50 DAN (manipulasi ≥ 30 ATAU koordinasi ≥ 50). Siapkan respons dan pantau berkala.' },
    { k: 'WASPADA', min: 25, def: 'Skor ≥ 25. Satu atau dua indikator menonjol; pantau dan verifikasi.' },
    { k: 'AMAN', min: 0, def: 'Skor < 25. Pemantauan rutin.' }
  ];
  const AMBANG = LEVEL.map(l => ({ kategori: l.k, minimum: l.min, definisi: l.def }));

  const REKOMENDASI = {
    AWAS: ['Aktifkan tim respons: verifikasi klaim inti dengan sumber resmi dan dokumentasikan bukti (arsip tangkapan, ID baris, waktu).', 'Siapkan klarifikasi bersumber melalui juru bicara dan kanal resmi; sertakan fakta pembanding yang dapat diperiksa.', 'Laporkan konten yang melanggar kebijakan lewat mekanisme resmi platform; jangan menindak individu hanya atas dasar skor.', 'Koordinasi dengan tokoh/pemangku wilayah terdampak dan kanal literasi digital setempat.', 'Pantau perkembangan tiap jam; tinjau ulang level bila data baru masuk.'],
    SIAGA: ['Verifikasi klaim inti dengan sumber resmi sebelum menanggapi.', 'Siapkan materi klarifikasi dan rujukan cek fakta (turnbackhoax.id, cekfakta.com).', 'Perluas pemantauan kata kunci narasi dan akun yang sama; catat perubahan kecepatan.', 'Informasikan pemangku wilayah terkait agar siap memberi literasi bila narasi menyebar.'],
    WASPADA: ['Pantau perkembangan narasi dan tandai untuk tinjauan ulang berikutnya.', 'Periksa apakah klaim dapat diverifikasi; belum perlu respons publik.'],
    AMAN: ['Pemantauan rutin; tidak ada tindakan khusus.']
  };
  const SENSITIF = ['Kelompok agama', 'Kelompok etnis/warga asing', 'Kelompok rentan', 'Layanan kesehatan'];

  function peringatanDini(narasi, opsi) {
    const o = Object.assign({ minAkun: 2 }, opsi || {});
    const hasil = [];
    for (const k of (narasi.klaster || [])) {
      if (k.akun < o.minAkun) continue;
      const k10 = k.akun / Math.max(k.durasiMenit / 10, 1);
      const manip = Math.round(0.6 * k.manipulasi + 0.4 * k.manipulasiMaks);
      const komp = {
        intensitas: { nilai: Math.min(100, Math.round(20 * Math.log2(1 + k.akun))), metrik: k.akun + ' akun berbeda, ' + k.n + ' unggahan' },
        kecepatan: { nilai: Math.min(100, Math.round(k10 * 20)), metrik: (Math.round(k10 * 10) / 10) + ' akun/10 mnt selama ' + k.durasiMenit + ' mnt' },
        pengulangan: { nilai: Math.min(100, Math.round(100 * (1 - k.varian / k.n)) + (k.n / k.akun > 1.5 ? 10 : 0)), metrik: k.varian + ' varian teks dari ' + k.n + ' unggahan' },
        manipulasi: { nilai: manip, metrik: 'rata-rata ' + k.manipulasi + ', maks ' + k.manipulasiMaks + ' (sampel ' + k.analisisSampel + ' unggahan)' },
        koordinasi: { nilai: k.koordinasi.skor, metrik: k.koordinasi.kategori + (k.koordinasi.bukti.length ? ' (' + k.koordinasi.bukti.map(b => b.kode).join(',') + ')' : '') },
        dampak: { nilai: 0, metrik: '' }
      };
      const dm = [], d = [];
      if (k.sara) { d.push(25); dm.push('SARA'); }
      if (k.kebencian) { d.push(25); dm.push('ujaran kebencian (indikasi)'); }
      if (k.sasaran.some(s => SENSITIF.includes(s))) { d.push(20); dm.push('sasaran sensitif: ' + k.sasaran.filter(s => SENSITIF.includes(s)).join(', ')); }
      if (k.wilayah.length >= 3) { d.push(15); dm.push(k.wilayah.length + ' wilayah'); } else if (k.wilayah.length >= 1) { d.push(5); dm.push(k.wilayah.length + ' wilayah'); }
      const jang = Math.min(15, Math.round(k.jangkauan * 3)); if (jang) { d.push(jang); dm.push('jangkauan ' + k.jangkauan); }
      komp.dampak = { nilai: Math.min(100, d.reduce((a, b) => a + b, 0)), metrik: dm.join('; ') || 'tidak ada faktor dampak terdeteksi' };

      let skor = 0; for (const c of Object.keys(BOBOT)) skor += BOBOT[c] * komp[c].nilai; skor = Math.round(skor);
      const v = c => komp[c].nilai, jml = t => Object.keys(komp).filter(c => komp[c].nilai >= t).length;
      let kat = skor >= 75 ? 'AWAS' : skor >= 50 ? 'SIAGA' : skor >= 25 ? 'WASPADA' : 'AMAN';
      const gerbang = [];
      if (kat === 'AWAS' && !(jml(60) >= 3 && v('manipulasi') >= 50 && v('dampak') >= 40)) { kat = 'SIAGA'; gerbang.push('Diturunkan dari AWAS: syarat ≥3 komponen ≥60, manipulasi ≥50, dampak ≥40 tidak terpenuhi.'); }
      if (kat === 'SIAGA' && !(jml(50) >= 2 && (v('manipulasi') >= 30 || v('koordinasi') >= 50))) { kat = 'WASPADA'; gerbang.push('Diturunkan dari SIAGA: syarat ≥2 komponen ≥50 dan (manipulasi ≥30 atau koordinasi ≥50) tidak terpenuhi.'); }
      if (k.bantahan / k.n >= 0.5) gerbang.push('Lebih dari separuh unggahan adalah konten bantahan/klarifikasi: klaster mencerminkan penanggulangan, bukan penguatan narasi.');
      let keyakinan = 'rendah';
      if (k.n >= 20 && k.akun >= 5 && narasi.waktuMode === 'tanggal') keyakinan = 'tinggi'; else if (k.n >= 8 && k.akun >= 3) keyakinan = 'sedang';
      const ket = [];
      if (narasi.waktuMode === 'jam-saja') ket.push('Waktu hanya jam tanpa tanggal.');
      if (!k.wilayah.length) ket.push('Tidak ada data wilayah pada unggahan klaster.');
      ket.push('Skor adalah indikator prioritas, bukan bukti operasi pengaruh atau niat pelaku.');
      hasil.push({ klaster: k.id, label: k.label, rep: k.rep, skor, kategori: kat, komponen: komp, gerbang, keyakinan, rekomendasi: REKOMENDASI[kat], keterbatasan: ket,
        sumberBaris: k.idx.map(i => narasi._d[i].id), wilayah: k.wilayah });
    }
    return hasil.sort((a, b) => b.skor - a.skor);
  }

  // ---------- Cognitive Situation Report ----------
  function laporanSituasi(narasi, dini, opsi) {
    const o = Object.assign({ topN: 3, namaWilayah: {} }, opsi || {});
    const urut = dini.slice(0, o.topN);
    const urutRank = { AWAS: 3, SIAGA: 2, WASPADA: 1, AMAN: 0 };
    const tertinggi = dini.reduce((m, x) => urutRank[x.kategori] > urutRank[m] ? x.kategori : m, 'AMAN');
    const agr = {}; Object.keys(T.KATEGORI).forEach(k => agr[k] = { nama: T.KATEGORI[k].nama, rataSkor: 0, n: 0 });
    const bukti = [];
    urut.forEach(x => {
      const an = T.analisis(x.rep);
      Object.keys(an.kategori).forEach(k => { agr[k].rataSkor += an.kategori[k].skor; agr[k].n++; });
      an.bukti.slice(0, 3).forEach(b => bukti.push({ klaster: x.klaster, kategori: b.kategori, indikator: b.nama, kutipan: b.kutipan, konteks: b.konteks }));
    });
    Object.values(agr).forEach(a => { a.rataSkor = a.n ? Math.round(a.rataSkor / a.n) : 0; });
    const wilayah = Object.create(null);
    dini.forEach(x => x.wilayah.forEach(p => {
      const kdCode = (g.KODAM_BY_PROVINCE || {})[p] || p;
      const kd = (g.KODAM_DATA || []).find(k => k.code === kdCode);
      const provinceLabel = (g.KS_KODAM_SCOPE?.provinceNames || {})[p] || p;
      const item = wilayah[kdCode] = wilayah[kdCode] || { kode: kdCode, nama: kd?.name || o.namaWilayah[p] || p, narasi: [], provinsi: [] };
      if (!item.provinsi.includes(provinceLabel)) item.provinsi.push(provinceLabel);
      if (!item.narasi.includes(x.klaster)) item.narasi.push(x.klaster);
    }));
    const kron = (narasi.kronologi || []).filter(e => urut.some(x => x.klaster === e.klaster)).slice(0, 15);
    const rank = { tinggi: 2, sedang: 1, rendah: 0 };
    const keyakinan = urut.length ? urut.reduce((m, x) => rank[x.keyakinan] < rank[m] ? x.keyakinan : m, 'tinggi') : 'rendah';
    const rek = [...new Set(urut.flatMap(x => x.rekomendasi))];
    const ringkasan = !dini.length ? 'Belum ada narasi multi-akun yang terdeteksi pada data yang dianalisis (' + narasi.n + ' unggahan).' :
      'Dari ' + narasi.n + ' unggahan terdeteksi ' + narasi.klaster.length + ' klaster narasi; ' + dini.length + ' dinilai peringatan dini. Level tertinggi: ' + tertinggi + '. Narasi dominan: "' + urut[0].label + '" (skor ' + urut[0].skor + ', ' + urut[0].kategori + ').';
    return { ringkasan, levelTertinggi: tertinggi, narasiDominan: urut.map(x => ({ klaster: x.klaster, label: x.label, rep: x.rep, skor: x.skor, kategori: x.kategori, akun: narasi.klaster.find(k => k.id === x.klaster).akun, keyakinan: x.keyakinan })),
      indikator: Object.values(agr).filter(a => a.rataSkor > 0), kronologi: kron, wilayah: Object.values(wilayah), bukti, keyakinan, rekomendasi: rek,
      batasan: ['Indikator permukaan dari teks dan metadata unggahan; efek pada audiens tidak diukur.', 'Skor bukan bukti niat jahat atau operasi pengaruh; verifikasi manual diperlukan.'].concat(narasi.catatan || []),
      sumber: urut.map(x => ({ klaster: x.klaster, baris: x.sumberBaris })) };
  }
  function laporanTeks(l) {
    const L = ['LAPORAN SITUASI KOGNITIF', '', 'Ringkasan: ' + l.ringkasan, 'Tingkat keyakinan: ' + l.keyakinan, '', 'NARASI DOMINAN'];
    l.narasiDominan.forEach(n => L.push('- #' + n.klaster + ' [' + n.kategori + ' ' + n.skor + '] ' + n.label + ' (' + n.akun + ' akun)'));
    L.push('', 'INDIKATOR ANCAMAN'); l.indikator.forEach(i => L.push('- ' + i.nama + ': ' + i.rataSkor));
    L.push('', 'KRONOLOGI'); l.kronologi.forEach(e => L.push('- ' + e.waktu + ' #' + e.klaster + ' ' + e.aksi + ' (' + e.akun + ')'));
    L.push('', 'KODAM TERKAIT (WILAYAH PEMANTAUAN)'); (l.wilayah.length ? l.wilayah : [{ nama: 'Data Kodam tidak tersedia', narasi: [], provinsi: [] }]).forEach(w => L.push('- ' + w.nama + (w.provinsi?.length ? ' · Provinsi: ' + w.provinsi.join(', ') : '') + (w.narasi.length ? ' (narasi ' + w.narasi.join(',') + ')' : '')));
    L.push('', 'BUKTI PENDUKUNG'); l.bukti.forEach(b => L.push('- #' + b.klaster + ' ' + b.indikator + ': "' + b.kutipan + '"'));
    L.push('', 'REKOMENDASI RESPONS DEFENSIF'); l.rekomendasi.forEach(r => L.push('- ' + r));
    L.push('', 'BATASAN'); l.batasan.forEach(b => L.push('- ' + b));
    return L.join('\n');
  }

  const api = { BOBOT, DEF_KOMPONEN, AMBANG, LEVEL, REKOMENDASI, peringatanDini, laporanSituasi, laporanTeks };
  g.KS = g.KS || {}; g.KS.dini = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
