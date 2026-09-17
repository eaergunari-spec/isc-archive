const entries = [
  { no: 1, country: "Rolipea", artist: "Lambrini Girls", song: "Cuntology 101" },
  { no: 2, country: "Verde Verano", artist: "Élise de Lune", song: "Bonne Nuit" },
  { no: 3, country: "", artist: "Meira Omar & LIAMOO", song: "MAZAA" },
  { no: 4, country: "", artist: "Saint Levant", song: "Nails" },
  { no: 5, country: "", artist: "HAYQ", song: "Mi Patmutyun / Մի պատմություն" },
  { no: 6, country: "", artist: "Laura Pausini", song: "¿PORQUÉ TE VAS?" },
  { no: 7, country: "", artist: "Audrey Hobert", song: "Bowling alley" },
  { no: 8, country: "", artist: "GALENA", song: "CHATGPT" }
];

const grid = document.getElementById("entry-grid");

entries.forEach((entry) => {
  const card = document.createElement("article");
  card.className = "entry-card";
  card.innerHTML = `
    <div class="entry-no">${String(entry.no).padStart(2, "0")}</div>
    <div class="entry-meta">
      <div class="entry-country">${entry.country || "Ülke bilgisi eklenecek"}</div>
      <div class="entry-artist">${entry.artist}</div>
      <div class="entry-song">${entry.song}</div>
    </div>
  `;
  grid.appendChild(card);
});
