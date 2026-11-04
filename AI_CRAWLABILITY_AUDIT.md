# PLAN B CAREERS – AI CRAWLABILITY & GENERATIVE ENGINE OPTIMIZATION (GEO) AUDIT
**Engines Analyzed:** OpenAI (ChatGPT Search, GPTBot), Perplexity AI (PerplexityBot), Anthropic (Claude-SearchBot), Google (Google AI Overviews / Gemini), Microsoft (Bingbot / Copilot)  
**Standard Reference:** `.agents/skills/ai-seo` & `llmstxt.org` specification  
**Date:** November 2026  

---

## 1. Executive Summary

As search behavior shifts from traditional 10-blue-links to generative AI synthesis and answer engines, Plan B Careers must be discoverable, crawlable, and cite-ready. When a user asks an AI assistant:
- *"Where can I find verified work from home jobs for freshers in Maharashtra?"*
- *"Does Plan B Careers charge any consultancy fee?"*
- *"Who founded Plan B Careers and where is their office located?"*

The AI engine retrieves information from real-time crawlers (`OAI-SearchBot`, `PerplexityBot`, `Bingbot`), parses markdown context files (`llms.txt`), and extracts semantic text blocks.

This audit evaluates the infrastructure of `https://planbcareers.in` across AI crawlability, direct answer extractability, knowledge graph entity clarity, and markdown bundles.

---

## 2. AI Crawler Permissions Matrix

Search and AI bots serve different purposes:
- **Search Retrieval Bots** (`OAI-SearchBot`, `ChatGPT-User`, `PerplexityBot`, `Claude-SearchBot`): Crawl the web dynamically when an end user submits a conversational prompt. **Must be 100% allowed.**
- **Training Bots** (`GPTBot`, `anthropic-ai`): Crawl pages for foundation model training corpora.
- **Web Crawlers** (`Googlebot`, `Bingbot`): Power Google AI Overviews and Copilot.

### Audit of Crawl Rules:

| Bot Name | User-Agent String | Purpose | Access Status | Directive in robots.txt |
| :--- | :--- | :--- | :--- | :--- |
| **Googlebot** | `Googlebot` | Google Search & AI Overviews | **Allowed** | `User-agent: Googlebot` -> `Allow: /` |
| **Bingbot** | `Bingbot` | Bing & Microsoft Copilot | **Allowed** | `User-agent: Bingbot` -> `Allow: /` |
| **OpenAI Search** | `OAI-SearchBot` | ChatGPT Live Web Search | **Allowed** | `User-agent: OAI-SearchBot` -> `Allow: /` |
| **ChatGPT User** | `ChatGPT-User` | Real-time browsing by users | **Allowed** | `User-agent: ChatGPT-User` -> `Allow: /` |
| **GPTBot** | `GPTBot` | OpenAI indexing & training | **Allowed** | `User-agent: GPTBot` -> `Allow: /` |
| **PerplexityBot** | `PerplexityBot` | Perplexity Live Synthesis | **Allowed** | `User-agent: PerplexityBot` -> `Allow: /` |
| **Claude Search** | `Claude-SearchBot`| Anthropic search integration | **Allowed** | `User-agent: Claude-SearchBot` -> `Allow: /` |
| **Applebot** | `Applebot` | Apple Intelligence / Siri Search | **Allowed** | `User-agent: Applebot` -> `Allow: /` |

**Security Disallows:** All bots are strictly prohibited from indexing `/admin/`, `/api/admin/`, `/database.js`, `/planb.sqlite`, and private candidate files.

---

## 3. Direct Answer Extractability (AEO Evaluation)

Answer engines thrive on **40-to-60-word concise answer blocks** placed directly below descriptive H2/H3 questions.

### Evaluated Brand Knowledge Blocks:

#### Block 1: Brand & Zero-Fee Guarantee
> **Question:** Does Plan B Careers charge money for job placements?  
> **Direct Answer:** No. Plan B Careers is an MSME-registered career consultancy (UDYAM-MH-01-0027668) with a strict zero-fee policy for job applicants. Candidates never pay for registration, interviews, job offers, or appointment letters. All recruitment services are 100% free for candidates.

#### Block 2: Work From Home Availability
> **Question:** Are genuine work from home jobs available for freshers in India?  
> **Direct Answer:** Yes. Plan B Careers provides verified remote openings for 12th pass and college graduates across India, including non-voice chat support, data annotation, telecalling, and backend processing roles with salaries ranging from ₹15,000 to ₹30,000 per month.

#### Block 3: Educational Admission Guidance
> **Question:** What admission counselling services does Plan B Careers offer?  
> **Direct Answer:** Plan B Careers offers personalized college admission guidance for undergraduate and postgraduate courses across Maharashtra and Pan-India, specializing in Engineering (B.Tech), Management (MBA/BBA), and Medical counselling (NEET UG/PG, MBBS, BAMS, BDS).

---

## 4. Machine-Readable Knowledge Bundles (`/llms.txt` and `/llms-full.txt`)

Following the `llmstxt.org` specification adopted by AI search systems:
1. **`/llms.txt`:** Compact index (~1.5KB) summarizing brand mission, verified founder, locations, services, and core page markdown links.
2. **`/llms-full.txt`:** Comprehensive repository (~12KB) containing exhaustive data on current job categories, typical pay structures, admission counselling roadmaps, contact channels, and legal compliance.

---

## 5. Technical Architecture Scorecard for AI Search

- **Clean Static Content (SSR):** High (Pre-rendered HTML ensures bots do not fail on unexecuted JavaScript).
- **Schema Grounding:** Complete (`Organization`, `LocalBusiness`, `JobPosting`, `FAQPage`, `BreadcrumbList`).
- **Entity Identity:** Clear entity resolution for founder *Asnan Khan*, MSME registration *UDYAM-MH-01-0027668*, and headquarters in *Chhatrapati Sambhajinagar, Maharashtra*.
- **Crawl Efficiency:** Sub-200ms response time with HTTP caching headers.

