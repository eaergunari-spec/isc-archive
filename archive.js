(() => {
  const grid = document.getElementById('archive-grid');
  if (!grid) return;

  const API = 'https://knwvnbfqnccjiezprrme.supabase.co/rest/v1/rpc/isc_public_editions';
  const KEY = 'sb_publishable_Zw8H9mMmUop7wkYNKtZB3Q_7dM1QHut';
  const currentNav = document.getElementById('archive-current-nav');

  const escapeHtml = value => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  function cardMarkup(edition) {
    const current = edition.status === 'current';
    const winner = edition.winner;
    const status = current
      ? (edition.voting_open ? 'Current edition · voting open' : 'Current edition')
      : 'Archived edition · final complete';
    const detail = current
      ? `${edition.entry_count || 0} ülke · ${edition.entry_count || 0} şarkı · ${edition.voting_open ? 'canlı oylama' : 'oylama kapalı'} · results hub`
      : winner
        ? `Kazanan: ${escapeHtml(winner.country)} · ${escapeHtml(winner.artist)} — “${escapeHtml(winner.song)}” · ${escapeHtml(winner.points)} puan`
        : `${edition.entry_count || 0} ülke · ${edition.entry_count || 0} şarkı · arşiv kaydı`;
    const href = current ? 'index.html' : `editions/${escapeHtml(edition.edition_number)}/`;

    return `
      <a class="edition-card ${current ? 'current' : 'archived'}" href="${href}">
        <div class="edition-card-no">${escapeHtml(edition.edition_number)}</div>
        <div class="edition-card-copy">
          <small>${escapeHtml(status)}</small>
          <strong>${escapeHtml(edition.title || `ISC ${edition.edition_number}`)}</strong>
          <p>${detail}</p>
          <span class="card-arrow">${current ? 'Canlı edisyonu aç' : 'Arşiv kaydını aç'} →</span>
        </div>
      </a>`;
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
      const editions = await response.json();
      if (!Array.isArray(editions) || !editions.length) throw new Error('No editions returned');

      const current = editions.find(edition => edition.status === 'current');
      if (currentNav && current) currentNav.textContent = current.title || `ISC ${current.edition_number}`;
      grid.innerHTML = editions.map(cardMarkup).join('');
    } catch (error) {
      console.error('ISC archive index load failed', error);
      grid.innerHTML = `
        <article class="edition-card archive-placeholder">
          <div class="edition-card-no">!</div>
          <div class="edition-card-copy">
            <small>Archive unavailable</small>
            <strong>Arşiv yüklenemedi</strong>
            <p>Veri bağlantısı geçici olarak kullanılamıyor. Sayfayı yenileyerek tekrar dene.</p>
          </div>
        </article>`;
    }
  }

  loadEditions();
})();