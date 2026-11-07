# Plan B Careers

Career guidance, published job listings and admission enquiries from **Near City Kotwali, Akola, Maharashtra**, serving Akola and Vidarbha. Production domain: https://planbcareers.in.

The public site uses a corporate white, navy and amber design. HTML is generated ahead of time, with progressive browser filtering and a separate Express API. Job availability and eligibility rules are shared by the API, pages, filters and discovery files.

## Development

Use Node.js 24 and npm:

```sh
npm ci
npm run check
npm start
```

Open http://localhost:3000. `npm run check` builds the public site, checks page/schema/link integrity, and runs the synthetic backend and SEO regression suite. The tests use temporary storage and mocked notifications, not production candidate records. For styling, edit `css/input.css` or the theme/configuration sources, then run `npm run build`; do not edit compiled `css/styles.css` directly.

The local development database is `.data/planb.sqlite`, which is ignored by Git. Never publish, commit or copy a candidate database into a deployment. Existing historical records need a private, reviewed migration; the application does not silently import the old repository database.

## Publishing content

- `data/site-facts.json`: owner-confirmed business facts and the policy to discuss charges directly. Do not invent addresses, placement totals, partners, reviews or qualifications.
- `jobs.json`: canonical vacancies with stable IDs and explicit status. Keep incomplete or closed records out of active inventory. Confirm changes with the hiring source before publication.
- `lib/jobs-data.js`: shared availability, category, experience, salary and URL rules.
- `scripts/generate-core-pages.js`, `scripts/generate-job-pages.js`, `scripts/generate-category-pages.js`: generated page sources. Edit these rather than generated output.
- `resources/*.html`, `resources.html`, `career-guidance-akola.html`, `jobs-vidarbha.html`: editorial resources. Check sources, update dates only after substantive review and preserve valid canonical metadata.
- `lib/site-layout.js`: shared public navigation, footer, metadata and entity schema.

`npm run build` regenerates core/job/category pages and discovery files, compiles Tailwind, then packages only explicitly allowed public files into **dist/**. The build fails if a required asset, link target, fragment or JSON-LD block is broken. Images under `images/optimized/` are approved resized display assets; original candidate documents, salary slips, receipts and proof galleries are not public assets.

## Deployment and private operations

Vercel is configured to publish **dist/** and route `/api/*` to `api/index.js`. Never change the output directory to the repository root or upload the whole repository as static files. Backend imports are bundled separately; the database, secret files, source code, internal evidence and skills must remain inaccessible over HTTP.

Production has no local-disk persistence fallback. Configure the real database, administrator and optional intake/mail providers as described in [backend setup](docs/implementation/backend-setup.md). Until storage is confirmed, the server returns an honest unavailable response and the public forms offer an explicit contact path. Google Apps Script fallback requires the updated version 2 deployment; setting a flag alone does not make the old deployment safe.

The administrator uses an HttpOnly same-origin session cookie. Vacancy changes are published through the source/build so the API and indexed pages cannot drift. No default administrator password is created. Private resumes require authenticated downloads.

Run the documented synthetic production smoke test before enabling intake: prove a stored record survives a new serverless instance and only an authorised administrator can retrieve its resume. Do not test with real applicant information or trigger live notifications inadvertently.

## Verification and search work

- [Implementation plan](docs/implementation/audit-upgrade-plan.md)
- [Both audit closure maps](docs/implementation/audit-closure-2026-11-08.md)
- [Competitor research and evidence](docs/seo/competitor-research-2026-11-08.md)
- [Backend configuration and limitations](docs/implementation/backend-setup.md)

The browser smoke script is `tests/browser_smoke.py`; use Playwright/Chromium and the webapp-testing server helper as documented in the verification report. Google Analytics retains the existing property only on public information pages, with sanitized page/referrer URLs. Candidate form pages do not load Google Analytics. Confirmed submission hooks are available for a separately verified, privacy-preserving conversion integration; provider reporting has not been configured or measured here.

Search Console, Google Business Profile, Bing, genuine local citations and recurring AI-answer observations require the relevant account access. Technical checks and Lighthouse scores do not establish indexing, actual search position or a guaranteed ranking.
