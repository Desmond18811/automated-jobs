import http from 'node:http';
import { env } from './config/env';
import { createApp } from './app';
import { connectDb, disconnectDb } from './lib/db';
import { logger } from './lib/logger';

export const app = createApp();
export let server: http.Server | null = null;

export async function startServer() {
  await connectDb();
  server = app.listen(env.PORT, () => {
    logger.info(`JAVI API server listening on :${env.PORT}`);
  });
  return server;
}

export async function stopServer() {
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server!.close((err) => (err ? reject(err) : resolve()));
    });
  }
  await disconnectDb();
}

// Auto-run if executed directly as entrypoint
if (process.env.NODE_ENV !== 'test') {
  startServer().catch((err) => {
    logger.fatal({ err }, 'API failed to start');
    process.exit(1);
  });

  const shutdown = async () => {
    logger.info('Shutting down API server...');
    await stopServer();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

export * from './models';
export * from './controllers';
export * from './routes';
export default app;
