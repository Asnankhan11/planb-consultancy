/* Job discovery is the homepage's primary task; all role details come from the live publication data. */
const { facts, escape: e, faq } = require('./site-layout');
const rules = require('./jobs-data');
const { renderJobCards, employerInitials } = require('./job-card');

const searchIcon = '<svg class="search-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>';
const pinIcon = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>';
const arrowIcon = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>';

function spotlight(job) {
  if (!job) return `<div class="opportunity-stage"><aside class="spotlight-card"><h2>Let’s plan your next move.</h2><p>There are no published openings right now. Tell the Akola team what kind of work you’re looking for.</p><a class="button" href="/contact">Talk to the team</a></aside></div>`;
  return `<div class="opportunity-stage">
    <div class="opportunity-note"><span class="status-dot" aria-hidden="true"></span>A role to explore</div>
    <article class="spotlight-card">
      <div class="spotlight-top"><span class="employer-mark" aria-hidden="true">${e(employerInitials(job.company))}</span><div><p class="spotlight-employer">${e(job.company)}</p><span class="job-label">${e(rules.isRemote(job) ? 'Work from home' : job.work_mode || 'View work location')}</span></div></div>
      <h2><a href="${rules.jobPath(job)}">${e(job.title)}</a></h2>
      <p class="spotlight-pay-label">Listed compensation</p><p class="job-pay">${e(job.salary || 'Confirm compensation with the team')}</p>
      <dl class="spotlight-facts"><div><dt>Experience</dt><dd>${e(job.experience_level || 'See requirements')}</dd></div><div><dt>Location</dt><dd>${e(job.location || 'Confirm location')}</dd></div><div><dt>Qualification</dt><dd>${e(job.qualification || 'See requirements')}</dd></div></dl>
      <div class="spotlight-actions"><a class="button" href="${rules.jobPath(job)}">See role details ${arrowIcon}</a><button class="button button-outline save-job" type="button" data-save-job="${e(job.id)}" aria-pressed="false">Save this job</button></div>
      <p class="spotlight-footnote">Check equipment, eligibility and current availability before applying.</p>
    </article>
    <a class="spotlight-support" href="/contact">Need help deciding? Talk to our Akola team.</a>
  </div>`;
}

module.exports = function homePage({ openJobs }) {
  // An open published role is a useful preview, not a claim of recommendation or verified employer partnership.
  const featured = openJobs.find(job => Number(job.id) === 4) || openJobs[0];
  const trackRecord = facts.businessTrackRecord;
  const selected = [4, 21, 18].map(id => openJobs.find(job => Number(job.id) === id)).filter(Boolean);
  for (const job of openJobs) {
    if (selected.length >= 3) break;
    if (!selected.some(item => item.id === job.id)) selected.push(job);
  }
  return {
    title: 'Job Consultancy in Akola & Vidarbha | Plan B Careers',
    description: 'Find current job openings and career support with Plan B Careers near City Kotwali, Akola. Explore remote roles, check eligibility and plan your next step.',
    path: '/',
    body: `<section class="career-hero"><div class="page-shell career-hero-grid">
      <div class="hero-copy">
        <p class="hero-locality">${pinIcon}Your career support team in Akola</p>
        <h1>Find your next job.<br>Build your Plan B.</h1>
        <p class="lead">Explore current openings and get practical career guidance in Akola and Vidarbha. Start with work that fits your skills and experience.</p>
        <form class="hero-search" action="/jobs" method="get" role="search" aria-label="Search current job listings">
          <div class="search-field"><label for="homeJobSearch">What work are you looking for?</label><div>${searchIcon}<input id="homeJobSearch" name="q" type="search" placeholder="Job title, skill or company" maxlength="120"></div></div>
          <button class="button button-gold" type="submit">Find jobs</button>
        </form>
        <div class="quick-searches" aria-label="Popular ways to explore jobs"><span>Start with</span><a href="/jobs?experience=fresher">Fresher roles</a><a href="/jobs?mode=remote">Work from home</a><a href="/jobs?industry=bpo">Customer support</a></div>
        <p class="hero-help"><a href="/jobs">Explore all ${openJobs.length} current listings</a><span>Read the requirements. Choose your next step.</span></p>
        ${trackRecord ? `<dl class="career-track-record" aria-label="Plan B Careers track record"><div><dt>Years in business</dt><dd>${e(trackRecord.yearsInBusiness)}</dd></div><div><dt>Candidates placed</dt><dd>${e(Number(trackRecord.placementsMoreThan).toLocaleString('en-IN'))}+</dd></div></dl>` : ''}
      </div>${spotlight(featured)}
    </div></section>

    <section class="section home-openings"><div class="page-shell">
      <div class="section-heading"><div><h2>Find a role worth a closer look.</h2><p>Compare the work, listed pay and experience needed. Save the roles you want to return to.</p></div><a class="button button-outline" href="/jobs">View all jobs ${arrowIcon}</a></div>
      ${selected.length ? `<div class="card-grid">${renderJobCards(selected, { save: true, heading: 'h3' })}</div>` : '<p class="notice">There are no published openings right now. <a href="/contact">Discuss your job search with the team</a>.</p>'}
      <p class="small-note listings-note">Listings describe advertised terms. Confirm availability and the full offer with the hiring team; selection is decided by the employer.</p>
    </div></section>

    <section class="section section-muted home-process"><div class="page-shell">
      <div class="section-heading"><div><h2>A clearer route to your next move.</h2><p>You don’t have to figure out every step at once.</p></div><a href="/trust">How to check a listing</a></div>
      <ol class="career-steps">
        <li><span class="step-number" aria-hidden="true">1</span><div><h3>Find your fit</h3><p>Compare experience, location, work hours and equipment with what works for you.</p></div></li>
        <li><span class="step-number" aria-hidden="true">2</span><div><h3>Get ready</h3><p>Prepare a relevant resume and write down your questions about pay and the role.</p></div></li>
        <li><span class="step-number" aria-hidden="true">3</span><div><h3>Take the next step</h3><p>Read the full listing, apply when available or ask our team for guidance.</p></div></li>
      </ol>
    </div></section>

    <section class="section"><div class="page-shell local-support">
      <div class="local-support-copy"><p class="hero-locality">${pinIcon}Near City Kotwali, Akola</p><h2>Online opportunities.<br>A local team to talk to.</h2><p>Looking for your first job, considering a change or unsure where to begin? Tell us about your experience and the kind of work you need.</p><p>Our Akola team supports candidates across Vidarbha with job-search conversations, resume preparation and interview guidance.</p><div class="actions"><a class="button" href="/contact">Talk to the Akola team</a><a class="button button-outline" href="/jobs/location-akola">Explore Akola job support</a></div><p class="small-note">Contact us to arrange an office visit. Service scope and any charges are discussed for your situation.</p></div>
      <aside class="career-toolkit" aria-labelledby="toolkit-heading"><h2 id="toolkit-heading">A little preparation goes a long way.</h2><div class="resource-list"><a class="resource-link" href="/resources/resume-guide"><span><strong>Make your resume easier to assess</strong><small>Structure, examples and a practical checklist</small></span>${arrowIcon}</a><a class="resource-link" href="/resources/interview-preparation"><span><strong>Walk into your interview prepared</strong><small>Practice your answers and questions</small></span>${arrowIcon}</a><a class="resource-link" href="/resources/remote-job-safety"><span><strong>Know what to check before you commit</strong><small>Employer checks and remote-job safety</small></span>${arrowIcon}</a></div><a class="toolkit-all" href="/resources">Explore all career resources</a></aside>
    </div></section>

    <section class="section section-muted home-faq"><div class="page-shell"><div class="section-heading"><div><h2>Before you take the next step.</h2><p>A few things worth knowing.</p></div><a href="/contact">Ask another question</a></div>${faq([
      ['Can freshers apply for these jobs?', 'Some listings accept freshers. Check each role’s qualification, language, equipment and location requirements before applying. <a href="/jobs?experience=fresher">Explore roles that accept freshers</a>.'],
      ['Can I visit Plan B Careers in Akola?', 'Our office is near City Kotwali, Akola, Maharashtra. <a href="/contact">Contact the team</a> to arrange a visit and confirm directions. We also assist candidates across Vidarbha; service areas are not separate offices.'],
      ['What should I confirm before proceeding?', `${e(facts.fees.statement)} We do not guarantee a job or admission. Ask about the role, selection process and written offer terms before making a decision.`]
    ])}</div></section>

    <section class="section"><div class="page-shell"><div class="contact-banner"><div><h2>Ready to see what’s next?</h2><p>Start with the openings. We’re here when you need a conversation.</p></div><div class="actions"><a class="button button-gold" href="/jobs">Explore jobs ${arrowIcon}</a><a class="button button-outline" href="/contact">Ask the team</a></div></div></div></section>`
  };
};
