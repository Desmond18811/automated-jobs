# Job Autopilot

Job Autopilot is a local assistant that fills out job application forms and drafts application emails on your behalf using your profile, CV, and LLMs (Anthropic Claude, Qwen, or DeepSeek). It keeps your login sessions, browser history, and application records entirely on your machine while pausing whenever human input, verification, or a CAPTCHA is required.

---

## 1. Setup

Run the following commands in the project root:

```bash
# 1. Install dependencies and Playwright browser binaries
npm run setup

# 2. Copy the environment template
cp server/.env.example server/.env

# 3. Run the end-to-end pipeline self-test
npm --prefix server run selftest

# 4. Start the server and web dashboard together
npm run dev
```

The web dashboard runs at `http://localhost:5173` and the backend server runs at `http://localhost:4000`.

> [!TIP]
> If Playwright's headless Chromium download fails on your machine or network, set `BROWSER_CHANNEL=chrome` in `server/.env` to use your locally installed Google Chrome browser instead.

---

## 2. Adding Jobs

Job Autopilot supports flexible intake from multiple sources:
- **Direct Links**: Paste individual URLs to job adverts or career postings into the intake box.
- **Listing Pages**: Check *"These are pages listing many jobs"* to crawl career indices and job boards across paginated result pages.
- **Public Google Docs & Google Sheets**: Paste a public Google Drive/Docs/Sheets URL; the intake engine automatically exports and parses rows or document text.
- **File Uploads**: Drop files into the upload zone or choose them via the file picker. Supported formats include:
  - PDFs (`.pdf`)
  - Microsoft Word documents (`.docx`, `.doc`)
  - Spreadsheets (`.xlsx`, `.xls`, `.ods`, `.csv`)
  - Plain text and markdown (`.txt`, `.md`, `.json`, `.html`, `.htm`)
  - Flyer images (`.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`)

### The Review Step
Every intake batch goes to a **Review what was found** staging section before entering your queue:
- **Apply by link**: Verified job application pages.
- **Apply by email**: Roles requesting CV submission to an email address (with extracted subject line hints).
- **Other links**: Ambiguous or external references (collapsed by default).
- **Can't be queued**: Job listings requiring custom offline instructions.
- **Visual Flyers**: Any email address or link read from an uploaded flyer image is explicitly marked with *"check this address"* so you can double-check the OCR before queuing.
- Duplicates already present in your active queue are greyed out and marked *"Already in your queue"*.

---

## 3. Using the System

### Your CV
Upload your CV using the **Upload CV** button in the left sidebar.
- Supported file formats: text-based PDF or Word (`.docx`).
- Best practice: Name your file cleanly, e.g., `Firstname-Lastname-CV.pdf`.

### Candidate Profile
Fill out the comprehensive candidate profile in the left sidebar:
- **Contact**: Name, email, phone (with country code, e.g., `+234 814 000 0000`), street address, city, state/province, postal code, country, and social/portfolio links (LinkedIn, GitHub, Twitter/X, portfolio website).
- **Work**: Current job title, current company/employer, years of experience, notice period, earliest start date, salary expectation (e.g., `₦900,000 per month`), work style preference (Remote, Hybrid, On-site), and key technical/professional skills.
- **Education**: Highest degree level, school/university, field of study/major, and graduation year.
- **Eligibility**: Authorized work locations, visa sponsorship requirements, and relocation willingness.
- **Demographics & EEO**: Pronouns, gender, race/ethnicity, veteran status, disability status, spoken languages, and referral source.
- **Facts AI may use**: A free-form context box for certifications, specific career stories, and background details. Anything not found in your profile or CV is flagged and handed back to you rather than guessed or invented.

Click **Save profile** to persist your profile data.

### Controls & Actions
Once setup is complete, click **Start applying** in the top header. When the runner pauses for user review, the following actions appear depending on context:
- **Submit**: Submits the filled application form and waits for confirmation.
- **Retry / Redraft**: Re-runs the form inspection and filling logic, or regenerates an email draft using Claude.
- **I applied**: Manually marks the job as applied if you submitted or emailed it yourself.
- **Skip**: Skips the role and moves to the next job in your queue.
- **Scan for jobs**: Triggers a listing scan if an intake link turned out to be an index page instead of an individual form.
- **Draft email**: Prepares an application email draft for listings that require email applications.
- **Send email**: Dispatches the drafted application email with your CV attached via SMTP.

---

## 4. Review Mode

By default, **"Let me check each form before it's submitted"** (`reviewBeforeSubmit: true`) is enabled under *How it behaves*.

- **When enabled**: The runner opens the form, fills every field it can, and pauses in `review` status with a screenshot for your final approval before submitting.
- **When to turn it off**: Once you trust the engine's answers on standard ATS platforms (such as Greenhouse, Lever, and Ashby), you can uncheck this box. The engine will then automatically submit completed forms that have no missing required fields and no CAPTCHAs.

---

## 5. What It Handles

- **Modern ATS Platforms**: Native support for Greenhouse, Lever, Ashby, Workable, SmartRecruiters, and custom company sites, including forms embedded in `<iframe>` elements.
- **Job Boards**: Jobberman, MyJobMag, Indeed, Glassdoor, and others. Logins and cookies are persisted in `server/data/browser-profile`, so you only need to sign in once.
- **Email Roles**: Automatically detects "send your CV to..." listings, moves them to email applications, drafts tailored cover notes, and extracts subject hints.
- **Workday**: Pauses when authentication is needed, allowing you to sign in and click "Next" between multi-step wizard pages.
- **LinkedIn**: Kept strictly manual to safeguard your account against automated bot restrictions. The runner opens the job page and asks you to apply.
- **CAPTCHAs**: Automatically pauses, notifies you, and brings the browser window forward so you can complete the challenge.

---

## 6. Email Setup

For jobs that accept applications via email:
1. Configure your SMTP provider in `server/.env`:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=xxxx-xxxx-xxxx-xxxx
   SMTP_FROM="Your Name <your_email@gmail.com>"
   ```
2. **Gmail App Passwords**: If using Gmail, turn on 2-Step Verification and generate an **App Password** under your Google Account security settings. Never use your main account password.
3. **Safe Testing (`MAIL_REDIRECT_TO`)**: When set, all outgoing application emails are redirected to this test address, with subjects prefixed by `[TEST to <real address>]`.
4. **Hourly Rate Limit**: Configurable via `maxEmailsPerHour` (default 10) in settings to protect your email account's reputation.
5. **Desktop Client Fallback**: If SMTP is not configured, click **Open in mail app** on any email job card to open a prefilled `mailto:` link in your default email client.

---

## 7. WhatsApp Alerts & Interactive Replies

Receive real-time alerts when a job needs your attention or when the queue completes.

### Supported Providers
Configure in `server/.env`:
- **CallMeBot** (free & simple):
  ```env
  WHATSAPP_PROVIDER=callmebot
  WHATSAPP_TO=2348012345678
  CALLMEBOT_APIKEY=your_callmebot_key
  ```
- **Meta Cloud API** (official WhatsApp Business API):
  ```env
  WHATSAPP_PROVIDER=cloudapi
  WHATSAPP_TO=2348012345678
  WHATSAPP_TOKEN=your_system_user_token
  WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
  WHATSAPP_GRAPH_VERSION=v21.0
  WHATSAPP_TEMPLATE=job_needs_you
  WHATSAPP_TEMPLATE_LANG=en
  ```

### Interactive Replies (Cloud API)
Control the queue directly by replying to WhatsApp messages:
- `status`: Check runner status and queue counts.
- `retry`: Re-inspect and re-fill the waiting form.
- `submit`: Submit the waiting form (if in review mode).
- `done`: Mark the role as applied.
- `skip`: Skip the current job.
- `start`: Start the runner.
- `stop`: Stop the runner.

To enable the webhook:
1. Set `WHATSAPP_VERIFY_TOKEN` and `WHATSAPP_APP_SECRET` in `server/.env`.
2. Start the tunnel: `cloudflared tunnel --url http://localhost:4100`.
3. In Meta's App Dashboard under **WhatsApp → Configuration**, enter your tunnel callback URL (`https://.../webhooks/whatsapp`), verify token, and subscribe to `messages`.

---

## 8. Exporting Queue Data

Download your current job application records at any time from the dashboard header:
- **Download Excel**: Exports full job metadata, URLs, application emails, status, and timestamps to `.xlsx`.
- **Download CSV**: Standard CSV export compatible with spreadsheets and database tools.

---

## 9. File Map

```text
├── package.json               # Root workspace scripts (setup, dev)
├── server/
│   ├── .env.example           # Environment template with documentation
│   ├── package.json           # Node ESM server configuration
│   ├── tsconfig.json          # Server TypeScript settings
│   ├── data/                  # Local state storage (gitignored)
│   │   ├── db.json            # Atomic database store
│   │   ├── cv/                # Stored CV file
│   │   ├── screenshots/       # Application screenshots
│   │   └── browser-profile/   # Persistent Chromium profile and cookies
│   ├── src/
│   │   ├── index.ts           # Express API server (port 4000)
│   │   ├── types.ts           # Shared TypeScript interfaces
│   │   ├── store.ts           # JSON database and deduplication logic
│   │   ├── cv.ts              # CV extraction and normalization
│   │   ├── ai.ts              # Claude, Qwen, and DeepSeek client adapters
│   │   ├── mail.ts            # Nodemailer transport and validation
│   │   ├── webhook.ts         # WhatsApp Cloud API interactive webhook (port 4100)
│   │   ├── files/             # Document parsers (PDF, DOCX, XLSX/CSV)
│   │   ├── intake/            # Job intake, lead building, and listing scanner
│   │   ├── notify/            # WhatsApp providers and alert state machine
│   │   └── worker/            # Playwright automation, form inspection, and queue runner
│   └── test/                  # Test fixtures and self-test suite
└── web/
    ├── index.html             # Single-page app HTML with Atkinson Hyperlegible font
    ├── package.json           # React 18 + Vite frontend configuration
    ├── vite.config.ts         # Vite dev server and API proxy
    └── src/
        ├── main.tsx           # React entry point
        ├── App.tsx            # Main application dashboard
        ├── api.ts             # Type-safe API client
        ├── types.ts           # Frontend mirror of backend types
        └── styles.css         # Plain CSS with dark-mode support
```

---

## 10. Privacy & Security

- **Local Storage**: Your CV, persistent browser profiles, session cookies, database entries (`db.json`), and screenshots stay entirely on your local machine in `server/data`.
- **AI Processing**: Only extracted CV text, candidate profile fields, and untrusted job page text/flyers are transmitted to the Claude, Qwen, or DeepSeek API to parse forms and answer questions.
- **Email Delivery**: Application emails are sent directly through your own configured SMTP credentials.
- **Notifications**: Only concise status alerts (job title, one-sentence reason, and dashboard URL) are dispatched via WhatsApp. Raw CV text, profile details, and form fields are never sent over notification channels.
