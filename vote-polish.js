(() => {
  const list = document.getElementById('ballot-list');
  const message = document.getElementById('ballot-message');
  if (!list) return;

  function focusGripAt(index) {
    requestAnimationFrame(() => {
      const grip = list.querySelectorAll('.drag-grip')[index];
      if (grip) grip.focus();
    });
  }

  list.addEventListener('keydown', event => {
    const grip = event.target.closest('.drag-grip');
    if (!grip) return;
    const card = grip.closest('.ranking-card');
    if (!card) return;

    const cards = [...list.querySelectorAll('.ranking-card')];
    const index = cards.indexOf(card);
    if (index < 0) return;

    let target = index;
    if (event.key === 'ArrowUp') target = Math.max(0, index - 1);
    else if (event.key === 'ArrowDown') target = Math.min(cards.length - 1, index + 1);
    else if (event.key === 'Home') target = 0;
    else if (event.key === 'End') target = cards.length - 1;
    else return;

    event.preventDefault();
    if (target === index) return;

    const direction = target < index ? -1 : 1;
    const steps = Math.abs(target - index);
    let current = index;

    for (let i = 0; i < steps; i++) {
      const currentCard = list.querySelectorAll('.ranking-card')[current];
      const moveButton = currentCard?.querySelector(direction < 0 ? '.move-up' : '.move-down');
      if (!moveButton || moveButton.disabled) break;
      moveButton.click();
      current += direction;
    }

    const artist = card.querySelector('.rank-entry-copy strong')?.textContent?.trim() || 'Entry';
    const pointSlots = Array.isArray(window.ISC_VOTING_POINTS) ? window.ISC_VOTING_POINTS : [];
    const slot = pointSlots[target];
    if (message) {
      message.textContent = slot === undefined
        ? `${artist}, puan çizgisinin altına taşındı.`
        : `${artist}, ${slot} puan slotuna taşındı.`;
    }
    focusGripAt(target);
  });

  const observer = new MutationObserver(() => {
    list.querySelectorAll('.drag-grip').forEach(grip => {
      grip.setAttribute('aria-describedby', 'ranking-keyboard-help');
      grip.setAttribute('aria-keyshortcuts', 'ArrowUp ArrowDown Home End');
    });
  });
  observer.observe(list, { childList: true });
})();
