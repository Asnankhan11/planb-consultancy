# Upgrade verification and release status — 8 November 2026

The work is on `codex/audit-regional-seo-upgrade`, based on `efba42e`, in a separate worktree. The original main checkout was left unchanged. The implementation uses the installed Claude SEO, technical/schema/local/GEO/content workflows and relevant workspace GSD, design, copywriting and webapp-testing skills. Three specialist agents implemented and independently reviewed backend security, publication/front-end behavior and competitor/editorial/admin work.

## Verified locally

| Check | Result and scope |
| --- | --- |
| `npm run build` | Pass: 90 explicitly published files; 69 HTML pages; 68 valid JSON-LD blocks; 3,032 internal links/assets; schema asset URLs also checked. |
| `npm test` | 25 passing backend/SEO tests. Real temporary SQLite persistence, mocked remote libSQL contract, Script version/probe checks, mocked mail. No real candidate submissions or notifications. |
| `npm audit --audit-level=high` | Zero reported vulnerabilities in the installed dependency tree at verification time. |
| `git diff --check` | Pass. |
| Chromium browser smoke | 309 checks pass: navigation across published templates, mobile/desktop widths, filters, closed-job selection, saved jobs, server failures, controlled successful receipt, privacy exclusions, downloads and private/missing paths. No uncaught JavaScript errors. See browser-verification.json. |
| Administrator Chromium checks | 15 checks pass with controlled API responses, including inert injected text, cookie contracts, status/notes edits, private resume downloads and honest failure states. See ../seo/evidence/admin-ui-check-2026-11-08.json. |
| Independent publication review | 12 source vacancies: 8 open, 1 closed, 3 details pending. No local office vacancy is invented. Only 2 have sufficient supplied facts for JobPosting markup. 29 main sitemap URLs plus 8 job URLs. |
| Mobile Lighthouse | Home: performance/accessibility/best-practices/SEO **100/100/100/100**. Jobs: **98/100/100/100**. Both LCP about 1.1 s and CLS 0 in the local lab. Full context and measured hashes are in performance-verification.json. |

The browser server ran with `NODE_ENV=production` and no production credentials. External browser requests were blocked. Actual unconfigured submissions returned unavailable responses; the successful-browser case used an explicitly synthetic response. Backend persistence/identity tests separately verify a real temporary database. No production records, emails or WhatsApp messages were created.

Browser reproduction uses Python Playwright and Chromium:

```sh
python .agents/skills/webapp-testing/scripts/with_server.py \
  --server 'NODE_ENV=production PORT=4188 node server.js' --port 4188 \
  -- python tests/browser_smoke.py
```

Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to an installed Chromium binary and optionally `PLANB_EVIDENCE_DIR` for screenshots. The run used the existing isolated Python/Chromium installation, not an added runtime dependency. Screenshots and full Lighthouse reports are in the local Downloads/Plan-B-Careers-Upgrade-2026-11-08 folder, excluded from deployment.

## Material release requirements

GitHub authenticates as `gsdminers-spec` with write access to `Asnankhan11/planb-consultancy`. The connected GitHub app uses a different read-only identity, so Git's existing credential helper is used without exposing credentials. The repository has two Vercel status integrations. Direct Vercel project access currently opens a login page; no local Vercel credentials or production integration environment variables were available.

Before production release, establish which Vercel project owns the canonical domain, verify the preview build/routing, configure durable storage and administrator secrets, deploy/probe Apps Script v2 if it is used, and prove the configured application survives a new serverless instance. The current code deliberately returns 503 when these requirements are unmet; contact and explicit WhatsApp drafts remain available.

The tracked historical database is removed from this branch's Git index and excluded from publication. Its local copy is preserved. This does **not** remove old Git history or earlier public copies. Repository owners must review historical exposure, rotate potentially exposed credentials, and restrict legacy resume/Drive sharing. No destructive history rewrite or private-data migration was performed.

## Limits of the evidence

These are implementation, local browser and lab checks. They do not prove live deployment, Google indexing, live employer availability, real-user Core Web Vitals, provider-side conversions, local-pack rank or AI recommendations. Google Analytics is excluded from sensitive form/workspace pages; non-personal confirmed-receipt hooks exist, but provider-side conversion configuration is still required. No rank, partnership, review or placement total was fabricated.

The bounded competitor review covers eight current English/Hindi/Marathi query samples and six primary competitor pages, with a dated evidence trail. It is not a census of every competitor or a controlled measurement of the owner's reported tenth position. See the complete audit closure map and competitor research for remaining account and operational work.
