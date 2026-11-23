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
  links: list(z.object({ label: optStr, url: z.string() })),
  skills: strList,
  experience: list(experienceItem),
  education: list(educationItem),
  projects: list(projectItem),
  certifications: list(certificationItem),
});

const SYSTEM = `You convert CV/Resume text into clean, structured JSON.
CRITICAL EXTRACTION RULES:
1. Experience:
   - "company": Name of the employer/company (e.g. "Google", "Stripe", "Paystack").
   - "title": Job title or role (e.g. "Senior Software Engineer", "Product Designer"). NEVER put company name here.
   - "location": City, state, or country (e.g. "London, UK", "Lagos, Nigeria", "Remote"). NEVER create a separate job entry for location.
   - "start" and "end": Dates of employment (e.g. "2021", "March 2021", "Present").
   - "current": true if the candidate currently works there.
   - "bullets": List of achievement statements and responsibilities. Each bullet MUST be a complete sentence or accomplishment.
2. Education:
   - "institution": University or school name.
   - "degree": Degree type (e.g. "B.Sc.", "Master of Science", "HND").
   - "field": Major or subject (e.g. "Computer Science", "Economics").
   - "start" and "end": Years attended.
   - "grade": Honours or GPA if mentioned.
3. Keep facts exactly as stated in the CV. Do not hallucinate or invent roles.`;

const SHAPE = `Return ONLY raw JSON with this exact shape:
{
  "full_name": str|null,
  "headline": str|null,
  "email": str|null,
  "phone": str|null,
  "location": str|null,
  "summary": str|null,
  "links": [{"label": str|null, "url": str}],
  "skills": [str],
  "experience": [
    {
      "company": str,
      "title": str,
      "location": str|null,
      "start": str|null,
      "end": str|null,
      "current": bool,
      "bullets": [str]
    }
  ],
  "education": [
    {
      "institution": str,
      "degree": str|null,
      "field": str|null,
      "start": str|null,
      "end": str|null,
      "grade": str|null
    }
  ],
  "projects": [
    {
      "name": str,
      "url": str|null,
      "description": str|null,
      "bullets": [str]
    }
  ],
  "certifications": [
    {
      "name": str,
      "issuer": str|null,
      "year": str|null
    }
  ]
}`;

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

  // 9. Work Experience Extraction (Intelligent Block & Token Parser)
  const experience: ParsedProfile['experience'] = [];
  const expIdx = lines.findIndex((l) =>
    /^(experience|work experience|employment history|work history|professional experience|career history|relevant experience)\b/i.test(l.trim()),
  );

  const TITLE_REGEX = /\b(engineer|developer|designer|architect|manager|lead|director|vp|consultant|analyst|specialist|officer|head|administrator|scientist|researcher|technician|writer|producer|intern|founder|co-founder|cto|ceo|cpo|strategist|executive|coordinator|representative|specialist|fellow)\b/i;
  const DATE_RANGE_REGEX = /(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*)?\b(19\d\d|20\d\d)\b\s*(?:[-–—]|to)\s*(present|current|now|(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*)?\b(19\d\d|20\d\d)\b)/i;
  const KNOWN_LOC_TOKENS = ['remote', 'hybrid', 'on-site', 'onsite', 'lagos', 'abuja', 'port harcourt', 'nigeria', 'london', 'united kingdom', 'uk', 'new york', 'san francisco', 'menlo park', 'berlin', 'germany', 'canada', 'toronto', 'accra', 'ghana', 'nairobi', 'kenya', 'austin', 'seattle', 'boston', 'chicago'];

  if (expIdx !== -1) {
    let currentExp: any = null;
    let lastWasBullet = false;

    for (let i = expIdx + 1; i < lines.length; i++) {
      const line = lines[i];
      if (/^(education|academic background|academics|qualifications|skills|projects|certifications|languages|references|publications|awards)\b/i.test(line)) {
        break;
      }

      const isBulletMarker =
        /^[-•*▪▫◦⦿▸►✔–—]/.test(line) ||
        /^\d+[\.\)]\s+/.test(line) ||
        /\b(spearheaded|architected|developed|built|designed|led|managed|engineered|implemented|optimized|created|automated|collaborated|delivered|scaled|maintained|resolved|conducted|directed|executed|analyzed|authored|mentored|trained|integrated|established|launched)\b/i.test(line);

      if (isBulletMarker) {
        const cleanBullet = line.replace(/^[-•*▪▫◦⦿▸►✔–—\d\.\)]+\s*/, '').trim();
        if (cleanBullet) {
          if (!currentExp) {
            currentExp = { id: shortId(), title: 'Role', company: 'Company', location: undefined, start: undefined, end: undefined, current: false, bullets: [] };
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
          currentExp.start = dateMatch[1];
          currentExp.end = /present|current|now/i.test(dateMatch[2]) ? undefined : dateMatch[2];
          currentExp.current = /present|current|now/i.test(dateMatch[2]);
        }
        if (isOnlyLocation || KNOWN_LOC_TOKENS.some((t) => line.toLowerCase().includes(t))) {
          currentExp.location = line.replace(/[()]/g, '').trim();
        }
        continue;
      }

      // Parse as Job Header: Title, Company, Location, and Date
      let lineSansDate = line;
      let jobStart: string | undefined;
      let jobEnd: string | undefined;
      let jobCurrent = false;

      if (dateMatch) {
        jobStart = dateMatch[1];
        jobEnd = /present|current|now/i.test(dateMatch[2]) ? undefined : dateMatch[2];
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
          title: extractedTitle || 'Role',
          company: extractedCompany || 'Company',
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
          institution: inst || 'University',
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
