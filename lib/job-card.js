/* One accessible card renderer for generated pages and progressive enhancement. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./jobs-data'));
  else root.PlanBJobCards = factory(root.PlanBJobs);
}(typeof globalThis !== 'undefined' ? globalThis : this, function (rules) {
  'use strict';
  const e = rules.escapeHtml;
  function employerInitials(company) {
    return String(company || '').trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase();
  }
  function renderJobCard(job, { save = false, saved = false, heading = 'h3', saveAttribute = 'data-save-job' } = {}) {
    const tag = ['h2', 'h3', 'h4'].includes(heading) ? heading : 'h3';
    const attribute = saveAttribute === 'data-job-save' ? 'data-job-save' : 'data-save-job';
    const path = e(rules.jobPath(job));
    const saveButton = save ? `<button type="button" class="save-job" ${attribute}="${e(job.id)}" data-job-title="${e(job.title)}" aria-pressed="${saved}" aria-label="${saved ? 'Saved job' : 'Save job'}: ${e(job.title)}${saved ? '. Remove from saved jobs' : ''}">${saved ? 'Saved' : 'Save job'}</button>` : '';
    const applyUrl = `/apply-job?job_id=${e(job.id)}`;
    return `<article class="job-card" data-job-id="${e(job.id)}">
      <div class="job-card-top"><span class="employer-mark" aria-hidden="true">${e(employerInitials(job.company))}</span><p class="job-company">${e(job.company)}</p>${saveButton}</div>
      <${tag}><a href="${path}">${e(job.title)}</a></${tag}>
      <div class="job-meta"><span>${e(rules.isRemote(job) ? 'Remote' : 'Office based')}</span><span>${e(job.experience_level || 'Experience to confirm')}</span></div>
      <div class="job-compensation"><p class="job-label">Advertised compensation</p><p class="job-pay">${e(job.salary || 'Ask for compensation details')}</p></div>
      ${job.qualification ? `<p class="job-eligibility"><span>Qualification</span> ${e(job.qualification)}</p>` : ''}
      <p class="job-location">${e(job.location || 'Confirm eligible location')}</p>
      <div class="job-card-cta-row">
        <a class="button button-gold job-apply-btn" href="${applyUrl}">Apply Now</a>
      </div>
      <div class="job-card-actions"><a class="job-details-link" href="${path}">View role details<span class="sr-only">: ${e(job.title)}</span><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></a>${job.last_updated ? `<span class="job-date">Updated ${e(String(job.last_updated).slice(0, 10))}</span>` : ''}</div>
    </article>`;
  }
  function renderJobCards(jobs, options) {
    return jobs.filter(job => rules.isOpenJob(job)).map(rules.normalizeJob).map(job => renderJobCard(job, options)).join('\n');
  }
  return { renderJobCard, renderJobCards, employerInitials };
}));
