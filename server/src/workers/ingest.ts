import type { Job } from 'bullmq';
import { logger } from '../lib/logger';
import { upsertJob } from '../services/job.service';
import { Profile, type CareerPage } from '../models/profile.model';
import { defaultJobOpts, queues } from '../queues';
import { buildSources } from '../sources';

/** Pull every source, normalize + dedupe, and queue matching for new postings. */
export async function ingestProcessor(_job: Job) {
  const profiles = await Profile.find({ status: 'verified' }, { targetRoles: 1, careerPages: 1 })
    .lean<{ targetRoles?: string[]; careerPages?: CareerPage[] }[]>();
  const roles = [...new Set(profiles.flatMap((p) => p.targetRoles ?? []))];
  const careerPages = profiles.flatMap((p) => p.careerPages ?? []);

  const stats: Record<string, { fetched: number; created: number; error?: string }> = {};
  for (const source of buildSources({ roles, careerPages })) {
    const s = (stats[source.name] = { fetched: 0, created: 0 } as { fetched: number; created: number; error?: string });
    try {
      const raws = await source.fetch();
      s.fetched = raws.length;
      for (const raw of raws) {
        const result = await upsertJob(raw);
        if (result?.isNew) {
          s.created++;
          await queues.match.add('match', { jobId: result.job.id }, defaultJobOpts);
        }
      }
    } catch (err) {
      s.error = err instanceof Error ? err.message : String(err);
      logger.warn({ err, source: source.name }, 'source failed');
    }
  }
  logger.info({ stats }, 'ingest finished');
  return stats;
}
