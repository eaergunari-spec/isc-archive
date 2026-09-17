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
    const o = document.createElement('option');
    o.value = c.slug;
    o.textContent = c.name;
    countrySelect.appendChild(o);
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
  const { data, error } = await db.rpc('isc154_load_ballot', { p_country_slug: slug, p_code: code });
  enterVoting.disabled = false;
  if (error) {
    loginMessage.textContent = 'Voter code geçersiz.';
    return;
  }
  activeCountry = countries.find(c => c.slug === slug);
  activeCode = code;
  scores = {};
  (data.scores || []).forEach(s => scores[String(s.entry_id)] = Number(s.points));
  ballotCountry.textContent = activeCountry.name;
  renderBallot();
  ballotStep.hidden = false;
  loginMessage.textContent = data.status === 'submitted' ? 'Daha önce gönderilmiş pusulan yüklendi.' : 'Doğrulandı.';
  ballotStep.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

function renderBallot() {
  ballotList.innerHTML = '';
  const ownEntry = entries.find(e => e.country_id === activeCountry.id);
  entries.forEach(entry => {
    const row = document.createElement('div');
    const isOwn = entry.id === ownEntry.id;
    row.className = 'ballot-row' + (isOwn ? ' self-row' : '');
    row.innerHTML = `<div class="ballot-order">${String(entry.running_order).padStart(2,'0')}</div>
      <div class="ballot-entry"><strong>${escapeHtml(entry.artist_name)}</strong><span>${escapeHtml(entry.song_title)}</span></div>`;
    if (isOwn) {
      row.innerHTML += '<div class="self-label">Kendi entry’n</div>';
    } else {
      const select = document.createElement('select');
      select.dataset.entryId = entry.id;
      select.innerHTML = '<option value="">Puan seç...</option>' + POINTS.map(p => `<option value="${p}" ${scores[String(entry.id)]===p?'selected':''}>${p} puan</option>`).join('');
      select.addEventListener('change', onScoreChange);
      row.appendChild(select);
    }
    ballotList.appendChild(row);
  });
  updateSelectAvailability();
  updateSubmitState();
}

function onScoreChange(e) {
  const entryId = e.target.dataset.entryId;
  const value = e.target.value ? Number(e.target.value) : null;
  if (value) scores[entryId] = value; else delete scores[entryId];
  updateSelectAvailability();
  updateSubmitState();
  scheduleAutosave();
}

function updateSelectAvailability() {
  const selects = [...ballotList.querySelectorAll('select')];
  const used = Object.values(scores);
  selects.forEach(sel => {
    const current = sel.value ? Number(sel.value) : null;
    [...sel.options].forEach(opt => {
      if (!opt.value) return;
      const p = Number(opt.value);
      opt.disabled = used.includes(p) && p !== current;
    });
  });
}

function updateSubmitState() {
  const vals = Object.values(scores);
  submitBallot.disabled = !(vals.length === 7 && new Set(vals).size === 7 && POINTS.every(p => vals.includes(p)));
}

function scheduleAutosave() {
  saveStatus.textContent = 'Kaydediliyor...';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveBallot(false), 450);
}

async function saveBallot(finalize) {
  const payload = Object.entries(scores).map(([entry_id, points]) => ({ entry_id: Number(entry_id), points }));
  const { error } = await db.rpc('isc154_save_ballot', {
    p_country_slug: activeCountry.slug,
    p_code: activeCode,
    p_scores: payload,
    p_finalize: finalize
  });
  if (error) {
    saveStatus.textContent = 'Kayıt hatası';
    ballotMessage.textContent = error.message.includes('Voting is closed') ? 'Oylama kapanmış.' : 'Oylar kaydedilemedi. Lütfen tekrar dene.';
    return false;
  }
  saveStatus.textContent = finalize ? 'Oylar gönderildi' : 'Otomatik kaydedildi';
  ballotMessage.textContent = finalize ? 'Pusulan başarıyla kaydedildi. Oylama açık olduğu sürece değişiklik yapabilirsin.' : '';
  return true;
}

submitBallot.addEventListener('click', async () => {
  submitBallot.disabled = true;
  const ok = await saveBallot(true);
  updateSubmitState();
  if (ok) window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
});

function escapeHtml(s) {
  return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

init();
