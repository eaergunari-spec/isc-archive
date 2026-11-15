/* ISC 156 official voting deadline — server-authored date, client-rendered countdown.
   Database deadline and ballot-writing guard are authoritative; this is presentation only. */
(() => {
  "use strict";
  const widgets = Array.from(document.querySelectorAll("[data-isc156-countdown]"));
  if (!widgets.length) return;

  const editionNumber = 156;
  const endpoint = "https://knwvnbfqnccjiezprrme.supabase.co/rest/v1/rpc/isc_public_current_live_status";
  const key = "sb_publishable_Zw8H9mMmUop7wkYNKtZB3Q_7dM1QHut";
  const fallbackDeadline = Date.parse("2026-11-25T17:00:00+03:00");
  let deadline = fallbackDeadline;
  let votingOpen = true;
  let closureNotified = false;
  const fill = (unit, value) => {
    const number = unit === "days" ? String(value).padStart(2,"0") : String(value).padStart(2,"0");
    widgets.forEach(widget => {
      const target = widget.querySelector("[data-isc156-" + unit + "]");
      if (target && target.textContent !== number) target.textContent = number;
    });
  };

  function render() {
    const remaining = Math.max(0, deadline - Date.now());
    const closed = remaining <= 0 || !votingOpen;
    const sec = Math.floor(remaining / 1000);
    fill("days", Math.floor(sec / 86400));
    fill("hours", Math.floor(sec / 3600) % 24);
    fill("minutes", Math.floor(sec / 60) % 60);
    fill("seconds", sec % 60);

    widgets.forEach(widget => {
      widget.dataset.state = closed ? "closed" : "open";
      const label = widget.querySelector("[data-isc156-countdown-label]");
      if (label) label.textContent = closed ? "VOTING HAS CLOSED" : "VOTING CLOSES IN";
    });

    if (closed && !closureNotified) {
      closureNotified = true;
      window.dispatchEvent(new CustomEvent("isc:voting-deadline", {
        detail: { editionNumber, deadline: new Date(deadline).toISOString() }
      }));
    }
  }

  async function refreshFromServer() {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          apikey: key,
          Authorization: "Bearer " + key,
          "Content-Type": "application/json"
        },
        body: "{}",
        cache: "no-store"
      });
      if (!response.ok) return;
      const payload = await response.json();
      if (!payload || payload.ok !== true || Number(payload.edition_number) !== editionNumber) return;

      const serverDeadline = Date.parse(payload.voting_closes_at || "");
      if (Number.isFinite(serverDeadline)) deadline = serverDeadline;
      votingOpen = payload.voting_open === true;
      render();
    } catch (_) {
      // The scheduled close and the database write guard still enforce the actual cutoff.
    }
  }

  render();
  refreshFromServer();
  window.setInterval(render, 1000);
  window.setInterval(refreshFromServer, 60000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refreshFromServer();
  });
})();
