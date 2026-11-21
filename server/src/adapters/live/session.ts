import type { Frame, Locator, Page } from 'playwright';
import { z } from 'zod';
import { env } from '../../config/env';
import { decrypt, encrypt, randomToken } from '../../lib/crypto';
import { getLiveContext } from '../../lib/liveBrowser';
import { logger } from '../../lib/logger';
import { assertPublicUrl } from '../../lib/net';
import { questionKey } from '../../lib/normalize';
import { storagePath } from '../../lib/storage';
import { SiteAccount } from '../../models/siteAccount.model';
import type { NeedsReason, TaskQuestion } from '../../models/task.model';
import { completeJson, llmEnabled } from '../../services/documents/llm';
import { findVerificationCode } from '../../services/gmail.service';
import { openTask, waitForTask } from '../../services/task.service';
import { formDryRun } from '../../services/safety.service';
import { CAPTCHA, SUCCESS_RE, collectFields, executeFill, planFill } from '../form.adapter';
import type { AdapterResult, ApplyContext } from '../types';

/**
 * One application in the visible JAVI browser window. The page stays open the whole time:
 * when JAVI hits something it must not guess (a new question, a CAPTCHA, a login) it messages the
 * user on WhatsApp, waits on that same page, and carries on once they answer or step in.
 *
 * Loop: CAPTCHA? → sign-in/sign-up wall? → find the form (click "Apply") → fill what the profile
 * knows → ask for the rest → submit/next → repeat (multi-page forms) until a confirmation shows.
 */

const MAX_STEPS = 15;
const FINAL_SUBMIT = /^(submit( application)?|apply|send( application)?|finish|complete)$/i;
const waitMs = () => env.LIVE_WAIT_MINUTES * 60_000;

type Waited = 'continue' | 'timeout';

interface Session {
  ctx: ApplyContext;
  page: Page;
  answers: Record<string, string>;
  /** The task left open when we gave up waiting; deliver() parks the application on it. */
  pendingTaskId?: string;
  pendingReason?: NeedsReason;
  /** Set after the first page is filled: later pages of a multi-step form may have no email/file field. */
  inForm?: boolean;
  /** The user okayed submitting during a dry-run. */
  dryRunCleared?: boolean;
}

// ── Detection ──────────────────────────────────────────────────────────────────

/** A CAPTCHA a human must act on: visible and checkbox-sized, not reCAPTCHA v3's invisible badge. */
async function captchaVisible(page: Page): Promise<boolean> {
  for (const el of await page.locator(CAPTCHA).all()) {
    const src = (await el.getAttribute('src').catch(() => null)) ?? '';
    if (/size=invisible/.test(src)) continue;
    const box = await el.boundingBox().catch(() => null);
    if (box && box.width > 30 && box.height > 30) return true;
  }
  return false;
}

/** Turnstile and similar often clear themselves; give them a moment before bothering anyone. */
async function captchaNeedsHuman(page: Page): Promise<boolean> {
  if (!(await captchaVisible(page))) return false;
  await page.waitForTimeout(5000);
  return captchaVisible(page);
}

const GOOGLE_BUTTON = /(continue|sign ?in|sign ?up|log ?in|apply) with google/i;
const AUTH_HEADING = /sign ?in|log ?in|create (an |your )?account|sign ?up|register/i;

async function visible(loc: Locator): Promise<Locator | null> {
  for (const el of await loc.all()) if (await el.isVisible().catch(() => false)) return el;
  return null;
}

async function detectAuth(page: Page): Promise<{ kind: 'google' | 'signup' | 'login'; google?: Locator } | null> {
  const passwords = await page.locator('input[type="password"]:visible').count();
  const text = (await page.locator('body').innerText().catch(() => '')).slice(0, 4000);
  const looksLikeAuth = passwords > 0 || (AUTH_HEADING.test(text) && !(await page.locator('input[type="file"]').count()));
  if (!looksLikeAuth) return null;

  const google =
    (await visible(page.getByRole('button', { name: GOOGLE_BUTTON }))) ??
    (await visible(page.getByRole('link', { name: GOOGLE_BUTTON }))) ??
    (await visible(page.locator('iframe[src*="accounts.google.com/gsi"]')));
  if (google) return { kind: 'google', google };
  if (!passwords) return null;
  const signup = passwords >= 2 || /create (an |your )?account|sign ?up|register/i.test(text);
  return { kind: signup ? 'signup' : 'login' };
}

const hostOf = (url: string) => new URL(url).hostname.replace(/^www\./, '');

// ── Waiting on the user ────────────────────────────────────────────────────────

async function askAndWait(
  s: Session,
  reason: NeedsReason,
  message: string,
  opts: { questions?: TaskQuestion[]; until?: () => Promise<boolean> } = {},
): Promise<Waited> {
  const task = await openTask({
    userId: s.ctx.userId,
    applicationId: s.ctx.app.id,
    reason,
    message,
    questions: opts.questions,
    live: true,
    payload: { openUrl: s.page.url(), jobTitle: s.ctx.job.title, company: s.ctx.job.company, live: true },
  });
  await s.page.bringToFront().catch(() => undefined);
  const done = await waitForTask(task.id, { timeoutMs: waitMs(), until: opts.until });
  if (!done) {
    task.live = false;
    await task.save();
    s.pendingTaskId = task.id;
    s.pendingReason = reason;
    return 'timeout';
  }
  for (const q of task.questions) {
    const a = done.answers?.[q.key];
    if (a) s.answers[questionKey(q.label)] = a;
  }
  return 'continue';
}

// ── LLM drafts for open-ended questions ────────────────────────────────────────

const Drafts = z.object({ answers: z.array(z.object({ key: z.string(), answer: z.string() })) });

/**
 * "Why do you want to work at Stripe?" deserves a real answer. Draft one from the profile and the job
 * posting, but only as a suggestion: the user confirms or edits it in the WhatsApp/answer page.
 */
async function suggestAnswers(questions: TaskQuestion[], ctx: ApplyContext): Promise<TaskQuestion[]> {
  const open = questions.filter((q) => (q.type === 'textarea' || q.type === 'text') && !q.isSalary && /\b(why|describe|tell us|explain|what|how)\b/i.test(q.label));
  if (!open.length || !llmEnabled()) return questions;
  const p = ctx.profile;
  try {
    const out = await completeJson(Drafts, {
      system:
        'You draft answers to job application questions for a candidate. Use ONLY facts from the profile; never invent employers, numbers or skills. First person, plain and specific, 2-5 sentences, tailored to the job.',
      prompt: `JOB: ${ctx.job.title} at ${ctx.job.company}\n${(ctx.job.description ?? '').slice(0, 5000)}\n\nPROFILE:\n${JSON.stringify({
        headline: p.headline,
        summary: p.summary,
        skills: p.skills,
        experience: p.experience.map((e) => ({ title: e.title, company: e.company, bullets: e.bullets.map((b) => b.text) })),
        projects: p.projects.map((x) => ({ name: x.name, description: x.description })),
      }).slice(0, 8000)}\n\nQUESTIONS:\n${open.map((q) => `${q.key}: ${q.label}`).join('\n')}\n\nReturn {"answers":[{"key":"<key>","answer":"..."}]}`,
      maxTokens: 900,
    });
    const byKey = new Map(out.answers.map((a) => [a.key, a.answer.trim()]));
    return questions.map((q) => (byKey.get(q.key) ? { ...q, suggested: byKey.get(q.key) } : q));
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'Could not draft suggested answers');
    return questions;
  }
}

// ── Sign-in / sign-up ──────────────────────────────────────────────────────────

/** "Continue with Google": pick the profile's Google account in the popup (or same-tab redirect). */
async function googleSignIn(s: Session, button: Locator): Promise<Waited | 'ok'> {
  const context = s.page.context();
  const popupP = context.waitForEvent('page', { timeout: 10_000 }).catch(() => null);
  await button.click();
  const popup = await popupP;
  const g = popup ?? s.page;
  await g.waitForLoadState('domcontentloaded').catch(() => undefined);

  for (let i = 0; i < 6; i++) {
    if (popup?.isClosed() || !/accounts\.google\.com/.test(g.url())) break;
    const email = s.ctx.profile.email?.toLowerCase();
    const account =
      (email && (await visible(g.locator(`[data-identifier="${email}"], [data-email="${email}"]`)))) ||
      (await visible(g.locator('[data-identifier], [data-email]')));
    if (account) {
      await account.click();
    } else if (await visible(g.locator('input[type="email"], input[type="password"]'))) {
      // Not signed in to Google in this browser yet: only the user can do that.
      const r = await askAndWait(s, 'login_wall', 'Sign in to Google in the JAVI browser window (just once; it stays signed in), then JAVI continues.', {
        until: async () => Boolean(popup?.isClosed()) || !/accounts\.google\.com/.test(g.url()),
      });
      if (r === 'timeout') return r;
    } else {
      const allow = await visible(g.getByRole('button', { name: /^(continue|allow|confirm|i agree)$/i }));
      if (allow) await allow.click();
    }
    await g.waitForTimeout(2000);
  }
  if (popup && !popup.isClosed()) await popup.waitForEvent('close', { timeout: 20_000 }).catch(() => undefined);
  await s.page.waitForLoadState('domcontentloaded').catch(() => undefined);
  await SiteAccount.updateOne(
    { userId: s.ctx.userId, domain: hostOf(s.page.url()) },
    { $set: { method: 'google', email: s.ctx.profile.email, lastUsedAt: new Date() } },
    { upsert: true },
  ).catch(() => undefined);
  return 'ok';
}

async function fillCredentials(page: Page, email: string, password: string) {
  const emailField = await visible(page.locator('input[type="email"], input[autocomplete="username"], input[name*="email" i], input[id*="email" i]'));
  if (emailField) await emailField.fill(email);
  for (const pw of await page.locator('input[type="password"]:visible').all()) await pw.fill(password);
}

async function clickPrimary(page: Page, name: RegExp): Promise<boolean> {
  const btn =
    (await visible(page.getByRole('button', { name }))) ??
    (await visible(page.locator('input[type="submit"]'))) ??
    (await visible(page.locator('button[type="submit"]')));
  if (!btn) return false;
  await Promise.all([page.waitForLoadState('domcontentloaded', { timeout: 15_000 }).catch(() => undefined), btn.click()]);
  await page.waitForTimeout(2500);
  return true;
}

/** Email verification after sign-up: a code (read from Gmail if allowed, else ask) or a link (ask). */
async function verifyEmail(s: Session, since: Date): Promise<Waited | 'ok'> {
  const page = s.page;
  const codeInput = await visible(
    page.locator('input[autocomplete="one-time-code"], input[name*="code" i], input[id*="code" i], input[name*="otp" i], input[aria-label*="code" i]'),
  );
  if (codeInput) {
    let code = await findVerificationCode(s.ctx.userId, since).catch(() => null);
    if (!code) {
      const q: TaskQuestion = { key: questionKey(`verification code ${hostOf(page.url())}`), label: `Verification code ${hostOf(page.url())} just emailed to ${s.ctx.profile.email}`, type: 'text', required: true };
      const r = await askAndWait(s, 'login_wall', `${hostOf(page.url())} sent a verification code to your email. Send it to JAVI to finish creating the account.`, { questions: [q] });
      if (r === 'timeout') return r;
      code = s.answers[questionKey(q.label)];
    }
    if (code) {
      await codeInput.fill(code.trim());
      await clickPrimary(page, /verify|confirm|continue|submit|next/i);
    }
    return 'ok';
  }
  const body = await page.locator('body').innerText().catch(() => '');
  if (/verify your (email|account)|check your (email|inbox)|(sent|emailed) (you )?a (verification|confirmation) (link|email)/i.test(body)) {
    const r = await askAndWait(s, 'login_wall', `${hostOf(page.url())} emailed you a verification link. Open it (on any device), then tap “Continue” and JAVI picks up.`);
    if (r === 'timeout') return r;
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
  }
  return 'ok';
}

async function passwordAuth(s: Session, kind: 'signup' | 'login'): Promise<Waited | 'ok'> {
  const page = s.page;
  const domain = hostOf(page.url());
  const email = s.ctx.profile.email;
  if (!email) {
    return askAndWait(s, 'login_wall', `${domain} needs an account and your profile has no email. Log in or sign up in the JAVI window, then tap Continue.`, {
      until: async () => !(await page.locator('input[type="password"]:visible').count()),
    });
  }
  const existing = await SiteAccount.findOne({ userId: s.ctx.userId, domain });

  if (kind === 'login') {
    if (existing?.passwordEnc) {
      await fillCredentials(page, existing.email ?? email, decrypt(existing.passwordEnc));
      await clickPrimary(page, /sign ?in|log ?in|continue|next|submit/i);
      existing.lastUsedAt = new Date();
      await existing.save();
      if (!(await page.locator('input[type="password"]:visible').count())) return 'ok';
    }
    // No saved account here: switch to sign-up if the page offers it.
    const create = (await visible(page.getByRole('link', { name: /create (an )?account|sign ?up|register/i }))) ?? (await visible(page.getByRole('button', { name: /create (an )?account|sign ?up|register/i })));
    if (create && !existing) {
      await create.click();
      await page.waitForTimeout(2000);
      return passwordAuth(s, 'signup');
    }
    return askAndWait(s, 'login_wall', `${domain} wants you to log in and JAVI has no saved login for it. Log in in the JAVI browser window, then JAVI continues.`, {
      until: async () => !(await page.locator('input[type="password"]:visible').count()),
    });
  }

  // Sign up: one generated password per site, stored encrypted before we submit it.
  const password = existing?.passwordEnc ? decrypt(existing.passwordEnc) : `Jv-${randomToken(12)}9!`;
  await SiteAccount.updateOne(
    { userId: s.ctx.userId, domain },
    { $set: { method: 'password', email, passwordEnc: encrypt(password), lastUsedAt: new Date() } },
    { upsert: true },
  );
  await fillCredentials(page, email, password);
  // Name fields, terms checkboxes etc. go through the normal profile/answer logic.
  const plan = planFill(await collectFields(page), { ...s.ctx, extraAnswers: s.answers });
  await executeFill(page, plan.fills.filter((f) => f.kind !== 'file'));
  if (plan.unknown.length) {
    const r = await askAndWait(s, 'unknown_question', `Creating your ${domain} account: it asks something JAVI doesn't know yet.`, { questions: plan.unknown });
    if (r === 'timeout') return r;
    const again = planFill(await collectFields(page), { ...s.ctx, extraAnswers: s.answers });
    await executeFill(page, again.fills.filter((f) => f.kind !== 'file'));
  }
  const since = new Date();
  await clickPrimary(page, /create (an |my )?account|sign ?up|register|continue|submit|next/i);
  return verifyEmail(s, since);
}

// ── The form ───────────────────────────────────────────────────────────────────

/** A real application form, not a newsletter box: a file upload, or a name field plus an email field. */
function isApplicationForm(fields: Awaited<ReturnType<typeof collectFields>>): boolean {
  const has = (re: RegExp) => fields.some((f) => re.test(`${f.label} ${f.name}`));
  return fields.some((f) => f.type === 'file') || (has(/e-?mail/i) && has(/name/i));
}

/** Listing pages: click through to the actual form (same tab or a new one). */
async function clickApplyEntry(s: Session): Promise<boolean> {
  const name = /^(apply( now| for this (job|role|position))?|i'?m interested|start (your )?application)$/i;
  const btn = (await visible(s.page.getByRole('button', { name }))) ?? (await visible(s.page.getByRole('link', { name })));
  if (!btn) return false;
  const popupP = s.page.context().waitForEvent('page', { timeout: 5000 }).catch(() => null);
  await btn.click();
  const popup = await popupP;
  if (popup) {
    await s.page.close().catch(() => undefined);
    s.page = popup;
  }
  await s.page.waitForLoadState('domcontentloaded').catch(() => undefined);
  await s.page.waitForTimeout(2500);
  return true;
}

/** Greenhouse and others embed the form in an iframe; if so, work inside that frame's page context. */
async function formFrame(page: Page): Promise<Page | Frame> {
  if ((await collectFields(page)).length > 2) return page;
  for (const f of page.frames()) {
    if (f === page.mainFrame()) continue;
    if (/greenhouse|lever|ashby|workable|smartrecruiters|jobvite|icims/i.test(f.url())) return f;
  }
  return page;
}

async function pageSignature(page: Page): Promise<string> {
  const fields = await collectFields(page).catch(() => []);
  return `${page.url()}|${fields.map((f) => f.label).join('|')}`;
}

// ── Entry point ────────────────────────────────────────────────────────────────

export async function liveApply(ctx: ApplyContext): Promise<AdapterResult & { taskId?: string }> {
  const url = ctx.job.applyMethod.formUrl ?? ctx.job.url;
  await assertPublicUrl(url);
  const context = await getLiveContext();
  const s: Session = { ctx, page: await context.newPage(), answers: { ...ctx.extraAnswers } };
  const parked = (): AdapterResult & { taskId?: string } => ({
    status: 'needs_user',
    reason: s.pendingReason ?? 'unknown_question',
    detail: `JAVI waited ${env.LIVE_WAIT_MINUTES} min for you. The page is still open in the JAVI window; answer the message to try again.`,
    payload: { openUrl: s.page.url(), live: false },
    taskId: s.pendingTaskId,
  });

  try {
    await s.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await s.page.waitForTimeout(2500);
    let lastSig = '';
    let stuck = 0;

    for (let step = 0; step < MAX_STEPS; step++) {
      if (await captchaNeedsHuman(s.page)) {
        const r = await askAndWait(s, 'captcha', 'A CAPTCHA popped up. Solve it in the JAVI browser window; JAVI carries on by itself once it clears.', {
          until: async () => !(await captchaVisible(s.page)),
        });
        if (r === 'timeout') return parked();
        continue;
      }

      const auth = await detectAuth(s.page);
      if (auth) {
        const r = auth.kind === 'google' ? await googleSignIn(s, auth.google!) : await passwordAuth(s, auth.kind);
        if (r === 'timeout') return parked();
        continue;
      }

      const target = await formFrame(s.page);
      const fields = await collectFields(target as Page);
      if (!(s.inForm ? fields.length > 0 : isApplicationForm(fields))) {
        if (await clickApplyEntry(s)) continue;
        const r = await askAndWait(s, 'no_form_found', "JAVI can't find the application form on this page. Open it in the JAVI window (click through to the form), then tap Continue.", {
          until: async () => isApplicationForm(await collectFields(s.page)),
        });
        if (r === 'timeout') return parked();
        continue;
      }

      const plan = planFill(fields, { ...ctx, extraAnswers: s.answers });
      const questions = [...plan.salary, ...plan.unknown];
      if (questions.length) {
        const withDrafts = await suggestAnswers(questions, ctx);
        const r = await askAndWait(
          s,
          plan.salary.length ? 'salary_question' : 'unknown_question',
          `${ctx.job.company}'s form asks ${questions.length === 1 ? 'something' : `${questions.length} things`} JAVI doesn't know yet. Answer once; it's remembered.`,
          { questions: withDrafts },
        );
        if (r === 'timeout') return parked();
        continue; // re-plan with the new answers on the same page
      }

      await executeFill(target as Page, plan.fills);
      s.inForm = true;
      const shot = await storagePath('screenshots', `${ctx.userId}-${ctx.app.id}-${Date.now()}-filled.png`);
      await s.page.screenshot({ path: shot, fullPage: true }).catch(() => undefined);

      // Dry-run: on the final submit, stop and let the user check the filled form first.
      const finalBtn = await visible((target as Page).getByRole('button', { name: FINAL_SUBMIT }));
      if (finalBtn && !s.dryRunCleared && (await formDryRun(ctx.userId))) {
        const r = await askAndWait(
          s,
          'confirm_submission',
          `Practice run: JAVI filled ${ctx.job.company}'s form but hasn't submitted it. Check it in the JAVI window, then submit it yourself, or tap Continue and JAVI submits.`,
          { until: async () => SUCCESS_RE.test(await s.page.locator('body').innerText().catch(() => '')) },
        );
        if (r === 'timeout') return parked();
        if (SUCCESS_RE.test(await s.page.locator('body').innerText().catch(() => ''))) {
          return { status: 'sent', detail: 'submitted by you after a practice run', screenshotPath: shot };
        }
        s.dryRunCleared = true;
      }

      const advanced =
        (await clickPrimary(target as Page, FINAL_SUBMIT)) ||
        (await clickPrimary(target as Page, /^(next|continue|save (and|&) continue|review)$/i));
      const body = await s.page.locator('body').innerText().catch(() => '');
      if (SUCCESS_RE.test(body)) {
        setTimeout(() => s.page.close().catch(() => undefined), 8000);
        return { status: 'sent', detail: 'submitted in the JAVI browser', screenshotPath: shot };
      }

      // Same form, same URL after clicking: validation errors or nothing to click.
      const sig = await pageSignature(s.page);
      stuck = sig === lastSig || !advanced ? stuck + 1 : 0;
      lastSig = sig;
      if (stuck >= 2) {
        const r = await askAndWait(
          s,
          'confirm_submission',
          "JAVI filled the form but it won't go through (a field it can't see, or an error). Have a look in the JAVI window: fix and submit it, then tap Continue.",
          { until: async () => SUCCESS_RE.test(await s.page.locator('body').innerText().catch(() => '')) },
        );
        if (r === 'timeout') return parked();
        if (SUCCESS_RE.test(await s.page.locator('body').innerText().catch(() => ''))) {
          return { status: 'sent', detail: 'submitted in the JAVI browser (with your help)', screenshotPath: shot };
        }
        stuck = 0;
      }
    }
    return { status: 'failed', error: `Gave up after ${MAX_STEPS} steps without a confirmation page`, retryable: false };
  } catch (err) {
    // Leave the tab open so the user can see where it stopped.
    return { status: 'failed', error: (err as Error).message, retryable: true };
  }
}
