import { Worker } from 'bullmq';
import { env } from './config/env';
import { closeBrowser } from './lib/browser';
import { disconnectLiveBrowser } from './lib/liveBrowser';
import { connectDb, disconnectDb } from './lib/db';
import { logger } from './lib/logger';
import { redis } from './lib/redis';
import { queues } from './queues';
import { deliverProcessor } from './workers/deliver';
import { generateProcessor } from './workers/generate';
import { ingestProcessor } from './workers/ingest';
import { matchProcessor } from './workers/match';

async function main() {
  await connectDb();
  const workers = [
    new Worker('ingest', ingestProcessor, { connection: redis, concurrency: 1 }),
    new Worker('match', matchProcessor, { connection: redis, concurrency: 5 }),
    new Worker('generate', generateProcessor, { connection: redis, concurrency: 3 }),
    new Worker('send', deliverProcessor, { connection: redis, concurrency: 5 }),
    // Live mode: each application is its own tab and may sit waiting for a WhatsApp reply, so allow a
    // few at once; one CAPTCHA shouldn't hold up everything else. Headless stays one at a time.
    new Worker('browser', deliverProcessor, { connection: redis, concurrency: env.APPLY_BROWSER === 'live' ? 3 : 1 }),
  ];
  for (const w of workers) {
    w.on('failed', (job, err) => logger.warn({ queue: w.name, jobId: job?.id, err: err.message }, 'job failed'));
  }

  await queues.ingest.upsertJobScheduler('ingest-all', { every: env.INGEST_EVERY_MINUTES * 60_000 }, { name: 'ingest-all' });
  logger.info(`Workers running; ingest every ${env.INGEST_EVERY_MINUTES} min`);

  const shutdown = async () => {
    logger.info('Shutting down workers');
    await Promise.all(workers.map((w) => w.close()));
    await closeBrowser();
    await disconnectLiveBrowser();
    await disconnectDb();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  logger.fatal({ err }, 'Workers failed to start');
  process.exit(1);
});
