(() => {
  const link = document.querySelector('[data-results-link]');
  if (!link) return;

  const url = 'https://knwvnbfqnccjiezprrme.supabase.co/rest/v1/rpc/isc_public_current_live_status';
  const key = 'sb_publishable_Zw8H9mMmUop7wkYNKtZB3Q_7dM1QHut';

  async function refresh() {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: '{}'
      });
      if (!response.ok) return;
      const data = await response.json();
      if (!data?.ok) return;
      const revealed = Boolean(data.results_revealed);
      link.textContent = revealed ? 'Results' : 'Results 🔒';
      link.classList.toggle('results-live-link', revealed);
    } catch (_) {}
  }

  refresh();
  setInterval(refresh, 20000);
})();
