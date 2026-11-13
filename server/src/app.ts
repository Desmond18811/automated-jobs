import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { env } from './config/env';
import { AppError } from './lib/http';
import { errorHandler } from './middleware/error';
import apiRouter from './routes';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: env.APP_URL, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use('/api', rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false }));

  // API Routes mounted on /api
  app.use('/api', apiRouter);

  app.use((_req, _res, next) => next(new AppError(404, 'Not found')));
  app.use(errorHandler);
  return app;
}