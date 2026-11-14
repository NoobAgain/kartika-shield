'use strict';

// Analisis awal berita berbasis aturan lokal. Bukan verifikasi fakta dan bukan penilaian individu/kelompok.
const DIMENSIONS = [
  { key: 'keselamatan_publik', label: 'Keselamatan publik', words: ['korban jiwa', 'tewas', 'luka-luka', 'evakuasi', 'ancaman bom', 'penembakan', 'ledakan', 'serangan bersenjata', 'kebakaran'] },
  { key: 'bencana_darurat', label: 'Bencana dan keadaan darurat', words: ['gempa', 'tsunami', 'banjir', 'longsor', 'erupsi', 'gunung meletus', 'cuaca ekstrem', 'peringatan dini bencana'] },
  { key: 'infrastruktur_penting', label: 'Infrastruktur penting', words: ['gardu listrik', 'jaringan listrik', 'bendungan', 'kilang', 'pipa gas', 'bandara', 'pelabuhan', 'jaringan telekomunikasi'] },
  { key: 'ketegangan_sosial', label: 'Ketegangan sosial', words: ['bentrok', 'kerusuhan', 'konflik antarwarga', 'bentrokan', 'saling serang'] },
  { key: 'informasi_belum_terverifikasi', label: 'Informasi belum terverifikasi', words: ['belum terverifikasi', 'cek fakta', 'hoaks', 'disinformasi', 'informasi palsu', 'kabar bohong', 'klaim viral'] },
  { key: 'geopolitik_keamanan', label: 'Geopolitik dan keamanan', words: ['serangan militer', 'eskalasi militer', 'perbatasan', 'operasi militer', 'konflik bersenjata'] }
];
const IMMINENT = ['sedang berlangsung', 'saat ini', 'baru saja', 'hari ini', 'malam ini', 'segera dievakuasi'];
const HARM = ['menyerang', 'penembakan', 'ledakan', 'bom', 'serangan bersenjata', 'tewas', 'korban jiwa', 'kebakaran besar'];
const EXCLUDE_AS_THREAT = ['demonstrasi damai', 'aksi damai', 'kritik terhadap', 'mengkritik', 'unjuk rasa damai'];
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, Number.isFinite(+n) ? +n : lo));
const hasAny = (s, words) => words.some(w => s.includes(w));

function analyzeNews(article = {}, options = {}) {
  const title = String(article.title || '').slice(0, 500);
  const summary = String(article.summary || '').slice(0, 2000);
  const text = `${title}. ${summary}`.toLowerCase();
  const dimensions = DIMENSIONS.filter(d => hasAny(text, d.words)).map(d => ({ key: d.key, label: d.label, indicators: d.words.filter(w => text.includes(w)).slice(0, 5) }));
  const excludedContext = hasAny(text, EXCLUDE_AS_THREAT);
  const sourceKnown = !!(article.source || article.sourceHost || article.url);
  const publishedKnown = !!article.publishedAt && Number.isFinite(Date.parse(article.publishedAt));
  const hasSummary = summary.trim().length >= 80;
  const hasTitle = title.trim().length >= 20;

  // Existing lexical score is retained as one input, not treated as a factual threat verdict.
  const lexical = clamp(article.risk, 0, 100);
  const dimensionScore = Math.min(100, dimensions.reduce((n, d) => n + (d.key === 'keselamatan_publik' ? 22 : d.key === 'bencana_darurat' ? 18 : d.key === 'ketegangan_sosial' ? 20 : d.key === 'infrastruktur_penting' ? 18 : d.key === 'informasi_belum_terverifikasi' ? 12 : 10), 0));
  let riskScore = Math.round(clamp(lexical * 0.75 + dimensionScore * 0.25, 0, 100));
  if (excludedContext && !hasAny(text, HARM)) riskScore = Math.min(riskScore, 24);

  const imminent = hasAny(text, IMMINENT);
  const harm = hasAny(text, HARM);
  const explicitLocation = !!(article.province || article.locationVerified === true);
  const corroboration = clamp(article.independentSources || 1, 1, 5);
  // Critical requires several independent signals; sensitive vocabulary alone is insufficient.
  const criticalGate = riskScore >= 80 && imminent && harm && explicitLocation && corroboration >= 2 && !excludedContext;
  let status = 'AMAN';
  if (criticalGate) status = 'KRITIS';
  else if (riskScore >= 60) status = 'SIAGA';
  else if (riskScore >= 30) status = 'WASPADA';

  let confidenceScore = 25 + (hasTitle ? 12 : 0) + (hasSummary ? 18 : 0) + (sourceKnown ? 15 : 0) + (publishedKnown ? 10 : 0) + (explicitLocation ? 8 : 0) + (corroboration > 1 ? Math.min(12, (corroboration - 1) * 6) : 0);
  confidenceScore = Math.round(clamp(confidenceScore, 0, 88));

  const reasons = [];
  if (dimensions.length) reasons.push(`Indikator topik: ${dimensions.map(d => d.label).join(', ')}.`);
  if (imminent) reasons.push('Terdapat penanda waktu/kondisi yang mengarah pada perkembangan terkini; waktu kejadian tetap perlu diverifikasi.');
  if (harm) reasons.push('Terdapat istilah terkait dampak keselamatan; konteks isi berita perlu diperiksa.');
  if (!hasSummary) reasons.push('Ringkasan berita terbatas; analisis hanya berdasarkan judul dan metadata yang tersedia.');
  if (corroboration < 2) reasons.push('Belum ada konfirmasi independen yang tercatat.');
  if (excludedContext) reasons.push('Konteks kritik atau aksi damai terdeteksi; tidak diperlakukan sebagai ancaman tanpa indikator perilaku berbahaya.');
  if (!reasons.length) reasons.push('Tidak ditemukan indikator risiko kuat dari metadata dan teks ringkas yang tersedia.');

  const statusLabel = { AMAN: 'Informasional', WASPADA: 'Perlu dipantau', SIAGA: 'Perlu verifikasi lanjutan', KRITIS: 'Perlu perhatian operator segera' }[status];
  return {
    version: 1,
    analyzedAt: new Date(options.now || Date.now()).toISOString(),
    method: 'local_rules_preliminary',
    riskScore,
    confidenceScore,
    status,
    statusLabel,
    dimensions,
    reasons,
    evidence: { sourceKnown, publishedKnown, hasTitle, hasSummary, explicitLocation, independentSources: corroboration, imminent, harm },
    verificationRequired: status === 'SIAGA' || status === 'KRITIS',
    humanReviewRequired: status === 'KRITIS',
    caveat: 'Indikator otomatis, bukan konfirmasi fakta. Periksa artikel asli dan sumber independen; lokasi hanya mengikuti metadata yang terverifikasi.'
  };
}

module.exports = { analyzeNews, DIMENSIONS };
