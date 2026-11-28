import { z } from 'zod';
import { shortId } from '../../lib/crypto';
import { tokenize } from '../../matching/tokens';
import type { IProfile } from '../../models/profile.model';
import { completeJson, optStr } from './llm';
import { sectionOf } from './cvSections';

export { CV_MIME, cvMimeOf, extractText } from './cvExtract';

const optVal = z
  .union([z.string(), z.number()])
  .nullish()
  .transform((v) => (v === null || v === undefined || v === '' ? undefined : String(v).trim()));

const bulletItem = z.union([
  z.string(),
  z.object({ text: z.string() }).transform((o) => o.text),
  z.object({ bullet: z.string() }).transform((o) => o.bullet),
  z.object({ achievement: z.string() }).transform((o) => o.achievement),
  z.object({ description: z.string() }).transform((o) => o.description),
]);

const bulletList = z
  .array(bulletItem)
  .nullish()
  .transform((v) => (v ?? []).map((s) => String(s).trim()).filter(Boolean));

const experienceItem = z
  .object({
    company: optStr,
    employer: optStr,
    organization: optStr,
    title: optStr,
    role: optStr,
    position: optStr,
    location: optStr,
    city: optStr,
    start: optVal,
    startDate: optVal,
    start_date: optVal,
    end: optVal,
    endDate: optVal,
    end_date: optVal,
    current: z.boolean().nullish(),
    bullets: bulletList,
    achievements: bulletList,
    highlights: bulletList,
    responsibilities: bulletList,
  })
  .transform((e) => {
    const rawCompany = e.company || e.employer || e.organization || '';
    const rawTitle = e.title || e.role || e.position || '';
    const location = e.location || e.city || undefined;
    const start = e.start || e.startDate || e.start_date || undefined;
    const end = e.end || e.endDate || e.end_date || undefined;
    const bullets = [
      ...(e.bullets || []),
      ...(e.achievements || []),
      ...(e.highlights || []),
      ...(e.responsibilities || []),
    ];
    return {
      company: rawCompany,
      title: rawTitle,
      location,
      start,
      end,
      current: e.current ?? (end ? /present|current|now/i.test(String(end)) : false),
      bullets: [...new Set(bullets)],
    };
  });

const educationItem = z
  .object({
    institution: optStr,
    school: optStr,
    university: optStr,
    college: optStr,
    degree: optStr,
    degree_name: optStr,
    field: optStr,
    major: optStr,
    field_of_study: optStr,
    start: optVal,
    startDate: optVal,
    end: optVal,
    endDate: optVal,
    year: optVal,
    grade: optStr,
    gpa: optStr,
  })
  .transform((e) => {
    const institution = e.institution || e.school || e.university || e.college || '';
    const degree = e.degree || e.degree_name || undefined;
    const field = e.field || e.major || e.field_of_study || undefined;
    const start = e.start || e.startDate || undefined;
    const end = e.end || e.endDate || e.year || undefined;
    const grade = e.grade || e.gpa || undefined;
    return { institution, degree, field, start, end, grade };
  });

const projectItem = z
  .object({
    name: optStr,
    title: optStr,
    project_name: optStr,
    url: optStr,
    link: optStr,
    description: optStr,
    summary: optStr,
    bullets: bulletList,
    highlights: bulletList,
  })
  .transform((p) => ({
    name: p.name || p.title || p.project_name || '',
    url: p.url || p.link || undefined,
    description: p.description || p.summary || undefined,
    bullets: [...new Set([...(p.bullets || []), ...(p.highlights || [])])],
  }));

const certificationItem = z
  .object({
    name: optStr,
    title: optStr,
    certificate: optStr,
    issuer: optStr,
    organization: optStr,
    year: optVal,
    date: optVal,
  })
  .transform((c) => ({
    name: c.name || c.title || c.certificate || '',
    issuer: c.issuer || c.organization || undefined,
    year: c.year || c.date || undefined,
  }));

const strList = z
  .array(z.string())
  .nullish()
  .transform((v) => (v ?? []).map((s) => s.trim()).filter(Boolean));
const list = <T extends z.ZodTypeAny>(item: T) => z.array(item).nullish().transform((v) => v ?? []);

const ParsedCv = z.object({
  full_name: optStr,
  headline: optStr,
  email: optStr,
  phone: optStr,
  location: optStr,
  summary: optStr,
  links: list(z.object({ label: optStr, type: optStr, url: z.string() })),
  skills: strList,
  languages: strList,
  experience: list(experienceItem),
  education: list(educationItem),
  projects: list(projectItem),
  certifications: list(certificationItem),
});

const SYSTEM = `You convert CV/Resume text into structured JSON. Put each fact in exactly one field.
The text may come from a two-column layout, so a sidebar (contact, skills, languages) can appear before, after, or between main-column lines. Assign each line by what it IS, not where it appears.
FIELD DEFINITIONS:
- full_name: the candidate's name only (no title, no degree suffix).
- headline: ONE short line naming their professional title (e.g. "Senior Product Designer"). Never the summary paragraph, never an employer, never contact details.
- summary: the profile/objective paragraph, as written. null if the CV has none. Do not write one yourself.
- location: where the candidate lives (e.g. "Lagos, Nigeria"). NEVER an employer's or school's location.
- email, phone: exactly as written.
- links: every URL or handle; "type" is one of linkedin, github, portfolio, twitter, other, decided by host.
- skills: atomic items (one tool, technology or skill per entry, e.g. "Figma", "React", "Stakeholder management"). Never sentences, never job titles, never languages like English/French.
- languages: spoken languages only (e.g. "English", "Yoruba").
- experience: one entry per job. company = employer name; title = job title (NEVER the company); location = that job's location; start/end as YYYY-MM or YYYY ("Present" if current); bullets = that job's achievements only.
- education: institution = school; degree = qualification type ("B.Sc."); field = subject; start/end years; grade only if stated.
- projects: name, url, description. Not jobs.
- certifications: name, issuer, year. Not degrees.
Use null (or []) when unsure or absent. Never invent, infer or paraphrase facts. Ignore interests, hobbies, references and declarations.`;

const SHAPE = `Return ONLY raw JSON with this exact shape:
{
  "full_name": str|null, "headline": str|null, "email": str|null, "phone": str|null, "location": str|null, "summary": str|null,
  "links": [{"label": str|null, "type": "linkedin"|"github"|"portfolio"|"twitter"|"other", "url": str}],
  "skills": [str], "languages": [str],
  "experience": [{"company": str, "title": str, "location": str|null, "start": str|null, "end": str|null, "current": bool, "bullets": [str]}],
  "education": [{"institution": str, "degree": str|null, "field": str|null, "start": str|null, "end": str|null, "grade": str|null}],
  "projects": [{"name": str, "url": str|null, "description": str|null, "bullets": [str]}],
  "certifications": [{"name": str, "issuer": str|null, "year": str|null}]
}`;

export type ParsedProfile = Pick<
  IProfile,
  'fullName' | 'headline' | 'email' | 'phone' | 'location' | 'summary' | 'links' | 'skills' | 'experience' | 'education' | 'projects' | 'certifications'
>;

const LABELS: Record<string, string> = { linkedin: 'LinkedIn', github: 'GitHub', portfolio: 'Portfolio', twitter: 'X', other: 'Website' };

const labelFromUrl = (url: string): string => {
  if (/linkedin\.com/i.test(url)) return LABELS.linkedin;
  if (/github\.com/i.test(url)) return LABELS.github;
  if (/(^|\/\/|\.)(twitter|x)\.com/i.test(url)) return LABELS.twitter;
  return LABELS.other;
};

const MONTHS = 'jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec';
const MON_IDX = (m: string) => MONTHS.split('|').indexOf(m.slice(0, 3).toLowerCase()) + 1;

/** Normalise a date to YYYY-MM, YYYY or "Present"; undefined if it is not recognisably a date. */
export function normaliseDate(v?: string): string | undefined {
  if (!v) return undefined;
  const t = v.trim();
  if (/^(present|current|now|ongoing|date|till date)$/i.test(t)) return 'Present';
  let m = t.match(/^(\d{4})[-/](\d{1,2})$/);
  if (m && +m[2] >= 1 && +m[2] <= 12) return `${m[1]}-${m[2].padStart(2, '0')}`;
  m = t.match(new RegExp(`^(${MONTHS})[a-z]*\\.?,?\\s+(\\d{4})$`, 'i'));
  if (m) return `${m[2]}-${String(MON_IDX(m[1])).padStart(2, '0')}`;
  m = t.match(/^(\d{1,2})[/-](\d{4})$/);
  if (m && +m[1] >= 1 && +m[1] <= 12) return `${m[2]}-${m[1].padStart(2, '0')}`;
  m = t.match(/^(\d{4})$/);
  if (m && +m[1] >= 1950 && +m[1] <= new Date().getFullYear() + 6) return m[1];
  return undefined;
}

/** Drops a range whose end precedes its start (a swap or misread) rather than saving a nonsense job. */
const dateRange = (start?: string, end?: string): { start?: string; end?: string } => {
  const s = normaliseDate(start);
  const e = normaliseDate(end);
  if (s && e && e !== 'Present' && e < s) return { start: s };
  return { start: s, end: e };
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const cleanEmail = (v?: string) => (v && EMAIL_RE.test(v.trim()) ? v.trim().toLowerCase() : undefined);
const cleanPhone = (v?: string) => (v && v.replace(/\D/g, '').length >= 7 && v.replace(/\D/g, '').length <= 15 && /^[+\d\s().-]+$/.test(v) ? v.trim() : undefined);
const cleanUrl = (v?: string) => {
  if (!v) return undefined;
  const t = v.trim().replace(/[),.;]+$/, '');
  if (/\s/.test(t) || !/^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(t)) return undefined;
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
};

/** An atomic skill: short, no sentence punctuation. Anything else came from the wrong section. */
const validSkill = (s: string) => s.length >= 2 && s.length <= 40 && s.split(/\s+/).length <= 5 && !/[.;]\s|^[•\-*]/.test(s);

const dedupe = (items: string[]): string[] => {
  const seen = new Set<string>();
  return items.filter((i) => {
    const k = i.toLowerCase();
    return seen.has(k) ? false : (seen.add(k), true);
  });
};

export type CvLanguages = string[];

/** Parses CV text into a draft profile and flags any line that doesn't look like it came from the CV. */
export async function parseCv(rawText: string): Promise<{ data: ParsedProfile; warnings: string[]; languages: CvLanguages }> {
  const x = await completeJson(ParsedCv, {
    system: SYSTEM,
    prompt: `CV TEXT:\n"""\n${rawText.slice(0, 30_000)}\n"""\n\n${SHAPE}`,
    maxTokens: 4000,
    temperature: 0,
    retries: 1,
  });

  const cvWords = new Set(tokenize(rawText));
  const lowerRaw = rawText.toLowerCase();
  const warnings: string[] = [];
  const check = (s: string): string => {
    const t = tokenize(s);
    if (t.length && t.filter((w) => cvWords.has(w)).length / t.length < 0.7) {
      warnings.push(`Please check this line; it may not match your CV: "${s.slice(0, 120)}"`);
    }
    return s;
  };
  /** Names that never appear in the CV text are hallucinations: drop them. */
  const inCv = (s?: string) => !!s && lowerRaw.includes(s.toLowerCase().slice(0, 30));

  const spoken = new Set(x.languages.map((l) => l.toLowerCase()));
  const links: ParsedProfile['links'] = [];
  for (const l of x.links) {
    const url = cleanUrl(l.url);
    if (url && !links.some((k) => k.url.toLowerCase() === url.toLowerCase())) {
      links.push({ label: (l.type && LABELS[l.type.toLowerCase()]) || l.label || labelFromUrl(url), url });
    }
  }

  const data: ParsedProfile = {
    fullName: x.full_name ?? '',
    headline: x.headline && x.headline.length <= 90 && x.headline !== x.summary ? x.headline : undefined,
    email: cleanEmail(x.email),
    phone: cleanPhone(x.phone),
    location: x.location && x.location.length <= 80 ? x.location : undefined,
    summary: x.summary ? check(x.summary) : undefined,
    links,
    skills: dedupe(x.skills.filter(validSkill).filter((s) => !spoken.has(s.toLowerCase()))).map((name) => ({ name })),
    experience: x.experience
      .filter((e) => e.company && e.title && inCv(e.company))
      .map((e) => ({
        id: shortId(),
        company: e.company ?? '',
        title: e.title ?? '',
        location: e.location,
        ...dateRange(e.start, e.end),
        current: e.current ?? false,
        bullets: e.bullets.map((text) => ({ id: shortId(), text: check(text) })),
      }))
      .map((e) => ({ ...e, current: e.current || (e as any).end === 'Present', end: (e as any).end === 'Present' ? undefined : (e as any).end })),
    education: x.education
      .filter((e) => e.institution && inCv(e.institution))
      .map((e) => ({ id: shortId(), institution: e.institution ?? '', degree: e.degree, field: e.field, ...dateRange(e.start, e.end), grade: e.grade })),
    projects: x.projects
      .filter((pr) => pr.name)
      .map((pr) => ({
        id: shortId(),
        name: pr.name ?? '',
        url: cleanUrl(pr.url),
        description: pr.description ? check(pr.description) : undefined,
        bullets: pr.bullets.map((text) => ({ id: shortId(), text: check(text) })),
      })),
    certifications: x.certifications.filter((c) => c.name).map((c) => ({ id: shortId(), name: c.name ?? '', issuer: c.issuer, year: c.year })),
  };
  return { data, warnings, languages: dedupe(x.languages.filter((l) => l.length <= 30)) };
}

export const POPULAR_SKILL_KEYWORDS = [
  'Figma',
  'UI & UX Design',
  'Design Systems',
  'User Research',
  'Prototyping',
  'Wireframing',
  'Interaction Design',
  'Micro-interactions',
  'Accessibility (WCAG)',
  'React',
  'TypeScript',
  'JavaScript',
  'Next.js',
  'Vue',
  'Angular',
  'Tailwind CSS',
  'HTML5 & CSS3',
  'Redux',
  'Zustand',
  'Vite',
  'Storybook',
  'Node.js',
  'Express',
  'NestJS',
  'Python',
  'FastAPI',
  'Django',
  'Go (Golang)',
  'Java',
  'Spring Boot',
  'C#',
  '.NET',
  'Rust',
  'PostgreSQL',
  'MySQL',
  'MongoDB',
  'Redis',
  'GraphQL',
  'REST APIs',
  'SQL',
  'Prisma',
  'Drizzle ORM',
  'Kafka',
  'RabbitMQ',
  'Docker',
  'Kubernetes',
  'AWS',
  'GCP',
  'Azure',
  'Terraform',
  'CI/CD',
  'GitHub Actions',
  'Linux',
  'Nginx',
  'Prometheus',
  'Grafana',
  'Flutter & Dart',
  'React Native',
  'Swift',
  'SwiftUI',
  'Kotlin',
  'Jetpack Compose',
  'Android SDK',
  'Machine Learning',
  'Artificial Intelligence',
  'LLMs',
  'Prompt Engineering',
  'LangChain',
  'PyTorch',
  'TensorFlow',
  'Data Modeling',
  'Snowflake',
  'dbt',
  'Product Strategy',
  'Roadmap Planning',
  'Agile / Scrum',
  'User Stories',
  'A/B Testing',
  'Product Analytics',
  'Mixpanel',
  'Amplitude',
  'Cypress',
  'Playwright',
  'Selenium',
  'PyTest',
  'Jest',
  'API Testing',
  'Cybersecurity',
  'Penetration Testing',
  'OWASP Top 10',
];

/**
 * Fast, deterministic regex/heuristic fallback parser for when external LLMs are unavailable or offline.
 * Extracts candidate name, email, phone, location, headline, links, and real skills.
 */
export function parseCvDeterministic(rawText: string): ParsedProfile {
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);

  // 1. Email
  const emailMatch = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0] : undefined;

  // 2. Phone
  const phoneMatch = rawText.match(/(?:\+?\d{1,4}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,5}/);
  const phone = phoneMatch ? phoneMatch[0] : undefined;

  // 3. URLs
  const linkedinMatch =
    rawText.match(/https?:\/\/(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/i) ||
    rawText.match(/linkedin\.com\/in\/[a-zA-Z0-9_-]+/i);
  const githubMatch =
    rawText.match(/https?:\/\/(?:www\.)?github\.com\/[a-zA-Z0-9_-]+/i) ||
    rawText.match(/github\.com\/[a-zA-Z0-9_-]+/i);
  const portfolioMatch = rawText.match(/https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?/i);

  const links: Array<{ label: string; url: string }> = [];
  if (linkedinMatch) {
    const url = linkedinMatch[0].startsWith('http') ? linkedinMatch[0] : `https://${linkedinMatch[0]}`;
    links.push({ label: 'LinkedIn', url });
  }
  if (githubMatch) {
    const url = githubMatch[0].startsWith('http') ? githubMatch[0] : `https://${githubMatch[0]}`;
    links.push({ label: 'GitHub', url });
  }
  if (portfolioMatch && !portfolioMatch[0].includes('linkedin') && !portfolioMatch[0].includes('github')) {
    links.push({ label: 'Portfolio', url: portfolioMatch[0] });
  }

  // 4. Candidate Name: First clean line with 2-4 words that isn't a header keyword
  let fullName = '';
  for (const line of lines.slice(0, 8)) {
    if (
      !/curriculum|resume|vitae|page|email|phone|http|github|linkedin|contact|profile|portfolio|@/i.test(line) &&
      line.length >= 3 &&
      line.length <= 40 &&
      line.split(/\s+/).length >= 2 &&
      line.split(/\s+/).length <= 4
    ) {
      fullName = line.replace(/[^\w\s'-]/g, '').trim();
      break;
    }
  }

  // 5. Headline: Look at lines 1-6 or check for role titles
  let headline = '';
  const roleKeywords = [
    'designer',
    'engineer',
    'developer',
    'architect',
    'manager',
    'lead',
    'scientist',
    'analyst',
    'specialist',
    'consultant',
  ];
  for (const line of lines.slice(0, 10)) {
    if (line !== fullName && roleKeywords.some((rk) => line.toLowerCase().includes(rk)) && line.length <= 100) {
      headline = line;
      break;
    }
  }

  // 6. Location: Look for Nigerian cities, African cities, or global locations
  let location = '';
  const locationTokens = [
    'Lagos',
    'Abuja',
    'Port Harcourt',
    'Ibadan',
    'Enugu',
    'Kano',
    'Nigeria',
    'Accra',
    'Ghana',
    'Nairobi',
    'Kenya',
    'London',
    'United Kingdom',
    'UK',
    'New York',
    'San Francisco',
    'Toronto',
    'Canada',
    'Remote',
    'Berlin',
    'Germany',
  ];
  for (const tok of locationTokens) {
    if (new RegExp(`\\b${tok}\\b`, 'i').test(rawText)) {
      if (tok.toLowerCase() === 'nigeria' && !location) location = 'Lagos, Nigeria';
      else if (['lagos', 'abuja', 'port harcourt', 'ibadan', 'enugu', 'kano'].includes(tok.toLowerCase()))
        location = `${tok}, Nigeria`;
      else if (['accra'].includes(tok.toLowerCase())) location = 'Accra, Ghana';
      else if (['nairobi'].includes(tok.toLowerCase())) location = 'Nairobi, Kenya';
      else if (['london'].includes(tok.toLowerCase())) location = 'London, United Kingdom';
      else location = tok;
      break;
    }
  }

  // 7. Skills: match against curated dictionary
  const lowerText = rawText.toLowerCase();
  const matchedSkills: string[] = [];
  for (const s of POPULAR_SKILL_KEYWORDS) {
    const sLower = s.toLowerCase();
    if (lowerText.includes(sLower) && !matchedSkills.includes(s)) {
      matchedSkills.push(s);
    }
  }

  // 8. Summary: Extract text between SUMMARY / ABOUT / PROFILE and next section
  let summary = '';
  const summaryHeaderIdx = lines.findIndex((l) =>
    /^(summary|professional summary|profile|about me|about)$/i.test(l.trim()),
  );
  if (summaryHeaderIdx !== -1 && summaryHeaderIdx + 1 < lines.length) {
    const nextLines: string[] = [];
    for (let i = summaryHeaderIdx + 1; i < Math.min(lines.length, summaryHeaderIdx + 5); i++) {
      if (/^(experience|work experience|employment|skills|education|projects|certifications)$/i.test(lines[i])) break;
      nextLines.push(lines[i]);
    }
    summary = nextLines.join(' ').slice(0, 600);
  }

  // 9. Work Experience Extraction (Intelligent Block & Token Parser)
  const experience: ParsedProfile['experience'] = [];
  const expIdx = lines.findIndex((l) =>
    /^(experience|work experience|employment history|work history|professional experience|career history|relevant experience)\b/i.test(l.trim()),
  );

  const TITLE_REGEX = /\b(engineer|developer|designer|architect|manager|lead|director|vp|consultant|analyst|specialist|officer|head|administrator|scientist|researcher|technician|writer|producer|intern|founder|co-founder|cto|ceo|cpo|strategist|executive|coordinator|representative|specialist|fellow)\b/i;
  const DATE_RANGE_REGEX = /((?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*)?\b(?:19|20)\d\d)\s*(?:[-–—]|to)\s*(present|current|now|(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*)?\b(?:19|20)\d\d)/i;
  const KNOWN_LOC_TOKENS = ['remote', 'hybrid', 'on-site', 'onsite', 'lagos', 'abuja', 'port harcourt', 'nigeria', 'london', 'united kingdom', 'uk', 'new york', 'san francisco', 'menlo park', 'berlin', 'germany', 'canada', 'toronto', 'accra', 'ghana', 'nairobi', 'kenya', 'austin', 'seattle', 'boston', 'chicago'];

  if (expIdx !== -1) {
    let currentExp: any = null;
    let lastWasBullet = false;

    for (let i = expIdx + 1; i < lines.length; i++) {
      const line = lines[i];
      if (sectionOf(line)) break;

      const isBulletMarker =
        /^[-•*▪▫◦⦿▸►✔–—]/.test(line) ||
        /^\d+[\.\)]\s+/.test(line) ||
        /\b(spearheaded|architected|developed|built|designed|led|managed|engineered|implemented|optimized|created|automated|collaborated|delivered|scaled|maintained|resolved|conducted|directed|executed|analyzed|authored|mentored|trained|integrated|established|launched)\b/i.test(line);

      if (isBulletMarker) {
        const cleanBullet = line.replace(/^[-•*▪▫◦⦿▸►✔–—\d\.\)]+\s*/, '').trim();
        if (cleanBullet) {
          if (!currentExp) {
            currentExp = { id: shortId(), title: '', company: '', location: undefined, start: undefined, end: undefined, current: false, bullets: [] };
            experience.push(currentExp);
          }
          currentExp.bullets.push({ id: shortId(), text: cleanBullet });
          lastWasBullet = true;
        }
        continue;
      }

      // Check if line is a continuation of the previous bullet point (PDF line-wrap)
      if (
        lastWasBullet &&
        currentExp &&
        currentExp.bullets.length > 0 &&
        !DATE_RANGE_REGEX.test(line) &&
        !TITLE_REGEX.test(line) &&
        line.length < 240 &&
        !line.includes('—') &&
        !line.includes('|')
      ) {
        const lastBullet = currentExp.bullets[currentExp.bullets.length - 1];
        lastBullet.text += ' ' + line;
        continue;
      }

      lastWasBullet = false;

      // Check if line is solely a date range or location for the active job
      const dateMatch = line.match(DATE_RANGE_REGEX);
      const isOnlyDate = dateMatch && line.replace(DATE_RANGE_REGEX, '').replace(/[|,\-–—()\s]/g, '').length === 0;
      const isOnlyLocation = KNOWN_LOC_TOKENS.some(
        (loc) => line.toLowerCase() === loc || line.toLowerCase() === `${loc}, uk` || line.toLowerCase() === `${loc}, nigeria` || line.toLowerCase() === `${loc}, united kingdom`,
      );

      if (currentExp && (isOnlyDate || isOnlyLocation)) {
        if (dateMatch) {
          currentExp.start = normaliseDate(dateMatch[1]);
          currentExp.end = /present|current|now/i.test(dateMatch[2]) ? undefined : normaliseDate(dateMatch[2]);
          currentExp.current = /present|current|now/i.test(dateMatch[2]);
        }
        if (isOnlyLocation || KNOWN_LOC_TOKENS.some((t) => line.toLowerCase().includes(t))) {
          currentExp.location = line.replace(/[()]/g, '').trim();
        }
        continue;
      }

      // "Company, City, Country" line directly under a title-only header.
      if (currentExp && currentExp.title && !currentExp.company && !currentExp.bullets.length && !dateMatch && !TITLE_REGEX.test(line) && line.length < 80) {
        const [co, ...loc] = line.split(',').map((x) => x.trim());
        currentExp.company = co;
        if (loc.length && !currentExp.location) currentExp.location = loc.join(', ');
        continue;
      }

      // Parse as Job Header: Title, Company, Location, and Date
      let lineSansDate = line;
      let jobStart: string | undefined;
      let jobEnd: string | undefined;
      let jobCurrent = false;

      if (dateMatch) {
        jobStart = normaliseDate(dateMatch[1]);
        jobEnd = /present|current|now/i.test(dateMatch[2]) ? undefined : normaliseDate(dateMatch[2]);
        jobCurrent = /present|current|now/i.test(dateMatch[2]);
        lineSansDate = line.replace(dateMatch[0], '').trim();
      }

      // Split line into constituent tokens
      const rawParts = lineSansDate
        .split(/[|—–]|\bat\b/i)
        .map((s) => s.trim().replace(/^[,\-–—\s]+|[,\-–—\s]+$/g, ''))
        .filter(Boolean);

      let extractedTitle = '';
      let extractedCompany = '';
      let extractedLoc = '';

      for (const part of rawParts) {
        const lower = part.toLowerCase();
        if (KNOWN_LOC_TOKENS.some((t) => lower.includes(t)) && !TITLE_REGEX.test(part)) {
          extractedLoc = part;
        } else if (TITLE_REGEX.test(part) && !extractedTitle) {
          extractedTitle = part;
        } else if (!extractedCompany) {
          extractedCompany = part;
        } else if (!extractedTitle) {
          extractedTitle = part;
        }
      }

      if (extractedTitle || extractedCompany) {
        currentExp = {
          id: shortId(),
          title: extractedTitle,
          company: extractedCompany,
          location: extractedLoc || undefined,
          start: jobStart,
          end: jobEnd,
          current: jobCurrent,
          bullets: [],
        };
        experience.push(currentExp);
      } else if (currentExp && extractedLoc) {
        currentExp.location = extractedLoc;
      }
    }
  }

  // A job needs both a company and a title; never save placeholders for the missing one.
  for (let i = experience.length - 1; i >= 0; i--) if (!experience[i].company || !experience[i].title) experience.splice(i, 1);

  // 10. Education Extraction (Intelligent Grouped Parser)
  const education: ParsedProfile['education'] = [];
  const eduIdx = lines.findIndex((l) =>
    /^(education|academic background|academics|qualifications|educational history)\b/i.test(l.trim()),
  );

  if (eduIdx !== -1) {
    let currentEdu: any = null;
    for (let i = eduIdx + 1; i < lines.length; i++) {
      const line = lines[i];
      if (/^(experience|skills|projects|certifications|languages|references|awards)\b/i.test(line)) break;
      if (line.length < 3 || /^page\b/i.test(line)) continue;

      const years = line.match(/\b(19\d\d|20\d\d)\b/g);
      const isInst = /university|college|institute|polytechnic|school|academy|faculty/i.test(line);
      const isDeg = /bachelor|bsc|b\.s|b\.eng|master|msc|m\.s|mba|phd|doctorate|associate|hnd|ond|diploma|degree/i.test(line);
      const gradeMatch = line.match(/\b(first class|second class|distinction|honours|cum laude|summa|gpa\s*[\d\.]+|\b\d\.\d+\s*\/\s*[\d\.]+)\b/i);

      if (isInst && !currentEdu) {
        currentEdu = {
          id: shortId(),
          institution: line.split(/[|,\-–—]/)[0].trim(),
          start: years?.[0],
          end: years?.[1] || years?.[0],
          grade: gradeMatch ? gradeMatch[0] : undefined,
        };
        education.push(currentEdu);
      } else if (currentEdu && (isDeg || years || gradeMatch)) {
        if (!currentEdu.degree && isDeg) {
          const parts = line.split(/[|,\-–—]/).map((s) => s.trim()).filter(Boolean);
          currentEdu.degree = parts.find((p) => /bachelor|bsc|b\.s|b\.eng|master|msc|mba|phd|associate|hnd|ond|diploma/i.test(p)) || parts[0];
          const fieldPart = parts.find((p) => p !== currentEdu.degree && !/\b(19\d\d|20\d\d)\b/.test(p) && !/honours|first class|gpa/i.test(p));
          if (fieldPart) currentEdu.field = fieldPart.replace(/^in\s+/i, '');
        }
        if (!currentEdu.start && years?.[0]) currentEdu.start = years[0];
        if (!currentEdu.end && (years?.[1] || years?.[0])) currentEdu.end = years[1] || years[0];
        if (!currentEdu.grade && gradeMatch) currentEdu.grade = gradeMatch[0];
      } else if (line.length >= 6) {
        const parts = line.split(/[|,\-–—]/).map((s) => s.trim()).filter(Boolean);
        const deg = parts.find((p) => /bachelor|bsc|b\.s|b\.eng|master|msc|mba|phd|associate|hnd|ond|diploma/i.test(p));
        const inst = parts.find((p) => /university|college|institute|polytechnic|school/i.test(p)) || parts[0];
        currentEdu = {
          id: shortId(),
          institution: inst,
          degree: deg || parts[1],
          start: years?.[0],
          end: years?.[1] || years?.[0],
          grade: gradeMatch ? gradeMatch[0] : undefined,
        };
        education.push(currentEdu);
        if (education.length >= 6) break;
      }
    }
  }

  // 11. Projects Extraction
  const projects: ParsedProfile['projects'] = [];
  const projIdx = lines.findIndex((l) => /^(projects|key projects|personal projects|selected projects)\b/i.test(l.trim()));
  if (projIdx !== -1) {
    let currentProj: any = null;
    for (let i = projIdx + 1; i < lines.length; i++) {
      const line = lines[i];
      if (/^(experience|education|skills|certifications|languages|references)\b/i.test(line)) break;
      if (/^[-•*▪▫◦⦿▸►✔–—]/.test(line)) {
        if (currentProj) {
          const text = line.replace(/^[-•*▪▫◦⦿▸►✔–—\s]+/, '').trim();
          if (text) currentProj.bullets.push({ id: shortId(), text });
        }
      } else if (line.length >= 3 && line.length <= 80 && !/^page\b/i.test(line)) {
        const urlMatch = line.match(/https?:\/\/[^\s]+/i);
        const name = line.replace(/https?:\/\/[^\s]+/i, '').replace(/[|,\-–—]\s*$/, '').trim();
        if (name) {
          currentProj = {
            id: shortId(),
            name,
            url: urlMatch ? urlMatch[0] : undefined,
            bullets: [],
          };
          projects.push(currentProj);
          if (projects.length >= 10) break;
        }
      }
    }
  }

  // 12. Certifications Extraction
  const certifications: ParsedProfile['certifications'] = [];
  const certIdx = lines.findIndex((l) => /^(certifications|certificates|licenses & certifications|credentials)\b/i.test(l.trim()));
  if (certIdx !== -1) {
    for (let i = certIdx + 1; i < lines.length; i++) {
      const line = lines[i];
      if (/^(experience|education|skills|projects|languages|references)\b/i.test(line)) break;
      if (line.length >= 4 && !/^page\b/i.test(line)) {
        const yearMatch = line.match(/\b(19\d\d|20\d\d)\b/);
        const clean = line.replace(/\b(19\d\d|20\d\d)\b/, '').replace(/[|,\-–—\(\)]/g, ' ').trim();
        const parts = clean.split(/\s{2,}|\bby\b|\bfrom\b/i).map((s) => s.trim()).filter(Boolean);
        certifications.push({
          id: shortId(),
          name: parts[0] || clean,
          issuer: parts[1] || undefined,
          year: yearMatch ? yearMatch[0] : undefined,
        });
        if (certifications.length >= 10) break;
      }
    }
  }

  return {
    fullName: fullName || '',
    headline: headline || undefined,
    email: email || undefined,
    phone: phone || undefined,
    location: location || undefined,
    summary: summary || undefined,
    links,
    skills: matchedSkills.slice(0, 30).map((name) => ({ name })),
    experience,
    education,
    projects,
    certifications,
  };
}
