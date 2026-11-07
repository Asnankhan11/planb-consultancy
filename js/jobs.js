/* Progressive enhancement: the published job links remain usable without JavaScript. */
(() => {
  'use strict';
  const rules = window.PlanBJobs;
  const form = document.getElementById('jobFilters');
  const cards = document.getElementById('jobCards');
  if (!rules || !form || !cards) return;
  const count = document.getElementById('jobCount');
  const empty = document.getElementById('jobsEmpty');
  const fields = {q:'searchInput',industry:'industryFilter',mode:'workModeFilter',experience:'experienceFilter',loc:'locationFilter',sort:'sortSelect'};
  let jobs = null;
  const esc = rules.escapeHtml;
  const readSaved = () => {
    try { const stored = JSON.parse(localStorage.getItem('pb_saved_job_ids') || '[]'); return Array.isArray(stored) ? [...new Set(stored.map(String).filter(id => /^\d+$/.test(id)))] : []; }
    catch { return []; }
  };
  function values() { return Object.fromEntries(Object.entries(fields).map(([key,id]) => [key, document.getElementById(id)?.value || (key === 'q' ? '' : 'all')])); }
  function readUrl() {
    const query = new URLSearchParams(location.search);
    for (const [key,id] of Object.entries(fields)) {
      const input = document.getElementById(id); if (!input) continue;
      const value = query.get(key) || (key === 'sort' ? 'latest' : key === 'q' ? '' : 'all');
      input.value = key === 'q' ? value.slice(0,200) : [...input.options].some(option => option.value === value) ? value : key === 'sort' ? 'latest' : 'all';
    }
  }
  function writeUrl(filters) {
    const url = new URL(location.href);
    for (const [key,value] of Object.entries(filters)) {
      if (!value || value === 'all' || (key === 'sort' && value === 'latest')) url.searchParams.delete(key);
      else url.searchParams.set(key,value);
    }
    history.replaceState(null,'',url.pathname + url.search + url.hash);
  }
  function card(job) {
    const saved = readSaved().includes(String(job.id));
    return `<article class="job-card" data-job-id="${esc(job.id)}"><p class="job-company">${esc(job.company)}</p><h3><a href="${esc(rules.jobPath(job))}">${esc(job.title)}</a></h3><p class="job-pay">${esc(job.salary || 'Ask for compensation details')}</p><div class="job-meta"><span>${esc(job.work_mode || job.type || 'Confirm work arrangement')}</span><span>${esc(job.experience_level || 'Confirm experience requirements')}</span></div><p>${esc(job.location || 'Confirm workplace')}</p><p class="job-date">${job.last_updated ? 'Listing updated ' + esc(job.last_updated) + '. ' : ''}Confirm availability before making plans.</p><a class="button button-outline" href="${esc(rules.jobPath(job))}">View role and requirements</a><button type="button" class="button button-outline" data-job-save="${esc(job.id)}" aria-pressed="${saved}">${saved ? 'Saved on this device' : 'Save this job'}</button></article>`;
  }
  function render(updateUrl = true) {
    if (!jobs) { count.textContent = 'The published listings are shown below. Filtering is unavailable right now; open a listing to read its requirements.'; return; }
    const filter = values(), query = filter.q.trim().toLowerCase();
    const filtered = jobs.filter(job => {
      const experience = rules.getExperience(job);
      const searchable = [job.title,job.company,job.description,job.qualification,job.languages,job.location,job.industry,...(job.categories || [])].join(' ').toLowerCase();
      return (!query || searchable.includes(query)) && rules.matchesIndustry(job,filter.industry) &&
        (filter.mode === 'all' || (filter.mode === 'remote' ? rules.isRemote(job) : !rules.isRemote(job))) &&
        (filter.experience === 'all' || (filter.experience === 'fresher' ? rules.acceptsFreshers(job) : experience.min > 0)) &&
        (filter.loc === 'all' || (filter.loc === 'remote' ? rules.isRemote(job) : !rules.isRemote(job) && String(job.location || '').toLowerCase().includes(filter.loc)));
    });
    filtered.sort(filter.sort === 'title' ? (a,b) => a.title.localeCompare(b.title) : (a,b) => (Date.parse(b.last_updated || b.created_at) || 0) - (Date.parse(a.last_updated || a.created_at) || 0) || Number(b.id) - Number(a.id));
    cards.innerHTML = filtered.map(card).join('');
    count.textContent = `${filtered.length} of ${jobs.length} current listings match your filters`;
    if (empty) empty.hidden = filtered.length > 0;
    if (updateUrl) writeUrl(filter);
  }
  form.addEventListener('submit',event => { event.preventDefault(); render(); });
  form.addEventListener('change',() => render());
  let searchTimer;
  document.getElementById('searchInput')?.addEventListener('input',() => { clearTimeout(searchTimer); searchTimer = setTimeout(render,150); });
  document.getElementById('clearFilters')?.addEventListener('click',() => { form.reset(); render(); });
  window.addEventListener('popstate',() => { readUrl(); render(false); });
  window.addEventListener('storage',event => { if (event.key === 'pb_saved_job_ids') render(false); });
  cards.addEventListener('click',event => {
    const button = event.target.closest('button[data-job-save]'); if (!button) return;
    const id = button.dataset.jobSave;
    try {
      const ids = readSaved(), saved = !ids.includes(id);
      localStorage.setItem('pb_saved_job_ids',JSON.stringify(saved ? [...ids,id] : ids.filter(value => value !== id)));
      button.textContent = saved ? 'Saved on this device' : 'Save this job'; button.setAttribute('aria-pressed',String(saved));
    } catch { button.textContent = 'Saving is unavailable in this browser'; }
  });
  readUrl();
  (async () => {
    try {
      const response = await fetch('/api/jobs',{headers:{Accept:'application/json'},signal:AbortSignal.timeout(12000)});
      if (!response.ok) throw new Error('Jobs unavailable');
      const result = await response.json(); if (!Array.isArray(result)) throw new Error('Invalid job response');
      jobs = result.filter(job => rules.isOpenJob(job)).map(rules.normalizeJob);
      render(false);
    } catch { count.textContent = 'The published listings are shown below. Live filtering is temporarily unavailable; you can still open every listed role.'; }
  })();
})();
