import type { Job } from 'bullmq';
import { env } from '../config/env';
import { isDupKey } from '../lib/http';
import { hardFilter, scoreMatch } from '../matching/score';
import { Application } from '../models/application.model';
import { JobPost } from '../models/jobPost.model';
import { pickChannel } from '../services/job.service';
import { Profile } from '../models/profile.model';
import { enqueueGenerate } from '../queues';

/**
 * Keyword filters first, then scoring. A manual add (userId set) always creates an application
 * for that user; filter notes are kept so the UI can warn ("pays below your floor").
 */
export async function matchProcessor(job: Job<{ jobId: string; userId?: string }>) {
  const post = await JobPost.findById(job.data.jobId);
  if (!post) return { matched: 0 };
  const forced = Boolean(job.data.userId);
  const profiles = forced ? await Profile.find({ userId: job.data.userId }) : await Profile.find({ status: 'verified' });

  let matched = 0;
  for (const profile of profiles) {
    const filter = hardFilter(profile, post);
    if (!filter.pass && !forced) continue;
    const { score, breakdown } = scoreMatch(profile, post);
    if (!forced && score < env.MATCH_THRESHOLD) continue;
    try {
      const app = await Application.create({
        userId: profile.userId,
        jobId: post._id,
        fingerprint: post.fingerprint,
        status: 'matched',
        score,
        scoreBreakdown: breakdown,
        filterNotes: filter.reasons,
        channel: pickChannel(post),
        history: [{ from: null, to: 'matched', at: new Date(), note: forced ? 'added by you' : `score ${score.toFixed(2)}` }],
      });
      matched++;
      if (profile.status === 'verified') await enqueueGenerate(app.id);
    } catch (err) {
      if (!isDupKey(err)) throw err; // already matched for this user
    }
  }
  return { matched };
}
