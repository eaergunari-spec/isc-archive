const entries = [
  { order: "01", country: "ROLIPEA", artist: "Lambrini Girls", song: "Cuntology 101", slug: "01-lambrini-girls", video: "20TDd19oA1Q", focus: "50% 43%" },
  { order: "02", country: "VERDE VERANO", artist: "Élise de Lune", song: "Bonne Nuit", slug: "02-elise-de-lune", video: "TnThIGhFn5Q", focus: "50% 42%" },
  { order: "03", country: "GÜNEŞ DİYARI", artist: "Meira Omar & LIAMOO", song: "MAZAA", slug: "03-meira-omar-liamoo", video: "oFO8UkkCd8Q", focus: "50% 40%" },
  { order: "04", country: "SUPERLAND", artist: "Saint Levant", song: "Nails", slug: "04-saint-levant", video: "J7e70aw_x_E", focus: "50% 38%" },
  { order: "05", country: "KIRMIZI", artist: "HAYQ", song: "Mi Patmutyun / Մի պատմություն", slug: "05-hayq", video: "QGMFry9eKNc", focus: "50% 43%" },
  { order: "06", country: "CABURYA", artist: "Laura Pausini", song: "¿PORQUÉ TE VAS?", slug: "06-laura-pausini", video: "MjwPS-lfbhU", focus: "50% 38%" },
  { order: "07", country: "STJOHN", artist: "Audrey Hobert", song: "Bowling alley", slug: "07-audrey-hobert", video: "ohh3-7FCzkQ", focus: "50% 42%" },
  { order: "08", country: "UZANMIŞIM KUMSALA", artist: "GALENA", song: "CHATGPT", slug: "08-galena", video: "2GCBHSnvJik", focus: "50% 38%" }
];

const escapeAttr = (value) => String(value)
  .replace(/&/g, "&amp;")
  .replace(/"/g, "&quot;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;");

const LIVE_STATUS_URL = "https://knwvnbfqnccjiezprrme.supabase.co/rest/v1/rpc/isc154_public_live_status";
const LIVE_STATUS_KEY = "sb_publishable_Zw8H9mMmUop7wkYNKtZB3Q_7dM1QHut";
let liveStatus = {
  edition_number: 154,
  voting_open: true,
  results_revealed: false,
  delegations: 8,
  submitted_delegations: 0,
  last_submitted_at: null
};
let currentFeaturedEntry = entries[2];
let nowPlayingEntry = null;

function relativeActivityTime(iso) {
  if (!iso) return "Henüz tamamlanmış oy gelmedi";
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 45) return "Az önce bir oy gönderildi";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Son oy ${minutes} dk önce geldi`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Son oy ${hours} sa önce geldi`;
  const days = Math.floor(hours / 24);
  return `Son oy ${days} gün önce geldi`;
}

function buildTickerGroup() {
  const spotlight = nowPlayingEntry || currentFeaturedEntry;
  const spotlightLabel = nowPlayingEntry ? "NOW PLAYING" : "NOW FEATURED";
  const submitted = Number(liveStatus.submitted_delegations || 0);
  const delegations = Number(liveStatus.delegations || 8);
  const votingLabel = liveStatus.voting_open ? "VOTING OPEN" : "VOTING CLOSED";
  const votingClass = liveStatus.voting_open ? "lime" : "pink";
  const resultsLabel = liveStatus.results_revealed ? "RESULTS LIVE" : "RESULTS LOCKED";
  const resultsText = liveStatus.results_revealed ? "Scoreboard artık yayında" : "Toplam puanlar reveal anına kadar gizli";

  return `
    <div class="ticker-item ticker-spotlight">
      <span class="ticker-status-badge">${spotlightLabel}</span>
      <span class="ticker-no">${spotlight.order}</span>
      <span class="ticker-country">${escapeAttr(spotlight.country)}</span>
      <span class="ticker-artist">${escapeAttr(spotlight.artist)}</span>
      <span class="ticker-song">“${escapeAttr(spotlight.song)}”</span>
    </div>
    <div class="ticker-item ticker-status ${votingClass}">
      <span class="ticker-status-badge">${votingLabel}</span>
      <span class="ticker-count">${submitted}/${delegations}</span>
      <span class="ticker-status-text">delegasyon oyunu gönderdi</span>
    </div>
    <div class="ticker-item ticker-status">
      <span class="ticker-status-badge">BALLOT WATCH</span>
      <span class="ticker-status-text">${relativeActivityTime(liveStatus.last_submitted_at)}</span>
    </div>
    <a class="ticker-item ticker-editorial" href="entries/03-meira-omar-liamoo.html">
      <span class="ticker-status-badge">MAGAZINE</span>
      <span class="ticker-status-text">Cover story · MAZAA’nın dünyasına gir →</span>
    </a>
    <a class="ticker-item ticker-editorial" href="#listen">
      <span class="ticker-status-badge">PLAYLIST LIVE</span>
      <span class="ticker-status-text">8 entry · YouTube + Spotify →</span>
    </a>
    <div class="ticker-item ticker-status ${liveStatus.results_revealed ? "lime" : "pink"}">
      <span class="ticker-status-badge">${resultsLabel}</span>
      <span class="ticker-status-text">${resultsText}</span>
    </div>
    <div class="ticker-item ticker-status ticker-data-note">
      <span class="ticker-status-badge">LIVE DATA</span>
      <span class="ticker-status-text">Oylama durumu otomatik yenileniyor</span>
    </div>
  `;
}

function renderLiveTicker() {
  const groups = document.querySelectorAll(".ticker-group");
  if (!groups.length) return;
  const html = buildTickerGroup();
  groups.forEach((group, index) => {
    group.innerHTML = html;
    if (index > 0) group.setAttribute("aria-hidden", "true");
  });
}

async function refreshLiveStatus() {
  try {
    const response = await fetch(LIVE_STATUS_URL, {
      method: "POST",
      headers: {
        apikey: LIVE_STATUS_KEY,
        Authorization: `Bearer ${LIVE_STATUS_KEY}`,
        "Content-Type": "application/json"
      },
      body: "{}"
    });
    if (!response.ok) return;
    const data = await response.json();
    if (data && typeof data === "object") {
      liveStatus = { ...liveStatus, ...data };
      renderLiveTicker();
    }
  } catch (_) {
    // Keep the last known public status if the network is temporarily unavailable.
  }
}

renderLiveTicker();
refreshLiveStatus();
setInterval(refreshLiveStatus, 20000);
setInterval(renderLiveTicker, 60000);

const entryGrid = document.getElementById("entry-grid");

if (entryGrid) {
  entryGrid.innerHTML = entries.map((entry) => {
    const maxres = `https://i.ytimg.com/vi/${entry.video}/maxresdefault.jpg`;
    const fallback = `https://i.ytimg.com/vi/${entry.video}/hqdefault.jpg`;
    return `
      <article class="entry-card" data-entry="${entry.order}">
        <a class="entry-card-primary" href="entries/${entry.slug}.html" aria-label="Entry ${entry.order}: ${escapeAttr(entry.artist)} — ${escapeAttr(entry.song)} dosyasını aç">
          <div class="entry-card-image-wrap">
            <img class="entry-card-image" style="object-position:${entry.focus}" src="${maxres}" alt="${escapeAttr(entry.artist)}" loading="lazy" onerror="this.onerror=null;this.src='${fallback}'">
            <div class="entry-card-shade"></div>
          </div>
          <div class="entry-card-top">
            <span class="entry-country">${entry.country}</span>
            <span class="entry-no">${entry.order}</span>
          </div>
          <div class="entry-meta">
            <div class="entry-artist">${entry.artist}</div>
            <div class="entry-song">${entry.song}</div>
          </div>
        </a>
        <div class="entry-card-actions" aria-label="${escapeAttr(entry.artist)} actions">
          <button class="entry-listen" type="button" data-video="${entry.video}" data-order="${entry.order}" data-country="${escapeAttr(entry.country)}" data-artist="${escapeAttr(entry.artist)}" data-song="${escapeAttr(entry.song)}">
            <span class="entry-listen-icon">▶</span><span>DİNLE / İZLE</span>
          </button>
          <a class="entry-read" href="entries/${entry.slug}.html">DOSYAYI AÇ <span>→</span></a>
        </div>
      </article>
    `;
  }).join("");

  const modal = document.createElement("div");
  modal.className = "entry-player-modal";
  modal.hidden = true;
  modal.innerHTML = `
    <div class="entry-player-backdrop" data-close-player></div>
    <section class="entry-player-shell" role="dialog" aria-modal="true" aria-labelledby="entry-player-title">
      <div class="entry-player-topbar">
        <div>
          <span class="entry-player-kicker" id="entry-player-kicker">ISC 154 · ENTRY</span>
          <h2 id="entry-player-title"></h2>
          <p id="entry-player-song"></p>
        </div>
        <button class="entry-player-close" type="button" data-close-player aria-label="Videoyu kapat">×</button>
      </div>
      <div class="entry-player-frame-wrap">
        <iframe id="entry-player-frame" title="ISC 154 entry video" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>
      </div>
      <div class="entry-player-footer">
        <span id="entry-player-country"></span>
        <span>ESC ile kapat</span>
      </div>
    </section>
  `;
  document.body.appendChild(modal);

  const frame = modal.querySelector("#entry-player-frame");
  const title = modal.querySelector("#entry-player-title");
  const song = modal.querySelector("#entry-player-song");
  const country = modal.querySelector("#entry-player-country");
  const kicker = modal.querySelector("#entry-player-kicker");
  let lastFocused = null;

  function openPlayer(button) {
    lastFocused = button;
    const video = button.dataset.video;
    nowPlayingEntry = entries.find((entry) => entry.order === button.dataset.order) || null;
    renderLiveTicker();
    title.textContent = button.dataset.artist;
    song.textContent = `“${button.dataset.song}”`;
    country.textContent = button.dataset.country;
    kicker.textContent = `ISC 154 · ENTRY ${button.dataset.order}`;
    frame.src = `https://www.youtube.com/embed/${video}?autoplay=1&rel=0&modestbranding=1`;
    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add("is-open"));
    document.body.classList.add("player-open");
    modal.querySelector(".entry-player-close").focus();
  }

  function closePlayer() {
    if (modal.hidden) return;
    modal.classList.remove("is-open");
    document.body.classList.remove("player-open");
    frame.src = "";
    nowPlayingEntry = null;
    renderLiveTicker();
    setTimeout(() => {
      modal.hidden = true;
      if (lastFocused) lastFocused.focus();
    }, 220);
  }

  entryGrid.addEventListener("click", (event) => {
    const button = event.target.closest(".entry-listen");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    openPlayer(button);
  });

  modal.addEventListener("click", (event) => {
    if (event.target.closest("[data-close-player]")) closePlayer();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) closePlayer();
  });
}

const heroImage = document.getElementById("hero-feature-image");
const heroOrder = document.getElementById("hero-feature-order");
const heroArtist = document.getElementById("hero-feature-artist");
const heroCountry = document.getElementById("hero-feature-country");
const heroSong = document.getElementById("hero-feature-song");

if (heroImage && heroOrder && heroArtist && heroCountry && heroSong) {
  let featureIndex = 2;

  function setFeatured(entry) {
    const maxres = `https://i.ytimg.com/vi/${entry.video}/maxresdefault.jpg`;
    const fallback = `https://i.ytimg.com/vi/${entry.video}/hqdefault.jpg`;

    currentFeaturedEntry = entry;
    if (!nowPlayingEntry) renderLiveTicker();
    heroImage.classList.add("is-changing");
    setTimeout(() => {
      heroImage.src = maxres;
      heroImage.onerror = () => {
        heroImage.onerror = null;
        heroImage.src = fallback;
      };
      heroImage.style.objectPosition = entry.focus;
      heroOrder.textContent = entry.order;
      heroArtist.textContent = entry.artist;
      heroCountry.textContent = entry.country;
      heroSong.textContent = entry.song;
      heroImage.classList.remove("is-changing");
    }, 260);
  }

  setInterval(() => {
    featureIndex = (featureIndex + 1) % entries.length;
    setFeatured(entries[featureIndex]);
  }, 5200);
}
