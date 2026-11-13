import { normalizeCompany, normalizeText } from '../lib/normalize';
import type { IJobPost } from '../models/jobPost.model';
import type { IProfile, Period } from '../models/profile.model';
import { containsTerm, cosine, termFreq, tokenize } from './tokens';

const GENERIC_TITLE = new Set(['senior', 'junior', 'lead', 'principal', 'staff', 'sr', 'jr', 'mid', 'level', 'i', 'ii', 'iii', 'intern', 'associate', 'head', 'of', 'and']);
/** The "what kind of job" word. The rest of the title (backend, security, product...) is the domain. */
const FUNCTION_WORDS = new Set(['developer', 'analyst', 'manager', 'designer', 'specialist', 'consultant', 'officer', 'administrator', 'architect', 'scientist', 'technician', 'writer', 'assistant', 'coordinator']);
const SYNONYMS: Record<string, string[]> = {
  soc: ['security'], cyber: ['security'], cybersecurity: ['security'], infosec: ['security'],
  sre: ['devops'], ui: ['frontend'], ux: ['design'], ml: ['machine', 'learning'], ai: ['machine', 'learning'],
};

function titleTokens(s: string): Set<string> {
  const t = normalizeText(s)
    .replace(/\bfront ?end\b/g, 'frontend')
    .replace(/\bback ?end\b/g, 'backend')
    .replace(/\bfull ?stack\b/g, 'fullstack')
    .replace(/\b(engineer|programmer|dev)\b/g, 'developer');
  const out = new Set<string>();
  for (const w of t.split(' ')) {
    if (!w || GENERIC_TITLE.has(w)) continue;
    out.add(w);
    for (const syn of SYNONYMS[w] ?? []) out.add(syn);
  }
  return out;
}

/**
 * Title fit (0..1) against the best target role: 70% domain words, 30% function word.
 * "Backend Developer" vs "Senior Backend Engineer" = 1; vs "Frontend Engineer" = 0.3; "Security Analyst" vs "SOC Analyst" = 1.
 */
export function titleScore(title: string, roles: string[]): number {
  const tt = titleTokens(title);
  let best = 0;
  for (const role of roles) {
    const rt = [...titleTokens(role)];
    if (!rt.length) continue;
    const domain = rt.filter((w) => !FUNCTION_WORDS.has(w) && !(SYNONYMS[w] && rt.some((x) => SYNONYMS[w].includes(x))));
    const fn = rt.filter((w) => FUNCTION_WORDS.has(w));
    const d = domain.length ? domain.filter((w) => tt.has(w)).length / domain.length : 1;
    const f = fn.length ? (fn.some((w) => tt.has(w)) ? 1 : 0) : 1;
    best = Math.max(best, 0.7 * d + 0.3 * f);
  }
  return Number(best.toFixed(3));
}

export function toMonthly(amount: number, period: Period = 'month'): number {
  if (period === 'hour') return amount * 160;
  if (period === 'year') return amount / 12;
  return amount;
}

export function profileCorpus(p: IProfile): string {
  return [
    p.headline, p.summary,
    p.skills.map((s) => s.name).join(' '),
    ...p.experience.flatMap((e) => [e.title, ...e.bullets.map((b) => b.text)]),
    ...p.projects.flatMap((pr) => [pr.name, pr.description, ...(pr.skills ?? []), ...pr.bullets.map((b) => b.text)]),
    ...p.certifications.map((c) => c.name),
  ].filter(Boolean).join(' ');
}

/** Cheap, explainable filters that run before any scoring. Missing data never rejects a job. */
export function hardFilter(p: IProfile, j: IJobPost): { pass: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const company = normalizeCompany(j.company);
  if (p.blockedCompanies.some((b) => normalizeCompany(b) === company)) reasons.push('company is on your blocked list');

  if (p.remotePreference === 'remote' && j.remote === false) reasons.push('not remote');
  if (p.remotePreference !== 'remote' && p.locations.length && j.remote !== true && j.location) {
    const loc = normalizeText(j.location);
    if (!p.locations.some((l) => loc.includes(normalizeText(l)))) reasons.push(`location: ${j.location}`);
  }

  if (p.targetRoles.length && titleScore(j.title, p.targetRoles) < 0.5) reasons.push('title outside your target roles');

  const floor = p.salaryFloor;
  const top = j.salary?.max ?? j.salary?.min;
  if (floor?.amount && top && j.salary?.currency && j.salary.currency.toUpperCase() === floor.currency.toUpperCase()) {
    if (toMonthly(top, j.salary.period) < toMonthly(floor.amount, floor.period)) reasons.push('pays below your salary floor');
  }
  return { pass: reasons.length === 0, reasons };
}

/**
 * Score 0..1 = 40% skill overlap + 30% title fit + 30% text similarity.
 * The text part is plain term-frequency cosine; swap in embeddings later (see docs/BUILD_GUIDE.md).
 */
export function scoreMatch(p: IProfile, j: IJobPost): { score: number; breakdown: Record<string, number> } {
  const jobText = `${j.title}\n${j.description}`.toLowerCase();
  const skillHits = p.skills.filter((s) => containsTerm(jobText, s.name)).length;
  const skills = Math.min(1, skillHits / 6);
  const title = p.targetRoles.length ? titleScore(j.title, p.targetRoles) : 0.5;
  const text = Math.min(1, cosine(termFreq(tokenize(profileCorpus(p))), termFreq(tokenize(jobText))) / 0.35);
  const score = Number((0.4 * skills + 0.3 * title + 0.3 * text).toFixed(3));
  return { score, breakdown: { skills, title, text, skillHits } };
}
