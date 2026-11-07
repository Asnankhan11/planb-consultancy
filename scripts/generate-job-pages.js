'use strict';
/** Generate honest, crawlable vacancy pages from jobs.json. No inferred hiring facts. */
const fs = require('fs');
const path = require('path');
const jobsData = require('../lib/jobs-data');
const { ROOT, BASE, esc, layout, breadcrumbs, siteFacts } = require('./seo-template');
const { normalizeJob, isOpenJob, isRemote, jobPath } = jobsData;
const readJobs = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'jobs.json'), 'utf8')).map(normalizeJob);
const known = value => typeof value === 'string' && value.trim() && !/^(?:not specified|unknown|tbd|n\/?a)$/i.test(value.trim());
function dateOnly(value) {
    const text = String(value || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
    const date = new Date(text + 'T00:00:00Z');
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === text ? text : null;
}

function descriptionHtml(value) {
    if (!known(value)) return '';
    return String(value).replace(/\r\n?/g, '\n').split(/\n\s*\n/).map(block => {
        const groups = [];
        let lines = [], list = false;
        const flush = () => {
            if (!lines.length) return;
            groups.push(list ? `<ul>${lines.map(line => `<li>${esc(line)}</li>`).join('')}</ul>` : `<p>${lines.map(esc).join('<br>')}</p>`);
            lines = [];
        };
        for (const line of block.split('\n')) {
            const bullet = line.match(/^\s*[-•]\s+(.+)$/);
            if (Boolean(bullet) !== list) { flush(); list = Boolean(bullet); }
            lines.push(bullet ? bullet[1] : line);
        }
        flush();
        return groups.join('\n');
    }).join('\n');
}
function salarySchema(job) {
    if (job.base_salary && job.base_salary.currency === 'INR') {
        const v = job.base_salary;
        if (!['HOUR', 'DAY', 'WEEK', 'MONTH', 'YEAR'].includes(v.unitText)) return null;
        const amount = { '@type': 'QuantitativeValue', unitText: v.unitText };
        for (const key of ['value', 'minValue', 'maxValue']) if (Number.isFinite(v[key]) && v[key] >= 0) amount[key] = v[key];
        return Object.keys(amount).length > 2 ? { '@type': 'MonetaryAmount', currency: 'INR', value: amount } : null;
    }
    const text = String(job.salary || '');
    // A take-home figure, CTC, commission or task target is not established base salary.
    if (/commission|performance|in.hand|ctc|after training/i.test(text)) return null;
    // LPA alone may describe a package/CTC. Keep it visible but require explicit
    // base_salary data before asserting an annual base salary in structured data.
    if (/\bLPA\b/i.test(text)) return null;
    const unit = /(?:\/|per)\s*month/i.test(text) ? 'MONTH' : /(?:\/|per)\s*year/i.test(text) ? 'YEAR' : null;
    if (!unit) return null;
    const range = text.match(/₹\s*([\d,]+)\s*[–—-]\s*₹?\s*([\d,]+)/);
    const number = text.match(/₹\s*([\d,]+)/);
    if (!number) return null;
    const value = { '@type': 'QuantitativeValue', unitText: unit };
    if (range) { value.minValue = Number(range[1].replace(/,/g, '')); value.maxValue = Number(range[2].replace(/,/g, '')); }
    else if (/up\s*to/i.test(text)) value.maxValue = Number(number[1].replace(/,/g, ''));
    else value.value = Number(number[1].replace(/,/g, ''));
    return { '@type': 'MonetaryAmount', currency: 'INR', value };
}
function schemaIssues(job) {
    const issues = [];
    if (!isOpenJob(job)) issues.push('Listing is not open for applications.');
    if (!known(job.title)) issues.push('Job title is missing.');
    if (!known(job.company)) issues.push('Hiring employer is missing.');
    if (!known(job.description) || /^Job Category:[^\n]*$/i.test(job.description.trim())) issues.push('Complete job description is missing.');
    if (!dateOnly(job.created_at || job.date_posted)) issues.push('Original publication date is missing.');
    if (isRemote(job)) {
        if (!Array.isArray(job.applicant_countries) || !job.applicant_countries.length) issues.push('Eligible applicant country needs confirmation.');
    } else if (!job.workplace || !known(job.workplace.addressLocality) || !known(job.workplace.addressCountry)) {
        issues.push('Actual workplace locality and country need confirmation.');
    }
    return issues;
}
function jobSchema(job) {
    if (schemaIssues(job).length) return null;
    const schema = {
        '@context': 'https://schema.org', '@type': 'JobPosting',
        '@id': BASE + jobPath(job) + '#job', url: BASE + jobPath(job),
        title: job.title,
        description: descriptionHtml(job.description),
        datePosted: dateOnly(job.created_at || job.date_posted),
        identifier: { '@type': 'PropertyValue', name: 'Plan B Careers listing', value: String(job.id) },
        hiringOrganization: { '@type': 'Organization', name: job.company }
    };
    if (known(job.employer_url)) schema.hiringOrganization.sameAs = job.employer_url;
    if (known(job.employer_logo)) schema.hiringOrganization.logo = job.employer_logo;
    if (job.valid_through) schema.validThrough = job.valid_through;
    const employmentTypes = { 'full time': 'FULL_TIME', 'part time': 'PART_TIME', freelance: 'CONTRACTOR', internship: 'INTERN', temporary: 'TEMPORARY' };
    const employmentType = employmentTypes[String(job.employment_type || '').toLowerCase()];
    if (employmentType) schema.employmentType = employmentType;
    if (isRemote(job)) {
        schema.jobLocationType = 'TELECOMMUTE';
        schema.applicantLocationRequirements = job.applicant_countries.map(name => ({ '@type': 'Country', name }));
    } else {
        schema.jobLocation = { '@type': 'Place', address: { '@type': 'PostalAddress', ...job.workplace } };
    }
    const salary = salarySchema(job);
    if (salary) schema.baseSalary = salary;
    if (known(job.qualification)) schema.educationRequirements = job.qualification;
    if (known(job.experience_level)) schema.experienceRequirements = job.experience_level;
    return schema;
}
const { renderJobCards } = require('../lib/job-card');
function renderPage(job, allJobs) {
    const open = isOpenJob(job), closed = String(job.status).toLowerCase() === 'closed';
    const status = open ? 'Open for enquiries and applications' : closed ? 'This listing is closed' : 'Details pending — applications paused';
    const facts = siteFacts();
    const company = known(job.company) ? job.company : 'Hiring employer to be confirmed';
    const title = `${job.title}${open ? '' : closed ? ' — Closed' : ' — Details pending'} | Plan B Careers`;
    const description = open ? `${job.title} with ${company}. Advertised compensation: ${job.salary || 'to be confirmed'}. Read the listed duties, eligibility, equipment and application details.` : `${job.title}: ${closed ? 'this listing is closed' : 'applications are paused while missing details are confirmed'}. Browse current openings and contact Plan B Careers for guidance.`;
    const rows = [['Advertised compensation', job.salary], ['Work arrangement', job.work_mode], ['Advertised location', job.location], ['Employment type', known(job.employment_type) ? job.employment_type : 'Confirm contract type'], ['Experience', job.experience_level], ['Qualification', job.qualification], ['Languages', job.languages], ['Shift / schedule', job.shifts]].filter(([, v]) => known(v));
    const related = allJobs.filter(other => other.id !== job.id && isOpenJob(other)).slice(0, 3);
    const body = `<section class="job-detail-header"><div class="page-shell">
<nav aria-label="Breadcrumb" class="job-breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><a href="/jobs">Jobs</a><span aria-hidden="true">/</span><span>${esc(job.title)}</span></nav>
<div class="job-heading-row"><div><p class="job-status${open ? ' is-open' : ''}">${esc(status)}</p><h1>${esc(job.title)}</h1><p class="lead">${esc(company)}</p><p class="small-note">Listing #${esc(job.id)}${dateOnly(job.last_updated) ? ' · Source updated ' + esc(dateOnly(job.last_updated)) : ''}</p></div>${open ? `<div class="job-heading-actions"><a class="button button-gold" href="/apply-job?job_id=${esc(job.id)}">Apply for this listing</a><a class="button button-outline" href="#requirements">Read requirements</a></div>` : ''}</div>
<dl class="job-summary"><div class="job-summary-item"><dt>Advertised compensation</dt><dd>${esc(job.salary || 'Confirm compensation')}</dd></div><div class="job-summary-item"><dt>Work arrangement</dt><dd>${esc(job.work_mode || 'Confirm arrangement')}</dd></div><div class="job-summary-item"><dt>Advertised location</dt><dd>${esc(job.location || 'Confirm eligible location')}</dd></div></dl>
</div></section>
<div class="page-shell section">
${!open ? `<section class="notice"><h2>${closed ? 'Applications are no longer accepted' : 'Confirm the missing details first'}</h2><p>${esc(job.publication_note || (closed ? 'This vacancy is retained as an archive. It is excluded from our active job listings and job sitemap.' : 'Applications are paused until the missing vacancy information is available.'))}</p><a class="button button-outline" href="/jobs">View current job listings</a></section>` : ''}
<div class="job-detail-grid"><div class="job-detail-content">
<section class="detail-section"><h2>The role at a glance</h2><dl class="job-facts">${rows.filter(([label]) => !['Advertised compensation', 'Work arrangement', 'Advertised location'].includes(label)).map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl></section>
<section id="requirements" class="detail-section"><h2>${known(job.description) ? 'What the work involves' : 'Job description pending'}</h2><p class="small-note">Responsibilities and requirements reproduced from the source listing.</p><div class="prose">${descriptionHtml(job.description) || '<p>A complete description is not available for this record. Contact the team for the actual responsibilities and selection requirements.</p>'}</div></section>
<section class="detail-section"><h2>Make an informed decision</h2><p>Compensation is reproduced as advertised. An “up to” figure is a ceiling, incentives depend on targets, and commission or task-based work has no stated fixed monthly pay. Confirm take-home pay, deductions, shifts and any training terms in writing.</p>${isRemote(job) && !job.applicant_countries?.length ? '<p>This source record does not state all eligible applicant locations. Confirm that your city or state is accepted before proceeding.</p>' : ''}<p>${esc(facts.fees?.statement || 'Ask for written service terms and any charges before agreeing to a service. Hiring decisions remain with the employer.')}</p><div class="link-row"><a href="/resources/salary-offer-checklist">Salary and offer checklist</a><a href="/resources/remote-job-safety">Remote job safety</a></div></section>
</div><aside><div class="job-apply-panel"><p class="eyebrow">Your next step</p><h2>${open ? 'Interested in this role?' : 'Find another opportunity.'}</h2><p>${open ? 'Check the requirements, then share your interest. The Akola team can help clarify availability and the selection process.' : 'Explore the open listings or ask the team about the information missing from this record.'}</p>${open ? `<a class="button button-gold" href="/apply-job?job_id=${esc(job.id)}">Apply for this listing</a><button type="button" class="button button-outline" data-save-job="${esc(job.id)}" aria-pressed="false">Save this job</button>` : '<a class="button button-gold" href="/jobs">Browse open jobs</a>'}<a class="job-contact-link" href="/contact">Ask the Plan B team</a><h3 class="job-next-heading">What happens next?</h3><ol class="job-next-steps"><li>Confirm that the role fits your experience and location.</li><li>Prepare your resume and questions about the work.</li><li>Discuss the employer’s selection process with the team.</li></ol><p class="small-note">A listing does not establish an exclusive partnership or guarantee a job offer.</p></div></aside></div>
<section class="section related-jobs"><div class="section-heading"><div><h2>Keep exploring.</h2><p>Compare a few roles before choosing your next step.</p></div><a href="/jobs">See all current listings</a></div><div class="card-grid">${renderJobCards(related, { save: true })}</div></section></div>`;
    const schema = jobSchema(job);
    return layout({ title, description, pathname: jobPath(job), body, noindex: !open,
        schemas: [breadcrumbs([['Home', '/'], ['Jobs', '/jobs'], [job.title, jobPath(job)]]), ...(schema ? [schema] : [])] });
}
function generateJobPages() {
    const jobs = readJobs();
    const dir = path.join(ROOT, 'job');
    fs.mkdirSync(dir, { recursive: true });
    const keep = new Set();
    for (const job of jobs) {
        const html = renderPage(job, jobs);
        for (const file of [String(job.id) + '.html', path.basename(jobPath(job)) + '.html']) {
            fs.writeFileSync(path.join(dir, file), html); keep.add(file);
        }
    }
    // Remove only obsolete pages in this generator's numeric-ID namespace.
    for (const file of fs.readdirSync(dir)) if (/^\d+(?:-[a-z0-9-]+)?\.html$/.test(file) && !keep.has(file)) fs.unlinkSync(path.join(dir, file));
    const eligible = jobs.filter(j => jobSchema(j));
    console.log(`Generated ${jobs.length} vacancy records (${jobs.filter(j => isOpenJob(j)).length} open; ${eligible.length} eligible for JobPosting markup).`);
    return jobs;
}
if (require.main === module) generateJobPages();
module.exports = { readJobs, descriptionHtml, salarySchema, schemaIssues, jobSchema, renderJobCards, renderPage, generateJobPages, dateOnly };
