(() => {
  const grid = document.getElementById('archive-grid');
  if (!grid) return;

  const API = 'https://knwvnbfqnccjiezprrme.supabase.co/rest/v1/rpc/isc_public_editions';
  const KEY = 'sb_publishable_Zw8H9mMmUop7wkYNKtZB3Q_7dM1QHut';

  const currentNav = document.getElementById('archive-current-nav');
  const resultStatus = document.getElementById('archive-result-status');
  const activeFilters = document.getElementById('archive-active-filters');
  const noResults = document.getElementById('archive-no-results');
  const clearButton = document.getElementById('archive-clear-filters');
  const noResultsClear = document.getElementById('archive-no-results-clear');
  const sortSelect = document.getElementById('archive-sort');
  const cardsButton = document.getElementById('archive-view-cards');
  const listButton = document.getElementById('archive-view-list');

  const controls = {
    edition: document.getElementById('archive-filter-edition'),
    country: document.getElementById('archive-filter-country'),
    winner: document.getElementById('archive-filter-winner'),
    scheme: document.getElementById('archive-filter-scheme'),
    participants: document.getElementById('archive-filter-participants'),
    status: document.getElementById('archive-filter-status')
  };

  const summary = {
    editions: document.getElementById('archive-stat-editions'),
    archived: document.getElementById('archive-stat-archived'),
    countries: document.getElementById('archive-stat-countries'),
    entries: document.getElementById('archive-stat-entries')
  };

  let editions = [];
  let view = 'cards';

  const escapeHtml = value => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const formatNumber = value => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(Number(value || 0));
  const localeSort = (a, b) => String(a || '').localeCompare(String(b || ''), 'tr', { sensitivity: 'base' });

  function schemeLabel(edition) {
    const points = edition.voting_scheme?.points || [];
    return points.length ? points.join('–') : (edition.voting_scheme?.name || 'Not recorded');
  }

  function schemeKey(edition) {
    return edition.voting_scheme?.name || schemeLabel(edition);
  }

  function stateLabel(edition) {
    if (edition.status === 'current') {
      return edition.voting_open ? 'Current · voting open' : 'Current edition';
    }
    return edition.results_revealed ? 'Archived · final complete' : 'Archived edition';
  }

  function editionHref(edition) {
    return edition.status === 'current' ? 'index.html' : `editions/${encodeURIComponent(edition.edition_number)}/`;
  }

  function recordMarkup(edition) {
    const current = edition.status === 'current';
    const winner = edition.winner;
    const scheme = schemeLabel(edition);
    const totalPoints = Number(edition.voting_scheme?.total_points || 0);
    const selfVote = edition.voting_scheme?.self_vote_allowed === true;

    const resultCopy = winner
      ? `
        <div>
          <small>Winner</small>
          <strong>${escapeHtml(winner.country)}</strong>
          <p>${escapeHtml(winner.artist)} · “${escapeHtml(winner.song)}”</p>
        </div>
        <div class="archive-record-points"><b>${escapeHtml(formatNumber(winner.points))}</b><span>winning points</span></div>`
      : `
        <div>
          <small>${current ? 'Results' : 'Final record'}</small>
          <strong>${current && !edition.results_revealed ? 'Locked backstage' : 'Winner unavailable'}</strong>
          <p>${current && !edition.results_revealed ? 'Winner ve final sıralaması reveal sonrasında otomatik görünür.' : 'Bu edisyon için yayımlanmış winner kaydı bulunmuyor.'}</p>
        </div>
        <div class="archive-record-points"><b>${current && !edition.results_revealed ? '—' : '—'}</b><span>${current && !edition.results_revealed ? 'not revealed' : 'no record'}</span></div>`;

    const winnerLink = winner?.country_slug
      ? `<a class="country-link" href="countries/${encodeURIComponent(winner.country_slug)}/">${escapeHtml(winner.country)} profile →</a>`
      : `<a class="country-link" href="countries/">Country profiles →</a>`;

    return `
      <article class="archive-record ${current ? 'current' : 'archived'}" data-edition="${escapeHtml(edition.edition_number)}">
        <div class="archive-record-main">
          <div class="archive-record-top">
            <div class="archive-record-no">${escapeHtml(edition.edition_number)}</div>
            <span class="archive-record-state"><i></i>${escapeHtml(stateLabel(edition))}</span>
          </div>

          <div class="archive-record-info">
            <h3 class="archive-record-title">${escapeHtml(edition.title || `ISC ${edition.edition_number}`)}</h3>
            <div class="archive-record-meta">
              <span>${escapeHtml(edition.entry_count || 0)} participants</span>
              <span>${escapeHtml(scheme)}</span>
              <span>${escapeHtml(totalPoints)} pts / ballot</span>
              <span>${selfVote ? 'self-vote allowed' : 'no self-vote'}</span>
            </div>
          </div>

          <div class="archive-record-result">${resultCopy}</div>
        </div>

        <div class="archive-record-actions">
          <a class="primary" href="${escapeHtml(editionHref(edition))}">${current ? 'Live edition' : 'Open permanent record'} <span>→</span></a>
          ${winnerLink}
        </div>
      </article>`;
  }

  function populateSelect(select, rows, placeholder) {
    if (!select) return;
    select.innerHTML = `<option value="">${escapeHtml(placeholder)}</option>` + rows.map(row =>
      `<option value="${escapeHtml(row.value)}">${escapeHtml(row.label)}</option>`
    ).join('');
  }

  function buildFilterOptions() {
    const countryMap = new Map();
    const winnerMap = new Map();
    const schemes = new Set();
    const counts = new Set();

    editions.forEach(edition => {
      (edition.countries || []).forEach(country => countryMap.set(country.slug, country.name));
      if (edition.winner?.country_slug) winnerMap.set(edition.winner.country_slug, edition.winner.country);
      if (schemeKey(edition)) schemes.add(schemeKey(edition));
      counts.add(Number(edition.entry_count || 0));
    });

    populateSelect(
      controls.country,
      [...countryMap.entries()].sort((a, b) => localeSort(a[1], b[1])).map(([value, label]) => ({ value, label })),
      'All countries'
    );
    populateSelect(
      controls.winner,
      [...winnerMap.entries()].sort((a, b) => localeSort(a[1], b[1])).map(([value, label]) => ({ value, label })),
      'All winners'
    );
    populateSelect(
      controls.scheme,
      [...schemes].sort(localeSort).map(value => ({ value, label: value })),
      'All systems'
    );
    populateSelect(
      controls.participants,
      [...counts].sort((a, b) => b - a).map(value => ({ value: String(value), label: `${value} participants` })),
      'Any count'
    );
  }

  function renderSummary() {
    const countrySlugs = new Set();
    editions.forEach(edition => (edition.countries || []).forEach(country => countrySlugs.add(country.slug)));

    if (summary.editions) summary.editions.textContent = editions.length;
    if (summary.archived) summary.archived.textContent = editions.filter(edition => edition.status === 'archived').length;
    if (summary.countries) summary.countries.textContent = countrySlugs.size;
    if (summary.entries) summary.entries.textContent = editions.reduce((sum, edition) => sum + Number(edition.entry_count || 0), 0);
  }

  function readInitialState() {
    const params = new URLSearchParams(window.location.search);
    const requestedView = params.get('view');
    let storedView = '';
    try { storedView = localStorage.getItem('isc_archive_view') || ''; } catch (_) {}
    view = requestedView === 'list' || requestedView === 'cards'
      ? requestedView
      : (storedView === 'list' ? 'list' : 'cards');

    const requestedSort = params.get('sort');
    if (requestedSort && [...sortSelect.options].some(option => option.value === requestedSort)) sortSelect.value = requestedSort;

    const initial = {
      edition: params.get('edition') || '',
      country: params.get('country') || '',
      winner: params.get('winner') || '',
      scheme: params.get('scheme') || '',
      participants: params.get('participants') || '',
      status: params.get('status') || ''
    };

    Object.entries(initial).forEach(([key, value]) => {
      const control = controls[key];
      if (!control || !value) return;
      control.value = value;
      if (control.tagName === 'SELECT' && control.value !== value) control.value = '';
    });

    updateViewButtons();
  }

  function updateViewButtons() {
    grid.classList.toggle('view-cards', view === 'cards');
    grid.classList.toggle('view-list', view === 'list');
    cardsButton?.setAttribute('aria-pressed', String(view === 'cards'));
    listButton?.setAttribute('aria-pressed', String(view === 'list'));
  }

  function updateUrl() {
    const params = new URLSearchParams();
    const values = filterValues();
    Object.entries(values).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    if (sortSelect.value !== 'latest') params.set('sort', sortSelect.value);
    if (view !== 'cards') params.set('view', view);

    const query = params.toString();
    history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
  }

  function filterValues() {
    return Object.fromEntries(Object.entries(controls).map(([key, control]) => [key, control?.value?.trim() || '']));
  }

  function filteredEditions() {
    const filters = filterValues();
    const editionNeedle = filters.edition.toLocaleLowerCase('tr').replace(/^isc\s*/i, '').trim();

    const rows = editions.filter(edition => {
      if (editionNeedle) {
        const number = String(edition.edition_number);
        const title = String(edition.title || '').toLocaleLowerCase('tr');
        if (!number.includes(editionNeedle) && !title.includes(filters.edition.toLocaleLowerCase('tr'))) return false;
      }
      if (filters.country && !(edition.countries || []).some(country => country.slug === filters.country)) return false;
      if (filters.winner && edition.winner?.country_slug !== filters.winner) return false;
      if (filters.scheme && schemeKey(edition) !== filters.scheme) return false;
      if (filters.participants && Number(edition.entry_count || 0) !== Number(filters.participants)) return false;
      if (filters.status && edition.status !== filters.status) return false;
      return true;
    });

    const sort = sortSelect.value;
    rows.sort((a, b) => {
      if (sort === 'oldest') return Number(a.edition_number) - Number(b.edition_number);
      if (sort === 'winner') {
        const aWinner = a.winner?.country || '';
        const bWinner = b.winner?.country || '';
        if (aWinner && !bWinner) return -1;
        if (!aWinner && bWinner) return 1;
        return localeSort(aWinner, bWinner) || Number(b.edition_number) - Number(a.edition_number);
      }
      if (sort === 'participants-desc') return Number(b.entry_count || 0) - Number(a.entry_count || 0) || Number(b.edition_number) - Number(a.edition_number);
      if (sort === 'participants-asc') return Number(a.entry_count || 0) - Number(b.entry_count || 0) || Number(b.edition_number) - Number(a.edition_number);
      return Number(b.edition_number) - Number(a.edition_number);
    });

    return rows;
  }

  function optionLabel(control, value) {
    if (!control || !value) return value;
    if (control.tagName === 'SELECT') return control.options[control.selectedIndex]?.textContent || value;
    return value;
  }

  function renderFilterChips() {
    if (!activeFilters) return;
    const values = filterValues();
    const labels = {
      edition: 'Edition',
      country: 'Country',
      winner: 'Winner',
      scheme: 'System',
      participants: 'Participants',
      status: 'Status'
    };

    activeFilters.innerHTML = Object.entries(values)
      .filter(([, value]) => value)
      .map(([key, value]) => `<button class="archive-filter-chip" type="button" data-clear-filter="${escapeHtml(key)}"><span>${escapeHtml(labels[key])}: ${escapeHtml(optionLabel(controls[key], value))}</span><b aria-hidden="true">×</b></button>`)
      .join('');

    activeFilters.querySelectorAll('[data-clear-filter]').forEach(button => {
      button.addEventListener('click', () => {
        const key = button.dataset.clearFilter;
        if (controls[key]) controls[key].value = '';
        applyExplorer();
        controls[key]?.focus();
      });
    });
  }

  function sortLabel() {
    return sortSelect.options[sortSelect.selectedIndex]?.textContent || 'Latest first';
  }

  function renderRecords(rows) {
    grid.innerHTML = rows.map(recordMarkup).join('');
    noResults.hidden = rows.length > 0;
    grid.hidden = rows.length === 0;

    const total = editions.length;
    const activeCount = Object.values(filterValues()).filter(Boolean).length;
    resultStatus.textContent = `${rows.length} / ${total} editions · ${sortLabel()}${activeCount ? ` · ${activeCount} active filter${activeCount === 1 ? '' : 's'}` : ''}`;
    clearButton.hidden = activeCount === 0;
  }

  function applyExplorer() {
    const rows = filteredEditions();
    updateViewButtons();
    renderFilterChips();
    renderRecords(rows);
    updateUrl();
  }

  function clearFilters() {
    Object.values(controls).forEach(control => { if (control) control.value = ''; });
    applyExplorer();
  }

  function bindControls() {
    controls.edition?.addEventListener('input', applyExplorer);
    ['country', 'winner', 'scheme', 'participants', 'status'].forEach(key => controls[key]?.addEventListener('change', applyExplorer));
    sortSelect?.addEventListener('change', applyExplorer);

    cardsButton?.addEventListener('click', () => setView('cards'));
    listButton?.addEventListener('click', () => setView('list'));
    clearButton?.addEventListener('click', clearFilters);
    noResultsClear?.addEventListener('click', clearFilters);
  }

  function setView(nextView) {
    view = nextView === 'list' ? 'list' : 'cards';
    try { localStorage.setItem('isc_archive_view', view); } catch (_) {}
    applyExplorer();
  }

  function showError() {
    grid.hidden = false;
    noResults.hidden = true;
    grid.innerHTML = `
      <article class="archive-loading-record">
        <strong>Arşiv şu anda yüklenemedi.</strong>
        <p>Veri bağlantısı geçici olarak kullanılamıyor. Sayfayı yenileyerek tekrar deneyebilirsin.</p>
      </article>`;
    resultStatus.textContent = 'Archive unavailable';
  }

  async function loadEditions() {
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
      const payload = await response.json();
      if (!Array.isArray(payload) || !payload.length) throw new Error('No editions returned');

      editions = payload;
      const current = editions.find(edition => edition.status === 'current');
      if (currentNav && current) currentNav.textContent = current.title || `ISC ${current.edition_number}`;

      renderSummary();
      buildFilterOptions();
      readInitialState();
      bindControls();
      applyExplorer();
    } catch (error) {
      console.error('ISC archive explorer load failed', error);
      showError();
    }
  }

  loadEditions();
})();