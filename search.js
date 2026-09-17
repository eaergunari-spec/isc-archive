(() => {
  const API = 'https://knwvnbfqnccjiezprrme.supabase.co/rest/v1/rpc/isc_public_search';
  const KEY = 'sb_publishable_Zw8H9mMmUop7wkYNKtZB3Q_7dM1QHut';

  const input = document.getElementById('global-search-input');
  const clearButton = document.getElementById('search-clear');
  const results = document.getElementById('search-results');
  const status = document.getElementById('search-status');
  const heading = document.getElementById('search-heading');
  const emptyState = document.getElementById('search-empty-state');
  const filters = document.getElementById('search-filters');
  const filterButtons = [...document.querySelectorAll('[data-filter]')];
  const exampleButtons = [...document.querySelectorAll('[data-search-example]')];

  const counts = {
    all: document.getElementById('filter-all-count'),
    artist: document.getElementById('filter-artist-count'),
    song: document.getElementById('filter-song-count'),
    country: document.getElementById('filter-country-count'),
    edition: document.getElementById('filter-edition-count')
  };

  let allResults = [];
  let activeFilter = 'all';
  let debounceTimer = null;
  let abortController = null;
  let currentQuery = '';

  const escapeHtml = value => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const typeLabel = row => ({
    artist: 'Artist',
    song: 'Song',
    country: 'Country',
    edition: 'Edition'
  }[row.match_kind] || 'Archive');

  const fallbackMark = row => ({
    artist: '♪',
    song: '♫',
    country: 'ISC',
    edition: String(row.edition_number || 'ISC')
  }[row.match_kind] || 'ISC');

  function updateUrl(query) {
    const url = new URL(window.location.href);
    if (query) url.searchParams.set('q', query);
    else url.searchParams.delete('q');
    history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }

  function updateCounts() {
    const summary = { all: allResults.length, artist: 0, song: 0, country: 0, edition: 0 };
    allResults.forEach(row => {
      if (summary[row.match_kind] !== undefined) summary[row.match_kind] += 1;
    });
    Object.entries(counts).forEach(([key, node]) => {
      if (node) node.textContent = summary[key] || 0;
    });
    filterButtons.forEach(button => {
      const key = button.dataset.filter;
      const count = summary[key] || 0;
      button.hidden = key !== 'all' && count === 0;
    });
  }

  function filteredRows() {
    return activeFilter === 'all'
      ? allResults
      : allResults.filter(row => row.match_kind === activeFilter);
  }

  function renderResults() {
    const rows = filteredRows();
    results.innerHTML = '';

    if (!currentQuery) {
      filters.hidden = true;
      emptyState.hidden = false;
      return;
    }

    emptyState.hidden = true;
    filters.hidden = allResults.length === 0;

    if (!rows.length) {
      results.innerHTML = `<div class="search-no-results"><strong>Bu filtrede sonuç yok.</strong> Başka bir kategori seçebilir ya da arama terimini değiştirebilirsin.</div>`;
      return;
    }

    results.innerHTML = rows.map((row, index) => {
      const media = row.image_url
        ? `<img src="${escapeHtml(row.image_url)}" alt="" loading="lazy" decoding="async">`
        : `<span>${escapeHtml(fallbackMark(row))}</span>`;
      const meta = row.match_kind === 'edition'
        ? `ISC ${escapeHtml(row.edition_number)}`
        : row.edition_number
          ? `ISC ${escapeHtml(row.edition_number)}${row.running_order ? ` · RO ${String(row.running_order).padStart(2, '0')}` : ''}`
          : 'ISC archive';

      return `
        <a class="search-result" role="listitem" href="${escapeHtml(row.url)}" data-result-index="${index}">
          <div class="search-result-media">${media}</div>
          <div class="search-result-copy">
            <div class="search-result-type"><b>${escapeHtml(typeLabel(row))}</b><span>${escapeHtml(meta)}</span></div>
            <h3>${escapeHtml(row.title)}</h3>
            <p>${escapeHtml(row.subtitle)}</p>
          </div>
          <div class="search-result-arrow" aria-hidden="true">→</div>
        </a>`;
    }).join('');
  }

  function setFilter(filter) {
    activeFilter = filter;
    filterButtons.forEach(button => button.classList.toggle('active', button.dataset.filter === filter));
    renderResults();
  }

  filterButtons.forEach(button => {
    button.addEventListener('click', () => setFilter(button.dataset.filter));
  });

  function showLoading(query) {
    emptyState.hidden = true;
    filters.hidden = true;
    results.innerHTML = `<div class="search-loading">“${escapeHtml(query)}” için arşiv taranıyor…</div>`;
    heading.textContent = 'Aranıyor…';
    status.textContent = 'Edisyonlar, ülkeler, sanatçılar ve şarkılar birlikte taranıyor.';
  }

  function showError() {
    filters.hidden = true;
    results.innerHTML = '<div class="search-error"><strong>Arama şu anda kullanılamıyor.</strong> Bağlantıyı kontrol edip tekrar deneyebilirsin.</div>';
    heading.textContent = 'Bir şey ters gitti.';
    status.textContent = 'Arama servisine ulaşılamadı.';
  }

  function showNoResults(query) {
    filters.hidden = true;
    emptyState.hidden = true;
    results.innerHTML = `<div class="search-no-results"><strong>“${escapeHtml(query)}” için eşleşme bulunamadı.</strong> Sanatçı, şarkı, ülke veya edisyon numarasını farklı biçimde deneyebilirsin.</div>`;
    heading.textContent = 'Sonuç bulunamadı.';
    status.textContent = 'Aksanları kaldırarak veya daha kısa bir terimle yeniden deneyebilirsin.';
  }

  async function runSearch(query) {
    const trimmed = query.trim();
    currentQuery = trimmed;
    clearButton.hidden = !trimmed;
    updateUrl(trimmed);

    if (!trimmed) {
      allResults = [];
      activeFilter = 'all';
      heading.textContent = 'Ne arıyorsun?';
      status.textContent = 'Edisyon, ülke, sanatçı veya şarkı adıyla başlayabilirsin.';
      filterButtons.forEach(button => button.classList.toggle('active', button.dataset.filter === 'all'));
      renderResults();
      return;
    }

    if (abortController) abortController.abort();
    abortController = new AbortController();
    showLoading(trimmed);

    try {
      const response = await fetch(API, {
        method: 'POST',
        signal: abortController.signal,
        headers: {
          apikey: KEY,
          Authorization: `Bearer ${KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ p_query: trimmed, p_limit: 50 })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      if (!payload?.ok) throw new Error(payload?.reason || 'Search failed');

      if (trimmed !== currentQuery) return;
      allResults = payload.results || [];
      activeFilter = 'all';
      filterButtons.forEach(button => button.classList.toggle('active', button.dataset.filter === 'all'));
      updateCounts();

      if (!allResults.length) {
        showNoResults(trimmed);
        return;
      }

      heading.textContent = `“${trimmed}”`;
      status.textContent = `${allResults.length} sonuç bulundu. En güçlü eşleşmeler önce gösteriliyor.`;
      renderResults();
      saveRecent(trimmed);
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error('ISC search failed', error);
      showError();
    }
  }

  function scheduleSearch() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => runSearch(input.value), 180);
  }

  input.addEventListener('input', scheduleSearch);
  input.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown') {
      const first = results.querySelector('.search-result');
      if (first) {
        event.preventDefault();
        first.focus();
      }
    } else if (event.key === 'Enter') {
      const first = results.querySelector('.search-result');
      if (first && input.value.trim()) {
        event.preventDefault();
        first.click();
      }
    } else if (event.key === 'Escape') {
      input.value = '';
      runSearch('');
    }
  });

  results.addEventListener('keydown', event => {
    const links = [...results.querySelectorAll('.search-result')];
    const current = links.indexOf(document.activeElement);
    if (current === -1) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      (links[current + 1] || links[0])?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (current === 0) input.focus();
      else links[current - 1]?.focus();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      input.focus();
    }
  });

  clearButton.addEventListener('click', () => {
    input.value = '';
    runSearch('');
    input.focus();
  });

  exampleButtons.forEach(button => {
    button.addEventListener('click', () => {
      input.value = button.dataset.searchExample || '';
      runSearch(input.value);
      input.focus();
    });
  });

  document.addEventListener('keydown', event => {
    const target = event.target;
    const typing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable;
    const shortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
    if (shortcut || (!typing && event.key === '/')) {
      event.preventDefault();
      input.focus();
      input.select();
    }
  });

  function saveRecent(query) {
    try {
      const key = 'isc_global_search_recent';
      const previous = JSON.parse(localStorage.getItem(key) || '[]');
      const next = [query, ...previous.filter(item => item.toLowerCase() !== query.toLowerCase())].slice(0, 6);
      localStorage.setItem(key, JSON.stringify(next));
    } catch (_) {
      // Search must keep working when storage is unavailable.
    }
  }

  const initialQuery = new URLSearchParams(window.location.search).get('q') || '';
  input.value = initialQuery;
  clearButton.hidden = !initialQuery;
  if (initialQuery) runSearch(initialQuery);
  else {
    renderResults();
    requestAnimationFrame(() => input.focus({ preventScroll: true }));
  }
})();