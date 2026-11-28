import { z } from 'zod';
import { isDupKey } from '../lib/http';
import { assertPublicUrl, fetchText } from '../lib/net';
import { getBrowser } from '../lib/browser';
import { getLiveContext } from '../lib/liveBrowser';
import { env } from '../config/env';
import { clip, dedupeHashOf, fingerprintOf, safeHost } from '../lib/normalize';
import { decodeEntities, htmlToText } from '../lib/text';
import type { RawJob } from '../sources/types';
import type { Channel } from '../models/application.model';
import { completeJson, llmEnabled, optStr } from './documents/llm';
import { JobPost, type IJobPost, type JobPostDoc } from '../models/jobPost.model';

const PLATFORM_HOSTS: [RegExp, string][] = [
  [/(^|\.)linkedin\.com$/, 'linkedin'],
  [/(^|\.)upwork\.com$/, 'upwork'],
  [/(^|\.)indeed\.com$/, 'indeed'],
  [/(^|\.)jobberman\.com$/, 'jobberman'],
  [/(^|\.)fiverr\.com$/, 'fiverr'],
  [/(^|\.)glassdoor\.com$/, 'glassdoor'],
];

const APPLY_EMAIL_PATTERNS = [
  /(?:send|forward|submit|email|mail)[^.\n]{0,80}?(?:cv|cvs|resume|résumé|application|applications)[^.\n]{0,80}?([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i,
  /(?:apply|applications?)[^.\n]{0,60}?([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i,
];

/** Finds "send your CV to hr@company.com" style instructions, common on Nigerian job boards. */
export function extractApplyEmail(text: string): string | undefined {
  for (const re of APPLY_EMAIL_PATTERNS) {
    const hit = text.match(re)?.[1];
    if (hit && !/no-?reply|example\.(com|org)/i.test(hit)) return hit.toLowerCase();
  }
  return undefined;
}

export function detectApplyMethod(raw: RawJob): IJobPost['applyMethod'] {
  if (raw.applyEmail) return { type: 'email', email: raw.applyEmail.toLowerCase() };
  const email = extractApplyEmail(raw.description ?? '');
  if (email) return { type: 'email', email };
  const url = raw.applyUrl ?? raw.url;
  const platform = PLATFORM_HOSTS.find(([re]) => re.test(safeHost(url)))?.[1];
  if (platform) return { type: 'platform', platform, formUrl: url };
  if (/^https?:\/\//.test(url)) return { type: 'form', formUrl: url };
  return { type: 'unknown' };
}

export function pickChannel(job: Pick<IJobPost, 'applyMethod'>): Channel {
  if (job.applyMethod.type === 'email') return 'email';
  if (job.applyMethod.type === 'form') return 'form';
  return 'assisted';
}

const MAX_AGE_DAYS = 30;

/** Normalize + dedupe. Returns isNew=false when the posting was already stored. */
export async function upsertJob(raw: RawJob): Promise<{ job: JobPostDoc; isNew: boolean } | null> {
  if (raw.postedAt && Date.now() - raw.postedAt.getTime() > MAX_AGE_DAYS * 864e5) return null;
  const company = clip(raw.company, 200) || 'Unknown';
  const title = clip(raw.title, 300);
  if (!title || !raw.url) return null;

  const dedupeHash = dedupeHashOf(company, title, raw.url);
  const existing = await JobPost.findOne({ dedupeHash });
  if (existing) return { job: existing, isNew: false };

  try {
    const job = await JobPost.create({
      source: raw.source,
      sourceId: raw.sourceId,
      url: raw.url,
      company,
      title,
      location: clip(raw.location, 200) || undefined,
      remote: raw.remote ?? null,
      description: clip(raw.description, 20_000),
      salary: raw.salary ?? null,
      postedAt: raw.postedAt,
      applyMethod: detectApplyMethod(raw),
      tags: raw.tags ?? [],
      dedupeHash,
      fingerprint: fingerprintOf(company, title),
    });
    return { job, isNew: true };
  } catch (err) {
    if (!isDupKey(err)) throw err;
    const job = await JobPost.findOne({ dedupeHash });
    return job ? { job, isNew: false } : null;
  }
}

const Extracted = z.object({ title: optStr, company: optStr, location: optStr, apply_email: optStr });

/**
 * "Paste a job link": fetch the page and pull out title/company/location/apply email.
 * Every value the model returns must literally appear on the page, or it is dropped.
 * Login-walled pages (LinkedIn) will usually fail here; the user then types the fields.
 */
export async function extractJobFromUrl(url: string, renderedHtml?: string): Promise<Partial<RawJob>> {
  const html = renderedHtml ?? (await fetchText(url));
  const meta = (prop: string) =>
    html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']+)`, 'i'))?.[1];
  const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
  const text = htmlToText(html.replace(/<(nav|header|footer)[\s\S]*?<\/\1>/gi, ' ')).slice(0, 15_000);
  const base: Partial<RawJob> = {
    title: decodeEntities(meta('og:title') ?? titleTag ?? '').trim() || undefined,
    company: meta('og:site_name'),
    description: text,
    applyEmail: extractApplyEmail(text),
  };
  if (!llmEnabled()) return base;

  try {
    const x = await completeJson(Extracted, {
      system: 'You extract fields from job posting text. Copy values exactly as written. Use null when a field is not present. Never guess.',
      prompt: `PAGE TEXT:\n${text}\n\nReturn {"title": str|null, "company": str|null, "location": str|null, "apply_email": str|null}`,
      maxTokens: 300,
    });
    const onPage = (v?: string) => (v && text.toLowerCase().includes(v.toLowerCase()) ? v : undefined);
    return {
      ...base,
      title: onPage(x.title) ?? base.title,
      company: onPage(x.company) ?? base.company,
      location: onPage(x.location),
      applyEmail: onPage(x.apply_email) ?? base.applyEmail,
    };
  } catch {
    return base;
  }
}

/** Pages that answered with a bot check or a sign-in wall instead of the posting. */
export function looksBlocked(html: string): boolean {
  const title = (html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? '').toLowerCase();
  if (/just a moment|security check|attention required|access denied|verify you are human|are you a robot|blocked|captcha/.test(title)) return true;
  return htmlToText(html).length < 400;
}

/** Many job pages (Workday, Ashby, Lever SPAs) render the posting with JavaScript; a plain fetch gets a shell. */
async function renderHtml(url: string): Promise<string> {
  await assertPublicUrl(url);
  const browser = await getBrowser();
  const context = await browser.newContext({ locale: 'en-GB', viewport: { width: 1366, height: 900 } });
  try {
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
    return await page.content();
  } finally {
    await context.close();
  }
}

/**
 * Sites like Indeed and LinkedIn turn away servers and headless browsers. The JAVI window is the user's own
 * visible browser with their sign-ins, so the page loads exactly as it does for them. Opens a tab, reads, closes it.
 */
async function renderInLiveBrowser(url: string): Promise<string> {
  if (env.APPLY_BROWSER !== 'live') throw new Error('The JAVI browser is off (APPLY_BROWSER=headless)');
  await assertPublicUrl(url);
  const context = await getLiveContext();
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
    // A bot check that clears by itself (Cloudflare's "Just a moment") needs a few seconds.
    for (let i = 0; i < 6 && looksBlocked(await page.content()); i++) await page.waitForTimeout(1500);
    return await page.content();
  } finally {
    await page.close().catch(() => undefined);
  }
}

/**
 * Reads a job page the way a person would: a plain request first, then a browser, then the user's own
 * JAVI window for sites that block both. Throws only when every way failed; the message says why.
 */
export async function readJobPage(url: string): Promise<Partial<RawJob>> {
  const reasons: string[] = [];
  const good = (f: Partial<RawJob> | null) => !!f?.title && (f.description ?? '').length >= 600;
  let best: Partial<RawJob> = {};
  const keep = (f: Partial<RawJob> | null) => {
    if (f && (f.description ?? '').length > (best.description ?? '').length) best = { ...best, ...Object.fromEntries(Object.entries(f).filter(([, v]) => v)) };
  };

  try {
    const html = await fetchText(url);
    if (!looksBlocked(html)) keep(await extractJobFromUrl(url, html));
    else reasons.push('the site blocked a direct request');
  } catch (err) {
    reasons.push(err instanceof Error ? err.message : String(err));
  }
  if (good(best)) return best;

  for (const [name, render] of [['browser', renderHtml], ['JAVI window', renderInLiveBrowser]] as const) {
    try {
      const html = await render(url);
      if (looksBlocked(html)) {
        reasons.push(`the ${name} was shown a bot check`);
        continue;
      }
      keep(await extractJobFromUrl(url, html));
      if (good(best)) return best;
    } catch (err) {
      reasons.push(`${name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (best.title) return best;
  throw new Error(reasons.join('; ') || 'the page had no job posting on it');
}

/**
 * A pasted link → a saved job with the full posting text, ready for matching and CV tailoring.
 * Falls back to rendering in a browser when the fetched page has too little text to tailor against.
 */
export async function jobFromLink(url: string): Promise<{ job: JobPostDoc; isNew: boolean; rendered: boolean }> {
  const found = await readJobPage(url).catch(() => ({}) as Partial<RawJob>);
  const rendered = !!found.description;
  const result = await upsertJob({
    source: 'link',
    url,
    title: found.title || 'Position from link',
    company: found.company || safeHost(url) || 'Company',
    location: found.location,
    description: found.description ?? '',
    applyEmail: found.applyEmail,
    applyUrl: url,
    postedAt: new Date(),
  });
  if (!result) throw new Error('Could not save this job');
  return { ...result, rendered };
}
