import type { Page } from 'playwright';
import { getBrowser } from '../lib/browser';
import { assertPublicUrl } from '../lib/net';
import { normalizeText, questionKey } from '../lib/normalize';
import { storagePath } from '../lib/storage';
import type { NeedsReason, TaskQuestion } from '../models/task.model';
import type { AdapterResult, ApplyContext, ChannelAdapter } from './types';

/**
 * Fills career-page forms (Greenhouse, Lever, Ashby, Workable and plain HTML forms).
 * Rules: never solve or bypass a CAPTCHA, never log in, never guess an answer.
 * Anything unknown becomes a "needs you" task; the saved answer is reused next time.
 */

export interface FieldInfo {
  idx: number; tag: string; type: string; label: string; groupLabel: string;
  required: boolean; options: string[]; name: string;
}
export interface Fill { idx: number; kind: 'text' | 'select' | 'file' | 'check'; value: string }

const CAPTCHA = 'iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="challenges.cloudflare.com"], .g-recaptcha, .h-captcha, .cf-turnstile';
const SALARY_RE = /salary|compensation|remuneration|pay expectation|expected pay|desired pay|\bctc\b|rate expectation/i;
const SUCCESS_RE = /thank you|thanks for applying|application (has been )?(received|submitted)|we('ve| have) received your application/i;

export async function collectFields(page: Page): Promise<FieldInfo[]> {
  return page.$$eval('input, textarea, select', (els) => {
    const out: FieldInfo[] = [];
    els.forEach((el, idx) => {
      const input = el as HTMLInputElement;
      const type = (input.getAttribute('type') || el.tagName).toLowerCase();
      if (['hidden', 'submit', 'button', 'reset', 'image', 'search'].includes(type)) return;
      const rect = el.getBoundingClientRect();
      if (type !== 'file' && (rect.width === 0 || rect.height === 0)) return;
      el.setAttribute('data-javi-idx', String(idx));
      const byFor = input.id ? document.querySelector(`label[for="${CSS.escape(input.id)}"]`) : null;
      const label = (byFor?.textContent || input.closest('label')?.textContent || input.getAttribute('aria-label') || input.getAttribute('placeholder') || input.name || '')
        .replace(/\s+/g, ' ')
        .trim();
      const legend = input.closest('fieldset')?.querySelector('legend')?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
      out.push({
        idx,
        tag: el.tagName.toLowerCase(),
        type,
        label,
        groupLabel: legend,
        required: input.required || input.getAttribute('aria-required') === 'true' || /\*\s*$/.test(label),
        options: el.tagName === 'SELECT' ? Array.from((el as unknown as HTMLSelectElement).options).map((o) => o.text.trim()).filter(Boolean) : [],
        name: input.name || '',
      });
    });
    return out;
  });
}

export function knownValue(f: FieldInfo, ctx: ApplyContext): string | undefined {
  const p = ctx.profile;
  const text = `${f.label} ${f.name}`.toLowerCase();
  const [first = '', ...rest] = (p.fullName ?? '').split(/\s+/);
  const link = (re: RegExp) => p.links?.find((l) => re.test(l.label) || re.test(l.url))?.url;

  // 1. Cover letter / why us / statement
  if (f.tag === 'textarea' && /cover letter|why .*(join|work|interested)|statement|additional info/i.test(text)) {
    return ctx.app.documents?.coverLetter || ctx.app.documents?.proposal;
  }

  // 2. Personal contact info
  if (/first.?name|given name/i.test(text)) return p.firstName || first || undefined;
  if (/last.?name|surname|family name/i.test(text)) return p.lastName || (rest.length ? rest.join(' ') : undefined);
  if (/full.?name|^name\b|your name/i.test(text)) return p.fullName || (p.firstName && p.lastName ? `${p.firstName} ${p.lastName}` : undefined);
  if (/e-?mail/i.test(text)) return p.email || undefined;
  if (/phone|mobile|telephone/i.test(text)) return p.phone || undefined;

  // 3. Socials & Portfolios (including LinkedIn)
  if (/linkedin|linked in|social profile|public profile/i.test(text)) return p.linkedinUrl || link(/linkedin/i) || undefined;
  if (/github|git repository|code sample/i.test(text)) return p.githubUrl || link(/github/i) || undefined;
  if (/portfolio|personal (site|website)|website|work sample/i.test(text)) return p.portfolioUrl || link(/portfolio|website|site/i) || p.links?.[0]?.url || undefined;
  if (/twitter|x\.com/i.test(text)) return p.twitterUrl || link(/twitter|x\.com/i) || undefined;

  // 4. Headline & Summary
  if (/headline|professional summary|bio|about (you|me)/i.test(text)) return p.headline || p.summary || undefined;
  if (/skills|technologies|proficiencies/i.test(text)) return p.primarySkills?.join(', ') || undefined;

  // 5. Address & Location
  if (/street (address)?|address line 1/i.test(text)) return p.address?.street || undefined;
  if (/(zip|postal) code/i.test(text)) return p.address?.postalCode || undefined;
  if (/^state\b|province|region/i.test(text)) return p.address?.state || undefined;
  if (/^country\b/i.test(text)) return p.address?.country || undefined;
  if (/^(location|city)\b|current location|where are you based|current city/i.test(text)) return p.address?.city || p.location || undefined;

  // 6. Work authorization & Legal eligibility
  if (/authorized to work|legal.*authoriz|right to work/i.test(text)) {
    if (p.workAuthorization === 'authorized') return 'Yes';
    if (p.workAuthorization === 'not_authorized') return 'No';
    return undefined;
  }
  if (/require.*sponsor|visa sponsor/i.test(text)) {
    if (p.requiresSponsorship !== undefined) return p.requiresSponsorship ? 'Yes' : 'No';
    return undefined;
  }
  if (/security clearance/i.test(text)) {
    if (p.securityClearance && p.securityClearance !== 'none') return p.securityClearance;
    return 'None';
  }

  // 7. Availability & Notice
  if (/start date|earliest.*start|when can you start/i.test(text)) return p.earliestStartDate || undefined;
  if (/notice period|notice/i.test(text)) return p.noticePeriod || undefined;

  // 8. Experience, current company & title
  if (/years of (work )?experience|total experience/i.test(text)) {
    return p.yearsOfExperience !== undefined ? String(p.yearsOfExperience) : undefined;
  }
  if (/current (job )?title|current role|present role/i.test(text)) return p.currentTitle || undefined;
  if (/current (employer|company)|present company/i.test(text)) return p.currentCompany || undefined;

  // 9. Education
  if (/highest (level of )?education|education level|degree/i.test(text)) {
    return p.highestEducationLevel || p.education?.[0]?.degree || undefined;
  }
  if (/university|college|school|institution/i.test(text)) {
    return p.education?.[0]?.institution || undefined;
  }

  // 10. Compensation
  if (SALARY_RE.test(text)) {
    return p.salaryExpectation?.minimum ? String(p.salaryExpectation.minimum) : p.salaryFloor?.amount ? String(p.salaryFloor.amount) : undefined;
  }

  // 11. EEO voluntary disclosures
  if (/gender|sex\b/i.test(text)) return p.eeo?.gender || undefined;
  if (/veteran/i.test(text)) return p.eeo?.veteranStatus || undefined;
  if (/disability/i.test(text)) return p.eeo?.disabilityStatus || undefined;
  if (/race|ethnicity|hispanic/i.test(text)) return p.eeo?.raceEthnicity || undefined;

  // Strict empty rule: if field not found in profile, return undefined (do NOT hallucinate)
  return undefined;
}

export function planFill(fields: FieldInfo[], ctx: ApplyContext) {
  const answers = new Map<string, string>();
  for (const a of ctx.profile.answerBank) if (a.reusable) answers.set(a.key, a.answer);
  for (const [k, v] of Object.entries(ctx.extraAnswers)) answers.set(k, v);

  const fills: Fill[] = [];
  const unknown: TaskQuestion[] = [];
  const salary: TaskQuestion[] = [];
  const groups = new Map<string, FieldInfo[]>();
  const ask = (f: FieldInfo, label: string): TaskQuestion => ({
    key: questionKey(label),
    label,
    type: f.tag === 'textarea' ? 'textarea' : f.tag === 'select' ? 'select' : f.type === 'file' ? 'file' : 'text',
    options: f.options.length ? f.options : undefined,
    required: f.required,
    isSalary: SALARY_RE.test(label) || undefined,
  });

  for (const f of fields) {
    if (f.type === 'radio' || f.type === 'checkbox') {
      const k = f.name || `field-${f.idx}`;
      groups.set(k, [...(groups.get(k) ?? []), f]);
      continue;
    }
    const label = f.label || f.name;
    if (f.type === 'file') {
      if (/resume|cv|curriculum/i.test(`${label} ${f.name}`) && ctx.app.documents?.cvPdfPath) {
        fills.push({ idx: f.idx, kind: 'file', value: ctx.app.documents.cvPdfPath });
      } else if (f.required) unknown.push(ask(f, label));
      continue;
    }
    const known = knownValue(f, ctx);
    const value = known ?? answers.get(questionKey(label));
    if (value) {
      fills.push({ idx: f.idx, kind: f.tag === 'select' ? 'select' : 'text', value });
      continue;
    }
    if (SALARY_RE.test(label)) salary.push(ask(f, label));
    else if (f.required) unknown.push(ask(f, label));
  }

  for (const [name, group] of groups) {
    const label = group[0].groupLabel || (group.length === 1 ? group[0].label : name);
    const saved = answers.get(questionKey(label));
    if (saved) {
      const target =
        group.find((g) => normalizeText(g.label) === normalizeText(saved)) ??
        (group.length === 1 && /^(yes|true|agree|i agree)$/i.test(saved) ? group[0] : undefined);
      if (target) {
        fills.push({ idx: target.idx, kind: 'check', value: 'on' });
        continue;
      }
    }
    if (group.some((g) => g.required)) {
      const q: TaskQuestion = {
        key: questionKey(label),
        label,
        type: group[0].type === 'radio' ? 'radio' : 'checkbox',
        options: group.map((g) => g.label),
        required: true,
      };
      (SALARY_RE.test(label) ? salary : unknown).push({ ...q, isSalary: SALARY_RE.test(label) || undefined });
    }
  }
  return { fills, unknown, salary };
}

async function executeFill(page: Page, fills: Fill[]): Promise<void> {
  for (const f of fills) {
    const loc = page.locator(`[data-javi-idx="${f.idx}"]`);
    if (f.kind === 'file') await loc.setInputFiles(f.value);
    else if (f.kind === 'select') await loc.selectOption({ label: f.value }).catch(() => loc.selectOption(f.value));
    else if (f.kind === 'check') await loc.check({ force: true });
    else await loc.fill(f.value);
    await page.waitForTimeout(200);
  }
}

export const formAdapter: ChannelAdapter = {
  channel: 'form',
  async apply(ctx): Promise<AdapterResult> {
    const formUrl = ctx.job.applyMethod.formUrl ?? ctx.job.url;
    const needs = (reason: NeedsReason, detail: string, extra: { questions?: TaskQuestion[]; payload?: Record<string, unknown> } = {}): AdapterResult => ({
      status: 'needs_user',
      reason,
      detail,
      questions: extra.questions,
      payload: { openUrl: formUrl, coverLetter: ctx.app.documents?.coverLetter, cvPdfPath: ctx.app.documents?.cvPdfPath, ...extra.payload },
    });

    await assertPublicUrl(formUrl);
    const browser = await getBrowser();
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await page.goto(formUrl, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      await page.waitForTimeout(1500);

      if (await page.locator(CAPTCHA).count()) {
        return needs('captcha', 'This form has a CAPTCHA, which JAVI will not bypass. Open the link and apply with the prepared CV and letter, then mark it done.');
      }
      if (await page.locator('input[type="password"]').count()) {
        return needs('login_wall', 'This site wants you to log in. Apply there yourself with the prepared CV and letter, then mark it done.');
      }

      const fields = await collectFields(page);
      if (!fields.some((f) => f.type === 'file' || /e-?mail/i.test(f.label))) {
        return needs('no_form_found', 'No application form was found on this page (it may be a listing that links elsewhere). Open it and apply, then mark it done.');
      }

      const plan = planFill(fields, ctx);
      if (plan.salary.length) return needs('salary_question', 'The form asks about salary. Tell JAVI what to answer for this role.', { questions: plan.salary });
      if (plan.unknown.length) return needs('unknown_question', 'The form asks questions JAVI has not seen before. Answer once; they are saved for next time.', { questions: plan.unknown });

      await executeFill(page, plan.fills);
      const before = await storagePath('screenshots', `${ctx.userId}-${ctx.app.id}-${Date.now()}-filled.png`);
      await page.screenshot({ path: before, fullPage: true });

      const submit = page
        .locator('button[type="submit"], input[type="submit"]')
        .or(page.getByRole('button', { name: /submit|apply/i }))
        .first();
      if (!(await submit.count())) {
        return needs('no_form_found', 'The form was filled but no submit button was found. Please finish it yourself.', { payload: { screenshotPath: before } });
      }

      await Promise.all([page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined), submit.click()]);
      await page.waitForTimeout(2500);
      const bodyText = await page.locator('body').innerText().catch(() => '');
      if (SUCCESS_RE.test(bodyText)) return { status: 'sent', detail: 'form submitted', screenshotPath: before };

      const after = await storagePath('screenshots', `${ctx.userId}-${ctx.app.id}-${Date.now()}-after.png`);
      await page.screenshot({ path: after, fullPage: true });
      return needs('confirm_submission', 'JAVI clicked submit but could not confirm it went through. Check for a confirmation email before trying again.', {
        payload: { screenshotPath: after },
      });
    } finally {
      await context.close();
    }
  },
};
