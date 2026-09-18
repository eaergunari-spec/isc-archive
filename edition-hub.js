(() => {
  const SUPABASE_URL = 'https://knwvnbfqnccjiezprrme.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_Zw8H9mMmUop7wkYNKtZB3Q_7dM1QHut';
  const editionNumber = Number(document.body.dataset.edition || 0);
  if (!editionNumber) return;

  const endpoint = `${SUPABASE_URL}/rest/v1/rpc/isc_public_edition_hub`;
  let payload = null;
  let lastFocused = null;

  const el = id => document.getElementById(id);
  const siteHeader = document.querySelector('.site-header');

  function syncHeaderOffset() {
    const height = siteHeader?.offsetHeight || 61;
    document.documentElement.style.setProperty('--hub-header-height', `${Math.ceil(height)}px`);
  }
  const escapeHtml = value => String(value ?? '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');

  const internalHref = value => {
    if (!value) return '#';
    if (/^https?:/i.test(value)) return value;
    return `../../${String(value).replace(/^\/+/, '')}`;
  };

  const countryHref = slug => slug ? `../../countries/${encodeURIComponent(slug)}/` : '../../countries/';

  async function fetchHub() {
    const response = await fetch(endpoint, {
      method:'POST',
      headers:{
        apikey:SUPABASE_KEY,
        Authorization:`Bearer ${SUPABASE_KEY}`,
        'Content-Type':'application/json'
      },
      body:JSON.stringify({p_edition_number:editionNumber})
    });
    if (!response.ok) throw new Error(`Edition hub RPC failed: ${response.status}`);
    return response.json();
  }

  function statusLabel(ed) {
    if (ed.results_revealed) return 'RESULTS LIVE';
    if (ed.voting_open) return 'VOTING OPEN NOW';
    if (ed.is_current) return 'VOTING CLOSED · RESULTS PENDING';
    return 'ARCHIVED EDITION';
  }

  function applyMeta(data) {
    const ed = data.edition;
    const label = ed.title || `ISC ${ed.edition_number}`;
    document.title = `${label} — Edition Hub`;
    document.querySelector('meta[name="description"]')?.setAttribute('content', `${label}: ${ed.entry_count} entry, playlists, voting status, magazine and results.`);
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', `${label} — Edition Hub`);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', `${ed.entry_count} ülke, ${ed.entry_count} şarkı. ${label} için line-up, playlist, voting ve results tek merkezde.`);
  }

  function renderHero(data) {
    const ed=data.edition;
    const scheme=data.voting_scheme || {};
    const entries=data.entries || [];
    const label=ed.title || `ISC ${ed.edition_number}`;
    const pill=el('hub-live-pill');
    pill.classList.toggle('results',Boolean(ed.results_revealed));
    pill.classList.toggle('closed',!ed.voting_open && !ed.results_revealed);
    pill.innerHTML=`<i></i> ${escapeHtml(statusLabel(ed))}`;

    el('hub-kicker').textContent=`International Song Contest · ${ed.is_current ? 'Current edition' : 'Edition archive'}`;
    el('hub-edition-number').textContent=ed.edition_number;
    el('hub-hero-deck').textContent=ed.results_revealed
      ? `${ed.entry_count} ülke. ${ed.entry_count} şarkı. ${label} sonuçları ve tüm edisyon kaydı tek yerde.`
      : `${ed.entry_count} ülke. ${ed.entry_count} şarkı. Dinle, entry dosyalarını keşfet ve ${ed.voting_open ? 'oyunu gönder.' : 'sonuçları bekle.'}`;

    el('hero-stat-entries').textContent=String(ed.entry_count);
    el('hero-stat-points').textContent=String(scheme.points_per_ballot || '—');
    el('hero-stat-submitted').textContent=`${ed.submitted_delegations}/${ed.entry_count}`;
    el('hero-stat-results').textContent=ed.results_revealed ? 'LIVE' : 'LOCKED';

    const vote=el('hub-vote-cta');
    const results=el('hub-results-cta');
    const headerResults=el('hub-header-results');
    if (headerResults) {
      headerResults.textContent=ed.results_revealed ? 'Results' : 'Results 🔒';
      headerResults.classList.toggle('results-live-link',Boolean(ed.results_revealed));
    }
    if (ed.is_current && ed.voting_open) {
      vote.hidden=false;
      vote.textContent='VOTING ROOM →';
    } else {
      vote.hidden=true;
    }
    results.textContent=ed.results_revealed ? 'RESULTS HUB →' : 'RESULTS STATUS →';

    const preferred=[3,5,8];
    let galleryEntries=preferred.map(order=>entries.find(e=>Number(e.running_order)===order)).filter(Boolean);
    if (galleryEntries.length<3) galleryEntries=entries.slice(0,3);
    el('hub-hero-gallery').innerHTML=galleryEntries.map(entry=>`
      <a class="hub-hero-card" href="${escapeHtml(internalHref(entry.detail_url))}">
        <img src="${escapeHtml(internalHref(entry.image_url))}" style="object-position:${escapeHtml(entry.image_focus || '50% 50%')}" alt="${escapeHtml(entry.artist)}" />
        <div class="hub-hero-card-copy">
          <span>${String(entry.running_order).padStart(2,'0')} · ${escapeHtml(entry.country)}</span>
          <strong>${escapeHtml(entry.artist)}</strong>
          <small>${escapeHtml(entry.song)}</small>
        </div>
      </a>
    `).join('');
  }

  function renderLiveRail(data) {
    const ed=data.edition;
    const points=(data.voting_scheme?.points || []).map(p=>Number(p.points)).join(' · ');
    el('rail-voting-title').textContent=ed.voting_open ? 'Oylama açık' : 'Oylama kapalı';
    el('rail-voting-copy').textContent=ed.voting_open
      ? `${points} puan sistemi · kendi entry’ne oy yok.`
      : (ed.results_revealed ? 'Final sonuçlar açıklanmış durumda.' : 'Yeni oy kabul edilmiyor.');

    el('rail-ballots-title').textContent=`${ed.submitted_delegations} / ${ed.entry_count}`;
    el('rail-ballots-copy').textContent='delegasyon resmi pusulasını gönderdi.';

    el('rail-results-title').textContent=ed.results_revealed ? 'Results live' : 'Results locked';
    el('rail-results-copy').textContent=ed.results_revealed
      ? 'Scoreboard ve delegasyon pusulaları yayında.'
      : 'Reveal anına kadar toplam puanlar gizli.';
  }

  function renderParticipants(data) {
    const entries=data.entries || [];
    el('participants-count').textContent=`${entries.length} entry · running order 01–${String(entries.length).padStart(2,'0')}`;
    el('hub-entry-grid').innerHTML=entries.map(entry=>`
      <article class="hub-entry-card">
        <a class="hub-entry-media" href="${escapeHtml(internalHref(entry.detail_url))}" aria-label="${escapeHtml(entry.artist)} — ${escapeHtml(entry.song)}">
          <img src="${escapeHtml(internalHref(entry.image_url))}" style="object-position:${escapeHtml(entry.image_focus || '50% 50%')}" alt="${escapeHtml(entry.artist)}" loading="lazy" decoding="async" />
          <span class="hub-entry-order">${String(entry.running_order).padStart(2,'0')}</span>
        </a>
        ${entry.video_id ? `<button type="button" class="hub-entry-play" data-video="${escapeHtml(entry.video_id)}" data-entry-id="${entry.id}" aria-label="${escapeHtml(entry.artist)} videosunu aç">▶</button>` : ''}
        <div class="hub-entry-copy">
          <a class="hub-entry-country" href="${countryHref(entry.country_slug)}">${escapeHtml(entry.country)}</a>
          <h3>${escapeHtml(entry.artist)}</h3>
          <p>${escapeHtml(entry.song)}</p>
          <a class="hub-entry-file" href="${escapeHtml(internalHref(entry.detail_url))}">ENTRY FILE →</a>
        </div>
      </article>
    `).join('');
  }

  function setupPlatform(provider,item,data) {
    const card=el(`${provider}-hub-card`);
    if (!card) return;
    if (!item?.canonical_url) {
      card.hidden=true;
      return;
    }
    card.hidden=false;
    el(`${provider}-hub-meta`).textContent=`${data.edition.entry_count} songs · ${data.edition.title}`;
    el(`${provider}-hub-open`).href=item.canonical_url;
    const button=el(`${provider}-hub-button`);
    const host=el(`${provider}-hub-host`);
    if (!button || button.dataset.bound) return;
    button.dataset.bound='1';
    button.addEventListener('click',()=>{
      if (!item.embed_url) {
        window.open(item.canonical_url,'_blank','noopener');
        return;
      }
      const iframe=document.createElement('iframe');
      iframe.src=item.embed_url;
      iframe.title=item.title || `${provider} playlist`;
      iframe.loading='lazy';
      iframe.allow=provider==='youtube'
        ? 'autoplay; encrypted-media; picture-in-picture'
        : 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
      iframe.allowFullscreen=true;
      host.replaceChildren(iframe);
    });
  }

  function renderListen(data) {
    const media=data.media || [];
    setupPlatform('youtube',media.find(x=>x.provider==='youtube' && x.media_type==='playlist'),data);
    setupPlatform('spotify',media.find(x=>x.provider==='spotify' && x.media_type==='playlist'),data);
  }

  function renderResults(data) {
    const ed=data.edition;
    const submitted=Number(ed.submitted_delegations || 0);
    const total=Math.max(1,Number(ed.entry_count || 0));
    const pct=Math.min(100,(submitted/total)*100);
    const title=el('hub-results-title');
    const copy=el('hub-results-copy');
    const side=el('hub-results-side');

    if (ed.results_revealed) {
      title.textContent='The results are live.';
      copy.textContent='Final scoreboard, delegasyon pusulaları ve voting matrix artık Results Hub’da yayında.';
      el('hub-results-primary').textContent='RESULTS HUB →';
      if (data.winner) {
        const w=data.winner;
        side.innerHTML=`<div class="hub-winner">
          ${w.image_url ? `<img src="${escapeHtml(internalHref(w.image_url))}" alt="${escapeHtml(w.artist)}" />` : ''}
          <div><small>${escapeHtml(data.edition.title)} WINNER</small><strong>${escapeHtml(w.artist)}</strong><span>${escapeHtml(w.country)} · ${escapeHtml(w.song)} · ${escapeHtml(w.points)} pts</span></div>
        </div>`;
      } else {
        side.innerHTML='<div class="hub-results-progress"><span>Results</span><strong>LIVE</strong></div>';
      }
    } else {
      title.textContent=ed.voting_open ? 'Results stay backstage.' : 'Voting is closed. Results are next.';
      copy.textContent=ed.voting_open
        ? 'Oylama sürerken toplam puanlar ve delegasyon pusulaları gizli kalır. Reveal açıldığında bu alan otomatik olarak sonuç durumuna geçer.'
        : 'Yeni oy kabul edilmiyor. Results Hub reveal açılana kadar kilitli kalacak.';
      el('hub-results-primary').textContent='RESULTS STATUS →';
      side.innerHTML=`<div class="hub-results-progress">
        <div class="hub-results-progress-head"><div><span>Submitted ballots</span><strong>${submitted}/${total}</strong></div><span>${ed.voting_open ? 'VOTING OPEN' : 'VOTING CLOSED'}</span></div>
        <div class="hub-progress-track"><i style="width:${pct}%"></i></div>
      </div>`;
    }

    const voteGhost=el('hub-results-vote');
    voteGhost.hidden=!(ed.is_current && ed.voting_open);
  }

  function setupPlayer(data) {
    const player=el('hub-player');
    const frame=el('hub-player-frame');
    const grid=el('hub-entry-grid');
    if (!player || !grid || grid.dataset.playerBound) return;
    grid.dataset.playerBound='1';

    grid.addEventListener('click',event=>{
      const button=event.target.closest('.hub-entry-play');
      if (!button) return;
      const entry=(data.entries || []).find(x=>Number(x.id)===Number(button.dataset.entryId));
      if (!entry?.video_id) return;
      lastFocused=button;
      el('hub-player-kicker').textContent=`${data.edition.title} · ENTRY ${String(entry.running_order).padStart(2,'0')} · ${entry.country}`;
      el('hub-player-title').textContent=entry.artist;
      el('hub-player-song').textContent=`“${entry.song}”`;
      const iframe=document.createElement('iframe');
      iframe.src=`https://www.youtube-nocookie.com/embed/${encodeURIComponent(entry.video_id)}?autoplay=1&rel=0&modestbranding=1`;
      iframe.title=`${entry.artist} — ${entry.song}`;
      iframe.allow='autoplay; encrypted-media; picture-in-picture';
      iframe.allowFullscreen=true;
      frame.replaceChildren(iframe);
      player.hidden=false;
      document.body.classList.add('hub-player-open');
      requestAnimationFrame(()=>player.classList.add('open'));
      player.querySelector('.hub-player-close')?.focus();
    });

    const close=()=>{
      if (player.hidden) return;
      player.classList.remove('open');
      frame.replaceChildren();
      document.body.classList.remove('hub-player-open');
      setTimeout(()=>{
        player.hidden=true;
        lastFocused?.focus();
      },180);
    };
    player.addEventListener('click',event=>{if(event.target.closest('[data-hub-player-close]')) close();});
    document.addEventListener('keydown',event=>{if(event.key==='Escape' && !player.hidden) close();});
  }

  function setupSectionNav() {
    const links=[...document.querySelectorAll('.edition-subnav a[href^="#"]')];
    const sections=links.map(link=>document.querySelector(link.getAttribute('href'))).filter(Boolean);
    if (!('IntersectionObserver' in window) || !sections.length) return;
    const observer=new IntersectionObserver(entries=>{
      const visible=entries.filter(x=>x.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
      if (!visible) return;
      links.forEach(link=>link.classList.toggle('active',link.getAttribute('href')===`#${visible.target.id}`));
    },{rootMargin:'-25% 0px -60% 0px',threshold:[0,.15,.35]});
    sections.forEach(section=>observer.observe(section));
  }

  function renderAll(data) {
    payload=data;
    applyMeta(data);
    renderHero(data);
    renderLiveRail(data);
    renderParticipants(data);
    renderListen(data);
    renderResults(data);
    setupPlayer(data);
  }

  async function init() {
    syncHeaderOffset();
    window.addEventListener('resize',syncHeaderOffset,{passive:true});
    if ('ResizeObserver' in window && siteHeader) {
      new ResizeObserver(syncHeaderOffset).observe(siteHeader);
    }
    try {
      const data=await fetchHub();
      if (!data?.ok) throw new Error(data?.reason || 'Edition unavailable');
      renderAll(data);
      setupSectionNav();
      setInterval(async()=>{
        try {
          const fresh=await fetchHub();
          if (!fresh?.ok) return;
          payload=fresh;
          renderHero(fresh);
          renderLiveRail(fresh);
          renderResults(fresh);
        } catch (_) {}
      },20000);
    } catch (error) {
      console.error('Edition hub failed',error);
      el('hub-live-pill').innerHTML='<i></i> EDITION UNAVAILABLE';
      el('hub-hero-deck').textContent='Bu edisyonun verileri şu anda yüklenemiyor.';
    }
  }

  init();
})();