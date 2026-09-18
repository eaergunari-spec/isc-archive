(() => {
  const links=[...document.querySelectorAll('[data-current-edition-link]')];
  if (!links.length) return;

  const API='https://knwvnbfqnccjiezprrme.supabase.co/rest/v1/rpc/isc_public_current_live_status';
  const KEY='sb_publishable_Zw8H9mMmUop7wkYNKtZB3Q_7dM1QHut';

  async function refresh() {
    try {
      const response=await fetch(API,{
        method:'POST',
        headers:{
          apikey:KEY,
          Authorization:`Bearer ${KEY}`,
          'Content-Type':'application/json'
        },
        body:'{}'
      });
      if (!response.ok) return;
      const data=await response.json();
      if (!data?.ok || !data.edition_number) return;

      links.forEach(link=>{
        const root=link.dataset.currentRoot || '';
        link.href=`${root}editions/${encodeURIComponent(data.edition_number)}/`;
        if (link.dataset.currentLabel !== 'keep') {
          link.textContent=data.title || `ISC ${data.edition_number}`;
        }
      });
    } catch (_) {}
  }

  refresh();
})();