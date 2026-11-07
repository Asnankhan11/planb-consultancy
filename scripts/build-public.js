'use strict';
// The deployable folder is an explicit publication boundary, never the repository root.
const fs = require('node:fs');
const path = require('node:path');
const cheerio = require('cheerio');
const shared = require('../lib/site-layout');
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const pages = ['index','404','about','admissions','apply-job','business','contact','dashboard','disclaimer','fast-track','job-details','jobs','legal','privacy-policy','refund-policy','resources','service-fees','success-stories','terms','trust','verify-candidate','women-wfh','career-guidance-akola','jobs-vidarbha','connect','apply-admission','admissions-impact','jobs-impact','women-wfh-impact','students-earning-impact'];
const files = pages.map(name => name + '.html').concat(['admin/index.html','jobs.json','robots.txt','sitemap.xml','sitemap-jobs.xml','llms.txt','llms-full.txt','7f2e1a498b3c419fa82b5e90d12e847c.txt','googlef9c124eb9271294f.html','css/styles.css','css/white-theme.css','assets/fonts/bricolage-grotesque-latin.woff2','assets/fonts/OFL-Bricolage-Grotesque.txt','images/optimized/planb-logo.webp','images/optimized/founder.webp','resources/Plan_B_Careers_ATS_Resume_Template_Branded.docx']);
for (const dir of ['job','jobs','resources']) for (const filename of fs.readdirSync(path.join(root,dir)).sort()) if (/^[a-z0-9-]+\.html$/.test(filename)) files.push(`${dir}/${filename}`);
for (const name of ['main','jobs','jobs-data','job-card','forms','candidate-workspace','job-redirect','admin','analytics']) files.push(`js/${name}.js`);
fs.rmSync(dist,{recursive:true,force:true});
for (const relative of new Set(files)) {
  const source = path.join(root,relative === 'js/jobs-data.js' ? 'lib/jobs-data.js' : relative === 'js/job-card.js' ? 'lib/job-card.js' : relative);
  if (!fs.existsSync(source)) throw new Error(`Required public file missing: ${relative}`);
  const target = path.join(dist,relative);fs.mkdirSync(path.dirname(target),{recursive:true});
  if (!relative.endsWith('.html') || relative.startsWith('google')) {fs.copyFileSync(source,target);continue;}
  const $ = cheerio.load(fs.readFileSync(source,'utf8'));
  if (!relative.startsWith('admin/')) {
    $('body > .skip-link, body > .utility-bar, body > header.site-header').remove();
    $('body').prepend(shared.header());
    $('head').append('<link rel="preload" href="/assets/fonts/bricolage-grotesque-latin.woff2" as="font" type="font/woff2" crossorigin>');
    $('body > footer.site-footer').replaceWith(shared.footer());
    $('script[type="application/ld+json"]').each((_,el) => {
      const graph=JSON.parse($(el).html());
      if(Array.isArray(graph['@graph'])) graph['@graph']=graph['@graph'].map(entity => entity['@id']===shared.absolute('/#organization') ? shared.organization() : entity);
      $(el).text(shared.json(graph));
    });
  }
  $('a.brand').removeAttr('aria-label');
  $('#mobileMenuBtn').attr('aria-label','Open menu');
  // Keep relative content links aligned with Vercel clean URLs.
  $('a[href]').each((_,el)=>{const link=$(el);let href=link.attr('href');if (/^(?:\/?[a-z0-9/-]+)\.html(?:[?#].*)?$/i.test(href)) link.attr('href',href.replace(/\.html(?=[?#]|$)/,''));if(link.attr('target')==='_blank')link.attr('rel','noopener noreferrer');});
  if (!['apply-job.html','admissions.html','contact.html','dashboard.html','verify-candidate.html'].includes(relative) && !relative.startsWith('admin/')) $('head').append('<script src="/js/analytics.js" defer></script>');
  $('img').each((_,el)=>{const image=$(el);if(!image.attr('loading') && image.attr('fetchpriority')!=='high')image.attr('loading','lazy');image.attr('decoding','async');});
  fs.writeFileSync(target,$.html()+'\n');
}
const paths=[...new Set(files)].sort();
fs.writeFileSync(path.join(root,'data/public-manifest.json'),JSON.stringify(paths,null,2)+'\n');
console.log(`Published ${paths.length} allowlisted files to dist; backend, databases, original evidence and private documents excluded.`);
