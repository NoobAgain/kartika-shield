'use strict';
(() => {
  const facebook = document.getElementById('ks-share-facebook');
  const xLink = document.getElementById('ks-share-x');
  const tiktok = document.getElementById('ks-share-tiktok');
  const copy = document.getElementById('ks-share-copy');
  const status = document.getElementById('ks-share-status');
  if (!facebook || !xLink || !tiktok || !copy || !status) return;

  const getShareData = () => ({
    url: window.location.href,
    title: document.title || 'KARTIKA SHIELD',
    text: 'KARTIKA SHIELD - Disinformation Threat Exchange'
  });
  const shareUrl = encodeURIComponent(getShareData().url);
  const shareTitle = encodeURIComponent(getShareData().title);
  facebook.href = `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`;
  xLink.href = `https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareTitle}`;

  async function copyUrl() {
    const url = getShareData().url;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        const field = document.createElement('textarea');
        field.value = url;
        field.setAttribute('readonly', '');
        field.style.position = 'fixed';
        field.style.opacity = '0';
        document.body.appendChild(field);
        field.select();
        const ok = document.execCommand('copy');
        field.remove();
        if (!ok) throw new Error('Clipboard tidak tersedia');
      }
      status.textContent = location.protocol === 'file:'
        ? 'Tautan lokal tersalin. Agar bisa dibuka orang lain, publikasikan dashboard melalui HTTP/HTTPS.'
        : 'Tautan dashboard berhasil disalin.';
      return true;
    } catch (_) {
      status.textContent = 'Tidak dapat menyalin otomatis. Salin alamat dari bilah browser.';
      return false;
    }
  }

  copy.addEventListener('click', () => { copyUrl(); });
  tiktok.addEventListener('click', async () => {
    const data = getShareData();
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share(data);
        status.textContent = 'Menu berbagi perangkat dibuka. Pilih TikTok jika tersedia.';
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') {
          status.textContent = 'Berbagi dibatalkan.';
          return;
        }
      }
    }
    await copyUrl();
    window.open('https://www.tiktok.com/', '_blank', 'noopener,noreferrer');
    status.textContent = 'Tautan disalin. Tempelkan pada profil, pesan, atau konten TikTok. TikTok tidak menyediakan tautan web-share umum untuk situs eksternal.';
  });
})();
