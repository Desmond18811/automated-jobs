import { Worker } from 'bullmq';
import { env } from '../config/env';
import { closeBrowser } from '../lib/browser';
import { disconnectLiveBrowser } from '../lib/liveBrowser';
import { logger } from '../lib/logger';
import { redis } from '../lib/redis';
import { queues } from '../queues';
import { deliverProcessor } from './deliver';
import { generateProcessor } from './generate';
import { ingestProcessor } from './ingest';
import { matchProcessor } from './match';

/** Starts every queue worker in this process. Returns a function that stops them. */
export async function startWorkers(): Promise<() => Promise<void>> {
  const workers = [
    new Worker('ingest', ingestProcessor, { connection: redis, concurrency: 1 }),
    new Worker('match', matchProcessor, { connection: redis, concurrency: 5 }),
    new Worker('generate', generateProcessor, { connection: redis, concurrency: 3 }),
    new Worker('send', deliverProcessor, { connection: redis, concurrency: 5 }),
    // Live mode: each application is its own tab and may sit waiting for an answer, so allow a few at once;
    // one CAPTCHA shouldn't hold up everything else. Headless stays one at a time.
    new Worker('browser', deliverProcessor, { connection: redis, concurrency: env.APPLY_BROWSER === 'live' ? 3 : 1 }),
  ];
  for (const w of workers) {
    w.on('failed', (job, err) => logger.warn({ queue: w.name, jobId: job?.id, err: err.message }, 'job failed'));
  }
  await queues.ingest.upsertJobScheduler('ingest-all', { every: env.INGEST_EVERY_MINUTES * 60_000 }, { name: 'ingest-all' });
  logger.info(`Workers running; ingest every ${env.INGEST_EVERY_MINUTES} min`);
  return async () => {
    await Promise.all(workers.map((w) => w.close()));
    await closeBrowser();
    await disconnectLiveBrowser();
  };
}
