(() => {
  const editionNumber = Number(document.body.dataset.edition || 0);
  if (!editionNumber) return;

  const API = 'https://knwvnbfqnccjiezprrme.supabase.co/rest/v1/rpc/isc_public_edition_archive';
  const KEY = 'sb_publishable_Zw8H9mMmUop7wkYNKtZB3Q_7dM1QHut';

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const lineup = document.getElementById('history-lineup');
  const resultsBody = document.getElementById('history-results-body');
  const podium = document.getElementById('history-podium');
  const matrix = document.getElementById('voting-matrix');
  const ballotGrid = document.getElementById('ballot-grid');
  const meta = document.getElementById('edition-meta');
  const winnerBox = document.getElementById('history-winner');
  const schemeCopy = document.getElementById('voting-scheme-copy');
  const sourceNote = document.getElementById('archive-source-note');

  const player = document.getElementById('history-player');
  const playerFrame = document.getElementById('history-player-frame');
  const playerCountry = document.getElementById('history-player-country');
  const playerTitle = document.getElementById('history-player-title');
  const playerSong = document.getElementById('history-player-song');
  let lastFocused = null;

  function youtubeMedia(entry) {
    return (entry.media || []).find(item => item.provider === 'youtube') || null;
  }

  function openPlayer(entry, trigger) {
    const media = youtubeMedia(entry);
    if (!media || !player) return;
    lastFocused = trigger || null;
    playerCountry.textContent = `${String(entry.running_order).padStart(2, '0')} · ${entry.display_name}`;
    playerTitle.textContent = entry.artist;
    playerSong.textContent = `“${entry.song}”`;
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(media.external_id)}?autoplay=1&rel=0&modestbranding=1`;
    iframe.title = `${entry.artist} — ${entry.song}`;
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
    iframe.allowFullscreen = true;
    playerFrame.replaceChildren(iframe);
    player.hidden = false;
    requestAnimationFrame(() => player.classList.add('is-open'));
    document.body.classList.add('history-player-open');
    const close = player.querySelector('.history-player-close');
    if (close) close.focus();
  }

  function closePlayer() {
    if (!player || player.hidden) return;
    player.classList.remove('is-open');
    document.body.classList.remove('history-player-open');
    playerFrame.replaceChildren();
    setTimeout(() => {
      player.hidden = true;
      if (lastFocused) lastFocused.focus();
    }, 180);
  }

  if (player) {
    player.addEventListener('click', event => {
      if (event.target.closest('[data-history-close]')) closePlayer();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !player.hidden) closePlayer();
    });
  }

  function renderMeta(data) {
    const schemePoints = data.voting_scheme?.points || [];
    const perBallot = schemePoints.reduce((sum, item) => sum + Number(item.points || 0), 0);
    if (meta) {
      meta.innerHTML = `
        <span>${data.entries.length} countries</span>
        <span>${data.entries.length} songs</span>
        <span>${perBallot} points / ballot</span>
        <span>${escapeHtml(data.edition.status)}</span>`;
    }
    const winner = (data.results || []).find(row => Number(row.place) === 1);
    if (winnerBox && winner) {
      winnerBox.innerHTML = `
        <small>Winner · ${escapeHtml(winner.country)}</small>
        <strong>${escapeHtml(winner.artist)}</strong>
        <span>“${escapeHtml(winner.song)}” · ${escapeHtml(winner.points)} points</span>`;
    }
    if (schemeCopy && data.voting_scheme) {
      const points = schemePoints.map(item => item.points).join('–');
      schemeCopy.textContent = `ISC ${editionNumber} puanlama formatı: ${points}. Her delegasyon kendi entry’sine oy vermez; satırlar veren, sütunlar alan delegasyonu gösterir.`;
    }
  }

  function renderLineup(data) {
    if (!lineup) return;
    lineup.innerHTML = '';
    data.entries.forEach(entry => {
      const media = youtubeMedia(entry);
      const card = document.createElement('article');
      card.className = 'edition-entry history-entry';
      const thumb = media ? `https://i.ytimg.com/vi/${encodeURIComponent(media.external_id)}/hqdefault.jpg` : '';
      card.innerHTML = `
        <div class="history-entry-media">
          ${thumb ? `<img src="${thumb}" alt="${escapeHtml(entry.artist)}" loading="lazy" referrerpolicy="no-referrer">` : '<div class="history-entry-placeholder">ISC</div>'}
          ${media ? '<button class="history-play" type="button" aria-label="Videoyu aç">▶</button>' : ''}
        </div>
        <div class="edition-entry-copy">
          <span class="edition-entry-no">${String(entry.running_order).padStart(2, '0')}</span>
          <span class="edition-entry-country">${escapeHtml(entry.display_name)}</span>
          <strong>${escapeHtml(entry.artist)}</strong>
          <span class="song">${escapeHtml(entry.song)}</span>
        </div>`;
      const button = card.querySelector('.history-play');
      if (button) button.addEventListener('click', () => openPlayer(entry, button));
      lineup.appendChild(card);
    });
  }

  function renderResults(data) {
    if (resultsBody) {
      resultsBody.innerHTML = data.results.map(row => `
        <tr class="place-${Number(row.place)}">
          <td><span class="result-place">${Number(row.place) <= 3 ? ['🥇','🥈','🥉'][Number(row.place)-1] + ' ' : ''}${escapeHtml(row.place)}</span></td>
          <td><strong>${escapeHtml(row.country)}</strong><small>${escapeHtml(row.short_name)}</small></td>
          <td>${escapeHtml(row.artist)}</td>
          <td>${escapeHtml(row.song)}</td>
          <td class="result-points">${escapeHtml(row.points)}</td>
        </tr>`).join('');
    }
    if (podium) {
      podium.innerHTML = data.results.slice(0, 3).map(row => `
        <article class="podium-card place-${escapeHtml(row.place)}">
          <span>${['🥇','🥈','🥉'][Number(row.place)-1] || row.place}</span>
          <small>${escapeHtml(row.country)}</small>
          <strong>${escapeHtml(row.artist)}</strong>
          <em>“${escapeHtml(row.song)}”</em>
          <b>${escapeHtml(row.points)} pts</b>
        </article>`).join('');
    }
  }

  function renderMatrix(data) {
    if (!matrix) return;
    const entries = [...data.entries].sort((a,b) => a.running_order - b.running_order);
    const ballots = [...data.ballots].sort((a,b) => a.running_order - b.running_order);
    const header = entries.map(entry => `<th title="${escapeHtml(entry.display_name)}">${escapeHtml(entry.short_name)}</th>`).join('');
    const rows = ballots.map(ballot => {
      const scoreMap = new Map((ballot.scores || []).map(score => [Number(score.recipient_running_order), Number(score.points)]));
      const cells = entries.map(entry => {
        if (Number(entry.running_order) === Number(ballot.running_order)) return '<td class="self-vote">—</td>';
        const points = scoreMap.get(Number(entry.running_order));
        const cls = points === 12 ? ' class="twelve"' : '';
        return `<td${cls}>${points ?? ''}</td>`;
      }).join('');
      return `<tr><th>${escapeHtml(ballot.voter_short_name)}</th>${cells}</tr>`;
    }).join('');
    matrix.innerHTML = `<thead><tr><th>Veren \\ Alan</th>${header}</tr></thead><tbody>${rows}</tbody>`;
  }

  function renderBallots(data) {
    if (!ballotGrid) return;
    ballotGrid.innerHTML = data.ballots.map(ballot => {
      const scores = [...(ballot.scores || [])].sort((a,b) => Number(b.points) - Number(a.points));
      return `
        <article class="ballot-card">
          <div class="ballot-card-head"><span>Veren</span><strong>${escapeHtml(ballot.voter_country)}</strong></div>
          <div class="ballot-points">
            ${scores.map(score => `<div class="ballot-point ${Number(score.points) === 12 ? 'max' : ''}"><b>${escapeHtml(score.points)}</b><span>${escapeHtml(score.recipient_short_name)}</span></div>`).join('')}
          </div>
        </article>`;
    }).join('');
  }

  function renderSources(data) {
    if (!sourceNote) return;
    const sources = data.sources || [];
    sourceNote.innerHTML = `<strong>Archive provenance</strong><p>${sources.map(source => escapeHtml(source.label)).join(' · ')}</p><small>Resmî final tablosu ve oy matrisi ayrı tarihsel kaynaklar olarak saklanır; web sayfası bu iki veri katmanını değiştirmeden gösterir.</small>`;
  }

  function showError() {
    const message = 'ISC 153 arşiv verisi şu anda yüklenemedi. Sayfayı yenileyip tekrar deneyin.';
    if (lineup) lineup.innerHTML = `<div class="archive-loading archive-error">${message}</div>`;
    if (resultsBody) resultsBody.innerHTML = `<tr><td colspan="5">${message}</td></tr>`;
    if (matrix) matrix.innerHTML = `<tbody><tr><td>${message}</td></tr></tbody>`;
  }

  async function loadArchive() {
    try {
      const response = await fetch(API, {
        method: 'POST',
        headers: {
          apikey: KEY,
          Authorization: `Bearer ${KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ p_edition_number: editionNumber })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!data || !data.edition) throw new Error('Missing edition');
      renderMeta(data);
      renderLineup(data);
      renderResults(data);
      renderMatrix(data);
      renderBallots(data);
      renderSources(data);
    } catch (error) {
      console.error('ISC archive load failed', error);
      showError();
    }
  }

  loadArchive();
})();