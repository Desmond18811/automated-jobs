import { z } from 'zod';
import { containsTerm, tokenize, topTerms } from '../../matching/tokens';
import type { Channel, FactCheck } from '../../models/application.model';
import type { IJobPost } from '../../models/jobPost.model';
import type { Bullet, IProfile } from '../../models/profile.model';
import { renderCvPdf, type CvData } from './cvRenderer';
import { buildVocab, checkFacts, type FactVocab } from './factGuard';
import { completeJson, llmEnabled } from './llm';

const RULES = `You write job application material for ONE candidate, in their own voice (first person).
Hard rules:
1. Use only facts in CANDIDATE_FACTS. Never invent or embellish employers, titles, dates, numbers, metrics, tools, skills, certifications or achievements.
2. If the job asks for something the candidate does not have, do not claim it. You may say once, briefly, that they are keen to learn it.
3. Do not compute totals such as years of experience unless that exact number appears in the facts.
4. Never mention salary, rates or expectations.
5. Be plain and specific. Avoid cliches ("I am writing to express", "passionate", "dynamic", "fast-paced", "team player").`;

// ---------- facts sent to the model (ids let us trace what was used) ----------
function factsFor(p: IProfile) {
  return {
    name: p.fullName,
    headline: p.headline,
    location: p.location,
    summary: p.summary,
    skills: p.skills.map((s) => (s.years ? `${s.name} (${s.years} yrs)` : s.name)),
    experience: p.experience.map((e) => ({
      company: e.company, title: e.title, start: e.start, end: e.current ? 'present' : e.end,
      bullets: e.bullets.map((b) => ({ id: b.id, text: b.text })),
    })),
    projects: p.projects.map((pr) => ({ id: pr.id, name: pr.name, url: pr.url, description: pr.description, bullets: pr.bullets.map((b) => ({ id: b.id, text: b.text })) })),
    education: p.education.map((ed) => ({ institution: ed.institution, degree: ed.degree, field: ed.field, end: ed.end, grade: ed.grade })),
    certifications: p.certifications.map((c) => ({ name: c.name, issuer: c.issuer, year: c.year })),
  };
}

function jobBlock(j: IJobPost): string {
  return `JOB\nCompany: ${j.company}\nTitle: ${j.title}\nLocation: ${j.location ?? 'not stated'}\nDescription:\n${j.description.slice(0, 6000)}`;
}

const feedbackBlock = (feedback?: string[]) =>
  feedback?.length ? `\n\nA previous draft broke the rules. Fix every one of these:\n- ${feedback.join('\n- ')}` : '';

// ---------- tailored CV (deterministic: selects and orders the user's own bullets) ----------
function dateRange(start?: string, end?: string, current?: boolean): string {
  return [start, current ? 'Present' : end].filter(Boolean).join(' – ');
}

export function buildTailoredCv(p: IProfile, j: IJobPost): CvData {
  const jobLower = `${j.title}\n${j.description}`.toLowerCase();
  const keywords = new Set(topTerms(jobLower, 40));
  const skillNames = p.skills.map((s) => s.name);
  const relevance = (text: string) => {
    let s = tokenize(text).filter((t) => keywords.has(t)).length;
    for (const sk of skillNames) if (containsTerm(text, sk) && containsTerm(jobLower, sk)) s += 2;
    return s;
  };
  const pick = (bullets: Bullet[], n: number) =>
    bullets
      .map((b, i) => ({ b, i, s: relevance(b.text) }))
      .sort((x, y) => y.s - x.s || x.i - y.i)
      .slice(0, n)
      .map((x) => x.b.text);

  const matchedSkills = skillNames.filter((s) => containsTerm(jobLower, s));
  return {
    name: p.fullName,
    headline: p.headline,
    contact: [p.email, p.phone, p.location, ...p.links.map((l) => l.url)].filter((x): x is string => Boolean(x)),
    summary: p.summary ?? '',
    skills: [...matchedSkills, ...skillNames.filter((s) => !matchedSkills.includes(s))].slice(0, 20),
    experience: p.experience.map((e, idx) => ({
      company: e.company,
      title: e.title,
      location: e.location,
      dates: dateRange(e.start, e.end, e.current),
      bullets: pick(e.bullets, idx < 3 ? 5 : 3),
    })),
    projects: p.projects
      .map((pr, i) => ({ pr, i, s: relevance([pr.name, pr.description, ...pr.bullets.map((b) => b.text)].join(' ')) }))
      .sort((x, y) => y.s - x.s || x.i - y.i)
      .slice(0, 3)
      .map(({ pr }) => ({ name: pr.name, url: pr.url, bullets: pick(pr.bullets, 3) })),
    education: p.education.map((ed) => ({
      line: [ed.degree, ed.field].filter(Boolean).join(', ') || ed.institution,
      sub: [ed.degree || ed.field ? ed.institution : undefined, dateRange(ed.start, ed.end), ed.grade].filter(Boolean).join(' · '),
    })),
    certifications: p.certifications.map((c) => [c.name, c.issuer, c.year].filter(Boolean).join(', ')),
  };
}

// ---------- model calls ----------
const SummaryOut = z.object({ summary: z.string().min(20).max(600) });
const ApplicationOut = z.object({
  email_subject: z.string().min(3).max(140),
  email_body: z.string().min(40),
  cover_letter: z.string().min(80),
  used_fact_ids: z.array(z.string()).default([]),
});
const ProposalOut = z.object({ proposal: z.string().min(60), used_fact_ids: z.array(z.string()).default([]) });

async function writeSummary(p: IProfile, j: IJobPost, feedback?: string[]) {
  const out = await completeJson(SummaryOut, {
    system: RULES,
    maxTokens: 400,
    prompt: `${jobBlock(j)}\n\nCANDIDATE_FACTS:\n${JSON.stringify(factsFor(p))}\n\nWrite a CV summary of 2 to 3 sentences (under 60 words), CV style without "I", aimed at this job.${feedbackBlock(feedback)}\nReturn {"summary": "..."}.`,
  });
  return out.summary;
}

async function writeApplication(p: IProfile, j: IJobPost, feedback?: string[]) {
  return completeJson(ApplicationOut, {
    system: RULES,
    maxTokens: 1500,
    prompt: `${jobBlock(j)}\n\nCANDIDATE_FACTS:\n${JSON.stringify(factsFor(p))}\n\nWrite:
- email_subject: the job title and the candidate's name, short.
- email_body: 90 to 160 words. Greet the hiring team (use a person's name only if the job post gives one). Name the role, give one concrete reason the candidate fits, two specific proof points from the facts, mention the attached CV, and end with a simple request for a conversation. No sign-off or contact details; they are added automatically.
- cover_letter: 220 to 320 words, same rules, more depth. No sign-off.
- used_fact_ids: ids of the bullets and projects you relied on.${feedbackBlock(feedback)}`,
  });
}

async function writeProposal(p: IProfile, j: IJobPost, feedback?: string[]) {
  return completeJson(ProposalOut, {
    system: RULES,
    maxTokens: 1000,
    prompt: `${jobBlock(j)}\n\nCANDIDATE_FACTS:\n${JSON.stringify(factsFor(p))}\n\nWrite an Upwork-style proposal of 120 to 220 words: open with the client's problem in one sentence, outline how the candidate would approach it in two or three short steps, give one relevant proof point from the facts, and end with one clarifying question. No greeting cliches, no sign-off.${feedbackBlock(feedback)}`,
  });
}

/** Runs a generator, fact-checks the result, and regenerates once with the problems listed. */
async function guarded<T>(gen: (feedback?: string[]) => Promise<T>, texts: (t: T) => (string | undefined)[], vocab: FactVocab) {
  let value = await gen();
  let check = checkFacts(texts(value), vocab);
  if (!check.passed) {
    value = await gen(check.blocking);
    check = checkFacts(texts(value), vocab);
  }
  return { value, check };
}

function signOff(p: IProfile): string {
  const lines = [p.fullName, p.phone, ...p.links.slice(0, 2).map((l) => l.url)].filter(Boolean);
  return `\n\nBest regards,\n${lines.join('\n')}`;
}

export interface GeneratedDocs {
  emailSubject?: string;
  emailBody?: string;
  coverLetter?: string;
  proposal?: string;
  cvSummary: string;
  cvPdfPath: string;
  usedFactIds: string[];
  factCheck: FactCheck;
}

/** Everything for one application. fileStem must start with the userId. */
export async function generateDocuments(p: IProfile, j: IJobPost, channel: Channel, fileStem: string): Promise<GeneratedDocs> {
  if (!llmEnabled()) throw new Error('LLM is not configured (set OPENROUTER_API_KEY or ANTHROPIC_API_KEY); drafts cannot be generated');
  const vocab = buildVocab(p, j);
  const cv = buildTailoredCv(p, j);

  const summary = await guarded((fb) => writeSummary(p, j, fb), (s) => [s], vocab);
  const extraWarnings: string[] = [];
  if (summary.check.passed) cv.summary = summary.value;
  else extraWarnings.push('The tailored CV summary failed the fact check, so your saved summary was used instead.');

  const cvPdfPath = await renderCvPdf(cv, fileStem);
  const freelance = channel === 'assisted' && j.applyMethod.platform === 'upwork';

  if (freelance) {
    const { value, check } = await guarded((fb) => writeProposal(p, j, fb), (v) => [v.proposal], vocab);
    return {
      proposal: value.proposal,
      cvSummary: cv.summary,
      cvPdfPath,
      usedFactIds: value.used_fact_ids,
      factCheck: { ...check, warnings: [...check.warnings, ...extraWarnings] },
    };
  }

  const { value, check } = await guarded(
    (fb) => writeApplication(p, j, fb),
    (v) => [v.email_subject, v.email_body, v.cover_letter],
    vocab,
  );
  return {
    emailSubject: value.email_subject,
    emailBody: value.email_body.trim() + signOff(p),
    coverLetter: value.cover_letter.trim() + signOff(p),
    cvSummary: cv.summary,
    cvPdfPath,
    usedFactIds: value.used_fact_ids,
    factCheck: { ...check, warnings: [...check.warnings, ...extraWarnings] },
  };
}
