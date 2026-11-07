/* This browser stores a reading list and minimal receipt references, never a candidate profile. */
(() => {
  'use strict';
  const rules = window.PlanBJobs;
  const savedNode = document.getElementById('savedJobs');
  const referencesNode = document.getElementById('applicationReferences');
  const status = document.getElementById('workspaceStatus');
  if (!rules || !savedNode || !referencesNode) return;
  const esc = rules.escapeHtml;
  let jobs = [];
  let loaded = false;
  function read(key) { try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; } }
  function saved() { return [...new Set(read('pb_saved_job_ids').map(String).filter(id => /^\d+$/.test(id)))]; }
  function render() {
    const ids = saved();
    savedNode.innerHTML = ids.length ? ids.map(id => {
      const job = jobs.find(item => String(item.id) === id);
      return `<article class="job-card"><h3>${job ? `<a href="${esc(rules.jobPath(job))}">${esc(job.title)}</a>` : `Saved listing #${esc(id)}`}</h3>${job ? `<p>${esc(job.company)}</p><p>${esc(job.salary || 'Confirm compensation details')}</p><p>${rules.isOpenJob(job) ? 'Marked open in the current publication. Confirm availability before proceeding.' : 'This listing is not currently accepting applications.'}</p>` : `<p>${loaded ? 'This listing is no longer in the current publication.' : 'Job details could not be loaded. Your saved reference is retained.'}</p>`}<button type="button" class="button button-outline" data-remove-saved="${esc(id)}">Remove from saved jobs</button></article>`;
    }).join('') : '<p>You have not saved any jobs on this browser. Open the job directory and choose “Save this job”.</p>';
    const references = read('pb_application_references').filter(item => item && typeof item.id === 'string' && /^(PB|PA)-[A-Z0-9-]{8,80}$/.test(item.id)).slice(0,100);
    referencesNode.innerHTML = references.length ? references.map(item => {
      const date = new Date(item.date), dateLabel = Number.isFinite(date.getTime()) ? date.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : 'Date not available';
      return `<article class="content-card"><h3>${esc(item.title || 'Submission reference')}</h3><p>Reference: <strong>${esc(item.id)}</strong></p><p>Recorded on this device: ${esc(dateLabel)}</p><p>Contact the team with this reference for an update. This browser does not show the employer’s application status.</p></article>`;
    }).join('') : '<p>No confirmed submission reference has been saved on this browser.</p>';
  }
  // Remove obsolete browser records containing applicant/resume details from the previous interface.
  try { for (const key of ['pb_applied_jobs']) localStorage.removeItem(key); } catch { /* Storage can be disabled by browser settings. */ }
  savedNode.addEventListener('click',event => {
    const button = event.target.closest('[data-remove-saved]'); if (!button) return;
    try { localStorage.setItem('pb_saved_job_ids',JSON.stringify(saved().filter(id => id !== button.dataset.removeSaved))); render(); status.textContent = 'The listing was removed from this browser’s saved list.'; }
    catch { status.textContent = 'Saved data could not be changed in this browser.'; }
  });
  document.getElementById('clearSavedData')?.addEventListener('click',() => {
    try { localStorage.removeItem('pb_saved_job_ids'); localStorage.removeItem('pb_application_references'); render(); status.textContent = 'Saved jobs and submission references have been cleared from this browser. This does not delete submissions held by the team.'; }
    catch { status.textContent = 'Saved data could not be cleared in this browser.'; }
  });
  window.addEventListener('storage',event => { if (['pb_saved_job_ids','pb_application_references'].includes(event.key)) render(); });
  render();
  (async () => {
    try {
      const response = await fetch('/jobs.json',{headers:{Accept:'application/json'},signal:AbortSignal.timeout(10000)});
      if (!response.ok) throw new Error('Job records unavailable');
      const result = await response.json(); if (!Array.isArray(result)) throw new Error('Invalid job records');
      jobs = result.map(rules.normalizeJob); loaded = true; render();
    } catch { status.textContent = 'Job details are temporarily unavailable. Your saved IDs and references remain on this browser.'; }
  })();
})();
