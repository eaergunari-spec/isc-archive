/* ISC 156 submission-window notice. Server-side Supabase gate is authoritative. */
(() => {
  const deadline = Date.parse('2026-11-11T14:00:00Z'); // 17:00 Europe/Istanbul
  if (!Number.isFinite(deadline)) return;
  const one = (q) => document.querySelector(q);

  function sync() {
    const closed = Date.now() >= deadline;
    if (!closed) return;
    const nav = one('.site-header .nav-vote');
    if (nav) nav.textContent = 'SUBMISSIONS CLOSED ↗';
    const heroStatus = one('.hero-deadline-156 strong');
    if (heroStatus) heroStatus.textContent = 'SUBMISSIONS CLOSED';
    const heroLink = one('.hero-actions-156 .hero-button.primary');
    if (heroLink) heroLink.innerHTML = 'VIEW ENTRY DESK <span aria-hidden="true">→</span>';
    const kicker = one('.submission-open-eyebrow');
    if (kicker) kicker.innerHTML = '<i aria-hidden="true"></i> ISC 156 · SUBMISSIONS CLOSED';
    const copy = one('.submission-open-copy p');
    if (copy) copy.textContent = 'ISC 156 şarkı başvuruları 11 Kasım 2026 saat 17.00 TSİ itibarıyla kapandı. Delegasyonlar kayıt durumlarını başvuru masasından görüntüleyebilir.';
    const button = one('.submission-open-button');
    if (button) button.innerHTML = 'VIEW ENTRY DESK <span aria-hidden="true">→</span>';
    const progress = one('.road-steps-156 article.active');
    if (progress && progress.textContent.includes('Submissions')) {
      progress.classList.remove('active');
      const tag = progress.querySelector('small');
      if (tag) tag.textContent = '02 · COMPLETE';
    }
  }
  sync();
  setInterval(sync, 60 * 1000);
})();