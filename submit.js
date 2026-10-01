(() => {
  const SUPABASE_URL = 'https://knwvnbfqnccjiezprrme.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_Zw8H9mMmUop7wkYNKtZB3Q_7dM1QHut';
  const EDITION = 155;
  const STORAGE_KEY = 'isc_voter_browser_session_v1';
  const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  const $ = id => document.getElementById(id);
  const state = { token: '', country: null, submission: null, open: false };

  function setMessage(node, copy = '', type = '') {
    if (!node) return;
    node.textContent = copy;
    node.classList.remove('error', 'success');
    if (type) node.classList.add(type);
  }

  function formatTime(value) {
    if (!value) return '—';
    try {
      return new Intl.DateTimeFormat('tr-TR', {
        timeZone: 'Europe/Istanbul',
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(new Date(value)) + ' TSİ';
    } catch (_) {
      return '—';
    }
  }

  function readSession() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return value?.token ? value : null;
    } catch (_) {
      return null;
    }
  }

  function storeSession(token, countrySlug) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        token,
        countrySlug,
        rememberedAt: new Date().toISOString()
      }));
    } catch (_) {}
  }

  function clearSession() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
  }

  function detectProvider(raw) {
    let url;
    try { url = new URL(String(raw || '').trim()); } catch (_) { return null; }
    if (url.protocol !== 'https:') return null;
    const host = url.hostname.toLowerCase();
    const path = url.pathname;

    if (host === 'music.youtube.com' && path === '/watch' && url.searchParams.get('v')) {
      return { key: 'youtube_music', label: 'YOUTUBE MUSIC' };
    }
    if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(host) && path === '/watch' && url.searchParams.get('v')) {
      return { key: 'youtube', label: 'YOUTUBE' };
    }
    if (host === 'youtu.be' && path.length > 1) return { key: 'youtube', label: 'YOUTUBE' };
    if (host === 'open.spotify.com' && (/^\/track\//.test(path) || /^\/intl-[a-z-]+\/track\//.test(path))) {
      return { key: 'spotify', label: 'SPOTIFY TRACK' };
    }
    return null;
  }

  async function rpc(name, args) {
    const { data, error } = await db.rpc(name, args);
    if (error) throw error;
    return data;
  }

  function setWindow(open, closesAt) {
    state.open = Boolean(open);
    $('window-status').textContent = state.open ? 'BAŞVURULAR AÇIK' : 'BAŞVURULAR KAPALI';
    $('window-deadline').textContent = closesAt ? formatTime(closesAt) : 'Henüz açıklanmadı';
    $('submit-live').classList.toggle('closed', !state.open);
  }

  function populateCountries(countries) {
    const select = $('country-select');
    select.innerHTML = '<option value="">Delegasyonunu seç</option>';
    [...(countries || [])]
      .sort((a, b) => String(a.name).localeCompare(String(b.name), 'tr'))
      .forEach(country => {
        const option = document.createElement('option');
        option.value = country.slug;
        option.textContent = country.name;
        select.appendChild(option);
      });
  }

  function showAuth() {
    $('auth-panel').hidden = false;
    $('submission-panel').hidden = true;
    state.country = null;
    state.submission = null;
  }

  function updateNotesCount() {
    $('notes-count').textContent = String($('submission-notes').value.length);
  }

  function updateLinkPreview() {
    const input = $('media-url');
    const provider = detectProvider(input.value);
    const preview = $('link-preview');
    if (!provider) {
      preview.hidden = true;
      return;
    }
    preview.hidden = false;
    $('link-provider').textContent = provider.label;
    $('link-open').href = input.value.trim();
  }

  function fillForm(submission) {
    $('artist-name').value = submission?.artist_name || '';
    $('song-title').value = submission?.song_title || '';
    $('media-url').value = submission?.media_url || '';
    $('submission-notes').value = submission?.notes || '';
    updateNotesCount();
    updateLinkPreview();
  }

  function renderExisting() {
    const box = $('existing-submission');
    const item = state.submission;
    if (!item) {
      box.hidden = true;
      return;
    }
    const provider = detectProvider(item.media_url);
    box.hidden = false;
    $('existing-title').textContent = item.artist_name + ' — “' + item.song_title + '”';
    $('existing-meta').textContent = (provider?.label || item.media_provider) + ' · Son güncelleme ' + formatTime(item.updated_at);
    $('existing-revision').textContent = String(item.revision_count || 1);
  }

  function showSubmission(data) {
    state.country = data.country;
    state.submission = data.submission || null;
    setWindow(data.submissions_open, data.closes_at);

    $('auth-panel').hidden = true;
    $('submission-panel').hidden = false;
    $('active-country').textContent = data.country.name;
    fillForm(state.submission);
    renderExisting();
    $('entry-form').hidden = false;
    $('receipt').hidden = true;

    $('entry-form').querySelectorAll('input, textarea, button').forEach(node => {
      node.disabled = !state.open;
    });

    setMessage(
      $('submission-message'),
      state.open
        ? (state.submission ? 'Mevcut resmî entry’ni güncelleyebilirsin.' : '')
        : 'Başvuru penceresi kapalı. Mevcut kayıt değiştirilemez.',
      state.open ? '' : 'error'
    );
  }

  async function resumeRemembered() {
    const remembered = readSession();
    if (!remembered?.token) return false;
    try {
      const data = await rpc('isc_load_entry_submission', {
        p_token: remembered.token,
        p_edition_number: EDITION
      });
      if (!data?.ok) {
        if (data?.reason === 'invalid_session') clearSession();
        return false;
      }
      state.token = remembered.token;
      showSubmission(data);
      return true;
    } catch (_) {
      return false;
    }
  }

  async function verifyDelegation() {
    const countrySlug = $('country-select').value;
    const code = $('delegation-code').value.trim();
    if (!countrySlug) {
      setMessage($('auth-message'), 'Önce delegasyonunu seç.', 'error');
      return;
    }
    if (!code) {
      setMessage($('auth-message'), 'Delegasyon kodunu gir.', 'error');
      return;
    }

    const button = $('verify-button');
    button.disabled = true;
    setMessage($('auth-message'), 'Delegasyon doğrulanıyor…');

    try {
      const issued = await rpc('isc_issue_submission_session', {
        p_country_slug: countrySlug,
        p_code: code,
        p_edition_number: EDITION
      });

      if (!issued?.ok) {
        setMessage(
          $('auth-message'),
          issued?.reason === 'invalid_code'
            ? 'Kod seçtiğin delegasyonla eşleşmedi.'
            : 'Delegasyon doğrulanamadı.',
          'error'
        );
        return;
      }

      state.token = issued.token;
      storeSession(issued.token, issued.country_slug);
      $('delegation-code').value = '';

      const loaded = await rpc('isc_load_entry_submission', {
        p_token: issued.token,
        p_edition_number: EDITION
      });
      if (!loaded?.ok) throw new Error('session_load_failed');
      showSubmission(loaded);
    } catch (error) {
      console.error(error);
      setMessage($('auth-message'), 'Doğrulama servisine ulaşılamıyor. Yeniden deneyebilirsin.', 'error');
    } finally {
      button.disabled = false;
    }
  }

  function renderReceipt(data) {
    const item = data.submission;
    $('entry-form').hidden = true;
    $('receipt').hidden = false;
    $('receipt-title').textContent = data.created ? 'Başvurun kaydedildi.' : 'Resmî entry güncellendi.';
    $('receipt-copy').textContent = item.artist_name + ' — “' + item.song_title + '” ISC 155 için ' + state.country.name + ' delegasyonunun aktif entry’si.';
    $('receipt-country').textContent = state.country.name;
    $('receipt-code').textContent = data.receipt || ('ISC155-' + item.id);
    $('receipt-revision').textContent = String(item.revision_count || 1);
    $('receipt-time').textContent = formatTime(item.updated_at);
  }

  async function saveEntry(event) {
    event.preventDefault();
    if (!state.open) {
      setMessage($('submission-message'), 'Başvuru penceresi kapalı.', 'error');
      return;
    }

    const artist = $('artist-name').value.trim();
    const song = $('song-title').value.trim();
    const media = $('media-url').value.trim();
    const notes = $('submission-notes').value.trim();
    const provider = detectProvider(media);

    if (!artist || !song || !media) {
      setMessage($('submission-message'), 'Sanatçı adı, şarkı adı ve bağlantı zorunlu.', 'error');
      return;
    }
    if (!provider) {
      setMessage($('submission-message'), 'Geçerli bir YouTube video, YouTube Music veya Spotify track bağlantısı gir.', 'error');
      return;
    }

    const button = $('submit-entry-button');
    button.disabled = true;
    setMessage($('submission-message'), 'Resmî entry kaydediliyor…');

    try {
      const data = await rpc('isc_save_entry_submission', {
        p_token: state.token,
        p_artist_name: artist,
        p_song_title: song,
        p_media_url: media,
        p_notes: notes || null,
        p_edition_number: EDITION
      });

      if (!data?.ok) {
        const copy = data?.reason === 'submissions_closed'
          ? 'Başvuru penceresi kapanmış görünüyor.'
          : data?.reason === 'unsupported_media_url'
            ? 'Bu bağlantı türü desteklenmiyor.'
            : data?.reason === 'invalid_session'
              ? 'Delegasyon oturumun geçersiz. Yeniden doğrulaman gerekiyor.'
              : 'Başvuru kaydedilemedi. Bilgileri kontrol edip yeniden dene.';
        setMessage($('submission-message'), copy, 'error');
        if (data?.reason === 'invalid_session') {
          clearSession();
          state.token = '';
          showAuth();
        }
        return;
      }

      state.submission = data.submission;
      renderExisting();
      renderReceipt(data);
    } catch (error) {
      console.error(error);
      setMessage($('submission-message'), 'Kayıt servisine ulaşılamıyor. Başvurun gönderilmedi; yeniden deneyebilirsin.', 'error');
    } finally {
      button.disabled = false;
    }
  }

  async function forgetDelegation() {
    const token = state.token;
    try {
      if (token) await rpc('isc_forget_voter_browser_session', { p_token: token });
    } catch (_) {}
    clearSession();
    state.token = '';
    showAuth();
    $('delegation-code').value = '';
    setMessage($('auth-message'), 'Bu cihazdaki delegasyon oturumu kaldırıldı.', 'success');
  }

  async function boot() {
    try {
      const context = await rpc('isc_public_submission_context', { p_edition_number: EDITION });
      if (!context?.ok) throw new Error('invalid_submission_context');

      populateCountries(context.countries);
      setWindow(context.submissions?.open, context.submissions?.closes_at);

      const resumed = await resumeRemembered();
      if (!resumed) showAuth();
    } catch (error) {
      console.error(error);
      $('country-select').innerHTML = '<option value="">Başvuru servisi kullanılamıyor</option>';
      $('verify-button').disabled = true;
      setMessage($('auth-message'), 'Başvuru servisine şu anda ulaşılamıyor. Sayfayı yenileyerek tekrar deneyebilirsin.', 'error');
    }
  }

  $('verify-button').addEventListener('click', verifyDelegation);
  $('delegation-code').addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      verifyDelegation();
    }
  });
  $('entry-form').addEventListener('submit', saveEntry);
  $('submission-notes').addEventListener('input', updateNotesCount);
  $('media-url').addEventListener('input', updateLinkPreview);
  $('forget-delegation').addEventListener('click', forgetDelegation);
  $('edit-after-save').addEventListener('click', () => {
    $('receipt').hidden = true;
    $('entry-form').hidden = false;
    $('artist-name').focus();
  });

  boot();
})();