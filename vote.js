const SUPABASE_URL = 'https://knwvnbfqnccjiezprrme.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Zw8H9mMmUop7wkYNKtZB3Q_7dM1QHut';
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

const POINTS = [12,10,8,6,4,2,1];
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
const selfEntryNote = document.getElementById('self-entry-note');
const saveStatus = document.getElementById('save-status');
const ballotMessage = document.getElementById('ballot-message');
const submitBallot = document.getElementById('submit-ballot');
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

  const ownEntry = entries.find(e => e.country_id === activeCountry.id);
  const rivals = entries.filter(e => !ownEntry || e.id !== ownEntry.id);
  const savedScores = new Map((data.scores || []).map(s => [Number(s.entry_id), Number(s.points)]));

  const rankedSaved = rivals
    .filter(e => savedScores.has(e.id))
    .sort((a,b) => savedScores.get(b.id) - savedScores.get(a.id));

  const unranked = rivals
    .filter(e => !savedScores.has(e.id))
    .sort((a,b) => a.running_order - b.running_order);

  ranking = [...rankedSaved, ...unranked];
  scores = deriveScores();

  ballotCountry.textContent = activeCountry.name;
  renderSelfEntry(ownEntry);
  renderBallot();
  updateProgress();
  updateSubmitState();
  ballotStep.hidden = false;

  loginMessage.textContent = data.status === 'submitted'
    ? 'Daha önce gönderilmiş sıralaman yüklendi.'
    : (data.scores || []).length
      ? 'Kaydedilmiş sıralaman yüklendi.'
      : 'Doğrulandı. Kartları sürükleyerek sıralamanı oluştur.';

  ballotStep.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

function renderSelfEntry(ownEntry) {
  if (!ownEntry) {
    selfEntryNote.innerHTML = '';
    return;
  }
  selfEntryNote.innerHTML = `
    <div class="self-entry-order">${String(ownEntry.running_order).padStart(2,'0')}</div>
    <div>
      <strong>${escapeHtml(ownEntry.artist_name)}</strong>
      <small>${escapeHtml(ownEntry.song_title)}</small>
    </div>
    <div class="self-entry-lock">KENDİ ENTRY’N · SIRALAMAYA DAHİL DEĞİL</div>
  `;
}

function deriveScores() {
  const next = {};
  ranking.forEach((entry, index) => {
    next[String(entry.id)] = POINTS[index];
  });
  return next;
}

function renderBallot() {
  if (sortable) {
    sortable.destroy();
    sortable = null;
  }

  ballotList.innerHTML = ranking.map((entry, index) => `
    <div class="ranking-row" data-entry-id="${entry.id}">
      <div class="rank-score">${POINTS[index]}</div>
      <div class="rank-entry-order">${String(entry.running_order).padStart(2,'0')}</div>
      <div class="rank-entry-copy">
        <strong>${escapeHtml(entry.artist_name)}</strong>
        <span>${escapeHtml(entry.song_title)}</span>
      </div>
      <div class="drag-grip" aria-label="Sürükle ve sırala">
        <div class="rank-move-buttons">
          <button type="button" class="move-up" aria-label="Yukarı taşı" ${index === 0 ? 'disabled' : ''}>↑</button>
          <button type="button" class="move-down" aria-label="Aşağı taşı" ${index === ranking.length - 1 ? 'disabled' : ''}>↓</button>
        </div>
        <span aria-hidden="true">⋮⋮</span>
      </div>
    </div>
  `).join('');

  ballotList.querySelectorAll('.move-up').forEach((button, index) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      moveEntry(index, index - 1);
    });
  });

  ballotList.querySelectorAll('.move-down').forEach((button, index) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      moveEntry(index, index + 1);
    });
  });

  if (window.Sortable) {
    sortable = new Sortable(ballotList, {
      animation: 190,
      direction: 'vertical',
      ghostClass: 'is-ghost',
      chosenClass: 'is-dragging',
      dragClass: 'is-dragging',
      handle: '.ranking-row',
      delay: 0,
      delayOnTouchOnly: true,
      touchStartThreshold: 4,
      onEnd: syncRankingFromDom
    });
  }
}

function moveEntry(fromIndex, toIndex) {
  if (toIndex < 0 || toIndex >= ranking.length) return;
  const [moved] = ranking.splice(fromIndex, 1);
  ranking.splice(toIndex, 0, moved);
  afterRankingChange();
}

function syncRankingFromDom() {
  const ids = [...ballotList.querySelectorAll('.ranking-row')].map(row => Number(row.dataset.entryId));
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
  progressCount.textContent = ranking.length;
  progressFill.style.width = ranking.length === 7 ? '100%' : `${(ranking.length / 7) * 100}%`;
}

function updateSubmitState() {
  const vals = Object.values(scores);
  const valid = ranking.length === 7 && vals.length === 7 && new Set(vals).size === 7 && POINTS.every(p => vals.includes(p));
  submitBallot.disabled = !valid;
  ballotMessage.textContent = valid
    ? 'Sıralaman hazır. Göndermeden önce son kontrolü açabilirsin.'
    : 'Yedi rakip entry’nin tamamı sıralamada olmalı.';
}

function scheduleAutosave() {
  saveStatus.textContent = 'Kaydediliyor...';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveBallot(false), 450);
}

async function saveBallot(finalize) {
  const payload = ranking.map((entry, index) => ({
    entry_id: Number(entry.id),
    points: POINTS[index]
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
  confirmSummary.innerHTML = ranking.map((entry, index) => `
    <div class="confirm-row">
      <span>${escapeHtml(entry.artist_name)} · ${escapeHtml(entry.song_title)}</span>
      <strong>${POINTS[index]}</strong>
    </div>
  `).join('');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>'"]/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  }[c]));
}

init();
