import type { Request, Response } from 'express';
import { z } from 'zod';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import * as XLSX from 'xlsx';
import { AppError, errorMessage, parseBody } from '../lib/http';
import { clip, safeHost } from '../lib/normalize';
import { currentUser } from '../middleware/auth';
import { JobPost } from '../models/jobPost.model';
import { Application } from '../models/application.model';
import { defaultJobOpts, queues } from '../queues';
import { jobFromLink, readJobPage, upsertJob } from '../services/job.service';
import type { RawJob } from '../sources/types';

export const ManualJobSchema = z
  .object({
    url: z.string().url().optional(),
    applyEmail: z.string().email().optional(),
    title: z.string().max(300).optional(),
    company: z.string().max(200).optional(),
    location: z.string().max(200).optional(),
    description: z.string().max(20_000).optional(),
  })
  .refine((b) => b.url || b.applyEmail, 'Give a job link or an application email');

const LinksSchema = z.object({ urls: z.array(z.string().trim()).min(1).max(200) });

/** Pull every http(s) link out of pasted text or spreadsheet cells. */
export function extractUrls(values: unknown[]): string[] {
  const out = new Set<string>();
  for (const v of values) {
    for (const m of String(v ?? '').matchAll(/https?:\/\/[^\s"'<>,;]+/gi)) out.add(m[0].replace(/[).]+$/, ''));
  }
  return [...out];
}

/** Save each link as a job (rendering JS pages), then match it to this user, which tailors and applies per their rules. */
async function queueLinks(userId: string, urls: string[]) {
  const results: Array<{ url: string; status: 'queued' | 'already_added' | 'failed'; jobId?: string; title?: string; company?: string; error?: string }> = [];
  const queue = [...urls];
  const worker = async () => {
    for (let url = queue.shift(); url; url = queue.shift()) {
      try {
        const { job, isNew } = await jobFromLink(url);
        await queues.match.add('match', { jobId: job.id, userId }, defaultJobOpts);
        results.push({ url, status: isNew ? 'queued' : 'already_added', jobId: job.id, title: job.title, company: job.company });
      } catch (err) {
        results.push({ url, status: 'failed', error: errorMessage(err) });
      }
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  return results.sort((a, b) => urls.indexOf(a.url) - urls.indexOf(b.url));
}

export class JobController {
  /** POST /jobs/links {urls}: one link or hundreds. */
  static async links(req: Request, res: Response) {
    const userId = currentUser(req);
    const { urls } = parseBody(LinksSchema, req.body);
    const clean = extractUrls(urls);
    if (!clean.length) throw new AppError(400, 'No http(s) links found');
    const results = await queueLinks(userId, clean);
    res.status(201).json({ count: results.length, queued: results.filter((r) => r.status !== 'failed').length, results });
  }

  static async manual(req: Request, res: Response) {
    const userId = currentUser(req);
    const b = parseBody(ManualJobSchema, req.body);

    let found: Partial<RawJob> = {};
    if (b.url && !(b.title && b.company && b.description)) {
      try {
        found = await readJobPage(b.url);
      } catch (err) {
        if (!(b.title && b.company)) {
          throw new AppError(422, `${safeHost(b.url) || 'That site'} didn't let us read the page (${errorMessage(err)}). Add the job title and company below and it will be saved with the link.`, 'needs_fields');
        }
      }
    }

    const title = b.title ?? found.title;
    const company = b.company ?? found.company;
    if (!title || !company) {
      throw new AppError(422, 'Could not work out the job title and company from that link. Please add them.', 'needs_fields', { found });
    }

    const result = await upsertJob({
      source: 'manual',
      url: b.url ?? `mailto:${b.applyEmail}`,
      company,
      title,
      location: b.location ?? found.location,
      description: b.description ?? found.description ?? '',
      applyEmail: b.applyEmail ?? found.applyEmail,
      applyUrl: b.url,
      postedAt: new Date(),
    });
    if (!result) throw new AppError(422, 'That job could not be saved');

    await queues.match.add('match', { jobId: result.job.id, userId }, defaultJobOpts);
    res.status(201).json({ job: result.job, isNew: result.isNew });
  }

  static async list(req: Request, res: Response) {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const skip = Math.max(Number(req.query.skip) || 0, 0);
    const query: any = {};
    if (req.query.q) {
      const search = String(req.query.q).trim();
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
      ];
    }
    const [jobs, total] = await Promise.all([
      JobPost.find(query).sort({ postedAt: -1, createdAt: -1 }).skip(skip).limit(limit),
      JobPost.countDocuments(query),
    ]);
    // The user's real match for each job (score, why, filter warnings); absent means not scored for them.
    const apps = await Application.find({ userId: currentUser(req), jobId: { $in: jobs.map((j) => j._id) } }, { jobId: 1, score: 1, scoreBreakdown: 1, filterNotes: 1, status: 1 }).lean();
    const byJob = new Map(apps.map((a: any) => [String(a.jobId), a]));
    const withMatch = jobs.map((j) => {
      const a: any = byJob.get(String(j._id));
      const obj = typeof (j as any).toObject === 'function' ? (j as any).toObject() : j;
      return a ? { ...obj, match: { score: a.score, breakdown: a.scoreBreakdown, filterNotes: a.filterNotes ?? [], status: a.status } } : obj;
    });
    res.json({ jobs: withMatch, total, count: jobs.length });
  }

  static async getJob(req: Request, res: Response) {
    const job = await JobPost.findById(req.params.id);
    if (!job) throw new AppError(404, 'Job not found');
    res.json(job);
  }

  static async importJobs(req: Request, res: Response) {
    const userId = currentUser(req);
    const url = req.body?.url ? String(req.body.url).trim() : undefined;
    const file = req.file;

    if (!url && !file) {
      throw new AppError(400, 'Provide a job URL or upload a file (PDF, CSV, XLSX, text)');
    }

    const rawJobsToSave: RawJob[] = [];
    const linkRows: string[] = [];

    // 1. Process URL
    if (url) {
      const extracted = await readJobPage(url).catch(() => null);
      if (extracted?.title && extracted?.company) {
        rawJobsToSave.push({
          source: 'import:url',
          url,
          title: extracted.title,
          company: extracted.company,
          location: extracted.location,
          description: extracted.description || '',
          applyUrl: url,
          applyEmail: extracted.applyEmail,
          postedAt: new Date(),
        });
      } else {
        rawJobsToSave.push({
          source: 'import:url',
          url,
          title: 'Position from link',
          company: safeHost(url) || 'Company',
          description: extracted?.description || '',
          applyUrl: url,
          postedAt: new Date(),
        });
      }
    }

    // 2. Process File (PDF, XLSX, XLS, CSV, text)
    if (file) {
      const filename = file.originalname.toLowerCase();
      if (
        filename.endsWith('.xlsx') ||
        filename.endsWith('.xls') ||
        filename.endsWith('.xlsv') ||
        file.mimetype.includes('spreadsheet') ||
        file.mimetype.includes('excel')
      ) {
        try {
          const workbook = XLSX.read(file.buffer, { type: 'buffer' });
          const firstSheetName = workbook.SheetNames[0];
          if (firstSheetName) {
            const worksheet = workbook.Sheets[firstSheetName];
            const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            if (rows.length > 1) {
              const headerRow = (rows[0] as any[]).map((h) => String(h || '').toLowerCase().trim());
              const titleIdx = headerRow.findIndex((h) => h.includes('title') || h.includes('role') || h.includes('position'));
              const compIdx = headerRow.findIndex((h) => h.includes('company') || h.includes('employer') || h.includes('org'));
              const urlIdx = headerRow.findIndex((h) => h.includes('url') || h.includes('link') || h.includes('apply'));
              const locIdx = headerRow.findIndex((h) => h.includes('location') || h.includes('city') || h.includes('remote'));
              const descIdx = headerRow.findIndex((h) => h.includes('desc') || h.includes('detail') || h.includes('summary'));

              // A sheet that's just a list of links (no title column): treat every link as a job to apply to.
              if (titleIdx < 0) {
                linkRows.push(...extractUrls(rows.flat()));
              }
              for (let i = 1; titleIdx >= 0 && i < rows.length && i <= 100; i++) {
                const row = rows[i] as any[];
                if (!row || !row.length) continue;
                const title = titleIdx >= 0 ? String(row[titleIdx] || '') : String(row[0] || '');
                const company = compIdx >= 0 ? String(row[compIdx] || '') : String(row[1] || 'Company');
                const url = urlIdx >= 0 && String(row[urlIdx] || '').startsWith('http') ? String(row[urlIdx]) : `excel://${filename}#row=${i}`;
                const location = locIdx >= 0 ? String(row[locIdx] || '') : (row[2] ? String(row[2]) : undefined);
                const description = descIdx >= 0 ? String(row[descIdx] || '') : (row[3] ? String(row[3]) : `Role imported from ${filename}`);

                if (title.trim()) {
                  rawJobsToSave.push({
                    source: 'import:xlsx',
                    title: title.trim(),
                    company: company.trim() || 'Company',
                    location: location ? location.trim() : undefined,
                    url,
                    description: description.trim(),
                    postedAt: new Date(),
                  });
                }
              }
            }
          }
        } catch (excelErr) {
          throw new AppError(422, `Could not parse spreadsheet: ${errorMessage(excelErr)}`);
        }
      } else if (filename.endsWith('.pdf') || file.mimetype === 'application/pdf') {
        const parsedPdf = await pdfParse(file.buffer);
        const text = parsedPdf.text || '';
        const lines = text.split('\n').map((l: string) => l.trim()).filter(Boolean);
        const title = lines[0] ? clip(lines[0], 200) : 'Job Description';
        const company = lines[1] ? clip(lines[1], 150) : 'Imported Document';

        rawJobsToSave.push({
          source: 'import:pdf',
          url: `document://${filename}#${Date.now()}`,
          title,
          company,
          description: text.slice(0, 15000),
          postedAt: new Date(),
        });
      } else if (filename.endsWith('.csv') || file.mimetype.includes('csv') || file.mimetype.includes('text')) {
        const text = file.buffer.toString('utf-8');
        const lines = text.split('\n').map((l: string) => l.trim()).filter(Boolean);
        const header = (lines[0] ?? '').toLowerCase();
        if (!/title|role|position/.test(header)) {
          // Plain list of links (or links in any column without a title header).
          linkRows.push(...extractUrls(lines));
        } else if (lines.length > 1) {
          const header = lines[0].toLowerCase();
          const sep = header.includes(';') ? ';' : ',';

          for (let i = 1; i < lines.length && i <= 50; i++) {
            const cols = lines[i].split(sep).map((c: string) => c.replace(/^["']|["']$/g, '').trim());
            if (cols.length >= 2 && cols[0]) {
              rawJobsToSave.push({
                source: 'import:csv',
                title: cols[0],
                company: cols[1] || 'Company',
                location: cols[2] || undefined,
                url: cols[3] && cols[3].startsWith('http') ? cols[3] : `csv://${filename}#row=${i}`,
                description: cols[4] || `Role imported from ${filename}`,
                postedAt: new Date(),
              });
            }
          }
        }
      }
    }

    const savedJobs = [];
    for (const rj of rawJobsToSave) {
      const result = await upsertJob(rj).catch(() => null);
      if (result?.job) {
        savedJobs.push(result.job);
        if (result.isNew) {
          await queues.match.add('match', { jobId: result.job.id, userId }, defaultJobOpts).catch(() => null);
        }
      }
    }

    const linkResults = linkRows.length ? await queueLinks(userId, linkRows.slice(0, 200)) : [];

    res.status(201).json({
      linkResults,
      importedCount: savedJobs.length + linkResults.filter((r) => r.status !== 'failed').length,
      jobs: savedJobs,
    });
  }
}

// ---- Saved jobs: kept on the profile so they work the same with any database ----
import { loadProfile } from './profile.controller';

const matchFor = async (userId: string, jobs: any[]) => {
  const apps: any[] = (await Application.find({ userId, jobId: { $in: jobs.map((j) => j._id) } }, { jobId: 1, score: 1, status: 1 }).lean()) as any[];
  const byJob = new Map(apps.filter((a) => String(a.userId ?? userId) === String(userId)).map((a) => [String(a.jobId?._id ?? a.jobId), a]));
  return jobs.map((j) => {
    const obj = typeof j.toObject === 'function' ? j.toObject() : { ...j };
    const a = byJob.get(String(j._id));
    return a ? { ...obj, match: { score: a.score, status: a.status } } : obj;
  });
};

export class SavedJobController {
  static async list(req: Request, res: Response) {
    const userId = currentUser(req);
    const profile: any = await loadProfile(userId);
    const ids: string[] = (profile.savedJobIds ?? []).map(String);
    if (!ids.length) return res.json({ jobs: [], ids: [] });
    const all: any[] = (await JobPost.find({ _id: { $in: ids } })) as any;
    const jobs = all.filter((j) => ids.includes(String(j._id)));
    res.json({ jobs: await matchFor(userId, jobs), ids });
  }

  static async save(req: Request, res: Response) {
    const userId = currentUser(req);
    const id = String(req.params.id);
    if (!(await JobPost.findOne({ _id: id }))) throw new AppError(404, 'Job not found');
    const profile: any = await loadProfile(userId);
    const ids: string[] = (profile.savedJobIds ?? []).map(String);
    if (!ids.includes(id)) profile.savedJobIds = [id, ...ids].slice(0, 500);
    await profile.save();
    res.status(201).json({ saved: true, ids: profile.savedJobIds });
  }

  static async unsave(req: Request, res: Response) {
    const userId = currentUser(req);
    const profile: any = await loadProfile(userId);
    profile.savedJobIds = (profile.savedJobIds ?? []).map(String).filter((x: string) => x !== String(req.params.id));
    await profile.save();
    res.json({ saved: false, ids: profile.savedJobIds });
  }
}
