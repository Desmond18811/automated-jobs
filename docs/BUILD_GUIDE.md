# JAVI Build Guide

JAVI finds jobs and clients you are actually qualified for, writes applications from your real CV (and nothing else), sends them through the right channel, and keeps track until you are hired.

**The principle behind every decision: quality at speed, not volume.** A tailored, truthful application sent within hours of a posting beats fifty generic ones. It also doesn't burn the user's email reputation or get their accounts banned.

> **Updated 21 Nov 2026 to match the code.** Changes from the original guide:
> - the real directory layout
> - the live browser may sign in and create accounts
> - dry-run mode
> - auto mode is enforced on the server
> - Workable and SmartRecruiters sources
>
> Business Mode has its own doc: [BUSINESS_MODE.md](BUSINESS_MODE.md). Known gaps are in [PIPELINE_AUDIT.md](PIPELINE_AUDIT.md).

## 1. How people get hired on each channel

| Channel | What works | What gets you ignored or banned | JAVI's job |
|---|---|---|---|
| Referrals | Someone who has seen your work vouches for you | Asking strangers; asking before delivering | After good work or a hire: prompt for a testimonial and a referral (Phase 6) |
| Company career pages | Applying directly and early, with a CV that mirrors the role | Applying to every role at one company | Watch Greenhouse / Lever / Ashby / Workable / SmartRecruiters boards; fill forms; duplicate guard |
| Job boards (Jobberman, MyJobMag, RemoteOK, WWR, Adzuna) | Speed and keyword fit; many Nigerian posts say "send your CV to hr@…" | Generic CVs; missing the stated application method; scraping sites that forbid it | Ingest only allowed feeds/APIs, extract the apply method, tailor, send via the right adapter |
| Cold email to hiring managers | Short, specific, from a real person to a named person, one ask | Blasts, fake personalisation, no opt-out, follow-up spam | Low caps, sending hours, fact-checked text, follow-ups that stop on reply |
| Freelance marketplaces (Upwork, Fiverr) | Fast, short proposals that restate the client's problem | Bots; Upwork and LinkedIn terms forbid automation | Assisted only: JAVI drafts, the user submits |
| Selling services to businesses | A concrete offer tied to a visible problem, with proof | Scraped lists, no unsubscribe, unsolicited WhatsApp | Business Mode ([BUSINESS_MODE.md](BUSINESS_MODE.md)) |

**Do we scrape job platforms? No.**
- Every automatic source is an official API or feed: RemoteOK, RSS, Adzuna, and the Greenhouse / Lever / Ashby / Workable / SmartRecruiters board APIs.
- LinkedIn, Indeed, Upwork, Glassdoor, Jobberman's own apply flow and Fiverr are never sources. Their links arrive only when the user pastes them, and go to the assisted adapter.
- The only HTML JAVI fetches is a link the user gives it. JavaScript-heavy pages are rendered in a browser so the LLM has the whole posting to tailor against.

**What this means for the product:**
- **Review mode is the default.** Auto mode unlocks only after the user has approved 10 drafts. The server enforces this on every profile update (including onboarding) and again in the generate worker. Even then, auto-send needs a high score and zero fact-check warnings.
- **Daily caps are low by design:** 15 by default, never more than 50.
- **Speed comes from ingestion, not blasting:** sources are scanned every few hours, drafted immediately, and approved within hours.

## 2. Architecture

```
Sources ─► ingest worker (normalise, dedupe) ─► match worker (filters, score)
        ─► generate worker (tailored CV + letters, FACT GUARD) ─► review (or auto, if eligible)
        ─► deliver (safety: caps, hours, suppression, duplicates)
              ├─ email adapter (Gmail API)
              ├─ form adapter: live JAVI browser window (default in dev) or headless Chromium
              └─ assisted adapter (LinkedIn, Upwork, Indeed, …)
        ─► sent | needs_user (task + WhatsApp, answered once, saved) | failed (retry, then notify)
```

**Pasted links and spreadsheets.**
- `POST /api/jobs/links` (or a sheet that's just a column of links through `/api/jobs/import`) saves each link as a job.
- It's then matched to that user, tailored, and applied to under the user's approval rules.

## 3. Repository layout

```
server/src
├── index.ts / app.ts / server.ts   Express API (+ Socket.IO)
├── worker.ts                       BullMQ workers + ingest scheduler
├── config/env.ts                   zod-validated environment
├── routes/ controllers/            HTTP layer (auth, profile, jobs, applications, tasks, business, reply, me, …)
├── services/                       auth, job, task, safety, notification, whatsapp, reply, gmail, taxonomy
│   ├── documents/                  LLM wrapper, CV parser, generators, FACT GUARD, CV renderer
│   └── business/                   Business Mode: catalog, leadFinder (OSM), audit, value, pricing, pitch, scripts
├── models/                         Mongoose models (Profile, JobPost, Application, Task, SiteAccount, BusinessLead, …)
├── sources/                        RemoteOK, RSS, Adzuna, Greenhouse, Lever, Ashby, Workable, SmartRecruiters
├── matching/                       tokeniser, skill terms, filters, score
├── adapters/                       email, form (headless), assisted, live/session.ts (visible browser)
├── queues/ workers/                queue definitions; ingest, match, generate, deliver
├── lib/                            crypto, net (SSRF guard), liveBrowser, replyToken, cache, storage, memoryDb (dev fallback)
└── scripts/                        seed + test suites (see §8)
web/src                              React: pages/ (profile-setup wizard, reply page), components/dashboard/views/, api.ts
```

## 4. Data model (short)

| Model | What it holds |
|---|---|
| **Profile** | The fact base: experience with bullet ids, projects, education, certifications, skills with years, links. Also preferences, rules (cap, approval mode, sending hours) and the answer bank. `status` stays `draft` until `/profile/verify`. |
| **JobPost** | One schema for every source: apply method, `dedupeHash`, `fingerprint` |
| **Application** | User + job: score, documents with fact-check result, delivery refs, history. States: matched → drafted → approved → sent / needs_user / failed → replied / interview / offer / hired / rejected / archived. |
| **Task** | A needs-you item: reason, questions (with optional LLM-suggested answers), 4-digit reply code, `live` flag |
| **SiteAccount** | Accounts the live browser uses on job sites (Google or password); passwords AES-GCM encrypted |
| **BusinessLead, BusinessServices** | Business Mode |
| **AuditLog, Suppression, Notification, RefreshToken, User, TaxonomyRequest** | Supporting data |

## 5. Key design decisions

### Fact guard
`services/documents/factGuard.ts` checks every generated text deterministically:
- numbers must appear in the profile or the job post
- skill terms must appear in the profile (terms only in the job post are warnings)
- capitalised names must appear in the profile or the job post

Blocking issues trigger one guided regeneration (`guarded()` in `generators.ts`). The CV itself selects and reorders the user's own bullets; only the 2-3 sentence summary is written by the model.

Business Mode uses the same guard with its own fact base (`buildBusinessVocab`).

### Safety checks before every send (`services/safety.service.ts`)
A send only goes out when all of these hold:
- the application is approved
- the company is not blocked
- the recipient is not suppressed
- there's been no duplicate application in 90 days
- it's inside sending hours
- a slot is reserved from today's cap (atomic Redis INCR)

Outside hours, or over the cap, the application is re-queued rather than dropped.

### Applying to forms: the live browser
`APPLY_BROWSER=live` (the default outside production) opens JAVI's own Brave/Chrome window. It uses a separate profile under `STORAGE_DIR/browser-profile`, attached over CDP. It isn't flagged as automation, so Google sign-in works.

Each application is a tab:
1. **CAPTCHA:** if one appears, JAVI messages the user on WhatsApp and waits. It continues once the user clears the CAPTCHA in the window. JAVI never solves or bypasses CAPTCHAs.
2. **Sign-in walls:**
   - "Continue with Google" picks the profile's Google account.
   - Otherwise JAVI creates an account with a generated per-site password, stored encrypted in `SiteAccount`, and logs in with it next time.
   - Verification codes are asked for on WhatsApp, or read from Gmail when `GMAIL_READ_CODES=true`.
3. **Finding the form:** JAVI clicks through "Apply", and looks inside ATS iframes.
4. **Filling:** it fills only from the profile and the answer bank. Unknown questions are asked in one message, with LLM-drafted suggestions for open-ended ones. Passwords are never asked for over WhatsApp.
5. **Submitting:** it submits, or clicks Next, until a confirmation page shows.
6. **If nobody answers** within `LIVE_WAIT_MINUTES`, the application parks as needs-you with the tab left open.

`APPLY_BROWSER=headless` (production default) never logs in; login walls become tasks.

### Dry-run (`FORM_DRY_RUN_FIRST`, default 3)
- For a user's first N form applications, both adapters fill and screenshot the form but stop before the final submit.
- A `confirm_submission` task lets the user check the form, then submit it themselves or tap Continue.

### Needs-you loop and WhatsApp
- Alerts go only to the user's own profile phone.
- Every alert carries a one-tap answer link (`/r/:token`, signed, no login needed).
- With Twilio, plain replies like `4821 yes`, `4821 2` (option number) or `4821 done` work through `POST /api/webhooks/whatsapp/twilio`.
- Answers are saved to the answer bank. Salary answers default to one-off.

### Assisted platforms
- LinkedIn, Upwork, Indeed, Jobberman's own apply flow, Fiverr and Glassdoor are never automated.
- JAVI drafts the application and opens a task with a ban-risk warning.

### Follow-ups
Follow-ups ship together with Gmail reply detection in Phase 6, never before.

## 6. Compliance and risk
- **Gmail:**
  - `gmail.send` is a sensitive scope.
  - `GMAIL_READ_CODES` adds `gmail.readonly`, a restricted scope: it needs Google verification and an annual security assessment before public use. Keep it off for public users until then.
- **Platform terms:** see §1. RemoteOK requires credit: job cards show "Listed on Remote OK" with a link back.
- **NDPA 2023:**
  - Privacy notice with the lawful basis for each use.
  - Export and delete endpoints. They cover the profile, applications, tasks, site accounts (never passwords in exports) and business data.
  - Tokens and passwords encrypted at rest.
- **Business outreach:** permission-first in Nigeria ([BUSINESS_MODE.md](BUSINESS_MODE.md) §1.8).
- **Test routes:** `/api/test/*` bypass the safety rules. They exist only when `ENABLE_TEST_ROUTES=true` outside production.
- **Security in place:**
  - bcrypt, short-lived JWTs, rotating refresh tokens
  - AES-256-GCM secrets
  - SSRF guard on user URLs, signed OAuth state and reply tokens, Twilio signature check
  - rate limits, helmet, upload limits

## 7. Build phases (ticked = in the repo)

**Phase 0: Foundations**
- [x] Env validation, MongoDB, Redis, BullMQ, logging, auth, audit log
- [ ] CI (typecheck + test suites), Dockerfiles, docker-compose

**Phase 1: Profile and fact base**
- [x] CV upload and parse; merges rather than overwrites
- [x] 9-step setup wizard covering every profile field
- [x] Verify gate
- [x] Rules; auto mode enforced at 10 approvals
- [ ] Unit tests for parser mapping

**Phase 2: Sources and matching**
- [x] RemoteOK, RSS, Adzuna, Greenhouse / Lever / Ashby / Workable / SmartRecruiters
- [x] Pasted links and link spreadsheets
- [x] Normalise, dedupe, fingerprint
- [x] Filters and score
- [x] Real scores shown in the job feed
- [ ] Jobberman / MyJobMag feeds (check terms first)
- [ ] Embeddings
- [ ] FX table for salary comparison

**Phase 3: Documents**
- [x] Tailored CV, email, cover letter, proposal
- [x] Fact guard with regeneration
- [x] Business pitch generator under the guard
- [ ] Golden tests

**Phase 4: Action layer**
- [x] Gmail send
- [x] Headless form adapter
- [x] Live browser sessions
- [x] Dry-run
- [x] Assisted adapter
- [x] Deliver worker
- [ ] Per-ATS handlers (Workday widgets)

**Phase 5: Needs-you and notifications**
- [x] Tasks, answer bank, resume
- [x] In-app notifications
- [x] WhatsApp alerts with reply link and Twilio replies
- [ ] Socket.IO events from the worker process (needs a Redis adapter)
- [ ] Web push

**Phase 6: Tracking and follow-ups**
- [x] Manual status updates
- [ ] Gmail watch / PubSub
- [ ] Reply classifier
- [ ] Follow-ups (day 4 and day 9, stop on reply)
- [ ] Interview-invite task
- [ ] After-hire referral loop

**Phase 7: Business Mode**
- [x] Round 1 (see [BUSINESS_MODE.md](BUSINESS_MODE.md))
- [ ] Round 2: sequence, unsubscribe, public audit page, PDFs, stats

**Phase 8: Front end**
- [x] Setup wizard
- [x] Job feed with link intake
- [x] Needs-you
- [x] Reply page
- [x] Lead board
- [ ] Review queue polish
- [ ] Settings for rules

**Phase 9: Launch**
- [ ] OAuth verification
- [ ] Privacy notice and terms
- [ ] Billing
- [ ] Monitoring
- [ ] Object storage

## 8. Running locally and testing

```bash
cd server
cp .env.example .env            # fill in secrets
npm install
npm run setup:browser           # Chromium for PDFs and headless forms
npm run dev                     # API on :4000 (falls back to an in-memory DB if MongoDB is unreachable)
npm run dev:worker              # workers (needs Redis)
cd ../web && npm run dev
```

The first time a form is applied to in live mode, a JAVI browser window opens. Sign in to Google in it once.

Test suites (all run offline on the in-memory DB, with outside requests stubbed or mocked):

| Command | Covers |
|---|---|
| `npm test` | 40 API endpoints |
| `npm run test:profile [cv.pdf]` | Setup contract, verify gate, CV merge |
| `npm run test:live` | Live browser against a mock job site: sign-up, verification code, questions, CAPTCHA, dry-run, two-page submit, WhatsApp reply parsing |
| `npm run test:business [--live]` | Business Mode. `--live` also queries real OpenStreetMap. |
