(() => {
  'use strict';

  const SUPABASE_URL = 'https://knwvnbfqnccjiezprrme.supabase.co';
  const PUBLIC_KEY = 'sb_publishable_Zw8H9mMmUop7wkYNKtZB3Q_7dM1QHut';
  const SAVE_ENDPOINT = SUPABASE_URL + '/functions/v1/editorial-save';
  const params = new URLSearchParams(location.search);
  const editorRequested = params.get('edit') === '1';

  const storySlug = (() => {
    const file = (location.pathname.split('/').pop() || '').replace(/\.html$/i, '');
    return /^[a-z0-9][a-z0-9-]{1,120}$/.test(file) ? file : '';
  })();

  if (!storySlug || !document.querySelector('.longread-article')) return;

  const registry = new Map();
  const dirty = new Set();
  let editing = false;
  let saving = false;

  const allowedTags = new Set(['STRONG', 'EM', 'BR', 'Q', 'SPAN', 'SUP', 'SUB']);

  function cleanHtml(raw) {
    const template = document.createElement('template');
    template.innerHTML = String(raw ?? '');

    [...template.content.querySelectorAll('*')].forEach(el => {
      if (!allowedTags.has(el.tagName)) {
        el.replaceWith(...el.childNodes);
        return;
      }
      [...el.attributes].forEach(attr => el.removeAttribute(attr.name));
    });

    return template.innerHTML.trim();
  }

  function register(el, key) {
    if (!el || !key || registry.has(key)) return;
    if (el.querySelector?.('a')) return;
    el.dataset.editKey = key;
    registry.set(key, el);
  }

  function wrapChapterTitle(heading) {
    const holder = heading.querySelector('.chapter-title');
    if (!holder) return null;
    let textSpan = holder.querySelector(':scope > .editorial-title-text');
    if (textSpan) return textSpan;

    const small = holder.querySelector(':scope > small');
    const nodes = [...holder.childNodes].filter(node => node !== small);
    const rawText = nodes.map(node => node.textContent || '').join('').trim();
    nodes.forEach(node => node.remove());

    textSpan = document.createElement('span');
    textSpan.className = 'editorial-title-text';
    textSpan.textContent = rawText;
    holder.appendChild(textSpan);
    return textSpan;
  }

  function registerGrid(grid, chapterKey, prefix) {
    let row = 0;
    [...grid.children].forEach(cell => {
      row += 1;
      register(cell.querySelector(':scope > span'), chapterKey + '.' + prefix + '.' + row + '.label');
      register(cell.querySelector(':scope > strong'), chapterKey + '.' + prefix + '.' + row + '.value');
      register(cell.querySelector(':scope > p'), chapterKey + '.' + prefix + '.' + row + '.note');
    });
  }

  function buildRegistry() {
    register(document.querySelector('.longread-hero-copy h1'), 'hero.title');
    register(document.querySelector('.longread-hero-copy .longread-subtitle'), 'hero.subtitle');
    register(document.querySelector('.longread-hero-copy .longread-deck'), 'hero.deck');
    register(document.querySelector('.longread-article > .standfirst'), 'article.standfirst');

    const premise = document.querySelector('.longread-article > .identity-status');
    if (premise) {
      register(premise.querySelector(':scope > strong'), 'article.premise.title');
      register(premise.querySelector(':scope > p'), 'article.premise.body');
    }

    const article = document.querySelector('.longread-article');
    const headings = [...article.querySelectorAll(':scope > .chapter-heading')];

    headings.forEach((heading, index) => {
      const chapterKey = heading.id || ('chapter-' + String(index + 1).padStart(2, '0'));
      register(wrapChapterTitle(heading), chapterKey + '.title');

      let paragraphNo = 0;
      let quoteNo = 0;
      let dataNo = 0;
      let productionNo = 0;
      let node = heading.nextElementSibling;

      while (node && !node.classList.contains('chapter-heading')) {
        if (node.matches('p') && !node.classList.contains('source-note')) {
          paragraphNo += 1;
          register(node, chapterKey + '.p.' + paragraphNo);
        }

        if (node.matches('.pull-quote')) {
          quoteNo += 1;
          register(node.querySelector('p'), chapterKey + '.quote.' + quoteNo);
        }

        if (node.matches('.story-data-strip')) {
          dataNo += 1;
          registerGrid(node, chapterKey, 'data' + dataNo);
        }

        if (node.matches('.production-grid')) {
          productionNo += 1;
          registerGrid(node, chapterKey, 'production' + productionNo);
        }

        node = node.nextElementSibling;
      }
    });

    register(document.querySelector('.longread-article > .closing-line'), 'article.closing');
  }

  async function loadOverrides() {
    try {
      const url = SUPABASE_URL + '/rest/v1/story_inline_edits'
        + '?story_slug=eq.' + encodeURIComponent(storySlug)
        + '&select=edit_key,content_html';
      const response = await fetch(url, {
        headers: { apikey: PUBLIC_KEY },
        cache: 'no-store'
      });
      if (!response.ok) throw new Error('override load ' + response.status);
      const rows = await response.json();
      rows.forEach(row => {
        const el = registry.get(row.edit_key);
        if (el) el.innerHTML = cleanHtml(row.content_html);
      });
    } catch (error) {
      console.warn('Editorial overrides unavailable', error);
    }
  }

  function setEditableState(active) {
    editing = active;
    document.body.classList.toggle('editorial-mode', active);

    registry.forEach(el => {
      if (active) {
        el.setAttribute('contenteditable', 'true');
        el.setAttribute('spellcheck', 'true');
        el.setAttribute('data-editorial-editable', 'true');
      } else {
        el.removeAttribute('contenteditable');
        el.removeAttribute('spellcheck');
        el.removeAttribute('data-editorial-editable');
      }
    });

    updateToolbar();
  }

  function markDirty(event) {
    const el = event.target.closest?.('[data-edit-key]');
    if (!el || !registry.has(el.dataset.editKey)) return;
    dirty.add(el.dataset.editKey);
    el.classList.add('editorial-dirty');
    updateToolbar();
  }

  function getPasscode(forcePrompt = false) {
    const key = 'isc_editorial_passcode';
    if (!forcePrompt) {
      const current = sessionStorage.getItem(key);
      if (current) return current;
    }
    const entered = window.prompt('ISC Editorial Mode erişim kodu:');
    if (!entered) return '';
    sessionStorage.setItem(key, entered.trim());
    return entered.trim();
  }

  function toolbarMarkup() {
    return `
      <div class="editorial-toolbar-main">
        <span class="editorial-toolbar-kicker">ISC EDITORIAL MODE</span>
        <strong id="editorial-status">Hazır</strong>
      </div>
      <div class="editorial-toolbar-actions">
        <button type="button" data-editor-action="save">Kaydet</button>
        <button type="button" data-editor-action="toggle">Düzenlemeyi kapat</button>
        <button type="button" data-editor-action="exit">Çık</button>
      </div>
    `;
  }

  function ensureToolbar() {
    if (!editorRequested) return null;
    let toolbar = document.getElementById('editorial-toolbar');
    if (!toolbar) {
      toolbar = document.createElement('aside');
      toolbar.id = 'editorial-toolbar';
      toolbar.className = 'editorial-toolbar';
      toolbar.innerHTML = toolbarMarkup();
      document.body.appendChild(toolbar);

      toolbar.addEventListener('click', async event => {
        const button = event.target.closest('button[data-editor-action]');
        if (!button) return;
        const action = button.dataset.editorAction;

        if (action === 'save') await saveChanges();
        if (action === 'toggle') setEditableState(!editing);
        if (action === 'exit') {
          const url = new URL(location.href);
          url.searchParams.delete('edit');
          location.href = url.toString();
        }
      });
    }
    return toolbar;
  }

  function updateToolbar(message = '') {
    const toolbar = ensureToolbar();
    if (!toolbar) return;
    const status = toolbar.querySelector('#editorial-status');
    const toggle = toolbar.querySelector('[data-editor-action="toggle"]');
    const save = toolbar.querySelector('[data-editor-action="save"]');

    if (status) {
      status.textContent = message || (dirty.size ? dirty.size + ' değişiklik kaydedilmedi' : (editing ? 'Sayfada metne tıkla ve yaz' : 'Düzenleme kapalı'));
    }
    if (toggle) toggle.textContent = editing ? 'Düzenlemeyi kapat' : 'Düzenlemeyi aç';
    if (save) {
      save.disabled = saving || dirty.size === 0;
      save.textContent = saving ? 'Kaydediliyor…' : 'Kaydet';
    }
  }

  async function saveChanges(retry = true) {
    if (saving || !dirty.size) return;
    let passcode = getPasscode(false);
    if (!passcode) {
      updateToolbar('Erişim kodu girilmedi');
      return;
    }

    const edits = [...dirty].map(key => ({
      key,
      html: cleanHtml(registry.get(key)?.innerHTML || '')
    }));

    saving = true;
    updateToolbar();

    try {
      const response = await fetch(SAVE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-editor-passcode': passcode
        },
        body: JSON.stringify({ story: storySlug, edits })
      });

      if (response.status === 401 && retry) {
        sessionStorage.removeItem('isc_editorial_passcode');
        saving = false;
        const fresh = getPasscode(true);
        if (!fresh) {
          updateToolbar('Erişim kodu doğrulanamadı');
          return;
        }
        return saveChanges(false);
      }

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || ('save ' + response.status));

      dirty.forEach(key => registry.get(key)?.classList.remove('editorial-dirty'));
      dirty.clear();
      updateToolbar('Kaydedildi · değişiklikler artık canlı');
      window.setTimeout(() => updateToolbar(), 2200);
    } catch (error) {
      console.error(error);
      updateToolbar('Kaydetme başarısız · tekrar dene');
    } finally {
      saving = false;
      updateToolbar();
    }
  }

  document.addEventListener('input', markDirty);
  document.addEventListener('keydown', event => {
    if (!editorRequested) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      saveChanges();
    }
  });

  buildRegistry();
  loadOverrides().finally(() => {
    if (editorRequested) {
      ensureToolbar();
      setEditableState(true);
    }
  });
})();