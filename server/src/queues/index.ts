import { Queue, type JobsOptions } from 'bullmq';
import { redis } from '../lib/redis';
import type { Channel } from '../models/application.model';

export const defaultJobOpts: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 60_000 },
  removeOnComplete: 1000,
  removeOnFail: 5000,
};

export const queues = {
  ingest: new Queue('ingest', { connection: redis }),
  match: new Queue('match', { connection: redis }),
  generate: new Queue('generate', { connection: redis }),
  send: new Queue('send', { connection: redis }), // email + assisted
  browser: new Queue('browser', { connection: redis }), // Playwright form filling, concurrency 1
};

export async function enqueueGenerate(applicationId: string): Promise<void> {
  await queues.generate.add('generate', { applicationId }, defaultJobOpts);
}

/** Routes delivery to the right queue for the channel. Custom ids avoid ':' (reserved by BullMQ). */
export async function enqueueDelivery(app: { id: string; channel: Channel }, delayMs = 0): Promise<void> {
  const queue = app.channel === 'form' ? queues.browser : queues.send;
  await queue.add('deliver', { applicationId: app.id }, { ...defaultJobOpts, delay: delayMs, jobId: `deliver-${app.id}-${Date.now()}` });
}
