/* ISC 154 event dates are explicit Istanbul/TRT timestamps (UTC+03:00). */
(function(){
  'use strict';
  var votingEnd=Date.parse('2026-09-25T22:00:00+03:00');
  var galaStart=Date.parse('2026-09-25T22:00:00+03:00');
  var votingWasFuture=Date.now()<votingEnd;
  var fired=false;
  function remaining(ms){
    if(ms<=0)return null;
    var days=Math.floor(ms/86400000);
    var hours=Math.floor(ms%86400000/3600000);
    var minutes=Math.ceil(ms%3600000/60000);
    if(minutes===60){hours++;minutes=0}
    if(hours===24){days++;hours=0}
    return (days?days+' gün ':'')+hours+' sa '+minutes+' dk';
  }
  function tick(){
    var now=Date.now();
    var voteRemaining=remaining(votingEnd-now);
    document.querySelectorAll('[data-isc-voting-countdown]').forEach(function(el){
      el.textContent=voteRemaining?'Kalan süre: '+voteRemaining:'Oylama süresi doldu';
    });
    var galaRemaining=remaining(galaStart-now);
    document.querySelectorAll('[data-isc-gala-countdown]').forEach(function(el){
      el.textContent=galaRemaining?'Yayına kalan: '+galaRemaining:'Yayın saati geldi · yayın odasına git';
    });
    if(votingWasFuture&&!fired&&now>=votingEnd){
      fired=true;
      window.dispatchEvent(new CustomEvent('isc:voting-deadline'));
    }
  }
  tick();
  window.setInterval(tick,15000);
})();
