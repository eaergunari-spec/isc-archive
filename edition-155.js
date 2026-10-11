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

  const countryHref = slug => '../../countries/' + encodeURIComponent(slug) + '/';

  function youtubeThumb(videoId) {
    return 'https://i.ytimg.com/vi/' + encodeURIComponent(videoId) + '/hqdefault.jpg';
  }

  async function load() {
    const host = document.getElementById('isc155-lineup');
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

      if (!response.ok) throw new Error('ISC 155 hub request failed: ' + response.status);
      const data = await response.json();
      const entries = data?.entries || [];

      if (!data?.ok || !entries.length) {
        host.innerHTML = '<p class="lineup-loading">Line-up şu anda görüntülenemiyor.</p>';
        return;
      }

      host.innerHTML = entries.map(entry => {
        const order = String(entry.running_order).padStart(2, '0');
        const videoUrl = entry.video_url || ('https://www.youtube.com/watch?v=' + entry.video_id);
        const thumb = entry.video_id ? youtubeThumb(entry.video_id) : '';
        return `
          <article class="lineup-card">
            <a class="lineup-media" href="${escapeHtml(videoUrl)}" target="_blank" rel="noopener" aria-label="${escapeHtml(entry.artist)} — ${escapeHtml(entry.song)}">
              ${thumb ? `<img src="${escapeHtml(thumb)}" alt="" loading="lazy" decoding="async">` : ''}
              <span class="lineup-order">${order}</span>
              <span class="lineup-play" aria-hidden="true">▶</span>
            </a>
            <div class="lineup-copy">
              <a class="lineup-country" href="${countryHref(entry.country_slug)}">${escapeHtml(entry.country)}</a>
              <h3>${escapeHtml(entry.artist)}</h3>
              <p>${escapeHtml(entry.song)}</p>
              <a class="lineup-video" href="${escapeHtml(videoUrl)}" target="_blank" rel="noopener">OFFICIAL VIDEO ↗</a>
            </div>
          </article>
        `;
      }).join('');
    } catch (error) {
      console.error(error);
      host.innerHTML = '<p class="lineup-loading">Line-up yüklenemedi. Sayfayı yenileyerek tekrar deneyebilirsin.</p>';
    }
  }

  load();
})();