// Jembatan n8n: analisis AI (webhook) + tinjauan manusia (webhook).
// Skor aturan lokal TIDAK diubah. Bila n8n tidak terjangkau, dasbor memakai skor aturan lokal.
// Tidak ada kunci API di sini: Gemini dipanggil dari sisi n8n, bukan dari peramban.
const KS_CONFIG = {
  analyzeUrl: 'https://adamsmaulanaa.app.n8n.cloud/webhook/kartika-shield-analyze',
  reviewUrl: 'https://adamsmaulanaa.app.n8n.cloud/webhook/kartika-shield-review',
  timeoutMs: 30000,
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
    const ctrl = new AbortController();
    timer = setTimeout(() => ctrl.abort(), KS_CONFIG.timeoutMs);
    const res = await fetch(KS_CONFIG.analyzeUrl, {
      method: 'POST',
      headers: ksHeaders(),
      body: JSON.stringify({
        case_id: kasus.id,
        text: kasus.text,
        rule_score: rs,
        indicators: Array.isArray(kasus.indicators) ? kasus.indicators : [],
        source: kasus.source || 'Analisis Konten',
        region: kasus.region || ''
      }),
      signal: ctrl.signal
    });
    if (!res.ok) return lokal('HTTP ' + res.status);
    const j = await res.json();
    if (!j || typeof j !== 'object' || Array.isArray(j) || !isFinite(+j.final_score)) return lokal('balasan tidak sesuai');
    return Object.assign({ case_id: kasus.id }, j, { mode: 'online' });
  } catch (e) {
    return lokal(e && e.name === 'AbortError' ? 'timeout' : 'tidak terjangkau');
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
    ? '<span class="chip" style="border-color:#15803d;color:#15803d">AI online</span>'
    : '<span class="chip" style="border-color:#a16207;color:#a16207" title="' + esc(g.alasan || '') + '">Offline (aturan lokal)</span>';
  const n = v => (isFinite(+v) && v !== null && v !== '') ? Math.max(0, Math.min(100, Math.round(+v))) : '-';
  if (!on) return '<div class="bti" id="ksai">' + badge + ' <span class="note">Skor aturan lokal: ' + n(g.rule_score) + '/100. Layanan AI tidak dipakai untuk analisis ini.</span></div>';
  return '<div class="bti" id="ksai">' + badge + ' <b>Skor akhir ' + n(g.final_score) + '/100</b> <span class="note">(aturan ' + n(g.rule_score) + ' · AI ' + n(g.ai_score) + ')</span><br>' +
    '<b>Tingkat risiko:</b> ' + esc(g.risk_level || '-') + ' · <b>Arah narasi:</b> ' + esc(g.narrative_direction || '-') + '<br>' +
    '<b>Target:</b> ' + esc(g.target || '-') + '<br>' +
    '<b>Ringkasan AI:</b> ' + esc(g.summary || '-') +
    '<p class="note" style="margin:6px 0 0">Teks yang dianalisis dikirim ke layanan AI (n8n → Gemini). Skor akhir = 40% aturan + 60% AI.</p></div>';
}
