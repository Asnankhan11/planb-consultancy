# Plan B Careers job discovery design

## Purpose and direction

Help a candidate find a suitable role, compare advertised requirements, save a shortlist and contact/apply with clear expectations. The existing site explained the service but delayed job discovery. The homepage now starts with a working search and a real published role.

The design uses a white canvas and restrained pearl glass. Navy (#061D45) and amber (#E8A317) retain the brand; mineral teal (#165B59), celadon (#E3EEE8) and muted lilac (#EEE8F5) add distinction. Glass is limited to the header and featured opportunity; body text and controls sit on readable surfaces. No rotating carousel, artificial live counter, invented review, placement total or scarcity claim is introduced.

Typography uses a self-hosted Latin subset of Bricolage Grotesque for headings and the device system font for body and forms. The OFL license is included with the font. One arrival animation introduces the search and feature card; button and save feedback use short transitions. Reduced-motion removes animation and smooth scrolling. All content remains visible without animation JavaScript.

## Layout

```text
Local contact strip
Brand | Find a job | Local support | Guides | Story | Saved | Contact

Job-first headline + search    Real role in pearl glass
Quick routes and all listings  Advertised pay + eligibility + actions

Three current roles: company / requirements / pay / save / detail
Three steps to an informed application
Akola support conversation     Useful career guides
Short FAQ and job discovery action
Shared footer
```

The directory provides a query, visible quick filters, optional detailed filters, sorting and saved-only results. Search/filter state supports browser Back and Forward. A local published snapshot keeps filters usable if the jobs API is unreachable. Without JavaScript, all open listing links and details remain available. Saved roles are device-local, and the interface says so.

Role pages put the role, compensation, work arrangement and application action near the top. Details use semantic lists; the desktop side panel keeps the next step available. Closed/pending records keep their existing non-applicable and noindex behavior.

The application page checks availability before requesting candidate details. An explicit unavailable response shows a role-aware WhatsApp option and retry control. Unknown/error/timeout responses leave the normal form available; the submission response still controls success. No message is sent automatically and no personal fields are stored offline.

## Implementation boundaries

- Authored style source: `css/input.css`; generated `css/styles.css` remains build output.
- Three-layer CSS colors: primitives → semantic roles → component aliases. Existing admin/Tailwind compatibility classes remain supported.
- `lib/home-page.js`, `lib/jobs-page.js`, `lib/job-card.js` generate the main discovery surfaces; shared cards are used by browser enhancement too.
- The explicit publication allowlist includes the licensed font and shared card browser script.
- Existing SEO metadata, schema eligibility, canonical routes, public/private publication boundary and Vercel fallback routing are preserved.
- The token scanner flags existing literal styles, dimensions and primitive declarations; it is an advisory scan, not a clean validation. New public component colors reference named tokens. Numeric responsive typography/spacing values remain intentionally authored in CSS.

## Verification

See the accompanying validation record for final commands, browser results and Lighthouse measurements. These checks establish implementation behavior, not a measured increase in job applications or search rankings. Online intake configuration is a separate operational dependency; this design provides an honest contact route while it is unavailable.

## Owner-confirmed additions

After reviewing localhost, the owner supplied a six-year operating history and more than 1,000 placements. Homepage and About now display those figures from the central facts record, with attribution in supporting content. Role cards also show recorded qualifications, the job directory links the existing resume template and interview guide, and contact enquiries include a candidate-feedback option. See `competitor-notes.md` for sources and limits.
