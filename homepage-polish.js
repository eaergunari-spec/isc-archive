(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const artistPhotos = {
    '01': { src: 'assets/artists/01-lambrini-girls.webp', focus: '50% 46%' },
    '02': { src: 'assets/artists/02-elise-de-lune.webp', focus: '50% 38%' },
    '03': { src: 'assets/artists/03-meira-omar-liamoo.png', focus: '50% 44%' },
    '04': { src: 'assets/artists/04-saint-levant.webp', focus: '50% 30%' },
    '05': { src: 'assets/artists/05-hayq.jpg', focus: '50% 18%' },
    '06': { src: 'assets/artists/06-laura-pausini.webp', focus: '50% 30%' },
    '07': { src: 'assets/artists/07-Audrey-Hobert.jpg', focus: '50% 42%' },
    '08': { src: 'assets/artists/08-galena.jpg', focus: '50% 30%' }
  };

  const artworkToOrder = {
    '01-lambrini-girls.webp': '01',
    '02-elise-de-lune.webp': '02',
    '03-meira-omar-liamoo.webp': '03',
    '04-saint-levant.webp': '04',
    '05-hayq.webp': '05',
    '06-laura-pausini.webp': '06',
    '07-audrey-hobert.webp': '07',
    '08-galena.webp': '08'
  };

  function useArtistPhoto(image, order) {
    const photo = artistPhotos[order];
    if (!image || !photo) return;
    image.onerror = null;
    if (image.getAttribute('src') !== photo.src) image.setAttribute('src', photo.src);
    image.style.objectPosition = photo.focus;
    image.decoding = 'async';
  }

  function localizeEntryCards() {
    document.querySelectorAll('.entry-card[data-entry]').forEach(card => {
      useArtistPhoto(card.querySelector('.entry-card-image'), card.dataset.entry);
    });
  }

  const hero = document.getElementById('hero-feature-image');
  if (hero) {
    const artist = document.getElementById('hero-feature-artist');
    const country = document.getElementById('hero-feature-country');
    const song = document.getElementById('hero-feature-song');
    const order = document.getElementById('hero-feature-order');

    const freezeHero = () => {
      if (!reduceMotion) return false;
      useArtistPhoto(hero, '03');
      if (artist) artist.textContent = 'Meira Omar & LIAMOO';
      if (country) country.textContent = 'GÜNEŞ DİYARI';
      if (song) song.textContent = 'MAZAA';
      if (order) order.textContent = '03';
      return true;
    };

    const localizeHero = () => {
      if (freezeHero()) return;
      const src = hero.getAttribute('src') || '';
      if (src.startsWith('assets/artists/')) return;
      const basename = src.split('/').pop().split('?')[0];
      const entryOrder = artworkToOrder[basename];
      if (entryOrder) useArtistPhoto(hero, entryOrder);
    };

    localizeHero();
    new MutationObserver(localizeHero).observe(hero, { attributes: true, attributeFilter: ['src'] });
    if (reduceMotion && artist) {
      new MutationObserver(freezeHero).observe(artist, { childList: true, characterData: true, subtree: true });
    }
  }

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
    button.addEventListener('click', () => loadEmbed(host, provider, originalSrc, title), { once: true });
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

    button.addEventListener('click', () => loadEmbed(host, provider, originalSrc, title), { once: true });
    host.appendChild(button);
  }

  function enhanceArchivePreview() {
    const section = document.querySelector('.archive-section');
    if (!section) return;
    const placeholder = section.querySelector('.archive-card.placeholder');
    if (placeholder) {
      const card = document.createElement('a');
      card.className = 'archive-card archived';
      card.href = 'editions/153/';
      card.style.color = 'inherit';
      card.style.textDecoration = 'none';
      card.innerHTML = `
        <span>153</span>
        <div>
          <small>ARCHIVED · FINAL COMPLETE</small>
          <strong>ISC 153</strong>
          <p>Winner: SUPERLAND · LA NIÑA · 51 points</p>
        </div>`;
      placeholder.replaceWith(card);
    }
    const current = section.querySelector('.archive-card.current');
    if (current && current.tagName !== 'A') {
      current.style.cursor = 'pointer';
      current.setAttribute('role', 'link');
      current.setAttribute('tabindex', '0');
      const openCurrent = () => { window.location.href = 'editions/154/'; };
      current.addEventListener('click', openCurrent);
      current.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openCurrent();
        }
      });
    }
    const copy = section.querySelector('.section-heading > p');
    if (copy) copy.textContent = 'Canlı ISC 154 ve tamamlanmış ISC 153 artık aynı kalıcı arşivde. Geçmiş edisyonlarda line-up, resmî sonuç ve delegasyon oyları birlikte saklanıyor.';
  }

  document.querySelectorAll('.embed-gate[data-embed-src]').forEach(wireStaticGate);
  document.querySelectorAll('.youtube-frame-wrap iframe').forEach(frame => makeLegacyGate(frame, 'YouTube'));
  document.querySelectorAll('.spotify-embed-wrap iframe').forEach(frame => makeLegacyGate(frame, 'Spotify'));

  localizeEntryCards();
  enhanceArchivePreview();
})();