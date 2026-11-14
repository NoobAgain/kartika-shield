// Jembatan n8n: analisis AI (webhook) + tinjauan manusia (webhook).
// Skor aturan lokal TIDAK diubah. Bila n8n tidak terjangkau, dasbor memakai skor aturan lokal.
// Tidak ada kunci API di sini: Gemini dipanggil dari sisi n8n, bukan dari peramban.
const KS_CONFIG = {
  analyzeUrl: 'https://sukirman.app.n8n.cloud/webhook/kartika-shield-analyze',
  reviewUrl: 'https://adamsmaulanaa.app.n8n.cloud/webhook/kartika-shield-review',
  timeoutMs: 120000,
  // Opsional: bila diisi, dikirim sebagai header x-ks-key. Catatan: nilai di sini terlihat oleh siapa pun
  // yang membuka dasbor, jadi ini penghalang ringan, bukan pengamanan penuh.
  apiKey: ''
};

function ksBuatCaseId() {
  let r = '';
  try { const a = new Uint32Array(2); crypto.getRandomValues(a); r = a[0].toString(36) + a[1].toString(36); }
  catch (e) { r = Math.random().toString(36).slice(2, 12); }
  return 'ks-' + Date.now() + '-' + r.slice(0, 8);
}

function ksHeaders() {
  const h = { 'Content-Type': 'application/json' };
  if (KS_CONFIG.apiKey) h['x-ks-key'] = KS_CONFIG.apiKey;
  return h;
}

// kasus = { id, text, ruleScore, indicators, source, region }
// Tidak pernah melempar error: bila gagal, mengembalikan skor aturan lokal dengan mode "offline".
async function analisisGabungan(kasus) {
  const rs = Math.max(0, Math.min(100, Math.round(+(kasus && kasus.ruleScore) || 0)));
  const lokal = (alasan) => ({ case_id: kasus && kasus.id, rule_score: rs, ai_score: null, final_score: rs, mode: 'offline', alasan: alasan || '' });
  let timer = null;
  try {
    const hasImage = !!(kasus && kasus.image && kasus.image.file);
    const hasText = !!(kasus && String(kasus.text || '').trim());
    if (!hasImage && !hasText) {
      return lokal('Masukkan teks atau unggah foto terlebih dahulu.');
    }
    const fd = new FormData();
    if (hasImage) fd.append('foto', kasus.image.file, kasus.image.file.name || 'unggahan');
    fd.append('id_unggahan', String(kasus.id || ksBuatCaseId()));
    fd.append('jenis_input', hasImage && hasText ? 'text_image' : hasImage ? 'image' : 'text');
    fd.append('catatan', String(kasus.text || ''));
    fd.append('teks', String(kasus.text || ''));
    const ctrl = new AbortController();
    timer = setTimeout(() => ctrl.abort(), KS_CONFIG.timeoutMs);
    const res = await fetch(KS_CONFIG.analyzeUrl, { method: 'POST', body: fd, signal: ctrl.signal });
    let j = null;
    try { j = await res.json(); } catch (_) { return lokal('Respons n8n bukan JSON yang valid.'); }
    if (!res.ok) return Object.assign(lokal('HTTP ' + res.status), { server_status: j && j.status, pesan: j && j.pesan });
    if (!j || typeof j !== 'object' || Array.isArray(j) || !j.vonis) return lokal('Respons n8n tidak memuat field vonis yang diharapkan.');
    return Object.assign({ case_id: kasus.id }, j, { mode: 'online' });
  } catch (e) {
    return lokal(e && e.name === 'AbortError' ? 'timeout setelah 120 detik' : 'tidak terjangkau atau diblokir CORS');
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// Toast kecil, tidak memblokir UI.
function ksToast(msg) {
  try {
    const d = document.createElement('div');
    d.setAttribute('role', 'status');
    d.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:99999;background:#10233f;color:#fff;border:1px solid #5fd3c8;border-radius:8px;padding:10px 14px;max-width:92vw;font-size:.85rem;box-shadow:0 8px 30px #0008';
    d.textContent = msg;
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 3500);
  } catch (e) { }
}

// label: "tepat" atau "salah_tandai". Mengembalikan true/false; tidak pernah melempar error.
async function kirimTinjauan(caseId, label) {
  if (!caseId || (label !== 'tepat' && label !== 'salah_tandai')) { ksToast('Tinjauan tidak dikirim: data tidak lengkap.'); return false; }
  let timer = null;
  try {
    const ctrl = new AbortController();
    timer = setTimeout(() => ctrl.abort(), KS_CONFIG.timeoutMs);
    const res = await fetch(KS_CONFIG.reviewUrl, {
      method: 'POST', headers: ksHeaders(),
      body: JSON.stringify({ case_id: caseId, label }), signal: ctrl.signal
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    ksToast('Tinjauan terkirim ke n8n.');
    return true;
  } catch (e) {
    ksToast('Tinjauan belum terkirim ke n8n (layanan belum aktif atau tidak terjangkau). Tercatat di peramban.');
    return false;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// Panel hasil gabungan untuk halaman Analisis. Semua nilai dari n8n di-escape.
function ksPanelHtml(g) {
  if (!g) return '';
  const on = g.mode === 'online';
  const badge = on
    ? '<span class="chip" style="border-color:#15803d;color:#15803d">Gemini / n8n selesai</span>'
    : '<span class="chip" style="border-color:#a16207;color:#a16207" title="' + esc(g.alasan || '') + '">Belum terverifikasi oleh n8n</span>';
  const n = v => (isFinite(+v) && v !== null && v !== '') ? Math.max(0, Math.min(100, Math.round(+v))) : '-';
  if (!on) return '<div class="bti" id="ksai">' + badge + ' <span class="note">' + esc(g.alasan || 'Foto belum berhasil dianalisis oleh workflow n8n.') + '</span></div>';
  return '<div class="bti" id="ksai">' + badge + '<h3>Hasil Verifikasi AI</h3>' +
    '<p><b>Vonis:</b> ' + esc(g.vonis || '-') + '</p>' +
    '<p><b>Alasan vonis:</b> ' + esc(g.alasan_vonis || '-') + '</p>' +
    '<p><b>Skor kredibilitas:</b> ' + n(g.skor_kredibilitas) + '/100</p>' +
    '<p><b>Provokasi:</b> ' + (g.ada_provokasi === true ? 'Ya' : g.ada_provokasi === false ? 'Tidak' : 'Belum dinilai') + ' · <b>Skor provokasi:</b> ' + n(g.skor_provokasi) + '/100</p>' +
    '<p><b>Unsur provokasi:</b> ' + esc(Array.isArray(g.unsur_provokasi) ? g.unsur_provokasi.join(', ') : (g.unsur_provokasi || '-')) + '</p>' +
    '<p><b>Ringkasan:</b> ' + esc(g.ringkasan || '-') + '</p>' +
    (g.jenis_input === 'text' ? '' :
      '<div class="bti"><b>Teks terbaca dari gambar (OCR):</b>' +
      (typeof g.ocr_text === 'string'
        ? (g.ocr_text.length
          ? '<pre style="white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;margin:8px 0 0">' + esc(g.ocr_text) + '</pre>'
          : '<p class="note">Tidak ada tulisan yang terbaca pada gambar.</p>')
        : '<p class="note">OCR tidak tersedia pada hasil ini. Jika berasal dari memori lama, foto perlu diproses ulang untuk memperoleh OCR asli.</p>') +
      '</div>') +
    (g.dari_memori ? '<p class="note">Informasi ini memiliki kecocokan dengan memori pemeriksaan sebelumnya.</p>' : '') +
    '<p class="note">Hasil berasal dari workflow n8n. Status ini menunjukkan workflow mengembalikan hasil, bukan jaminan bahwa seluruh klaim telah terbukti secara independen.</p></div>';
}
