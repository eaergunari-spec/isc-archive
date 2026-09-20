(function(){
'use strict';

var SUPABASE_URL='https://knwvnbfqnccjiezprrme.supabase.co';
var SUPABASE_KEY='sb_publishable_Zw8H9mMmUop7wkYNKtZB3Q_7dM1QHut';
var EDITION=154;
var VOTER_SESSION_STORAGE_KEY='isc_voter_browser_session_v1';
var CHAT_NICK_STORAGE_KEY='isc_chat_nickname';
var GUEST_STORAGE_KEY='isc_screening_guest_name_v1';
var DIRECTOR_SESSION_KEY='isc_live_director_code_v1';

var FALLBACK_ENTRIES=[
  {n:1,c:'ROLIPEA',countrySlug:'rolipea',artist:'Lambrini Girls',song:'Cuntology 101',img:'01-lambrini-girls.webp',video:'20TDd19oA1Q'},
  {n:2,c:'VERDE VERANO',countrySlug:'verde-verano',artist:'Élise de Lune',song:'Bonne Nuit',img:'02-elise-de-lune.webp',video:'TnThIGhFn5Q'},
  {n:3,c:'GÜNEŞ DİYARI',countrySlug:'gunes-diyari',artist:'Meira Omar & LIAMOO',song:'MAZAA',img:'03-meira-omar-liamoo.webp',video:'oFO8UkkCd8Q'},
  {n:4,c:'SUPERLAND',countrySlug:'superland',artist:'Saint Levant',song:'Nails',img:'04-saint-levant.webp',video:'J7e70aw_x_E'},
  {n:5,c:'KIRMIZI',countrySlug:'kirmizi',artist:'HAYQ',song:'Mi Patmutyun / Մի պատմություն',img:'05-hayq.webp',video:'QGMFry9eKNc'},
  {n:6,c:'CABURYA',countrySlug:'caburya',artist:'Laura Pausini',song:'¿PORQUÉ TE VAS?',img:'06-laura-pausini.webp',video:'MjwPS-lfbhU'},
  {n:7,c:'STJOHN',countrySlug:'stjohn',artist:'Audrey Hobert',song:'Bowling alley',img:'07-audrey-hobert.webp',video:'ohh3-7FCzkQ'},
  {n:8,c:'UZANMIŞIM KUMSALA',countrySlug:'uzanmisim-kumsala',artist:'GALENA',song:'CHATGPT',img:'08-galena.webp',video:'2GCBHSnvJik'}
];

var entries=FALLBACK_ENTRIES.slice();
var currentIndex=0;
var db=null;
var player=null;
var playerReady=false;
var playerIframe=null;
var playerErrorCode=null;
var userJoined=false;
var mediaUnlocked=false;
var applyingRemoteState=false;
var isDirector=false;
var adminCode='';
var directorOnline=false;
var identityName='';
var identityRole='guest';
var presenceChannel=null;
var stateChannel=null;
var chatChannel=null;
var presenceConnected=false;
var lastHeartbeatAt=0;
var writeInFlight=false;
var pendingWrite=null;
var lastStateVersion=-1;
var ytApiReady=Boolean(window.YT&&window.YT.Player);
var pendingPlayerBind=false;
var pendingDirectorPlay=false;
var roomState={
  ok:true,
  edition_number:EDITION,
  current_entry:1,
  position_seconds:0,
  is_playing:false,
  state_version:0,
  updated_at:new Date().toISOString(),
  updated_by:'system'
};

function $(id){return document.getElementById(id);}
function esc(value){
  return String(value==null?'':value)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}
function clamp(n,min,max){return Math.max(min,Math.min(max,n));}
function safeNumber(n,fallback){n=Number(n);return Number.isFinite(n)?n:fallback;}
function two(n){return String(n).padStart(2,'0');}
function formatTime(seconds){
  seconds=Math.max(0,Math.floor(safeNumber(seconds,0)));
  return two(Math.floor(seconds/60))+':'+two(seconds%60);
}
function assetPath(value){
  if(!value)return '';
  value=String(value);
  if(/^https?:\/\//i.test(value))return value;
  return value.replace(/^\/+/, '');
}
function watchUrl(videoId){
  return 'https://www.youtube.com/watch?v='+encodeURIComponent(videoId||'');
}
function uniqueClientKey(){
  if(window.crypto&&crypto.randomUUID)return crypto.randomUUID();
  return 'client-'+Date.now()+'-'+Math.random().toString(36).slice(2);
}

function setSyncState(label,drift,state){
  $('sync-label').textContent=label;
  $('sync-drift').textContent=drift==null?'—':drift;
  $('sync-overlay').dataset.state=state||'waiting';
}
function hidePlayerMessage(){
  $('player-message').hidden=true;
}
function showPlayerMessage(title,copy){
  $('player-message-title').textContent=title;
  $('player-message-copy').textContent=copy;
  var entry=entries[currentIndex]||entries[0];
  $('youtube-fallback').href=watchUrl(entry&&entry.video);
  $('player-message').hidden=false;
}
function currentEntry(){
  return entries[currentIndex]||entries[0]||FALLBACK_ENTRIES[0];
}
function indexForRunningOrder(order){
  var i=entries.findIndex(function(e){return Number(e.n)===Number(order);});
  return i>=0?i:0;
}
function roomStateFresh(){
  var at=Date.parse(roomState.updated_at);
  return Number.isFinite(at)&&Date.now()-at<15000;
}
function roomLocked(){
  return roomState.updated_by==='director'&&Boolean(isDirector||directorOnline||roomStateFresh());
}

function updateNowPlaying(){
  var e=currentEntry();
  if(!e)return;
  $('entry-label').textContent='SIRA '+two(e.n)+' · '+e.c;
  $('entry-title').textContent=e.artist;
  $('entry-song').textContent='“'+e.song+'”';
  $('youtube-fallback').href=watchUrl(e.video);
  var cover=$('start-screening');
  if(cover&&e.img){
    var safeImg=String(e.img).replace(/[\"'\\\\]/g,'');
    cover.style.backgroundImage='linear-gradient(135deg,rgba(13,8,24,.85),rgba(7,6,10,.5)),url("'+safeImg+'")';
    cover.style.backgroundPosition='center';
    cover.style.backgroundSize='cover';
  }
  document.querySelectorAll('.ro-card').forEach(function(card,i){
    card.classList.toggle('active',i===currentIndex);
  });
}

function renderEntries(){
  $('running-order').innerHTML=entries.map(function(e,i){
    return '<button class="ro-card '+(i===currentIndex?'active':'')+'" data-i="'+i+'" type="button">'+
      '<img src="'+esc(e.img)+'" alt="'+esc(e.artist)+'" loading="lazy" decoding="async">'+
      '<span class="ro-copy"><span>'+two(e.n)+' · '+esc(e.c)+'</span><strong>'+esc(e.artist)+'</strong><small>“'+esc(e.song)+'”</small></span>'+
      '<span class="ro-lock" aria-hidden="true">LIVE LOCK</span>'+
      '</button>';
  }).join('');

  document.querySelectorAll('.ro-card').forEach(function(card){
    card.addEventListener('click',function(){
      var i=Number(card.dataset.i);
      if(isDirector){
        directorSetEntry(i);
      }else if(!roomLocked()){
        localPreviewEntry(i);
      }else{
        $('sync-copy').textContent='Sahne sırası Yayın Yönetmeni tarafından kilitlendi.';
      }
    });
  });
  updateNowPlaying();
  updateDirectorUI();
}

async function loadEntries(){
  if(!db){entries=FALLBACK_ENTRIES.slice();renderEntries();return;}
  try{
    var res=await db.rpc('isc_public_edition_hub',{p_edition_number:EDITION});
    if(res.error||!res.data||!res.data.ok||!Array.isArray(res.data.entries)||!res.data.entries.length)throw res.error||new Error('line-up unavailable');
    entries=res.data.entries.slice().sort(function(a,b){return Number(a.running_order)-Number(b.running_order);}).map(function(e,i){
      var fallback=FALLBACK_ENTRIES[i]||{};
      return {
        n:Number(e.running_order),
        c:e.country||fallback.c||'ISC',
        countrySlug:e.country_slug||fallback.countrySlug||'',
        artist:e.artist||fallback.artist||'Unknown artist',
        song:e.song||fallback.song||'Unknown song',
        img:fallback.img||assetPath(e.image_url)||'',
        video:e.video_id||fallback.video||''
      };
    });
  }catch(err){
    console.error('ISC line-up fallback',err);
    entries=FALLBACK_ENTRIES.slice();
  }
  currentIndex=indexForRunningOrder(roomState.current_entry);
  renderEntries();
}

async function loadRoomState(){
  if(!db)return;
  try{
    var res=await db.rpc('isc_screening_public_state',{p_edition_number:EDITION});
    if(res.error)throw res.error;
    if(res.data&&res.data.ok)applyRoomState(res.data,'initial');
  }catch(err){
    console.error('Room state unavailable',err);
    $('room-status-note').textContent='Yerel ön izleme kullanılabilir · canlı durum bağlantısı yok';
  }
}

function normalizedState(raw){
  if(!raw)return null;
  return {
    ok:true,
    edition_number:Number(raw.edition_number||EDITION),
    current_entry:Number(raw.current_entry||1),
    position_seconds:Math.max(0,safeNumber(raw.position_seconds,0)),
    is_playing:Boolean(raw.is_playing),
    state_version:Number(raw.state_version||0),
    updated_at:raw.updated_at||new Date().toISOString(),
    updated_by:raw.updated_by||'system'
  };
}
function expectedPosition(){
  var base=Math.max(0,safeNumber(roomState.position_seconds,0));
  if(!roomState.is_playing)return base;
  var at=Date.parse(roomState.updated_at);
  if(!Number.isFinite(at))return base;
  return Math.max(0,base+(Date.now()-at)/1000);
}
function applyRoomState(raw,source){
  var s=normalizedState(raw);
  if(!s)return;
  if(source!=='initial'&&s.state_version<lastStateVersion)return;
  lastStateVersion=Math.max(lastStateVersion,s.state_version);
  roomState=s;
  var next=indexForRunningOrder(s.current_entry);
  var changed=next!==currentIndex;
  currentIndex=next;
  updateNowPlaying();
  updateRoomVisualState();

  if(userJoined&&playerReady&&roomLocked()){
    syncPlayerToRoom(changed);
  }
}

function updateRoomVisualState(){
  var live=roomLocked();
  if(isDirector){
    $('room-status').textContent='YAYIN YÖNETMENİ';
    $('room-status-note').textContent='Bu odadaki yayın kontrolleri sizde.';
  }else if(live){
    $('room-status').textContent='CANLI YAYIN';
    $('room-status-note').textContent='Oynatma ISC Yayın Yönetmenine kilitlendi.';
  }else if(userJoined){
    $('room-status').textContent='YAYIN BEKLENİYOR';
    $('room-status-note').textContent='Final yayını henüz başlamadı · Yayın Yönetmeni bekleniyor.';
  }else{
    $('room-status').textContent='YAYIN BEKLENİYOR';
    $('room-status-note').textContent='Yayın odasına girerek bağlantınızı etkinleştirin.';
  }

  if(live){
    $('live-badge').classList.remove('preview');
    $('live-badge').innerHTML='<i></i> CANLI';
    $('running-order-note').textContent='Sahne sırası odadaki herkes için Yayın Yönetmeni tarafından kontrol edilir.';
  }else{
    $('live-badge').classList.add('preview');
    $('live-badge').innerHTML='<i></i> BEKLEMEDE';
    $('running-order-note').textContent=isDirector?'Odayı ilgili şarkıya taşımak için bir katılımcı seçin.':'Final yayını henüz başlamadı. Şarkıları yerel olarak ön izleyebilirsiniz.';
  }

  if(playerErrorCode){
    setSyncState('OYNATICI HATASI','E'+playerErrorCode,'error');
  }else if(live&&playerReady){
    setSyncState('SENKRON','±0.0s','synced');
  }else if(userJoined&&playerReady){
    setSyncState('YEREL ÖN İZLEME','—','preview');
  }else{
    setSyncState('BEKLENİYOR','—','waiting');
  }
  updateDirectorUI();
}

async function resolveIdentity(){
  var remembered=null;
  try{remembered=JSON.parse(localStorage.getItem(VOTER_SESSION_STORAGE_KEY)||'null');}catch(_){}
  if(remembered&&remembered.token&&db){
    try{
      var res=await db.rpc('isc_resume_voter_browser_session',{p_token:remembered.token});
      var data=res.data;
      if(!res.error&&data&&data.ok){
        var slug=data.country_slug||remembered.countrySlug||'';
        var match=entries.find(function(e){return e.countrySlug===slug;});
        identityName=(data.country_name||data.display_name||(match&&match.c)||slug||'Delegation').toString();
        identityRole='delegation';
        return;
      }
    }catch(_){}
  }

  try{identityName=localStorage.getItem(GUEST_STORAGE_KEY)||'';}catch(_){}
  if(!identityName){
    identityName='GUEST '+Math.floor(100+Math.random()*900);
    try{localStorage.setItem(GUEST_STORAGE_KEY,identityName);}catch(_){}
  }
  identityRole='guest';
}

function renderPresence(){
  if(!presenceChannel)return;
  var state=presenceChannel.presenceState();
  var people=[];
  Object.keys(state).forEach(function(key){
    (state[key]||[]).forEach(function(p){people.push(p);});
  });
  people.sort(function(a,b){
    if(Boolean(a.director)!==Boolean(b.director))return a.director?-1:1;
    return String(a.country||'').localeCompare(String(b.country||''));
  });
  directorOnline=people.some(function(p){return Boolean(p.director);});
  $('online-count').textContent=String(people.length);
  if(!people.length){
    $('delegation-list').innerHTML='<div class="delegation-empty">No one is connected yet.</div>';
  }else{
    $('delegation-list').innerHTML=people.map(function(p){
      return '<div class="delegation '+(p.director?'is-director':'')+'">'+
        '<span class="flag">'+(p.director?'✦':'◆')+'</span>'+
        '<div><b>'+esc(p.country||'Misafir')+'</b><small>'+(p.director?'Yayın Yönetmeni':(p.role==='delegation'?'Delegation':'Guest viewer'))+'</small></div>'+
        '<i class="presence"></i></div>';
    }).join('');
  }
  updateRoomVisualState();
}
async function trackPresence(){
  if(!presenceChannel||!presenceConnected)return;
  try{
    await presenceChannel.track({
      country:identityName||'Misafir',
      role:identityRole,
      director:isDirector,
      joined_at:new Date().toISOString()
    });
  }catch(err){console.error('Presence track failed',err);}
}
async function connectPresence(){
  if(!db||presenceChannel)return;
  var key=uniqueClientKey();
  presenceChannel=db.channel('isc-screening-presence-'+EDITION,{config:{presence:{key:key}}});
  presenceChannel
    .on('presence',{event:'sync'},renderPresence)
    .on('presence',{event:'join'},renderPresence)
    .on('presence',{event:'leave'},renderPresence)
    .subscribe(async function(status){
      if(status==='SUBSCRIBED'){
        presenceConnected=true;
        await trackPresence();
      }else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){
        presenceConnected=false;
        $('sync-copy').textContent='Delegasyon bağlantısı yeniden kuruluyor…';
      }
    });
}

function subscribeRoomState(){
  if(!db||stateChannel)return;
  stateChannel=db.channel('isc-screening-state-'+EDITION)
    .on('postgres_changes',{
      event:'*',
      schema:'public',
      table:'screening_sessions',
      filter:'edition_number=eq.'+EDITION
    },function(payload){
      if(payload&&payload.new)applyRoomState(payload.new,'realtime');
    })
    .subscribe(function(status){
      if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'){
        $('room-status-note').textContent='Canlı yayın durumuna yeniden bağlanılıyor…';
      }
    });
}

function playerSrc(host,videoId,autoplay,start){
  var params=[
    'enablejsapi=1',
    'origin='+encodeURIComponent(window.location.origin),
    'playsinline=1',
    'rel=0',
    'controls=1',
    'autoplay='+(autoplay?1:0)
  ];
  if(start>0)params.push('start='+Math.floor(start));
  return host+'/embed/'+encodeURIComponent(videoId)+'?'+params.join('&');
}
function createPlayerIframe(host,autoplay,start){
  var e=currentEntry();
  var frame=document.createElement('iframe');
  frame.id='yt-frame';
  frame.title=e.artist+' — '+e.song;
  frame.src=playerSrc(host,e.video,autoplay,start||0);
  frame.allow='autoplay; encrypted-media; picture-in-picture; fullscreen; web-share';
  frame.allowFullscreen=true;
  frame.referrerPolicy='strict-origin-when-cross-origin';
  frame.setAttribute('frameborder','0');
  $('yt-player').replaceChildren(frame);
  playerIframe=frame;
  $('youtube-fallback').href=watchUrl(e.video);
  if(ytApiReady)bindPlayer(frame);
  else pendingPlayerBind=true;
}
function destroyPlayer(){
  try{if(player&&typeof player.destroy==='function')player.destroy();}catch(_){}
  player=null;
  playerReady=false;
  playerIframe=null;
  pendingPlayerBind=false;
}
function bindPlayer(frame){
  if(!frame||!window.YT||!YT.Player)return;
  pendingPlayerBind=false;
  try{
    player=new YT.Player(frame,{
      events:{
        onReady:function(){
          playerReady=true;
          playerErrorCode=null;
          hidePlayerMessage();
          if(roomLocked())syncPlayerToRoom(true);
          updateRoomVisualState();
          $('sync-copy').textContent=roomLocked()?'Oynatma Yayın Yönetmenine kilitlendi.':'Yerel ön izleme hazır.';
          if(pendingDirectorPlay&&isDirector){
            pendingDirectorPlay=false;
            try{player.playVideo();mediaUnlocked=true;}catch(_){}
            setTimeout(function(){commitDirectorState('play',{playing:true});},180);
          }
        },
        onStateChange:onPlayerStateChange,
        onError:onPlayerError,
        onAutoplayBlocked:function(){
          $('sync-copy').textContent='Bu cihazda oynatmayı etkinleştirmek için videodaki ▶ düğmesine bir kez dokunun.';
          setSyncState('DOKUNARAK AÇ','—','waiting');
        }
      }
    });
  }catch(err){
    console.error('YouTube bind failed',err);
    showPlayerMessage('Player could not initialize','The YouTube player API did not initialize correctly on this browser.');
  }
}
window.onYouTubeIframeAPIReady=function(){
  ytApiReady=true;
  if(pendingPlayerBind&&playerIframe)bindPlayer(playerIframe);
};
if(ytApiReady){
  setTimeout(function(){window.onYouTubeIframeAPIReady();},0);
}

function startPlayerForCurrentEntry(){
  var live=roomLocked();
  var start=live?expectedPosition():0;
  var autoplay=live?roomState.is_playing:(!isDirector||pendingDirectorPlay);
  playerErrorCode=null;
  hidePlayerMessage();
  destroyPlayer();
  createPlayerIframe('https://www.youtube.com',autoplay,start);
}

function onPlayerError(event){
  var code=Number(event&&event.data)||0;
  playerErrorCode=code;
  console.error('YouTube player error',code);
  var title='YouTube oynatma hatası';
  var copy='Video bu sayfa içinde oynatılamadı.';
  if(code===153)copy='YouTube could not verify the embed identity in this browser. Open this page in a full browser window and make sure YouTube cookies are allowed.';
  if(code===101||code===150)copy='The video owner does not permit embedded playback for this video.';
  if(code===100)copy='Bu video kullanılamıyor veya gizli.';
  if(code===5)copy='This browser could not play the YouTube HTML5 stream.';
  showPlayerMessage(title,copy);
  setSyncState('OYNATICI HATASI','E'+code,'error');
  $('sync-copy').textContent='Gömülü oynatma başarısız · YouTube üzerinden açabilirsiniz.';
}

function onPlayerStateChange(event){
  if(event.data===YT.PlayerState.PLAYING){
    mediaUnlocked=true;
    playerErrorCode=null;
    hidePlayerMessage();
    if(roomLocked()){
      var actual=0,drift=0;
      try{actual=safeNumber(player.getCurrentTime(),0);drift=expectedPosition()-actual;}catch(_){}
      setSyncState('SENKRON',(drift>=0?'+':'')+drift.toFixed(1)+'s','synced');
      $('sync-copy').textContent=isDirector?'Yayın aktif · kontrol sizde.':'Canlı yayına senkronize.';
    }else{
      setSyncState('OYNATILIYOR','—','preview');
      $('sync-copy').textContent='Video oynatılıyor.';
    }
  }
  if(isDirector&&!applyingRemoteState&&(event.data===YT.PlayerState.PLAYING||event.data===YT.PlayerState.PAUSED||event.data===YT.PlayerState.ENDED)){
    setTimeout(function(){commitDirectorState('player-state');},120);
  }else if(roomLocked()&&!isDirector){
    setTimeout(function(){syncPlayerToRoom(false);},250);
  }
}

function loadEntryIntoPlayer(autoplay,start){
  var e=currentEntry();
  if(!playerReady||!player||!e||!e.video)return;
  try{
    if(autoplay){
      player.loadVideoById({videoId:e.video,startSeconds:Math.max(0,start||0)});
    }else{
      player.cueVideoById({videoId:e.video,startSeconds:Math.max(0,start||0)});
    }
  }catch(err){console.error('Video switch failed',err);}
}

function syncPlayerToRoom(force){
  if(!playerReady||!player||!roomLocked()||isDirector)return;
  var e=currentEntry();
  var expected=expectedPosition();
  var data={};
  try{data=player.getVideoData()||{};}catch(_){}
  applyingRemoteState=true;
  try{
    if(data.video_id!==e.video){
      if(roomState.is_playing)player.loadVideoById({videoId:e.video,startSeconds:expected});
      else player.cueVideoById({videoId:e.video,startSeconds:expected});
    }else{
      var actual=safeNumber(player.getCurrentTime(),0);
      var drift=expected-actual;
      setSyncState('SENKRON',(drift>=0?'+':'')+drift.toFixed(1)+'s','synced');
      if(force||Math.abs(drift)>1.15)player.seekTo(Math.max(0,expected),true);
      var state=player.getPlayerState();
      if(roomState.is_playing){
        if(mediaUnlocked&&state!==YT.PlayerState.PLAYING)player.playVideo();
      }else if(state===YT.PlayerState.PLAYING){
        player.pauseVideo();
      }
    }
  }finally{
    setTimeout(function(){applyingRemoteState=false;},180);
  }
}

function localPreviewEntry(i){
  currentIndex=clamp(i,0,entries.length-1);
  updateNowPlaying();
  if(userJoined){
    playerErrorCode=null;
    hidePlayerMessage();
    if(playerReady)loadEntryIntoPlayer(true,0);
    else startPlayerForCurrentEntry();
  }
  $('sync-copy').textContent='Yerel ön izleme · henüz Yayın Yönetmeni yayında değil.';
}

async function validateDirectorCode(code){
  if(!db||!code)return false;
  try{
    var res=await db.rpc('isc_screening_director_auth',{p_code:code});
    return !res.error&&res.data&&res.data.ok===true;
  }catch(_){return false;}
}
async function unlockDirector(){
  var input=$('director-code');
  var code=input.value.trim();
  if(!code)return;
  $('director-auth-message').textContent='Kontrol ediliyor…';
  $('director-unlock').disabled=true;
  var ok=await validateDirectorCode(code);
  $('director-unlock').disabled=false;
  if(!ok){
    $('director-auth-message').textContent='Yayın Yönetmeni kodu geçersiz.';
    input.select();
    return;
  }
  adminCode=code;
  isDirector=true;
  try{sessionStorage.setItem(DIRECTOR_SESSION_KEY,code);}catch(_){}
  $('director-auth').hidden=true;
  $('director-auth-message').textContent='';
  input.value='';
  if(!roomStateFresh()){
    currentIndex=0;
    updateNowPlaying();
    await commitDirectorState('director-login-reset',{position:0,playing:false});
  }
  if(!presenceChannel&&userJoined)await connectPresence();
  else if(presenceConnected)await trackPresence();
  updateRoomVisualState();
  $('sync-copy').textContent='Yayın Yönetmeni modu açıldı. Kontrolleriniz artık tüm odayı yönetiyor.';
}
function lockDirector(){
  isDirector=false;
  adminCode='';
  try{sessionStorage.removeItem(DIRECTOR_SESSION_KEY);}catch(_){}
  if(presenceConnected)trackPresence();
  updateRoomVisualState();
}
function updateDirectorUI(){
  var actions=['prev-entry','toggle-play','resync','next-entry'];
  actions.forEach(function(id){var el=$(id);if(el)el.disabled=!isDirector;});
  document.querySelectorAll('.ro-card').forEach(function(card){
    card.classList.toggle('live-locked',roomLocked()&&!isDirector);
  });
  if(isDirector){
    $('director-kicker').textContent='ISC YAYIN YÖNETMENİ';
    $('director-copy').textContent='Tüm bağlı izleyicilerin sahne sırası ve oynatma kontrolleri sizde.';
    $('director-login-btn').textContent='YÖNETMENİ KİLİTLE';
    $('director-login-btn').classList.add('active');
  }else{
    $('director-kicker').textContent='ISC YAYIN KONTROLÜ';
    $('director-copy').textContent='İzleyici modu · canlı yayın Yayın Yönetmenini takip eder.';
    $('director-login-btn').textContent='YÖNETMEN GİRİŞİ';
    $('director-login-btn').classList.remove('active');
  }
}

async function commitDirectorState(reason,override){
  if(!isDirector||!adminCode||!db)return;
  var e=currentEntry();
  var position=override&&override.position!=null?override.position:(playerReady&&player?safeNumber(player.getCurrentTime(),0):roomState.position_seconds);
  var playing=override&&override.playing!=null?override.playing:(playerReady&&player?player.getPlayerState()===YT.PlayerState.PLAYING:false);
  var payload={
    p_code:adminCode,
    p_edition_number:EDITION,
    p_entry:e.n,
    p_position_seconds:Math.max(0,position),
    p_is_playing:Boolean(playing)
  };

  if(writeInFlight){
    pendingWrite={reason:reason,override:override};
    return;
  }
  writeInFlight=true;
  try{
    var res=await db.rpc('isc_screening_director_update',payload);
    if(res.error)throw res.error;
    if(!res.data||!res.data.ok){
      if(res.data&&res.data.reason==='invalid_admin_code'){
        lockDirector();
        $('director-auth-message').textContent='Director session expired.';
      }
      return;
    }
    applyRoomState(res.data,'director');
  }catch(err){
    console.error('Director state write failed',err);
    $('sync-copy').textContent='Show control could not reach the realtime backend.';
  }finally{
    writeInFlight=false;
    if(pendingWrite){
      var p=pendingWrite;
      pendingWrite=null;
      commitDirectorState(p.reason,p.override);
    }
  }
}

function directorSetEntry(i){
  if(!isDirector)return;
  currentIndex=clamp(i,0,entries.length-1);
  updateNowPlaying();
  playerErrorCode=null;
  hidePlayerMessage();
  if(userJoined){
    if(playerReady)loadEntryIntoPlayer(false,0);
    else startPlayerForCurrentEntry();
  }
  commitDirectorState('entry-change',{position:0,playing:false});
}

function updateTimeline(){
  var t=0,d=0;
  if(playerReady&&player){
    try{t=safeNumber(player.getCurrentTime(),0);d=safeNumber(player.getDuration(),0);}catch(_){}
  }else if(roomLocked()){
    t=expectedPosition();
  }
  $('elapsed').textContent=formatTime(t);
  $('duration').textContent=d>0?formatTime(d):'--:--';
  $('timeline-fill').style.width=d>0?clamp(t/d*100,0,100)+'%':'0%';
}

async function enterRoom(){
  if(userJoined)return;
  userJoined=true;
  $('start-screening').classList.add('hidden');
  $('sync-copy').textContent='Yayın odasına katılınıyor…';
  updateRoomVisualState();

  /* Creating the iframe synchronously from the tap is intentional: iOS uses this
     user gesture to unlock media playback. */
  startPlayerForCurrentEntry();

  try{
    if(!identityName)await resolveIdentity();
    await connectPresence();
  }catch(err){
    console.error('Room presence unavailable',err);
    $('sync-copy').textContent='Video hazır · delegasyon bağlantısı geçici olarak kullanılamıyor.';
  }
}

function appendChatMessage(m){
  if(!m||m.id==null)return;
  if(appendChatMessage.seen.has(String(m.id)))return;
  appendChatMessage.seen.add(String(m.id));
  var box=$('chat-messages');
  var empty=box.querySelector('.chat-empty');
  if(empty)empty.remove();
  var row=document.createElement('div');
  row.className='chat-msg';
  var time='';
  try{time=new Date(m.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});}catch(_){}
  row.innerHTML='<b>'+esc(m.nickname)+'</b><span>'+esc(m.message)+'</span><small>'+esc(time)+'</small>';
  box.insertBefore(row,box.firstChild);
  while(box.children.length>120)box.removeChild(box.lastChild);
  box.scrollTop=0;
}
appendChatMessage.seen=new Set();

function paintChat(rows){
  var box=$('chat-messages');
  box.innerHTML='';
  appendChatMessage.seen.clear();
  if(!rows||!rows.length){
    box.innerHTML='<div class="chat-empty">Odaya merhaba deyin.</div>';
    return;
  }
  rows.slice().reverse().forEach(appendChatMessage);
}
function setChatReady(){
  var nick=String(localStorage.getItem(CHAT_NICK_STORAGE_KEY)||'').trim();
  var ok=nick.length>0;
  $('chat-input').disabled=!ok;
  $('chat-form').querySelector('button').disabled=!ok;
  var nickPanel=$('chat-nick-panel');
  if(nickPanel)nickPanel.classList.toggle('is-set',ok);
}
async function initChat(){
  if(!db){
    $('chat-nickname').placeholder='Sohbet kullanılamıyor';
    return;
  }
  var nick='';
  try{nick=localStorage.getItem(CHAT_NICK_STORAGE_KEY)||'';}catch(_){}
  $('chat-nickname').value=nick;
  setChatReady();
  try{
    var res=await db.from('screening_chat_messages')
      .select('id,nickname,message,created_at')
      .eq('edition_number',EDITION)
      .order('created_at',{ascending:false})
      .limit(100);
    if(res.error)throw res.error;
    paintChat(res.data||[]);
  }catch(err){
    console.error('Chat history failed',err);
    $('chat-messages').innerHTML='<div class="chat-empty">Chat is reconnecting…</div>';
  }

  chatChannel=db.channel('isc-chat-'+EDITION)
    .on('postgres_changes',{
      event:'INSERT',
      schema:'public',
      table:'screening_chat_messages',
      filter:'edition_number=eq.'+EDITION
    },function(payload){appendChatMessage(payload.new);})
    .subscribe();
}

$('save-nickname').addEventListener('click',function(){
  var n=$('chat-nickname').value.trim().slice(0,32);
  if(!n)return;
  try{localStorage.setItem(CHAT_NICK_STORAGE_KEY,n);}catch(_){}
  setChatReady();
  $('chat-input').focus();
});
$('chat-nickname').addEventListener('keydown',function(e){
  if(e.key==='Enter'){e.preventDefault();$('save-nickname').click();}
});
$('chat-form').addEventListener('submit',async function(e){
  e.preventDefault();
  if(!db)return;
  var input=$('chat-input');
  var message=input.value.trim();
  var nickname='';
  try{nickname=(localStorage.getItem(CHAT_NICK_STORAGE_KEY)||'').trim();}catch(_){}
  if(!nickname||!message)return;
  input.value='';
  var res=await db.from('screening_chat_messages')
    .insert({edition_number:EDITION,nickname:nickname,message:message})
    .select('id,nickname,message,created_at')
    .single();
  if(res.error){
    console.error('Chat send failed',res.error);
    input.value=message;
    input.placeholder='Mesaj gönderilemedi — tekrar deneyin';
    return;
  }
  appendChatMessage(res.data);
  input.placeholder='Odaya mesaj yazın…';
});

$('start-screening').addEventListener('click',enterRoom);
$('director-login-btn').addEventListener('click',function(){
  if(isDirector){lockDirector();return;}
  $('director-auth').hidden=false;
  $('director-code').focus();
});
$('director-cancel').addEventListener('click',function(){
  $('director-auth').hidden=true;
  $('director-auth-message').textContent='';
});
$('director-unlock').addEventListener('click',unlockDirector);
$('director-code').addEventListener('keydown',function(e){
  if(e.key==='Enter'){e.preventDefault();unlockDirector();}
});
$('prev-entry').addEventListener('click',function(){if(isDirector)directorSetEntry(currentIndex-1<0?entries.length-1:currentIndex-1);});
$('next-entry').addEventListener('click',function(){if(isDirector)directorSetEntry((currentIndex+1)%entries.length);});
$('toggle-play').addEventListener('click',function(){
  if(!isDirector)return;
  if(!userJoined||!playerReady||!player){
    pendingDirectorPlay=true;
    if(!userJoined)enterRoom();
    else $('sync-copy').textContent='Player is still loading…';
    return;
  }
  var state=player.getPlayerState();
  if(state===YT.PlayerState.PLAYING){
    player.pauseVideo();
    commitDirectorState('pause',{playing:false});
  }else{
    player.playVideo();
    mediaUnlocked=true;
    setTimeout(function(){commitDirectorState('play',{playing:true});},120);
  }
});
$('resync').addEventListener('click',function(){
  if(isDirector)commitDirectorState('manual-resync');
  else if(roomLocked())syncPlayerToRoom(true);
});

document.addEventListener('visibilitychange',function(){
  if(!document.hidden&&roomLocked()&&!isDirector){
    setTimeout(function(){syncPlayerToRoom(true);},250);
  }
});

setInterval(function(){
  updateTimeline();
  if(userJoined&&playerReady&&roomLocked()&&!isDirector&&!playerErrorCode){
    syncPlayerToRoom(false);
  }
  if(isDirector&&userJoined&&playerReady&&player&&player.getPlayerState()===YT.PlayerState.PLAYING){
    var now=Date.now();
    if(now-lastHeartbeatAt>4000){
      lastHeartbeatAt=now;
      commitDirectorState('heartbeat');
    }
  }
},1000);

async function boot(){
  $('online-count').textContent='0';
  updateDirectorUI();
  updateRoomVisualState();

  if(!window.supabase||typeof window.supabase.createClient!=='function'){
    console.error('Supabase client failed to load');
    renderEntries();
    $('room-status-note').textContent='Local preview only · realtime library unavailable';
    showPlayerMessage('Realtime library unavailable','The page can still attempt local YouTube playback after you enter the room.');
    return;
  }

  db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
  });

  await Promise.all([loadRoomState(),loadEntries()]);
  await resolveIdentity();
  subscribeRoomState();
  initChat().catch(console.error);

  var rememberedDirector='';
  try{rememberedDirector=sessionStorage.getItem(DIRECTOR_SESSION_KEY)||'';}catch(_){}
  if(rememberedDirector&&await validateDirectorCode(rememberedDirector)){
    adminCode=rememberedDirector;
    isDirector=true;
  }else if(rememberedDirector){
    try{sessionStorage.removeItem(DIRECTOR_SESSION_KEY);}catch(_){}
  }

  currentIndex=indexForRunningOrder(roomState.current_entry);
  updateNowPlaying();
  updateRoomVisualState();
  $('sync-copy').textContent='Oda hazır · bağlanmak için YAYIN ODASINA GİR düğmesine dokunun.';
}

boot().catch(function(err){
  console.error('Live screening boot failed',err);
  entries=FALLBACK_ENTRIES.slice();
  renderEntries();
  $('room-status').textContent='YEREL ÖN İZLEME';
  $('room-status-note').textContent='Canlı bağlantı servisleri geçici olarak kullanılamıyor.';
  $('sync-copy').textContent='Yerel oynatma kullanılabilir.';
});

})();
(function initFinalBroadcastCountdown(){
  var target=Date.parse('2026-09-23T22:00:00+03:00'),root=document.getElementById('final-countdown');
  if(!root)return;
  function pad(n){return String(n).padStart(2,'0')}
  function tick(){var d=target-Date.now();
    if(d<=0){['cd-days','cd-hours','cd-minutes','cd-seconds'].forEach(function(id){document.getElementById(id).textContent='00'});document.getElementById('cd-status').textContent='FİNAL YAYINI · ŞİMDİ CANLI';root.classList.add('is-live');return}
    document.getElementById('cd-days').textContent=pad(Math.floor(d/86400000));document.getElementById('cd-hours').textContent=pad(Math.floor(d%86400000/3600000));document.getElementById('cd-minutes').textContent=pad(Math.floor(d%3600000/60000));document.getElementById('cd-seconds').textContent=pad(Math.floor(d%60000/1000));
  } tick();setInterval(tick,1000);
})();
