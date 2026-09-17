(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const localArtwork = {
    '01':'01-lambrini-girls.webp',
    '02':'02-elise-de-lune.webp',
    '03':'03-meira-omar-liamoo.webp',
    '04':'04-saint-levant.webp',
    '05':'05-hayq.webp',
    '06':'06-laura-pausini.webp',
    '07':'07-audrey-hobert.webp',
    '08':'08-galena.webp'
  };
  const videoToArtwork = {
    '20TDd19oA1Q':'01-lambrini-girls.webp',
    'TnThIGhFn5Q':'02-elise-de-lune.webp',
    'oFO8UkkCd8Q':'03-meira-omar-liamoo.webp',
    'J7e70aw_x_E':'04-saint-levant.webp',
    'QGMFry9eKNc':'05-hayq.webp',
    'MjwPS-lfbhU':'06-laura-pausini.webp',
    'ohh3-7FCzkQ':'07-audrey-hobert.webp',
    '2GCBHSnvJik':'08-galena.webp'
  };

  function localizeEntryCards() {
    document.querySelectorAll('.entry-card[data-entry]').forEach(card => {
      const image = card.querySelector('.entry-card-image');
      const local = localArtwork[card.dataset.entry];
      if (!image || !local) return;
      image.onerror = null;
      image.src = local;
      image.removeAttribute('onerror');
      image.decoding = 'async';
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
      hero.onerror = null;
      if (hero.getAttribute('src') !== localArtwork['03']) hero.setAttribute('src', localArtwork['03']);
      if (artist) artist.textContent = 'Meira Omar & LIAMOO';
      if (country) country.textContent = 'GÜNEŞ DİYARI';
      if (song) song.textContent = 'MAZAA';
      if (order) order.textContent = '03';
      return true;
    };

    const localizeHero = () => {
      if (freezeHero()) return;
      const src = hero.getAttribute('src') || '';
      const videoId = Object.keys(videoToArtwork).find(id => src.includes(id));
      if (!videoId) return;
      const local = videoToArtwork[videoId];
      if (hero.getAttribute('src') !== local) {
        hero.onerror = null;
        hero.setAttribute('src', local);
      }
    };
    localizeHero();
    new MutationObserver(localizeHero).observe(hero, { attributes:true, attributeFilter:['src'] });
    if (reduceMotion && artist) {
      new MutationObserver(freezeHero).observe(artist, { childList:true, characterData:true, subtree:true });
    }
  }

  function makeGate(iframe, provider) {
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
        <img src="03-meira-omar-liamoo.webp" alt="" aria-hidden="true">
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

    button.addEventListener('click', () => {
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
      frame.title = title;
      host.replaceChildren(frame);
    }, { once:true });

    host.appendChild(button);
  }

  document.querySelectorAll('.youtube-frame-wrap iframe').forEach(frame => makeGate(frame, 'YouTube'));
  document.querySelectorAll('.spotify-embed-wrap iframe').forEach(frame => makeGate(frame, 'Spotify'));

  localizeEntryCards();
})();
