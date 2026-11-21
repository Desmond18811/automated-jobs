import mammoth from 'mammoth';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { z } from 'zod';
import { shortId } from '../../lib/crypto';
import { AppError } from '../../lib/http';
import { tokenize } from '../../matching/tokens';
import type { IProfile } from '../../models/profile.model';
import { completeJson, optStr } from './llm';

export const CV_MIME = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
} as const;

export async function extractText(buffer: Buffer, mime: string): Promise<string> {
  if (mime === CV_MIME.pdf) return (await pdfParse(buffer)).text;
  if (mime === CV_MIME.docx) return (await mammoth.extractRawText({ buffer })).value;
  throw new AppError(415, 'Upload your CV as a PDF or DOCX file');
}

const optVal = z
  .union([z.string(), z.number()])
  .nullish()
  .transform((v) => (v === null || v === undefined || v === '' ? undefined : String(v).trim()));
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
  links: list(z.object({ label: optStr, url: z.string() })),
  skills: strList,
  experience: list(z.object({ company: optStr, title: optStr, location: optStr, start: optVal, end: optVal, current: z.boolean().nullish(), bullets: strList })),
  education: list(z.object({ institution: optStr, degree: optStr, field: optStr, start: optVal, end: optVal, grade: optStr })),
  projects: list(z.object({ name: optStr, url: optStr, description: optStr, bullets: strList })),
  certifications: list(z.object({ name: optStr, issuer: optStr, year: optVal })),
});

const SYSTEM = `You convert CV text into structured data.
Copy facts exactly as written. Do not infer, embellish, merge, translate or add anything that is not in the text.
If a field is missing, use null or an empty list. Keep each bullet as written; you may only repair broken line wraps.`;

const SHAPE = `Return JSON with this shape:
{"full_name": str|null, "headline": str|null, "email": str|null, "phone": str|null, "location": str|null, "summary": str|null,
 "links": [{"label": str|null, "url": str}],
 "skills": [str],
 "experience": [{"company": str|null, "title": str|null, "location": str|null, "start": str|null, "end": str|null, "current": bool|null, "bullets": [str]}],
 "education": [{"institution": str|null, "degree": str|null, "field": str|null, "start": str|null, "end": str|null, "grade": str|null}],
 "projects": [{"name": str|null, "url": str|null, "description": str|null, "bullets": [str]}],
 "certifications": [{"name": str|null, "issuer": str|null, "year": str|null}]}
List experience in the same order as the CV (most recent first).`;

export type ParsedProfile = Pick<
  IProfile,
  'fullName' | 'headline' | 'email' | 'phone' | 'location' | 'summary' | 'links' | 'skills' | 'experience' | 'education' | 'projects' | 'certifications'
>;

const labelFromUrl = (url: string): string => {
  if (/linkedin/i.test(url)) return 'LinkedIn';
  if (/github/i.test(url)) return 'GitHub';
  return 'Website';
};

/** Parses CV text into a draft profile and flags any line that doesn't look like it came from the CV. */
export async function parseCv(rawText: string): Promise<{ data: ParsedProfile; warnings: string[] }> {
  const x = await completeJson(ParsedCv, {
    system: SYSTEM,
    prompt: `CV TEXT:\n"""\n${rawText.slice(0, 30_000)}\n"""\n\n${SHAPE}`,
    maxTokens: 4000,
  });

  const cvWords = new Set(tokenize(rawText));
  const warnings: string[] = [];
  const check = (s: string): string => {
    const t = tokenize(s);
    if (t.length && t.filter((w) => cvWords.has(w)).length / t.length < 0.7) {
      warnings.push(`Please check this line; it may not match your CV: "${s.slice(0, 120)}"`);
    }
    return s;
  };

  const data: ParsedProfile = {
    fullName: x.full_name ?? '',
    headline: x.headline,
    email: x.email,
    phone: x.phone,
    location: x.location,
    summary: x.summary ? check(x.summary) : undefined,
    links: x.links.map((l) => ({ label: l.label ?? labelFromUrl(l.url), url: l.url })),
    skills: [...new Set(x.skills)].map((name) => ({ name })),
    experience: x.experience
      .filter((e) => e.company || e.title)
      .map((e) => ({
        id: shortId(),
        company: e.company ?? '',
        title: e.title ?? '',
        location: e.location,
        start: e.start,
        end: e.end,
        current: e.current ?? false,
        bullets: e.bullets.map((text) => ({ id: shortId(), text: check(text) })),
      })),
    education: x.education
      .filter((e) => e.institution)
      .map((e) => ({ id: shortId(), institution: e.institution ?? '', degree: e.degree, field: e.field, start: e.start, end: e.end, grade: e.grade })),
    projects: x.projects
      .filter((pr) => pr.name)
      .map((pr) => ({
        id: shortId(),
        name: pr.name ?? '',
        url: pr.url,
        description: pr.description ? check(pr.description) : undefined,
        bullets: pr.bullets.map((text) => ({ id: shortId(), text: check(text) })),
      })),
    certifications: x.certifications.filter((c) => c.name).map((c) => ({ id: shortId(), name: c.name ?? '', issuer: c.issuer, year: c.year })),
  };
  return { data, warnings };
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

  return {
    fullName: fullName || '',
    headline: headline || undefined,
    email: email || undefined,
    phone: phone || undefined,
    location: location || undefined,
    summary: summary || undefined,
    links,
    skills: matchedSkills.slice(0, 25).map((name) => ({ name })),
    experience: [],
    education: [],
    projects: [],
    certifications: [],
  };
}
