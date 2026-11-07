'use strict';
// Shared adapter keeps all generated leaves, hubs and guides on the core site shell.
const fs = require('fs');
const path = require('path');
const { escapeHtml: esc } = require('../lib/jobs-data');
const shared = require('../lib/site-layout');
const ROOT = path.join(__dirname, '..');
const BASE = 'https://planbcareers.in';
function siteFacts() { return JSON.parse(fs.readFileSync(path.join(ROOT, 'data/site-facts.json'), 'utf8')); }
function jsonLd(value) { return JSON.stringify(value, null, 2).replace(/</g, '\\u003c'); }
function layout({ title, description, pathname, body, schemas = [], noindex = false, ogType = 'website' }) {
    return shared.layout({ title, description, path: pathname, body, schema: schemas, noindex, ogType })
        .replace('<meta property="og:type" content="website">', `<meta property="og:type" content="${esc(ogType)}">`);
}
function breadcrumbs(items) {
    return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: BASE + url })) };
}
module.exports = { ROOT, BASE, esc, siteFacts, jsonLd, header: shared.header, footer: shared.footer, layout, breadcrumbs };
