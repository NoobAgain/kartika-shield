// Cognitive Threat Analysis (CTA): analisis teknik manipulasi informasi pada SATU teks.
// Berbasis aturan (leksikon + pola), transparan, tanpa AI. Dipakai bersama oleh dasbor (peramban) dan kolektor (Node).
// Setiap hasil memuat: indikator, bukti (kutipan), metode penilaian, dan keterbatasan.
// Skor adalah INDIKATOR perhatian analis, bukan bukti niat jahat dan bukan putusan benar/salah.
(function (g) {
  'use strict';
  const VERSI = 'kognitif-1.0';

  // ---------- Normalisasi ----------
  const MAP_LEET = { '4': 'a', '@': 'a', '3': 'e', '1': 'i', '0': 'o', '5': 's', '$': 's', '7': 't' };
  // Mengembalikan {mentah, leet}: "mentah" tidak memetakan angka; "leet" memetakan angka dalam kata campuran huruf+angka.
  function normalisasi(t) {
    let s = String(t == null ? '' : t).normalize('NFKC').toLowerCase()
      .replace(/https?:\/\/\S+|www\.\S+/g, ' ').replace(/@\w+/g, ' ');
    // huruf dipisah spasi/titik/strip: "s e b a r k a n", "s.e.b.a.r" -> "sebarkan" (>= 4 huruf tunggal beruntun)
    s = s.replace(/(?:^|(?<=[^a-z0-9]))(?:[a-z][\s.\-_*]){3,}[a-z](?=[^a-z0-9]|$)/g, m => m.replace(/[\s.\-_*]/g, ''));
    s = s.replace(/([a-z])\1{2,}/g, '$1');                         // "viraaal" -> "viral"
    const bersih = x => x.replace(/[^a-z0-9#\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const mentah = bersih(s);
    const leet = bersih(s.replace(/[a-z0-9@$]+/g, tok =>
      (/[a-z]/.test(tok) && /[0-9@$]/.test(tok)) ? tok.replace(/[43@105$7]/g, c => MAP_LEET[c]) : tok));
    return { mentah, leet };
  }
  const tokens = t => { const s = normalisasi(t).leet; return s ? s.split(' ') : []; };

  // ---------- Katalog indikator ----------
  // pola: [[fragmen-regex, keyakinan 0..1], ...]; dicocokkan pada teks ternormalisasi (kata utuh, spasi tunggal).
  // bobot = kontribusi maksimum satu indikator; batas = batas atas skor kategori.
  const KATEGORI = {
    EMOSI: { nama: 'Manipulasi emosional', batas: 20, def: 'Bahasa yang memicu reaksi emosi kuat (amarah, iba, kejut) agar nalar kritis dilewati.' },
    KETAKUTAN: { nama: 'Narasi ketakutan', batas: 25, def: 'Penekanan bahaya/ancaman terhadap diri, kelompok, atau bangsa, termasuk tenggat palsu.' },
    CLICKBAIT: { nama: 'Clickbait & sensasionalisme', batas: 20, def: 'Judul/ajakan yang menjual rasa penasaran atau kejutan alih-alih isi yang dapat diperiksa.' },
    FRAMING: { nama: 'Pembingkaian (framing)', batas: 25, def: 'Penyajian isu sebagai konspirasi, penyembunyian, atau pengkhianatan oleh aktor samar.' },
    POLARISASI: { nama: 'Polarisasi', batas: 35, def: 'Pelabelan kelompok, dikotomi kita-mereka, permusuhan, atau dehumanisasi.' },
    PROVOKATIF: { nama: 'Narasi provokatif', batas: 25, def: 'Desakan menyebarkan segera, seruan agresif, atau pancingan untuk bereaksi.' },
    REPETISI: { nama: 'Pesan berulang', batas: 10, def: 'Pengulangan kata/frasa/slogan dalam teks atau penanda pesan berantai (salin-tempel).' },
    TIDAK_TERVERIFIKASI: { nama: 'Informasi tidak terverifikasi', batas: 15, def: 'Atribusi samar atau klaim tanpa sumber yang dapat diperiksa.' }
  };

  const GRUP = 'pendatang|cina|china|tionghoa|aseng|asing|kafir|pribumi|papua|jawa|batak|madura|dayak|islam|kristen|katolik|hindu|buddha|budha|syiah|ahmadiyah|lgbt|etnis|suku|umat|agama';
  const DEHUM = 'binatang|anjing|babi|monyet|kecoa|tikus|hama|parasit|sampah masyarakat|iblis|setan';
  const KEKERASAN = 'tidak pantas hidup|tak pantas hidup|pantas dibunuh|pantas mati|layak mati|layak dibunuh|harus mati|harus diusir|harus dibasmi|dimusnahkan|musnahkan|basmi|bantai|habisi|bunuh|usir';

  const INDIKATOR = [
    { id: 'E01', kat: 'EMOSI', nama: 'Kata emosi ekstrem', teknik: 'Provokasi emosional', bobot: 8,
      pola: [['marah|geram|murka|biadab|keji|bejat|laknat|jijik|muak|sadis|mengerikan|memalukan|keterlaluan|kurang ajar|brengsek|darah mendidih|tega sekali|tak berperikemanusiaan', 1]] },
    { id: 'E02', kat: 'EMOSI', nama: 'Tanda seru / huruf kapital berlebihan', teknik: 'Provokasi emosional', bobot: 8, fn: 'tandaBaca' },
    { id: 'E03', kat: 'EMOSI', nama: 'Seruan iba', teknik: 'Provokasi emosional', bobot: 4,
      pola: [['air mata|menangis|kasihan|nasib mereka|pilu|miris', 1]] },

    { id: 'F01', kat: 'KETAKUTAN', nama: 'Bahasa bahaya/ancaman', teknik: 'Narasi ketakutan', bobot: 8,
      pola: [['teror|racun|beracun|mematikan|kiamat|maut|korban berjatuhan|bencana besar|akan hancur|tinggal menunggu waktu|sebelum terlambat', 1], ['awas|waspada|bahaya|mengancam|ancaman|darurat', 0.5]] },
    { id: 'F02', kat: 'KETAKUTAN', nama: 'Ancaman terhadap kelompok', teknik: 'Framing ancaman identitas', bobot: 12,
      pola: [['menguasai|dikuasai|kuasai|menghancurkan|dihancurkan|musnah|memusnahkan|serbu|serbuan|menyerbu|bantai|pembantaian|dibantai|menjajah|dijajah|diusir|pengusiran|mengambil alih', 1]] },
    { id: 'F03', kat: 'KETAKUTAN', nama: 'Tenggat/ancaman palsu ("sebelum dihapus")', teknik: 'Urgensi palsu', bobot: 10,
      pola: [['sebelum (?:dihapus|diblokir|dibungkam|disensor|takedown|ditutup)', 1]] },

    { id: 'C01', kat: 'CLICKBAIT', nama: 'Pancingan penasaran/kejut', teknik: 'Clickbait', bobot: 8,
      pola: [['(?:kamu|anda|kalian) (?:tidak|nggak|gak|ga|belum) akan percaya|siapa sangka|tak disangka|ternyata (?:ini|begini|inilah)|sampai habis|bikin (?:merinding|geger|syok|kaget|heboh)|jangan kaget|wajib (?:baca|nonton|tahu)|heboh|gempar|geger|menggegerkan|mengejutkan', 1]] },
    { id: 'C02', kat: 'CLICKBAIT', nama: 'Janji "rahasia terungkap"', teknik: 'Clickbait', bobot: 6,
      pola: [['rahasia (?:yang )?(?:terbongkar|terungkap|dibongkar|disembunyikan|tersembunyi)|terbongkar|terungkap|dibongkar|fakta mengejutkan|alasan sebenarnya|ini dia|inilah (?:alasan|penyebab|fakta)', 1]] },
    { id: 'C03', kat: 'CLICKBAIT', nama: 'Bujukan klik/hadiah', teknik: 'Clickbait', bobot: 10,
      pola: [['klik (?:link|tautan|disini|di sini)|link di (?:bio|komentar)|hadiah gratis|menang undian|cek link', 1]] },
    { id: 'C04', kat: 'CLICKBAIT', nama: 'Label "viral"', teknik: 'Clickbait', bobot: 4,
      pola: [['viral|trending', 1]] },

    { id: 'R01', kat: 'FRAMING', nama: 'Narasi penyembunyian/konspirasi', teknik: 'Teori konspirasi', bobot: 12,
      pola: [['media tidak berani|media bungkam|tidak diberitakan|tak diberitakan|ditutupi|menutupi|ditutup tutupi|menyembunyikan|konspirasi|agenda tersembunyi|agenda terselubung|di balik layar|deep state|dibungkam|disensor', 1], ['disembunyikan|bungkam|skenario', 0.6]] },
    { id: 'R02', kat: 'FRAMING', nama: 'Aktor samar', teknik: 'Aktor samar', bobot: 8,
      pola: [['kelompok tertentu|pihak tertentu|orang orang tertentu|elit global|oknum', 1]] },
    { id: 'R03', kat: 'FRAMING', nama: 'Dikotomi kita-mereka/pengkhianatan', teknik: 'Dikotomi kita-mereka', bobot: 12,
      pola: [['antek (?:asing|aseng)|dijual ke (?:asing|cina|china|aseng)|boneka asing|kaki tangan asing|penguasa (?:zalim|dzalim|khianat)|rakyat (?:kecil )?(?:ditindas|dikhianati|dibohongi)', 1], ['bangsa kita|umat kita|kaum kita', 0.5]] },

    { id: 'P01', kat: 'POLARISASI', nama: 'Pelabelan kelompok', teknik: 'Polarisasi/pelabelan kelompok', bobot: 10,
      pola: [['cebong|kampret|kadrun|kafir|kaum kafir|murtad|sesat|komunis|taliban', 1], ['aseng|antek', 0.8], ['pribumi', 0.5]] },
    { id: 'P02', kat: 'POLARISASI', nama: 'Ajakan permusuhan', teknik: 'Ajakan permusuhan', bobot: 15,
      pola: [['lawan mereka|musuh kita|musuh bersama|perang suci|ganyang|enyahkan|tumpas|singkirkan|bakar rumah ibadah', 1], ['bela agama', 0.6]] },
    { id: 'P03', kat: 'POLARISASI', nama: 'Dehumanisasi/kekerasan terhadap kelompok (indikasi ujaran kebencian)', teknik: 'Ujaran kebencian (indikasi)', bobot: 30, lantai: 65,
      pola: [['(?:' + DEHUM + ') (?:\\w+ ){0,3}(?:' + GRUP + ')', 1], ['(?:' + GRUP + ') (?:\\w+ ){0,3}(?:' + DEHUM + ')', 1],
        ['(?:' + KEKERASAN + ') (?:\\w+ ){0,3}(?:' + GRUP + ')', 1], ['(?:' + GRUP + ') (?:\\w+ ){0,4}(?:' + KEKERASAN + ')', 1]] },

    { id: 'V01', kat: 'PROVOKATIF', nama: 'Desakan menyebarkan', teknik: 'Urgensi palsu', bobot: 8, kondisional: true,
      pola: [['sebarkan|sebar|share|bagikan|forward|teruskan|viralkan|broadcast|kirim ke (?:semua )?(?:grup|teman|keluarga|\\d+)', 1]] },
    { id: 'V02', kat: 'PROVOKATIF', nama: 'Seruan agresif', teknik: 'Ajakan agresif', bobot: 15,
      pola: [['serbu|serang|bakar|hajar|geruduk|sweeping|bubarkan|angkat senjata|turun ke jalan', 1], ['jangan diam', 0.7], ['lawan|bangkit', 0.4]] },
    { id: 'V03', kat: 'PROVOKATIF', nama: 'Pancingan emosi (pertanyaan retoris)', teknik: 'Pancingan emosi', bobot: 8,
      pola: [['masih diam saja|apa kalian (?:terima|rela|mau)|sampai kapan (?:kita )?(?:diam|dibohongi|dijajah)|terima begitu saja', 1]] },

    { id: 'Q01', kat: 'REPETISI', nama: 'Kata/frasa/slogan berulang dalam teks', teknik: 'Pesan berulang', bobot: 5, fn: 'berulang' },
    { id: 'Q02', kat: 'REPETISI', nama: 'Penanda pesan berantai/salin-tempel', teknik: 'Pesan berulang', bobot: 6,
      pola: [['copas|copy paste|pesan berantai|terusan|dikirim ulang|dari grup sebelah|bc|broadcast message', 1]] },

    { id: 'U01', kat: 'TIDAK_TERVERIFIKASI', nama: 'Atribusi samar', teknik: 'Klaim tanpa verifikasi', bobot: 8,
      pola: [['katanya|konon|kabarnya|beredar kabar|menurut (?:orang|kabar|info)|sumber (?:terpercaya|dalam|anonim|rahasia)|info (?:dari|valid)|dari (?:grup|wag|whatsapp|wa)|teman saya (?:yang )?(?:bekerja|kerja)|orang dalam', 1]] },
    { id: 'U02', kat: 'TIDAK_TERVERIFIKASI', nama: 'Tanpa sumber yang dapat diperiksa (hanya dihitung bila ada indikator lain)', teknik: 'Klaim tanpa verifikasi', bobot: 8, fn: 'tanpaSumber' },
    { id: 'U03', kat: 'TIDAK_TERVERIFIKASI', nama: 'Klaim absolut', teknik: 'Klaim tanpa verifikasi', bobot: 5,
      pola: [['100 persen|seratus persen|dijamin|dipastikan benar|pasti benar|tidak diragukan lagi|terbukti benar|bukti nyata', 0.6]] }
  ];
  const BY_ID = Object.fromEntries(INDIKATOR.map(i => [i.id, i]));
  INDIKATOR.forEach(i => { if (i.pola) i.rx = i.pola.map(([f, c]) => ({ re: new RegExp('(?:^|\\s)(' + f + ')(?=\\s|$)', 'g'), c })); });

  const RX = {
    identitas: new RegExp('(?:^|\\s)(agama|suku|etnis|ras|cina|china|tionghoa|pribumi|asing|aseng|pendatang|kafir|murtad|islam|kristen|katolik|hindu|buddha|budha|gereja|masjid|pura|vihara|klenteng|rumah ibadah|umat|ulama|pendeta|habib|syiah|ahmadiyah|papua|jawa|batak|dayak|madura|lgbt)(?=\\s|$)'),
    debunkKuat: /(?:^|\s)(klarifikasi|bantahan|cek fakta|hasil verifikasi|dipastikan hoaks|adalah hoaks|hoaks|hoax|disinformasi|tidak benar|keliru|menyesatkan|faktanya|fakta sebenarnya|tidak berdasar|hanya hoaks|bukan fakta)(?=\s|$)/,
    sumber: /(?:^|\s)(menurut|dikutip|berdasarkan|sumber|rilis|siaran pers|kemenkes|kominfo|komdigi|bmkg|polri|bnpb|kemendikbud|kementerian|badan|turnbackhoax|cekfakta|resmi|juru bicara|situs)(?=\s|$)/,
    sipil: /(?:^|\s)(donor darah|kerja bakti|gotong royong|posyandu|pengajian|syukuran|bazar|lomba|pengumuman|undangan|rapat warga|ronda|arisan|bantuan|relawan)(?=\s|$)/,
    stop: new Set('yang dan di ke dari untuk pada dengan ini itu juga akan sudah telah ada adalah atau karena oleh sebagai dalam saya kami kita mereka anda kamu nya lah kah pun saja lagi para bagi agar supaya jadi hanya bisa dapat mau ya nih dong sih deh banget'.split(' '))
  };

  // ---------- Detektor khusus ----------
  const DETEKTOR = {
    tandaBaca(asli) {
      const out = [];
      const m = asli.match(/!{2,}|\?!|!\?/g); if (m) out.push({ kutipan: m.slice(0, 3).join(' ') });
      const kata = asli.match(/\b[A-Z]{4,}\b/g) || [];
      const huruf = asli.replace(/[^A-Za-z]/g, '');
      const kap = huruf.length >= 12 ? (asli.replace(/[^A-Z]/g, '').length / huruf.length) : 0;
      if (kata.length >= 2 || kap >= 0.5) out.push({ kutipan: kata.slice(0, 3).join(' ') || 'huruf kapital ' + Math.round(kap * 100) + '%' });
      return out;
    },
    berulang(asli, nm) {
      const out = [], tk = nm.leet ? nm.leet.split(' ') : [];
      if (tk.length < 8) return out;
      const cnt = Object.create(null); tk.forEach(w => { if (w.length >= 4 && !RX.stop.has(w)) cnt[w] = (cnt[w] || 0) + 1; });
      const rep = Object.entries(cnt).filter(([, v]) => v >= 3).map(([k]) => k);
      const bg = Object.create(null); for (let i = 0; i < tk.length - 1; i++) { const b = tk[i] + ' ' + tk[i + 1]; bg[b] = (bg[b] || 0) + 1; }
      const repB = Object.entries(bg).filter(([k, v]) => v >= 2 && k.split(' ').every(w => w.length >= 3 && !RX.stop.has(w))).map(([k]) => k);
      if (rep.length) out.push({ kutipan: rep.slice(0, 3).join(', ') + ' (≥3×)' });
      else if (repB.length) out.push({ kutipan: repB.slice(0, 2).join(' | ') + ' (2×)' });
      const tag = (asli.toLowerCase().match(/#[\p{L}\p{N}_]+/gu) || []); const tc = Object.create(null); tag.forEach(x => tc[x] = (tc[x] || 0) + 1);
      const tr = Object.entries(tc).filter(([, v]) => v >= 2); if (tr.length) out.push({ kutipan: tr[0][0] + ' ×' + tr[0][1] });
      return out;
    },
    tanpaSumber() { return []; } // dihitung di tahap konteks
  };

  function cuplikan(s, idx, len) { const a = Math.max(0, idx - 20), b = Math.min(s.length, idx + len + 20); return (a ? '…' : '') + s.slice(a, b) + (b < s.length ? '…' : ''); }

  // ---------- Pencocokan ----------
  function cocokkan(ind, nm) {
    const hasil = new Map();
    for (const { re, c } of ind.rx) {
      for (const s of [nm.leet, nm.mentah]) {
        re.lastIndex = 0; let m;
        while ((m = re.exec(s)) !== null) {
          const k = m[1];
          if (!hasil.has(k) || hasil.get(k).c < c) hasil.set(k, { kutipan: k, konteks: cuplikan(s, m.index, k.length), c });
          if (m[0].length === 0) re.lastIndex++;
        }
      }
    }
    return [...hasil.values()];
  }

  // ---------- Analisis utama ----------
  function kosong() {
    return { versi: VERSI, kosong: true, verdict: 'RISIKO RENDAH', risk: 0, sara: false, ringkasan: 'Tidak ada teks untuk dianalisis.', tanda: [], teknik: [],
      kategori: Object.fromEntries(Object.keys(KATEGORI).map(k => [k, { skor: 0, maks: KATEGORI[k].batas, indikator: [] }])), bukti: [], konteks: 'tidak_ada_teks',
      keyakinan: 'rendah', metode: metode(), keterbatasan: KETERBATASAN, sasaran: ['Tidak spesifik'], arah: 'Netral/tidak jelas', isu: 'Tidak spesifik', emosi: 'Netral',
      narasi_tandingan: NARASI_TANDINGAN, tabayyun: TABAYYUN, jumlahKata: 0 };
  }

  const AMBANG = { TINGGI: 65, SEDANG: 45, VERIFIKASI: 20 };
  const verdictDari = s => s >= AMBANG.TINGGI ? 'RISIKO TINGGI' : s >= AMBANG.SEDANG ? 'RISIKO SEDANG' : s >= AMBANG.VERIFIKASI ? 'PERLU DIVERIFIKASI' : 'RISIKO RENDAH';
  const NARASI_TANDINGAN = 'Mari cek dulu ke sumber resmi sebelum membagikan. Keberagaman kita kekuatan, bukan ancaman.';
  const TABAYYUN = ['Cari berita yang sama di media kredibel', 'Periksa tanggal dan lokasi kejadian', 'Cek ke turnbackhoax.id atau cekfakta.com'];
  const KETERBATASAN = [
    'Pencocokan kata/pola: tidak memahami sarkasme, kutipan, atau konteks percakapan.',
    'Ejaan yang sangat menyimpang atau bahasa daerah dapat lolos; kata biasa dapat salah tandai.',
    'Teks bantahan dapat meniru kata "klarifikasi" untuk menurunkan skor; konteks bantahan hanya klaim teks.',
    'Skor menunjukkan prioritas pemeriksaan, bukan benar/salah dan bukan bukti niat pelaku.'
  ];
  function metode() {
    return 'Normalisasi teks (huruf kecil, pemetaan angka-huruf, penyatuan huruf yang dipisah spasi, huruf berulang), lalu pencocokan ' + INDIKATOR.length + ' indikator berbobot dalam 8 kategori. ' +
      'Skor kategori = jumlah (bobot × keyakinan pola) dibatasi batas kategori; skor total = jumlah skor kategori (maks 100). ' +
      'Faktor konteks: bantahan bersumber (×0,2), kemungkinan bantahan (×0,5), konteks warga/sipil (×0,5 untuk emosi/ajakan), ajakan menyebarkan tanpa kategori lain (×0,4). ' +
      'Aturan lantai: dehumanisasi/kekerasan terhadap kelompok minimal 65. Ambang: ≥65 tinggi, ≥45 sedang, ≥20 perlu diverifikasi.';
  }

  const SASARAN = [
    [/\b(?:pemerintah|presiden|menteri|dpr|dprd|aparat|polisi|tni|pemilu|kebijakan|subsidi|bbm|pangan|impor|apbn|korupsi)\b/i, 'Pemerintah/Negara', 'Politik, kebijakan, dan keamanan'],
    [/\b(?:agama|umat|islam|kristen|katolik|hindu|buddha|gereja|masjid|rumah ibadah|kafir|murtad)\b/i, 'Kelompok agama', 'Agama dan identitas'],
    [/\b(?:suku|etnis|ras|cina|china|pribumi|asing|pendatang|warga lokal)\b/i, 'Kelompok etnis/warga asing', 'SARA dan identitas'],
    [/\b(?:vaksin|kesehatan|obat|penyakit|covid|rumah sakit|dokter)\b/i, 'Layanan kesehatan', 'Kesehatan publik'],
    [/\b(?:kpu|paslon|calon|partai|demo|protes)\b/i, 'Aktor politik', 'Politik dan pemilu'],
    [/\b(?:tokoh|ustadz|pendeta|pejabat|gubernur|bupati|wali kota)\b/i, 'Tokoh publik', 'Figur publik'],
    [/\b(?:perusahaan|korporasi|bank|investor|ekonomi|harga|pasar)\b/i, 'Ekonomi/korporasi', 'Ekonomi dan kesejahteraan'],
    [/\b(?:perempuan|anak|lgbt|disabilitas|minoritas)\b/i, 'Kelompok rentan', 'Hak dan kelompok rentan']
  ];
  function arahNarasi(t, konteks) {
    const s = String(t || ''), sasaran = [], isu = [];
    SASARAN.forEach(([re, n, i]) => { if (re.test(s)) { sasaran.push(n); if (!isu.includes(i)) isu.push(i); } });
    const neg = /(gagal|korupsi|jual|khianat|bohong|tipu|menipu|hancur|rusak|ancam|serbu|bantai|musnah|kafir|hina|benci|palsu|hoaks|konspirasi|ditutupi|menutupi|menyembunyikan|dijajah)/i.test(s);
    const pos = /(dukung|mendukung|apresiasi|terima kasih|bantu|gotong royong|damai|rukun|bersatu|bangga)/i.test(s);
    let arah = neg && pos ? 'Kontradiktif' : neg ? 'Menyerang/mendiskreditkan' : pos ? 'Mendukung/menguatkan' : 'Netral/tidak jelas';
    if (konteks === 'bantahan_bersumber' || konteks === 'kemungkinan_bantahan') arah = 'Membantah/meluruskan';
    return { sasaran: sasaran.length ? sasaran : ['Tidak spesifik'], isu: isu.join('; ') || 'Tidak spesifik', arah,
      emosi: /(takut|ancam|waspada|awas|bahaya|panik)/i.test(s) ? 'Takut/ancaman' : /(marah|geram|benci|hina)/i.test(s) ? 'Marah/permusuhan' : /(sedih|prihatin|kasihan)/i.test(s) ? 'Prihatin' : 'Netral' };
  }

  function analisis(teks) {
    const asli = String(teks == null ? '' : teks);
    if (!asli.trim()) return kosong();
    const nm = normalisasi(asli);
    const kata = nm.leet ? nm.leet.split(' ').length : 0;
    if (!kata) return kosong();

    // 1) kumpulkan kecocokan
    const temu = []; // {ind, hits:[{kutipan,konteks,c}]}
    for (const ind of INDIKATOR) {
      let hits;
      if (ind.rx) hits = cocokkan(ind, nm);
      else hits = (DETEKTOR[ind.fn] ? DETEKTOR[ind.fn](asli, nm) : []).map(h => ({ kutipan: h.kutipan, konteks: h.kutipan, c: 1 }));
      if (hits.length) temu.push({ ind, hits });
    }

    // 2) konteks
    const adaDebunk = RX.debunkKuat.test(' ' + nm.mentah + ' ');
    const adaSumber = RX.sumber.test(' ' + nm.mentah + ' ') || /https?:\/\/|www\./i.test(asli) || /\.go\.id/i.test(asli);
    let konteks = 'netral';
    if (adaDebunk && adaSumber) konteks = 'bantahan_bersumber'; else if (adaDebunk) konteks = 'kemungkinan_bantahan';
    const sipil = RX.sipil.test(' ' + nm.mentah + ' ');
    const FAKTOR_DEBUNK = konteks === 'bantahan_bersumber' ? 0.2 : konteks === 'kemungkinan_bantahan' ? 0.5 : 1;

    // 3) skor per indikator (tahap 1), lalu faktor konteks
    const KUAT = new Set(['KETAKUTAN', 'FRAMING', 'POLARISASI', 'CLICKBAIT']);
    const baris = temu.map(({ ind, hits }) => {
      const ck = Math.max(...hits.map(h => h.c));
      const jumlah = Math.min(hits.length, 3);
      return { ind, hits, nilai: ind.bobot * ck * (1 + 0.3 * (jumlah - 1)), faktor: [] };
    });
    const adaKategoriKuat = baris.some(b => KUAT.has(b.ind.kat) && b.nilai >= 6);

    // U02: tanpa sumber, hanya bila ada indikator lain dan teks cukup panjang
    if (!adaSumber && kata >= 6 && baris.some(b => b.ind.kat !== 'REPETISI' && !(b.ind.id === 'E02'))) {
      const ind = BY_ID.U02; baris.push({ ind, hits: [{ kutipan: 'tidak ada tautan/atribusi sumber', konteks: 'tidak ada tautan/atribusi sumber', c: 1 }], nilai: ind.bobot, faktor: [] });
    }
    for (const b of baris) {
      if (b.ind.kondisional && !adaKategoriKuat) { b.nilai *= 0.4; b.faktor.push('ajakan menyebarkan tanpa kategori lain ×0,4'); }
      if (FAKTOR_DEBUNK < 1 && b.ind.kat !== 'REPETISI') {
        if (b.ind.kat === 'TIDAK_TERVERIFIKASI' && konteks === 'bantahan_bersumber') { b.nilai = 0; b.faktor.push('bantahan bersumber: tidak dihitung'); }
        else { b.nilai *= FAKTOR_DEBUNK; b.faktor.push('konteks ' + konteks.replace('_', ' ') + ' ×' + String(FAKTOR_DEBUNK).replace('.', ',')); }
      }
      if (sipil && !(KUAT.has(b.ind.kat) && b.ind.id !== 'C04') && (b.ind.kat === 'EMOSI' || b.ind.kat === 'PROVOKATIF')) { b.nilai *= 0.5; b.faktor.push('konteks warga/sipil ×0,5'); }
    }

    // 4) SARA: kata identitas + ancaman/konspirasi/permusuhan
    const adaIdentitas = RX.identitas.test(' ' + nm.mentah + ' ') || RX.identitas.test(' ' + nm.leet + ' ');
    const pemicuSara = baris.some(b => ['F02', 'R01', 'R03', 'P01', 'P02', 'P03', 'V02'].includes(b.ind.id) && b.nilai >= 4);
    let sara = adaIdentitas && pemicuSara;
    if (sara) {
      const nilaiSara = 15 * FAKTOR_DEBUNK;
      baris.push({ ind: { id: 'S01', kat: 'POLARISASI', nama: 'Eksploitasi isu SARA (kata identitas bersama pola ancaman/konspirasi/permusuhan)', teknik: 'Eksploitasi isu SARA', bobot: 15 },
        hits: [{ kutipan: 'identitas + pola manipulasi', konteks: 'kata identitas muncul bersama indikator manipulasi', c: 1 }], nilai: nilaiSara, faktor: FAKTOR_DEBUNK < 1 ? ['konteks bantahan'] : [] });
    }

    // 5) agregasi kategori
    const kategori = {};
    for (const k of Object.keys(KATEGORI)) kategori[k] = { skor: 0, maks: KATEGORI[k].batas, indikator: [] };
    for (const b of baris) {
      if (b.nilai <= 0) continue;
      kategori[b.ind.kat].skor += b.nilai;
      kategori[b.ind.kat].indikator.push({ id: b.ind.id, nama: b.ind.nama, nilai: Math.round(b.nilai * 10) / 10, faktor: b.faktor });
    }
    let total = 0;
    for (const k of Object.keys(kategori)) { kategori[k].skor = Math.round(Math.min(kategori[k].skor, kategori[k].maks)); total += kategori[k].skor; }
    let risk = Math.min(100, total);
    const lantaiAktif = baris.some(b => b.ind.lantai && b.nilai >= b.ind.bobot * 0.9);
    if (lantaiAktif && konteks === 'netral') risk = Math.max(risk, 65);
    risk = Math.round(risk);

    // 6) bukti, tanda, teknik
    const aktif = baris.filter(b => b.nilai > 0);
    const bukti = [];
    aktif.forEach(b => b.hits.slice(0, 3).forEach(h => bukti.push({ indikator: b.ind.id, kategori: b.ind.kat, nama: b.ind.nama, kutipan: h.kutipan, konteks: h.konteks })));
    const tanda = aktif.map(b => b.ind.nama);
    const teknik = [...new Set(aktif.map(b => b.ind.teknik))];

    // 7) keyakinan
    const kategoriAktif = new Set(aktif.map(b => b.ind.kat));
    const kuatCount = [...kategoriAktif].filter(k => aktif.some(b => b.ind.kat === k && b.nilai >= 6)).length;
    let keyakinan = 'rendah';
    if (kata >= 6) {
      if (konteks === 'netral' && (kuatCount >= 3 || lantaiAktif) && kata >= 10) keyakinan = 'tinggi';
      else if (konteks !== 'bantahan_bersumber' && (kuatCount >= 2 || lantaiAktif)) keyakinan = 'sedang';
      else if (risk < AMBANG.VERIFIKASI && konteks === 'netral') keyakinan = 'sedang';
    }

    const ar = arahNarasi(asli, konteks);
    const ringkasan = risk < AMBANG.VERIFIKASI ? 'Tidak ditemukan indikator manipulasi yang menonjol pada pola bahasa.' :
      'Ditemukan ' + aktif.length + ' indikator pada ' + kategoriAktif.size + ' kategori' + (konteks !== 'netral' ? ' (konteks: ' + konteks.replace(/_/g, ' ') + ')' : '') + '. Penilaian pola bahasa, bukan pemeriksaan fakta.';
    return { versi: VERSI, kosong: false, verdict: verdictDari(risk), risk, sara, ringkasan, tanda, teknik, kategori, bukti, konteks, keyakinan,
      metode: metode(), keterbatasan: KETERBATASAN, narasi_tandingan: NARASI_TANDINGAN, tabayyun: TABAYYUN, jumlahKata: kata,
      sasaran: ar.sasaran, arah: ar.arah, isu: ar.isu, emosi: ar.emosi, lantai: lantaiAktif };
  }

  const api = { VERSI, KATEGORI, INDIKATOR, AMBANG, normalisasi, tokens, analisis, arahNarasi, verdictDari, STOP: RX.stop, identitas: RX.identitas, debunkKuat: RX.debunkKuat };
  g.KS = g.KS || {}; g.KS.teks = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
