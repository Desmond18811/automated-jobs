import type { Request, Response } from 'express';
import { z } from 'zod';
import { AppError, errorMessage, parseBody } from '../lib/http';
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

  static async getJob(req: Request, res: Response) {
    const job = await JobPost.findById(req.params.id);
    if (!job) throw new AppError(404, 'Job not found');
    res.json(job);
  }
}
