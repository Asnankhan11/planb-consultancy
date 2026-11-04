# PLAN B CAREERS – GOOGLE JOBS IMPLEMENTATION SPECIFICATION
**Technical Standard:** Google Search Central – JobPosting Structured Data (2026 Edition)  
**Target Search Engine Feature:** Google Jobs Search Widget & Rich Results  
**Document Version:** 1.0  

---

## 1. Overview & Architectural Rules

To qualify for display in the Google Jobs search widget and gain priority indexing, Plan B Careers implements programmatic leaf pages adhering strictly to Google Search Essentials and Google Jobs Guidelines.

### The Golden Rules of Google Jobs Compliance:
1. **Leaf Page Only:** `JobPosting` structured data must reside **ONLY on individual job leaf pages** (`/job/:slug` or `/job/:id.html`). It is strictly prohibited on search or listing pages (`/jobs.html`).
2. **Textual Consistency:** Every field present in the JSON-LD schema (salary, job location, hiring organization, responsibilities) **MUST be visible** in the human-readable HTML rendered on that page.
3. **No Closed Job Markup:** When a job is closed or expired, the `JobPosting` schema must either be removed, the page returned with HTTP 410 Gone / 404 Not Found, or `validThrough` set to a past timestamp.
4. **Direct Apply Feature Tag:** Plan B Careers includes `"directApply": true` because candidates can apply directly on-page without third-party redirection hurdles.

---

## 2. Complete JobPosting JSON-LD Specification

### Remote / Work-From-Home Job Example (`TELECOMMUTE`):
```json
{
  "@context": "https://schema.org",
  "@type": "JobPosting",
  "title": "Backend Process Executive (100% Non-Voice)",
  "description": "<p>Process: 100% Non-Voice. Experience: Freshers and experienced candidates welcome.</p><h4>Key Responsibilities:</h4><ul><li>Data entry and record updating</li><li>Verify hotel booking data</li><li>Identify and fix revenue leakage</li><li>Maintain accurate spreadsheets and internal systems</li></ul><h4>Requirements:</h4><ul><li>Basic computer knowledge & MS Excel</li><li>Good typing speed and attention to detail</li><li>Laptop or desktop mandatory with stable internet</li></ul>",
  "identifier": {
    "@type": "PropertyValue",
    "name": "Plan B Careers",
    "value": "JOB-004"
  },
  "datePosted": "2026-10-25T00:00:00+05:30",
  "validThrough": "2026-12-31T23:59:59+05:30",
  "employmentType": "FULL_TIME",
  "hiringOrganization": {
    "@type": "Organization",
    "name": "SnapThink",
    "sameAs": "https://planbcareers.in",
    "logo": "https://planbcareers.in/images/logos/Plan-B-Careers-logo.png"
  },
  "jobLocationType": "TELECOMMUTE",
  "applicantLocationRequirements": {
    "@type": "Country",
    "name": "IN"
  },
  "baseSalary": {
    "@type": "MonetaryAmount",
    "currency": "INR",
    "value": {
      "@type": "QuantitativeValue",
      "minValue": 18000,
      "maxValue": 30000,
      "unitText": "MONTH"
    }
  },
  "directApply": true
}
```

### On-Site / Office Job Example:
```json
{
  "@context": "https://schema.org",
  "@type": "JobPosting",
  "title": "HR Recruiter",
  "description": "<p>Plan B Careers is hiring an HR Recruiter for our Akola office. Day Shift (10:00 AM – 6:30 PM).</p><h4>Responsibilities:</h4><ul><li>Screen candidate profiles</li><li>Conduct initial telephonic interviews</li><li>Coordinate client interview schedules</li></ul>",
  "identifier": {
    "@type": "PropertyValue",
    "name": "Plan B Careers",
    "value": "JOB-003"
  },
  "datePosted": "2026-10-25T00:00:00+05:30",
  "validThrough": "2026-12-31T23:59:59+05:30",
  "employmentType": "FULL_TIME",
  "hiringOrganization": {
    "@type": "Organization",
    "name": "Plan B Consultancy",
    "sameAs": "https://planbcareers.in",
    "logo": "https://planbcareers.in/images/logos/Plan-B-Careers-logo.png"
  },
  "jobLocation": {
    "@type": "Place",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Civil Lines",
      "addressLocality": "Akola",
      "addressRegion": "MH",
      "postalCode": "444001",
      "addressCountry": "IN"
    }
  },
  "baseSalary": {
    "@type": "MonetaryAmount",
    "currency": "INR",
    "value": {
      "@type": "QuantitativeValue",
      "value": 240000,
      "unitText": "YEAR"
    }
  },
  "directApply": true
}
```

---

## 3. Required & Recommended Properties Matrix

| Property | Type | Mandatory? | Notes / Plan B Implementation |
| :--- | :--- | :--- | :--- |
| `title` | `Text` | **Required** | Clean job title without marketing buzzwords (e.g. no "URGENT HIRING $$$") |
| `description` | `HTML` | **Required** | Fully formatted HTML with `<p>`, `<ul>`, `<li>`, `<h4>` tags |
| `datePosted` | `ISO 8601 Date` | **Required** | Actual date of listing in Indian Standard Time (`+05:30`) |
| `validThrough` | `ISO 8601 Date` | **Required** | Calculated forward expiration (e.g. 60 days from posting) |
| `hiringOrganization`| `Organization`| **Required** | Client name or Plan B Careers with verified logo |
| `jobLocation` | `Place` | **Required for On-Site** | Full `PostalAddress` with city, state (`MH`), and country (`IN`) |
| `jobLocationType` | `Text` | **Required for WFH** | Must be exact string `"TELECOMMUTE"` |
| `applicantLocationRequirements`| `Country` | **Required for WFH**| Set to `{"@type": "Country", "name": "IN"}` |
| `baseSalary` | `MonetaryAmount` | **Recommended** | Accurate INR quantitative value or range; boosts CTR by ~35% |
| `employmentType` | `Text` | **Recommended** | `FULL_TIME`, `PART_TIME`, `CONTRACTOR`, `INTERN` |
| `directApply` | `Boolean` | **Recommended** | `true` (enables Google Jobs Direct Apply badge) |

---

## 4. Expiration & Stale Job Management

Google strictly penalizes job boards that leave dead listings indexed:
1. **Active Jobs:** Display full application form, active badges, and valid future `validThrough` date.
2. **Closed Jobs:**
   - On the web page: Banner stating *"This position is currently closed. Explore related openings below."*
   - In structured data: Remove `JobPosting` schema OR update `validThrough` to the past date.
   - For deleted roles: Return HTTP 410 Gone status.
   - Related roles recommendations to ensure 0% candidate dead-ends.

---

## 5. Verification Checklist

- [x] Every active job in `jobs.json` / SQLite database has a corresponding static leaf URL (`/job/:slug.html` and `/job/:id.html`).
- [x] Leaf URLs are included in `/sitemap-jobs.xml`.
- [x] Schema passes Google Rich Results Test without errors or warnings.
- [x] Visible text on the page matches JSON-LD values 1:1.
- [x] `directApply: true` is included to trigger the direct application action on Google Search.

