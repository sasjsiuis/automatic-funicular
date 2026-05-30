/* ===================================================
   LeadForge — app.js  (v2)
   - Fixed: 500 leads cap removed, proper dataset limit
   - Added: Session History with full CRUD
   =================================================== */

// ─── State ───────────────────────────────────────────
const state = {
  apiKey: '',
  actorId: 'compass~crawler-google-places',
  leads: [],
  filteredLeads: [],
  sessions: [],          // history sessions
  activeFilter: 'all',
  historyFilter: 'all',
  minRating: 0,
  generating: false,
};

// ─── Init ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();
  updateApiStatus();
  updateLeadsBadge();
  updateHistoryBadge();
  updateDashboardStats();
  renderLeadsGrid();
  renderRecentLeads();
  renderHistory();
  setupPreviewListeners();
  setupExportButton();

  document.getElementById('nav-generate').addEventListener('click', () => {
    setTimeout(checkApiWarning, 50);
  });
});

// ─── Storage ──────────────────────────────────────────
function loadFromStorage() {
  try {
    state.apiKey   = localStorage.getItem('lf_api_key')   || '';
    state.actorId  = localStorage.getItem('lf_actor_id')  || 'compass~crawler-google-places';
    state.leads    = JSON.parse(localStorage.getItem('lf_leads')    || '[]');
    state.sessions = JSON.parse(localStorage.getItem('lf_sessions') || '[]');

    if (state.apiKey) document.getElementById('api-key-input').value = state.apiKey;
    document.getElementById('actor-id-input').value = state.actorId;
  } catch(e) { console.error('Storage load error', e); }
}

function saveLeadsToStorage()    { localStorage.setItem('lf_leads',    JSON.stringify(state.leads)); }
function saveSessionsToStorage() { localStorage.setItem('lf_sessions', JSON.stringify(state.sessions)); }

// ─── Navigation ───────────────────────────────────────
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  document.getElementById(`page-${page}`).classList.add('active');
  document.getElementById(`nav-${page}`)?.classList.add('active');

  const labels = {
    dashboard: 'Dashboard', generate: 'Find Leads',
    leads: 'My Leads', history: 'History', settings: 'Settings'
  };
  document.getElementById('breadcrumb').textContent = labels[page] || page;

  if (page === 'generate') setTimeout(checkApiWarning, 50);
  if (page === 'leads')   filterLeads();
  if (page === 'history') renderHistory();

  document.getElementById('sidebar').classList.remove('open');
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => { e.preventDefault(); showPage(item.dataset.page); });
});

document.getElementById('menu-toggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

// ─── API Status ───────────────────────────────────────
function updateApiStatus() {
  const dot  = document.getElementById('status-dot');
  const text = document.getElementById('status-text');
  if (state.apiKey) {
    dot.className = 'status-dot connected';
    text.textContent = 'API Connected';
  } else {
    dot.className = 'status-dot';
    text.textContent = 'No API Key';
  }
}

function checkApiWarning() {
  document.getElementById('api-warning').style.display = state.apiKey ? 'none' : 'flex';
}

// ─── Settings ─────────────────────────────────────────
function saveSettings() {
  const key   = document.getElementById('api-key-input').value.trim();
  const actor = document.getElementById('actor-id-input').value.trim();

  if (!key) { showSettingsAlert('Please enter your Apify API token.', 'error'); return; }

  state.apiKey  = key;
  state.actorId = actor || 'compass~crawler-google-places';
  localStorage.setItem('lf_api_key',  state.apiKey);
  localStorage.setItem('lf_actor_id', state.actorId);

  updateApiStatus();
  showSettingsAlert('Settings saved successfully!', 'success');
  showToast('✅ API key saved', 'success');
}

async function testApiKey() {
  const key = document.getElementById('api-key-input').value.trim();
  if (!key) { showSettingsAlert('Enter an API token first.', 'error'); return; }

  const btn = document.getElementById('test-api-btn');
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Testing…`;
  showSettingsAlert('Testing connection…', 'info');

  try {
    const res  = await fetch(`https://api.apify.com/v2/users/me?token=${key}`);
    const data = await res.json();
    if (res.ok && data.data) {
      showSettingsAlert(`✅ Connected as <strong>${data.data.username || 'User'}</strong>`, 'success');
      showToast('✅ Connection successful!', 'success');
    } else {
      showSettingsAlert('❌ Invalid API token. Please check and try again.', 'error');
    }
  } catch(e) {
    showSettingsAlert('❌ Network error. Check your internet connection.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Test Connection`;
  }
}

function showSettingsAlert(msg, type) {
  const box = document.getElementById('settings-alert');
  box.className = `alert-box ${type}`;
  box.innerHTML = msg;
  box.style.display = 'block';
}

function toggleApiKeyVisibility() {
  const input = document.getElementById('api-key-input');
  const icon  = document.getElementById('eye-icon');
  if (input.type === 'password') {
    input.type = 'text';
    icon.innerHTML = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`;
  } else {
    input.type = 'password';
    icon.innerHTML = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>`;
  }
}

// ─── Rating Selector ──────────────────────────────────
document.querySelectorAll('.rating-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.rating-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.minRating = parseFloat(btn.dataset.rating);
  });
});

// ─── Tag Quick-fill ───────────────────────────────────
function setTag(value) {
  document.getElementById('search-query').value = value;
  updatePreview();
}

// ─── Preview Panel ────────────────────────────────────
function setupPreviewListeners() {
  ['search-query','location-query','max-results'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updatePreview);
  });
  document.getElementById('language')?.addEventListener('change', updatePreview);
}

function updatePreview() {
  const query    = document.getElementById('search-query').value.trim();
  const location = document.getElementById('location-query').value.trim();
  const maxRes   = document.getElementById('max-results').value;
  const lang     = document.getElementById('language').value;
  const body     = document.getElementById('preview-body');

  if (!query && !location) {
    body.innerHTML = `<div class="preview-placeholder">
      <div class="preview-map-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="10" r="3" stroke="currentColor" stroke-width="1.5"/></svg>
      </div>
      <p>Fill in the form to preview your search query</p>
    </div>`;
    return;
  }

  const searchStr = query && location ? `${query} in ${location}` : query || location;
  const langNames = { en:'English', es:'Spanish', fr:'French', de:'German', it:'Italian', pt:'Portuguese', ar:'Arabic', zh:'Chinese' };

  body.innerHTML = `<div class="preview-query-box">
    <div class="pq-item"><span class="pq-label">Query</span><span class="pq-value">${esc(searchStr)}</span></div>
    <div class="pq-item"><span class="pq-label">Location</span><span class="pq-value">${esc(location || '(global)')}</span></div>
    <div class="pq-item"><span class="pq-label">Max</span><span class="pq-value">${esc(maxRes)} results</span></div>
    <div class="pq-item"><span class="pq-label">Language</span><span class="pq-value">${esc(langNames[lang] || lang)}</span></div>
    <div class="pq-item"><span class="pq-label">Min Rating</span><span class="pq-value">${state.minRating > 0 ? state.minRating + '+ ⭐' : 'Any'}</span></div>
  </div>`;
}

// ─── Generate Leads ───────────────────────────────────
async function generateLeads() {
  if (state.generating) return;

  const query    = document.getElementById('search-query').value.trim();
  const location = document.getElementById('location-query').value.trim();
  const maxRes   = parseInt(document.getElementById('max-results').value) || 20;
  const lang     = document.getElementById('language').value;

  if (!state.apiKey) { showToast('⚠️ Add your API key in Settings first', 'error'); showPage('settings'); return; }
  if (!query)        { showToast('Enter a business type or keyword', 'error'); return; }
  if (!location)     { showToast('Enter a target location', 'error'); return; }

  state.generating = true;
  showGeneratingUI(true);
  startProgressTimer();

  const searchString = `${query} in ${location}`;

  // ✅ FIX: No artificial cap — send exactly what user requested
  const input = {
    searchStringsArray: [searchString],
    maxCrawledPlacesPerSearch: maxRes,   // was Math.min(maxRes, 200) — now removed
    language: lang,
    ...(state.minRating > 0 && { minimumStars: state.minRating }),
  };

  try {
    setProgressStep(1);
    await delay(600);

    setProgressStep(2);
    setProgressBar(15);

    const runRes = await fetch(
      `https://api.apify.com/v2/acts/${encodeURIComponent(state.actorId)}/runs?token=${state.apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }
    );

    if (!runRes.ok) {
      const err = await runRes.json().catch(() => ({}));
      throw new Error(err.error?.message || `API error ${runRes.status}`);
    }

    const runData = await runRes.json();
    const runId   = runData.data?.id;
    if (!runId) throw new Error('No run ID returned from Apify');

    setProgressBar(25);
    setProgressStep(3);

    // Poll until done — extended to 120 attempts (10 min) for large scrapes
    const { datasetId, itemCount } = await pollRunCompletion(runId, maxRes);
    setProgressBar(80);

    // ✅ FIX: Fetch ALL items using the limit param matching what user requested
    const items = await fetchDatasetItems(datasetId, maxRes);
    setProgressBar(92);

    setProgressStep(4);
    await delay(300);

    const newLeads = processLeads(items, { query, location, minRating: state.minRating });

    // Save session to history
    const session = {
      id:          `sess_${Date.now()}`,
      query,
      location,
      searchString,
      lang,
      maxRequested: maxRes,
      leadCount:   newLeads.length,
      rawCount:    items.length,
      phones:      newLeads.filter(l => l.phone).length,
      emails:      newLeads.filter(l => l.email).length,
      websites:    newLeads.filter(l => l.website).length,
      avgRating:   avgRatingOf(newLeads),
      leads:       newLeads,
      runId,
      createdAt:   new Date().toISOString(),
    };
    state.sessions.unshift(session);
    saveSessionsToStorage();
    updateHistoryBadge();

    state.leads.unshift(...newLeads);
    saveLeadsToStorage();
    setProgressBar(100);
    await delay(400);

    showGeneratingUI(false);
    stopProgressTimer();

    showToast(`🎉 Found ${newLeads.length} leads! (${items.length} scraped, ${newLeads.length} matched filters)`, 'success');
    updateDashboardStats();
    updateLeadsBadge();
    renderRecentLeads();
    showPage('leads');

  } catch(err) {
    showGeneratingUI(false);
    stopProgressTimer();
    showToast(`❌ ${err.message}`, 'error');
    console.error('Apify error:', err);
  }
}

async function pollRunCompletion(runId, maxRes) {
  // 500 leads can take ~8–10 min; allow up to 120 polls at 5s = 10 min
  const maxAttempts = 120;
  for (let i = 0; i < maxAttempts; i++) {
    await delay(5000);

    const res  = await fetch(`https://api.apify.com/v2/acts/${encodeURIComponent(state.actorId)}/runs/${runId}?token=${state.apiKey}`);
    const data = await res.json();
    const run  = data.data;

    if (!run) throw new Error('Run not found');

    // Smooth progress from 25 → 78 over the poll period
    const pct = 25 + Math.min((i / maxAttempts) * 53, 53);
    setProgressBar(pct);

    // Live stats during polling
    const stats = run.stats || {};
    if (stats.crawledItems || run.itemCount) {
      document.getElementById('progress-title').textContent =
        `Collecting results… (${run.itemCount || stats.crawledItems || 0} found so far)`;
    }

    if (run.status === 'SUCCEEDED') return { datasetId: run.defaultDatasetId, itemCount: run.itemCount || 0 };
    if (['FAILED','ABORTED','TIMED-OUT'].includes(run.status)) {
      throw new Error(`Actor run ${run.status.toLowerCase()}`);
    }
  }
  throw new Error('Timed out waiting for actor to finish (10 min). Try a smaller batch.');
}

async function fetchDatasetItems(datasetId, limit) {
  // ✅ FIX: Pass limit so we retrieve all scraped items, not just the first page
  const url = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${state.apiKey}&format=json&clean=1&limit=${Math.max(limit, 500)}`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch dataset items');
  return res.json();
}

function processLeads(items, { query, location, minRating }) {
  return items
    .filter(item => {
      if (!item.title) return false;
      if (minRating > 0 && (!item.totalScore || item.totalScore < minRating)) return false;
      if (document.getElementById('filter-phone').checked   && !item.phone)              return false;
      if (document.getElementById('filter-website').checked && !item.website)            return false;
      if (document.getElementById('filter-open').checked    && item.temporarilyClosed)   return false;
      return true;
    })
    .map(item => ({
      id:          `lead_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      name:        item.title || 'Unknown',
      category:    item.categoryName || item.categories?.[0] || query,
      address:     item.address || item.street || '',
      city:        item.city || location,
      phone:       item.phone || '',
      email:       item.email || '',
      website:     item.website || '',
      rating:      item.totalScore || null,
      reviewCount: item.reviewsCount || 0,
      isOpen:      !item.temporarilyClosed,
      lat:         item.location?.lat || null,
      lng:         item.location?.lng || null,
      placeId:     item.placeId || '',
      url:         item.url || '',
      hours:       item.openingHours || [],
      scrapedAt:   new Date().toISOString(),
      searchQuery: query,
      searchLoc:   location,
    }));
}

function avgRatingOf(leads) {
  const rated = leads.filter(l => l.rating);
  return rated.length ? +(rated.reduce((s,l) => s + l.rating, 0) / rated.length).toFixed(1) : null;
}

// ─── Progress UI ──────────────────────────────────────
function showGeneratingUI(show) {
  const btn  = document.getElementById('generate-btn');
  const card = document.getElementById('progress-card');

  if (show) {
    btn.querySelector('.btn-content').style.display = 'none';
    btn.querySelector('.btn-loader').style.display  = 'flex';
    btn.disabled = true;
    card.style.display = 'block';
    document.querySelectorAll('.p-step').forEach(s => s.classList.remove('active','done'));
    setProgressBar(5);
  } else {
    btn.querySelector('.btn-content').style.display = 'flex';
    btn.querySelector('.btn-loader').style.display  = 'none';
    btn.disabled = false;
    state.generating = false;
    setTimeout(() => { card.style.display = 'none'; }, 1500);
  }
}

function setProgressStep(step) {
  document.querySelectorAll('.p-step').forEach((el, idx) => {
    if (idx + 1 < step)       { el.classList.add('done');   el.classList.remove('active'); }
    else if (idx + 1 === step) { el.classList.add('active'); el.classList.remove('done'); }
    else                       { el.classList.remove('active','done'); }
  });
  const titles = ['','Connecting to Apify…','Running actor…','Collecting results…','Processing…'];
  document.getElementById('progress-title').textContent = titles[step] || 'Working…';
}

function setProgressBar(pct) {
  document.getElementById('progress-bar').style.width = `${Math.min(pct,100)}%`;
}

let timerInterval = null;
function startProgressTimer() {
  let secs = 0;
  const el = document.getElementById('progress-time');
  timerInterval = setInterval(() => { el.textContent = `${++secs}s`; }, 1000);
}
function stopProgressTimer() { clearInterval(timerInterval); timerInterval = null; }

// ─── Leads Rendering ──────────────────────────────────
function renderLeadsGrid() {
  const grid  = document.getElementById('leads-grid');
  const empty = document.getElementById('leads-empty');
  const search = (document.getElementById('leads-search')?.value || '').toLowerCase();

  let leads = [...state.leads];

  if (search) {
    leads = leads.filter(l =>
      l.name.toLowerCase().includes(search) ||
      l.category.toLowerCase().includes(search) ||
      l.address.toLowerCase().includes(search) ||
      l.city.toLowerCase().includes(search)
    );
  }

  if (state.activeFilter === 'phone')   leads = leads.filter(l => l.phone);
  if (state.activeFilter === 'website') leads = leads.filter(l => l.website);
  if (state.activeFilter === 'rated')   leads = leads.filter(l => l.rating >= 4);

  state.filteredLeads = leads;

  Array.from(grid.children).forEach(c => { if (c.id !== 'leads-empty') c.remove(); });

  if (leads.length === 0) { empty.style.display = 'flex'; return; }
  empty.style.display = 'none';
  leads.forEach(lead => grid.appendChild(buildLeadCard(lead)));
}

function buildLeadCard(lead) {
  const div = document.createElement('div');
  div.className = 'lead-card';
  div.onclick = () => openLeadModal(lead);

  const rating  = lead.rating ? `<div class="lead-rating">⭐ ${lead.rating.toFixed(1)}</div>` : '';
  const address = lead.address ? `<div class="lead-address">📍 ${esc(lead.address)}</div>` : '';
  const phone   = lead.phone   ? `<div class="lead-contact-row"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 12l5 2v4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>${esc(lead.phone)}</span></div>` : '';
  const website = lead.website ? `<div class="lead-contact-row"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" stroke-width="2"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="currentColor" stroke-width="2"/></svg><a href="${esc(lead.website)}" target="_blank" onclick="event.stopPropagation()">${shortUrl(lead.website)}</a></div>` : '';
  const email   = lead.email   ? `<div class="lead-contact-row"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" stroke-width="2"/><polyline points="22,6 12,13 2,6" stroke="currentColor" stroke-width="2"/></svg><a href="mailto:${esc(lead.email)}">${esc(lead.email)}</a></div>` : '';

  const badges = [
    lead.phone   ? `<span class="badge badge-phone">📞 Phone</span>` : '',
    lead.website ? `<span class="badge badge-web">🌐 Web</span>` : '',
    lead.email   ? `<span class="badge badge-email">📧 Email</span>` : '',
    lead.isOpen  ? `<span class="badge badge-open">🟢 Open</span>` : '',
  ].filter(Boolean).join('');

  div.innerHTML = `
    <div class="lead-card-top">
      <div class="lead-name">${esc(lead.name)}</div>${rating}
    </div>
    <div class="lead-category">${esc(lead.category)}</div>
    ${address}
    <div class="lead-contacts">${phone}${website}${email}</div>
    ${badges ? `<div class="lead-badges">${badges}</div>` : ''}
  `;
  return div;
}

function filterLeads() { renderLeadsGrid(); }

function setLeadFilter(filter, el) {
  document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  state.activeFilter = filter;
  renderLeadsGrid();
}

function clearAllLeads() {
  if (!confirm('Clear all leads? This cannot be undone.')) return;
  state.leads = [];
  state.filteredLeads = [];
  saveLeadsToStorage();
  renderLeadsGrid();
  renderRecentLeads();
  updateDashboardStats();
  updateLeadsBadge();
  showToast('All leads cleared', 'info');
}

// ─── Dashboard Stats ──────────────────────────────────
function updateDashboardStats() {
  const total   = state.leads.length;
  const phones  = state.leads.filter(l => l.phone).length;
  const emails  = state.leads.filter(l => l.email).length;
  const rated   = state.leads.filter(l => l.rating);
  const avgRate = rated.length ? (rated.reduce((s,l) => s + l.rating, 0) / rated.length) : null;

  document.getElementById('stat-total').textContent  = total;
  document.getElementById('stat-phone').textContent  = phones;
  document.getElementById('stat-email').textContent  = emails;
  document.getElementById('stat-rating').textContent = avgRate ? avgRate.toFixed(1) + ' ⭐' : '—';

  document.getElementById('stat-total-change').textContent = total ? `${total} found` : '—';
  document.getElementById('stat-phone-pct').textContent    = phones && total ? `${Math.round(phones/total*100)}% of leads` : '—';
  document.getElementById('stat-email-pct').textContent    = emails && total ? `${Math.round(emails/total*100)}% of leads` : '—';
}

function updateLeadsBadge()   { document.getElementById('leads-count-badge').textContent   = state.leads.length; }
function updateHistoryBadge() { document.getElementById('history-count-badge').textContent = state.sessions.length; }

function renderRecentLeads() {
  const list   = document.getElementById('recent-leads-list');
  const recent = state.leads.slice(0, 6);

  if (recent.length === 0) {
    list.innerHTML = `<div class="empty-state-small">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/><path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      <p>No leads yet. Generate your first batch!</p>
    </div>`;
    return;
  }

  list.innerHTML = recent.map(lead => {
    const initials = lead.name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
    const rating   = lead.rating ? `<span class="rl-rating">⭐ ${lead.rating.toFixed(1)}</span>` : '';
    return `<div class="recent-lead-item" onclick="openLeadModal(${JSON.stringify(lead).replace(/"/g,'&quot;')})">
      <div class="rl-avatar">${initials.slice(0,2)}</div>
      <div class="rl-info">
        <div class="rl-name">${esc(lead.name)}</div>
        <div class="rl-sub">${esc(lead.category)} · ${esc(lead.city || lead.searchLoc)}</div>
      </div>${rating}
    </div>`;
  }).join('');
}

// ─── HISTORY ──────────────────────────────────────────
function renderHistory() {
  const grid  = document.getElementById('history-grid');
  const empty = document.getElementById('history-empty');
  const search = (document.getElementById('history-search')?.value || '').toLowerCase();

  let sessions = [...state.sessions];

  if (search) {
    sessions = sessions.filter(s =>
      s.query.toLowerCase().includes(search) ||
      s.location.toLowerCase().includes(search)
    );
  }

  if (state.historyFilter === 'large') sessions = sessions.filter(s => s.leadCount >= 100);
  if (state.historyFilter === 'small') sessions = sessions.filter(s => s.leadCount < 100);

  Array.from(grid.children).forEach(c => { if (c.id !== 'history-empty') c.remove(); });

  if (sessions.length === 0) { empty.style.display = 'flex'; return; }
  empty.style.display = 'none';

  sessions.forEach(sess => grid.appendChild(buildSessionCard(sess)));
}

function buildSessionCard(sess) {
  const div = document.createElement('div');
  div.className = 'session-card';

  const date  = new Date(sess.createdAt);
  const dateStr = date.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
  const timeStr = date.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });

  const emoji = getQueryEmoji(sess.query);
  const avgR  = sess.avgRating ? `⭐ ${sess.avgRating}` : '—';

  div.innerHTML = `
    <div class="session-card-top">
      <div class="session-icon">${emoji}</div>
      <div class="session-meta">
        <div class="session-query">${esc(sess.query)}</div>
        <div class="session-location">📍 ${esc(sess.location)}</div>
      </div>
      <div class="session-badge">${sess.leadCount} leads</div>
    </div>

    <div class="session-stats">
      <div class="session-stat">
        <span class="session-stat-val">${sess.phones}</span>
        <span class="session-stat-lbl">📞 Phones</span>
      </div>
      <div class="session-stat">
        <span class="session-stat-val">${sess.emails}</span>
        <span class="session-stat-lbl">📧 Emails</span>
      </div>
      <div class="session-stat">
        <span class="session-stat-val">${avgR}</span>
        <span class="session-stat-lbl">Avg Rating</span>
      </div>
    </div>

    <div class="session-footer">
      <div class="session-time">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><polyline points="12 6 12 12 16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        ${dateStr} · ${timeStr}
      </div>
      <div class="session-actions">
        <button class="session-btn primary" onclick="viewSession('${esc(sess.id)}')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/></svg>
          View
        </button>
        <button class="session-btn" onclick="exportSession('${esc(sess.id)}')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><polyline points="7 10 12 15 17 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          CSV
        </button>
        <button class="session-btn danger" onclick="deleteSession('${esc(sess.id)}')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><polyline points="3 6 5 6 21 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </button>
      </div>
    </div>
  `;
  return div;
}

function viewSession(sessionId) {
  const sess = state.sessions.find(s => s.id === sessionId);
  if (!sess) return;

  const overlay = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');

  const rows = sess.leads.slice(0, 200).map((lead, i) => {
    const initials = lead.name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
    const badges = [
      lead.phone   ? `<span class="badge badge-phone" style="font-size:0.65rem;padding:2px 6px">📞</span>` : '',
      lead.website ? `<span class="badge badge-web"   style="font-size:0.65rem;padding:2px 6px">🌐</span>` : '',
      lead.email   ? `<span class="badge badge-email" style="font-size:0.65rem;padding:2px 6px">📧</span>` : '',
    ].filter(Boolean).join('');

    return `<div class="session-lead-row" onclick="closeModal();setTimeout(()=>openLeadModal(${JSON.stringify(lead).replace(/"/g,'&quot;')}),150)">
      <span class="slr-num">${i+1}</span>
      <div class="slr-avatar">${initials.slice(0,2)}</div>
      <div class="slr-info">
        <div class="slr-name">${esc(lead.name)}</div>
        <div class="slr-sub">${esc(lead.address || lead.city)}</div>
      </div>
      <div class="slr-badges">${badges}</div>
      ${lead.rating ? `<span style="font-size:0.75rem;color:var(--amber);font-weight:700;flex-shrink:0">⭐ ${lead.rating.toFixed(1)}</span>` : ''}
    </div>`;
  }).join('');

  const moreNote = sess.leads.length > 200
    ? `<div style="text-align:center;padding:12px;color:var(--text-muted);font-size:0.8rem">Showing 200 of ${sess.leads.length}. Export CSV for full list.</div>`
    : '';

  content.innerHTML = `
    <div class="modal-lead-name" style="font-size:1.2rem">${getQueryEmoji(sess.query)} ${esc(sess.query)}</div>
    <div class="modal-category">📍 ${esc(sess.location)} · ${new Date(sess.createdAt).toLocaleDateString()}</div>

    <div class="modal-section" style="margin-bottom:16px">
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">
        <div class="modal-field" style="text-align:center">
          <div class="modal-field-label">Total</div>
          <div class="modal-field-value" style="font-size:1.2rem;font-weight:800">${sess.leadCount}</div>
        </div>
        <div class="modal-field" style="text-align:center">
          <div class="modal-field-label">Phones</div>
          <div class="modal-field-value" style="font-size:1.2rem;font-weight:800;color:var(--teal)">${sess.phones}</div>
        </div>
        <div class="modal-field" style="text-align:center">
          <div class="modal-field-label">Websites</div>
          <div class="modal-field-value" style="font-size:1.2rem;font-weight:800;color:var(--accent-light)">${sess.websites}</div>
        </div>
        <div class="modal-field" style="text-align:center">
          <div class="modal-field-label">Avg Rating</div>
          <div class="modal-field-value" style="font-size:1.2rem;font-weight:800;color:var(--amber)">${sess.avgRating ? '⭐ '+sess.avgRating : '—'}</div>
        </div>
      </div>
    </div>

    <div class="session-leads-header">
      <h3>All Leads (${sess.leads.length})</h3>
      <button class="session-btn primary" onclick="exportSession('${esc(sess.id)}')">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><polyline points="7 10 12 15 17 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        Export CSV
      </button>
    </div>
    <div class="session-leads-list">${rows}${moreNote}</div>
  `;

  overlay.classList.add('open');
}

function deleteSession(sessionId) {
  if (!confirm('Delete this session? The leads in "My Leads" will remain.')) return;
  state.sessions = state.sessions.filter(s => s.id !== sessionId);
  saveSessionsToStorage();
  updateHistoryBadge();
  renderHistory();
  showToast('Session deleted', 'info');
}

function exportSession(sessionId) {
  const sess = state.sessions.find(s => s.id === sessionId);
  if (!sess || sess.leads.length === 0) { showToast('No leads in this session', 'error'); return; }

  const headers = ['Name','Category','Address','City','Phone','Email','Website','Rating','Reviews','Open','Scraped At'];
  const rows    = sess.leads.map(l => [
    l.name, l.category, l.address, l.city,
    l.phone, l.email, l.website,
    l.rating || '', l.reviewCount,
    l.isOpen ? 'Yes' : 'No', l.scrapedAt,
  ].map(v => `"${String(v||'').replace(/"/g,'""')}"`));

  const csv  = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `leads_${sess.query.replace(/\s+/g,'_')}_${sess.location.replace(/\s+/g,'_')}_${new Date(sess.createdAt).toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`✅ Exported ${sess.leads.length} leads`, 'success');
}

function filterHistory() { renderHistory(); }

function setHistoryFilter(filter, el) {
  document.querySelectorAll('#history-filter-pills .pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  state.historyFilter = filter;
  renderHistory();
}

function clearAllHistory() {
  if (!confirm('Clear all history? Leads in "My Leads" will remain.')) return;
  state.sessions = [];
  saveSessionsToStorage();
  updateHistoryBadge();
  renderHistory();
  showToast('History cleared', 'info');
}

function getQueryEmoji(query = '') {
  const q = query.toLowerCase();
  if (q.includes('restaurant') || q.includes('food') || q.includes('cafe')) return '🍽️';
  if (q.includes('dentist')) return '🦷';
  if (q.includes('law') || q.includes('attorney') || q.includes('legal')) return '⚖️';
  if (q.includes('gym') || q.includes('fitness')) return '💪';
  if (q.includes('real estate') || q.includes('realtor')) return '🏠';
  if (q.includes('plumb')) return '🔧';
  if (q.includes('electric')) return '⚡';
  if (q.includes('account') || q.includes('tax')) return '📊';
  if (q.includes('hotel') || q.includes('motel')) return '🏨';
  if (q.includes('school') || q.includes('college')) return '🎓';
  if (q.includes('hospital') || q.includes('clinic') || q.includes('doctor')) return '🏥';
  if (q.includes('salon') || q.includes('spa') || q.includes('beauty')) return '💅';
  if (q.includes('car') || q.includes('auto')) return '🚗';
  if (q.includes('shop') || q.includes('store') || q.includes('retail')) return '🛍️';
  return '📍';
}

// ─── Lead Detail Modal ────────────────────────────────
function openLeadModal(lead) {
  const overlay = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');

  const rating = lead.rating ? `<strong>${lead.rating.toFixed(1)} ⭐</strong> (${lead.reviewCount} reviews)` : 'N/A';
  const hours  = lead.hours?.length
    ? lead.hours.map(h => `<div>${esc(h.day)}: ${esc(h.hours)}</div>`).join('')
    : '<em style="color:var(--text-muted)">Not available</em>';

  const mapUrl = lead.lat && lead.lng
    ? `https://www.google.com/maps?q=${lead.lat},${lead.lng}`
    : lead.url || '#';

  content.innerHTML = `
    <div class="modal-lead-name">${esc(lead.name)}</div>
    <div class="modal-category">${esc(lead.category)}</div>

    <div class="modal-section">
      <div class="modal-section-label">Contact Information</div>
      <div class="modal-grid">
        <div class="modal-field">
          <div class="modal-field-label">Phone</div>
          <div class="modal-field-value">${lead.phone ? `<a href="tel:${esc(lead.phone)}">${esc(lead.phone)}</a>` : '<em style="color:var(--text-muted)">N/A</em>'}</div>
        </div>
        <div class="modal-field">
          <div class="modal-field-label">Email</div>
          <div class="modal-field-value">${lead.email ? `<a href="mailto:${esc(lead.email)}">${esc(lead.email)}</a>` : '<em style="color:var(--text-muted)">N/A</em>'}</div>
        </div>
        <div class="modal-field">
          <div class="modal-field-label">Website</div>
          <div class="modal-field-value">${lead.website ? `<a href="${esc(lead.website)}" target="_blank">${shortUrl(lead.website)}</a>` : '<em style="color:var(--text-muted)">N/A</em>'}</div>
        </div>
        <div class="modal-field">
          <div class="modal-field-label">Rating</div>
          <div class="modal-field-value">${rating}</div>
        </div>
      </div>
    </div>

    <div class="modal-section">
      <div class="modal-section-label">Location</div>
      <div class="modal-field">
        <div class="modal-field-label">Address</div>
        <div class="modal-field-value">${esc(lead.address || 'N/A')}</div>
      </div>
      <div style="margin-top:10px">
        <a href="${mapUrl}" target="_blank" class="btn-ghost" style="text-decoration:none;display:inline-flex;font-size:0.8rem;padding:8px 14px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="10" r="3" stroke="currentColor" stroke-width="2"/></svg>
          View on Google Maps
        </a>
      </div>
    </div>

    <div class="modal-section">
      <div class="modal-section-label">Opening Hours</div>
      <div class="modal-field" style="font-size:0.82rem;line-height:1.8;color:var(--text-secondary)">${hours}</div>
    </div>

    <div class="modal-section" style="margin-bottom:0">
      <div class="modal-section-label">Scraped Info</div>
      <div class="modal-grid">
        <div class="modal-field">
          <div class="modal-field-label">Search Query</div>
          <div class="modal-field-value">${esc(lead.searchQuery)}</div>
        </div>
        <div class="modal-field">
          <div class="modal-field-label">Location</div>
          <div class="modal-field-value">${esc(lead.searchLoc)}</div>
        </div>
      </div>
    </div>
  `;

  overlay.classList.add('open');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

// ─── CSV Export (All Leads) ───────────────────────────
function setupExportButton() {
  document.getElementById('export-btn').addEventListener('click', exportCSV);
}

function exportCSV() {
  if (state.leads.length === 0) { showToast('No leads to export', 'error'); return; }

  const headers = ['Name','Category','Address','City','Phone','Email','Website','Rating','Reviews','Open','Search Query','Location','Scraped At'];
  const rows    = state.leads.map(l => [
    l.name, l.category, l.address, l.city,
    l.phone, l.email, l.website,
    l.rating || '', l.reviewCount,
    l.isOpen ? 'Yes' : 'No',
    l.searchQuery, l.searchLoc, l.scrapedAt,
  ].map(v => `"${String(v||'').replace(/"/g,'""')}"`));

  const csv  = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `all_leads_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`✅ Exported ${state.leads.length} leads`, 'success');
}

// ─── Toast ────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast     = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity   = '0';
    toast.style.transform = 'translateY(8px)';
    toast.style.transition = '0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ─── Helpers ──────────────────────────────────────────
function esc(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function shortUrl(url) {
  try { return new URL(url).hostname.replace(/^www\./,''); }
  catch { return url; }
}
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
