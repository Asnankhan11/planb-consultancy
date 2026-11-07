'use strict';
/** Rebuild discovery files from the published canonical HTML and source facts. */
const fs = require('fs');
const path = require('path');
const { ROOT, BASE, siteFacts, esc } = require('./seo-template');
const { readJobs, dateOnly } = require('./generate-job-pages');
const { isOpenJob, jobPath } = require('../lib/jobs-data');
const utilityPaths = new Set(['/apply-job', '/apply-admission', '/dashboard', '/verify-candidate', '/job-details']);
function attributes(tag) {
    return Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)].map(match => [match[1].toLowerCase(), match[2]]));
}
function metadata(html) {
    const tags = [...html.matchAll(/<(?:link|meta)\b[^>]*>/gi)].map(match => attributes(match[0]));
    const canonical = tags.find(tag => String(tag.rel).toLowerCase() === 'canonical')?.href;
    const noindex = tags.some(tag => /^(robots|googlebot)$/i.test(tag.name || '') && /\bnoindex\b/i.test(tag.content || ''));
    const modified = html.match(/"dateModified"\s*:\s*"(\d{4}-\d{2}-\d{2})/);
    return { canonical, noindex, lastmod: modified ? modified[1] : null };
}
function publicHtmlFiles() {
    const files = fs.readdirSync(ROOT).filter(file => file.endsWith('.html'));
    for (const directory of ['jobs', 'resources']) {
        const folder = path.join(ROOT, directory);
        if (fs.existsSync(folder)) for (const file of fs.readdirSync(folder)) if (file.endsWith('.html')) files.push(directory + '/' + file);
    }
    return files.sort();
}
function canonicalPages() {
    const found = new Map();
    for (const file of publicHtmlFiles()) {
        const info = metadata(fs.readFileSync(path.join(ROOT, file), 'utf8'));
        if (!info.canonical || info.noindex) continue;
        let url;
        try { url = new URL(info.canonical); } catch { continue; }
        const route = file === 'index.html' ? '/' : '/' + file.replace(/\.html$/, '');
        if (url.origin !== BASE || url.search || url.hash || url.pathname !== route || /\.html$/.test(url.pathname) || utilityPaths.has(route)) continue;
        found.set(info.canonical, { url: info.canonical, lastmod: info.lastmod });
    }
    return [...found.values()].sort((a, b) => a.url.localeCompare(b.url));
}
function xml(entries) {
    return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + entries.map(entry => `  <url><loc>${esc(entry.url)}</loc>${entry.lastmod ? `<lastmod>${esc(entry.lastmod)}</lastmod>` : ''}</url>`).join('\n') + '\n</urlset>\n';
}
function generateDiscovery() {
    const pages = canonicalPages(), facts = siteFacts(), jobs = readJobs().filter(job => isOpenJob(job));
    const jobEntries = jobs.map(job => ({ url: BASE + jobPath(job), lastmod: dateOnly(job.last_updated) }));
    fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml(pages));
    fs.writeFileSync(path.join(ROOT, 'sitemap-jobs.xml'), xml(jobEntries));
    fs.writeFileSync(path.join(ROOT, 'robots.txt'), `# Public discovery policy shared by all search and AI crawlers.\nUser-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\nDisallow: /temp/\n\nSitemap: ${BASE}/sitemap.xml\nSitemap: ${BASE}/sitemap-jobs.xml\n`);
    const links = [
        ['Current job listings', '/jobs', 'Open source records, with individual duties and application links.'],
        ['Jobs and support in Akola', '/jobs/location-akola', 'Local workplace inventory is separated from remote alternatives.'],
        ['Vidarbha job-search guide', '/jobs-vidarbha', 'How to compare local, remote and relocation options.'],
        ['Career guidance in Akola', '/career-guidance-akola', 'How to prepare for a discussion with the Akola team.'],
        ['Work-from-home listings', '/jobs/work-from-home', 'Remote work requirements and compensation explained.'],
        ['Career resources', '/resources', 'Resume, interview, salary and job-offer safety guides.'],
        ['About Plan B Careers', '/about', 'Business identity and scope of assistance.'],
        ['Contact and directions', '/contact', 'Current public contact information and confirmed office details.'],
        ['Service scope and charges', '/service-fees', 'Discuss the applicable service and terms directly.'],
        ['Trust and verification guidance', '/trust', 'How to check a listing, offer and recruitment process.'],
        ['Privacy policy', '/privacy-policy', 'Personal data and application information.'],
        ['Refund policy', '/refund-policy', 'Terms to check before agreeing to a paid service.']
    ];
    const available = new Set(pages.map(page => new URL(page.url).pathname));
    const currentLinks = links.filter(([, pathname]) => available.has(pathname));
    const trackRecord = facts.businessTrackRecord ? `\n## Business track record\n\nThe business owner reports ${facts.businessTrackRecord.yearsInBusiness} years in business and more than ${Number(facts.businessTrackRecord.placementsMoreThan).toLocaleString('en-IN')} candidates placed, confirmed on ${facts.businessTrackRecord.confirmedOn}. These are figures shared by Plan B Careers, not independently audited statistics. They do not guarantee an individual hiring outcome.\n` : '';
    const intro = `# ${facts.name}\n\n> Career, job-search and admission guidance from Akola for candidates in Vidarbha and beyond.\n\n${facts.name} provides guidance and application assistance. Employers and institutions make selection decisions. A listing does not establish an exclusive recruitment partnership or guarantee an outcome.\n\n## Contact and location\n\n- Website: ${facts.url}\n- Phone: ${facts.phone}\n- Email: ${facts.email}\n- ${facts.office.confirmed ? 'Confirmed office' : 'Office enquiries'}: ${facts.office.visitNote}\n- Service areas: ${facts.serviceAreas.join(', ')}. Service areas do not imply staffed branches.\n\n## Service terms\n\n${facts.fees.statement}\n${trackRecord}\n## Authoritative pages\n\n${currentLinks.map(([label, pathname, note]) => `- [${label}](${BASE + pathname}): ${note}`).join('\n')}\n`;
    fs.writeFileSync(path.join(ROOT, 'llms.txt'), intro);
    fs.writeFileSync(path.join(ROOT, 'llms-full.txt'), intro + `\n## Reading vacancy information accurately\n\nThe job directory is the current source of public vacancy information. Closed records and records awaiting essential details are not open for applications. Remote work does not imply worldwide or city-specific eligibility; consult the individual record and confirm eligibility with the hiring team.\n\nPay is reproduced as advertised. Annual LPA, fixed monthly amounts, in-hand pay, CTC, commissions, incentives and task-based earnings are different measures. An advertised maximum is not a minimum or a guaranteed amount. Do not infer a salary, workplace, employer identity, closing date or employment type when it is absent.\n\n${facts.office.visitNote} Other city guides and service-area references are not evidence of additional offices.\n\n## Discovery\n\n- [Public page sitemap](${BASE}/sitemap.xml)\n- [Open job sitemap](${BASE}/sitemap-jobs.xml)\n\nThis file is a navigation aid. The linked public pages and current job records are authoritative for their respective subjects.\n`);
    console.log(`Generated discovery files: ${pages.length} canonical public pages and ${jobEntries.length} open job URLs.`);
    return { pages, jobs: jobEntries };
}
if (require.main === module) generateDiscovery();
module.exports = { metadata, canonicalPages, xml, generateDiscovery };
