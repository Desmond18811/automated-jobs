import { connectDb, disconnectDb } from './lib/db';
import { logger } from './lib/logger';
import { isInMemoryActive } from './lib/memoryDb';
import { startWorkers } from './workers/start';

async function main() {
  await connectDb();
  if (isInMemoryActive()) {
    // The local dev store lives inside one process. The API runs the workers itself in this mode, so a
    // separate worker would only pick up jobs it can't see. Get Atlas reachable to run workers separately.
    logger.warn('Atlas is not reachable, so the API process is running the workers. This separate worker is not needed; exiting.');
    process.exit(0);
  }
  const stop = await startWorkers();

  const shutdown = async () => {
    logger.info('Shutting down workers');
    await stop();
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
