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

  const allowedOrigins = [
    env.APP_URL,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ].filter(Boolean);

  app.use(
    cors({
      origin: (origin, callback) => {
        const devLocal =
          env.NODE_ENV !== 'production' &&
          !!origin &&
          (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'));
        const isNgrok = !!origin && (origin.endsWith('.ngrok-free.app') || origin.endsWith('.ngrok.app') || origin.includes('ngrok'));
        if (!origin || allowedOrigins.includes(origin) || devLocal || isNgrok) {
          return callback(null, true);
        }
        return callback(null, false);
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  const limiter = rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false });
  app.use('/api', limiter);

  // Root welcome / health ping
  app.get('/', (req, res) => res.json({
    status: 200,
    message: "Welcome to J.A.V.I backend  🟢"
  }));
  app.get('/health', (_req, res) => res.json({ ok: true, uptime: process.uptime() }));

  app.use('/api', apiRouter);

  app.use((_req, _res, next) => next(new AppError(404, 'Not found')));

  app.use(errorHandler);
  return app;
}