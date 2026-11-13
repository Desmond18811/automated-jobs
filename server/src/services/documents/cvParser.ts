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
