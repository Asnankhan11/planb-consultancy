'use strict';
const { facts, escape: e, json } = require('./site-layout');
const rules = require('./jobs-data');
const { renderJobCards } = require('./job-card');

module.exports = ({ openJobs }) => ({
  title: 'Find Jobs in Akola, Vidarbha & Remote Roles | Plan B Careers',
  description: 'Compare current job listings by role, experience and work mode. Save the roles you like and check requirements with Plan B Careers in Akola.',
  path: '/jobs',
  scripts: ['/js/jobs-data.js', '/js/job-card.js', '/js/jobs.js'],
  body: `<section class="page-intro jobs-intro"><div class="page-shell"><p class="eyebrow">Your next step starts here</p><h1>Find a role that fits you.</h1><p class="lead">Compare the work, the requirements and the advertised pay. Save a shortlist, then take your next step with the Akola team.</p>
    <form id="jobFilters" class="job-search-panel" action="/jobs" role="search">
      <div class="job-search-row"><div class="search-field"><label for="searchInput">What kind of work are you looking for?</label><input id="searchInput" type="search" name="q" maxlength="200" placeholder="Job title, company or skill" autocomplete="off"></div><button type="submit" class="button button-gold">Find jobs</button></div>
      <div class="filter-chips" aria-label="Quick job filters"><button type="button" class="filter-chip" data-quick-filter="all" aria-pressed="true">All roles</button><button type="button" class="filter-chip" data-quick-filter="remote" aria-pressed="false">Remote</button><button type="button" class="filter-chip" data-quick-filter="fresher" aria-pressed="false">Accepts freshers</button><button type="button" class="filter-chip" id="savedFilter" data-quick-filter="saved" aria-pressed="false">Saved jobs <span id="savedCount">0</span></button></div>
      <details id="moreFilters" class="advanced-filters"><summary>More filters <span id="activeFilterCount" class="small-note"></span></summary><div class="filter-fields">
        <div><label for="industryFilter">Industry</label><select id="industryFilter" name="industry"><option value="all">All industries</option>${rules.INDUSTRIES.filter(industry => openJobs.some(job => rules.matchesIndustry(job, industry.id))).map(industry => `<option value="${e(industry.id)}">${e(industry.name)}</option>`).join('')}</select></div>
        <div><label for="workModeFilter">Work mode</label><select id="workModeFilter" name="mode"><option value="all">All work modes</option><option value="remote">Remote</option><option value="office">Office based</option></select></div>
        <div><label for="experienceFilter">Experience</label><select id="experienceFilter" name="experience"><option value="all">All experience levels</option><option value="fresher">Accepts freshers</option><option value="experienced">Prior experience required</option></select></div>
        <div><label for="locationFilter">Location</label><select id="locationFilter" name="loc"><option value="all">All listed locations</option><option value="akola">Akola</option><option value="mumbai">Mumbai</option><option value="remote">Remote / Pan India</option></select></div>
      </div></details>
    </form></div></section>
    <section class="section jobs-results"><div class="page-shell"><div class="results-toolbar"><div><h2>Current listings</h2><p id="jobCount" role="status" aria-live="polite">${openJobs.length} current listings</p></div><div class="results-controls"><label for="sortSelect">Sort by</label><select id="sortSelect" name="sort" form="jobFilters"><option value="latest">Recently updated</option><option value="title">Role title</option></select><button id="clearFilters" type="button" class="text-button">Reset filters</button></div></div>
      <p class="results-note">These are published listings, not confirmed offers. Check availability and eligible locations before applying. Remote roles are shown separately from office-based and field roles.</p>
      <div id="jobCards" class="card-grid">${renderJobCards(openJobs, { save: true, saveAttribute: 'data-job-save' })}</div>
      <div id="jobsEmpty" class="empty-state" hidden><h3 id="emptyTitle">No roles match these filters.</h3><p id="emptyDescription">Try a broader search, choose another work mode or ask the team about your requirements.</p><div class="actions"><button id="emptyReset" class="button" type="button">Show all roles</button><a class="button button-outline" href="/contact">Talk to the team</a></div></div>
      <p id="saveFeedback" class="small-note" role="status" aria-live="polite"></p>
      <noscript><p class="notice">All current listings are shown above. JavaScript enables filtering and saving; you can open any role without it.</p></noscript>
      <aside class="job-prep-strip" aria-label="Prepare to apply"><div><h2>A stronger application starts here.</h2><p>Use a clear resume and prepare examples before your interview.</p></div><div class="actions"><a class="button button-outline" href="/resources/Plan_B_Careers_ATS_Resume_Template_Branded.docx" download>Download resume template <span class="sr-only">(DOCX)</span></a><a class="button button-outline" href="/resources/interview-preparation">Prepare for an interview</a></div></aside>
      <aside class="jobs-help"><div><h2>Not sure where to start?</h2><p>Tell us about your skills, location and experience. Our Akola team can help you prepare your next step.</p></div><a class="button button-outline" href="/contact">Ask for guidance</a></aside>
      <p class="small-note">Saved jobs stay in this browser on this device. ${e(facts.fees.statement)}</p>
    </div></section><script type="application/json" id="publishedJobs">${json(openJobs)}</script>`
});
