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

const entryGrid = document.getElementById("entry-grid");

if (entryGrid) {
  entryGrid.innerHTML = entries.map((entry) => {
    const maxres = `https://i.ytimg.com/vi/${entry.video}/maxresdefault.jpg`;
    const fallback = `https://i.ytimg.com/vi/${entry.video}/hqdefault.jpg`;
    return `
      <a class="entry-card" href="entries/${entry.slug}.html" aria-label="Entry ${entry.order}: ${entry.artist} — ${entry.song}">
        <div class="entry-card-image-wrap">
          <img class="entry-card-image" style="object-position:${entry.focus}" src="${maxres}" alt="${entry.artist}" loading="lazy" onerror="this.onerror=null;this.src='${fallback}'">
          <div class="entry-card-shade"></div>
          <div class="entry-play" aria-hidden="true">▶</div>
        </div>
        <div class="entry-card-top">
          <span class="entry-country">${entry.country}</span>
          <span class="entry-no">${entry.order}</span>
        </div>
        <div class="entry-meta">
          <div class="entry-artist">${entry.artist}</div>
          <div class="entry-song">${entry.song}</div>
          <span class="entry-link">DOSYAYI AÇ →</span>
        </div>
      </a>
    `;
  }).join("");
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
