import { SKILL_TERMS } from '../../matching/skills';
import { containsTerm } from '../../matching/tokens';
import type { FactCheck } from '../../models/application.model';
import type { IJobPost } from '../../models/jobPost.model';
import type { IProfile } from '../../models/profile.model';

/**
 * FACT GUARD
 * The model may only use facts stored in the profile. The prompt says so, and this deterministic
 * check enforces it on the output, because prompts alone are not a guarantee:
 *   1. every number must exist in the profile or the job post
 *   2. every skill/tool term must exist in the profile (job-only terms become warnings)
 *   3. every capitalized name must exist in the profile or the job post
 * Blocking issues stop a draft from being approved. Warnings stop auto-approval only.
 * Known gaps: spelled-out numbers ("five years") and lowercase claims outside SKILL_TERMS.
 */

const NUMBER_RE = /\d[\d,]*(?:\.\d+)?/g;
const SKILL_SET = new Set(SKILL_TERMS);

const COMMON_CAPS = new Set(
  `i i'm i've i'd i'll dear hello hi thank thanks regards best sincerely kind warm yours hiring manager managers team recruiter recruiting
  please attached cv resume linkedin github portfolio email phone application role
  monday tuesday wednesday thursday friday saturday sunday january february march april may june july august september october november december
  the a an my your this that these those as in on at for with and but or so if when while during over after before since from to of by
  it its our we we're they their there here what why how who which would could should will can also both each every most many
  having being working building leading currently previously recently together looking keen happy glad excited`.split(/\s+/),
);

export interface FactVocab {
  profileText: string;
  profileWords: Set<string>;
  jobText: string;
  jobWords: Set<string>;
  expected: Set<string>;
  numbers: Set<string>;
}

const wordsOf = (s: string): Set<string> =>
  new Set(s.toLowerCase().split(/[^a-z0-9+#.]+/).map((w) => w.replace(/^\.+|\.+$/g, '')).filter(Boolean));
const numbersOf = (s: string): Set<string> => new Set((s.match(NUMBER_RE) ?? []).map((n) => n.replace(/,/g, '')));

export function profileFactsText(p: IProfile): string {
  return [
    p.fullName, p.headline, p.email, p.phone, p.location, p.summary,
    ...p.links.flatMap((l) => [l.label, l.url]),
    ...p.skills.map((s) => `${s.name} ${s.years ?? ''}`),
    ...p.experience.flatMap((e) => [e.company, e.title, e.location, e.start, e.end, ...e.bullets.map((b) => b.text)]),
    ...p.education.flatMap((e) => [e.institution, e.degree, e.field, e.start, e.end, e.grade]),
    ...p.projects.flatMap((pr) => [pr.name, pr.url, pr.description, ...(pr.skills ?? []), ...pr.bullets.map((b) => b.text)]),
    ...p.certifications.flatMap((c) => [c.name, c.issuer, c.year]),
    ...p.answerBank.filter((a) => a.reusable).map((a) => a.answer),
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildVocab(p: IProfile, j: IJobPost): FactVocab {
  const profileText = profileFactsText(p);
  const jobText = [j.company, j.title, j.location, j.description].filter(Boolean).join('\n');
  return {
    profileText: profileText.toLowerCase(),
    profileWords: wordsOf(profileText),
    jobText: jobText.toLowerCase(),
    jobWords: wordsOf(jobText),
    expected: wordsOf(`${j.company} ${j.title} ${j.location ?? ''}`),
    numbers: new Set([...numbersOf(profileText), ...numbersOf(jobText)]),
  };
}

export function checkFacts(texts: (string | undefined)[], v: FactVocab): FactCheck {
  const blocking = new Set<string>();
  const warnings = new Set<string>();
  const text = texts.filter(Boolean).join('\n\n').replace(/[’‘]/g, "'");

  for (const n of numbersOf(text)) {
    if (!v.numbers.has(n)) blocking.add(`The number "${n}" is not in your profile or the job post.`);
  }

  const lower = text.toLowerCase();
  for (const term of SKILL_TERMS) {
    if (!containsTerm(lower, term) || containsTerm(v.profileText, term)) continue;
    if (containsTerm(v.jobText, term)) {
      warnings.add(`Mentions "${term}" from the job post, which is not in your profile. Check it is not claimed as your experience.`);
    } else {
      blocking.add(`Mentions "${term}", which is not in your profile.`);
    }
  }

  for (const sentence of text.split(/(?<=[.!?:])\s+|\n+/)) {
    const tokens = sentence
      .split(/[\s/-]+/)
      .map((t) => t.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9+#']+$/g, '').replace(/'s$/, ''))
      .filter(Boolean);
    tokens.forEach((tok, i) => {
      if (i === 0 || !/^[A-Z]/.test(tok)) return;
      const w = tok.toLowerCase();
      if (COMMON_CAPS.has(w) || SKILL_SET.has(w) || v.profileWords.has(w) || v.expected.has(w)) return; // skills handled above
      if (v.jobWords.has(w)) {
        warnings.add(`"${tok}" comes from the job post, not your profile.`);
        return;
      }
      blocking.add(`"${tok}" does not appear in your profile or the job post.`);
    });
  }

  return { passed: blocking.size === 0, blocking: [...blocking], warnings: [...warnings] };
}

/**
 * Fact base for Business Mode pitches: the user's services profile and the case studies they may
 * share ("profile"), and what JAVI knows about the lead: its name and area, audit evidence and the
 * owner's own numbers ("job"). Anything else, such as an invented statistic or client, is blocked.
 */
export function buildBusinessVocab(input: { ownFacts: string[]; leadFacts: string[]; expected: string[] }): FactVocab {
  const profileText = input.ownFacts.filter(Boolean).join('\n');
  const jobText = input.leadFacts.filter(Boolean).join('\n');
  return {
    profileText: profileText.toLowerCase(),
    profileWords: wordsOf(profileText),
    jobText: jobText.toLowerCase(),
    jobWords: wordsOf(jobText),
    expected: wordsOf(input.expected.join(' ')),
    numbers: new Set([...numbersOf(profileText), ...numbersOf(jobText)]),
  };
}
