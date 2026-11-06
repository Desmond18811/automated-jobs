import path from 'node:path';
import crypto from 'node:crypto';
import { chromium, type BrowserContext, type Page } from 'playwright';
import {
  DATA_DIR,
  SHOTS_DIR,
  getDB,
  updateJob,
  addIntakeBatch
} from '../store.js';
import type { Job, Decision, Flag, IntakeBatch } from '../types.js';
import {
  hostOf,
  settle,
  detectSite,
  openForm,
  findFormFrame,
  clickApply,
  hasLoginWall,
  hasVisibleCaptcha,
  findApplyEmail,
  looksLikeListing,
  submitAndConfirm
} from './site.js';
import { fillForm } from './fill.js';
import { scanListing } from '../intake/listing.js';
import { draftEmail } from '../ai.js';
import * as alerts from '../notify/alerts.js';

export class Runner {
  private running = false;
  private currentJobId: string | null = null;
  private waitingJobId: string | null = null;
  private resolveDecision: ((d: Decision | 'stop') => void) | null = null;
  private context: BrowserContext | null = null;
  private loopPromise: Promise<void> | null = null;
  private waitSeq: number = 0;
  private jobsProcessedInRun: number = 0;
  private consecutiveFormFailures: number = 0;

  public status(): {
    running: boolean;
    currentJobId: string | null;
    waitingOn: string | null;
  } {
    return {
      running: this.running,
      currentJobId: this.currentJobId,
      waitingOn: this.waitingJobId
    };
  }

  public getWaitSeq(): number {
    return this.waitSeq;
  }

  public isBusyWith(id: string): boolean {
    return this.currentJobId === id;
  }

  public start(): void {
    if (this.running) return;
    this.running = true;
    this.jobsProcessedInRun = 0;
    this.consecutiveFormFailures = 0;
    this.loopPromise = this.loop().catch((err) => {
      console.error('[Runner] Unexpected loop error:', err);
    });
  }

  public stop(): void {
    if (!this.running) return;
    this.running = false;
    alerts.clearWaitingTimer();
    if (this.resolveDecision) {
      this.resolveDecision('stop');
    }
  }

  public async decide(jobId: string, decision: Decision): Promise<boolean> {
    if (this.waitingJobId !== jobId || !this.resolveDecision) {
      return false;
    }
    alerts.clearWaitingTimer();
    this.resolveDecision(decision);
    return true;
  }

  private async getContext(): Promise<BrowserContext> {
    if (this.context) {
      try {
        // Quick health check to see if context is still alive
        this.context.pages();
        return this.context;
      } catch {
        this.context = null;
      }
    }

    const profileDir = path.join(DATA_DIR, 'browser-profile');
    const channel = process.env.BROWSER_CHANNEL || undefined;

    this.context = await chromium.launchPersistentContext(profileDir, {
      headless: false,
      channel,
      viewport: null,
      args: ['--start-maximized']
    });

    this.context.on('close', () => {
      this.context = null;
    });

    return this.context;
  }

  private async loop(): Promise<void> {
    while (this.running) {
      const db = getDB();
      const job = db.jobs.find(
        (j) => j.status === 'queued' && (j.kind === 'form' || j.kind === 'email')
      );

      if (!job) {
        await alerts.runFinished(this.jobsProcessedInRun);
        this.running = false;
        break;
      }

      if (job.kind === 'email') {
        this.currentJobId = job.id;
        this.jobsProcessedInRun++;
        try {
          await this.processEmailJob(job);
        } catch (err: any) {
          const firstLine = (err?.message || String(err))
            .split('\n')[0]
            .slice(0, 300);
          updateJob(job.id, {
            status: 'failed',
            message: firstLine,
            actions: []
          });
        } finally {
          this.currentJobId = null;
        }
        continue;
      }

      this.currentJobId = job.id;
      this.jobsProcessedInRun++;
      updateJob(job.id, {
        status: 'running',
        message: 'Opening the job page…'
      });

      try {
        await this.process(job);
        this.consecutiveFormFailures = 0;
      } catch (err: any) {
        const firstLine = (err?.message || String(err))
          .split('\n')[0]
          .slice(0, 300);
        updateJob(job.id, {
          status: 'failed',
          message: firstLine,
          actions: []
        });
        this.consecutiveFormFailures++;
        if (this.consecutiveFormFailures >= 3) {
          await alerts.notifyConsecutiveFailures(firstLine);
          this.stop();
        }
      } finally {
        this.currentJobId = null;
        this.waitingJobId = null;
      }

      if (!this.running) break;

      // Wait delayBetweenJobsSec * random(0.7 - 1.3), checking stop every 250 ms
      const delaySec = getDB().settings.delayBetweenJobsSec || 10;
      const targetMs = delaySec * 1000 * (0.7 + Math.random() * 0.6);
      const startWait = Date.now();

      while (Date.now() - startWait < targetMs && this.running) {
        await new Promise((r) => setTimeout(r, 250));
      }
    }

    this.running = false;
    this.currentJobId = null;
    this.waitingJobId = null;
  }

  private async processEmailJob(job: Job): Promise<void> {
    const db = getDB();
    const draft = await draftEmail({
      profile: db.profile,
      cvText: db.cv?.text || '',
      title: job.title,
      company: job.company,
      postingText: job.postingText,
      subjectHint: job.subjectHint
    });

    const to = job.applyEmail || '';
    const hasMissing = draft.missing && draft.missing.length > 0;
    const targetStatus = hasMissing ? 'needs_you' : 'review';
    const flagged: Flag[] = hasMissing
      ? draft.missing.map((m) => ({
          label: m,
          reason: 'The advert asks for this; add it to the draft or your profile',
          required: true
        }))
      : [];
    const message = hasMissing
      ? `Email drafted to ${to || 'the employer'}, but the advert asks for things not in your profile.`
      : `Email drafted to ${to || 'the employer'}. Check it, then click Send email.`;

    updateJob(job.id, {
      draft: {
        to,
        subject: draft.subject,
        body: draft.body
      },
      status: targetStatus,
      flagged,
      message,
      actions: ['send', 'refill', 'done', 'skip']
    });
  }

  private async process(job: Job): Promise<void> {
    if (!job.url) {
      updateJob(job.id, {
        status: 'failed',
        message: 'No URL for this job',
        actions: []
      });
      return;
    }

    const context = await this.getContext();
    const initialPages = context.pages();
    let page = await context.newPage();

    try {
      await page.goto(job.url, {
        waitUntil: 'domcontentloaded',
        timeout: 45_000
      });
      await settle(page);

      const site = detectSite(page.url());
      const pageTitle = (await page.title().catch(() => ''))
        .trim()
        .slice(0, 140);

      updateJob(job.id, {
        site,
        ...(job.title ? {} : { title: pageTitle || undefined })
      });

      if (site === 'linkedin') {
        const dec = await this.ask(job, page, {
          status: 'needs_you',
          message:
            'LinkedIn stays manual (automating it can get your account restricted). Apply in the open window, then click "I applied".',
          actions: ['done', 'skip']
        });
        await this.handleDecision(job, page, dec, site);
        return;
      }

      await openForm(page, site);

      // findAndFill loop
      await this.runFindAndFill(job, page, site);
    } finally {
      // Close every page this job opened, never the pages that existed before
      const currentPages = context.pages();
      for (const p of currentPages) {
        if (!initialPages.includes(p)) {
          await p.close().catch(() => {});
        }
      }
    }
  }

  private async runFindAndFill(
    job: Job,
    initialPage: Page,
    site: string
  ): Promise<void> {
    let page = initialPage;
    let filledFormResult: { filled: number; flagged: Flag[] } | null = null;
    let lastFoundEmail: string | null = null;

    for (let hop = 0; hop < 3; hop++) {
      // 1. Login wall check
      if (await hasLoginWall(page)) {
        const host = hostOf(page.url());
        const dec = await this.ask(job, page, {
          status: 'needs_you',
          message: `${host} wants you to sign in or create an account. Do that in the open window, then click Retry. The login is remembered next time.`,
          actions: ['refill', 'done', 'skip']
        });
        await this.handleDecision(job, page, dec, site);
        return;
      }

      // 2. Form check
      const form = await findFormFrame(page);
      if (form && (form.hasFile || form.count >= 5)) {
        const db = getDB();
        filledFormResult = await fillForm({
          page,
          frame: form.frame,
          profile: db.profile,
          settings: db.settings,
          cv: db.cv!,
          source: page.url(),
          onProgress: (m) => updateJob(job.id, { message: m })
        });
        break;
      }

      // 3. Click Apply check
      const newPage = await clickApply(page);
      if (newPage && newPage !== page) {
        page = newPage;
        continue;
      } else if (newPage === page) {
        continue;
      }

      // No apply button found anywhere
      if (form) {
        // Smaller form found (count >= 3)
        const db = getDB();
        filledFormResult = await fillForm({
          page,
          frame: form.frame,
          profile: db.profile,
          settings: db.settings,
          cv: db.cv!,
          source: page.url(),
          onProgress: (m) => updateJob(job.id, { message: m })
        });
        break;
      }

      break;
    }

    // After the hops
    if (!filledFormResult) {
      if (await looksLikeListing(page)) {
        const dec = await this.ask(job, page, {
          status: 'needs_you',
          message:
            'This page lists several jobs rather than one. Click Scan for jobs to pull them into a review list.',
          actions: ['scan', 'refill', 'skip']
        });
        await this.handleDecision(job, page, dec, site);
        return;
      }

      const email = await findApplyEmail(page);
      if (email) {
        lastFoundEmail = email;
        const dec = await this.ask(job, page, {
          status: 'needs_you',
          message: `This job asks for your CV by email, to ${email}. Click Draft email, or send it yourself and click "I applied".`,
          actions: ['email', 'done', 'skip']
        });
        await this.handleDecision(job, page, dec, site, lastFoundEmail);
        return;
      }

      const dec = await this.ask(job, page, {
        status: 'needs_you',
        message:
          'No application form found. Open the form in the window yourself, then click Retry.',
        actions: ['refill', 'done', 'skip']
      });
      await this.handleDecision(job, page, dec, site);
      return;
    }

    // After filling
    const hasCaptcha = await hasVisibleCaptcha(page);
    const requiredFlags = filledFormResult.flagged.filter((f) => f.required);
    const db = getDB();

    if (requiredFlags.length > 0 || hasCaptcha) {
      const X = requiredFlags.length;
      const reqPhrase =
        X === 1 ? '1 required field needs you' : `${X} required fields need you`;
      const captchaPhrase = hasCaptcha ? ' and there is a CAPTCHA to solve' : '';
      const msg = `Filled ${filledFormResult.filled} fields; ${reqPhrase}${captchaPhrase}. Finish in the window, then click Submit.`;

      const allFlags = [...filledFormResult.flagged];
      if (hasCaptcha) {
        allFlags.push({
          label: 'CAPTCHA',
          reason: 'Solve the CAPTCHA in the browser',
          required: true
        });
      }

      const dec = await this.ask(job, page, {
        status: 'needs_you',
        message: msg,
        actions: ['submit', 'refill', 'done', 'skip'],
        flagged: allFlags
      });
      await this.handleDecision(job, page, dec, site);
      return;
    }

    if (db.settings.reviewBeforeSubmit) {
      const dec = await this.ask(job, page, {
        status: 'review',
        message: `Filled ${filledFormResult.filled} fields. Check the window, then click Submit.`,
        actions: ['submit', 'done', 'skip'],
        flagged: filledFormResult.flagged
      });
      await this.handleDecision(job, page, dec, site);
      return;
    }

    // Submit straight away
    await this.handleDecision(job, page, 'submit', site);
  }

  private async ask(
    job: Job,
    page: Page,
    prompt: {
      status: 'needs_you' | 'review';
      message: string;
      actions: Decision[];
      flagged?: Flag[];
    }
  ): Promise<Decision | 'stop'> {
    const shotPath = path.join(SHOTS_DIR, `${job.id}.png`);
    try {
      await page.screenshot({ path: shotPath });
    } catch {}

    const screenshotUrl = `/api/screenshots/${job.id}.png`;
    const updated = updateJob(job.id, {
      status: prompt.status,
      message: prompt.message,
      actions: prompt.actions,
      flagged: prompt.flagged || [],
      screenshot: screenshotUrl
    });

    this.waitSeq++;
    await page.bringToFront().catch(() => {});
    if (updated) {
      alerts.jobWaiting(updated, this.waitSeq);
    }

    this.waitingJobId = job.id;

    return new Promise<Decision | 'stop'>((resolve) => {
      this.resolveDecision = (decision: Decision | 'stop') => {
        this.waitingJobId = null;
        this.resolveDecision = null;
        resolve(decision);
      };
    });
  }

  private async handleDecision(
    job: Job,
    page: Page,
    decision: Decision | 'stop',
    site: string,
    emailAddress?: string | null
  ): Promise<void> {
    if (decision === 'refill') {
      await this.runFindAndFill(job, page, site);
      return;
    }

    if (decision === 'skip') {
      updateJob(job.id, {
        status: 'skipped',
        message: 'Skipped',
        actions: []
      });
      return;
    }

    if (decision === 'done') {
      const shotPath = path.join(SHOTS_DIR, `${job.id}.png`);
      try {
        await page.screenshot({ path: shotPath });
      } catch {}
      updateJob(job.id, {
        status: 'applied',
        message: 'Marked as applied by you',
        actions: [],
        screenshot: `/api/screenshots/${job.id}.png`,
        sentAt: new Date().toISOString()
      });
      return;
    }

    if (decision === 'stop') {
      updateJob(job.id, {
        status: 'queued',
        message: 'Stopped; will run again on next start',
        actions: []
      });
      return;
    }

    if (decision === 'scan') {
      const { leads } = await scanListing(page);
      const batch: IntakeBatch = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        sources: [page.url()],
        leads,
        warnings: []
      };
      addIntakeBatch(batch);
      updateJob(job.id, {
        status: 'skipped',
        message: `Scanned: ${leads.length} jobs found. Review them under Add jobs.`,
        actions: []
      });
      return;
    }

    if (decision === 'email') {
      let bodyText = '';
      try {
        bodyText = (await page.evaluate(
          '(() => document.body ? document.body.innerText || "" : "")()'
        )) as string;
      } catch {}

      updateJob(job.id, {
        kind: 'email',
        applyEmail: emailAddress || undefined,
        postingText: bodyText.slice(0, 8000),
        status: 'queued',
        message: 'Moved to email applications',
        actions: []
      });
      return;
    }

    if (decision === 'submit') {
      const res = await submitAndConfirm(page);

      if (res === 'confirmed') {
        const shotPath = path.join(SHOTS_DIR, `${job.id}.png`);
        try {
          await page.screenshot({ path: shotPath });
        } catch {}
        updateJob(job.id, {
          status: 'applied',
          message: 'Submitted, confirmation seen',
          actions: [],
          screenshot: `/api/screenshots/${job.id}.png`,
          sentAt: new Date().toISOString()
        });
        return;
      }

      if (res === 'no-button') {
        const nextDec = await this.ask(job, page, {
          status: 'needs_you',
          message:
            'Couldn\'t find the submit button. Submit it yourself in the window, then click "I applied".',
          actions: ['submit', 'done', 'skip']
        });
        await this.handleDecision(job, page, nextDec, site, emailAddress);
        return;
      }

      if (res === 'unconfirmed') {
        const nextDec = await this.ask(job, page, {
          status: 'needs_you',
          message:
            'Clicked submit but no confirmation showed up. Check the window for errors or a CAPTCHA, then click Submit again or "I applied".',
          actions: ['submit', 'done', 'skip']
        });
        await this.handleDecision(job, page, nextDec, site, emailAddress);
        return;
      }
    }
  }
}

export const runner = new Runner();
