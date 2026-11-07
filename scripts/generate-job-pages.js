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
    return String(value).split(/\n\s*\n/).map(block => `<p>${esc(block).replace(/\n/g, '<br>')}</p>`).join('\n');
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
function renderJobCards(jobs) {
    return jobs.filter(job => isOpenJob(job)).map(normalizeJob).map(job => `<article class="job-card bg-white rounded-2xl border border-gray-200 p-6 flex flex-col" data-job-id="${esc(job.id)}">
<div class="flex flex-wrap gap-2 text-xs font-semibold text-navy-800 mb-3"><span>${esc(isRemote(job) ? 'Remote' : job.location)}</span><span aria-hidden="true">·</span><span>${esc(job.industry)}</span></div>
<h3 class="font-display text-xl font-bold text-navy-900"><a class="hover:underline" href="${esc(jobPath(job))}">${esc(job.title)}</a></h3>
<p class="mt-2 text-sm text-gray-600">${esc(job.company)}</p>
<p class="mt-4 font-semibold text-navy-900">${esc(job.salary || 'Compensation to be confirmed')}</p>
<p class="mt-2 text-sm text-gray-600">${esc(job.experience_level || 'Experience to be confirmed')}</p>
<p class="mt-1 text-sm text-gray-600">${esc(job.qualification || 'Qualification to be confirmed')}</p>
<div class="mt-5 pt-4 border-t border-gray-100"><a class="font-semibold text-navy-800 underline underline-offset-4" href="${esc(jobPath(job))}">View details and eligibility<span class="sr-only"> for ${esc(job.title)}</span></a></div>
</article>`).join('\n');
}
function renderPage(job, allJobs) {
    const open = isOpenJob(job), closed = String(job.status).toLowerCase() === 'closed';
    const status = open ? 'Open for enquiries and applications' : closed ? 'This listing is closed' : 'Details pending — applications paused';
    const facts = siteFacts();
    const company = known(job.company) ? job.company : 'Hiring employer to be confirmed';
    const title = `${job.title}${open ? '' : closed ? ' — Closed' : ' — Details pending'} | Plan B Careers`;
    const description = open ? `${job.title} with ${company}. Advertised compensation: ${job.salary || 'to be confirmed'}. Read the listed duties, eligibility, equipment and application details.` : `${job.title}: ${closed ? 'this listing is closed' : 'applications are paused while missing details are confirmed'}. Browse current openings and contact Plan B Careers for guidance.`;
    const rows = [['Advertised compensation', job.salary], ['Work arrangement', job.work_mode], ['Advertised location', job.location], ['Employment type', known(job.employment_type) ? job.employment_type : 'Confirm contract type'], ['Experience', job.experience_level], ['Qualification', job.qualification], ['Languages', job.languages], ['Shift / schedule', job.shifts]].filter(([, v]) => known(v));
    const related = allJobs.filter(other => other.id !== job.id && isOpenJob(other)).slice(0, 3);
    const body = `<div class="max-w-6xl mx-auto px-4 sm:px-6 py-10">
<nav aria-label="Breadcrumb" class="text-sm text-gray-600 mb-8"><a class="underline" href="/">Home</a> / <a class="underline" href="/jobs">Jobs</a> / <span>${esc(job.title)}</span></nav>
<header class="max-w-4xl"><p class="text-sm font-semibold text-amber-700 mb-3">${esc(status)}</p><h1 class="font-display text-3xl sm:text-4xl font-extrabold text-navy-900 leading-tight">${esc(job.title)}</h1><p class="text-lg mt-4 text-gray-700">${esc(company)}${known(job.location) ? ' · ' + esc(job.location) : ''}</p><p class="text-sm text-gray-500 mt-3">Listing #${esc(job.id)}${dateOnly(job.last_updated) ? ' · Source record updated ' + esc(dateOnly(job.last_updated)) : ''}</p></header>
${!open ? `<section class="mt-8 p-6 rounded-2xl border border-amber-300 bg-amber-50"><h2 class="font-bold text-xl text-navy-900">${closed ? 'Applications are no longer accepted' : 'Confirm the missing details first'}</h2><p class="mt-3 leading-relaxed">${esc(job.publication_note || (closed ? 'This vacancy is retained as an archive. It is excluded from our active job listings and job sitemap.' : 'Applications are paused until the missing vacancy information is available.'))}</p><a class="inline-block mt-4 font-semibold underline" href="/jobs">View current job listings</a></section>` : ''}
<div class="grid lg:grid-cols-3 gap-8 mt-8"><div class="lg:col-span-2 space-y-8">
<section class="border border-gray-200 rounded-2xl p-6"><h2 class="font-display text-2xl font-bold text-navy-900">Listing details</h2><dl class="mt-5 grid sm:grid-cols-2 gap-5">${rows.map(([label, value]) => `<div><dt class="text-sm text-gray-500">${esc(label)}</dt><dd class="font-medium mt-1">${esc(value)}</dd></div>`).join('')}</dl></section>
<section class="border border-gray-200 rounded-2xl p-6"><h2 class="font-display text-2xl font-bold text-navy-900">${known(job.description) ? 'Duties and requirements in the source listing' : 'Job description pending'}</h2><div class="mt-5 space-y-5 leading-relaxed text-gray-700">${descriptionHtml(job.description) || '<p>A complete description is not available for this record. Contact the team for the actual responsibilities and selection requirements.</p>'}</div></section>
<section class="border border-gray-200 rounded-2xl p-6"><h2 class="font-display text-2xl font-bold text-navy-900">Before you proceed</h2><p class="mt-4 leading-relaxed">Compensation is reproduced as advertised. An “up to” figure is a ceiling, incentives depend on targets, and commission or task-based work has no stated fixed monthly pay. Confirm take-home pay, deductions, shifts and any training terms in writing.</p>${isRemote(job) && !job.applicant_countries?.length ? '<p class="mt-4 leading-relaxed">This source record does not state all eligible applicant locations. Confirm that your city or state is accepted before proceeding.</p>' : ''}<p class="mt-4 leading-relaxed">${esc(facts.fees?.statement || 'Ask for written service terms and any charges before agreeing to a service. Hiring decisions remain with the employer.')}</p><p class="mt-4"><a class="underline" href="/resources/salary-offer-checklist">Use the salary and offer checklist</a> · <a class="underline" href="/resources/remote-job-safety">Check a remote job offer</a></p></section>
</div><aside class="lg:col-span-1"><div class="border border-gray-200 rounded-2xl p-6 lg:sticky lg:top-28"><h2 class="text-xl font-bold text-navy-900">${open ? 'Next step' : 'Looking for another role?'}</h2><p class="mt-3 text-gray-600 leading-relaxed">${open ? 'Read the requirements, then send your application. The team can clarify availability and the employer’s selection process.' : 'Explore the open listings or contact the team about the information missing from this record.'}</p>${open ? `<a class="block mt-5 rounded-xl bg-navy-900 text-white text-center font-bold px-5 py-3" href="/apply-job?job_id=${esc(job.id)}">Apply for this listing</a>` : '<a class="block mt-5 rounded-xl bg-navy-900 text-white text-center font-bold px-5 py-3" href="/jobs">Browse open jobs</a>'}${open ? `<button type="button" class="button button-outline mt-3" data-save-job="${esc(job.id)}" aria-pressed="false">Save this job</button>` : ''}<a class="block mt-3 text-center underline font-semibold" href="/contact">Ask the Plan B team</a><p class="mt-5 text-xs text-gray-500">A listing does not establish an exclusive partnership or guarantee a job offer.</p></div></aside></div>
<section class="mt-14"><h2 class="font-display text-2xl font-bold text-navy-900">Other open listings</h2><div class="grid md:grid-cols-3 gap-5 mt-6">${renderJobCards(related)}</div></section></div>`;
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
