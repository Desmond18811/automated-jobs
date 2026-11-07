import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium, type BrowserContext, type Locator, type Page } from 'playwright';
import {
  DATA_DIR,
  SHOTS_DIR,
  TRACES_DIR,
  FORM_ZOO_DIR,
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
  tryBypassAuth,
  findApplyEmail,
  looksLikeListing,
  submitAndConfirm
} from './site.js';
import { fillForm } from './fill.js';
import { navigate } from './navigator.js';
import { scanListing } from '../intake/listing.js';
import { draftEmail, aiStatus } from '../ai.js';
import { captureAnswers } from '../answers.js';
import * as alerts from '../notify/alerts.js';

type FillResult = { filled: number; flagged: Flag[] };

// Multi-page forms (Workday and friends): buttons that move to the next page...
const NEXT_RE = /^\s*(next|next step|continue|save and continue|save & continue|proceed|continue to next step)\s*$/i;
// ...and buttons that mean "this is the last page".
const SUBMIT_RE = /submit|send application|complete application/i;
const MAX_PAGES = 8;
const MAX_DEPTH = 10;

export class Runner {
  private running = false;
  private currentJobId: string | null = null;
  private waitingJobId: string | null = null;
  private resolveDecision: ((d: Decision | 'stop') => void) | null = null;
  private context: BrowserContext | null = null;
  private loopPromise: Promise<void> | null = null;
  private waitSeq = 0;
  private jobsProcessedInRun = 0;
  private consecutiveFormFailures = 0;
  private trouble = false; // this job failed or needed you: keep its replay trace

  public status(): { running: boolean; currentJobId: string | null; waitingOn: string | null } {
    return { running: this.running, currentJobId: this.currentJobId, waitingOn: this.waitingJobId };
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
    const queued = getDB().jobs.filter((j) => j.status === 'queued').length;
    alerts.runStarted(queued);
    this.loopPromise = this.loop().catch((err) => {
      console.error('[Runner] Unexpected loop error:', err);
    });
  }

  public stop(): void {
    if (!this.running) return;
    this.running = false;
    alerts.clearWaitingTimer();
    if (this.resolveDecision) this.resolveDecision('stop');
  }

  public async decide(jobId: string, decision: Decision): Promise<boolean> {
    if (this.waitingJobId !== jobId || !this.resolveDecision) return false;
    alerts.clearWaitingTimer();
    this.resolveDecision(decision);
    return true;
  }

  private async getContext(): Promise<BrowserContext> {
    if (this.context) {
      try {
        this.context.pages();
        return this.context;
      } catch {
        this.context = null;
      }
    }

    // No stealth flags (e.g. --disable-blink-features=AutomationControlled): sites treat
    // hidden automation as evasion and flag accounts. Google sign-in uses the profile
    // you signed into yourself (npm --prefix server run browser-setup).
    this.context = await chromium.launchPersistentContext(path.join(DATA_DIR, 'browser-profile'), {
      headless: false,
      channel: process.env.BROWSER_CHANNEL || undefined,
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
      const job = getDB().jobs.find((j) => j.status === 'queued' && (j.kind === 'form' || j.kind === 'email'));

      if (!job) {
        await alerts.runFinished(this.jobsProcessedInRun);
        this.running = false;
        break;
      }

      this.currentJobId = job.id;
      this.jobsProcessedInRun++;
      await alerts.jobStarted(job);

      if (job.kind === 'email') {
        try {
          await this.processEmailJob(job);
        } catch (err: any) {
          const firstLine = (err?.message || String(err)).split('\n')[0].slice(0, 300);
          const failed = updateJob(job.id, { status: 'failed', message: firstLine, actions: [] });
          if (failed) alerts.failed(failed, firstLine);
        } finally {
          this.currentJobId = null;
        }
        continue;
      }

      updateJob(job.id, { status: 'running', message: 'Opening the job page…' });

      try {
        await this.process(job);
        this.consecutiveFormFailures = 0;
      } catch (err: any) {
        const firstLine = (err?.message || String(err)).split('\n')[0].slice(0, 300);
        const failed = updateJob(job.id, { status: 'failed', message: firstLine, actions: [] });
        if (failed) alerts.failed(failed, firstLine);
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
    const flagged: Flag[] = hasMissing
      ? draft.missing.map((m) => ({
          label: m,
          reason: 'The advert asks for this; add it to the draft or your profile',
          required: true
        }))
      : [];
    updateJob(job.id, {
      draft: { to, subject: draft.subject, body: draft.body },
      status: hasMissing ? 'needs_you' : 'review',
      flagged,
      message: hasMissing
        ? `Email drafted to ${to || 'the employer'}, but the advert asks for things not in your profile.`
        : `Email drafted to ${to || 'the employer'}. Check it, then click Send email.`,
      actions: ['send', 'refill', 'done', 'skip']
    });
  }

  private async process(job: Job): Promise<void> {
    if (!job.url) {
      updateJob(job.id, { status: 'failed', message: 'No URL for this job', actions: [] });
      return;
    }

    const context = await this.getContext();
    const keepTraces = getDB().settings.keepTraces !== false;
    this.trouble = false;
    if (keepTraces) {
      await context.tracing.start({ screenshots: true, snapshots: true, title: job.title || job.url }).catch(() => undefined);
    }

    const existingPages = context.pages();
    let page: Page;
    if (existingPages.length > 0 && (existingPages[0].url() === 'about:blank' || existingPages[0].url() === '')) {
      page = existingPages[0];
    } else {
      page = await context.newPage();
    }
    await page.bringToFront().catch(() => {});

    try {
      await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      await settle(page);
      await page.bringToFront().catch(() => {});

      const site = detectSite(page.url());
      const pageTitle = (await page.title().catch(() => '')).trim().slice(0, 140);
      updateJob(job.id, { site, ...(job.title ? {} : { title: pageTitle || undefined }) });

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
      await this.runFindAndFill(job, page, site);
    } catch (err) {
      this.trouble = true;
      throw err;
    } finally {
      if (keepTraces) {
        if (this.trouble) {
          const file = `${job.id}.zip`;
          await context.tracing
            .stop({ path: path.join(TRACES_DIR, file) })
            .then(() => updateJob(job.id, { trace: file }))
            .catch(() => undefined);
        } else {
          await context.tracing.stop().catch(() => undefined);
        }
      }
      for (const p of context.pages()) {
        if (p !== page && !p.isClosed()) await p.close().catch(() => {});
      }
    }
  }

  private async fillCurrent(job: Job, page: Page): Promise<FillResult | null> {
    const form = await findFormFrame(page);
    if (!form) return null;
    const db = getDB();
    return fillForm({
      page,
      frame: form.frame,
      profile: db.profile,
      settings: db.settings,
      cv: db.cv!,
      source: page.url(),
      onProgress: (m: string) => updateJob(job.id, { message: m })
    });
  }

  /** A visible Next / Save and Continue button, but only when this page has no Submit button. */
  private async findNextButton(page: Page): Promise<Locator | null> {
    const form = await findFormFrame(page);
    const frame = form?.frame ?? page.mainFrame();
    const submits = frame.getByRole('button', { name: SUBMIT_RE });
    const nSubmit = await submits.count().catch(() => 0);
    for (let i = 0; i < nSubmit; i++) {
      if (await submits.nth(i).isVisible().catch(() => false)) return null;
    }
    const nexts = frame.getByRole('button', { name: NEXT_RE });
    const nNext = await nexts.count().catch(() => 0);
    for (let i = nNext - 1; i >= 0; i--) {
      if (await nexts.nth(i).isVisible().catch(() => false)) return nexts.nth(i);
    }
    return null;
  }

  private async runFindAndFill(job: Job, initialPage: Page, site: string, depth = 0): Promise<void> {
    let page = initialPage;
    let filled: FillResult | null = null;

    if (depth > MAX_DEPTH) {
      const dec = await this.ask(job, page, {
        status: 'needs_you',
        message: 'This site has more steps than expected. Finish in the window, then click "I applied".',
        actions: ['refill', 'done', 'skip']
      });
      await this.handleDecision(job, page, dec, site, null, depth);
      return;
    }

    for (let hop = 0; hop < 3; hop++) {
      // CAPTCHA: the one thing that always needs you.
      if (await hasVisibleCaptcha(page)) {
        await alerts.captchaNeeded(job);
        const dec = await this.ask(job, page, {
          status: 'needs_you',
          message: 'CAPTCHA detected. Solve it in the browser window, then click Retry.',
          actions: ['refill', 'done', 'skip']
        });
        await this.handleDecision(job, page, dec, site, null, depth);
        return;
      }

      if (await hasLoginWall(page)) {
        const db = getDB();
        updateJob(job.id, { message: 'Signing in…' });
        const signedIn = await tryBypassAuth(page, db.profile, db.settings);
        if (signedIn) {
          await settle(page);
          await page.bringToFront().catch(() => {});
          continue;
        }
        if (await hasVisibleCaptcha(page)) {
          await alerts.captchaNeeded(job);
          const dec = await this.ask(job, page, {
            status: 'needs_you',
            message: 'CAPTCHA during sign-in. Solve it in the browser window, then click Retry.',
            actions: ['refill', 'done', 'skip']
          });
          await this.handleDecision(job, page, dec, site, null, depth);
          return;
        }
        const dec = await this.ask(job, page, {
          status: 'needs_you',
          message: `${hostOf(page.url())} needs you to sign in or verify. Do it in the window, then click Retry. It'll be remembered.`,
          actions: ['refill', 'done', 'skip']
        });
        await this.handleDecision(job, page, dec, site, null, depth);
        return;
      }

      const form = await findFormFrame(page);
      if (form && (form.hasFile || form.count >= 5)) {
        filled = await this.fillCurrent(job, page);
        break;
      }

      const newPage = await clickApply(page);
      if (newPage) {
        page = newPage;
        await page.bringToFront().catch(() => {});
        continue;
      }

      if (form) {
        filled = await this.fillCurrent(job, page);
        break;
      }
      break;
    }

    if (!filled) {
      if (await looksLikeListing(page)) {
        const dec = await this.ask(job, page, {
          status: 'needs_you',
          message: 'This page lists several jobs rather than one. Click Scan for jobs to pull them into a review list.',
          actions: ['scan', 'refill', 'skip']
        });
        await this.handleDecision(job, page, dec, site, null, depth);
        return;
      }

      const email = await findApplyEmail(page);
      if (email) {
        const dec = await this.ask(job, page, {
          status: 'needs_you',
          message: `This job asks for your CV by email, to ${email}. Click Draft email, or send it yourself and click "I applied".`,
          actions: ['email', 'done', 'skip']
        });
        await this.handleDecision(job, page, dec, site, email, depth);
        return;
      }

      // Unfamiliar portal: let the AI pick clicks toward the form, one at a time.
      if (getDB().settings.aiNavigator !== false && aiStatus().text && depth < 2) {
        updateJob(job.id, { message: 'Looking for the application form…' });
        const nav = await navigate(page, 'Reach the application form for this job (or its first page).', {
          onStep: (m) => updateJob(job.id, { message: m })
        });
        if (nav.outcome === 'done' && nav.steps > 0) {
          await this.runFindAndFill(job, nav.page, site, depth + 1);
          return;
        }
        if (nav.outcome === 'human') {
          const dec = await this.ask(job, nav.page, {
            status: 'needs_you',
            message: `${nav.reason}. Do it in the window, then click Retry.`,
            actions: ['refill', 'done', 'skip']
          });
          await this.handleDecision(job, nav.page, dec, site, null, depth);
          return;
        }
        page = nav.page;
      }

      const dec = await this.ask(job, page, {
        status: 'needs_you',
        message: 'No application form found. Open the form in the window yourself, then click Retry.',
        actions: ['refill', 'done', 'skip']
      });
      await this.handleDecision(job, page, dec, site, null, depth);
      return;
    }

    // Multi-page forms: fill, press Next, fill again, until the page with Submit (or a question for you).
    let pages = 1;
    while (pages < MAX_PAGES) {
      if (filled.flagged.some((f) => f.required)) break;
      if (await hasVisibleCaptcha(page)) break;
      const next = await this.findNextButton(page);
      if (!next) break;
      await next.click({ timeout: 10_000 }).catch(() => undefined);
      await settle(page);
      pages++;
      updateJob(job.id, { message: `Page ${pages}: filling…` });
      if (await hasLoginWall(page)) break;
      const more = await this.fillCurrent(job, page);
      if (!more) break;
      filled = { filled: filled.filled + more.filled, flagged: more.flagged };
    }

    const hasCaptcha = await hasVisibleCaptcha(page);
    if (hasCaptcha) await alerts.captchaNeeded(job);
    const requiredFlags = filled.flagged.filter((f) => f.required);

    if (requiredFlags.length > 0 || hasCaptcha) {
      const x = requiredFlags.length;
      const reqPhrase = x === 1 ? '1 required field needs you' : `${x} required fields need you`;
      const msg = `Filled ${filled.filled} fields; ${x ? reqPhrase : 'there is a CAPTCHA to solve'}${x && hasCaptcha ? ' and there is a CAPTCHA to solve' : ''}. Finish in the window, then click Submit.`;
      const allFlags = [...filled.flagged];
      if (hasCaptcha) allFlags.push({ label: 'CAPTCHA', reason: 'Solve the CAPTCHA in the browser', required: true });
      const dec = await this.ask(job, page, {
        status: 'needs_you',
        message: msg,
        actions: ['submit', 'refill', 'done', 'skip'],
        flagged: allFlags
      });
      await this.handleDecision(job, page, dec, site, null, depth);
      return;
    }

    if (getDB().settings.reviewBeforeSubmit) {
      const dec = await this.ask(job, page, {
        status: 'review',
        message: `Filled ${filled.filled} fields${pages > 1 ? ` across ${pages} pages` : ''}. Check the window, then click Submit.`,
        actions: ['submit', 'done', 'skip'],
        flagged: filled.flagged
      });
      await this.handleDecision(job, page, dec, site, null, depth);
      return;
    }

    await this.handleDecision(job, page, 'submit', site, null, depth);
  }

  private async saveFormSnapshot(job: Job, page: Page): Promise<void> {
    try {
      const form = await findFormFrame(page);
      const html = await (form?.frame ?? page.mainFrame()).content();
      const host = hostOf(page.url()).replace(/[^a-z0-9.-]+/gi, '_') || 'page';
      fs.writeFileSync(path.join(FORM_ZOO_DIR, `${host}-${job.id}.html`), html);
    } catch {
      /* debugging aid only */
    }
  }

  private async ask(
    job: Job,
    page: Page,
    prompt: { status: 'needs_you' | 'review'; message: string; actions: Decision[]; flagged?: Flag[] }
  ): Promise<Decision | 'stop'> {
    if (prompt.status === 'needs_you') {
      this.trouble = true;
      await this.saveFormSnapshot(job, page);
    }
    await page.bringToFront().catch(() => {});
    try {
      await page.screenshot({ path: path.join(SHOTS_DIR, `${job.id}.png`) });
    } catch {
      /* ignore */
    }

    const updated = updateJob(job.id, {
      status: prompt.status,
      message: prompt.message,
      actions: prompt.actions,
      flagged: prompt.flagged || [],
      screenshot: `/api/screenshots/${job.id}.png`
    });

    this.waitSeq++;
    if (updated) alerts.jobWaiting(updated, this.waitSeq);
    this.waitingJobId = job.id;

    return new Promise<Decision | 'stop'>((resolve) => {
      this.resolveDecision = (decision: Decision | 'stop') => {
        this.waitingJobId = null;
        this.resolveDecision = null;
        resolve(decision);
      };
    });
  }

  private async markApplied(job: Job, page: Page, message: string) {
    try {
      await page.screenshot({ path: path.join(SHOTS_DIR, `${job.id}.png`) });
    } catch {
      /* ignore */
    }
    const updated = updateJob(job.id, {
      status: 'applied',
      message,
      actions: [],
      screenshot: `/api/screenshots/${job.id}.png`,
      sentAt: new Date().toISOString()
    });
    if (updated) alerts.applied(updated);
  }

  private async handleDecision(
    job: Job,
    page: Page,
    decision: Decision | 'stop',
    site: string,
    emailAddress?: string | null,
    depth = 0
  ): Promise<void> {
    if (decision === 'refill') {
      await this.runFindAndFill(job, page, site, depth + 1);
      return;
    }

    if (decision === 'skip') {
      updateJob(job.id, { status: 'skipped', message: 'Skipped', actions: [] });
      return;
    }

    if (decision === 'done') {
      await this.markApplied(job, page, 'Marked as applied by you');
      return;
    }

    if (decision === 'stop') {
      updateJob(job.id, { status: 'queued', message: 'Stopped; will run again on next start', actions: [] });
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
        bodyText = (await page.evaluate('(() => document.body ? document.body.innerText || "" : "")()')) as string;
      } catch {
        /* ignore */
      }
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
      // Remember what you typed into the questions the bot couldn't answer.
      if (getDB().settings.useAnswerLibrary !== false) {
        const flagged = getDB().jobs.find((j) => j.id === job.id)?.flagged || [];
        const form = await findFormFrame(page);
        if (form && flagged.length) {
          const saved = await captureAnswers(form.frame, flagged.filter((f) => f.label !== 'CAPTCHA'));
          if (saved) updateJob(job.id, { message: `Saved ${saved} answer${saved === 1 ? '' : 's'} for next time. Continuing…` });
        }
      }

      // Not the last page yet: move on and keep filling.
      const next = await this.findNextButton(page);
      if (next) {
        await next.click({ timeout: 10_000 }).catch(() => undefined);
        await settle(page);
        await this.runFindAndFill(job, page, site, depth + 1);
        return;
      }

      const res = await submitAndConfirm(page);
      if (res === 'confirmed') {
        await this.markApplied(job, page, 'Submitted, confirmation seen');
        return;
      }

      const nextDec = await this.ask(job, page, {
        status: 'needs_you',
        message:
          res === 'no-button'
            ? 'Couldn\'t find the submit button. Submit it yourself in the window, then click "I applied".'
            : 'Clicked submit but no confirmation showed up. Check the window for errors or a CAPTCHA, then click Submit again or "I applied".',
        actions: ['submit', 'done', 'skip']
      });
      await this.handleDecision(job, page, nextDec, site, emailAddress, depth + 1);
    }
  }
}

export const runner = new Runner();
