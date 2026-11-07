import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execSync } from 'node:child_process';
import { chromium, type Browser, type Page } from 'playwright';

// Real module imports
import { findFormFrame, clickApply, submitAndConfirm } from '../src/worker/site.js';
import { fillForm } from '../src/worker/fill.js';
import { readSingleInput } from '../src/intake/read.js';
import { buildLeads } from '../src/intake/leads.js';
import { scanListing } from '../src/intake/listing.js';
import { draftEmail } from '../src/ai.js';
import {
  getDB,
  addJobs,
  DATA_DIR,
  defaultProfile,
  defaultSettings
} from '../src/store.js';
import type { Profile, Settings, CvInfo, Job } from '../src/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.resolve(__dirname, 'fixtures');

// Ensure fixtures exist
const requiredFixtures = [
  'jobs.xlsx',
  'jobs.csv',
  'jobs.docx',
  'jobs.pdf',
  'listing.html',
  'listing-2.html',
  'form.html',
  'job.html'
];

for (const f of requiredFixtures) {
  if (!fs.existsSync(path.join(fixturesDir, f))) {
    console.log('Generating missing fixtures...');
    execSync(`npx tsx "${path.join(__dirname, 'make-fixtures.ts')}"`, {
      stdio: 'inherit'
    });
    break;
  }
}

// 1. Setup fake CV
const fakeCvPath = path.join(os.tmpdir(), `selftest-cv-${Date.now()}.pdf`);
fs.writeFileSync(
  fakeCvPath,
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000053 00000 n \n0000000102 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF\n'
);

// 2. Setup environment
process.env.ANTHROPIC_API_KEY = 'selftest';
delete process.env.OPENROUTER_API_KEY;
delete process.env.QWEN_API_KEY;
delete process.env.DEEPSEEK_API_KEY;

// 3. Install fake globalThis.fetch
const realFetch = globalThis.fetch;
globalThis.fetch = async (
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> => {
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
      ? input.toString()
      : input.url;

  if (!url.includes('anthropic.com')) {
    return realFetch(input, init);
  }

  const bodyStr = typeof init?.body === 'string' ? init.body : '';
  let parsed: any = {};
  try {
    parsed = JSON.parse(bodyStr);
  } catch {}

  const system: string = parsed.system || '';
  const userContent = parsed.messages?.[0]?.content;
  let userText = '';
  if (Array.isArray(userContent)) {
    userText = userContent.map((c: any) => c.text || '').join('\n');
  } else if (typeof userContent === 'string') {
    userText = userContent;
  }

  let text = '';

  if (system.includes('You fill in job application forms')) {
    const marker = 'FIELDS TO ANSWER:';
    const idx = userText.indexOf(marker);
    let fields: any[] = [];
    if (idx !== -1) {
      try {
        fields = JSON.parse(userText.slice(idx + marker.length).trim());
      } catch {}
    }

    const answers = fields.map((f: any) => {
      const id = f.id;
      const label = (f.label || '').toLowerCase();
      if (id === 'clearance' || label.includes('clearance')) {
        return {
          id,
          value: null,
          needsHuman: true,
          reason: 'Not in profile or CV'
        };
      }
      if (f.options && Array.isArray(f.options) && f.options.length > 0) {
        const validOpts = f.options.filter(
          (o: any) => typeof o === 'string' && !o.toLowerCase().includes('select')
        );
        const opt = validOpts.length > 0 ? validOpts[0] : f.options[0];
        if (f.type === 'checkboxes') {
          return { id, value: [opt], needsHuman: false, reason: '' };
        }
        return { id, value: opt, needsHuman: false, reason: '' };
      }
      if (f.type === 'checkbox') {
        return { id, value: false, needsHuman: false, reason: '' };
      }
      return { id, value: 'Test answer', needsHuman: false, reason: '' };
    });

    text = JSON.stringify({ answers });
  } else if (system.includes('You read job adverts')) {
    text = JSON.stringify({ postings: [] });
  } else if (system.includes('For each link')) {
    text = JSON.stringify({ links: [] });
  } else if (system.includes('You write short job application emails')) {
    let subject = 'Application for Test Role - Test User';
    const match = userText.match(/REQUIRED SUBJECT HINT:\s*([^\n]+)/);
    if (match) {
      const hint = match[1].trim();
      if (hint && hint !== 'None') {
        const titleMatch = userText.match(/JOB TITLE:\s*([^\n]+)/);
        const title =
          titleMatch && titleMatch[1].trim() !== 'Not specified'
            ? titleMatch[1].trim()
            : 'Test Role';
        subject = hint.replace(/<job title>|<position>|<role>/gi, title);
      }
    }
    text = JSON.stringify({
      subject,
      body: 'Test body',
      missing: []
    });
  } else {
    text = '{}';
  }

  return new Response(
    JSON.stringify({
      content: [{ type: 'text', text }]
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
};

// Test runner helper
async function check(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`PASS  ${name}`);
  } catch (err: any) {
    console.log(`FAIL  ${name}`);
    console.error(`      ${err?.message || err}`);
    process.exitCode = 1;
  }
}

// Backup db.json to restore later
const dbPath = path.join(DATA_DIR, 'db.json');
let dbBackup: string | null = null;
if (fs.existsSync(dbPath)) {
  try {
    dbBackup = fs.readFileSync(dbPath, 'utf-8');
  } catch {}
}

async function runAll() {
  let browser: Browser | null = null;
  let page: Page | null = null;
  let formPage: Page | null = null;
  let fillResult: any = null;

  const profile: Profile = {
    ...defaultProfile,
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    phone: '+2348012345678',
    workAuthorization: 'yes',
    needsSponsorship: 'no'
  };

  const settings: Settings = {
    ...defaultSettings,
    reviewBeforeSubmit: false,
    allowConsentBoxes: true
  };

  const cv: CvInfo = {
    path: fakeCvPath,
    fileName: 'fake-cv.pdf',
    uploadedAt: new Date().toISOString(),
    text: 'Ada Lovelace CV: Software Engineer with 5 years experience.'
  };

  try {
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();

    console.log('Forms');

    // 1 ignores the newsletter box on the job description
    await check('ignores the newsletter box on the job description', async () => {
      const jobUrl = pathToFileURL(path.join(fixturesDir, 'job.html')).href;
      await page!.goto(jobUrl, { waitUntil: 'domcontentloaded' });
      const form = await findFormFrame(page!);
      assert.strictEqual(
        form,
        null,
        'Expected newsletter form (1 field) to be ignored'
      );
    });

    // 2 follows "Apply now" to the real form
    await check('follows "Apply now" to the real form', async () => {
      const targetPage = await clickApply(page!);
      assert(targetPage !== null, 'Expected clickApply to return a page');
      formPage = targetPage;
      assert(
        formPage.url().includes('form.html'),
        `Expected navigation to form.html, got ${formPage.url()}`
      );
      const form = await findFormFrame(formPage);
      assert(form !== null, 'Expected to find form frame on form.html');
      assert(form.count >= 5, `Expected count >= 5, got ${form.count}`);
    });

    // Run fillForm once on the real form for checks 3-8
    const form = await findFormFrame(formPage!);
    assert(form !== null, 'Form frame must be found for filling');
    fillResult = await fillForm({
      page: formPage!,
      frame: form.frame,
      profile,
      settings,
      cv,
      source: formPage!.url()
    });

    // 3 fills name and email from the profile
    await check('fills name and email from the profile', async () => {
      const firstName = await formPage!.locator('#first-name').inputValue();
      const lastName = await formPage!.locator('#last-name').inputValue();
      const email = await formPage!.locator('input[type="email"]').inputValue();
      assert.strictEqual(firstName, 'Ada', 'First name should be Ada');
      assert.strictEqual(lastName, 'Lovelace', 'Last name should be Lovelace');
      assert.strictEqual(
        email,
        'ada@example.com',
        'Email should be ada@example.com'
      );
    });

    // 4 attaches the CV, leaves the optional cover letter alone
    await check(
      'attaches the CV, leaves the optional cover letter alone',
      async () => {
        const resumeFiles = await formPage!
          .locator('#resume-input')
          .evaluate((el: any) => el.files.length);
        const coverFiles = await formPage!
          .locator('#cover-input')
          .evaluate((el: any) => el.files.length);
        assert.strictEqual(resumeFiles, 1, 'CV file should be attached');
        assert.strictEqual(
          coverFiles,
          0,
          'Optional cover letter should be left alone'
        );
      }
    );

    // 5 answers dropdowns and radio buttons
    await check('answers dropdowns and radio buttons', async () => {
      const selectVal = await formPage!.locator('#auth-select').inputValue();
      assert(
        selectVal !== '' && selectVal !== 'Select...',
        `Dropdown should have an option selected, got "${selectVal}"`
      );

      const radioChecked = await formPage!
        .locator('input[name="visa_sponsorship"]:checked')
        .count();
      assert.strictEqual(radioChecked, 1, 'One radio button should be checked');
    });

    // 6 picks from a custom search dropdown
    await check('picks from a custom search dropdown', async () => {
      const comboVal = await formPage!
        .locator('#source-combobox')
        .inputValue();
      assert(
        comboVal.length > 0,
        `Custom search dropdown should have a value selected, got "${comboVal}"`
      );
    });

    // 7 ticks the consent box
    await check('ticks the consent box', async () => {
      const isConsentChecked = await formPage!
        .locator('#privacy-agree')
        .isChecked();
      assert.strictEqual(
        isConsentChecked,
        true,
        'Consent checkbox should be checked'
      );
    });

    // 8 hands back a question it can't answer from your info
    await check(
      "hands back a question it can't answer from your info",
      async () => {
        const flagged = fillResult.flagged || [];
        const clearanceFlag = flagged.find(
          (f: any) =>
            (f.label && f.label.toLowerCase().includes('clearance')) ||
            (f.reason && f.reason.toLowerCase().includes('not in profile'))
        );
        assert(
          clearanceFlag,
          'Clearance question should be flagged for human review'
        );
        assert.strictEqual(
          clearanceFlag.required,
          true,
          'Flagged clearance question should be marked required'
        );
      }
    );

    // 9 submits and sees the confirmation (fill the clearance field with "No" first)
    await check('submits and sees the confirmation', async () => {
      await formPage!.locator('#clearance').fill('No');
      const submitRes = await submitAndConfirm(formPage!);
      assert.strictEqual(
        submitRes,
        'confirmed',
        `Expected confirmed, got ${submitRes}`
      );
    });

    console.log('Intake');

    // 10 reads the hidden link in a PDF (the Workable link in jobs.pdf)
    await check(
      'reads the hidden link in a PDF (the Workable link in jobs.pdf)',
      async () => {
        const pdfBuf = fs.readFileSync(path.join(fixturesDir, 'jobs.pdf'));
        const mat = await readSingleInput('jobs.pdf', pdfBuf, 'jobs.pdf');
        const hasWorkable = mat.links.some((l) =>
          l.url.includes('apply.workable.com/acme/j/ABC123/')
        );
        assert(
          hasWorkable,
          'Raw material should include the hidden Workable link'
        );

        const { leads } = await buildLeads({
          materials: [mat],
          existingJobs: []
        });
        const workableLead = leads.find(
          (l) => l.url && l.url.includes('apply.workable.com/acme/j/ABC123/')
        );
        assert(workableLead, 'Lead should be created for Workable link');
        assert.strictEqual(workableLead.verdict, 'job');
      }
    );

    // 11 reads hyperlinks in a Word file (jobs.docx)
    await check('reads hyperlinks in a Word file (jobs.docx)', async () => {
      const docxBuf = fs.readFileSync(path.join(fixturesDir, 'jobs.docx'));
      const mat = await readSingleInput('jobs.docx', docxBuf, 'jobs.docx');
      const hasHyperlink = mat.links.some((l) =>
        l.url.includes('careers.example.com/jobs/data-analyst-77')
      );
      assert(
        hasHyperlink,
        'Word raw material should include hyperlink from .docx'
      );

      const { leads } = await buildLeads({
        materials: [mat],
        existingJobs: []
      });
      const docxLead = leads.find(
        (l) =>
          l.url && l.url.includes('careers.example.com/jobs/data-analyst-77')
      );
      assert(docxLead, 'Lead should be created for docx hyperlink');
    });

    // 12 turns spreadsheet rows into link and email leads (jobs.xlsx: 2 links, 1 email, 1 empty row reported)
    await check(
      'turns spreadsheet rows into link and email leads',
      async () => {
        const xlsxBuf = fs.readFileSync(path.join(fixturesDir, 'jobs.xlsx'));
        const mat = await readSingleInput('jobs.xlsx', xlsxBuf, 'jobs.xlsx');
        const { leads, warnings } = await buildLeads({
          materials: [mat],
          existingJobs: []
        });

        const linkLeads = leads.filter((l) => l.kind === 'url');
        const emailLeads = leads.filter((l) => l.kind === 'email');

        assert.strictEqual(linkLeads.length, 2, 'Should have 2 link leads');
        assert.strictEqual(emailLeads.length, 1, 'Should have 1 email lead');
        const hasWarning = warnings.some(
          (w) =>
            w.includes('Rows without a link or email: 1') ||
            (w.includes('without a link') && w.includes('1'))
        );
        assert(hasWarning, 'Should report 1 empty row without a link or email');
      }
    );

    // 13 reads the same jobs from CSV (jobs.csv)
    await check('reads the same jobs from CSV (jobs.csv)', async () => {
      const csvBuf = fs.readFileSync(path.join(fixturesDir, 'jobs.csv'));
      const mat = await readSingleInput('jobs.csv', csvBuf, 'jobs.csv');
      const { leads, warnings } = await buildLeads({
        materials: [mat],
        existingJobs: []
      });

      const linkLeads = leads.filter((l) => l.kind === 'url');
      const emailLeads = leads.filter((l) => l.kind === 'email');

      assert.strictEqual(linkLeads.length, 2, 'CSV: Should have 2 link leads');
      assert.strictEqual(emailLeads.length, 1, 'CSV: Should have 1 email lead');
      const hasWarning = warnings.some(
        (w) =>
          w.includes('Rows without a link or email: 1') ||
          (w.includes('without a link') && w.includes('1'))
      );
      assert(
        hasWarning,
        'CSV: Should report 1 empty row without a link or email'
      );
    });

    // 14 finds email applications and their subject instructions (jobs.docx and jobs.pdf)
    await check(
      'finds email applications and their subject instructions',
      async () => {
        const docxBuf = fs.readFileSync(path.join(fixturesDir, 'jobs.docx'));
        const docxMat = await readSingleInput('jobs.docx', docxBuf, 'jobs.docx');
        const { leads: docxLeads } = await buildLeads({
          materials: [docxMat],
          existingJobs: []
        });
        const docxEmail = docxLeads.find(
          (l) => l.kind === 'email' && l.email === 'recruit@example.org'
        );
        assert(docxEmail, 'jobs.docx should find recruit@example.org');
        assert.strictEqual(
          docxEmail.subjectHint,
          'Data Analyst - Abuja',
          'jobs.docx should extract subjectHint "Data Analyst - Abuja"'
        );

        const pdfBuf = fs.readFileSync(path.join(fixturesDir, 'jobs.pdf'));
        const pdfMat = await readSingleInput('jobs.pdf', pdfBuf, 'jobs.pdf');
        const { leads: pdfLeads } = await buildLeads({
          materials: [pdfMat],
          existingJobs: []
        });
        const pdfEmail = pdfLeads.find(
          (l) => l.kind === 'email' && l.email === 'jobs@example.com'
        );
        assert(pdfEmail, 'jobs.pdf should find jobs@example.com');
        assert.strictEqual(
          pdfEmail.subjectHint,
          '<job title>',
          'jobs.pdf should extract subjectHint "<job title>"'
        );
      }
    );

    // 15 leaves social and unsubscribe links unselected
    await check(
      'leaves social and unsubscribe links unselected',
      async () => {
        const pdfBuf = fs.readFileSync(path.join(fixturesDir, 'jobs.pdf'));
        const pdfMat = await readSingleInput('jobs.pdf', pdfBuf, 'jobs.pdf');
        const { leads } = await buildLeads({
          materials: [pdfMat],
          existingJobs: []
        });

        const fbLead = leads.find(
          (l) => l.url && l.url.includes('facebook.com')
        );
        const unsubLead = leads.find(
          (l) => l.url && l.url.includes('unsubscribe')
        );

        assert(fbLead, 'Facebook link should be parsed as a lead');
        assert.strictEqual(
          fbLead.selected,
          false,
          'Facebook link should be unselected'
        );
        assert(unsubLead, 'Unsubscribe link should be parsed as a lead');
        assert.strictEqual(
          unsubLead.selected,
          false,
          'Unsubscribe link should be unselected'
        );
      }
    );

    // 16 scans a two-page job list and finds all 11 jobs
    await check(
      'scans a two-page job list and finds all 11 jobs',
      async () => {
        const listing1Url = pathToFileURL(
          path.join(fixturesDir, 'listing.html')
        ).href;
        const { leads: scanLeads } = await scanListing(listing1Url);
        assert.strictEqual(
          scanLeads.length,
          11,
          `Expected 11 jobs across both pages, got ${scanLeads.length}`
        );
      }
    );

    // 17 doesn't queue the same job twice
    await check("doesn't queue the same job twice", async () => {
      const testJob: Partial<Job> & { kind: 'form' } = {
        kind: 'form',
        url: `https://jobs.lever.co/selftest/test-role-${Date.now()}`,
        title: 'Senior QA Engineer',
        status: 'queued'
      };

      const res1 = addJobs([testJob]);
      assert.strictEqual(res1.added.length, 1, 'First add should succeed');

      const res2 = addJobs([testJob]);
      assert.strictEqual(
        res2.duplicates,
        1,
        'Second add should be recognized as duplicate'
      );
      assert.strictEqual(
        res2.added.length,
        0,
        'Duplicate job should not be added'
      );
    });

    // 18 drafts an email with the advert's required subject
    await check(
      "drafts an email with the advert's required subject",
      async () => {
        const draft = await draftEmail({
          profile,
          cvText: cv.text,
          title: 'Data Analyst',
          company: 'Example Org',
          subjectHint: 'Data Analyst - Abuja',
          postingText:
            'Send your CV to recruit@example.org with the subject "Data Analyst - Abuja"'
        });

        assert.strictEqual(
          draft.subject,
          'Data Analyst - Abuja',
          `Expected subject "Data Analyst - Abuja", got "${draft.subject}"`
        );
      }
    );
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
    // Clean up fake CV
    try {
      if (fs.existsSync(fakeCvPath)) {
        fs.unlinkSync(fakeCvPath);
      }
    } catch {}

    // Restore DB backup
    if (dbBackup !== null) {
      try {
        fs.writeFileSync(dbPath, dbBackup, 'utf-8');
      } catch {}
    }
  }
}

runAll().catch((err) => {
  console.error('Fatal selftest error:', err);
  process.exit(1);
});
