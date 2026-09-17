const SUPABASE_URL = 'https://knwvnbfqnccjiezprrme.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Zw8H9mMmUop7wkYNKtZB3Q_7dM1QHut';
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

let adminCode = sessionStorage.getItem('isc154_admin_code') || '';
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
    const data = await rpc('isc154_admin_dashboard', { p_code: adminCode });
    sessionStorage.setItem('isc154_admin_code', adminCode);
    dashboardData = data;
    loginSection.hidden = true;
    dashboard.hidden = false;
    renderDashboard();
    startAutoRefresh();
  } catch (err) {
    sessionStorage.removeItem('isc154_admin_code');
    adminCode = '';
    adminMessage.textContent = 'Admin code geçersiz.';
  } finally {
    adminEnter.disabled = false;
  }
}

adminEnter.addEventListener('click', login);
adminCodeInput.addEventListener('keydown', e => { if (e.key === 'Enter') login(); });

async function loadDashboard(silent = false) {
  if (!adminCode) return;
  if (!silent) refreshDashboard.disabled = true;
  try {
    dashboardData = await rpc('isc154_admin_dashboard', { p_code: adminCode });
    renderDashboard();
  } catch (err) {
    if (!silent) alert('Control Room verileri yenilenemedi.');
  } finally {
    refreshDashboard.disabled = false;
  }
}

function renderDashboard() {
  const data = dashboardData;
  if (!data) return;
  const open = !!data.edition.voting_open;
  const revealed = !!data.edition.results_revealed;

  votingState.textContent = open ? 'Açık' : 'Kapalı';
  submittedCount.textContent = `${data.submitted_count || 0} / 8`;
  draftCount.textContent = String(data.draft_count || 0);
  resultsState.textContent = revealed ? 'Yayında' : 'Gizli';

  toggleVoting.textContent = open ? 'Oylamayı kapat' : 'Oylamayı aç';
  toggleVoting.classList.toggle('danger', open);
  toggleVoting.disabled = revealed;

  toggleResults.textContent = revealed ? 'Sonuçları gizle' : 'Sonuçları yayınla';
  toggleResults.disabled = !revealed && open;

  countryStatusList.innerHTML = (data.countries || []).map(row => {
    const label = row.status === 'submitted' ? 'Gönderildi' : row.status === 'draft' ? 'Draft' : 'Başlamadı';
    const stamp = row.submitted_at || row.updated_at;
    return `<div class="country-status-row">
      <div class="order">${String(row.running_order).padStart(2,'0')}</div>
      <div class="country">${escapeHtml(row.country)}</div>
      <div class="status-badge ${row.status}">${label}</div>
      <div class="timestamp">${stamp ? formatTime(stamp) : '—'}</div>
    </div>`;
  }).join('');

  totalsTable.innerHTML = (data.totals || []).map((row, i) => `<div class="total-row">
    <div class="total-rank">${i + 1}</div>
    <div class="total-order">#${String(row.running_order).padStart(2,'0')}</div>
    <div class="total-country">${escapeHtml(row.country)}</div>
    <div class="total-entry"><strong>${escapeHtml(row.artist)}</strong><span>${escapeHtml(row.song)}</span></div>
    <div class="total-points">${row.points}</div>
  </div>`).join('');

  lastRefresh.textContent = `Son yenileme · ${new Intl.DateTimeFormat('tr-TR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date())}`;
}

toggleVoting.addEventListener('click', async () => {
  if (!dashboardData) return;
  const current = !!dashboardData.edition.voting_open;
  const next = !current;
  if (!next && !confirm('Oylamayı şimdi kapatmak istediğine emin misin? Seçmenler bundan sonra oy kaydedemez.')) return;
  toggleVoting.disabled = true;
  try {
    await rpc('isc154_admin_set_voting', { p_code: adminCode, p_open: next });
    await loadDashboard(true);
  } catch (err) {
    alert(err.message || 'Oylama durumu değiştirilemedi.');
    renderDashboard();
  }
});

toggleResults.addEventListener('click', async () => {
  if (!dashboardData) return;
  const current = !!dashboardData.edition.results_revealed;
  const next = !current;
  if (next && !confirm('SONUÇLARI YAYINLAMAK üzeresin. Bu işlem sonuçları halka açık hale getirir. Devam edilsin mi?')) return;
  toggleResults.disabled = true;
  try {
    await rpc('isc154_admin_set_results', { p_code: adminCode, p_revealed: next });
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
    return new Intl.DateTimeFormat('tr-TR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(value));
  } catch { return '—'; }
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

if (adminCode) login();