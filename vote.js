const SUPABASE_URL = 'https://knwvnbfqnccjiezprrme.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Zw8H9mMmUop7wkYNKtZB3Q_7dM1QHut';
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

let context = null;
let edition = null;
let scheme = null;
let POINTS = [];
let countries = [];
let entries = [];
let activeCountry = null;
let activeCode = '';
let ranking = [];
let scores = {};
let saveTimer = null;
let sortable = null;

const countrySelect = document.getElementById('country-select');
const codeWrap = document.getElementById('code-wrap');
const voterCode = document.getElementById('voter-code');
const enterVoting = document.getElementById('enter-voting');
const loginMessage = document.getElementById('login-message');
const ballotStep = document.getElementById('ballot-step');
const ballotCountry = document.getElementById('ballot-country');
const ballotList = document.getElementById('ballot-list');
const pointRail = document.getElementById('point-rail');
const rankingBoard = document.getElementById('ranking-board');
const selfEntryNote = document.getElementById('self-entry-note');
const saveStatus = document.getElementById('save-status');
const ballotMessage = document.getElementById('ballot-message');
const submitBallot = document.getElementById('submit-ballot');
const progressCount = document.getElementById('progress-count');
const progressTotal = document.getElementById('progress-total');
const progressFill = document.getElementById('progress-fill');
const submitRankCount = document.getElementById('submit-rank-count');
const slotExplainer = document.getElementById('slot-explainer');
const ballotHelpCopy = document.getElementById('ballot-help-copy');
const confirmDialog = document.getElementById('confirm-dialog');
const confirmSummary = document.getElementById('confirm-summary');
const cancelSubmit = document.getElementById('cancel-submit');
const confirmSubmit = document.getElementById('confirm-submit');
const voteLivePill = document.getElementById('vote-live-pill');
const voteIntro = document.getElementById('vote-intro');
const heroTopPoints = document.getElementById('hero-top-points');
const heroOtherPoints = document.getElementById('hero-other-points');
const currentEditionNav = document.getElementById('current-edition-nav');

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

async function init() {
  loginMessage.textContent = 'Güncel edisyon yükleniyor…';

  const { data, error } = await db.rpc('isc_public_current_context');
  if (error || !data?.ok) {
    countrySelect.innerHTML = '<option value="">Güncel edisyon bulunamadı</option>';
    loginMessage.textContent = 'Oylama yapılandırması yüklenemedi. Lütfen daha sonra tekrar dene.';
    return;
  }

  context = data;
  edition = data.edition;
  scheme = data.voting_scheme;
  POINTS = [...(scheme.points || [])]
    .sort((a, b) => Number(a.rank) - Number(b.rank))
    .map(row => Number(row.points));
  window.ISC_VOTING_POINTS = [...POINTS];

  entries = (data.entries || []).map(entry => ({
    ...entry,
    id: Number(entry.id),
    country_id: Number(entry.country_id),
    running_order: Number(entry.running_order)
  }));

  const seen = new Set();
  countries = entries
    .filter(entry => {
      if (seen.has(entry.country_slug)) return false;
      seen.add(entry.country_slug);
      return true;
    })
    .map(entry => ({
      id: entry.country_id,
      name: entry.country,
      slug: entry.country_slug,
      running_order: entry.running_order
    }));

  applyRuntimeChrome();
  populateCountries();
  validateConfiguration();
  loginMessage.textContent = edition.voting_open
    ? 'Delegasyonunu seç ve kalıcı voter code’un ile pusulanı aç.'
    : 'Oylama kapalı. Daha önceki pusulanı görüntülemek için giriş yapabilirsin.';
}

function applyRuntimeChrome() {
  const number = edition.edition_number;
  const label = edition.title || `ISC ${number}`;
  const pointLabel = POINTS.join('–');
  const eligiblePerCountry = entries.length - (scheme.self_vote_allowed ? 0 : 1);
  const unscored = Math.max(0, eligiblePerCountry - POINTS.length);

  document.title = `${label} — Voting Room`;
  document.querySelector('meta[name="description"]')?.setAttribute('content', `${label} official voting room.`);
  document.querySelector('meta[property="og:title"]')?.setAttribute('content', `${label} — Voting Room`);
  document.querySelector('meta[property="og:description"]')?.setAttribute('content', `Delegasyonunu doğrula ve ${label} resmi pusulanı gönder.`);

  if (currentEditionNav) currentEditionNav.textContent = label;

  voteLivePill.innerHTML = `<span></span> ${escapeHtml(label)} · ${edition.voting_open ? 'VOTING OPEN' : 'VOTING CLOSED'}`;
  voteLivePill.classList.toggle('closed', !edition.voting_open);

  heroTopPoints.textContent = POINTS[0] ?? '—';
  heroOtherPoints.textContent = POINTS.length > 1 ? POINTS.slice(1).join(' · ') : 'TOP SCORE';

  const selfRule = scheme.self_vote_allowed
    ? 'Kendi entry’n dahil tüm katılımcılar sıralamaya girebilir.'
    : 'Kendi ülken sıralamaya dahil edilmez.';
  const scoreRule = unscored > 0
    ? `En üstteki ${POINTS.length} entry ${pointLabel} puanlarını alır; kalan ${unscored} entry puan alamaz.`
    : `Her uygun entry bir puan slotuna yerleşir: ${pointLabel}.`;

  voteIntro.innerHTML = `${entries.length} entry. <strong>${pointLabel}</strong> puan sistemi. ${escapeHtml(selfRule)}`;
  slotExplainer.innerHTML = `<strong>Puanlar yerinde kalır, şarkılar hareket eder.</strong> ${escapeHtml(scoreRule)}`;
  ballotHelpCopy.innerHTML = `<strong>${POINTS[0] ?? 'En yüksek'} puan en üstte.</strong> Kartları sağdaki sürükleme tutamacından taşı.${unscored > 0 ? ' Puan çizgisinin altındaki entry’ler puan almaz.' : ''}`;
}

function populateCountries() {
  countrySelect.innerHTML = '<option value="">Ülkeni seç…</option>';
  countries
    .sort((a, b) => a.running_order - b.running_order)
    .forEach(country => {
      const option = document.createElement('option');
      option.value = country.slug;
      option.textContent = country.name;
      countrySelect.appendChild(option);
    });
  countrySelect.disabled = false;
}

function validateConfiguration() {
  const eligibleCount = entries.length - (scheme.self_vote_allowed ? 0 : 1);
  const valid = entries.length > 0 && POINTS.length > 0 && POINTS.length <= eligibleCount;
  if (!valid) {
    countrySelect.disabled = true;
    enterVoting.disabled = true;
    loginMessage.textContent = 'Bu edisyonun voting scheme’i katılımcı sayısıyla uyumlu değil. Control Room yapılandırmasını kontrol et.';
  }
  return valid;
}

countrySelect.addEventListener('change', () => {
  codeWrap.hidden = !countrySelect.value;
  loginMessage.textContent = '';
  ballotStep.hidden = true;
});

voterCode.addEventListener('keydown', event => {
  if (event.key === 'Enter') enterVoting.click();
});

enterVoting.addEventListener('click', async () => {
  const slug = countrySelect.value;
  const code = voterCode.value.trim();
  if (!slug || !code || !context) return;

  loginMessage.textContent = 'Kod doğrulanıyor…';
  enterVoting.disabled = true;

  const { data, error } = await db.rpc('isc_load_current_ballot', {
    p_country_slug: slug,
    p_code: code
  });

  enterVoting.disabled = false;

  if (error) {
    loginMessage.textContent = 'Voter code geçersiz veya bu delegasyon güncel edisyonda yer almıyor.';
    return;
  }

  activeCountry = countries.find(country => country.slug === slug);
  activeCode = code;
  edition.voting_open = Boolean(data.voting_open);

  const ownEntry = entries.find(entry => entry.country_id === activeCountry.id);
  const eligibleEntries = scheme.self_vote_allowed
    ? [...entries]
    : entries.filter(entry => !ownEntry || entry.id !== ownEntry.id);

  const savedScores = new Map((data.scores || []).map(score => [Number(score.entry_id), Number(score.points)]));
  const rankByPoints = new Map(POINTS.map((points, index) => [points, index]));

  const rankedSaved = eligibleEntries
    .filter(entry => savedScores.has(entry.id) && rankByPoints.has(savedScores.get(entry.id)))
    .sort((a, b) => rankByPoints.get(savedScores.get(a.id)) - rankByPoints.get(savedScores.get(b.id)));

  const unranked = eligibleEntries
    .filter(entry => !savedScores.has(entry.id))
    .sort((a, b) => a.running_order - b.running_order);

  ranking = [...rankedSaved, ...unranked];
  scores = deriveScores();

  ballotCountry.textContent = activeCountry.name;
  renderSelfEntry(ownEntry);
  renderBallot();
  updateProgress();
  updateSubmitState();
  ballotStep.hidden = false;

  loginMessage.textContent = data.status === 'submitted'
    ? 'Daha önce gönderilmiş pusulan yüklendi.'
    : (data.scores || []).length
      ? 'Kaydedilmiş pusulan yüklendi.'
      : edition.voting_open
        ? 'Doğrulandı. Kartları puan slotlarına göre sırala.'
        : 'Doğrulandı. Oylama kapalı olduğu için pusula salt okunur durumda.';

  ballotStep.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

function renderSelfEntry(ownEntry) {
  if (!ownEntry) {
    selfEntryNote.innerHTML = '';
    selfEntryNote.hidden = true;
    return;
  }

  selfEntryNote.hidden = false;
  selfEntryNote.innerHTML = `
    <div class="self-entry-order">${String(ownEntry.running_order).padStart(2, '0')}</div>
    <div>
      <strong>${escapeHtml(ownEntry.artist)}</strong>
      <small>${escapeHtml(ownEntry.song)}</small>
    </div>
    <div class="self-entry-lock">${scheme.self_vote_allowed ? 'SELF-VOTE ALLOWED' : 'KENDİ ENTRY’N · OY VERİLEMEZ'}</div>
  `;
}

function deriveScores() {
  const next = {};
  ranking.slice(0, POINTS.length).forEach((entry, index) => {
    next[String(entry.id)] = POINTS[index];
  });
  return next;
}

function renderPointRail() {
  rankingBoard.style.setProperty('--ranking-count', String(Math.max(1, ranking.length)));
  pointRail.innerHTML = ranking.map((entry, index) => {
    const points = POINTS[index];
    if (points === undefined) {
      return '<div class="point-slot point-slot-unscored"><strong>—</strong><span>NO POINTS</span></div>';
    }
    return `<div class="point-slot ${index === 0 ? 'point-slot-top' : ''}"><strong>${points}</strong><span>${points === 1 ? 'POINT' : 'POINTS'}</span></div>`;
  }).join('');
}

function renderBallot() {
  if (sortable) {
    sortable.destroy();
    sortable = null;
  }

  renderPointRail();

  ballotList.innerHTML = ranking.map((entry, index) => `
    <div class="ranking-card ${index >= POINTS.length ? 'is-unscored' : ''}" data-entry-id="${entry.id}">
      <div class="rank-entry-order">${String(entry.running_order).padStart(2, '0')}</div>
      <div class="rank-entry-copy">
        <span class="rank-country">${escapeHtml(entry.country)}</span>
        <strong>${escapeHtml(entry.artist)}</strong>
        <span class="rank-song">${escapeHtml(entry.song)}</span>
      </div>
      <div class="drag-grip" role="button" tabindex="0" aria-label="${escapeHtml(entry.artist)} kartını sırala">
        <div class="rank-move-buttons">
          <button type="button" class="move-up" aria-label="Yukarı taşı" ${index === 0 || !edition.voting_open ? 'disabled' : ''}>↑</button>
          <button type="button" class="move-down" aria-label="Aşağı taşı" ${index === ranking.length - 1 || !edition.voting_open ? 'disabled' : ''}>↓</button>
        </div>
        <span class="grip-mark" aria-hidden="true">⠿</span>
        <small>${edition.voting_open ? 'SÜRÜKLE' : 'KAPALI'}</small>
      </div>
    </div>
  `).join('');

  ballotList.querySelectorAll('.move-up').forEach((button, index) => {
    button.addEventListener('click', event => {
      event.stopPropagation();
      moveEntry(index, index - 1);
    });
  });

  ballotList.querySelectorAll('.move-down').forEach((button, index) => {
    button.addEventListener('click', event => {
      event.stopPropagation();
      moveEntry(index, index + 1);
    });
  });

  if (window.Sortable && edition.voting_open) {
    sortable = new Sortable(ballotList, {
      animation: 210,
      direction: 'vertical',
      ghostClass: 'is-ghost',
      chosenClass: 'is-dragging',
      dragClass: 'is-dragging',
      handle: '.drag-grip',
      delay: 140,
      delayOnTouchOnly: true,
      touchStartThreshold: 5,
      fallbackTolerance: 4,
      scroll: true,
      scrollSensitivity: 80,
      scrollSpeed: 14,
      onEnd: syncRankingFromDom
    });
  }
}

function moveEntry(fromIndex, toIndex) {
  if (!edition.voting_open || toIndex < 0 || toIndex >= ranking.length) return;
  const [moved] = ranking.splice(fromIndex, 1);
  ranking.splice(toIndex, 0, moved);
  afterRankingChange();
}

function syncRankingFromDom() {
  if (!edition.voting_open) return;
  const ids = [...ballotList.querySelectorAll('.ranking-card')].map(row => Number(row.dataset.entryId));
  ranking = ids.map(id => entries.find(entry => entry.id === id)).filter(Boolean);
  afterRankingChange();
}

function afterRankingChange() {
  scores = deriveScores();
  renderBallot();
  updateProgress();
  updateSubmitState();
  scheduleAutosave();
}

function updateProgress() {
  const scored = Math.min(POINTS.length, ranking.length);
  progressCount.textContent = scored;
  progressTotal.textContent = POINTS.length;
  submitRankCount.textContent = `${scored}/${POINTS.length}`;
  progressFill.style.width = POINTS.length ? `${Math.min(100, (scored / POINTS.length) * 100)}%` : '0%';
}

function ballotIsValid() {
  const vals = Object.values(scores).map(Number);
  return POINTS.length > 0
    && vals.length === POINTS.length
    && new Set(vals).size === POINTS.length
    && POINTS.every(points => vals.includes(points));
}

function updateSubmitState() {
  const valid = ballotIsValid();
  submitBallot.disabled = !valid || !edition.voting_open;

  if (!edition.voting_open) {
    ballotMessage.textContent = 'Oylama kapalı · pusula görüntülenebilir ancak değiştirilemez.';
    saveStatus.textContent = 'Voting closed';
    return;
  }

  ballotMessage.textContent = valid
    ? `${POINTS.length}/${POINTS.length} puan slotu dolu · değişiklikler otomatik kaydedilir.`
    : `Pusulada ${POINTS.length} farklı puan slotunun tamamı dolu olmalı.`;
}

function scheduleAutosave() {
  if (!edition.voting_open || !activeCountry || !activeCode) return;
  saveStatus.textContent = 'Kaydediliyor…';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveBallot(false), 450);
}

async function saveBallot(finalize) {
  if (!edition.voting_open) return false;

  const payload = ranking.slice(0, POINTS.length).map((entry, index) => ({
    entry_id: Number(entry.id),
    points: POINTS[index]
  }));

  const { error } = await db.rpc('isc_save_current_ballot', {
    p_country_slug: activeCountry.slug,
    p_code: activeCode,
    p_scores: payload,
    p_finalize: finalize
  });

  if (error) {
    saveStatus.textContent = 'Kayıt hatası';
    if (String(error.message || '').includes('Voting is closed')) {
      edition.voting_open = false;
      renderBallot();
      updateSubmitState();
      ballotMessage.textContent = 'Oylama kapanmış. Son değişiklik kaydedilmedi.';
    } else {
      ballotMessage.textContent = 'Oylar kaydedilemedi. Lütfen tekrar dene.';
    }
    return false;
  }

  saveStatus.textContent = finalize ? 'Oylar gönderildi' : 'Otomatik kaydedildi';
  if (finalize) ballotMessage.textContent = 'Pusulan başarıyla gönderildi.';
  return true;
}

submitBallot.addEventListener('click', () => {
  if (!ballotIsValid() || !edition.voting_open) return;
  buildConfirmSummary();
  confirmDialog.showModal();
});

cancelSubmit.addEventListener('click', () => confirmDialog.close());

confirmSubmit.addEventListener('click', async () => {
  confirmSubmit.disabled = true;
  confirmSubmit.textContent = 'Gönderiliyor…';
  const ok = await saveBallot(true);
  confirmSubmit.disabled = false;
  confirmSubmit.textContent = 'Oyları gönder →';

  if (ok) {
    confirmDialog.close();
    submitBallot.textContent = 'OYUN GÖNDERİLDİ ✓';
    setTimeout(() => {
      submitBallot.innerHTML = 'OYUMU GÖNDER <span>→</span>';
      updateSubmitState();
    }, 2600);
  }
});

function buildConfirmSummary() {
  confirmSummary.innerHTML = ranking.slice(0, POINTS.length).map((entry, index) => `
    <div class="confirm-row">
      <span><b>${POINTS[index]}</b> · ${escapeHtml(entry.artist)} · ${escapeHtml(entry.song)}</span>
      <strong>${POINTS[index]}</strong>
    </div>
  `).join('');
}

init();
