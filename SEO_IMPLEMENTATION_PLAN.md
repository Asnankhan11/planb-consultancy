# PLAN B CAREERS – MASTER SEO IMPLEMENTATION PLAN
**Target Completion:** Immediate Sprint  
**Target Search Platforms:** Google, Google Jobs, Bing, ChatGPT Search, Perplexity, Microsoft Copilot, Gemini

---

## 1. Roadmap Overview & Phasing

```
[Phase 1: Critical Fixes (P0)]
   ├── Pre-render Static Leaf Job Pages with Google JobPosting Schema
   ├── Deploy Dual XML Sitemaps (Standard + Jobs)
   └── Configure Advanced robots.txt for AI & Search Crawlers
       ↓
[Phase 2: AI & Answer Engine Readiness (P1)]
   ├── Publish /llms.txt & /llms-full.txt Context Bundles
   ├── Deploy Category Landing Pages (/jobs/work-from-home, /jobs/customer-support, etc.)
   └── Deploy Regional Location Hubs (Akola, Pune, Nagpur, Mumbai, Sambhajinagar)
       ↓
[Phase 3: Authority & Discovery Infrastructure (P2)]
   ├── Deploy IndexNow Instant Indexation Protocol (API + Cron Script)
   ├── Enrich Structured Data (BreadcrumbList, FAQPage, LocalBusiness, Organization)
   └── Standardize Open Graph, Twitter Cards & Canonical URLs
       ↓
[Phase 4: Verification & Quality Assurance (P3)]
   ├── Run Python Schema & Meta Tag Validator across all pages
   ├── Verify Google Rich Results compliance
   └── Document Final Results in FINAL_SEO_AUDIT.md
```

---

## 2. Priority 0 (P0) – Immediate Execution Tasks

### P0.1: Pre-rendered Leaf Job Pages with Google JobPosting Schema
- **Objective:** Enable instant discovery and indexing of all active job openings on Google Jobs.
- **Specification:**
  - Build automated generator script `scripts/generate-job-pages.js`.
  - Produce individual static pages under `/job/` (e.g. `/job/4-backend-process-executive.html`, `/job/4.html`, etc.).
  - Deliver complete pre-rendered HTML containing:
    - `<title>{Job Title} at {Company} - Apply Free | Plan B Careers</title>`
    - `<meta name="description" content="...">`
    - `<link rel="canonical" href="https://planbcareers.in/job/{slug}">`
    - `<script type="application/ld+json">` with full `JobPosting` schema:
      - `title`, `description`, `datePosted`, `validThrough`, `hiringOrganization`
      - Remote jobs: `jobLocationType: "TELECOMMUTE"`, `applicantLocationRequirements: {"@type": "Country", "name": "IN"}`
      - On-site jobs: `jobLocation` with full `PostalAddress`
      - `baseSalary`: `MonetaryAmount` in `INR`
      - `directApply: true`
    - Pre-rendered visible job details matching the schema exactly.
    - Full client-side application modal + direct WhatsApp application.
  - Add Express routes in `server.js` (`/job/:id` and `/job/:slug`) to serve pre-rendered HTML or generate dynamic SSR fallbacks.

### P0.2: Advanced XML Sitemaps
- **Objective:** Provide search engines with structured, prioritized, and updated sitemaps.
- **Specification:**
  - Create `/sitemap.xml`: Contains all core canonical static pages + category hubs + location hubs.
  - Create `/sitemap-jobs.xml`: Contains all active individual job leaf URLs with `lastmod`, `changefreq: daily`, `priority: 0.9`.
  - Add dynamic endpoint in `server.js` for `/sitemap.xml` and `/sitemap-jobs.xml` ensuring automatic updates whenever jobs change.

### P0.3: Crawler Directives (`robots.txt`)
- **Objective:** Maximize indexing by trusted web and AI bots while protecting private admin routes.
- **Specification:**
  - Allow and guide `Googlebot`, `Bingbot`, `OAI-SearchBot`, `ChatGPT-User`, `GPTBot`, `PerplexityBot`, `Claude-SearchBot`, `Applebot`.
  - Disallow `/admin/`, `/api/admin/`, `/database.js`, `/planb.sqlite`.
  - Reference both `https://planbcareers.in/sitemap.xml` and `https://planbcareers.in/sitemap-jobs.xml`.

---

## 3. Priority 1 (P1) – AI Engine & Landing Page Architecture

### P1.1: Machine-Readable AI Context (`llms.txt` and `llms-full.txt`)
- **Specification:**
  - Create `/llms.txt` following standard specification: brief, core links, contact details, service summaries, fee-free pledge.
  - Create `/llms-full.txt`: comprehensive documentation covering all 11+ current job categories, employer partner tiers, admission advisory procedures, and verification protocols.

### P1.2: Programmatic Category Landing Pages
- **Target Pages:**
  - `/jobs/work-from-home.html` (Work From Home Jobs)
  - `/jobs/customer-support.html` (Customer Support & BPO Jobs)
  - `/jobs/data-entry.html` (Back Office & Data Processing)
  - `/jobs/telecalling.html` (Telesales & Telecalling)
  - `/jobs/freshers.html` (Fresher Opportunities)
- **Features:** Pre-filtered inventory, optimized metadata, `ItemList` schema, breadcrumbs, and targeted FAQ sections with `FAQPage` schema.

### P1.3: Regional Location Hubs
- **Target Pages:**
  - `/jobs/location-akola.html` (Jobs in Akola)
  - `/jobs/location-pune.html` (Jobs in Pune)
  - `/jobs/location-nagpur.html` (Jobs in Nagpur)
  - `/jobs/location-mumbai.html` (Jobs in Mumbai)
  - `/jobs/location-chhatrapati-sambhajinagar.html` (Jobs in Sambhajinagar)
- **Features:** Local search intent matching, office address, WhatsApp link to regional desk, `LocalBusiness` schema.

---

## 4. Priority 2 (P2) – IndexNow & Rich Metadata

### P2.1: IndexNow Real-Time Protocol
- **Objective:** Submit updated URLs to Bing and Yandex within seconds of publication.
- **Specification:**
  - Generate 32-character key file: `7f2e1a498b3c419fa82b5e90d12e847c.txt`.
  - Add Express endpoint `POST /api/indexnow/submit` and `GET /api/indexnow/ping`.
  - Create automated Node script `scripts/ping-indexnow.js` to batch ping all site URLs.

### P2.2: Site-Wide Schema & Social Card Enrichment
- Inject `Organization` and `WebSite` schema on `index.html`.
- Add `BreadcrumbList` schema across all subpages.
- Inject complete Open Graph (`og:title`, `og:description`, `og:image`, `og:url`) and Twitter Card tags.

---

## 5. Priority 3 (P3) – Verification & Continuous Monitoring

- Execute local Python validation script (`audit.py`) on all HTML files to confirm 0 schema errors, valid title/description lengths, and accessible heading structures.
- Test server routes on local instance (`http://localhost:3000`).
- Document all post-implementation metrics in `FINAL_SEO_AUDIT.md`.

