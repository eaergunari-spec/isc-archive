(() => {
  const grid = document.getElementById('archive-grid');
  if (!grid) return;

  const API = 'https://knwvnbfqnccjiezprrme.supabase.co/rest/v1/rpc/isc_public_editions';
  const KEY = 'sb_publishable_Zw8H9mMmUop7wkYNKtZB3Q_7dM1QHut';

  const escapeHtml = (value) => String(value ?? '')
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
      ? `${edition.entry_count || 0} ülke · ${edition.entry_count || 0} şarkı · canlı oylama · results hub`
      : winner
        ? `Kazanan: ${escapeHtml(winner.country)} · ${escapeHtml(winner.artist)} — “${escapeHtml(winner.song)}” · ${escapeHtml(winner.points)} puan`
        : `${edition.entry_count || 0} ülke · ${edition.entry_count || 0} şarkı · arşiv kaydı`;
    return `
      <a class="edition-card ${current ? 'current' : 'archived'}" href="editions/${escapeHtml(edition.edition_number)}/">
        <div class="edition-card-no">${escapeHtml(edition.edition_number)}</div>
        <div class="edition-card-copy">
          <small>${escapeHtml(status)}</small>
          <strong>${escapeHtml(edition.title)}</strong>
          <p>${detail}</p>
          <span class="card-arrow">Edition hub’ı aç →</span>
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
      if (!Array.isArray(editions) || !editions.length) return;
      grid.innerHTML = editions.map(cardMarkup).join('');
    } catch (error) {
      console.error('ISC archive index load failed', error);
      // The HTML contains a complete static fallback for ISC 154 and ISC 153.
    }
  }

  loadEditions();
})();