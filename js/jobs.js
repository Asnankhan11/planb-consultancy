/* Progressive enhancement: published listings remain useful with no script or network. */
(() => {
  'use strict';
  const rules = window.PlanBJobs;
  const renderer = window.PlanBJobCards;
  const form = document.getElementById('jobFilters');
  const cards = document.getElementById('jobCards');
  if (!rules || !renderer || !form || !cards) return;
  const count = document.getElementById('jobCount');
  const empty = document.getElementById('jobsEmpty');
  const feedback = document.getElementById('saveFeedback');
  const fields = { q: 'searchInput', industry: 'industryFilter', mode: 'workModeFilter', experience: 'experienceFilter', loc: 'locationFilter', sort: 'sortSelect' };
  const defaults = { q: '', industry: 'all', mode: 'all', experience: 'all', loc: 'all', sort: 'latest' };
  let jobs = null, savedOnly = false, searchTimer;
  const readSaved = () => {
    try {
      const stored = JSON.parse(localStorage.getItem('pb_saved_job_ids') || '[]');
      return Array.isArray(stored) ? [...new Set(stored.map(String).filter(id => /^\d+$/.test(id)))] : [];
    } catch { return []; }
  };
  function values() {
    return { ...Object.fromEntries(Object.entries(fields).map(([key, id]) => [key, document.getElementById(id)?.value || defaults[key]])), saved: savedOnly ? '1' : '' };
  }
  function readUrl() {
    const query = new URLSearchParams(location.search);
    for (const [key, id] of Object.entries(fields)) {
      const input = document.getElementById(id); if (!input) continue;
      const value = query.get(key) || defaults[key];
      input.value = key === 'q' ? value.slice(0, 200) : [...input.options].some(option => option.value === value) ? value : defaults[key];
    }
    savedOnly = query.get('saved') === '1';
    if (['industry', 'mode', 'experience', 'loc'].some(key => document.getElementById(fields[key]).value !== 'all')) document.getElementById('moreFilters').open = true;
  }
  function writeUrl(filters, historyMode) {
    const url = new URL(location.href);
    for (const [key, value] of Object.entries(filters)) {
      if (!value || value === defaults[key]) url.searchParams.delete(key);
      else url.searchParams.set(key, value);
    }
    const next = url.pathname + url.search + url.hash;
    if (next !== location.pathname + location.search + location.hash) history[historyMode === 'push' ? 'pushState' : 'replaceState'](null, '', next);
  }
  function syncControls(filter, saved) {
    document.querySelectorAll('[data-quick-filter]').forEach(button => {
      const type = button.dataset.quickFilter;
      const active = type === 'saved' ? savedOnly : type === 'remote' ? filter.mode === 'remote' : type === 'fresher' ? filter.experience === 'fresher' : !savedOnly && Object.keys(defaults).every(key => filter[key] === defaults[key]);
      button.setAttribute('aria-pressed', String(active));
    });
    const savedCount = document.getElementById('savedCount');
    if (savedCount) savedCount.textContent = String((jobs || []).filter(job => saved.includes(String(job.id))).length);
    const active = ['industry', 'mode', 'experience', 'loc'].filter(key => filter[key] !== 'all').length;
    document.getElementById('activeFilterCount').textContent = active ? `(${active} applied)` : '';
  }
  function render(historyMode = '') {
    if (!jobs) return;
    // Data can refresh while a keyboard user is reading a card. Preserve the
    // exact link/button, including the two links that share the same role URL.
    const controlSelector = 'a[href], button, input, select, textarea, [tabindex]';
    const active = document.activeElement;
    const activeCard = active?.closest('[data-job-id]');
    const focus = activeCard && cards.contains(activeCard) ? {
      id: activeCard.dataset.jobId,
      index: [...activeCard.querySelectorAll(controlSelector)].indexOf(active),
      tag: active.tagName,
      href: active.getAttribute('href')
    } : null;
    const filter = values(), query = filter.q.trim().toLowerCase(), saved = readSaved();
    const filtered = jobs.filter(job => {
      const experience = rules.getExperience(job);
      const searchable = [job.title, job.company, job.description, job.qualification, job.languages, job.location, job.industry, ...(job.categories || [])].join(' ').toLowerCase();
      return (!query || searchable.includes(query)) && rules.matchesIndustry(job, filter.industry) &&
        (filter.mode === 'all' || (filter.mode === 'remote' ? rules.isRemote(job) : !rules.isRemote(job))) &&
        (filter.experience === 'all' || (filter.experience === 'fresher' ? rules.acceptsFreshers(job) : experience.min > 0)) &&
        (filter.loc === 'all' || (filter.loc === 'remote' ? rules.isRemote(job) : !rules.isRemote(job) && String(job.location || '').toLowerCase().includes(filter.loc))) &&
        (!savedOnly || saved.includes(String(job.id)));
    });
    filtered.sort(filter.sort === 'title' ? (a, b) => a.title.localeCompare(b.title) : (a, b) => (Date.parse(b.last_updated || b.created_at) || 0) - (Date.parse(a.last_updated || a.created_at) || 0) || Number(b.id) - Number(a.id));
    cards.innerHTML = filtered.map(job => renderer.renderJobCard(job, { save: true, saved: saved.includes(String(job.id)), saveAttribute: 'data-job-save' })).join('');
    count.textContent = `${filtered.length} of ${jobs.length} current listings${savedOnly ? ' in your saved shortlist' : ' match your filters'}`;
    empty.hidden = filtered.length > 0;
    document.getElementById('emptyTitle').textContent = savedOnly ? 'No saved roles match these filters.' : 'No roles match these filters.';
    document.getElementById('emptyDescription').textContent = savedOnly && !saved.length ? 'Save any role that interests you, then come back here to compare your shortlist.' : 'Try a broader search, choose another work mode or ask the team about your requirements.';
    syncControls(filter, saved);
    if (historyMode) writeUrl(filter, historyMode);
    if (focus) {
      const card = [...cards.querySelectorAll('[data-job-id]')].find(item => item.dataset.jobId === focus.id);
      const controls = card ? [...card.querySelectorAll(controlSelector)] : [];
      const originalPosition = controls[focus.index];
      const matches = element => element?.tagName === focus.tag && element.getAttribute('href') === focus.href;
      const replacement = matches(originalPosition) ? originalPosition : controls.find(matches);
      if (replacement) replacement.focus({ preventScroll: true });
      else {
        // The role may have closed during the refresh. Keep focus in the
        // results region instead of silently sending it back to the document.
        count.setAttribute('tabindex', '-1');
        count.focus({ preventScroll: true });
      }
    }
  }
  function reset() { clearTimeout(searchTimer); form.reset(); savedOnly = false; render('push'); }
  form.addEventListener('submit', event => { event.preventDefault(); clearTimeout(searchTimer); render('push'); });
  form.addEventListener('change', event => { if (event.target.id !== 'searchInput') render('push'); });
  // The sort select is associated with this form but lives beside the results.
  document.getElementById('sortSelect').addEventListener('change', () => render('push'));
  document.getElementById('searchInput').addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => render('replace'), 150); });
  document.getElementById('clearFilters').addEventListener('click', reset);
  document.getElementById('emptyReset').addEventListener('click', () => { reset(); document.getElementById('searchInput').focus(); });
  document.querySelectorAll('[data-quick-filter]').forEach(button => button.addEventListener('click', () => {
    clearTimeout(searchTimer);
    const type = button.dataset.quickFilter;
    if (type === 'all') return reset();
    if (type === 'saved') savedOnly = !savedOnly;
    else {
      const input = document.getElementById(type === 'remote' ? fields.mode : fields.experience);
      input.value = input.value === type ? 'all' : type;
    }
    render('push');
  }));
  window.addEventListener('popstate', () => { clearTimeout(searchTimer); readUrl(); render(); });
  window.addEventListener('storage', event => { if (!event.key || event.key === 'pb_saved_job_ids') render(); });
  window.addEventListener('planb:saved-jobs', () => render());
  cards.addEventListener('click', event => {
    const button = event.target.closest('button[data-job-save]'); if (!button) return;
    const id = button.dataset.jobSave;
    try {
      const ids = readSaved(), saved = !ids.includes(id);
      localStorage.setItem('pb_saved_job_ids', JSON.stringify(saved ? [...ids, id] : ids.filter(value => value !== id)));
      window.dispatchEvent(new CustomEvent('planb:saved-jobs'));
      feedback.textContent = saved ? 'Job saved on this device. Use Saved jobs to compare your shortlist.' : 'Job removed from your saved shortlist.';
      const replacement = cards.querySelector(`[data-job-save="${id}"]`);
      (replacement || document.getElementById('savedFilter')).focus();
    } catch { feedback.textContent = 'Saving is unavailable in this browser. You can bookmark the role page instead.'; }
  });
  readUrl();
  try {
    const published = JSON.parse(document.getElementById('publishedJobs').textContent);
    if (Array.isArray(published)) jobs = published.filter(job => rules.isOpenJob(job)).map(rules.normalizeJob);
  } catch { /* The server-rendered links remain available. */ }
  render();
  (async () => {
    try {
      const response = await fetch('/api/jobs', { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(12000) });
      if (!response.ok) throw new Error('Jobs unavailable');
      const result = await response.json();
      if (!Array.isArray(result)) throw new Error('Invalid job response');
      jobs = result.filter(job => rules.isOpenJob(job)).map(rules.normalizeJob);
      render();
    } catch {
      if (!jobs) count.textContent = 'Published listings are shown below. Filtering is temporarily unavailable; open any role to read its requirements.';
    }
  })();
})();
