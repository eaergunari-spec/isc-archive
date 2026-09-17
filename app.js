const entries = [
  { order: "01", country: "ROLIPEA", artist: "Lambrini Girls", song: "Cuntology 101", slug: "01-lambrini-girls", image: "01-lambrini-girls.webp" },
  { order: "02", country: "VERDE VERANO", artist: "Élise de Lune", song: "Bonne Nuit", slug: "02-elise-de-lune", image: "02-elise-de-lune.webp" },
  { order: "03", country: "GÜNEŞ DİYARI", artist: "Meira Omar & LIAMOO", song: "MAZAA", slug: "03-meira-omar-liamoo", image: "03-meira-omar-liamoo.webp" },
  { order: "04", country: "SUPERLAND", artist: "Saint Levant", song: "Nails", slug: "04-saint-levant", image: "04-saint-levant.webp" },
  { order: "05", country: "KIRMIZI", artist: "HAYQ", song: "Mi Patmutyun / Մի պատմություն", slug: "05-hayq", image: "05-hayq.webp" },
  { order: "06", country: "CABURYA", artist: "Laura Pausini", song: "¿PORQUÉ TE VAS?", slug: "06-laura-pausini", image: "06-laura-pausini.webp" },
  { order: "07", country: "STJOHN", artist: "Audrey Hobert", song: "Bowling alley", slug: "07-audrey-hobert", image: "07-audrey-hobert.webp" },
  { order: "08", country: "UZANMIŞIM KUMSALA", artist: "GALENA", song: "CHATGPT", slug: "08-galena", image: "08-galena.webp" }
];

const entryGrid = document.getElementById("entry-grid");

if (entryGrid) {
  entryGrid.innerHTML = entries.map((entry) => `
    <a class="entry-card" href="entries/${entry.slug}.html" aria-label="Entry ${entry.order}: ${entry.artist} — ${entry.song}">
      <div class="entry-card-image-wrap">
        <img class="entry-card-image" src="${entry.image}" alt="${entry.artist} — ${entry.song} editorial artwork" loading="lazy">
        <div class="entry-card-shade"></div>
        <div class="entry-no">${entry.order}</div>
      </div>
      <div class="entry-meta">
        <div class="entry-country">${entry.country}</div>
        <div class="entry-artist">${entry.artist}</div>
        <div class="entry-song">${entry.song}</div>
        <span class="entry-link">ENTRY ${entry.order} →</span>
      </div>
    </a>
  `).join("");
}
