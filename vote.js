const SUPABASE_URL = 'https://knwvnbfqnccjiezprrme.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Zw8H9mMmUop7wkYNKtZB3Q_7dM1QHut';
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

const POINTS = [12,10,8,6,4,2,1];
let countries = [];
let entries = [];
let activeCountry = null;
let activeCode = '';
let scores = {};
let selectedPoint = null;
let saveTimer = null;

const countrySelect = document.getElementById('country-select');
const codeWrap = document.getElementById('code-wrap');
const voterCode = document.getElementById('voter-code');
const enterVoting = document.getElementById('enter-voting');
const loginMessage = document.getElementById('login-message');
const ballotStep = document.getElementById('ballot-step');
const ballotCountry = document.getElementById('ballot-country');
const ballotList = document.getElementById('ballot-list');
const saveStatus = document.getElementById('save-status');
const ballotMessage = document.getElementById('ballot-message');
const submitBallot = document.getElementById('submit-ballot');
const pointsBank = document.getElementById('points-bank');
const progressCount = document.getElementById('progress-count');
const progressFill = document.getElementById('progress-fill');
const confirmDialog = document.getElementById('confirm-dialog');
const confirmSummary = document.getElementById('confirm-summary');
const cancelSubmit = document.getElementById('cancel-submit');
const confirmSubmit = document.getElementById('confirm-submit');

async function init() {
  const [{ data: countryData, error: countryError }, { data: entryData, error: entryError }] = await Promise.all([
    db.from('countries').select('id,name,slug').order('id'),
    db.from('entries').select('id,country_id,running_order,artist_name,song_title').order('running_order')
  ]);

  if (countryError || entryError) {
    loginMessage.textContent = 'Oylama verileri yüklenemedi. Lütfen sayfayı yenile.';
    return;
  }

  countries = countryData;
  entries = entryData;

  countries.forEach(c => {
    const option = document.createElement('option');
    option.value = c.slug;
    option.textContent = c.name;
    countrySelect.appendChild(option);
  });

  renderPointsBank();
}

countrySelect.addEventListener('change', () => {
  codeWrap.hidden = !countrySelect.value;
  loginMessage.textContent = '';
  ballotStep.hidden = true;
});

enterVoting.addEventListener('click', async () => {
  const slug = countrySelect.value;
  const code = voterCode.value.trim();
  if (!slug || !code) return;

  loginMessage.textContent = 'Kod doğrulanıyor...';
  enterVoting.disabled = true;

  const { data, error } = await db.rpc('isc154_load_ballot', {
    p_country_slug: slug,
    p_code: code
  });

  enterVoting.disabled = false;

  if (error) {
    loginMessage.textContent = 'Voter code geçersiz.';
    return;
  }

  activeCountry = countries.find(c => c.slug === slug);
  activeCode = code;
  scores = {};
  selectedPoint = null;
  (data.scores || []).forEach(s => scores[String(s.entry_id)] = Number(s.points));

  ballotCountry.textContent = activeCountry.name;
  renderPointsBank();
  renderBallot();
  updateProgress();
  updateSubmitState();
  ballotStep.hidden = false;
  loginMessage.textContent = data.status === 'submitted'
    ? 'Daha önce gönderilmiş pusulan yüklendi.'
    : 'Doğrulandı. Pusulan hazır.';

  ballotStep.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

function renderPointsBank() {
  if (!pointsBank) return;
  const used = Object.values(scores);
  pointsBank.innerHTML = '';

  POINTS.forEach(point => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'point-chip';
    btn.textContent = point;
    btn.dataset.point = point;

    if (used.includes(point)) btn.classList.add('used');
    if (selectedPoint === point) btn.classList.add('selected');

    btn.addEventListener('click', () => {
      selectedPoint = selectedPoint === point ? null : point;
      renderPointsBank();
      highlightSelectableRows();
    });

    pointsBank.appendChild(btn);
  });
}

function renderBallot() {
  ballotList.innerHTML = '';
  const ownEntry = entries.find(e => e.country_id === activeCountry.id);

  entries.forEach(entry => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'ballot-row';
    row.dataset.entryId = entry.id;

    const isOwn = ownEntry && entry.id === ownEntry.id;
    const assigned = scores[String(entry.id)] || null;

    if (isOwn) row.classList.add('self-row');
    if (assigned) row.classList.add('assigned');

    row.innerHTML = `
      <div class="ballot-order">${String(entry.running_order).padStart(2,'0')}</div>
      <div class="ballot-entry">
        <strong>${escapeHtml(entry.artist_name)}</strong>
        <span>${escapeHtml(entry.song_title)}</span>
        ${isOwn ? '<div class="self-label">KENDİ ENTRY’N · OY VERİLEMEZ</div>' : ''}
      </div>
      <div class="score-badge">${assigned || '—'}</div>
    `;

    if (!isOwn) {
      row.addEventListener('click', () => assignPoint(entry.id));
    }

    ballotList.appendChild(row);
  });

  highlightSelectableRows();
}

function assignPoint(entryId) {
  const key = String(entryId);
  const current = scores[key] || null;

  if (!selectedPoint) {
    if (current) {
      delete scores[key];
      scheduleAutosave();
      renderPointsBank();
      renderBallot();
      updateProgress();
      updateSubmitState();
    }
    return;
  }

  for (const [otherEntryId, point] of Object.entries(scores)) {
    if (point === selectedPoint && otherEntryId !== key) {
      delete scores[otherEntryId];
    }
  }

  scores[key] = selectedPoint;
  selectedPoint = null;

  renderPointsBank();
  renderBallot();
  updateProgress();
  updateSubmitState();
  scheduleAutosave();
}

function highlightSelectableRows() {
  ballotList.querySelectorAll('.ballot-row:not(.self-row)').forEach(row => {
    row.style.outline = selectedPoint ? '1px solid rgba(216,255,62,.22)' : 'none';
  });
}

function updateProgress() {
  const count = Object.keys(scores).length;
  progressCount.textContent = count;
  progressFill.style.width = `${(count / 7) * 100}%`;
}

function updateSubmitState() {
  const vals = Object.values(scores);
  const valid = vals.length === 7 && new Set(vals).size === 7 && POINTS.every(p => vals.includes(p));
  submitBallot.disabled = !valid;
  ballotMessage.textContent = valid
    ? 'Pusulan tamamlandı. Son kontrol için gönderebilirsin.'
    : `${7 - vals.length} puan daha dağıtmalısın.`;
}

function scheduleAutosave() {
  saveStatus.textContent = 'Kaydediliyor...';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveBallot(false), 450);
}

async function saveBallot(finalize) {
  const payload = Object.entries(scores).map(([entry_id, points]) => ({
    entry_id: Number(entry_id),
    points
  }));

  const { error } = await db.rpc('isc154_save_ballot', {
    p_country_slug: activeCountry.slug,
    p_code: activeCode,
    p_scores: payload,
    p_finalize: finalize
  });

  if (error) {
    saveStatus.textContent = 'Kayıt hatası';
    ballotMessage.textContent = error.message.includes('Voting is closed')
      ? 'Oylama kapanmış.'
      : 'Oylar kaydedilemedi. Lütfen tekrar dene.';
    return false;
  }

  saveStatus.textContent = finalize ? 'Oylar gönderildi' : 'Otomatik kaydedildi';
  if (finalize) ballotMessage.textContent = 'Pusulan başarıyla gönderildi.';
  return true;
}

submitBallot.addEventListener('click', () => {
  buildConfirmSummary();
  confirmDialog.showModal();
});

cancelSubmit.addEventListener('click', () => confirmDialog.close());

confirmSubmit.addEventListener('click', async () => {
  confirmSubmit.disabled = true;
  confirmSubmit.textContent = 'Gönderiliyor...';
  const ok = await saveBallot(true);
  confirmSubmit.disabled = false;
  confirmSubmit.textContent = 'Oyları gönder →';

  if (ok) {
    confirmDialog.close();
    submitBallot.textContent = 'OYUN GÖNDERİLDİ ✓';
    setTimeout(() => {
      submitBallot.textContent = 'OYUMU GÖNDER →';
      updateSubmitState();
    }, 2600);
  }
});

function buildConfirmSummary() {
  const sorted = Object.entries(scores)
    .map(([entryId, points]) => ({
      entry: entries.find(e => e.id === Number(entryId)),
      points
    }))
    .sort((a,b) => b.points - a.points);

  confirmSummary.innerHTML = sorted.map(({entry, points}) => `
    <div class="confirm-row">
      <span>${escapeHtml(entry.artist_name)} · ${escapeHtml(entry.song_title)}</span>
      <strong>${points}</strong>
    </div>
  `).join('');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>'"]/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  }[c]));
}

init();