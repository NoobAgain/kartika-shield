'use strict';
(() => {
  // Gunakan ID video live yang diberikan pemilik proyek, bukan pencarian kanal otomatis.
  const channels = {
    tvone: {
      name: 'tvOne',
      id: 'rQJoEpzKkNk',
      url: 'https://www.youtube.com/watch?v=rQJoEpzKkNk'
    },
    kompas: {
      name: 'Kompas TV',
      id: 'DOOrIxw5xOw',
      url: 'https://www.youtube.com/watch?v=DOOrIxw5xOw'
    },
    metro: {
      name: 'Metro TV',
      id: 'kpZFiat3zY4',
      url: 'https://www.youtube.com/watch?v=kpZFiat3zY4'
    }
  };

  const panel = document.getElementById('mini-tv');
  const launcher = document.getElementById('mini-tv-show');
  const select = document.getElementById('mini-tv-channel');
  const player = document.getElementById('mini-tv-player');
  const open = document.getElementById('mini-tv-open');
  const status = document.getElementById('mini-tv-status');
  if (!panel || !launcher || !select || !player || !open) return;

  const load = key => {
    const selected = Object.prototype.hasOwnProperty.call(channels, key) ? key : 'tvone';
    const channel = channels[selected];
    select.value = selected;
    player.title = `Siaran ${channel.name} melalui YouTube`;
    // ID video langsung lebih deterministik daripada endpoint live_stream berbasis channel ID.
    // referrerpolicy="origin" pada iframe membantu YouTube mengenali asal halaman saat
    // dashboard dibuka melalui HTTP/HTTPS (bukan file://).
    player.src = `https://www.youtube-nocookie.com/embed/${channel.id}?autoplay=1&mute=1&controls=1&rel=0&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(location.origin)}`;
    open.href = channel.url;
    open.textContent = `Buka ${channel.name} di YouTube`;
    status.textContent = 'Pemutar mencoba mulai otomatis dalam keadaan mute. Autoplay dapat diblokir browser atau penyiar; tekan Putar atau gunakan tautan YouTube jika embed tidak diizinkan.';
    try { localStorage.setItem('ks_mini_tv_channel', selected); } catch (_) {}
  };

  select.addEventListener('change', () => load(select.value));
  document.getElementById('mini-tv-hide')?.addEventListener('click', () => {
    panel.hidden = true;
    launcher.hidden = false;
    try { localStorage.setItem('ks_mini_tv_hidden', '1'); } catch (_) {}
  });
  launcher.addEventListener('click', () => {
    panel.hidden = false;
    launcher.hidden = true;
    try { localStorage.setItem('ks_mini_tv_hidden', '0'); } catch (_) {}
  });

  let initial = 'tvone';
  try {
    const saved = localStorage.getItem('ks_mini_tv_channel');
    if (saved && Object.prototype.hasOwnProperty.call(channels, saved)) initial = saved;
  } catch (_) {}
  load(initial);
  try {
    if (localStorage.getItem('ks_mini_tv_hidden') === '1') {
      panel.hidden = true;
      launcher.hidden = false;
    }
  } catch (_) {}
})();
