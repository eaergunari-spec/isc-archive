const SUPABASE_URL = 'https://knwvnbfqnccjiezprrme.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Zw8H9mMmUop7wkYNKtZB3Q_7dM1QHut';
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

let adminCode = '';
let dashboardData = null;
let selectedEdition = null;
let refreshTimer = null;
let pendingAction = null;
let secretTotalsVisible = false;
let toastTimer = null;

try { adminCode = sessionStorage.getItem('isc_admin_code') || ''; } catch (_) {}

const $ = id => document.getElementById(id);
const loginSection = $('admin-login');
const dashboard = $('dashboard');
const adminCodeInput = $('admin-code');
const adminEnter = $('admin-enter');
const adminMessage = $('admin-message');
const editionSelect = $('edition-select');
const refreshDashboard = $('refresh-dashboard');
const adminLogout = $('admin-logout');
const dashboardEditionLabel = $('dashboard-edition-label');
const readonlyBanner = $('readonly-banner');

const votingState = $('voting-state');
const votingDetail = $('voting-detail');
const submittedCount = $('submitted-count');
const submittedDetail = $('submitted-detail');
const draftCount = $('draft-count');
const codeCount = $('code-count');
const codeDetail = $('code-detail');
const resultsState = $('results-state');
const resultsDetail = $('results-detail');

const readinessCard = $('readiness-card');
const readinessTitle = $('readiness-title');
const readinessCopy = $('readiness-copy');
const readinessRatio = $('readiness-ratio');
const readinessPercent = $('readiness-percent');
const readinessFill = $('readiness-fill');
const schemeName = $('scheme-name');
const schemeMeta = $('scheme-meta');
const schemePoints = $('scheme-points');

const votingActionTitle = $('voting-action-title');
const votingActionCopy = $('voting-action-copy');
const toggleVoting = $('toggle-voting');
const revealActionTitle = $('reveal-action-title');
const revealActionCopy = $('reveal-action-copy');
const revealResults = $('reveal-results');

const countryStatusList = $('country-status-list');
const totalsTable = $('totals-table');
const lastRefresh = $('last-refresh');
const toggleSecretTotals = $('toggle-secret-totals');
const secretCover = $('secret-cover');
const auditLog = $('audit-log');

const confirmDialog = $('confirm-dialog');
const confirmForm = $('confirm-form');
const confirmKicker = $('confirm-kicker');
const confirmTitle = $('confirm-title');
const confirmCopy = $('confirm-copy');
const confirmImpact = $('confirm-impact');
const confirmPhrase = $('confirm-phrase');
const confirmInput = $('confirm-input');
const confirmError = $('confirm-error');
const confirmSubmit = $('confirm-submit');
const confirmCancel = $('confirm-cancel');
const confirmClose = $('confirm-close');
const adminToast = $('admin-toast');

adminCodeInput.value = '';

async function rpc(name, args) {
  const { data, error } = await db.rpc(name, args);
  if (error) throw error;
  return data;
}

function setSessionCode(code) {
  try {
    if (code) sessionStorage.setItem('isc_admin_code', code);
    else sessionStorage.removeItem('isc_admin_code');
  } catch (_) {}
}

async function login({ stored = false } = {}) {
  const code = stored ? adminCode : adminCodeInput.value.trim();
  if (!code) return;

  adminMessage.textContent = stored ? 'Session doğrulanıyor…' : 'Doğrulanıyor…';
  adminEnter.disabled = true;

  try {
    const data = await rpc('isc_admin_dashboard', { p_code: code, p_edition_number: null });
    adminCode = code;
    setSessionCode(code);
    dashboardData = data;
    selectedEdition = Number(data?.edition?.edition_number || 0) || null;
    loginSection.hidden = true;
    dashboard.hidden = false;
    adminCodeInput.value = '';
    adminMessage.textContent = '';
    renderDashboard();
    startAutoRefresh();
  } catch (err) {
    adminCode = '';
    setSessionCode('');
    if (stored) {
      loginSection.hidden = false;
      dashboard.hidden = true;
      adminMessage.textContent = 'Önceki admin session geçersiz. Yeniden giriş yap.';
    } else {
      adminMessage.textContent = 'Admin code geçersiz veya admin console şu anda kullanılamıyor.';
    }
  } finally {
    adminEnter.disabled = false;
  }
}

async function loadDashboard({ edition = selectedEdition, silent = false } = {}) {
  if (!adminCode) return;
  if (!silent) refreshDashboard.disabled = true;

  try {
    const data = await rpc('isc_admin_dashboard', {
      p_code: adminCode,
      p_edition_number: edition == null ? null : Number(edition)
    });
    dashboardData = data;
    selectedEdition = Number(data?.edition?.edition_number || edition || 0) || null;
    renderDashboard();
  } catch (err) {
    const message = String(err?.message || 'Control Room verileri yenilenemedi.');
    if (/invalid admin code/i.test(message)) {
      logout('Admin session sona erdi. Yeniden giriş yap.');
      return;
    }
    if (!silent) showToast(message, 'error');
  } finally {
    refreshDashboard.disabled = false;
  }
}

function renderDashboard() {
  const data = dashboardData;
  if (!data?.edition) return;

  const ed = data.edition;
  const readiness = data.readiness || {};
  const scheme = data.voting_scheme || null;
  const entryCount = Number(readiness.entry_count ?? ed.entry_count ?? 0);
  const completeCount = Number(readiness.complete_ballot_count || 0);
  const submittedRaw = Number(readiness.submitted_count || 0);
  const drafts = Number(readiness.draft_count || 0);
  const codes = Number(readiness.configured_code_count || 0);
  const open = Boolean(ed.voting_open);
  const revealed = Boolean(ed.results_revealed);
  const readOnly = Boolean(ed.read_only || ed.status !== 'current');
  const label = ed.title || `ISC ${ed.edition_number}`;
  const percent = entryCount ? Math.round((completeCount / entryCount) * 100) : 0;

  document.title = `${label} · Contest Admin`;
  dashboardEditionLabel.textContent = `${label} · ${readOnly ? 'archive inspection' : 'live operations'}`;
  readonlyBanner.hidden = !readOnly;

  renderEditionSelector(data.edition_selector || [], ed.edition_number);

  votingState.textContent = open ? 'OPEN' : 'CLOSED';
  votingState.dataset.state = open ? 'open' : 'closed';
  votingDetail.textContent = readOnly ? 'archived state' : open ? 'delegation writes enabled' : 'new ballot writes blocked';

  submittedCount.textContent = `${completeCount} / ${entryCount}`;
  submittedDetail.textContent = submittedRaw === completeCount
    ? `${submittedRaw} submitted ballot${submittedRaw === 1 ? '' : 's'}`
    : `${submittedRaw} submitted · ${completeCount} structurally complete`;
  draftCount.textContent = String(drafts);
  codeCount.textContent = `${codes} / ${entryCount}`;
  codeDetail.textContent = codes === entryCount && entryCount > 0 ? 'all delegation codes active' : `${Math.max(0, entryCount - codes)} access code issue${entryCount - codes === 1 ? '' : 's'}`;

  resultsState.textContent = revealed ? 'REVEALED' : 'LOCKED';
  resultsState.dataset.state = revealed ? 'revealed' : 'locked';
  resultsDetail.textContent = revealed ? 'public result state is permanent' : resultLockCopy(readiness.lock_reason);

  readinessRatio.textContent = `${completeCount} / ${entryCount}`;
  readinessPercent.textContent = `${percent}%`;
  readinessFill.style.width = `${Math.max(0, Math.min(100, percent))}%`;
  renderReadiness(readiness, ed, completeCount, entryCount);
  renderScheme(scheme);
  renderOperations({ ed, readiness, readOnly, completeCount, entryCount });
  renderCountries(data.countries || []);
  renderTotals(data.totals || []);
  renderAudit(data.audit_log || []);
  renderSecretVisibility();

  lastRefresh.textContent = `Son yenileme · ${new Intl.DateTimeFormat('tr-TR', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).format(new Date())}`;
}

function renderEditionSelector(editions, currentNumber) {
  const previous = String(currentNumber ?? '');
  editionSelect.innerHTML = editions.map(row => {
    const status = row.status === 'current' ? 'CURRENT' : 'ARCHIVE';
    const ballots = `${row.submitted_count || 0}/${row.entry_count || 0}`;
    return `<option value="${escapeHtml(row.edition_number)}">ISC ${escapeHtml(row.edition_number)} · ${status} · ${escapeHtml(ballots)} ballots</option>`;
  }).join('');
  editionSelect.value = previous;
}

function renderReadiness(readiness, ed, completeCount, entryCount) {
  const reason = readiness.lock_reason;
  readinessCard.classList.remove('ready', 'locked', 'revealed', 'readonly');

  if (ed.status !== 'current') {
    readinessCard.classList.add('readonly');
    readinessTitle.textContent = 'Arşiv denetim modu.';
    readinessCopy.textContent = 'Bu edisyon tamamlanmış bir kayıt. Operational controls kilitli; ballot, scheme ve audit bilgileri salt okunur gösterilir.';
    return;
  }

  if (ed.results_revealed) {
    readinessCard.classList.add('revealed');
    readinessTitle.textContent = 'Results already public.';
    readinessCopy.textContent = 'Reveal tamamlandı. Public sonuç durumu geri alınamaz ve voting yeniden açılamaz.';
    return;
  }

  if (readiness.can_reveal) {
    readinessCard.classList.add('ready');
    readinessTitle.textContent = 'Reveal için hazır.';
    readinessCopy.textContent = `${completeCount}/${entryCount} delegasyon pusulası complete ve voting kapalı. Final reveal operation artık açılabilir.`;
    return;
  }

  readinessCard.classList.add('locked');
  if (reason === 'close_voting_first') {
    readinessTitle.textContent = 'Reveal lock: voting açık.';
    readinessCopy.textContent = `${completeCount}/${entryCount} complete ballot var. Result reveal’den önce voting gate kapatılmalı.`;
  } else if (reason === 'incomplete_ballots') {
    readinessTitle.textContent = 'Reveal lock: pusulalar eksik.';
    readinessCopy.textContent = `${completeCount}/${entryCount} delegasyon pusulası structurally complete. Tüm delegasyonlar tamamlanmadan reveal backend tarafından reddedilir.`;
  } else if (reason === 'no_entries') {
    readinessTitle.textContent = 'Reveal lock: entry yok.';
    readinessCopy.textContent = 'Edisyonun entry kayıtları tamamlanmadan operasyon devam edemez.';
  } else {
    readinessTitle.textContent = 'Reveal kilitli.';
    readinessCopy.textContent = resultLockCopy(reason);
  }
}

function resultLockCopy(reason) {
  return ({
    close_voting_first: 'close voting first',
    incomplete_ballots: 'waiting for complete ballots',
    no_entries: 'edition has no entries',
    read_only_archive: 'archive is read-only',
    results_revealed: 'already public',
    ready: 'ready to reveal'
  })[reason] || 'protected backstage';
}

function renderScheme(scheme) {
  if (!scheme) {
    schemeName.textContent = 'Not configured';
    schemeMeta.textContent = 'Bu edisyon için voting scheme bulunamadı.';
    schemePoints.innerHTML = '<span class="scheme-empty">—</span>';
    return;
  }

  const points = (scheme.points || []).map(row => Number(row.points));
  schemeName.textContent = scheme.name || points.join('–') || 'Voting scheme';
  schemeMeta.textContent = `${scheme.score_slots || points.length} score slots · ${scheme.points_per_ballot || points.reduce((a, b) => a + b, 0)} points / ballot · ${scheme.self_vote_allowed ? 'self-vote allowed' : 'self-vote disabled'}`;
  schemePoints.innerHTML = points.map((point, index) => `<span><small>${String(index + 1).padStart(2, '0')}</small><strong>${point}</strong></span>`).join('');
}

function renderOperations({ ed, readiness, readOnly, completeCount, entryCount }) {
  const open = Boolean(ed.voting_open);
  const revealed = Boolean(ed.results_revealed);

  toggleVoting.classList.toggle('danger-operation', open && !readOnly);
  toggleVoting.disabled = readOnly || revealed;
  votingActionTitle.textContent = open ? 'Voting is open.' : 'Voting is closed.';

  if (readOnly) {
    toggleVoting.textContent = 'Arşiv kaydı';
    votingActionCopy.textContent = 'Archived editions are read-only. Voting state değiştirilemez.';
  } else if (revealed) {
    toggleVoting.textContent = 'Voting locked';
    votingActionCopy.textContent = 'Results reveal tamamlandığı için voting artık yeniden açılamaz.';
  } else if (open) {
    toggleVoting.textContent = 'Oylamayı kapat';
    votingActionCopy.textContent = `${completeCount}/${entryCount} complete ballot var. Closing voting yeni save/submit işlemlerini anında durdurur.`;
  } else {
    toggleVoting.textContent = 'Oylamayı yeniden aç';
    votingActionCopy.textContent = 'Reveal yapılmadığı sürece voting yeniden açılabilir. Delegasyonlar mevcut ballot’larını tekrar düzenleyebilir.';
  }

  revealResults.classList.toggle('is-ready', Boolean(readiness.can_reveal));
  revealResults.disabled = readOnly || revealed || !readiness.can_reveal;

  if (readOnly) {
    revealActionTitle.textContent = 'Archived result.';
    revealActionCopy.textContent = 'Arşivlenmiş edisyonda result state değiştirilemez.';
    revealResults.textContent = 'Read-only';
  } else if (revealed) {
    revealActionTitle.textContent = 'Results are public.';
    revealActionCopy.textContent = 'Reveal tek yönlüdür. Public result state geri alınmaz.';
    revealResults.textContent = 'Revealed';
  } else if (readiness.lock_reason === 'close_voting_first') {
    revealActionTitle.textContent = 'Results locked.';
    revealActionCopy.textContent = 'Önce voting gate kapatılmalı. Backend açık voting sırasında reveal kabul etmez.';
    revealResults.textContent = 'Önce voting’i kapat';
  } else if (readiness.lock_reason === 'incomplete_ballots') {
    revealActionTitle.textContent = 'Results locked.';
    revealActionCopy.textContent = `${completeCount}/${entryCount} complete. Tüm delegation ballot’ları tamamlanmadan reveal yapılamaz.`;
    revealResults.textContent = `${completeCount}/${entryCount} complete`;
  } else if (readiness.can_reveal) {
    revealActionTitle.textContent = 'Ready for public reveal.';
    revealActionCopy.textContent = 'Tüm pusulalar complete ve voting kapalı. Bu işlem public scoreboard’u kalıcı olarak açar.';
    revealResults.textContent = 'Sonuçları reveal et';
  } else {
    revealActionTitle.textContent = 'Results locked.';
    revealActionCopy.textContent = resultLockCopy(readiness.lock_reason);
    revealResults.textContent = 'Locked';
  }
}

function renderCountries(rows) {
  if (!rows.length) {
    countryStatusList.innerHTML = '<div class="control-empty">Bu edisyonda delegation kaydı yok.</div>';
    return;
  }

  countryStatusList.innerHTML = rows.map(row => {
    const status = row.ballot_status || 'not_started';
    const statusLabel = status === 'submitted' ? 'Submitted' : status === 'draft' ? 'Draft' : 'Not started';
    const scoreCopy = `${Number(row.score_count || 0)} / ${Number(row.expected_score_count || 0)}`;
    const codeClass = row.voter_code_configured && row.voter_code_active ? 'code-active' : row.voter_code_configured ? 'code-inactive' : 'code-missing';
    const codeLabel = row.voter_code_configured && row.voter_code_active ? 'Active' : row.voter_code_configured ? 'Inactive' : 'Missing';
    const stamp = row.submitted_at || row.updated_at;

    return `<div class="country-status-row">
      <div class="order">${String(row.running_order).padStart(2, '0')}</div>
      <div class="country"><strong>${escapeHtml(row.country)}</strong><span>${escapeHtml(row.slug)}</span></div>
      <div><span class="status-badge ${escapeHtml(status)}">${statusLabel}</span></div>
      <div class="score-complete ${row.ballot_complete ? 'complete' : ''}"><strong>${scoreCopy}</strong><span>${row.ballot_complete ? 'complete' : 'scores'}</span></div>
      <div><span class="code-badge ${codeClass}">${codeLabel}</span></div>
      <div class="timestamp">${stamp ? formatTime(stamp) : '—'}</div>
    </div>`;
  }).join('');
}

function renderTotals(rows) {
  if (!rows.length) {
    totalsTable.innerHTML = '<div class="control-empty">Submitted ballot olmadığı için total oluşmadı.</div>';
    return;
  }

  totalsTable.innerHTML = rows.map((row, index) => `<div class="total-row">
    <div class="total-rank">${String(index + 1).padStart(2, '0')}</div>
    <div class="total-order">RO ${String(row.running_order).padStart(2, '0')}</div>
    <div class="total-country">${escapeHtml(row.country)}</div>
    <div class="total-entry"><strong>${escapeHtml(row.artist)}</strong><span>“${escapeHtml(row.song)}”</span></div>
    <div class="total-points">${escapeHtml(row.points)}</div>
  </div>`).join('');
}

function renderAudit(rows) {
  if (!rows.length) {
    auditLog.innerHTML = '<div class="audit-empty"><strong>Henüz state-change kaydı yok.</strong><span>Bu yeni audit trail yalnızca confirmation-aware Control Room işlemlerini kaydeder.</span></div>';
    return;
  }

  auditLog.innerHTML = rows.map(row => {
    const labels = {
      voting_opened: ['Voting opened', 'Voting gate yeniden açıldı'],
      voting_closed: ['Voting closed', 'Voting gate kapatıldı'],
      results_revealed: ['Results revealed', 'Public result state açıldı']
    };
    const [title, copy] = labels[row.action] || [row.action || 'State changed', 'Contest state updated'];
    return `<article class="audit-row">
      <span class="audit-dot"></span>
      <div><strong>${escapeHtml(title)}</strong><p>${escapeHtml(copy)}</p></div>
      <time>${row.created_at ? formatAuditTime(row.created_at) : '—'}</time>
    </article>`;
  }).join('');
}

function renderSecretVisibility() {
  totalsTable.hidden = !secretTotalsVisible;
  secretCover.hidden = secretTotalsVisible;
  toggleSecretTotals.textContent = secretTotalsVisible ? 'Gizle' : 'Göster';
  toggleSecretTotals.setAttribute('aria-pressed', String(secretTotalsVisible));
}

function openConfirmation(type) {
  const ed = dashboardData?.edition;
  const readiness = dashboardData?.readiness || {};
  if (!ed || ed.status !== 'current') return;

  const edition = Number(ed.edition_number);
  const complete = Number(readiness.complete_ballot_count || 0);
  const entries = Number(readiness.entry_count || 0);

  if (type === 'voting') {
    const nextOpen = !Boolean(ed.voting_open);
    const phrase = `${nextOpen ? 'OPEN' : 'CLOSE'} ISC ${edition}`;
    pendingAction = { type: 'voting', nextOpen, phrase, edition };
    confirmKicker.textContent = nextOpen ? 'Voting gate · reopen' : 'Voting gate · close';
    confirmTitle.textContent = nextOpen ? 'Voting’i yeniden aç.' : 'Voting’i kapat.';
    confirmCopy.textContent = nextOpen
      ? 'Delegasyonlar voter code ile ballot’larını tekrar açıp kaydedebilecek. Results reveal henüz yapılmadığı için bu işlem geri alınabilir.'
      : 'Bu işlem yeni draft/save/submit hareketlerini durdurur. Reveal yapmadan önce gerekirse voting yeniden açılabilir.';
    confirmImpact.innerHTML = `<span>${complete}/${entries} complete ballots</span><span>${nextOpen ? 'Writes enabled' : 'Writes blocked'}</span>`;
    confirmSubmit.textContent = nextOpen ? 'Voting’i aç' : 'Voting’i kapat';
  } else if (type === 'reveal') {
    if (!readiness.can_reveal) return;
    const phrase = `REVEAL ISC ${edition}`;
    pendingAction = { type: 'reveal', phrase, edition };
    confirmKicker.textContent = 'Public result · irreversible reveal';
    confirmTitle.textContent = 'Sonuçları public yap.';
    confirmCopy.textContent = 'Bu işlem scoreboard, winner ve delegation voting history’yi public results katmanına açar. Control Room bu reveal’i tek yönlü kabul eder; sonradan “hide” işlemi yoktur.';
    confirmImpact.innerHTML = `<span>${complete}/${entries} complete ballots</span><span>Voting closed</span><span>Permanent public reveal</span>`;
    confirmSubmit.textContent = 'Results reveal';
  }

  confirmPhrase.textContent = pendingAction.phrase;
  confirmInput.value = '';
  confirmError.textContent = '';
  confirmSubmit.disabled = true;
  confirmDialog.showModal();
  requestAnimationFrame(() => confirmInput.focus());
}

async function executePendingAction() {
  if (!pendingAction || confirmInput.value !== pendingAction.phrase) return;
  confirmSubmit.disabled = true;
  confirmCancel.disabled = true;
  confirmClose.disabled = true;
  confirmError.textContent = 'İşlem uygulanıyor…';

  try {
    if (pendingAction.type === 'voting') {
      await rpc('isc_admin_set_voting', {
        p_code: adminCode,
        p_edition_number: pendingAction.edition,
        p_open: pendingAction.nextOpen,
        p_confirmation: pendingAction.phrase
      });
      showToast(pendingAction.nextOpen ? 'Voting yeniden açıldı.' : 'Voting kapatıldı.', 'success');
    } else if (pendingAction.type === 'reveal') {
      await rpc('isc_admin_reveal_results', {
        p_code: adminCode,
        p_edition_number: pendingAction.edition,
        p_confirmation: pendingAction.phrase
      });
      showToast('Results public olarak reveal edildi.', 'success');
    }

    confirmDialog.close();
    pendingAction = null;
    await loadDashboard({ edition: selectedEdition, silent: true });
  } catch (err) {
    confirmError.textContent = humanizeError(err?.message || 'İşlem uygulanamadı.');
    confirmSubmit.disabled = confirmInput.value !== pendingAction?.phrase;
  } finally {
    confirmCancel.disabled = false;
    confirmClose.disabled = false;
  }
}

function humanizeError(message) {
  if (/all delegation ballots must be complete/i.test(message)) return 'Tüm delegasyon pusulaları complete olmadan reveal yapılamaz.';
  if (/close voting before revealing/i.test(message)) return 'Reveal’den önce voting kapatılmalı.';
  if (/confirmation phrase/i.test(message)) return 'Confirmation phrase eşleşmedi.';
  if (/archived editions are read-only/i.test(message)) return 'Arşivlenmiş edisyonlar salt okunurdur.';
  if (/results have already been revealed/i.test(message)) return 'Results zaten public olarak reveal edilmiş.';
  return message;
}

function showToast(message, tone = 'success') {
  clearTimeout(toastTimer);
  adminToast.textContent = message;
  adminToast.dataset.tone = tone;
  adminToast.hidden = false;
  toastTimer = setTimeout(() => { adminToast.hidden = true; }, 3600);
}

function logout(message = '') {
  clearInterval(refreshTimer);
  refreshTimer = null;
  adminCode = '';
  dashboardData = null;
  selectedEdition = null;
  pendingAction = null;
  secretTotalsVisible = false;
  setSessionCode('');
  dashboard.hidden = true;
  loginSection.hidden = false;
  adminCodeInput.value = '';
  adminMessage.textContent = message;
  document.title = 'ISC · Contest Admin';
  requestAnimationFrame(() => adminCodeInput.focus());
}

function startAutoRefresh() {
  clearInterval(refreshTimer);
  refreshTimer = setInterval(() => loadDashboard({ edition: selectedEdition, silent: true }), 15000);
}

function formatTime(value) {
  try {
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    }).format(new Date(value));
  } catch (_) {
    return '—';
  }
}

function formatAuditTime(value) {
  try {
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).format(new Date(value));
  } catch (_) {
    return '—';
  }
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}

adminEnter.addEventListener('click', () => login());
adminCodeInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') login();
});

editionSelect.addEventListener('change', async () => {
  const next = Number(editionSelect.value);
  if (!next || next === selectedEdition) return;
  selectedEdition = next;
  secretTotalsVisible = false;
  renderSecretVisibility();
  await loadDashboard({ edition: next, silent: false });
});

refreshDashboard.addEventListener('click', () => loadDashboard({ edition: selectedEdition, silent: false }));
adminLogout.addEventListener('click', () => logout('Admin session kapatıldı.'));
toggleVoting.addEventListener('click', () => openConfirmation('voting'));
revealResults.addEventListener('click', () => openConfirmation('reveal'));
toggleSecretTotals.addEventListener('click', () => {
  secretTotalsVisible = !secretTotalsVisible;
  renderSecretVisibility();
});

confirmInput.addEventListener('input', () => {
  confirmError.textContent = '';
  confirmSubmit.disabled = !pendingAction || confirmInput.value !== pendingAction.phrase;
});
confirmSubmit.addEventListener('click', executePendingAction);
confirmCancel.addEventListener('click', () => { pendingAction = null; });
confirmClose.addEventListener('click', () => { pendingAction = null; });
confirmDialog.addEventListener('close', () => {
  pendingAction = null;
  confirmInput.value = '';
  confirmError.textContent = '';
});
confirmForm.addEventListener('submit', event => event.preventDefault());

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && adminCode && !dashboard.hidden) {
    loadDashboard({ edition: selectedEdition, silent: true });
  }
});

if (adminCode) login({ stored: true });
else requestAnimationFrame(() => adminCodeInput.focus());