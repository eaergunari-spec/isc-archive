(function(){
  'use strict';
  var URL='https://knwvnbfqnccjiezprrme.supabase.co';
  var KEY='sb_publishable_Zw8H9mMmUop7wkYNKtZB3Q_7dM1QHut';
  function el(id){return document.getElementById(id);}
  function formatDeadline(value){
    if(!value)return 'Kapanış tarihi yakında açıklanacak';
    try{
      return new Intl.DateTimeFormat('tr-TR',{timeZone:'Europe/Istanbul',dateStyle:'long',timeStyle:'short'}).format(new Date(value))+' TSİ';
    }catch(_){return 'Kapanış tarihi yakında açıklanacak';}
  }
  async function load(){
    try{
      var response=await fetch(URL+'/rest/v1/rpc/isc_public_submission_context',{
        method:'POST',
        headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json'},
        body:JSON.stringify({p_edition_number:155}),
        cache:'no-store'
      });
      if(!response.ok)throw new Error('submission context '+response.status);
      var data=await response.json();
      if(!data || !data.ok)return;
      var state=data.submissions||{};
      if(el('submission-received'))el('submission-received').textContent=String(state.received||0);
      if(el('submission-country-count'))el('submission-country-count').textContent=String((data.countries||[]).length);
      if(el('submission-deadline'))el('submission-deadline').textContent=formatDeadline(state.closes_at);
      var pill=el('submission-status-pill');
      if(pill){
        pill.classList.toggle('is-closed',!state.open);
        var label=pill.querySelector('span');
        if(label)label.textContent=state.open?'SUBMISSIONS OPEN':'SUBMISSIONS CLOSED';
      }
      var primary=el('primary-submit-link');
      if(primary && !state.open){
        primary.textContent='BAŞVURULAR KAPALI';
        primary.setAttribute('aria-disabled','true');
        primary.removeAttribute('href');
      }
    }catch(err){
      console.error(err);
    }
  }
  load();
})();