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
let ballotStatus = 'new';
let submittedAt = null;
let editingSubmitted = false;

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
const submissionReceipt = document.getElementById('submission-receipt');
const receiptKickerText = document.getElementById('receipt-kicker-text');
const receiptTitle = document.getElementById('receipt-title');
const receiptCopy = document.getElementById('receipt-copy');
const receiptTime = document.getElementById('receipt-time');
const receiptStatus = document.getElementById('receipt-status');
const receiptEditability = document.getElementById('receipt-editability');
const receiptNote = document.getElementById('receipt-note');
const shareVote = document.getElementById('share-vote');
const editSubmittedVote = document.getElementById('edit-submitted-vote');
const shareCardEdition = document.getElementById('share-card-edition');
const shareCardCountry = document.getElementById('share-card-country');
const shareCardWatermark = document.getElementById('share-card-watermark');
const shareCardDate = document.getElementById('share-card-date');
const shareCardRecord = document.getElementById('share-card-record');
const voteCelebration = document.getElementById('vote-celebration');
const celebrationCountry = document.getElementById('celebration-country');
const celebrationScore = document.getElementById('celebration-score');
const celebrationEdition = document.getElementById('celebration-edition');
const celebrationConfetti = document.getElementById('celebration-confetti');

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');


const submissionTimeFormatter = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'medium',
  timeStyle: 'short'
});

function formatSubmissionTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : submissionTimeFormatter.format(date);
}

function localRevisionKey() {
  if (!edition || !activeCountry) return '';
  return `isc_vote_revision_${edition.edition_number}_${activeCountry.slug}`;
}

function persistLocalRevision() {
  const key = localRevisionKey();
  if (!key || !submittedAt) return;
  try {
    localStorage.setItem(key, JSON.stringify({
      baseSubmittedAt: submittedAt,
      entryIds: ranking.map(entry => Number(entry.id)),
      savedAt: new Date().toISOString()
    }));
  } catch (_) {}
}

function clearLocalRevision() {
  const key = localRevisionKey();
  if (!key) return;
  try { localStorage.removeItem(key); } catch (_) {}
}

function restoreLocalRevision(eligibleEntries) {
  const key = localRevisionKey();
  if (!key || ballotStatus !== 'submitted' || !submittedAt) return false;
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || 'null');
    if (!parsed || parsed.baseSubmittedAt !== submittedAt || !Array.isArray(parsed.entryIds)) return false;
    const byId = new Map(eligibleEntries.map(entry => [Number(entry.id), entry]));
    const restored = parsed.entryIds.map(id => byId.get(Number(id))).filter(Boolean);
    if (restored.length !== eligibleEntries.length || new Set(restored.map(entry => entry.id)).size !== eligibleEntries.length) return false;
    ranking = restored;
    editingSubmitted = true;
    return true;
  } catch (_) {
    return false;
  }
}

function renderSubmissionReceipt() {
  if (!submissionReceipt || !activeCountry || !edition || !submittedAt) {
    if (submissionReceipt) submissionReceipt.hidden = true;
    return;
  }

  const label = edition.title || `ISC ${edition.edition_number}`;
  submissionReceipt.hidden = false;
  submissionReceipt.classList.toggle('is-revising', editingSubmitted);

  receiptTime.textContent = formatSubmissionTime(submittedAt);
  shareCardEdition.textContent = label.toUpperCase();
  shareCardCountry.textContent = activeCountry.name.toUpperCase();
  if (shareCardWatermark) shareCardWatermark.textContent = String(edition.edition_number);
  if (shareCardDate) shareCardDate.textContent = formatSubmissionTime(submittedAt).toUpperCase();
  if (shareCardRecord) shareCardRecord.textContent = `ISC-${edition.edition_number}-${activeCountry.slug.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)}`;

  if (editingSubmitted) {
    receiptKickerText.textContent = 'SUBMITTED · LOCAL REVISION';
    receiptTitle.textContent = `${activeCountry.name} delegasyonunun gönderilmiş oyu güvende.`;
    receiptCopy.textContent = 'Yeni sıralaman bu cihazda taslak olarak tutuluyor. Mevcut gönderilmiş oyun geçerliliğini koruyor; güncellemek için pusulayı yeniden göndermen gerekiyor.';
    receiptStatus.textContent = 'REVISION DRAFT';
    if (receiptEditability) receiptEditability.textContent = 'Resmî oy korunuyor · yeniden gönderilmesi gerekiyor';
    receiptNote.textContent = 'Bu taslak henüz resmi oyunun yerini almadı. Paylaşım kartında verdiğin puanlar görünmez.';
  } else {
    receiptKickerText.textContent = 'BALLOT RECEIVED';
    receiptTitle.textContent = `${activeCountry.name} delegasyonunun ${label} oyu kaydedildi.`;
    receiptCopy.textContent = 'Oylama kapanana kadar sıralamanı değiştirebilir ve güncellenmiş oyunu yeniden gönderebilirsin.';
    receiptStatus.textContent = 'SUBMITTED';
    if (receiptEditability) receiptEditability.textContent = edition.voting_open ? 'Oylama açıkken güncellenebilir' : 'Oylama kapandı · oy kilitlendi';
    receiptNote.textContent = 'Paylaşım kartında verdiğin puanlar görünmez.';
  }
}

function buildCelebrationConfetti() {
  if (!celebrationConfetti) return;
  celebrationConfetti.innerHTML = '';

  const count = 42;
  const viewportW = Math.min(window.innerWidth * .92, 1100);
  const floorY = Math.max(210, window.innerHeight * .57);

  for (let i = 0; i < count; i += 1) {
    const piece = document.createElement('i');
    const shapeRoll = Math.random();
    piece.className = 'confetti-piece' + (shapeRoll < .16 ? ' round' : shapeRoll > .86 ? ' ribbon' : '');

    const side = Math.random() < .5 ? -1 : 1;
    const launch = (70 + Math.random() * 210) * side;
    const rise = -(110 + Math.random() * 190);
    const drift = (Math.random() - .5) * 150;
    const swayA = (Math.random() - .5) * 85;
    const swayB = (Math.random() - .5) * 95;
    const swayC = (Math.random() - .5) * 75;
    const landingX = Math.max(-viewportW / 2, Math.min(viewportW / 2, launch + drift));
    const settle = Math.random() * 24;

    const x1 = launch * .55;
    const y1 = rise * .62;
    const x2 = launch + swayA;
    const y2 = rise;
    const x3 = launch + drift * .35 + swayB;
    const y3 = rise * .35 + floorY * .28;
    const x4 = landingX + swayC;
    const y4 = floorY * .68;
    const x5 = landingX - swayC * .18;
    const y5 = floorY - 12 + settle;
    const x6 = landingX;
    const y6 = floorY + settle;

    const spinDirection = Math.random() < .5 ? -1 : 1;
    const turns = (1.3 + Math.random() * 2.8) * 360 * spinDirection;
    const duration = 2.9 + Math.random() * .85;
    const delay = Math.random() * .24;
    const width = 5 + Math.random() * 7;
    const height = 8 + Math.random() * 13;

    piece.style.setProperty('--x1', `${x1.toFixed(1)}px`);
    piece.style.setProperty('--y1', `${y1.toFixed(1)}px`);
    piece.style.setProperty('--x2', `${x2.toFixed(1)}px`);
    piece.style.setProperty('--y2', `${y2.toFixed(1)}px`);
    piece.style.setProperty('--x3', `${x3.toFixed(1)}px`);
    piece.style.setProperty('--y3', `${y3.toFixed(1)}px`);
    piece.style.setProperty('--x4', `${x4.toFixed(1)}px`);
    piece.style.setProperty('--y4', `${y4.toFixed(1)}px`);
    piece.style.setProperty('--x5', `${x5.toFixed(1)}px`);
    piece.style.setProperty('--y5', `${y5.toFixed(1)}px`);
    piece.style.setProperty('--x6', `${x6.toFixed(1)}px`);
    piece.style.setProperty('--y6', `${y6.toFixed(1)}px`);
    piece.style.setProperty('--r1', `${(turns * .18).toFixed(0)}deg`);
    piece.style.setProperty('--r2', `${(turns * .37).toFixed(0)}deg`);
    piece.style.setProperty('--r3', `${(turns * .58).toFixed(0)}deg`);
    piece.style.setProperty('--r4', `${(turns * .78).toFixed(0)}deg`);
    piece.style.setProperty('--r5', `${(turns * .92).toFixed(0)}deg`);
    piece.style.setProperty('--r6', `${turns.toFixed(0)}deg`);
    piece.style.setProperty('--duration', `${duration.toFixed(2)}s`);
    piece.style.setProperty('--delay', `${delay.toFixed(2)}s`);
    piece.style.setProperty('--w', `${width.toFixed(1)}px`);
    piece.style.setProperty('--h', `${height.toFixed(1)}px`);

    celebrationConfetti.appendChild(piece);
  }
}

async function playSubmissionCelebration() {
  if (!voteCelebration || !activeCountry || !edition) return;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  celebrationCountry.textContent = activeCountry.name.toUpperCase();
  celebrationScore.textContent = String(POINTS[0] ?? '12');
  celebrationEdition.textContent = `${edition.title || `ISC ${edition.edition_number}`} · OFFICIAL BALLOT`;
  if (!reduced) buildCelebrationConfetti();
  voteCelebration.hidden = false;
  voteCelebration.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => voteCelebration.classList.add('is-running'));

  await new Promise(resolve => setTimeout(resolve, reduced ? 900 : 3900));

  voteCelebration.classList.remove('is-running');
  voteCelebration.hidden = true;
  voteCelebration.setAttribute('aria-hidden', 'true');
  if (celebrationConfetti) celebrationConfetti.innerHTML = '';
  document.body.style.overflow = '';
}

function fitCanvasText(ctx, text, maxWidth, startSize, family, weight = '700') {
  let size = startSize;
  while (size > 28) {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  return size;
}

async function buildVoteShareCardBlob() {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  if (document.fonts?.ready) await document.fonts.ready;

  ctx.fillStyle = '#07070a';
  ctx.fillRect(0, 0, 1200, 630);

  const glowPink = ctx.createRadialGradient(250, 500, 0, 250, 500, 420);
  glowPink.addColorStop(0, 'rgba(255,61,129,.34)');
  glowPink.addColorStop(1, 'rgba(255,61,129,0)');
  ctx.fillStyle = glowPink;
  ctx.fillRect(0, 0, 1200, 630);

  const glowLime = ctx.createRadialGradient(980, 100, 0, 980, 100, 320);
  glowLime.addColorStop(0, 'rgba(216,255,62,.20)');
  glowLime.addColorStop(1, 'rgba(216,255,62,0)');
  ctx.fillStyle = glowLime;
  ctx.fillRect(0, 0, 1200, 630);

  ctx.strokeStyle = 'rgba(255,255,255,.08)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(980, 330, 285, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(980, 330, 390, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#d8ff3e';
  ctx.font = '700 20px "DM Sans", sans-serif';
  ctx.letterSpacing = '3px';
  ctx.fillText('INTERNATIONAL SONG CONTEST', 72, 74);

  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.textAlign = 'right';
  ctx.fillText('OFFICIAL BALLOT RECEIVED', 1128, 74);
  ctx.textAlign = 'left';

  const label = edition?.title || `ISC ${edition?.edition_number || ''}`;
  ctx.fillStyle = '#ffffff';
  ctx.font = '400 154px "Libre Caslon Display", serif';
  ctx.fillText(label.toUpperCase(), 68, 260);

  ctx.fillStyle = '#ff3d81';
  ctx.font = '700 74px "DM Sans", sans-serif';
  ctx.fillText('I VOTED', 72, 360);

  const country = (activeCountry?.name || '').toUpperCase();
  const countrySize = fitCanvasText(ctx, country, 900, 60, '"DM Sans", sans-serif');
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 ${countrySize}px "DM Sans", sans-serif`;
  ctx.fillText(country, 72, 438);

  ctx.strokeStyle = 'rgba(255,255,255,.14)';
  ctx.beginPath();
  ctx.moveTo(72, 500);
  ctx.lineTo(1128, 500);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,.58)';
  ctx.font = '700 18px "DM Sans", sans-serif';
  ctx.fillText('YOUR COUNTRY · YOUR RANKING · YOUR VOTE', 72, 550);

  ctx.fillStyle = '#d8ff3e';
  ctx.textAlign = 'right';
  ctx.fillText('isc-archive', 1128, 550);
  ctx.textAlign = 'left';

  return await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 0.95));
}

async function shareVoteReceipt() {
  if (!shareVote || !activeCountry || !edition) return;
  const original = shareVote.innerHTML;
  shareVote.disabled = true;
  shareVote.textContent = 'HAZIRLANIYOR…';

  try {
    const blob = await buildVoteShareCardBlob();
    const label = edition.title || `ISC ${edition.edition_number}`;
    const url = 'https://eaergunari-spec.github.io/isc-archive/';
    const text = `${activeCountry.name} delegasyonu ${label} için oyunu kullandı. #ISC`;
    const file = blob ? new File([blob], `ISC-${edition.edition_number}-I-Voted.png`, { type: 'image/png' }) : null;

    if (file && navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: `${label} · I Voted`, text, url, files: [file] });
      receiptNote.textContent = 'Paylaşım kartı hazır. Puanların kartta yer almıyor.';
    } else if (navigator.share) {
      await navigator.share({ title: `${label} · I Voted`, text, url });
      receiptNote.textContent = 'Paylaşım bağlantısı açıldı. Puanların paylaşılmıyor.';
    } else {
      if (navigator.clipboard) await navigator.clipboard.writeText(`${text} ${url}`);
      if (blob) {
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = `ISC-${edition.edition_number}-I-Voted.png`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      }
      receiptNote.textContent = 'Paylaşım metni kopyalandı ve kart hazırlandı. Puanların kartta yer almıyor.';
    }
  } catch (error) {
    if (error?.name !== 'AbortError') {
      console.error('ISC share card failed', error);
      receiptNote.textContent = 'Paylaşım kartı hazırlanamadı. Lütfen tekrar dene.';
    }
  } finally {
    shareVote.disabled = false;
    shareVote.innerHTML = original;
  }
}

shareVote?.addEventListener('click', shareVoteReceipt);
editSubmittedVote?.addEventListener('click', () => {
  rankingBoard?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

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
  ballotStatus = data.status || 'new';
  submittedAt = data.submitted_at || null;
  editingSubmitted = false;
  restoreLocalRevision(eligibleEntries);
  scores = deriveScores();

  ballotCountry.textContent = activeCountry.name;
  renderSelfEntry(ownEntry);
  renderBallot();
  updateProgress();
  updateSubmitState();
  renderSubmissionReceipt();
  ballotStep.hidden = false;

  loginMessage.textContent = editingSubmitted
    ? 'Gönderilmiş oyun yüklendi. Bu cihazdaki gönderilmemiş değişiklikler de geri getirildi.'
    : data.status === 'submitted'
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

  if (ballotStatus === 'submitted' || editingSubmitted) {
    editingSubmitted = true;
    persistLocalRevision();
    saveStatus.textContent = 'Yerel taslak';
  }

  renderBallot();
  updateProgress();
  updateSubmitState();
  renderSubmissionReceipt();

  if (!editingSubmitted) scheduleAutosave();
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

  if (!edition.voting_open) {
    submitBallot.disabled = true;
    submitBallot.textContent = ballotStatus === 'submitted' ? 'OYUN GÖNDERİLDİ ✓' : 'OYLAMA KAPALI';
    ballotMessage.textContent = 'Oylama kapalı · pusula görüntülenebilir ancak değiştirilemez.';
    saveStatus.textContent = 'Voting closed';
    return;
  }

  if (ballotStatus === 'submitted' && !editingSubmitted) {
    submitBallot.disabled = true;
    submitBallot.textContent = 'OYUN GÖNDERİLDİ ✓';
    ballotMessage.textContent = 'Pusulan resmi olarak gönderildi. Sıralamayı değiştirirsen güncellenmiş oyunu yeniden göndermen gerekir.';
    saveStatus.textContent = 'Submitted';
    return;
  }

  submitBallot.disabled = !valid;
  submitBallot.innerHTML = editingSubmitted
    ? 'GÜNCELLENMİŞ OYUMU GÖNDER <span>→</span>'
    : 'OYUMU GÖNDER <span>→</span>';

  if (editingSubmitted) {
    ballotMessage.textContent = valid
      ? 'Gönderilmemiş değişikliklerin bu cihazda taslak olarak tutuluyor. Mevcut resmi oyun hâlâ geçerli.'
      : `Pusulada ${POINTS.length} farklı puan slotunun tamamı dolu olmalı.`;
    return;
  }

  ballotMessage.textContent = valid
    ? `${POINTS.length}/${POINTS.length} puan slotu dolu · değişiklikler otomatik kaydedilir.`
    : `Pusulada ${POINTS.length} farklı puan slotunun tamamı dolu olmalı.`;
}

function scheduleAutosave() {
  if (!edition.voting_open || !activeCountry || !activeCode || editingSubmitted || ballotStatus === 'submitted') return;
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

  const { data, error } = await db.rpc('isc_save_current_ballot', {
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

  if (finalize) {
    ballotStatus = 'submitted';
    submittedAt = data?.submitted_at || new Date().toISOString();
    editingSubmitted = false;
    clearLocalRevision();
    saveStatus.textContent = 'Oylar gönderildi';
    ballotMessage.textContent = 'Pusulan başarıyla gönderildi.';
    renderSubmissionReceipt();
    updateSubmitState();
  } else {
    ballotStatus = 'draft';
    saveStatus.textContent = 'Otomatik kaydedildi';
  }

  return data || { ok: true };
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
  const result = await saveBallot(true);
  confirmSubmit.disabled = false;
  confirmSubmit.textContent = 'Oyları gönder →';

  if (result) {
    confirmDialog.close();
    await playSubmissionCelebration();
    renderSubmissionReceipt();
    submissionReceipt?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
