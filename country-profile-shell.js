(() => {
  const main = document.getElementById('country-profile-main');
  if (!main || main.children.length) return;

  main.innerHTML = `
    <section class="country-profile-hero">
      <div class="country-shell">
        <div class="country-profile-breadcrumb"><span class="country-kicker">Delegation profile · permanent record</span><a class="country-micro-link" href="../">← All countries</a></div>
        <div class="country-profile-grid">
          <div><p class="country-profile-code">ISC country archive</p><h1 id="country-name">ISC</h1><p id="country-deck" class="country-profile-deck">Country history yükleniyor…</p><div id="country-meta" class="country-profile-meta"></div></div>
          <article id="country-latest-card" class="country-latest-card" aria-live="polite"><div class="country-latest-placeholder">ISC</div><div class="country-latest-copy"><small>Latest appearance</small><h2>Yükleniyor…</h2></div></article>
        </div>
      </div>
    </section>
    <section class="country-stat-section"><div class="country-shell"><div class="country-stat-grid">
      <article class="country-stat"><strong id="stat-appearances">—</strong><span>Appearances</span></article>
      <article class="country-stat"><strong id="stat-debut">—</strong><span>Debut</span></article>
      <article class="country-stat"><strong id="stat-wins">—</strong><span>Wins</span></article>
      <article class="country-stat"><strong id="stat-podiums">—</strong><span>Podiums</span></article>
      <article class="country-stat"><strong id="stat-best">—</strong><span>Best result</span></article>
      <article class="country-stat"><strong id="stat-points">—</strong><span>Revealed points</span></article>
      <article class="country-stat"><strong id="stat-twelves">—</strong><span>12s received / given</span></article>
    </div></div></section>
    <section class="country-section"><div class="country-shell"><div class="country-section-head"><div><span class="country-kicker">Edition history</span><h2>Every appearance.</h2></div><p>Running order, temsilci, şarkı ve yalnızca kamuya açıklanmış final dereceleri kronolojik country record içinde tutulur.</p></div><div id="country-appearance-list" class="country-appearance-list" aria-live="polite"></div></div></section>
    <section class="country-voting-section"><div class="country-shell"><div class="country-section-head"><div><span class="country-kicker">Voting fingerprint</span><h2>Points given. Points received.</h2></div><p>Yalnızca sonuçları açıklanmış edisyonların delegasyon ballot kayıtları kullanılır; devam eden yarışmanın gizli oyları bu profillere sızmaz.</p></div><div class="country-voting-grid"><article class="country-vote-panel"><div class="country-vote-panel-head"><div><span>Received from</span><h3>Who backed this country?</h3></div><span>revealed ballots</span></div><div id="country-received-list" class="country-vote-list"></div></article><article class="country-vote-panel"><div class="country-vote-panel-head"><div><span>Given to</span><h3>Where did the points go?</h3></div><span>revealed ballots</span></div><div id="country-given-list" class="country-vote-list"></div></article></div><article class="country-twelve-section"><div class="country-twelve-head"><div><span class="country-kicker">12-point ledger</span><h3>The maximum-score exchange.</h3></div><p>Exact 12-point transactions are listed by edition and linked directly to the counterpart delegation profile.</p></div><div id="country-twelve-ledger" class="country-twelve-ledger"></div></article></div></section>
    <section class="country-shell"><div id="country-data-note" class="country-data-note"></div></section>`;
})();
