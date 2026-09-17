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

async function loadResults() {
  const { data, error } = await db.rpc('isc_public_current_results_hub');
  if (error || !data?.ok) {
    livePill.innerHTML = '<i></i> RESULTS UNAVAILABLE';
    heroDeck.textContent = 'Güncel edisyonun sonuç verileri şu anda yüklenemiyor.';
    return;
  }
  lastPayload = data;
  renderPage(data);
}

function applyRuntimeChrome(data) {
  const label = data.title || `ISC ${data.edition_number}`;
  document.title = `${label} — Results`;
  document.querySelector('meta[name="description"]')?.setAttribute('content', `${label} official results, scoreboard and delegation ballots.`);
  document.querySelector('meta[property="og:title"]')?.setAttribute('content', `${label} — Results`);
  document.querySelector('meta[property="og:description"]')?.setAttribute('content', `${label} resmi scoreboard, delegasyon pusulaları ve voting history.`);

  if (currentEditionNav) currentEditionNav.textContent = label;
  resultsKicker.textContent = `International Song Contest · ${label}`;
  heroEdition.textContent = label;
  resultsFooterEdition.textContent = `International Song Contest · ${label}`;
  winnerEyebrow.textContent = `${label} Winner`;
  scoreboardHeading.textContent = `${data.delegations} songs. One table.`;

  const topPoints = Number(data.top_points || 0);
  winnerTopLabel.textContent = topPoints ? `${topPoints} POINT SCORES` : 'TOP SCORES';
  topExchangeEyebrow.textContent = topPoints ? `${topPoints} points exchange` : 'Top score exchange';
  topExchangeHeading.textContent = topPoints ? `Who got the ${topPoints}?` : 'Who got the top score?';
  topExchangeCopy.textContent = topPoints
    ? `Her delegasyonun ${topPoints} puan verdiği entry.`
    : 'Her delegasyonun gecenin en yüksek puanını verdiği entry.';
}

function renderPage(data) {
  applyRuntimeChrome(data);

  const submitted = Number(data.submitted_delegations || 0);
  const delegations = Number(data.delegations || 0);
  lockedSubmitted.textContent = `${submitted} / ${delegations}`;
  lockedVoting.textContent = data.voting_open ? 'OPEN' : 'CLOSED';

  if (!data.revealed) {
    lockedState.hidden = false;
    revealedState.hidden = true;
    livePill.classList.remove('live');
    livePill.innerHTML = '<i></i> RESULTS LOCKED';
    heroSymbol.textContent = '🔒';
    heroDeck.textContent = data.voting_open
      ? `Oylama açık. ${submitted}/${delegations} delegasyon oyunu gönderdi; scoreboard ve delegasyon pusulaları reveal anına kadar gizli.`
      : `Oylama kapalı. ${submitted}/${delegations} delegasyon oyunu gönderdi; sonuçlar henüz reveal edilmedi.`;
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
  winnerCountry.textContent = winner.country;
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
      <span class="podium-country">${escapeHtml(row.country)}</span>
      <h3>${escapeHtml(row.artist)}</h3>
      <p>${escapeHtml(row.song)}</p>
      <div class="podium-points">${row.total_points}<small>pts</small></div>
    </article>
  `).join('');
}

function renderScoreboard(rows) {
  const maxPoints = Math.max(1, ...rows.map(row => Number(row.total_points || 0)));
  scoreboard.innerHTML = rows.map((row, index) => `
    <article class="score-row">
      <div class="score-rank">${String(index + 1).padStart(2, '0')}</div>
      <div class="score-country">${escapeHtml(row.country)}</div>
      <div class="score-act"><strong>${escapeHtml(row.artist)}</strong><span>${escapeHtml(row.song)}</span></div>
      <div class="score-bar" aria-hidden="true"><i style="width:${Math.max(3, (Number(row.total_points || 0) / maxPoints) * 100)}%"></i></div>
      <div class="score-points">${row.total_points}<small>points</small></div>
    </article>
  `).join('');
}

function renderBallotExplorer(ballots) {
  if (!ballots.length) {
    delegationTabs.innerHTML = '';
    ballotFocus.innerHTML = '<div class="ballot-focus-head"><div><span>NO BALLOTS</span><h3>Gönderilmiş pusula bulunamadı.</h3></div></div>';
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
      <div><span>FULL BALLOT</span><h3>${escapeHtml(ballot.voter_country)}</h3></div>
      <small>${escapeHtml(submittedAt)}</small>
    </div>
    <div class="ballot-votes">
      ${(ballot.votes || []).map(vote => `
        <div class="ballot-vote">
          <div class="points">${vote.points}</div>
          <strong>${escapeHtml(vote.artist)}</strong>
          <span>${escapeHtml(vote.country)} · ${escapeHtml(vote.song)}</span>
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
          <span>${escapeHtml(ballot.voter_country)} gives ${target || 'top score'} to</span>
          <strong>${topVote ? escapeHtml(topVote.artist) : '—'}</strong>
          <div class="recipient">${topVote ? escapeHtml(topVote.country) : ''}</div>
        </div>
        <div class="arrow">→</div>
      </article>
    `;
  }).join('');
}

function renderMatrix(rows, ballots) {
  const headCells = rows
    .map(row => `<th>#${String(row.running_order).padStart(2, '0')}<br>${escapeHtml(row.country)}</th>`)
    .join('');

  const bodyRows = ballots.map(ballot => {
    const pointsByEntry = new Map((ballot.votes || []).map(vote => [Number(vote.entry_id), Number(vote.points)]));
    const cells = rows.map(row => {
      const points = pointsByEntry.get(Number(row.entry_id));
      const isTop = points !== undefined && points === Number(lastPayload?.top_points || 0);
      return `<td class="${isTop ? 'score-12' : ''}">${points ?? '—'}</td>`;
    }).join('');
    return `<tr><td>${escapeHtml(ballot.voter_country)}</td>${cells}</tr>`;
  }).join('');

  const totals = rows.map(row => `<td>${row.total_points}</td>`).join('');
  votingMatrix.innerHTML = `
    <thead><tr><th>Delegation</th>${headCells}</tr></thead>
    <tbody>${bodyRows}</tbody>
    <tfoot><tr><td>TOTAL</td>${totals}</tr></tfoot>
  `;
}

loadResults();
setInterval(() => {
  if (!lastPayload || !lastPayload.revealed) loadResults();
}, 20000);
