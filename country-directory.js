(() => {
  const API = 'https://knwvnbfqnccjiezprrme.supabase.co/rest/v1/rpc/isc_public_countries';
  const KEY = 'sb_publishable_Zw8H9mMmUop7wkYNKtZB3Q_7dM1QHut';
  const grid = document.getElementById('country-directory-grid');
  const searchInput = document.getElementById('country-search-input');
  const sortSelect = document.getElementById('country-sort-select');
  const summaryCountries = document.getElementById('summary-countries');
  const summaryAppearances = document.getElementById('summary-appearances');
  const summaryWins = document.getElementById('summary-wins');
  const status = document.getElementById('country-directory-status');

  if (!grid) return;

  let rows = [];

  const escapeHtml = value => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const fold = value => String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('tr-TR');

  const imagePath = value => value ? `../${String(value).replace(/^\/+/, '')}` : '';

  function formatBest(place) {
    const n = Number(place);
    return Number.isFinite(n) && n > 0 ? `#${n}` : '—';
  }

  function compareRows(a, b, mode) {
    const an = a.country?.name || '';
    const bn = b.country?.name || '';
    const as = a.stats || {};
    const bs = b.stats || {};

    if (mode === 'appearances') {
      return Number(bs.participations || 0) - Number(as.participations || 0) || an.localeCompare(bn, 'tr');
    }
    if (mode === 'wins') {
      return Number(bs.wins || 0) - Number(as.wins || 0)
        || Number(as.best_place || 999) - Number(bs.best_place || 999)
        || an.localeCompare(bn, 'tr');
    }
    if (mode === 'best') {
      return Number(as.best_place || 999) - Number(bs.best_place || 999)
        || Number(bs.wins || 0) - Number(as.wins || 0)
        || an.localeCompare(bn, 'tr');
    }
    return an.localeCompare(bn, 'tr');
  }

  function cardMarkup(row) {
    const country = row.country || {};
    const stats = row.stats || {};
    const latest = row.latest_appearance || {};
    const image = imagePath(latest.image_url);
    const imageMarkup = image
      ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(latest.artist || country.name)}" loading="lazy" decoding="async">`
      : `<div class="country-image-placeholder" aria-hidden="true">ISC</div>`;
    const latestCopy = latest.artist
      ? `<strong>${escapeHtml(latest.artist)}</strong> · “${escapeHtml(latest.song)}” · ISC ${escapeHtml(latest.edition_number)}`
      : 'Henüz kayıtlı katılım yok.';

    return `
      <a class="country-directory-card" href="${escapeHtml(country.slug)}/" data-country-name="${escapeHtml(country.name)}">
        <div class="country-directory-image">${imageMarkup}</div>
        <div class="country-directory-copy">
          <span class="country-card-label">Delegation profile</span>
          <h2>${escapeHtml(country.name)}</h2>
          <div class="country-directory-latest">${latestCopy}</div>
          <div class="country-card-stats">
            <div><b>${escapeHtml(stats.participations ?? 0)}</b><span>Appearances</span></div>
            <div><b>${escapeHtml(stats.wins ?? 0)}</b><span>Wins</span></div>
            <div><b>${formatBest(stats.best_place)}</b><span>Best result</span></div>
          </div>
        </div>
        <span class="country-directory-arrow" aria-hidden="true">↗</span>
      </a>`;
  }

  function render() {
    const query = fold(searchInput?.value || '');
    const mode = sortSelect?.value || 'name';
    const filtered = rows
      .filter(row => {
        if (!query) return true;
        const haystack = [
          row.country?.name,
          row.country?.slug,
          row.latest_appearance?.artist,
          row.latest_appearance?.song,
          row.latest_appearance?.edition_number
        ].map(fold).join(' ');
        return haystack.includes(query);
      })
      .sort((a, b) => compareRows(a, b, mode));

    if (!filtered.length) {
      grid.innerHTML = '<div class="country-directory-empty">Aramana uyan delegasyon bulunamadı.</div>';
    } else {
      grid.innerHTML = filtered.map(cardMarkup).join('');
    }

    if (status) status.textContent = `${filtered.length} / ${rows.length} delegasyon gösteriliyor`;
  }

  async function load() {
    if (status) status.textContent = 'Delegasyonlar yükleniyor…';
    try {
      const response = await fetch(API, {
        method: 'POST',
        headers: {
          apikey: KEY,
          Authorization: `Bearer ${KEY}`,
          'Content-Type': 'application/json'
        },
        body: '{}'
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('Invalid country directory payload');
      rows = data;

      const totalAppearances = rows.reduce((sum, row) => sum + Number(row.stats?.participations || 0), 0);
      const totalWins = rows.reduce((sum, row) => sum + Number(row.stats?.wins || 0), 0);
      if (summaryCountries) summaryCountries.textContent = String(rows.length);
      if (summaryAppearances) summaryAppearances.textContent = String(totalAppearances);
      if (summaryWins) summaryWins.textContent = String(totalWins);
      render();
    } catch (error) {
      console.error('Country directory load failed', error);
      grid.innerHTML = '<div class="country-directory-empty">Delegasyon dizini şu anda yüklenemiyor. Sayfayı yenileyerek tekrar deneyin.</div>';
      if (status) status.textContent = 'Veri bağlantısı kullanılamıyor';
    }
  }

  searchInput?.addEventListener('input', render);
  sortSelect?.addEventListener('change', render);
  load();
})();
