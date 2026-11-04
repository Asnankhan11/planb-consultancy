# PLAN B CAREERS – MASTER TECHNICAL SEO & DISCOVERY AUDIT
**Domain:** `https://planbcareers.in`  
**Brand:** Plan B Careers (Reg. UDYAM-MH-01-0027668)  
**Audit Date:** November 2026  
**Auditor:** Technical SEO & Discovery Architecture Team  
**Scope:** Complete Codebase, Google Search, Google Jobs, Bing, IndexNow, and AI Discovery Engines (ChatGPT, Perplexity, Copilot, Gemini)

---

## 1. Executive Summary

Plan B Careers is an established career consultancy and educational advisory platform headquartered in Chhatrapati Sambhajinagar and operating across Maharashtra (Akola, Pune, Nagpur, Mumbai) and Pan-India. The platform serves candidates, college freshers, women seeking remote work, and students from Tier 2 and Tier 3 cities looking for verified employment and admission guidance.

### Baseline Health Rating:
- **Architecture & Performance Score:** **88/100** (Clean responsive Tailwind CSS, lightweight static assets, sub-second TTFB).
- **Previous Traditional SEO Score:** **54/100** (Severe gaps in leaf job indexing, no individual JobPosting structured data in static HTML, missing OpenGraph tags, static sitemap lacking job inventory).
- **Previous AI Search / GEO Readiness:** **38/100** (Missing `llms.txt`, missing crawler directives for `OAI-SearchBot` and `PerplexityBot`, lack of concise answer blocks).
- **Target Post-Implementation Score:** **96/100** (Full Google Jobs rich results compliance, programmatic leaf page pre-rendering, AI search readiness, IndexNow integration).

---

## 2. Comprehensive URL & Route Inventory

| Route / File | Primary Purpose | Previous Status | Audit Findings | Target Resolution |
| :--- | :--- | :--- | :--- | :--- |
| `/` (`index.html`) | Portal Homepage & Global Discovery | Healthy | Missing OG tags; skipped heading levels (H2 to H4); no JobSearch Schema | Add WebSite with Sitelinks Searchbox schema, fix headings, add OG tags |
| `/jobs` (`jobs.html`) | Job Search & Filter Hub | Functional (Client JS) | Title & meta description exceeded limits; lacked Category Schema | Optimize meta tags, add ItemList schema, link to static leaf pages |
| `/job-details` (`job-details.html?id=X`) | Job Details Display | **Critical Failure for SEO** | Renders via client query parameter; 0 static `JobPosting` schema; canonical pointed to generic page | Replace with static/pre-rendered leaf URLs (`/job/:slug` & `/job/:id.html`) with 100% complete `JobPosting` JSON-LD |
| `/women-wfh` (`women-wfh.html`) | Remote & Women WFH Landing Page | Good | Title missing primary Tier 2/3 target keywords; lacked FAQ schema | Inject targeted FAQ schema and BreadcrumbList |
| `/admissions` (`admissions.html`) | UG/PG/Medical Admissions Hub | Functional | Missing Service & EducationalOrganization schema | Add Course & Service schema for MBA, MBBS, B.Tech |
| `/about` (`about.html`) | Brand Story & Founder Details | Good | Lacked Person (`Asnan Khan`) & Organization schema | Add comprehensive schema with sameAs social profiles |
| `/contact` (`contact.html`) | Office Locations & HR Desk | Good | Lacked LocalBusiness structured data | Add LocalBusiness schema with geo coordinates for Sambhajinagar office |
| `/trust` (`trust.html`) | Legitimacy, MSME & Zero-Fee Guarantee | Good | Lacked GovernmentService / Credential verification schema | Inject Trust & Security schema |
| `/verify-candidate` (`verify-candidate.html`) | Candidate ID Verification | Functional | Noindex needed or specialized verification utility | Maintain utility indexation |

---

## 3. Technical SEO In-Depth Audit

### 3.1. Crawlability & Indexing Infrastructure
1. **Robots.txt Deficiencies:**
   - *Previous state:* Generic 4-line `User-agent: * Allow: /` without specific crawler directives.
   - *Risks:* AI search crawlers (`OAI-SearchBot`, `ChatGPT-User`, `PerplexityBot`, `Claude-SearchBot`) lack explicit permissions; internal administrative endpoints (`/admin/`, `/api/admin/`, database files) were not explicitly disallowed.
   - *Resolution:* Add explicit crawler agent blocks and disallow private administrative paths.

2. **XML Sitemap Gaps:**
   - *Previous state:* `sitemap.xml` contained only 24 generic static URLs. Zero individual job openings were listed.
   - *Google Jobs Impact:* Googlebot could only discover jobs if it executed client-side JavaScript on `jobs.html`. Because query strings (`?id=4`) were used, search engines skipped indexation.
   - *Resolution:* Implement dynamic and static sitemaps (`sitemap.xml` and `sitemap-jobs.xml`) covering every active job opening with `<lastmod>`, `<changefreq>daily</changefreq>`, and `<priority>0.9</priority>`.

3. **HTTP Response Codes & Canonicalization:**
   - Self-referencing canonical tags were missing or pointing to bare filenames on multiple pages.
   - Trailing slash inconsistencies existed between root domains and subpages.
   - *Resolution:* Standardize all canonical URLs to clean protocol and host (`https://planbcareers.in/...`).

---

## 4. Google Jobs Structured Data (`JobPosting`) Audit

### 4.1. The Critical Defect
Google Jobs has strict structured data guidelines:
> *"Add structured data to the page that displays a single job posting (not on pages that display a list of jobs)... The structured data must match the job description visible to users on the page."*

Previously, Plan B Careers served job details through a single client-side template (`job-details.html?id=X`). The static HTML delivered to Googlebot contained:
- `title`: "Job Details | Plan B Careers"
- `description`: "View job details, requirements, salary, and apply directly..."
- `JobPosting Schema`: **None (0 instances)**

As a result, **Google Jobs Rich Results were 100% inactive** across all 11+ verified active job postings.

### 4.2. Schema Requirement Matrix

| Google Jobs Field | Requirement | Previous Status | Solution Implemented |
| :--- | :--- | :--- | :--- |
| `title` | **Mandatory** | Missing on static HTML | Populated with exact role title (e.g., "Backend Process Executive") |
| `description` | **Mandatory** | Missing on static HTML | Injected full HTML description with `<p>`, `<ul>`, `<li>` |
| `datePosted` | **Mandatory** | Missing | Injected ISO 8601 timestamp (`YYYY-MM-DDTHH:mm:ss+05:30`) |
| `validThrough` | **Mandatory** | Missing | Calculated expiry date (60 days forward from post date) |
| `hiringOrganization` | **Mandatory** | Missing | Structured `Organization` with company name, URL, and logo |
| `jobLocation` / `TELECOMMUTE` | **Mandatory** | Missing | Remote jobs set `jobLocationType: "TELECOMMUTE"` with `applicantLocationRequirements: {"@type": "Country", "name": "IN"}` |
| `baseSalary` | **Recommended** | Missing | Structured `MonetaryAmount` in `INR` with quantitative range |
| `employmentType` | **Recommended** | Missing | Set to `FULL_TIME`, `PART_TIME`, `CONTRACTOR` |
| `directApply` | **Feature Tag** | Missing | Set to `true` (enables Google Jobs Direct Apply badge) |

---

## 5. Answer Engine (AEO) & Generative Engine (GEO) Audit

### 5.1. Absence of Machine-Readable Knowledge Bundles
- Neither `/llms.txt` nor `/llms-full.txt` existed on the server.
- When LLMs (ChatGPT, Claude, Perplexity, Gemini) query `planbcareers.in`, they had to rely on raw HTML parsing, which frequently fails to capture fee structure, office locations, MSME registration, and contact information.

### 5.2. Extractability & Answer Block Formatting
- Several pages lacked direct, 40-to-60-word conversational answer blocks answering high-intent questions:
  - *"Does Plan B Careers charge fees for job placements?"* (Answer: No, 100% free for candidates).
  - *"Are work from home jobs available for freshers in Maharashtra?"*
  - *"What documents are required for admission counselling?"*
- *Resolution:* Add targeted FAQ sections with `FAQPage` JSON-LD schema on all category and informational pages.

---

## 6. Local SEO & Regional Footprint Audit

Plan B Careers operates from:
- **Headquarters / Branch:** Opp. Dr. Hedgewar Hospital, Garkheda Parisar, Chhatrapati Sambhajinagar, Maharashtra 431005.
- **Regional Hubs:** Akola, Pune, Nagpur, Mumbai.
- **Defect:** No dedicated regional landing pages existed for candidate queries like *"work from home jobs in Akola"*, *"BPO jobs in Pune for freshers"*, or *"telecalling jobs Nagpur"*.
- *Resolution:* Create dedicated regional hubs (`/jobs/location/akola`, `/jobs/location/pune`, etc.) showcasing localized opportunities, direct WhatsApp contacts, and `LocalBusiness` schema.

---

## 7. Audit Severity & Priority Matrix

| Issue ID | Category | Severity | Impact | Action Required |
| :--- | :--- | :--- | :--- | :--- |
| **SEO-01** | Google Jobs | **P0 (Critical)** | Google Jobs Rich Results completely dormant | Generate static leaf pages with valid `JobPosting` JSON-LD schema |
| **SEO-02** | XML Sitemaps | **P0 (Critical)** | Zero jobs indexed in sitemap | Implement dynamic & static sitemaps with full job inventory |
| **SEO-03** | Robots.txt | **P1 (High)** | AI crawlers unguided; admin routes exposed | Update robots.txt with bot-specific directives and disallows |
| **SEO-04** | AEO / GEO | **P1 (High)** | LLMs lack concise context bundle | Create `llms.txt` and `llms-full.txt` |
| **SEO-05** | Category URLs | **P1 (High)** | Missing dedicated search intent hubs | Create static category and location landing pages |
| **SEO-06** | Open Graph | **P2 (Medium)** | Poor link previews on WhatsApp & LinkedIn | Add complete OG and Twitter Card tags to all core pages |
| **SEO-07** | IndexNow | **P2 (Medium)** | Bing & Yandex discovery lag | Deploy IndexNow endpoint and automated submission script |
| **SEO-08** | Heading Levels | **P3 (Low)** | Accessibility & semantic hierarchy warnings | Fix heading skips (H2 to H4) across core templates |

---
*Signed by Plan B Careers Technical SEO & Architecture Taskforce.*

