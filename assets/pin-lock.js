/* KARTIKA SHIELD — PIN gate + auto-lock (client-side access screen) */
(() => {
  'use strict';
  const ACCESS_PIN = '2527';
  const IDLE_LIMIT = 3 * 60 * 1000;
  let idleTimer = null;
  let unlocked = false;
  let attempts = 0;

  const mount = () => {
    if (document.getElementById('ks-pin-screen')) return;
    const overlay = document.createElement('section');
    overlay.id = 'ks-pin-screen';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'ks-pin-title');
    overlay.innerHTML = `
      <div class="ks-pin-backdrop" aria-hidden="true"></div>
      <div class="ks-pin-card">
        <div class="ks-pin-mark"><img class="ks-pin-logo" src='assets/pin-logo-kartika.png' alt="Lambang Kartika"><span class="ks-pin-pulse"></span></div>
        <div class="ks-pin-kicker">SISTEM AKSES AMAN</div>
        <h1 id="ks-pin-title">Akses Terproteksi</h1>
        <p class="ks-pin-desc">Masukkan PIN untuk membuka pusat pemantauan.</p>
        <input id="ks-pin-input" class="ks-pin-input" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="new-password" autocapitalize="off" spellcheck="false" placeholder="Masukkan PIN" aria-label="Masukkan PIN" />
        <p id="ks-pin-error" class="ks-pin-error" role="alert" aria-live="polite">&nbsp;</p>
        
        <button type="button" id="ks-pin-submit" class="ks-pin-submit">MASUK KE DASHBOARD <span>→</span></button>
        <div class="ks-pin-foot"><span class="ks-pin-lock-icon">▣</span> Sesi otomatis terkunci setelah 3 menit tidak aktif</div>
      </div>`;
    document.body.appendChild(overlay);

    const input = overlay.querySelector('#ks-pin-input');
    const error = overlay.querySelector('#ks-pin-error');
    const updateDots = () => {};
    const fail = () => {
      attempts++;
      error.textContent = 'PIN tidak sesuai. Silakan coba kembali.';
      overlay.querySelector('.ks-pin-card').classList.remove('ks-pin-shake');
      void overlay.querySelector('.ks-pin-card').offsetWidth;
      overlay.querySelector('.ks-pin-card').classList.add('ks-pin-shake');
      input.value = '';
      updateDots();
      input.focus();
    };
    const unlock = () => {
      if (input.value !== ACCESS_PIN) return fail();
      unlocked = true;
      error.textContent = '';
      overlay.classList.add('ks-pin-exit');
      document.body.classList.remove('ks-pin-locked');
      window.setTimeout(() => overlay.remove(), 420);
      startIdleTimer();
    };
    overlay.querySelector('#ks-pin-submit').addEventListener('click', unlock);
    input.addEventListener('input', () => {
      input.value = input.value.replace(/\D/g, '').slice(0, 4);
      updateDots(); error.textContent = '\u00a0';
      if (input.value.length === 4) window.setTimeout(unlock, 120);
    });
    input.addEventListener('keydown', e => { if (e.key === 'Enter') unlock(); });
    document.body.classList.add('ks-pin-locked');
    window.setTimeout(() => input.focus(), 80);
  };

  function lockScreen() {
    if (!unlocked) return;
    unlocked = false;
    if (idleTimer) window.clearTimeout(idleTimer);
    idleTimer = null;
    mount();
    const input = document.getElementById('ks-pin-input');
    if (input) { input.value = ''; input.focus(); }
  }
  function startIdleTimer() {
    if (idleTimer) window.clearTimeout(idleTimer);
    if (unlocked) idleTimer = window.setTimeout(lockScreen, IDLE_LIMIT);
  }
  const activity = () => { if (unlocked) startIdleTimer(); };
  ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'wheel', 'scroll'].forEach(type => {
    window.addEventListener(type, activity, { passive: true });
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && unlocked) startIdleTimer();
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();
