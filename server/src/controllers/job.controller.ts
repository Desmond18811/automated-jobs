import type { Request, Response } from 'express';
import { z } from 'zod';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import * as XLSX from 'xlsx';
import { AppError, errorMessage, parseBody } from '../lib/http';
import { clip, safeHost } from '../lib/normalize';
import { currentUser } from '../middleware/auth';
import { JobPost } from '../models/jobPost.model';
import { defaultJobOpts, queues } from '../queues';
import { extractJobFromUrl, upsertJob } from '../services/job.service';
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

export class JobController {
  static async manual(req: Request, res: Response) {
    const userId = currentUser(req);
    const b = parseBody(ManualJobSchema, req.body);

    let found: Partial<RawJob> = {};
    if (b.url && !(b.title && b.company && b.description)) {
      try {
        found = await extractJobFromUrl(b.url);
      } catch (err) {
        if (!(b.title && b.company)) {
          throw new AppError(422, `Could not read that page (${errorMessage(err)}). Paste the title, company and description yourself.`);
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
    res.json({ jobs, total, count: jobs.length });
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

    // 1. Process URL
    if (url) {
      const extracted = await extractJobFromUrl(url).catch(() => null);
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

              for (let i = 1; i < rows.length && i <= 100; i++) {
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
        if (lines.length > 1) {
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

    res.status(201).json({
      importedCount: savedJobs.length,
      jobs: savedJobs,
    });
  }
}
