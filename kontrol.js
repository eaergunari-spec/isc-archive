const SUPABASE_URL = 'https://knwvnbfqnccjiezprrme.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Zw8H9mMmUop7wkYNKtZB3Q_7dM1QHut';
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

let adminCode = sessionStorage.getItem('isc_admin_code') || '';
let dashboardData = null;
let refreshTimer = null;

const loginSection = document.getElementById('admin-login');
const dashboard = document.getElementById('dashboard');
const adminCodeInput = document.getElementById('admin-code');
const adminEnter = document.getElementById('admin-enter');
const adminMessage = document.getElementById('admin-message');
const votingState = document.getElementById('voting-state');
const submittedCount = document.getElementById('submitted-count');
const draftCount = document.getElementById('draft-count');
const resultsState = document.getElementById('results-state');
const toggleVoting = document.getElementById('toggle-voting');
const toggleResults = document.getElementById('toggle-results');
const refreshDashboard = document.getElementById('refresh-dashboard');
const countryStatusList = document.getElementById('country-status-list');
const totalsTable = document.getElementById('totals-table');
const lastRefresh = document.getElementById('last-refresh');
const dashboardEditionLabel = document.getElementById('dashboard-edition-label');
const schemeSummary = document.getElementById('scheme-summary');

adminCodeInput.value = adminCode;

async function rpc(name, args) {
  const { data, error } = await db.rpc(name, args);
  if (error) throw error;
  return data;
}

async function login() {
  const code = adminCodeInput.value.trim();
  if (!code) return;
  adminMessage.textContent = 'Doğrulanıyor…';
  adminEnter.disabled = true;
  try {
    adminCode = code;
    const data = await rpc('isc_admin_current_dashboard', { p_code: adminCode });
    sessionStorage.setItem('isc_admin_code', adminCode);
    sessionStorage.removeItem('isc154_admin_code');
    dashboardData = data;
    loginSection.hidden = true;
    dashboard.hidden = false;
    renderDashboard();
    startAutoRefresh();
  } catch (err) {
    sessionStorage.removeItem('isc_admin_code');
    sessionStorage.removeItem('isc154_admin_code');
    adminCode = '';
    adminMessage.textContent = 'Admin code geçersiz veya güncel edisyon bulunamadı.';
  } finally {
    adminEnter.disabled = false;
  }
}

adminEnter.addEventListener('click', login);
adminCodeInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') login();
});

async function loadDashboard(silent = false) {
  if (!adminCode) return;
  if (!silent) refreshDashboard.disabled = true;
  try {
    dashboardData = await rpc('isc_admin_current_dashboard', { p_code: adminCode });
    renderDashboard();
  } catch (err) {
    if (!silent) alert('Control Room verileri yenilenemedi.');
  } finally {
    refreshDashboard.disabled = false;
  }
}

function renderDashboard() {
  const data = dashboardData;
  if (!data?.edition) return;

  const ed = data.edition;
  const scheme = data.voting_scheme || {};
  const open = Boolean(ed.voting_open);
  const revealed = Boolean(ed.results_revealed);
  const entryCount = Number(ed.entry_count || (data.countries || []).length || 0);
  const label = ed.title || `ISC ${ed.edition_number}`;
  const points = (scheme.points || []).map(row => Number(row.points));

  document.title = `${label} · Control Room`;
  dashboardEditionLabel.textContent = `${label} · private dashboard`;
  votingState.textContent = open ? 'Açık' : 'Kapalı';
  submittedCount.textContent = `${data.submitted_count || 0} / ${entryCount}`;
  draftCount.textContent = String(data.draft_count || 0);
  resultsState.textContent = revealed ? 'Yayında' : 'Gizli';

  schemeSummary.textContent = points.length
    ? `Voting scheme · ${points.join('–')} · ${scheme.points_per_ballot || points.reduce((sum, point) => sum + point, 0)} points / ballot · ${scheme.self_vote_allowed ? 'self-vote allowed' : 'self-vote disabled'}`
    : 'Voting scheme bulunamadı.';

  toggleVoting.textContent = open ? 'Oylamayı kapat' : 'Oylamayı aç';
  toggleVoting.classList.toggle('danger', open);
  toggleVoting.disabled = revealed;

  toggleResults.textContent = revealed ? 'Sonuçları gizle' : 'Sonuçları yayınla';
  toggleResults.disabled = !revealed && open;

  countryStatusList.innerHTML = (data.countries || []).map(row => {
    const statusLabel = row.status === 'submitted' ? 'Gönderildi' : row.status === 'draft' ? 'Draft' : 'Başlamadı';
    const stamp = row.submitted_at || row.updated_at;
    return `<div class="country-status-row">
      <div class="order">${String(row.running_order).padStart(2, '0')}</div>
      <div class="country">${escapeHtml(row.country)}</div>
      <div class="status-badge ${escapeHtml(row.status)}">${statusLabel}</div>
      <div class="timestamp">${stamp ? formatTime(stamp) : '—'}</div>
    </div>`;
  }).join('');

  totalsTable.innerHTML = (data.totals || []).map((row, index) => `<div class="total-row">
    <div class="total-rank">${index + 1}</div>
    <div class="total-order">#${String(row.running_order).padStart(2, '0')}</div>
    <div class="total-country">${escapeHtml(row.country)}</div>
    <div class="total-entry"><strong>${escapeHtml(row.artist)}</strong><span>${escapeHtml(row.song)}</span></div>
    <div class="total-points">${row.points}</div>
  </div>`).join('');

  lastRefresh.textContent = `Son yenileme · ${new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date())}`;
}

toggleVoting.addEventListener('click', async () => {
  if (!dashboardData?.edition) return;
  const current = Boolean(dashboardData.edition.voting_open);
  const next = !current;
  if (!next && !confirm('Oylamayı şimdi kapatmak istediğine emin misin? Seçmenler bundan sonra oy kaydedemez.')) return;
  toggleVoting.disabled = true;
  try {
    await rpc('isc_admin_current_set_voting', { p_code: adminCode, p_open: next });
    await loadDashboard(true);
  } catch (err) {
    alert(err.message || 'Oylama durumu değiştirilemedi.');
    renderDashboard();
  }
});

toggleResults.addEventListener('click', async () => {
  if (!dashboardData?.edition) return;
  const current = Boolean(dashboardData.edition.results_revealed);
  const next = !current;
  if (next && !confirm('SONUÇLARI YAYINLAMAK üzeresin. Bu işlem güncel edisyon sonuçlarını halka açık hale getirir. Devam edilsin mi?')) return;
  toggleResults.disabled = true;
  try {
    await rpc('isc_admin_current_set_results', { p_code: adminCode, p_revealed: next });
    await loadDashboard(true);
  } catch (err) {
    alert(err.message || 'Sonuç durumu değiştirilemedi.');
    renderDashboard();
  }
});

refreshDashboard.addEventListener('click', () => loadDashboard(false));

function startAutoRefresh() {
  clearInterval(refreshTimer);
  refreshTimer = setInterval(() => loadDashboard(true), 15000);
}

function formatTime(value) {
  try {
    return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
  } catch {
    return '—';
  }
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}

if (adminCode) login();
