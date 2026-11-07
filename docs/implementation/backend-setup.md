# Backend deployment and operations

This implementation removes the mock database, default administrator, public source directory, predictable applicant lookup and public resume links. An intake success means a persistent database transaction or an authenticated Google Apps Script acknowledgement completed. Email delivery is a separate status.

## Production configuration

Configure secrets in the hosting environment, never in tracked files, browser JavaScript, static build output or screenshots.

| Variable | Purpose |
| --- | --- |
| `LIBSQL_URL` (or `TURSO_DATABASE_URL`) | Remote `libsql://` or `https://` database URL. Required for the administrator, admissions and media. A local `file:` URL is rejected. |
| `LIBSQL_AUTH_TOKEN` (or `TURSO_AUTH_TOKEN`) | Token scoped to the database. |
| `JWT_SECRET` | A randomly generated secret of at least 32 characters. The historical hard-coded secret is rejected. Rotating this invalidates administrator sessions. |
| `ADMIN_USERNAME` | Explicit administrator account name. |
| `ADMIN_PASSWORD_HASH` | bcrypt hash of a unique strong password. The historical `admin123` password is never bootstrapped. |
| `GOOGLE_APPS_SCRIPT_SECRET` | Optional application intake fallback when the database is unavailable. Must match the Script's `API_SECRET`. |
| `GOOGLE_APPS_SCRIPT_URL` | HTTPS deployed Apps Script `/macros/s/.../exec` URL. The existing project URL remains the compatibility default. |
| `GOOGLE_APPS_SCRIPT_VERSION=2` | Required for every Script intake path. Set only after deploying and verifying version 2. The backend also checks the deployed version before sending applicant data and checks the acknowledgement version. |
| `APPLICATION_ID_SECRET` | Stable secret of at least 32 characters for retry identity across production instances. A sufficiently long JWT or Apps Script secret is also accepted. Without a stable secret, production applications fail honestly rather than issuing changing retry references. |
| `GMAIL_USER` / `GMAIL_PASS` or `SMTP_USER` / `SMTP_PASS` | Optional email notifications. Gmail app-password spaces are normalised. |
| `SMTP_HOST`, `SMTP_PORT` | SMTP host and port; defaults are `smtp.gmail.com`, `465`. Port 465 uses implicit TLS; other ports use the transport's STARTTLS support. |
| `ADMIN_EMAIL` | Notification recipient; defaults to the published contact email. |

No infrastructure has been provisioned and no production secrets or records have been changed by these code changes. A real remote database connection and remote persistence across cold starts still need a configured deployment smoke test with explicitly synthetic records and a non-delivering mail transport. The automated suite mocks the libSQL transport contract and verifies persistence using an isolated real local SQLite file.

When remote storage is absent, the public static site and canonical jobs still work. Administrative database operations are unavailable. Applications can use the authenticated, verified version 2 Script fallback; otherwise they return HTTP 503. Admissions return HTTP 503 with a WhatsApp draft link when neither durable path is configured. The visitor must send that message; merely opening a draft is not a submitted enquiry.

For local development only, the database is `.data/planb.sqlite` or `DATABASE_PATH`. Production and Vercel never copy a database into `/tmp`, create an upload directory, or claim a memory write is persistent. Keep the old database backed up privately before any migration. Historical applications whose job IDs were previously remapped need manual reconciliation against their original records; the upgrade does not guess their employers.

## Google Apps Script version 2

Review and deploy `google-apps-script-code.gs` as a new Web App version in the existing project. Required Script Properties are `SPREADSHEET_ID`, `DRIVE_FOLDER_ID`, `API_SECRET`; optional names are `SHEET_NAME=Applications` and `ADMISSIONS_SHEET_NAME=Admissions`.

Create the admissions tab before enabling the version 2 backend flag. Its columns are: enquiry ID, timestamp, student name, mobile, WhatsApp, email, qualification, course, college, city, admission type, requirements, status. Applications retain columns A:R and add `Request fingerprint` in column S. Keep both sheets and the Drive folder restricted to authorised staff. Existing public Drive sharing is not automatically repaired; review legacy resume permissions separately.

The Script checks shared authentication, uses a lock, protects every text cell against formula execution, validates file type/size, rejects conflicting fingerprints, saves a private Drive file, and removes a newly created orphan if the sheet write fails. The backend binds its server-generated identifier to the complete applicant payload and resume. A caller's identifier is only a retry hint and can never retrieve somebody else's application. The API does not return Drive URLs to applicants.

The historical Script is disabled for every intake path. A secret alone does not enable it. The backend first requests the deployed endpoint’s version without candidate data; only a successful version 2 response allows the submission. Its acknowledgement must also report version 2 and the expected server-issued identifier. This prevents a mistaken version flag from transferring a new resume to the old deployment. Deploy version 2 for fingerprint checks, private-sharing enforcement, bounded file validation, orphan cleanup and admissions support.

## API and UI contract

- `POST /api/admin/login` sets an `HttpOnly`, `SameSite=Strict` cookie; it returns no browser-storage token. Production cookies are `Secure`. `GET /api/admin/session` checks the account; `POST /api/admin/logout` clears the cookie. The administrator UI should use same-origin fetch. Legacy bearer parsing remains for separately managed API clients.
- `GET /api/jobs` reads the canonical source and returns only open, published, unexpired vacancies with original source IDs. The shared model also drives generated pages. Authenticated job/category mutations return 409 with a source-publication explanation: edit `jobs.json`, validate and rebuild to publish all representations together.
- `POST /api/applications` uses multipart `resume`, `name`, `mobile` (or `whatsapp`), `city`, optional `email`, `qualification`, `experience`, `experienceYears` and `job_id`. `application_id`, `applicationId` or `requestId` is only a retry hint. Omit `job_id` for a general career enquiry. Unknown jobs return 404; closed, pending and expired jobs return 409. Success returns `applicationId`, `duplicate`, `message`, `resumeName`, `notifications`; there is no public resume URL. IDs now have the form `PB-` plus 32 hexadecimal characters.
- Resume formats: PDF, DOC or DOCX; one file no larger than 3 MB. Content signatures are checked; DOCX additionally needs an Office ZIP directory and cannot contain the VBA project entry. Macro scanning is not an antivirus service; authorised staff should still treat received documents as untrusted. Files are served as downloads, and stored resume bytes are unavailable through the public media API.
- `notifications.admin` / `.applicant` is `sent` only when SMTP accepts a recipient; this is not proof of inbox delivery. Other states are `failed`, `not_configured`, `not_requested`, `not_repeated`. The server awaits results; intake remains successfully recorded if a subsequent notification fails. Retrying a saved application does not resend emails. The browser retains the confirmed duplicate reference but does not emit a second `application_received` conversion hook. Analytics-provider configuration and conversion reporting still require authorized access and verification; the local hook alone is not measured conversion evidence.
- Admissions accept `whatsapp_number` or the old `whatsapp` field. Both `whatsappUrl` and `admin_whatsapp_link` carry the same draft URL. A 503 fallback has `success:false` and `fallback.requires_send:true`; never show “received” for that response.
- Private resumes: authenticated `GET /api/admin/applications/:applicationId/resume`. The application listing includes this local protected URL when the database stores the file. Script-only submissions are available in the private Sheet/Drive, not mirrored into a nonexistent administrator database.
- Media upload: authenticated multipart `POST /api/admin/media`, field `files`, one 3 MB file and `category`. Gallery uploads accept field `image`. Images are decoded and rewritten in memory; PDFs and MP4s are signature checked. Stored media URLs are public, so only upload material approved for publication. Never upload candidate resumes, unredacted identity documents, salary slips, offer letters or payment proofs as public media. Deleting a media record removes its public database blob rather than operating on arbitrary filesystem paths.
- `GET /api/trust/verify-candidate` returns 410 with a contact instruction. Public sequential/mobile/email candidate searches are retired. Unverified counters, activity, testimonials, success stories and seeded service prices are not exposed. Existing private records are preserved for review. The gallery API reads only approved entries from `data/media-manifest.json` and never enumerates source folders. The manifest starts empty until publication consent is documented. Entries have `{folder, url, approved: true}`. Unknown folders return 404.
- `GET /api/admin/test-email` requires authentication and only reports configuration; it sends nothing. IndexNow submissions require authentication and only accept public HTTPS URLs on the canonical host. The endpoint submits indexing requests; it cannot promise indexing or rank.

Public files are served only from the explicit public build, with a finite source allowlist for development. Repository files, environment files, database files, backend code and Google Apps Script source must never be copied to `dist`. Rate limits apply to `/api` only, with additional limits on intake and login. In-memory rate limiting applies per running instance; add an appropriate platform-level rule or distributed limiter if abuse crosses many instances.

## Verification performed

Run `node --test tests/backend.test.js`. Tests use synthetic records, a temporary SQLite database, a stubbed email transport and an Apps Script test double. They make no requests to live intake, SMTP, Drive, Sheets or IndexNow. Coverage includes source exposure, canonical/closed vacancies, auth and cookie settings, actual applicant and resume persistence, retry identity isolation, upload rejection, admissions aliases, media persistence/deletion, serverless fail-closed responses, libSQL transaction shape, spreadsheet formula/conflict protection and awaited mail outcomes.

After production configuration, use a separate approved synthetic smoke test to prove a record survives a new serverless instance and an authorised HR session can retrieve the matching private resume. Confirm that a service failure produces an honest error/fallback and cannot produce a success screen. Rotate any credentials that were publicly exposed by the former root static-serving configuration; code changes cannot undo earlier downloads.
