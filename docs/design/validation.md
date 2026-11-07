# Local release validation — 8 November 2026

- `npm run build`: 69 HTML pages, 68 JSON-LD blocks, 3,297 internal links/assets validated; 93 explicitly published files. Existing canonical/schema eligibility and private-file boundary preserved.
- `npm test`: all 25 backend/SEO tests pass.
- `tests/browser_smoke.py`: 310 checks pass, zero page errors.
- `tests/design_browser.py`: 90 checks pass on the final UI, including enlarged text, narrow screens, search/history, saved jobs, refresh focus and application availability states.
- Independent visual/code review: desktop/mobile homepage, job directory, role page, application and saved workspace reviewed; seven targeted refresh-focus regressions pass.
- Final sequential mobile Lighthouse: homepage and jobs score 100 Performance / 100 Accessibility / 100 Best Practices / 100 SEO. LCP 1.2s / 1.4s; CLS 0 / 0. No binary audit failures. These are local lab checks, not production field measurements or ranking guarantees.
- `git diff --check`: passes. Font license included. Advisory token scan is described in `job-discovery.md`.

All form success tests use synthetic intercepted responses. No customer messages, job applications or admission enquiries were sent externally. Production application intake remains a separate configuration dependency; the interface now presents a clear contact alternative when unavailable.

Evidence screenshots and raw Lighthouse reports are stored outside the repository in `/Users/sheikhwasique/Downloads/Plan-B-Careers-Design-2026-11-08/`.
