(() => {
  function loadEmbed(host, provider, originalSrc, title) {
    const frame = document.createElement('iframe');
    let src = originalSrc;
    if (provider === 'YouTube') {
      src = src.replace('www.youtube.com/embed/', 'www.youtube-nocookie.com/embed/');
      src += (src.includes('?') ? '&' : '?') + 'autoplay=1';
      frame.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
      frame.allowFullscreen = true;
    } else {
      frame.setAttribute('allow', 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture');
    }
    frame.src = src;
    frame.title = title || `${provider} player`;
    host.replaceChildren(frame);
  }

  function wireStaticGate(host) {
    const provider = host.dataset.embedProvider;
    const originalSrc = host.dataset.embedSrc;
    const title = host.dataset.embedTitle;
    const button = host.querySelector('.embed-gate-button');
    if (!provider || !originalSrc || !button) return;
    button.addEventListener('click', () => loadEmbed(host, provider, originalSrc, title), { once:true });
  }

  function makeLegacyGate(iframe, provider) {
    const host = iframe.parentElement;
    if (!host || host.classList.contains('embed-gate')) return;
    const originalSrc = iframe.getAttribute('src');
    const title = iframe.getAttribute('title') || `${provider} player`;
    host.classList.add('embed-gate');
    iframe.remove();

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'embed-gate-button';
    button.setAttribute('aria-label', `${provider} playerını yükle`);

    if (provider === 'YouTube') {
      button.innerHTML = `
        <img src="assets/artists/03-meira-omar-liamoo.png" alt="" aria-hidden="true">
        <span class="embed-gate-copy">
          <i class="embed-gate-play" aria-hidden="true">▶</i>
          <b>ISC 154 playlistini aç</b>
          <span>YouTube player yalnızca tıkladığında yüklenir.</span>
        </span>`;
    } else {
      button.innerHTML = `
        <span class="embed-gate-copy">
          <i class="embed-gate-play" aria-hidden="true">▶</i>
          <b>Spotify playerını aç</b>
          <span>Spotify embed yalnızca tıkladığında yüklenir.</span>
        </span>`;
    }

    button.addEventListener('click', () => loadEmbed(host, provider, originalSrc, title), { once:true });
    host.appendChild(button);
  }

  document.querySelectorAll('.embed-gate[data-embed-src]').forEach(wireStaticGate);
  document.querySelectorAll('.youtube-frame-wrap iframe').forEach(frame => makeLegacyGate(frame, 'YouTube'));
  document.querySelectorAll('.spotify-embed-wrap iframe').forEach(frame => makeLegacyGate(frame, 'Spotify'));
})();
