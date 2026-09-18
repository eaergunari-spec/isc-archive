(() => {
  const slug = document.body.dataset.country;
  if (!slug) return;

  const API = 'https://knwvnbfqnccjiezprrme.supabase.co/rest/v1/rpc/isc_public_country_profile';
  const KEY = 'sb_publishable_Zw8H9mMmUop7wkYNKtZB3Q_7dM1QHut';
  const ROOT = '../../';

  const countryName = document.getElementById('country-name');
  const countryDeck = document.getElementById('country-deck');
  const countryMeta = document.getElementById('country-meta');
  const latestCard = document.getElementById('country-latest-card');
  const appearanceList = document.getElementById('country-appearance-list');
  const receivedList = document.getElementById('country-received-list');
  const givenList = document.getElementById('country-given-list');
  const twelveLedger = document.getElementById('country-twelve-ledger');
  const dataNote = document.getElementById('country-data-note');
  const profileMain = document.getElementById('country-profile-main');

  const statAppearances = document.getElementById('stat-appearances');
  const statDebut = document.getElementById('stat-debut');
  const statWins = document.getElementById('stat-wins');
  const statPodiums = document.getElementById('stat-podiums');
  const statBest = document.getElementById('stat-best');
  const statPoints = document.getElementById('stat-points');
  const statTwelves = document.getElementById('stat-twelves');

  const escapeHtml = value => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const rootPath = value => value ? `${ROOT}${String(value).replace(/^\/+/, '')}` : '';
  const profilePath = countrySlug => `../${encodeURIComponent(countrySlug)}/`;
  const editionPath = appearance => `${ROOT}editions/${encodeURIComponent(appearance.edition_number)}/`;

  const formatNumber = value => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(Number(value || 0));
  const formatPlace = value => Number(value) > 0 ? `#${Number(value)}` : '—';

  function setMetadata(country, stats) {
    const title = `${country.name} — ISC Country Profile`;
    const description = `${country.name}: ${stats.participations || 0} ISC katılımı, debut ISC ${stats.debut_edition || '—'}, sonuçlar ve voting history.`;
    const canonical = `https://eaergunari-spec.github.io/isc-archive/countries/${encodeURIComponent(country.slug)}/`;

    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', description);
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', canonical);
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', title);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', description);
    document.querySelector('meta[property="og:url"]')?.setAttribute('content', canonical);
    document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', title);
    document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', description);
  }

  function renderHero(country, stats, appearances) {
    if (countryName) countryName.textContent = country.name;
    if (countryDeck) {
      const best = stats.best_place ? `En iyi derece ${formatPlace(stats.best_place)}.` : 'Henüz açıklanmış final derecesi yok.';
      countryDeck.textContent = `${stats.participations || 0} ISC katılımı. Debut: ISC ${stats.debut_edition || '—'}. ${best}`;
    }
    if (countryMeta) {
      countryMeta.innerHTML = [
        `Debut · ISC ${stats.debut_edition || '—'}`,
        `Latest · ISC ${stats.latest_edition || '—'}`,
        `${stats.revealed_results || 0} revealed result${Number(stats.revealed_results || 0) === 1 ? '' : 's'}`
      ].map(item => `<span>${escapeHtml(item)}</span>`).join('');
    }

    renderLatest(appearances[0], country);
  }

  function renderLatest(appearance, country) {
    if (!latestCard) return;
    if (!appearance) {
      latestCard.innerHTML = '<div class="country-latest-copy"><small>Latest appearance</small><h2>Henüz kayıt yok.</h2></div>';
      return;
    }

    const image = rootPath(appearance.image_url);
    const media = image
      ? `<div class="country-latest-media"><img src="${escapeHtml(image)}" alt="${escapeHtml(appearance.artist)}" decoding="async"><div></div></div>`
      : `<div class="country-latest-placeholder" aria-hidden="true">ISC</div>`;
    const current = appearance.edition_status === 'current';
    const status = current
      ? (appearance.voting_open ? 'Current edition · voting open' : 'Current edition')
      : `Archived · ${appearance.place ? `${formatPlace(appearance.place)} · ${formatNumber(appearance.points)} pts` : 'final record'}`;
    const detail = appearance.detail_url
      ? `<a href="${escapeHtml(rootPath(appearance.detail_url))}">Entry file →</a>`
      : appearance.video_id
        ? `<a href="https://www.youtube.com/watch?v=${encodeURIComponent(appearance.video_id)}" target="_blank" rel="noopener">Official video ↗</a>`
        : '';

    latestCard.innerHTML = `
      ${media}
      <div class="country-latest-copy">
        <span class="latest-status">${escapeHtml(status)}</span>
        <small>ISC ${escapeHtml(appearance.edition_number)} · running order ${String(appearance.running_order).padStart(2, '0')}</small>
        <h2>${escapeHtml(appearance.artist)}</h2>
        <p>“${escapeHtml(appearance.song)}” · ${escapeHtml(country.name)}</p>
        <div class="country-latest-actions">
          <a href="${escapeHtml(editionPath(appearance))}">Edition ${current ? 'live page' : 'archive'} →</a>
          ${detail}
        </div>
      </div>`;
  }

  function renderStats(stats) {
    if (statAppearances) statAppearances.textContent = stats.participations ?? 0;
    if (statDebut) statDebut.textContent = stats.debut_edition ? `ISC ${stats.debut_edition}` : '—';
    if (statWins) statWins.textContent = stats.wins ?? 0;
    if (statPodiums) statPodiums.textContent = stats.podiums ?? 0;
    if (statBest) statBest.textContent = formatPlace(stats.best_place);
    if (statPoints) statPoints.textContent = formatNumber(stats.total_points);
    if (statTwelves) statTwelves.textContent = `${stats.twelves_received || 0} / ${stats.twelves_given || 0}`;
  }

  function renderAppearances(appearances) {
    if (!appearanceList) return;
    if (!appearances.length) {
      appearanceList.innerHTML = '<div class="country-directory-empty">Katılım kaydı bulunamadı.</div>';
      return;
    }

    appearanceList.innerHTML = appearances.map(appearance => {
      const hasResult = appearance.results_revealed && appearance.place != null;
      const result = hasResult
        ? `<div class="country-appearance-result"><strong>${formatPlace(appearance.place)}</strong><span>${formatNumber(appearance.points)} points</span></div>`
        : `<div class="country-appearance-result is-locked"><strong>${appearance.results_revealed ? 'Result unavailable' : 'Result locked'}</strong><span>${appearance.edition_status === 'current' ? 'Current edition' : 'Archive'}</span></div>`;
      const detail = appearance.detail_url
        ? `<a href="${escapeHtml(rootPath(appearance.detail_url))}">Entry file</a>`
        : appearance.video_id
          ? `<a href="https://www.youtube.com/watch?v=${encodeURIComponent(appearance.video_id)}" target="_blank" rel="noopener">Video ↗</a>`
          : '';

      return `
        <article class="country-appearance">
          <a class="country-appearance-edition" href="${escapeHtml(editionPath(appearance))}">${escapeHtml(appearance.edition_number)}</a>
          <div class="country-appearance-order">RO ${String(appearance.running_order).padStart(2, '0')}</div>
          <div class="country-appearance-act"><strong>${escapeHtml(appearance.artist)}</strong><span>“${escapeHtml(appearance.song)}”</span></div>
          ${result}
          <div class="country-appearance-links"><a href="${escapeHtml(editionPath(appearance))}">Edition</a>${detail}</div>
        </article>`;
    }).join('');
  }

  function renderRelationshipList(target, rows, emptyCopy) {
    if (!target) return;
    if (!rows?.length) {
      target.innerHTML = `<div class="country-vote-empty">${escapeHtml(emptyCopy)}</div>`;
      return;
    }
    const max = Math.max(1, ...rows.map(row => Number(row.points || 0)));
    target.innerHTML = rows.map(row => {
      const width = Math.max(4, (Number(row.points || 0) / max) * 100);
      const twelveCopy = Number(row.twelves || 0) > 0 ? `<span>${row.twelves} × 12</span>` : '';
      return `
        <div class="country-vote-row" style="--bar:${width.toFixed(1)}%">
          <a href="${escapeHtml(profilePath(row.slug))}">${escapeHtml(row.country)}</a>
          <div class="country-vote-score"><strong>${escapeHtml(row.points)}</strong><span>pts</span>${twelveCopy}</div>
        </div>`;
    }).join('');
  }

  function renderTwelveLedger(rows) {
    if (!twelveLedger) return;
    if (!rows?.length) {
      twelveLedger.innerHTML = '<div class="country-vote-empty">Açıklanmış voting matrix kayıtlarında 12 puan alışverişi bulunmuyor.</div>';
      return;
    }

    twelveLedger.innerHTML = rows.map(row => {
      const direction = row.direction === 'given' ? '12 GIVEN TO' : '12 RECEIVED FROM';
      return `
        <article class="country-twelve-row">
          <div class="edition">${escapeHtml(row.edition_number)}</div>
          <div class="direction">${direction}</div>
          <a href="${escapeHtml(profilePath(row.counterpart_slug))}">
            <strong>${escapeHtml(row.counterpart)}</strong>
            <small>${escapeHtml(row.artist)} · “${escapeHtml(row.song)}”</small>
          </a>
        </article>`;
    }).join('');
  }

  function renderDataNote(stats) {
    if (!dataNote) return;
    const hiddenCount = Math.max(0, Number(stats.participations || 0) - Number(stats.revealed_results || 0));
    dataNote.innerHTML = `<strong>Veri notu.</strong> Country Profile istatistikleri yalnızca kamuya açıklanmış sonuçları puan toplamlarına dahil eder. ${hiddenCount ? `${hiddenCount} katılımın sonucu henüz açıklanmadığı için sıralama ve puanı bu sayfada gösterilmez. ` : ''}“Received from / Given to” tabloları açıklanmış delegasyon voting matrix kayıtlarından hesaplanır; resmî final tablosu ile tarihsel ballot matrisi ayrı veri katmanları olarak korunur.`;
  }

  function showError(message) {
    if (!profileMain) return;
    profileMain.innerHTML = `<section class="country-shell country-profile-error"><span class="country-kicker">Country profile</span><h1>Profil yüklenemedi.</h1><p>${escapeHtml(message)}</p><a class="button button-ghost" href="../">Tüm ülkelere dön</a></section>`;
  }

  async function load() {
    try {
      const response = await fetch(API, {
        method: 'POST',
        headers: {
          apikey: KEY,
          Authorization: `Bearer ${KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ p_country_slug: slug })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!data?.ok || !data.country) throw new Error('Country not found');

      const country = data.country;
      const stats = data.stats || {};
      const appearances = data.appearances || [];
      const voting = data.voting || {};

      setMetadata(country, stats);
      renderHero(country, stats, appearances);
      renderStats(stats);
      renderAppearances(appearances);
      renderRelationshipList(receivedList, voting.received_from || [], 'Henüz açıklanmış voting matrix verisi yok.');
      renderRelationshipList(givenList, voting.given_to || [], 'Henüz açıklanmış voting matrix verisi yok.');
      renderTwelveLedger(voting.twelve_ledger || []);
      renderDataNote(stats);
    } catch (error) {
      console.error('Country profile load failed', error);
      showError('Veri bağlantısı geçici olarak kullanılamıyor veya bu delegasyon bulunamadı.');
    }
  }

  load();
})();
