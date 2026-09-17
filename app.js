const entries = [
  { order: "01", country: "ROLIPEA", artist: "Lambrini Girls", song: "Cuntology 101", slug: "01-lambrini-girls" },
  { order: "02", country: "VERDE VERANO", artist: "Élise de Lune", song: "Bonne Nuit", slug: "02-elise-de-lune" },
  { order: "03", country: "ÜLKE DAHA AÇIKLANMADI", artist: "Meira Omar & LIAMOO", song: "MAZAA", slug: "03-meira-omar-liamoo" },
  { order: "04", country: "ÜLKE DAHA AÇIKLANMADI", artist: "Saint Levant", song: "Nails", slug: "04-saint-levant" },
  { order: "05", country: "ÜLKE DAHA AÇIKLANMADI", artist: "HAYQ", song: "Mi Patmutyun / Մի պատմություն", slug: "05-hayq" },
  { order: "06", country: "ÜLKE DAHA AÇIKLANMADI", artist: "Laura Pausini", song: "¿PORQUÉ TE VAS?", slug: "06-laura-pausini" },
  { order: "07", country: "ÜLKE DAHA AÇIKLANMADI", artist: "Audrey Hobert", song: "Bowling alley", slug: "07-audrey-hobert" },
  { order: "08", country: "ÜLKE DAHA AÇIKLANMADI", artist: "GALENA", song: "CHATGPT", slug: "08-galena" }
];

const entryGrid = document.getElementById("entry-grid");

if (entryGrid) {
  entryGrid.innerHTML = entries.map((entry) => `
    <a class="entry-card" href="entries/${entry.slug}.html" aria-label="Entry ${entry.order}: ${entry.artist} — ${entry.song}">
      <div class="entry-no">${entry.order}</div>
      <div class="entry-meta">
        <div class="entry-country">${entry.country}</div>
        <div class="entry-artist">${entry.artist}</div>
        <div class="entry-song">${entry.song}</div>
        <span class="entry-link">ENTRY ${entry.order} →</span>
      </div>
    </a>
  `).join("");
}
