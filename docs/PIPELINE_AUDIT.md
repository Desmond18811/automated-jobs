# J.A.V.I pipeline audit

**Date:** 18 Nov 2026
**Scope:** how well the existing job-application pipeline matches the product's rules:
- apply in the user's browser
- hand off to a human on CAPTCHA, with a WhatsApp alert
- find and apply to businesses
- use only real profile data

**Method:** I read the code under `server/src` and `web/src`. The profile and form-filling paths were also run against a local server; see [How this was checked](#how-this-was-checked).

Ratings:
- **High:** breaks a core promise, or leaks data.
- **Med:** works sometimes, or gives wrong results quietly.
- **Low:** cleanup.

---

## Summary

| Area | State | Verdict |
|---|---|---|
| Finding jobs (RemoteOK, RSS, Adzuna, Greenhouse/Lever/Ashby boards) | Real | Works; narrow coverage |
| Matching | Real, simple | Works; scoring saturates quickly |
| Tailored CV / cover letter | Real (LLM) | Works |
| Form filling | Real (Playwright) | Fixed in this pass (see below); multi-page forms unsupported |
| Browser | Headless on the server | **Not the intended design** (should be a visible local browser) |
| CAPTCHA hand-off | Detects and stops | **The hand-off loop doesn't work** |
| WhatsApp alerts | Real, through several providers | **Can go to the wrong person; can report "sent" when nothing was sent** |
| Business search | UI and API only | **All results are fake, hardcoded data** |
| Outreach sequence | Stored only | **Never sends anything** |
| Profile setup | Rebuilt in this pass | Collects every backend field; saves verified end to end |

---

## Fixed in this pass

These depended directly on profile data, so they were in scope:

1. **The setup save failed silently.**
   - **Problem:** the old page spread stale context state into `PUT /profile`. An empty `address` or `email: ''` failed validation, the 400 was swallowed, and the user landed on `/dash` with nothing saved.
   - **Fix:** the new 9-step wizard (`web/src/pages/profile-setup/`) saves each step's own fields and blocks the step on errors. It finishes through `POST /profile/verify`.
2. **The form-filler invented legal answers.**
   - **Problem:** schema defaults (`workAuthorization='authorized'`, `requiresSponsorship=false`, `yearsOfExperience=0`, `highestEducationLevel='bachelor'`, `noticePeriod='2 weeks'`) were typed into real applications as if the user had said them.
   - **Fix:** those defaults are removed. Any unanswered question now becomes a "needs you" task.
3. **Select and radio fields failed.**
   - **Problem:** exact label matching meant `bachelor` never matched "Bachelor's Degree", and `not_veteran` never matched "I am not a protected veteran".
   - **Fix:** `matchOption()` in `server/src/adapters/form.adapter.ts` maps profile values to option text. Yes/No radio groups are answered from the profile too.
4. **Label patterns never matched.** `^country`, `^state` and `^name` were tested against `"<label> <name>"`, so `name="country"` was missed. The label and the name are now tested separately.
5. **"Years of X" questions** are now answered from per-skill years (`skills[].years`), which replaced the 1-10 rating the backend was throwing away.
6. **A CV upload wiped data.** The rule-based parser returns empty experience and education, and the upload overwrote the profile with them. Uploads now merge and never erase.
7. **Every new user got someone else's profile in in-memory mode.** `memoryDb` cloned the "Alex Okafor" demo profile for any unknown user. New users now start empty.
8. **The dashboard card invented a person.** `ProfileDrawerCard` showed "Oxford University", demo jobs, demo skills and fake "8 Mos" durations whenever a section was empty. It now shows only real data, or an "Add" prompt.
9. **New taxonomy endpoints:**
   - `GET /taxonomy/skills/catalog` (searchable, with categories and aliases)
   - `GET /taxonomy/fields` (job fields → roles, plus industries)
   - `GET /taxonomy/skills?roles=a,b` (suggestions across several roles)

   Missing-option requests are now stored in MongoDB (they used to be kept in memory).
10. **Bad files.** An unreadable CV returned a 500 and was still written to disk. It now returns a 422 with a readable message, and only readable files are stored.

---

## Update, 19 Nov: live browser, WhatsApp replies, link intake

| Finding | Status |
|---|---|
| H1 alerts to the wrong person | **Fixed.** Alerts only go to the user's own profile phone; no global fallback. |
| H2 committed secret | **Removed** from `env.ts` and `.env.example`. **The key still needs rotating** (it's in git history). |
| H3 visible local browser | **Built.** See `server/src/lib/liveBrowser.ts` and `server/src/adapters/live/session.ts`. |
| H4 CAPTCHA retry loop | **Fixed.** The live session waits on the same page and continues once the CAPTCHA clears. |
| H5 WhatsApp send-only | **Fixed.** One-tap reply link (`/r/:token`) for every provider, plus a Twilio inbound webhook. |
| M1 "simulated" counted as sent | **Fixed.** Returns `sent: false`. |
| M2 provider ignored | **Fixed.** The configured provider wins; send-only providers are skipped when Twilio or Cloud API is chosen. |
| M3 dashboard link keys | **Fixed** (`openUrl` / `jobTitle`). |
| M5 multi-step / iframe / "Apply" button | **Mostly fixed** in live mode: clicks through "Apply", follows multi-page forms, looks inside ATS iframes. Workday-specific widgets are still untested. |
| M6 loose form check | **Fixed** in live mode (needs a file input, or name + email). |
| M9 imported links | **Fixed for link lists:** a sheet or CSV of links goes through `POST /jobs/links`. Rows with titles but no link still get placeholder URLs. |

How the live session works (one tab per application):
1. **Pause on a CAPTCHA:** WhatsApp the user, then continue on its own once it clears.
2. **Sign-in walls:**
   - "Continue with Google" picks the profile's Google account.
   - Otherwise it creates an account with a generated password, stored encrypted per site.
   - It asks for the verification code (or reads it from Gmail if `GMAIL_READ_CODES=true`).
3. **Get to the form:** click "Apply" to reach it.
4. **Fill and ask:** fill from the profile; ask about unknown fields in one message, with LLM-drafted suggestions for open-ended questions. Answers are saved for next time.
5. **Submit:** submit or go to the next page, repeating until a confirmation page shows.
6. **If nobody answers within `LIVE_WAIT_MINUTES`,** the application parks as "needs you" with the tab left open.

Tested by `npm run test:live` (a mock site covering sign-up, the code, two questions, a CAPTCHA and a two-page submit; 20 checks).

## Update, 21 Nov: Business Mode round 1 and safety fixes

| Finding | Status |
|---|---|
| H6 business search was fake | **Fixed:** real OpenStreetMap leads, CSV import and manual add, plus a real website audit. See [BUSINESS_MODE.md](BUSINESS_MODE.md). |
| H7 outreach never sent | **Removed:** the fake sequence endpoints are gone. The real sequence is round 2; until then you send the first message yourself. |
| H8 test pipeline lied | **Fixed:** `/api/test/*` exist only with `ENABLE_TEST_ROUTES=true` outside production, and the demo pipeline no longer sends a "submitted" WhatsApp. |
| Auto mode before 10 approvals | **Fixed:** enforced on every profile update and again in the generate worker; locked in onboarding. |
| Delete/export gaps | **Fixed:** site accounts (never passwords in exports), business leads and the services profile are included. |
| Dry-run before submitting | **Added** (`FORM_DRY_RUN_FIRST`, default 3). |
| Job feed invented scores | **Fixed:** shows the real match score and reasons, or "Not scored for you yet". Shows the real salary currency and a Remote OK credit link. |
| New sources | Workable and SmartRecruiters board APIs. |

## Open findings

### High

**H1. WhatsApp alerts can go to the wrong person.**
- `sendWhatsAppAlert` (`server/src/services/whatsapp.service.ts`) falls back to `env.WHATSAPP_TO` whenever a user has no phone.
- It also uses that fallback for **every** user while running on the in-memory DB, because it only looks up the profile when `readyState === 1`.
- `WHATSAPP_TO` defaults to a real number hardcoded in `server/src/config/env.ts`. One person can therefore receive other users' job and task details.

*Fix:*
- Remove the default.
- Never fall back to a global number for a user's alert.
- Look up the phone regardless of DB mode.

**H2. A secret is committed in source.**
- `TEXTMEBOT_APIKEY` has a real-looking default in `server/src/config/env.ts`, next to the hardcoded phone number.

*Fix:*
- Rotate the key.
- Remove both defaults.
- Load them from `.env` only.

**H3. The "visible local browser" design isn't implemented.**
- `server/src/lib/browser.ts` launches `chromium.launch({ headless: true })` on the server.
- The user can never see the form or step into it, so "solve the CAPTCHA yourself" can only mean "go and apply manually".

*Proposed design:*
- **Local runner:** a small local process (desktop app or CLI the user installs) that pulls apply jobs for that user from the API.
- **Persistent browser:** it runs Playwright with `chromium.launchPersistentContext(userDataDir, { headless: false })`, so cookies and logins survive between runs.
- **On CAPTCHA, login wall or unknown question:**
  - leave the page open
  - post a `needs_user` task, which sends the WhatsApp alert
  - poll the task (or keep a socket open)
- **Resume:** when the user marks it done, or answers on WhatsApp (see H5), continue in the **same page**. Don't re-queue a fresh headless run.
- **Re-check after submit:** run the CAPTCHA check again after clicking submit. Many forms only challenge on submit.

**H4. The CAPTCHA retry loops forever.**
- `retryTask` re-queues the same headless job in a fresh browser context.
- A CAPTCHA the user solved somewhere else doesn't carry over, so the retry hits the same CAPTCHA.

*Fix:* this is solved by H3. Until then, retrying a `captcha` task should just mark it `assisted` and stop.

**H5. WhatsApp is send-only.**
- `.env` defines `WHATSAPP_VERIFY_TOKEN`, but there is no webhook route, so the user can't reply.

*Fix:*
- Add `POST /webhooks/whatsapp` (Meta Cloud API or Twilio).
- Map a reply such as `DONE 4821` or `ANSWER 4821 <text>` to `/tasks/:id/done` or `/tasks/:id/answer`.

**H6. Business search is entirely fake.**
- `searchNearby` (`server/src/services/business.service.ts`) builds four made-up businesses from the query string ("<query> Innovation Lab" and so on).
- Their websites, socials, emails and phone numbers are invented, and the "needs us" flag is hardcoded.
- Results are cached in Redis and upserted by `{userId, name}`, so the fake leads build up over time.

*Proposed design:*
1. **Find businesses:** Google Places Text Search, or OpenStreetMap Overpass (free), using the user's location and query.
2. **Read each website:** fetch the homepage plus `/contact`, `/careers`, `/about`. Pull out `instagram.com/…`, `linkedin.com/company/…`, `x.com/…`, `mailto:`, `wa.me/…`, any contact form, and any ATS link.
3. **Choose how to apply**, in this order:
   - a careers page or ATS → the job pipeline
   - a published hiring or contact email → the email adapter
   - a contact form → the form adapter
   - WhatsApp Business or Instagram DM → an *assisted* task (the user sends it; automated DMs get accounts banned)
4. **Score "needs us"** from real signals, such as no website, an out-of-date site, or an inactive Instagram. Don't use a constant.

**H7. The outreach sequence never sends.**
- `startSequence` only flips `sequence[0].status` to `'sent'`, and no worker processes the sequence.
- The UI reports outreach that never happened.

*Fix:* add a BullMQ worker that runs each step through the existing email adapter and the safety checks.

**H8. The test pipeline lies.**
- `server/src/services/documents/tailorPipeline.ts` (used by `/test/stripe-tailored-apply`) fills a hardcoded plan: "Angelica Greeze", a fake salary, fake links.
- It then sends a WhatsApp saying the application was submitted.

*Fix:* delete it, or gate it behind `NODE_ENV=test` with a dry-run message.

### Medium

**M1. "Simulated" counts as sent.**
- When every WhatsApp provider fails, the result is `{ sent: true, channel: 'simulated' }` (`whatsapp.service.ts`).
- Callers and logs then believe the user was alerted.

*Fix:* return `sent: false`.

**M2. `WHATSAPP_PROVIDER` is ignored.**
- The TextMeBot branch also runs whenever its key exists and no other key is set.
- Other providers are then tried in turn, whatever the setting says.

*Fix:* honour the configured provider. Only fall through when it's explicitly set to `auto`.

**M3. The dashboard "open link" button never shows.**
- The backend puts the link in `payload.openUrl` and the title in `payload.jobTitle` (`form.adapter.ts`, `deliver.ts`).
- `web/src/components/dashboard/views/NeedsYouView.tsx` reads `payload.url`, `payload.pageUrl` and `payload.role`.

*Fix:* read `openUrl` and `jobTitle`.

**M4. Dismissing a task strands the application.** `dismiss` (`task.controller.ts`) closes the task but leaves the application in `needs_user` forever.

**M5. Multi-step and embedded forms aren't handled.**
- Workday or Ashby wizards, Greenhouse forms embedded in an iframe, and "Apply" buttons that lead to the real form all end up as `no_form_found`.

*Fix:*
- Follow a single obvious Apply link.
- Search `page.frames()` for the form.
- Add a Workday adapter, or route Workday to assisted.

**M6. The "is this a form?" check is loose.**
- Any page with an email input passes (`form.adapter.ts`), including newsletter sign-ups.

*Fix:* require either a file input, or both a name field and an email field.

**M7. Matching saturates.**
- Skills score = matches ÷ 6, capped at 1 (`server/src/matching/score.ts`), so anyone with 6 or more matching skills looks the same.
- It ignores `primarySkills` weighting, years, seniority (`validatedLevel`) and job tags.
- Location is a raw substring match.

*Fix:*
- Weight skills: primary 1.0, secondary 0.6, tools 0.4.
- Score against the number of skills in the job's own skill list.
- Add a seniority match.
- Normalise locations with the taxonomy.

**M8. `GET /jobs` isn't per-user.** It returns every job in the database, not the user's matched or scored ones (`job.controller.ts`).

**M9. Imported jobs can't be delivered.**
- File imports create `excel://`, `csv://` and `document://` URLs. These are then routed to the form or assisted channel and fail.

*Fix:* mark them `assisted` unless a real URL or email is found.

**M10. Only the CV is uploaded.** A required cover-letter file input becomes an unknown question.

*Fix:* render the cover letter to PDF and upload it.

### Low

**L1. The job boards page overstates integrations.**
- `web/src/lib/constants.ts` `BOARDS` labels LinkedIn, Indeed, Glassdoor, Wellfound, ZipRecruiter and Workday as "Live".
- None of them is integrated.

**L2. Redis is required.**
- Queues and the daily cap need Redis, but `.env` has no `REDIS_URL`.
- The in-memory DB mode doesn't stub the queues.

**L3. Test routes skip error handling.** `routes/test.routes.ts` handlers aren't wrapped in `asyncHandler`, so a thrown error never reaches the error middleware.

**L4. More dashboard placeholders.**
- The dashboard still shows a stock avatar when the user has no photo.
- It always shows a hardcoded "Available For Work" badge. That badge could be derived from `noticePeriod` / `earliestStartDate`.

**L5. Profile fields the setup still doesn't collect, by design:**
- `answerBank`: it fills up from answered tasks.
- `cv`: set by the server.
- `status`: set only by `/verify`.
- The old "WhatsApp alerts" checkbox had no backend field and was removed. Alerts go to the profile phone.

---

## Suggested order

1. **H1 and H2** today: a privacy leak and a leaked secret, both small fixes.
2. **M1, M3 and H8:** small changes that stop the app reporting things that didn't happen.
3. **H3, H4 and H5:** the local-browser runner and the WhatsApp reply loop. This is the core promise and the largest piece of work.
4. **H6 and H7:** real business discovery and sending.
5. **M5–M10, then the Low items.**

---

## How this was checked

- **`npm run test:profile`** (`server/src/scripts/testProfileSetup.ts`): 24 HTTP checks against the in-memory DB.
  - the taxonomy endpoints
  - an empty-profile start
  - blank address and email accepted
  - `status` can't be set through PUT
  - a 48-field round-trip
  - `/verify` gating
  - CV merge, plus the 422 for a broken file

  Pass a PDF or DOCX path to include the CV checks.
- **Form-filler unit checks** (run as a script):
  - unset legal fields → unanswered
  - `bachelor` → "Bachelor's Degree"
  - `veteran` / `not_veteran` choose the right options
  - "years with React" → 4
  - a Yes/No radio group answered from the profile
- **Browser run:** headless Chromium against the Vite dev server and the API (in-memory DB) went through all 9 setup steps.
  - It uploaded a CV.
  - It reloaded at step 5; data and step were kept.
  - It verified and reached `/dash` with no console errors.
- **Not run:** live applications to real career sites, and real WhatsApp sends.
