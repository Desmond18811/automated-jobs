import type { Page } from 'playwright';
import { getBrowser } from '../lib/browser';
import { assertPublicUrl } from '../lib/net';
import { normalizeText, questionKey } from '../lib/normalize';
import { storagePath } from '../lib/storage';
import type { NeedsReason, TaskQuestion } from '../models/task.model';
import type { AdapterResult, ApplyContext, ChannelAdapter } from './types';
import { formDryRun } from '../services/safety.service';

/**
 * Fills career-page forms (Greenhouse, Lever, Ashby, Workable and plain HTML forms).
 * Rules: never solve or bypass a CAPTCHA, never guess an answer. This headless adapter never logs in;
 * the live browser (adapters/live) may sign in or create accounts, with per-site encrypted passwords.
 * Anything unknown becomes a "needs you" task; the saved answer is reused next time.
 */

export interface FieldInfo {
  idx: number; tag: string; type: string; label: string; groupLabel: string;
  required: boolean; options: string[]; name: string;
}
export interface Fill { idx: number; kind: 'text' | 'select' | 'file' | 'check'; value: string }

export const CAPTCHA = 'iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="challenges.cloudflare.com"], .g-recaptcha, .h-captcha, .cf-turnstile';
export const SALARY_RE = /salary|compensation|remuneration|pay expectation|expected pay|desired pay|\bctc\b|rate expectation/i;
export const SUCCESS_RE = /thank you|thanks for applying|application (has been )?(received|submitted)|we('ve| have) received your application/i;

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

/** Profile enum values in the words application forms actually use. Order = preference. */
const ENUM_WORDS: Record<string, string[]> = {
  high_school: ['high school', 'secondary', 'ged'],
  associate: ['associate'],
  bachelor: ["bachelor's", 'bachelor', 'bsc', 'ba ', 'b.s', 'undergraduate'],
  master: ["master's", 'master', 'msc', 'mba', 'm.s'],
  doctorate: ['doctorate', 'phd', 'doctoral'],
  bootcamp: ['bootcamp', 'certificate', 'vocational'],
  self_taught: ['self-taught', 'self taught', 'other'],
  male: ['male', 'man'],
  female: ['female', 'woman'],
  non_binary: ['non-binary', 'nonbinary', 'non binary'],
  other: ['other', 'self-describe'],
  hispanic_latino: ['hispanic', 'latino', 'latina', 'latinx'],
  white: ['white'],
  black_african_american: ['black', 'african american'],
  asian: ['asian'],
  native_american: ['native american', 'american indian', 'alaska native'],
  two_or_more: ['two or more', 'multiracial', 'mixed'],
  veteran: ['i am a veteran', 'protected veteran', 'identify as one or more', 'yes'],
  not_veteran: ['not a protected veteran', 'i am not a veteran', 'not a veteran', 'no'],
  yes: ['yes', 'i have a disability', 'have a disability'],
  no: ['no', "i don't have a disability", 'do not have a disability', 'no, i do not'],
  decline: ['decline', "don't wish", 'do not wish', 'prefer not', 'not to answer', 'choose not', 'not to disclose'],
  none: ['none', 'no clearance', 'no'],
  confidential: ['confidential'],
  secret: ['secret'],
  top_secret: ['top secret', 'ts/sci'],
};

/** Human-readable text for free-text inputs (enum value → first form word). */
function humanize(value: string): string {
  const words = ENUM_WORDS[value];
  if (!words) return value;
  if (value === 'decline') return 'Prefer not to say';
  const w = words[0].trim();
  return w.charAt(0).toUpperCase() + w.slice(1);
}

/**
 * Pick the select/radio option that means `value`. Tries an exact match, then the enum's form
 * words, then plain containment. Returns undefined rather than guessing.
 */
export function matchOption(value: string, options: string[]): string | undefined {
  const norm = (x: string) => ` ${x.toLowerCase().replace(/\s+/g, ' ').trim()} `;
  const opts = options.filter((o) => o && !/^(select|choose|--|please select)/i.test(o.trim()));
  const exact = opts.find((o) => norm(o) === norm(value) || norm(o) === norm(humanize(value)));
  if (exact) return exact;
  for (const w of ENUM_WORDS[value] ?? []) {
    // "no" must not match "not a protected veteran", so short words need word boundaries.
    const re = w.length <= 3 ? new RegExp(`\\b${w.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i') : null;
    // A positive answer must not land on a negated option ("I am NOT a protected veteran").
    const negated = (o: string) => /\bnot\b|n't|\bno,/i.test(o) && !/\bnot\b|n't|\bno\b/i.test(w);
    const hit = opts.find((o) => !negated(o) && (re ? re.test(o) : norm(o).includes(w)));
    if (hit) return hit;
  }
  return opts.find((o) => norm(o).includes(norm(value).trim()) || norm(value).includes(norm(o).trim()));
}

/** Years with one named skill, for "How many years of experience do you have with React?". */
function skillYears(text: string, ctx: ApplyContext): string | undefined {
  const m = text.match(/\b(?:with|in|using)\s+([^?*]{1,40}?)\s*[?*]*\s*$/i);
  if (!m) return undefined;
  const asked = m[1].replace(/\?|\*/g, '').trim().toLowerCase();
  const skill = ctx.profile.skills?.find((s) => s.years != null && (asked.startsWith(s.name.toLowerCase()) || s.name.toLowerCase() === asked));
  return skill ? String(skill.years) : undefined;
}

export function knownValue(f: FieldInfo, ctx: ApplyContext): string | undefined {
  const p = ctx.profile;
  const label = (f.groupLabel || f.label).toLowerCase().trim();
  const name = f.name.toLowerCase().trim();
  const text = `${label} ${name}`;
  // Anchored patterns test the label and the name separately; the combined string only matches
  // `^` at the label's start, so `name="country"` with a label like "Country of residence *" still hits.
  const either = (re: RegExp) => re.test(label) || re.test(name);
  const [first = '', ...rest] = (p.fullName ?? '').split(/\s+/);
  const link = (re: RegExp) => p.links?.find((l) => re.test(l.label) || re.test(l.url))?.url;
  const yesNo = (b: boolean | undefined) => (b === undefined ? undefined : b ? 'Yes' : 'No');

  // 1. Cover letter / why us / statement
  if (f.tag === 'textarea' && /cover letter|why .*(join|work|interested)|statement|additional info/i.test(text)) {
    return ctx.app.documents?.coverLetter || ctx.app.documents?.proposal;
  }

  // 2. Personal contact info
  if (/first.?name|given name/i.test(text)) return p.firstName || first || undefined;
  if (/last.?name|surname|family name/i.test(text)) return p.lastName || (rest.length ? rest.join(' ') : undefined);
  if (/full.?name|your name/i.test(text) || either(/^name\b/i)) return p.fullName || (p.firstName && p.lastName ? `${p.firstName} ${p.lastName}` : undefined);
  if (/e-?mail/i.test(text)) return p.email || undefined;
  if (/phone|mobile|telephone/i.test(text)) return p.phone || undefined;
  if (/pronoun/i.test(text)) return p.pronouns || undefined;

  // 3. Socials & Portfolios (including LinkedIn)
  if (/linkedin|linked in/i.test(text)) return p.linkedinUrl || link(/linkedin/i) || undefined;
  if (/github|git repository|code sample/i.test(text)) return p.githubUrl || link(/github/i) || undefined;
  if (/twitter|x\.com/i.test(text)) return p.twitterUrl || link(/twitter|x\.com/i) || undefined;
  if (/portfolio|personal (site|website)|work sample/i.test(text) || either(/^website\b/i)) return p.portfolioUrl || link(/portfolio|website|site/i) || undefined;

  // 4. Headline & Summary
  if (/headline|professional summary|\bbio\b|about (you|me)/i.test(text)) return p.summary || p.headline || undefined;
  if (/^(skills|technologies|proficiencies)\b/i.test(label)) return p.primarySkills?.join(', ') || undefined;

  // 5. Address & Location
  if (/street (address)?|address line 1/i.test(text)) return p.address?.street || undefined;
  if (/(zip|postal) code|postcode/i.test(text)) return p.address?.postalCode || undefined;
  if (either(/^(state|province|region)\b/i)) return p.address?.state || undefined;
  if (either(/^country\b/i) || /country of residence/i.test(text)) return p.address?.country || undefined;
  if (either(/^(location|city)\b/i) || /current location|where are you based|current city/i.test(text)) return p.address?.city || p.location || undefined;
  if (/relocat/i.test(text)) return yesNo(p.willingToRelocate);

  // 6. Work authorization & Legal eligibility
  if (/authori[sz]ed to work|legal.*authori[sz]|right to work|eligible to work/i.test(text)) {
    if (p.workAuthorization === 'authorized') return 'Yes';
    if (p.workAuthorization === 'not_authorized') return 'No';
    return undefined;
  }
  if (/(future|will you).{0,40}sponsor/i.test(text)) return yesNo(p.futureSponsorship);
  if (/require.*sponsor|visa sponsor|need.*sponsor/i.test(text)) return yesNo(p.requiresSponsorship);
  if (/security clearance/i.test(text)) return p.securityClearance ? humanize(p.securityClearance) : undefined;

  // 7. Availability & Notice
  if (/start date|earliest.*start|when can you start/i.test(text)) return p.earliestStartDate || undefined;
  if (/notice period/i.test(text)) return p.noticePeriod || undefined;

  // 8. Experience, current company & title
  if (/years of (work |professional |relevant )?experience|total experience/i.test(text) && !/(with|in|using)\s+\w/i.test(label.replace(/experience\s+in\s+(total|the industry)/i, ''))) {
    return p.yearsOfExperience !== undefined ? String(p.yearsOfExperience) : undefined;
  }
  if (/years?\b/i.test(text) && /experience|used|using|worked/i.test(text)) {
    const y = skillYears(label, ctx);
    if (y) return y;
  }
  if (/current (job )?title|current role|present role/i.test(text)) return p.currentTitle || undefined;
  if (/current (employer|company)|present company/i.test(text)) return p.currentCompany || undefined;

  // 9. Education (institution first: "School / University" labels often also say "degree")
  if (/highest (level of )?education|education level|highest degree/i.test(text)) return p.highestEducationLevel || undefined;
  if (/university|college|school|institution/i.test(text)) return p.education?.[0]?.institution || undefined;
  if (either(/^degree\b/i)) return p.education?.[0]?.degree || undefined;
  if (/field of study|major|discipline/i.test(text)) return p.education?.[0]?.field || undefined;

  // 10. Compensation
  if (SALARY_RE.test(text)) {
    return p.salaryExpectation?.minimum ? String(p.salaryExpectation.minimum) : p.salaryFloor?.amount ? String(p.salaryFloor.amount) : undefined;
  }

  // 11. EEO voluntary disclosures
  if (/gender|\bsex\b/i.test(text)) return p.eeo?.gender || undefined;
  if (/veteran/i.test(text)) return p.eeo?.veteranStatus || undefined;
  if (/disabilit/i.test(text)) return p.eeo?.disabilityStatus || undefined;
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
    // Passwords are handled by the sign-in/sign-up logic and are never asked for over WhatsApp.
    if (f.type === 'password') continue;
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
    const raw = known ?? answers.get(questionKey(label));
    // Selects must resolve to an actual option; if none means our value, ask instead of picking one.
    const value = !raw ? undefined : f.tag === 'select' ? matchOption(raw, f.options) : f.tag === 'textarea' ? raw : humanize(raw);
    if (value) {
      fills.push({ idx: f.idx, kind: f.tag === 'select' ? 'select' : 'text', value });
      continue;
    }
    if (SALARY_RE.test(label)) salary.push(ask(f, label));
    else if (f.required) unknown.push(ask(f, label));
  }

  for (const [name, group] of groups) {
    const label = group[0].groupLabel || (group.length === 1 ? group[0].label : name);
    // Radio groups ("Are you authorized to work…?" Yes / No) can be answered from the profile too.
    if (group[0].type === 'radio' && group.length > 1) {
      const fromProfile = knownValue({ ...group[0], label, groupLabel: label }, ctx);
      const option = fromProfile ? matchOption(fromProfile, group.map((g) => g.label)) : undefined;
      const target = option ? group.find((g) => g.label === option) : undefined;
      if (target) {
        fills.push({ idx: target.idx, kind: 'check', value: 'on' });
        continue;
      }
    }
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

export async function executeFill(page: Page, fills: Fill[]): Promise<void> {
  for (const f of fills) {
    const loc = page.locator(`[data-javi-idx="${f.idx}"]`);
    if (f.kind === 'file') await loc.setInputFiles(f.value);
    else if (f.kind === 'select') await loc.selectOption({ label: f.value });
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

      // Dry-run: the user's first few form applications stop here for them to check and submit.
      if (await formDryRun(ctx.userId)) {
        return needs('confirm_submission', `Practice run: JAVI filled ${ctx.job.company}'s form but did not submit it. Check the screenshot, then submit it yourself and mark it done.`, {
          payload: { screenshotPath: before, dryRun: true },
        });
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
