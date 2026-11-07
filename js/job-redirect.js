/* Resolve a legacy job ID only through our own published source. */
(() => {
  'use strict';
  const rules = window.PlanBJobs;
  const params = new URLSearchParams(location.search);
  const id = params.get('id') || params.get('job_id');
  if (!rules || !/^\d+$/.test(id || '')) return;
  (async () => {
    try {
      const response = await fetch('/jobs.json',{headers:{Accept:'application/json'},signal:AbortSignal.timeout(10000)});
      if (!response.ok) return;
      const jobs = await response.json();
      if (!Array.isArray(jobs)) return;
      const job = jobs.find(item => String(item.id) === id);
      if (job && typeof job.title === 'string') location.replace(rules.jobPath(job));
    } catch { /* The existing Browse jobs link remains available. */ }
  })();
})();
