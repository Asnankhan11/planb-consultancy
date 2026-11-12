'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const data = require('../lib/jobs-data');
const jobPages = require('../scripts/generate-job-pages');
const hubs = require('../scripts/generate-category-pages');
const discovery = require('../scripts/generate-discovery');
const { ROOT, jsonLd } = require('../scripts/seo-template');
const jobs = jobPages.readJobs();
const byId = id => jobs.find(job => job.id === id);
function schemas(html) {
    const values = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]));
    return values.flatMap(value => value['@graph'] || [value]);
}

test('one availability rule rejects closed, incomplete, unknown and expired records', () => {
    assert.deepEqual(jobs.filter(job => data.isOpenJob(job)).map(job => job.id), [10, 12, 17, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37]);
    for (const status of ['Closed', 'Details pending', '', null, undefined]) assert.equal(data.isOpenJob({ status }), false);
    assert.equal(data.isOpenJob({ status: 'Open', publication_status: 'details_pending' }), false);
    assert.equal(data.isOpenJob({ status: 'Open', valid_through: '2026-10-01' }, '2026-11-08'), false);
    assert.equal(data.isOpenJob({ status: 'Open', valid_through: 'not a date' }), false);
    assert.equal(data.isOpenJob({ status: 'Open', valid_through: '2026-12-31' }, '2026-11-08'), true);
});

test('shared taxonomy and experience eligibility fix filters without using qualifications as experience', () => {
    assert.equal(data.matchesIndustry(byId(4), 'Data Entry & Back Office'), true);
    assert.equal(data.matchesIndustry(byId(4), 'bpo'), true);
    assert.equal(data.matchesIndustry(byId(18), 'education'), true);
    assert.equal(data.matchesIndustry(byId(17), 'logistics'), true);
    assert.equal(data.matchesIndustry(byId(19), 'telecalling'), true);
    assert.equal(data.acceptsFreshers(byId(19)), false);
    assert.equal(data.acceptsFreshers(byId(18)), false);
    assert.equal(data.acceptsFreshers({ qualification: '12th Pass', experience_level: '2–5 Years' }), false);
    assert.deepEqual(hubs.categoryJobs(hubs.categories.find(c => c.slug === 'freshers'), jobs).map(job => job.id), [10, 12, 17, 24, 25, 26, 27, 28, 29, 30, 32]);
});

test('salary markup and filters preserve annual/monthly basis and never invent an up-to minimum', () => {
    assert.equal(jobPages.salarySchema(byId(3)), null, 'LPA alone does not establish base salary rather than CTC');
    assert.deepEqual(jobPages.salarySchema({base_salary:{currency:'INR',value:240000,unitText:'YEAR'}}).value, { '@type': 'QuantitativeValue', unitText: 'YEAR', value: 240000 });
    assert.equal(data.getSalaryMonthlyMinMax(byId(3)).min, 20000);
    for (const id of [4, 17]) {
        assert.equal(jobPages.salarySchema(byId(id)).value.minValue, undefined);
        assert.equal(data.getSalaryMonthlyMinMax(byId(id)).min, null);
    }
    for (const id of [10, 12, 21, 22, 23]) assert.equal(jobPages.salarySchema(byId(id)), null);
    assert.equal(data.getSalaryMonthlyMinMax({ salary: '₹240,000 / year' }).min, 20000);
    assert.equal(data.getSalaryMonthlyMinMax({ salary: '₹18,000' }), null);
    assert.equal(jobPages.salarySchema({ salary: '₹18,000' }), null);
    assert.equal(jobPages.salarySchema(byId(19)).value.value, 18000);
});

test('Google job markup requires actual facts and omits unsupported optional fields', () => {
    assert.deepEqual(jobs.filter(job => jobPages.jobSchema(job)).map(job => job.id), [24, 25, 27, 29, 30, 31, 32, 34, 35, 36]);
    const mumbaiSchema = jobPages.jobSchema(byId(34));
    assert.equal(mumbaiSchema.jobLocation.address.addressLocality, 'Mumbai');
    assert.equal(mumbaiSchema.jobLocation.address.addressRegion, 'Maharashtra');
    assert.equal(mumbaiSchema.jobLocation.address.addressCountry, 'IN');
    assert.equal(mumbaiSchema.jobLocationType, undefined);
    const sampleOpenJob = { ...byId(4), status: 'Open', publication_status: 'published' };
    const schema = jobPages.jobSchema(sampleOpenJob);
    assert.equal(schema.jobLocationType, 'TELECOMMUTE');
    assert.equal(schema.applicantLocationRequirements[0].name, 'IN');
    assert.equal(schema.employmentType, undefined);
    assert.equal(schema.validThrough, undefined);
    assert.equal(schema.jobLocation, undefined);
    assert.equal(schema.hiringOrganization.sameAs, undefined);
    assert.equal(schema.hiringOrganization.logo, undefined);
    assert.equal(schema.baseSalary.value.maxValue, 30000);
    assert.equal(jobPages.jobSchema({ ...sampleOpenJob, company: 'Not specified' }), null);
    assert.equal(jobPages.jobSchema({ ...sampleOpenJob, description: null }), null);
    assert.equal(jobPages.jobSchema({ ...sampleOpenJob, applicant_countries: [] }), null);
    assert.equal(jobPages.dateOnly('2026-02-30'), null);
    assert.equal(jobPages.dateOnly('2026-13-01'), null);
});

test('publication keeps closed and pending pages useful without active CTAs or JobPosting', () => {
    for (const id of [2, 3, 4, 5, 18, 19, 21, 22, 23]) {
        const html = jobPages.renderPage(byId(id), jobs);
        assert.match(html, /noindex,follow/);
        assert.doesNotMatch(html, new RegExp('/apply-job\\?job_id=' + id + '(?:"|&|$)'));
        assert.equal(schemas(html).some(schema => schema['@type'] === 'JobPosting'), false);
        assert.match(html, /View current job listings/);
    }
    const cards = jobPages.renderJobCards(jobs);
    assert.equal((cards.match(/data-job-id=/g) || []).length, 17);
    assert.doesNotMatch(cards, /data-job-id="(?:2|3|4|5|18|19|21|22|23)"/);
    assert.doesNotMatch(cards, /href="[^"?#]*\.html/);
    assert.match(cards, /Apply Now/);
    assert.doesNotMatch(cards, /Apply via WhatsApp/);
    const openDetailHtml = jobPages.renderPage(byId(34), jobs);
    assert.match(openDetailHtml, /Apply Now/);
    assert.doesNotMatch(openDetailHtml, /Apply via WhatsApp/);
});

test('local hubs never turn remote inventory into local offices or local job counts', () => {
    const akola = hubs.categories.find(c => c.city === 'Akola');
    assert.equal(hubs.categoryJobs(akola, jobs).length, 0);
    const akolaHtml = hubs.renderCategory(akola, jobs);
    assert.match(akolaHtml, /0 open listings with a stated Akola workplace/);
    assert.match(akolaHtml, /Remote alternatives to check/);
    assert.match(akolaHtml, /City Kotwali/);
    assert.doesNotMatch(akolaHtml, /Garkheda|Civil Lines|431005|444001/);
    const mumbai = hubs.categories.find(c => c.city === 'Mumbai');
    assert.deepEqual(hubs.categoryJobs(mumbai, jobs).map(job => job.id), [34, 35, 36]);
    const mumbaiHtml = hubs.renderCategory(mumbai, jobs);
    assert.match(mumbaiHtml, /3 open listings with a stated Mumbai workplace/);
    assert.doesNotMatch(mumbaiHtml, /noindex,follow/);
    assert.equal(schemas(mumbaiHtml).some(schema => schema['@type'] === 'LocalBusiness'), false);
    for (const config of hubs.categories.filter(c => c.city && c.city !== 'Akola' && hubs.categoryJobs(c, jobs).length === 0)) {
        const html = hubs.renderCategory(config, jobs);
        assert.match(html, /noindex,follow/);
        assert.equal(schemas(html).some(schema => schema['@type'] === 'LocalBusiness'), false);
    }
});

test('data-driven text is escaped in HTML and JSON-LD script blocks', () => {
    const unsafe = '<script>alert("bad")</script>';
    const job = { ...byId(4), title: unsafe, company: unsafe, description: unsafe };
    assert.doesNotMatch(jobPages.renderPage(job, []), /<script>alert/);
    assert.match(jobPages.descriptionHtml(unsafe), /&lt;script&gt;/);
    assert.equal(JSON.parse(jsonLd({ value: unsafe })).value, unsafe);
    assert.doesNotMatch(jsonLd({ value: unsafe }), /<\/script>/);
});

test('the browser and Node share identical job rules', () => {
    const context = vm.createContext({});
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'lib/jobs-data.js'), 'utf8'), context);
    const browser = context.PlanBJobs;
    for (const job of jobs) {
        assert.equal(browser.isOpenJob(job), data.isOpenJob(job));
        assert.equal(browser.acceptsFreshers(job), data.acceptsFreshers(job));
        assert.equal(browser.jobPath(job), data.jobPath(job));
        assert.equal(JSON.stringify(browser.normalizeJob(job)), JSON.stringify(data.normalizeJob(job)));
    }
});

test('generated discovery includes only final canonical public URLs and active job slugs', () => {
    const result = discovery.generateDiscovery();
    assert.equal(result.jobs.length, 17);
    for (const entry of [...result.pages, ...result.jobs]) {
        assert.doesNotMatch(entry.url, /\.html(?:$|[?#])/);
        assert.doesNotMatch(entry.url, /\/job\/\d+$/);
        assert.doesNotMatch(entry.url, /\/(apply-job|apply-admission|dashboard|verify-candidate|job-details)$/);
    }
    for (const id of [2, 3, 4, 5, 18, 19, 21, 22, 23]) assert.equal(result.jobs.some(entry => entry.url === 'https://planbcareers.in' + data.jobPath(byId(id))), false);
    assert.ok(result.pages.some(entry => entry.url.endsWith('/jobs-vidarbha')));
    assert.ok(result.pages.some(entry => entry.url.endsWith('/resources/remote-job-safety')));
    const robots = fs.readFileSync(path.join(ROOT, 'robots.txt'), 'utf8');
    assert.equal((robots.match(/User-agent:/g) || []).length, 1);
    assert.match(robots, /Disallow: \/api\//);
    assert.match(fs.readFileSync(path.join(ROOT, 'llms.txt'), 'utf8'), /City Kotwali/);
});

test('regeneration is reproducible for unchanged sources', () => {
    function digest() {
        const files = ['sitemap.xml', 'sitemap-jobs.xml', 'robots.txt', 'llms.txt', 'llms-full.txt', ...fs.readdirSync(path.join(ROOT, 'job')).filter(f => f.endsWith('.html')).map(f => 'job/' + f), ...fs.readdirSync(path.join(ROOT, 'jobs')).filter(f => f.endsWith('.html')).map(f => 'jobs/' + f)].sort();
        return crypto.createHash('sha256').update(files.map(file => fs.readFileSync(path.join(ROOT, file), 'utf8')).join('\n')).digest('hex');
    }
    jobPages.generateJobPages(); hubs.generateCategoryPages(); discovery.generateDiscovery();
    const before = digest();
    jobPages.generateJobPages(); hubs.generateCategoryPages(); discovery.generateDiscovery();
    assert.equal(digest(), before);
});
