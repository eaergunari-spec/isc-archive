const rows = [
  {place:1,ro:6,country:"CABURYA",artist:"Laura Pausini",song:"¿PORQUÉ TE VAS?",points:71,twelves:3,image:"../assets/artists/06-laura-pausini.webp"},
  {place:2,ro:2,country:"VERDE VERANO",artist:"Élise de Lune",song:"Bonne Nuit",points:64,twelves:2,image:"../assets/artists/02-elise-de-lune.webp"},
  {place:3,ro:7,country:"STJOHN",artist:"Audrey Hobert",song:"Bowling alley",points:58,twelves:1,image:"../assets/artists/07-Audrey-Hobert.jpg"},
  {place:4,ro:4,country:"SUPERLAND",artist:"Saint Levant",song:"Nails",points:51,twelves:1,image:"../assets/artists/04-saint-levant.webp"},
  {place:5,ro:8,country:"UZANMIŞIM KUMSALA",artist:"GALENA",song:"CHATGPT",points:44,twelves:0,image:"../assets/artists/08-galena.jpg"},
  {place:6,ro:1,country:"ROLIPEA",artist:"Lambrini Girls",song:"Cuntology 101",points:39,twelves:1,image:"../assets/artists/01-lambrini-girls.webp"},
  {place:7,ro:5,country:"KIRMIZI",artist:"HAYQ",song:"Mi Patmutyun / Մի պատմություն",points:31,twelves:0,image:"../assets/artists/05-hayq.jpg"},
  {place:8,ro:3,country:"GÜNEŞ DİYARI",artist:"Meira Omar & LIAMOO",song:"MAZAA",points:26,twelves:0,image:"../assets/artists/03-meira-omar-liamoo.png"}
];

const mockBallots = [
  {country:"ROLIPEA",votes:[[12,"Bonne Nuit","VERDE VERANO"],[10,"Nails","SUPERLAND"],[8,"CHATGPT","UZANMIŞIM KUMSALA"],[6,"MAZAA","GÜNEŞ DİYARI"],[4,"Bowling alley","STJOHN"],[2,"¿PORQUÉ TE VAS?","CABURYA"],[1,"Mi Patmutyun","KIRMIZI"]]},
  {country:"VERDE VERANO",votes:[[12,"Bowling alley","STJOHN"],[10,"CHATGPT","UZANMIŞIM KUMSALA"],[8,"Cuntology 101","ROLIPEA"],[6,"Nails","SUPERLAND"],[4,"MAZAA","GÜNEŞ DİYARI"],[2,"Mi Patmutyun","KIRMIZI"],[1,"¿PORQUÉ TE VAS?","CABURYA"]]},
  {country:"GÜNEŞ DİYARI",votes:[[12,"¿PORQUÉ TE VAS?","CABURYA"],[10,"Bonne Nuit","VERDE VERANO"],[8,"Nails","SUPERLAND"],[6,"Bowling alley","STJOHN"],[4,"CHATGPT","UZANMIŞIM KUMSALA"],[2,"Cuntology 101","ROLIPEA"],[1,"Mi Patmutyun","KIRMIZI"]]},
  {country:"SUPERLAND",votes:[[12,"CHATGPT","UZANMIŞIM KUMSALA"],[10,"Bonne Nuit","VERDE VERANO"],[8,"Bowling alley","STJOHN"],[6,"MAZAA","GÜNEŞ DİYARI"],[4,"¿PORQUÉ TE VAS?","CABURYA"],[2,"Cuntology 101","ROLIPEA"],[1,"Mi Patmutyun","KIRMIZI"]]},
  {country:"KIRMIZI",votes:[[12,"Cuntology 101","ROLIPEA"],[10,"Bonne Nuit","VERDE VERANO"],[8,"Nails","SUPERLAND"],[6,"Bowling alley","STJOHN"],[4,"MAZAA","GÜNEŞ DİYARI"],[2,"CHATGPT","UZANMIŞIM KUMSALA"],[1,"¿PORQUÉ TE VAS?","CABURYA"]]},
  {country:"CABURYA",votes:[[12,"Nails","SUPERLAND"],[10,"Cuntology 101","ROLIPEA"],[8,"MAZAA","GÜNEŞ DİYARI"],[6,"Bonne Nuit","VERDE VERANO"],[4,"CHATGPT","UZANMIŞIM KUMSALA"],[2,"Mi Patmutyun","KIRMIZI"],[1,"Bowling alley","STJOHN"]]},
  {country:"STJOHN",votes:[[12,"MAZAA","GÜNEŞ DİYARI"],[10,"¿PORQUÉ TE VAS?","CABURYA"],[8,"CHATGPT","UZANMIŞIM KUMSALA"],[6,"Cuntology 101","ROLIPEA"],[4,"Nails","SUPERLAND"],[2,"Bonne Nuit","VERDE VERANO"],[1,"Mi Patmutyun","KIRMIZI"]]},
  {country:"UZANMIŞIM KUMSALA",votes:[[12,"¿PORQUÉ TE VAS?","CABURYA"],[10,"Bowling alley","STJOHN"],[8,"Bonne Nuit","VERDE VERANO"],[6,"Nails","SUPERLAND"],[4,"Cuntology 101","ROLIPEA"],[2,"Mi Patmutyun","KIRMIZI"],[1,"MAZAA","GÜNEŞ DİYARI"]]}
];

function esc(v){return String(v).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]})}

const winner=rows[0];
document.getElementById("winner-image").src=winner.image;
document.getElementById("winner-image").alt=winner.artist;
document.getElementById("winner-country").textContent=winner.country;
document.getElementById("winner-artist").textContent=winner.artist;
document.getElementById("winner-song").textContent="“"+winner.song+"”";
document.getElementById("winner-points").textContent=winner.points;
document.getElementById("winner-twelves").textContent=winner.twelves;

document.getElementById("podium").innerHTML=rows.slice(0,3).map(function(r,i){
  return '<article class="podium-card '+(i===0?'first':'')+'"><img src="'+r.image+'" alt="'+esc(r.artist)+'"><span class="podium-rank">0'+(i+1)+'</span><div class="podium-copy"><span class="podium-country">'+esc(r.country)+'</span><h3>'+esc(r.artist)+'</h3><p>'+esc(r.song)+'</p><div class="podium-score"><strong>'+r.points+'<small> puan</small></strong><small>'+r.twelves+' × 12 PUAN</small></div></div></article>';
}).join("");

var max=Math.max.apply(null,rows.map(function(r){return r.points}));
document.getElementById("scoreboard-list").innerHTML=rows.map(function(r){
  return '<article class="score-row"><div class="score-rank">'+String(r.place).padStart(2,"0")+'</div><div class="score-country">'+esc(r.country)+'</div><div class="score-act"><strong>'+esc(r.artist)+'</strong><span>'+esc(r.song)+'</span></div><div class="score-bar"><i style="width:'+Math.max(4,r.points/max*100)+'%"></i></div><div class="score-meta"><strong>'+r.points+'</strong><span>'+r.twelves+' × 12 PUAN</span></div></article>';
}).join("");

document.getElementById("insight-grid").innerHTML=[
  ["EN ÇOK 12 PUAN","Preview lideri","3 farklı delegasyondan gecenin en yüksek puanı."],
  ["EN YAKIN TAKİP","7 puan fark","İlk iki sıra arasında sıkı bir final hissi."],
  ["PODYUM SÜRPRİZİ","Running order 07","Görsel anlatıda üçüncü sırayı güçlü bir karakter kartına dönüştürüyoruz."],
  ["TIE-BREAK","12 → 10 → 8","Eşit toplam puanda resmi puan frekansı sırası devreye giriyor."]
].map(function(x){return '<article class="insight-card"><span>'+x[0]+'</span><strong>'+x[1]+'</strong><p>'+x[2]+'</p></article>'}).join("");

var selected=0;
function renderBallot(){
  var tabs=document.getElementById("ballot-tabs");
  tabs.innerHTML=mockBallots.map(function(b,i){return '<button class="'+(i===selected?'active':'')+'" data-i="'+i+'">'+esc(b.country)+'</button>'}).join("");
  Array.from(tabs.querySelectorAll("button")).forEach(function(btn){btn.onclick=function(){selected=Number(btn.dataset.i);renderBallot()}});
  var b=mockBallots[selected];
  document.getElementById("ballot-card").innerHTML='<div class="ballot-head"><div><span class="eyebrow">TAM OY DÖKÜMÜ · MOCK</span><h3>'+esc(b.country)+'</h3></div><small>Bu oylar tasarım testi içindir.</small></div><div class="ballot-votes">'+b.votes.map(function(v){return '<div class="ballot-vote"><b>'+v[0]+'</b><strong>'+esc(v[1])+'</strong><span>'+esc(v[2])+'</span></div>'}).join("")+'</div>';
}
renderBallot();

var cells=[];
for(var i=0;i<54;i++){var c="";if(i%13===0)c="hot";else if(i%7===0)c="mid";cells.push('<i class="'+c+'"></i>')}
document.getElementById("matrix-mock").innerHTML=cells.join("");