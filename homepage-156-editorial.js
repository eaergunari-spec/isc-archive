/* ISC 156 editorial homepage — minimal interaction and status only.
   Never expose individual ballots, recipient choices or interim results. */
(() => {
  "use strict";

  const modal = document.getElementById("welcome-modal");
  const play = document.querySelector("[data-welcome-play]");
  const frame = document.getElementById("welcome-frame");
  let previouslyFocused = null;

  function closeWelcome() {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    frame?.replaceChildren();
    document.body.style.overflow = "";
    previouslyFocused?.focus?.();
  }

  function openWelcome() {
    if (!modal || !frame) return;
    previouslyFocused = document.activeElement;
    const iframe = document.createElement("iframe");
    iframe.src = "https://www.youtube-nocookie.com/embed/rqZGns_5354?autoplay=1&rel=0";
    iframe.title = "Harrison — All the Things She Said, ISC 156 host welcome track";
    iframe.allow = "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    frame.replaceChildren(iframe);
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    modal.querySelector("button[data-close-welcome]")?.focus();
  }

  play?.addEventListener("click", openWelcome);
  modal?.querySelectorAll("[data-close-welcome]").forEach(button => button.addEventListener("click", closeWelcome));
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && modal && !modal.hidden) closeWelcome();
  });

  const statusEndpoint = "https://knwvnbfqnccjiezprrme.supabase.co/rest/v1/rpc/isc_public_current_live_status";
  const publicKey = "sb_publishable_Zw8H9mMmUop7wkYNKtZB3Q_7dM1QHut";

  async function syncStatus() {
    try {
      const response = await fetch(statusEndpoint, {
        method: "POST",
        headers: { apikey: publicKey, Authorization: "Bearer " + publicKey, "Content-Type": "application/json" },
        body: "{}",
        cache: "no-store"
      });
      if (!response.ok) return;
      const data = await response.json();
      if (!data || data.ok !== true || Number(data.edition_number) !== 156) return;

      const total = Number(data.delegations);
      const sent = Number(data.submitted_delegations);
      if (Number.isFinite(total) && Number.isFinite(sent) && total > 0 && sent >= 0 && sent <= total) {
        document.querySelectorAll("[data-ballots]").forEach(el => {
          el.textContent = sent + " / " + total;
        });
      }

      const open = Boolean(data.voting_open);
      document.querySelectorAll("[data-voting-label]").forEach(el => {
        el.textContent = open ? (el.closest(".hero-premiere") ? "THE VOTING IS OPEN" : "VOTING IS OPEN") : "VOTING HAS CLOSED";
      });
      document.querySelectorAll("[data-live-dot]").forEach(el => {
        el.classList.toggle("is-offline", !open);
      });

      if (!open) {
        document.querySelectorAll("[data-vote-cta]").forEach(el => {
          el.href = "editions/156/";
          if (el.classList.contains("nav-vote")) el.innerHTML = 'EDITION HUB <span aria-hidden="true">↗</span>';
          else if (el.classList.contains("vote-button")) el.innerHTML = '<span>EXPLORE THE EDITION</span><span aria-hidden="true">↗</span>';
          else el.innerHTML = '<span>THE OFFICIAL LINE-UP</span><span aria-hidden="true">↗</span>';
        });
      }
    } catch (_) {
      /* Preserve the published content if the anonymous status RPC is temporarily unavailable. */
    }
  }

  syncStatus();
  window.setInterval(syncStatus, 60000);
})();