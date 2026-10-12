(() => {
  'use strict';

  const SUPABASE_URL = 'https://knwvnbfqnccjiezprrme.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_Zw8H9mMmUop7wkYNKtZB3Q_7dM1QHut';
  const EDITION = 155;

  const escapeHtml = value => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const countryHref = slug => 'countries/' + encodeURIComponent(slug) + '/';
  const internalHref = value => {
    if (!value) return '';
    if (/^https?:/i.test(value)) return value;
    return String(value).replace(/^\/+/, '');
  };

  async function loadLineup() {
    const host = document.getElementById('home-lineup');
    if (!host) return;

    try {
      const response = await fetch(SUPABASE_URL + '/rest/v1/rpc/isc_public_edition_hub', {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: 'Bearer ' + SUPABASE_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ p_edition_number: EDITION }),
        cache: 'no-store'
      });

      if (!response.ok) throw new Error('edition hub ' + response.status);
      const data = await response.json();
      const entries = data?.entries || [];

      if (!data?.ok || !entries.length) {
        host.innerHTML = '<p class="home-lineup-loading">Line-up şu anda görüntülenemiyor.</p>';
        return;
      }

      host.innerHTML = entries.map(entry => {
        const order = String(entry.running_order).padStart(2, '0');
        const videoUrl = entry.video_url || ('https://www.youtube.com/watch?v=' + entry.video_id);
        return `
          <article class="home-lineup-row">
            <span class="home-lineup-order">${order}</span>
            <a class="home-lineup-country" href="${countryHref(entry.country_slug)}">${escapeHtml(entry.country)}</a>
            <div class="home-lineup-entry">
              <strong>${entry.detail_url ? `<a href="${escapeHtml(internalHref(entry.detail_url))}">${escapeHtml(entry.artist)}</a>` : escapeHtml(entry.artist)}</strong>
              <span>${escapeHtml(entry.song)}</span>
            </div>
            <a class="home-lineup-play" href="${escapeHtml(videoUrl)}" target="_blank" rel="noopener" aria-label="${escapeHtml(entry.artist)} — ${escapeHtml(entry.song)} videosunu aç">▶</a>
          </article>
        `;
      }).join('');
    } catch (err) {
      console.error(err);
      host.innerHTML = '<p class="home-lineup-loading">Line-up yüklenemedi.</p>';
    }
  }

  loadLineup();
})();