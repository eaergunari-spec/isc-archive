const SUPABASE_URL = 'https://knwvnbfqnccjiezprrme.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Zw8H9mMmUop7wkYNKtZB3Q_7dM1QHut';
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

const lockedState = document.getElementById('locked-state');
const revealedState = document.getElementById('revealed-state');
const livePill = document.getElementById('results-live-pill');
const heroDeck = document.getElementById('results-hero-deck');
const heroSymbol = document.getElementById('results-hero-symbol');
const heroEdition = document.getElementById('results-hero-edition');
const resultsKicker = document.getElementById('results-kicker');
const currentEditionNav = document.getElementById('current-edition-nav');
const lockedVoting = document.getElementById('locked-voting');
const lockedSubmitted = document.getElementById('locked-submitted');
const lockedDelegations = document.getElementById('locked-delegations');
const sealedEditionLabel = document.getElementById('sealed-edition-label');

const winnerImage = document.getElementById('winner-image');
const winnerCountry = document.getElementById('winner-country');
const winnerArtist = document.getElementById('winner-artist');
const winnerSong = document.getElementById('winner-song');
const winnerPoints = document.getElementById('winner-points');
const winnerTopCount = document.getElementById('winner-top-count');
const winnerTopLabel = document.getElementById('winner-top-label');
const winnerEyebrow = document.getElementById('winner-eyebrow');
const podiumGrid = document.getElementById('podium-grid');
const scoreboard = document.getElementById('scoreboard');
const scoreboardHeading = document.getElementById('scoreboard-heading');
const delegationTabs = document.getElementById('delegation-tabs');
const ballotFocus = document.getElementById('ballot-focus');
const twelvesGrid = document.getElementById('twelves-grid');
const votingMatrix = document.getElementById('voting-matrix');
const topExchangeEyebrow = document.getElementById('top-exchange-eyebrow');
const topExchangeHeading = document.getElementById('top-exchange-heading');
const topExchangeCopy = document.getElementById('top-exchange-copy');
const resultsFooterEdition = document.getElementById('results-footer-edition');

let lastPayload = null;
let selectedBallotIndex = 0;

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const countryProfileHref = slug => slug ? `countries/${encodeURIComponent(slug)}/` : 'countries/';

async function loadResults() {
  const { data, error } = await db.rpc('isc_public_current_results_hub');
  if (error || !data?.ok) {
    livePill.innerHTML = '<i></i> RESULTS · ERİŞİLEMİYOR';
    heroDeck.textContent = 'Güncel edisyonun sonuç verileri şu anda yüklenemiyor.';
    return;
  }
  lastPayload = data;
  renderPage(data);
}

function applyRuntimeChrome(data) {
  const label = data.title || `ISC ${data.edition_number}`;
  document.title = `${label} — Results`;
  document.querySelector('meta[name="description"]')?.setAttribute('content', `${label} resmi sonuçları, final scoreboard ve delegasyon oy dökümleri.`);
  document.querySelector('meta[property="og:title"]')?.setAttribute('content', `${label} — Results`);
  document.querySelector('meta[property="og:description"]')?.setAttribute('content', `${label} resmi sonuçları, scoreboard ve delegasyon oy dökümleri.`);

  if (currentEditionNav) {
    currentEditionNav.textContent = label;
    currentEditionNav.href = `editions/${data.edition_number}/`;
  }
  resultsKicker.textContent = `International Song Contest · ${label}`;
  heroEdition.textContent = label;
  if (sealedEditionLabel) sealedEditionLabel.textContent = `${label} · Grand Final Sonuçları`;
  resultsFooterEdition.textContent = `International Song Contest · ${label}`;
  winnerEyebrow.textContent = `${label} Kazananı`;
  scoreboardHeading.textContent = `${data.delegations} şarkı. Tek final sıralaması.`;

  const topPoints = Number(data.top_points || 0);
  winnerTopLabel.textContent = topPoints ? `${topPoints} PUANLAR` : 'EN YÜKSEK PUANLAR';
  topExchangeEyebrow.textContent = topPoints ? `${topPoints} puanlar` : 'En yüksek puanlar';
  topExchangeHeading.textContent = topPoints ? `${topPoints} puanlar kime gitti?` : 'En yüksek puanlar kime gitti?';
  topExchangeCopy.textContent = topPoints
    ? `Her delegasyonun ${topPoints} puan verdiği entry.`
    : 'Her delegasyonun gecenin en yüksek puanını verdiği entry.';
}

function renderPage(data) {
  applyRuntimeChrome(data);

  const submitted = Number(data.submitted_delegations || 0);
  const delegations = Number(data.delegations || 0);
  lockedSubmitted.textContent = `${submitted} / ${delegations}`;
  lockedVoting.textContent = data.voting_open ? 'AÇIK' : 'KAPALI';
  if (lockedDelegations) lockedDelegations.textContent = String(delegations);

  if (!data.revealed) {
    lockedState.hidden = false;
    revealedState.hidden = true;
    livePill.classList.remove('live');
    livePill.innerHTML = data.voting_open
      ? '<i></i> VOTING OPEN · RESULTS SEALED'
      : '<i></i> VOTING CLOSED · RESULTS SEALED';
    heroSymbol.textContent = '✦';
    heroDeck.textContent = data.voting_open
      ? `Oylama hâlâ açık. ${submitted}/${delegations} resmi oy teslim edildi; scoreboard reveal anına kadar mühürlü kalacak.`
      : 'Oylama kapandı. Sonuçlar hâlâ mühürlü.';
    return;
  }

  lockedState.hidden = true;
  revealedState.hidden = false;
  livePill.classList.add('live');
  livePill.innerHTML = '<i></i> RESULTS LIVE';
  heroSymbol.textContent = String(data.top_points || '★');
  heroDeck.textContent = 'Final scoreboard yayında. Toplam puanları, her delegasyonun tam pusulasını ve en yüksek puan akışını keşfet.';

  const rows = data.scoreboard || [];
  const ballots = data.ballots || [];
  renderWinner(rows, data.top_points);
  renderPodium(rows);
  renderScoreboard(rows);
  renderBallotExplorer(ballots);
  renderTopScores(ballots, data.top_points);
  renderMatrix(rows, ballots);
}

function renderWinner(rows, topPoints) {
  const winner = rows[0];
  if (!winner) return;

  if (winner.image_url) {
    winnerImage.src = winner.image_url;
    winnerImage.hidden = false;
  } else {
    winnerImage.removeAttribute('src');
    winnerImage.hidden = true;
  }
  winnerImage.alt = `${winner.artist} — ${winner.song}`;
  winnerCountry.innerHTML = `<a href="${countryProfileHref(winner.country_slug)}">${escapeHtml(winner.country)}</a>`;
  winnerArtist.textContent = winner.artist;
  winnerSong.textContent = `“${winner.song}”`;
  winnerPoints.textContent = winner.total_points;
  winnerTopCount.textContent = winner.top_points_count || 0;
  winnerTopLabel.textContent = `${topPoints || 'TOP'} POINT SCORES`;
}

function renderPodium(rows) {
  const top = rows.slice(0, 3);
  podiumGrid.innerHTML = top.map((row, index) => `
    <article class="podium-card">
      <span class="podium-position">${String(index + 1).padStart(2, '0')}</span>
      <a class="podium-country" href="${countryProfileHref(row.country_slug)}">${escapeHtml(row.country)}</a>
      <h3>${escapeHtml(row.artist)}</h3>
      <p>${escapeHtml(row.song)}</p>
      <div class="podium-points">${row.total_points}<small>puan</small></div>
    </article>
  `).join('');
}

function renderScoreboard(rows) {
  const maxPoints = Math.max(1, ...rows.map(row => Number(row.total_points || 0)));
  scoreboard.innerHTML = rows.map((row, index) => `
    <article class="score-row">
      <div class="score-rank">${String(index + 1).padStart(2, '0')}</div>
      <div class="score-country"><a href="${countryProfileHref(row.country_slug)}">${escapeHtml(row.country)}</a></div>
      <div class="score-act"><strong>${escapeHtml(row.artist)}</strong><span>${escapeHtml(row.song)}</span></div>
      <div class="score-bar" aria-hidden="true"><i style="width:${Math.max(3, (Number(row.total_points || 0) / maxPoints) * 100)}%"></i></div>
      <div class="score-points">${row.total_points}<small>puan</small></div>
    </article>
  `).join('');
}

function renderBallotExplorer(ballots) {
  if (!ballots.length) {
    delegationTabs.innerHTML = '';
    ballotFocus.innerHTML = '<div class="ballot-focus-head"><div><span>OY BULUNAMADI</span><h3>Gönderilmiş resmi oy bulunamadı.</h3></div></div>';
    return;
  }

  selectedBallotIndex = Math.min(selectedBallotIndex, ballots.length - 1);
  delegationTabs.innerHTML = ballots.map((ballot, index) => `
    <button type="button" data-ballot-index="${index}" class="${index === selectedBallotIndex ? 'active' : ''}">${escapeHtml(ballot.voter_country)}</button>
  `).join('');

  delegationTabs.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', () => {
      selectedBallotIndex = Number(button.dataset.ballotIndex);
      renderBallotExplorer(ballots);
    });
  });

  const ballot = ballots[selectedBallotIndex];
  const submittedAt = ballot.submitted_at
    ? new Date(ballot.submitted_at).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })
    : '';

  ballotFocus.innerHTML = `
    <div class="ballot-focus-head">
      <div><span>TAM OY DÖKÜMÜ</span><h3><a href="${countryProfileHref(ballot.voter_slug)}">${escapeHtml(ballot.voter_country)}</a></h3></div>
      <small>${escapeHtml(submittedAt)}</small>
    </div>
    <div class="ballot-votes">
      ${(ballot.votes || []).map(vote => `
        <div class="ballot-vote">
          <div class="points">${vote.points}</div>
          <strong>${escapeHtml(vote.artist)}</strong>
          <span><a href="${countryProfileHref(vote.country_slug)}">${escapeHtml(vote.country)}</a> · ${escapeHtml(vote.song)}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function renderTopScores(ballots, topPoints) {
  const target = Number(topPoints || 0);
  twelvesGrid.innerHTML = ballots.map(ballot => {
    const topVote = (ballot.votes || []).find(vote => Number(vote.points) === target);
    return `
      <article class="twelve-card">
        <div>
          <span><a href="${countryProfileHref(ballot.voter_slug)}">${escapeHtml(ballot.voter_country)}</a> · ${target || 'en yüksek puan'} puan verdi</span>
          <strong>${topVote ? escapeHtml(topVote.artist) : '—'}</strong>
          <div class="recipient">${topVote ? `<a href="${countryProfileHref(topVote.country_slug)}">${escapeHtml(topVote.country)}</a>` : ''}</div>
        </div>
        <div class="arrow">→</div>
      </article>
    `;
  }).join('');
}

function renderMatrix(rows, ballots) {
  const headCells = rows
    .map(row => `<th>#${String(row.running_order).padStart(2, '0')}<br><a href="${countryProfileHref(row.country_slug)}">${escapeHtml(row.country)}</a></th>`)
    .join('');

  const bodyRows = ballots.map(ballot => {
    const pointsByEntry = new Map((ballot.votes || []).map(vote => [Number(vote.entry_id), Number(vote.points)]));
    const cells = rows.map(row => {
      const points = pointsByEntry.get(Number(row.entry_id));
      const isTop = points !== undefined && points === Number(lastPayload?.top_points || 0);
      return `<td class="${isTop ? 'score-12' : ''}">${points ?? '—'}</td>`;
    }).join('');
    return `<tr><td><a href="${countryProfileHref(ballot.voter_slug)}">${escapeHtml(ballot.voter_country)}</a></td>${cells}</tr>`;
  }).join('');

  const totals = rows.map(row => `<td>${row.total_points}</td>`).join('');
  votingMatrix.innerHTML = `
    <thead><tr><th>Delegasyon</th>${headCells}</tr></thead>
    <tbody>${bodyRows}</tbody>
    <tfoot><tr><td>TOPLAM</td>${totals}</tr></tfoot>
  `;
}

loadResults();
setInterval(() => {
  if (!lastPayload || !lastPayload.revealed) loadResults();
}, 20000);
