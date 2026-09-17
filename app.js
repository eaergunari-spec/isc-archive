const entries = [
  { order: "01", country: "ROLIPEA", artist: "Lambrini Girls", song: "Cuntology 101", slug: "01-lambrini-girls", video: "20TDd19oA1Q" },
  { order: "02", country: "VERDE VERANO", artist: "Élise de Lune", song: "Bonne Nuit", slug: "02-elise-de-lune", video: "TnThIGhFn5Q" },
  { order: "03", country: "GÜNEŞ DİYARI", artist: "Meira Omar & LIAMOO", song: "MAZAA", slug: "03-meira-omar-liamoo", video: "oFO8UkkCd8Q" },
  { order: "04", country: "SUPERLAND", artist: "Saint Levant", song: "Nails", slug: "04-saint-levant", video: "J7e70aw_x_E" },
  { order: "05", country: "KIRMIZI", artist: "HAYQ", song: "Mi Patmutyun / Մի պատմություն", slug: "05-hayq", video: "eePl9riu0r4" },
  { order: "06", country: "CABURYA", artist: "Laura Pausini", song: "¿PORQUÉ TE VAS?", slug: "06-laura-pausini", video: "MjwPS-lfbhU" },
  { order: "07", country: "STJOHN", artist: "Audrey Hobert", song: "Bowling alley", slug: "07-audrey-hobert", video: "ohh3-7FCzkQ" },
  { order: "08", country: "UZANMIŞIM KUMSALA", artist: "GALENA", song: "CHATGPT", slug: "08-galena", video: "2GCBHSnvJik" }
];

const entryGrid = document.getElementById("entry-grid");

if (entryGrid) {
  entryGrid.innerHTML = entries.map((entry) => {
    const maxres = `https://i.ytimg.com/vi/${entry.video}/maxresdefault.jpg`;
    const fallback = `https://i.ytimg.com/vi/${entry.video}/hqdefault.jpg`;
    return `
      <a class="entry-card" href="entries/${entry.slug}.html" aria-label="Entry ${entry.order}: ${entry.artist} — ${entry.song}">
        <div class="entry-card-image-wrap">
          <img class="entry-card-image" src="${maxres}" alt="${entry.artist}" loading="lazy" onerror="this.onerror=null;this.src='${fallback}'">
          <div class="entry-card-shade"></div>
        </div>
        <div class="entry-card-top">
          <span class="entry-country">${entry.country}</span>
          <span class="entry-no">${entry.order}</span>
        </div>
        <div class="entry-meta">
          <div class="entry-artist">${entry.artist}</div>
          <div class="entry-song">${entry.song}</div>
          <span class="entry-link">ENTRY ${entry.order} →</span>
        </div>
      </a>
    `;
  }).join("");
}
