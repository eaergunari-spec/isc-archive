/* ISC 156 — Golden Turul arrival
   Only activate after verifying that the AVIF image has decoded successfully.
   If AVIF is unsupported or fails to load, the original geometric bird remains.
*/
(() => {
  const poster=document.querySelector('.hero-identity-poster');
  const stage=document.getElementById('phoenix-stage');
  const fallback=poster?.querySelector('.turul-edition-mark');
  if (!poster || !stage || !fallback) return;

  const complete=stage.querySelector('.phoenix-layer--complete');
  if (!complete) return;

  function reveal() {
    if (poster.classList.contains('phoenix-is-active')) return;
    poster.classList.add('phoenix-is-active');
    window.requestAnimationFrame(() => {
      stage.classList.add('is-ready');
    });
  }

  if (complete.complete && complete.naturalWidth > 0) {
    reveal();
  } else {
    complete.addEventListener('load', reveal, {once:true});
    complete.addEventListener('error', () => {
      stage.setAttribute('hidden','');
      /* The geometric Turul remains visible as a safe fallback. */
    }, {once:true});
  }
})();
