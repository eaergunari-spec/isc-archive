const ENTRIES=[
{n:1,c:'ROLIPEA',flag:'🏴',artist:'Lambrini Girls',song:'Cuntology 101',img:'01-lambrini-girls.webp',video:''},
{n:2,c:'VERDE VERANO',flag:'🏳️',artist:'Élise de Lune',song:'Bonne Nuit',img:'02-elise-de-lune.webp',video:''},
{n:3,c:'GÜNEŞ DİYARI',flag:'☀️',artist:'Meira Omar & LIAMOO',song:'MAZAA',img:'03-meira-omar-liamoo.webp',video:''},
{n:4,c:'SUPERLAND',flag:'🏴',artist:'Saint Levant',song:'Nails',img:'04-saint-levant.webp',video:''},
{n:5,c:'KIRMIZI',flag:'🔴',artist:'HAYQ',song:'Mi Patmutyun',img:'05-hayq.webp',video:''},
{n:6,c:'CABURYA',flag:'🟣',artist:'Laura Pausini',song:'¿PORQUÉ TE VAS?',img:'06-laura-pausini.webp',video:''},
{n:7,c:'ENTRY 07',flag:'◆',artist:'Audrey Hobert',song:'ISC 154',img:'07-audrey-hobert.webp',video:''},
{n:8,c:'UZANMIŞIM KUMSALA',flag:'🌊',artist:'GALENA',song:'CHATGPT',img:'08-galena.webp',video:''}
];
const DELEGATIONS=[['🏴','ROLIPEA'],['🏳️','VERDE VERANO'],['☀️','GÜNEŞ DİYARI'],['◆','SUPERLAND'],['🔴','KIRMIZI'],['🟣','CABURYA'],['◇','DELEGATION 07'],['🌊','UZANMIŞIM KUMSALA']];
let current=0,player=null,ready=false,timer=null;
const $=id=>document.getElementById(id);
$('delegation-list').innerHTML=DELEGATIONS.map(d=>'<div class="delegation"><span class="flag">'+d[0]+'</span><div><b>'+d[1]+'</b><small>In the screening room</small></div><i class="presence"></i></div>').join('');
$('running-order').innerHTML=ENTRIES.map((e,i)=>'<button class="ro-card '+(i===0?'active':'')+'" data-i="'+i+'"><img src="'+e.img+'" alt=""><span class="ro-copy"><span>'+String(e.n).padStart(2,'0')+' · '+e.c+'</span><strong>'+e.artist+'</strong><small>“'+e.song+'”</small></span></button>').join('');
function setEntry(i){current=(i+ENTRIES.length)%ENTRIES.length;const e=ENTRIES[current];$('entry-label').textContent='ENTRY '+String(e.n).padStart(2,'0')+' · '+e.c;$('entry-title').textContent=e.artist;$('entry-song').textContent='“'+e.song+'”';document.querySelectorAll('.ro-card').forEach((x,j)=>x.classList.toggle('active',j===current));if(player&&ready&&e.video)player.loadVideoById(e.video);else if(player&&ready)player.stopVideo();$('sync-copy').textContent='Previewing '+e.c;}
document.querySelectorAll('.ro-card').forEach(x=>x.onclick=()=>setEntry(+x.dataset.i));$('prev-entry').onclick=()=>setEntry(current-1);$('next-entry').onclick=()=>setEntry(current+1);
window.onYouTubeIframeAPIReady=()=>{player=new YT.Player('yt-player',{height:'100%',width:'100%',videoId:'',playerVars:{controls:0,rel:0,modestbranding:1,playsinline:1},events:{onReady:()=>{ready=true}}});};
$('start-screening').onclick=()=>{$('start-screening').classList.add('hidden');$('room-status').textContent='ROOM OPEN';$('sync-copy').textContent='Connected to ISC screening room';};
$('toggle-play').onclick=()=>{if(!player||!ready)return;const s=player.getPlayerState();s===YT.PlayerState.PLAYING?player.pauseVideo():player.playVideo();};
$('resync').onclick=()=>{$('sync-drift').textContent='± 0.0s';$('sync-copy').textContent='Synchronized with Show Director';setTimeout(()=>$('sync-copy').textContent='Playback locked to room',1500)};
function tick(){if(!player||!ready)return;const t=player.getCurrentTime?.()||0,d=player.getDuration?.()||0;const fmt=x=>String(Math.floor(x/60)).padStart(2,'0')+':'+String(Math.floor(x%60)).padStart(2,'0');$('elapsed').textContent=fmt(t);$('duration').textContent=d?fmt(d):'--:--';$('timeline-fill').style.width=(d?Math.min(100,t/d*100):0)+'%';}
timer=setInterval(tick,500);