const API_BASE = 'https://knwvnbfqnccjiezprrme.supabase.co/rest/v1/rpc';
const PUBLIC_KEY = 'sb_publishable_Zw8H9mMmUop7wkYNKtZB3Q_7dM1QHut';
const CONTEXT_URL = `${API_BASE}/isc_public_current_context`;
const LIVE_STATUS_URL = `${API_BASE}/isc_public_current_live_status`;
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let context = null;
let edition = null;
let scheme = null;
let entries = [];
let currentFeaturedEntry = null;
let nowPlayingEntry = null;
let featureTimer = null;
let liveStatus = null;

const escapeAttr = value => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/"/g, '&quot;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

async function rpcFetch(url) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: PUBLIC_KEY,
      Authorization: `Bearer ${PUBLIC_KEY}`,
      'Content-Type': 'application/json'
    },
    body: '{}'
  });
  if (!response.ok) throw new Error(`RPC failed: ${response.status}`);
  return response.json();
}

const homeNav = document.querySelector('.home-page .site-header nav');
const homeCurrentEditionNav = document.getElementById('home-current-edition-nav');
const homeEditionLink = document.getElementById('home-edition-link');
const currentArchiveCard = document.getElementById('current-archive-card');
const heroResultsNote = document.querySelector('.hero-side-note');
let homeResultsLink = document.querySelector('[data-results-link]');
if (homeNav && !homeResultsLink) {
  homeResultsLink = document.createElement('a');
  homeResultsLink.href = 'results.html';
  homeResultsLink.dataset.resultsLink = '';
  const voteLink = homeNav.querySelector('.nav-vote');
  homeNav.insertBefore(homeResultsLink, voteLink || null);
}

const entryGrid = document.getElementById('entry-grid');
const heroImage = document.getElementById('hero-feature-image');
const heroOrder = document.getElementById('hero-feature-order');
const heroEntryCount = document.getElementById('hero-entry-count');
const heroArtist = document.getElementById('hero-feature-artist');
const heroCountry = document.getElementById('hero-feature-country');
const heroSong = document.getElementById('hero-feature-song');
const heroFrameLabel = document.getElementById('hero-frame-label');
const homeLivePill = document.getElementById('home-live-pill');
const homeHeroKicker = document.getElementById('home-hero-kicker');
const homeEditionNumber = document.getElementById('home-edition-number');
const homeHeroDeck = document.getElementById('home-hero-deck');
const listenCtaLabel = document.getElementById('listen-cta-label');
const entriesIntro = document.getElementById('entries-intro');
const listenIntro = document.getElementById('listen-intro');
const listenQuickrow = document.getElementById('listen-quickrow');
const tickerLabel = document.getElementById('ticker-label');
const voteSplashNumber = document.getElementById('vote-splash-number');
const voteSplashCopy = document.getElementById('vote-splash-copy');
const archiveIntro = document.getElementById('archive-intro');
const archiveCurrentNumber = document.getElementById('archive-current-number');
const archiveCurrentTitle = document.getElementById('archive-current-title');
const archiveCurrentMeta = document.getElementById('archive-current-meta');

async function initHomepage() {
  try {
    const data = await rpcFetch(CONTEXT_URL);
    if (!data?.ok) throw new Error(data?.reason || 'Current edition unavailable');

    context = data;
    edition = data.edition;
    scheme = data.voting_scheme;
    entries = (data.entries || []).map(entry => ({
      id: Number(entry.id),
      order: String(entry.running_order).padStart(2, '0'),
      runningOrder: Number(entry.running_order),
      country: entry.country,
      countrySlug: entry.country_slug,
      artist: entry.artist,
      song: entry.song,
      video: entry.video_id || '',
      videoUrl: entry.video_url || '',
      image: entry.image_url || '',
      focus: entry.image_focus || '50% 50%',
      detailUrl: entry.detail_url || ''
    }));

    liveStatus = {
      edition_number: edition.edition_number,
      title: edition.title,
      voting_open: Boolean(edition.voting_open),
      results_revealed: Boolean(edition.results_revealed),
      delegations: Number(edition.entry_count || entries.length),
      submitted_delegations: 0,
      last_submitted_at: null
    };

    applyEditionChrome();
    renderEntries();
    renderListen();
    renderVoteSplash();
    renderArchiveCard();
    setupEntryPlayer();
    setupHero();
    updateResultsStateChrome();
    renderLiveTicker();

    refreshLiveStatus();
    setInterval(refreshLiveStatus, 20000);
    setInterval(renderLiveTicker, 60000);
  } catch (error) {
    console.error('Current edition load failed', error);
    if (entryGrid) entryGrid.innerHTML = '<p class="status-line">Güncel edisyon verileri şu anda yüklenemiyor.</p>';
    if (homeLivePill) homeLivePill.innerHTML = '<span></span> Current edition unavailable';
    if (homeHeroDeck) homeHeroDeck.textContent = 'Güncel edisyon verileri şu anda yüklenemiyor.';
  }
}

function editionLabel() {
  return edition?.title || (edition?.edition_number ? `ISC ${edition.edition_number}` : 'ISC');
}

function pointsList() {
  return [...(scheme?.points || [])]
    .sort((a, b) => Number(a.rank) - Number(b.rank))
    .map(row => Number(row.points));
}

function applyEditionChrome() {
  const label = editionLabel();
  const count = entries.length;

  document.title = `${label} — International Song Contest`;
  document.querySelector('meta[name="description"]')?.setAttribute('content', `International Song Contest — ${label}, entries, voting, results and archive.`);
  document.querySelector('meta[property="og:title"]')?.setAttribute('content', `${label} — International Song Contest`);
  document.querySelector('meta[property="og:description"]')?.setAttribute('content', `${count} entry. ${label} katılımcılarını keşfet ve resmi oylamaya katıl.`);
  document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', `${label} — International Song Contest`);
  document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', `${count} entry · ${label} şimdi yayında.`);

  if (heroFrameLabel) heroFrameLabel.textContent = `${label.toUpperCase()} / CURRENT EDITION`;
  if (heroEntryCount) heroEntryCount.textContent = `/${String(count).padStart(2, '0')}`;
  const editionHubHref = `editions/${edition.edition_number}/`;
  if (homeHeroKicker) homeHeroKicker.textContent = `International Song Contest · Edition ${edition.edition_number}`;
  if (homeEditionNumber) homeEditionNumber.textContent = edition.edition_number;
  if (homeCurrentEditionNav) {
    homeCurrentEditionNav.textContent = label;
    homeCurrentEditionNav.href = editionHubHref;
  }
  if (homeEditionLink) homeEditionLink.href = editionHubHref;
  if (currentArchiveCard) currentArchiveCard.href = editionHubHref;
  if (homeHeroDeck) homeHeroDeck.textContent = `${count} ülke. ${count} şarkı. Gecenin kaderi oylarında.`;
  if (listenCtaLabel) listenCtaLabel.textContent = `${count} şarkıyı dinle`;
  if (entriesIntro) entriesIntro.textContent = `${label}’ün ${count} temsilcisi. Kartlardan resmi videoyu aç veya mevcutsa entry dosyasına git.`;
  if (listenIntro) listenIntro.textContent = `${count} entry’yi tek yerde dinle. Kullanılabilir resmi playlistler aşağıda güncel edisyon verisinden yüklenir.`;
  if (tickerLabel) tickerLabel.textContent = `${label} LIVE`;
  if (archiveIntro) archiveIntro.textContent = `${label} güncel edisyon. Geçmiş yarışmalar, sonuçlar ve voting history kalıcı arşivde tutuluyor.`;

  updateLivePill();
}

function updateLivePill() {
  if (!homeLivePill || !liveStatus) return;
  const label = editionLabel();
  if (liveStatus.results_revealed) {
    homeLivePill.innerHTML = `<span></span> ${escapeAttr(label)} · Results live`;
  } else if (liveStatus.voting_open) {
    homeLivePill.innerHTML = `<span></span> ${escapeAttr(label)} · Voting open now`;
  } else {
    homeLivePill.innerHTML = `<span></span> ${escapeAttr(label)} · Voting closed`;
  }
}

function renderEntries() {
  if (!entryGrid) return;
  entryGrid.innerHTML = entries.map(entry => {
    const primaryHref = entry.detailUrl || '#listen';
    const image = entry.image
      ? `<img class="entry-card-image" style="object-position:${escapeAttr(entry.focus)}" src="${escapeAttr(entry.image)}" alt="${escapeAttr(entry.artist)}" loading="lazy" decoding="async">`
      : '';
    const listenButton = entry.video
      ? `<button class="entry-listen" type="button" data-video="${escapeAttr(entry.video)}" data-order="${entry.order}" data-country="${escapeAttr(entry.country)}" data-artist="${escapeAttr(entry.artist)}" data-song="${escapeAttr(entry.song)}"><span class="entry-listen-icon">▶</span><span>DİNLE / İZLE</span></button>`
      : '';
    const detailAction = entry.detailUrl
      ? `<a class="entry-read" href="${escapeAttr(entry.detailUrl)}">DOSYAYI AÇ <span>→</span></a>`
      : `<a class="entry-read" href="archive.html">ARŞİV <span>→</span></a>`;

    return `
      <article class="entry-card" data-entry="${entry.order}">
        <a class="entry-card-primary" href="${escapeAttr(primaryHref)}" aria-label="Entry ${entry.order}: ${escapeAttr(entry.artist)} — ${escapeAttr(entry.song)}">
          <div class="entry-card-image-wrap">${image}<div class="entry-card-shade"></div></div>
          <div class="entry-card-top"><span class="entry-country">${escapeAttr(entry.country)}</span><span class="entry-no">${entry.order}</span></div>
          <div class="entry-meta"><div class="entry-artist">${escapeAttr(entry.artist)}</div><div class="entry-song">${escapeAttr(entry.song)}</div></div>
        </a>
        <div class="entry-card-actions" aria-label="${escapeAttr(entry.artist)} actions">${listenButton}${detailAction}</div>
      </article>`;
  }).join('');
}

function renderListen() {
  const label = editionLabel();
  const media = context?.media || [];
  const youtube = media.find(item => item.provider === 'youtube' && item.media_type === 'playlist');
  const spotify = media.find(item => item.provider === 'spotify' && item.media_type === 'playlist');

  configurePlatform('youtube', youtube, label);
  configurePlatform('spotify', spotify, label);

  if (listenQuickrow) {
    listenQuickrow.innerHTML = entries.map(entry => {
      const href = entry.detailUrl || entry.videoUrl || '#entries';
      const external = /^https?:/i.test(href);
      return `<a href="${escapeAttr(href)}" ${external ? 'target="_blank" rel="noopener"' : ''}><b>${entry.order}</b><span>${escapeAttr(entry.artist)}</span></a>`;
    }).join('');
  }
}

function platformPosterEntries(provider) {
  const visualEntries = entries.filter(entry => entry.image);
  if (!visualEntries.length) return [];

  const preferredOrders = provider === 'youtube'
    ? [3, 6, 8, 1]
    : [2, 4, 5, 7];

  const preferred = preferredOrders
    .map(order => visualEntries.find(entry => Number(entry.runningOrder) === order))
    .filter(Boolean);

  const combined = [...preferred, ...visualEntries.filter(entry => !preferred.includes(entry))];
  return combined.slice(0, provider === 'youtube' ? 4 : 4);
}

function renderPlatformPoster(provider, label) {
  const poster = document.getElementById(`${provider}-platform-poster`);
  if (!poster) return;

  const picks = platformPosterEntries(provider);
  if (!picks.length) {
    poster.innerHTML = `<span class="platform-poster-fallback"><b>${escapeAttr(label)}</b><small>OFFICIAL PLAYLIST</small></span>`;
    return;
  }

  if (provider === 'youtube') {
    const [lead, ...side] = picks;
    poster.innerHTML = `
      <span class="youtube-poster-main">
        <img src="${escapeAttr(lead.image)}" style="object-position:${escapeAttr(lead.focus)}" alt="" loading="lazy" decoding="async">
        <span class="poster-entry-chip">${lead.order} · ${escapeAttr(lead.country)}</span>
      </span>
      <span class="youtube-poster-strip">
        ${side.map(entry => `
          <span>
            <img src="${escapeAttr(entry.image)}" style="object-position:${escapeAttr(entry.focus)}" alt="" loading="lazy" decoding="async">
            <small>${entry.order}</small>
          </span>
        `).join('')}
      </span>
      <span class="platform-poster-stamp">OFFICIAL VIDEO PLAYLIST</span>`;
    return;
  }

  poster.innerHTML = `
    <span class="spotify-cover-grid">
      ${picks.map(entry => `
        <span>
          <img src="${escapeAttr(entry.image)}" style="object-position:${escapeAttr(entry.focus)}" alt="" loading="lazy" decoding="async">
        </span>
      `).join('')}
    </span>
    <span class="spotify-cover-title"><b>${escapeAttr(label)}</b><small>OFFICIAL PLAYLIST</small></span>
    <span class="platform-poster-stamp">8 SONGS · ONE EDITION</span>`;
}

function configurePlatform(provider, media, label) {
  const card = document.getElementById(`${provider}-platform-card`);
  const meta = document.getElementById(`${provider}-platform-meta`);
  const host = document.getElementById(`${provider}-embed-host`);
  const button = document.getElementById(`${provider}-embed-button`);
  const title = document.getElementById(`${provider}-embed-title`);
  const footer = document.getElementById(`${provider}-footer-copy`);
  const open = document.getElementById(`${provider}-open-link`);
  if (!card) return;

  if (!media?.canonical_url) {
    card.hidden = true;
    return;
  }

  card.hidden = false;
  if (meta) meta.textContent = `${entries.length} songs · ${label}`;
  if (title) title.textContent = `${label} ${provider === 'youtube' ? 'YouTube' : 'Spotify'} playlistini aç`;
  if (footer) footer.textContent = `Official ${label} playlist`;
  if (open) open.href = media.canonical_url;
  renderPlatformPoster(provider, label);

  if (button && host && media.embed_url) {
    button.onclick = () => loadEmbed(host, provider, media.embed_url, media.title || `${label} playlist`);
  } else if (button) {
    button.disabled = true;
  }
}

function loadEmbed(host, provider, source, title) {
  const frame = document.createElement('iframe');
  let src = source;
  if (provider === 'youtube') {
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
}

function renderVoteSplash() {
  const points = pointsList();
  const top = points[0] ?? '—';
  const eligible = entries.length - (scheme?.self_vote_allowed ? 0 : 1);
  const unscored = Math.max(0, eligible - points.length);

  if (voteSplashNumber) voteSplashNumber.textContent = top;
  if (!voteSplashCopy) return;

  const selfText = scheme?.self_vote_allowed
    ? 'Kendi entry’n de sıralamaya dahil.'
    : 'Kendi entry’n sıralamaya dahil edilmez.';
  const scoringText = unscored > 0
    ? `En üstteki ${points.length} entry sırasıyla ${points.join(', ')} puan alır; kalan ${unscored} entry puansız kalır.`
    : `Sıralamadaki puanlar: ${points.join(', ')}.`;

  voteSplashCopy.textContent = `Ülkeni seç, kalıcı voter code’unla doğrulan ve entry’leri sırala. ${scoringText} ${selfText}`;
}

function renderArchiveCard() {
  if (!edition) return;
  const label = editionLabel();
  if (currentArchiveCard) currentArchiveCard.href = `editions/${edition.edition_number}/`;
  if (archiveCurrentNumber) archiveCurrentNumber.textContent = edition.edition_number;
  if (archiveCurrentTitle) archiveCurrentTitle.textContent = label;
  if (archiveCurrentMeta) archiveCurrentMeta.textContent = `${entries.length} katılımcı · ${edition.voting_open ? 'Oylama açık' : 'Oylama kapalı'}`;
}

function setupEntryPlayer() {
  if (!entryGrid) return;

  const modal = document.createElement('div');
  modal.className = 'entry-player-modal';
  modal.hidden = true;
  modal.innerHTML = `
    <div class="entry-player-backdrop" data-close-player></div>
    <section class="entry-player-shell" role="dialog" aria-modal="true" aria-labelledby="entry-player-title">
      <div class="entry-player-topbar">
        <div><span class="entry-player-kicker" id="entry-player-kicker">ISC · ENTRY</span><h2 id="entry-player-title"></h2><p id="entry-player-song"></p></div>
        <button class="entry-player-close" type="button" data-close-player aria-label="Videoyu kapat">×</button>
      </div>
      <div class="entry-player-frame-wrap"><iframe id="entry-player-frame" title="ISC entry video" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>
      <div class="entry-player-footer"><span id="entry-player-country"></span><span>ESC ile kapat</span></div>
    </section>`;
  document.body.appendChild(modal);

  const frame = modal.querySelector('#entry-player-frame');
  const title = modal.querySelector('#entry-player-title');
  const song = modal.querySelector('#entry-player-song');
  const country = modal.querySelector('#entry-player-country');
  const kicker = modal.querySelector('#entry-player-kicker');
  let lastFocused = null;

  function openPlayer(button) {
    lastFocused = button;
    const entry = entries.find(item => item.order === button.dataset.order);
    if (!entry?.video) return;
    nowPlayingEntry = entry;
    renderLiveTicker();
    title.textContent = entry.artist;
    song.textContent = `“${entry.song}”`;
    country.textContent = entry.country;
    kicker.textContent = `${editionLabel()} · ENTRY ${entry.order}`;
    frame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(entry.video)}?autoplay=1&rel=0&modestbranding=1`;
    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add('is-open'));
    document.body.classList.add('player-open');
    modal.querySelector('.entry-player-close').focus();
  }

  function closePlayer() {
    if (modal.hidden) return;
    modal.classList.remove('is-open');
    document.body.classList.remove('player-open');
    frame.src = '';
    nowPlayingEntry = null;
    renderLiveTicker();
    setTimeout(() => {
      modal.hidden = true;
      if (lastFocused) lastFocused.focus();
    }, 220);
  }

  entryGrid.addEventListener('click', event => {
    const button = event.target.closest('.entry-listen');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    openPlayer(button);
  });

  modal.addEventListener('click', event => {
    if (event.target.closest('[data-close-player]')) closePlayer();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !modal.hidden) closePlayer();
  });
}

function setupHero() {
  if (!entries.length || !heroImage) return;
  let featureIndex = Math.min(Math.floor(entries.length / 2), entries.length - 1);
  setFeatured(entries[featureIndex], true);

  if (!prefersReducedMotion && entries.length > 1) {
    clearInterval(featureTimer);
    featureTimer = setInterval(() => {
      featureIndex = (featureIndex + 1) % entries.length;
      setFeatured(entries[featureIndex]);
    }, 5200);
  }
}

function setFeatured(entry, immediate = false) {
  if (!entry) return;
  currentFeaturedEntry = entry;
  if (!nowPlayingEntry) renderLiveTicker();

  const apply = () => {
    if (entry.image) {
      heroImage.hidden = false;
      heroImage.src = entry.image;
      heroImage.style.objectPosition = entry.focus;
    } else {
      heroImage.hidden = true;
    }
    heroOrder.textContent = entry.order;
    heroArtist.textContent = entry.artist;
    heroCountry.textContent = entry.country;
    heroSong.textContent = entry.song;
    heroImage.classList.remove('is-changing');
  };

  if (immediate || prefersReducedMotion) {
    apply();
  } else {
    heroImage.classList.add('is-changing');
    setTimeout(apply, 260);
  }
}

function updateResultsStateChrome() {
  if (!liveStatus) return;
  const revealed = Boolean(liveStatus.results_revealed);
  if (homeResultsLink) {
    homeResultsLink.textContent = revealed ? 'Results' : 'Results 🔒';
    homeResultsLink.classList.toggle('results-live-link', revealed);
  }
  if (heroResultsNote) {
    heroResultsNote.textContent = revealed ? 'RESULTS LIVE — OPEN SCOREBOARD' : 'RESULTS HIDDEN UNTIL REVEAL';
  }
  updateLivePill();
  if (archiveCurrentMeta) archiveCurrentMeta.textContent = `${entries.length} katılımcı · ${liveStatus.voting_open ? 'Oylama açık' : 'Oylama kapalı'}`;
}

function relativeActivityTime(iso) {
  if (!iso) return 'Henüz tamamlanmış oy gelmedi';
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 45) return 'Az önce bir oy gönderildi';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Son oy ${minutes} dk önce geldi`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Son oy ${hours} sa önce geldi`;
  return `Son oy ${Math.floor(hours / 24)} gün önce geldi`;
}

function buildTickerGroup() {
  const spotlight = nowPlayingEntry || currentFeaturedEntry || entries[0];
  if (!spotlight || !liveStatus) return '';

  const points = pointsList();
  const submitted = Number(liveStatus.submitted_delegations || 0);
  const delegations = Number(liveStatus.delegations || entries.length);
  const votingLabel = liveStatus.voting_open ? 'VOTING OPEN' : 'VOTING CLOSED';
  const votingClass = liveStatus.voting_open ? 'lime' : 'pink';
  const resultsLabel = liveStatus.results_revealed ? 'RESULTS LIVE' : 'RESULTS LOCKED';
  const resultsText = liveStatus.results_revealed ? 'Scoreboard artık yayında' : 'Toplam puanlar reveal anına kadar gizli';
  const resultsItem = liveStatus.results_revealed
    ? `<a class="ticker-item ticker-status lime ticker-editorial" href="results.html"><span class="ticker-status-badge">${resultsLabel}</span><span class="ticker-status-text">${resultsText} →</span></a>`
    : `<div class="ticker-item ticker-status pink"><span class="ticker-status-badge">${resultsLabel}</span><span class="ticker-status-text">${resultsText}</span></div>`;

  return `
    <div class="ticker-item ticker-spotlight"><span class="ticker-status-badge">${nowPlayingEntry ? 'NOW PLAYING' : 'NOW FEATURED'}</span><span class="ticker-no">${spotlight.order}</span><span class="ticker-country">${escapeAttr(spotlight.country)}</span><span class="ticker-artist">${escapeAttr(spotlight.artist)}</span><span class="ticker-song">“${escapeAttr(spotlight.song)}”</span></div>
    <div class="ticker-item ticker-status ${votingClass}"><span class="ticker-status-badge">${votingLabel}</span><span class="ticker-count">${submitted}/${delegations}</span><span class="ticker-status-text">delegasyon oyunu gönderdi</span></div>
    <div class="ticker-item ticker-status"><span class="ticker-status-badge">BALLOT WATCH</span><span class="ticker-status-text">${relativeActivityTime(liveStatus.last_submitted_at)}</span></div>
    <a class="ticker-item ticker-editorial" href="#listen"><span class="ticker-status-badge">PLAYLIST</span><span class="ticker-status-text">${entries.length} entry · dinle / izle →</span></a>
    ${resultsItem}
    <div class="ticker-item ticker-status lime"><span class="ticker-status-badge">TOP SCORE</span><span class="ticker-status-text">${points[0] ?? '—'} points · scheme ${points.join('–')}</span></div>
    <a class="ticker-item ticker-editorial" href="archive.html"><span class="ticker-status-badge">ARCHIVE</span><span class="ticker-status-text">Geçmiş edisyonları aç →</span></a>`;
}

function renderLiveTicker() {
  const groups = document.querySelectorAll('.ticker-group');
  if (!groups.length || !liveStatus) return;
  const html = buildTickerGroup();
  groups.forEach((group, index) => {
    group.innerHTML = html;
    if (index > 0) group.setAttribute('aria-hidden', 'true');
  });
}

async function refreshLiveStatus() {
  try {
    const data = await rpcFetch(LIVE_STATUS_URL);
    if (!data?.ok) return;
    liveStatus = { ...liveStatus, ...data };
    renderLiveTicker();
    updateResultsStateChrome();
  } catch (_) {
    // Keep the last known public state if the network is temporarily unavailable.
  }
}

initHomepage();
