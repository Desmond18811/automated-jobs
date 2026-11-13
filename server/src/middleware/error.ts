import type { ErrorRequestHandler } from 'express';
import { AppError } from '../lib/http';
import { logger } from '../lib/logger';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: err.message, code: err.code, details: err.details });
    return;
  }
  if (err?.name === 'MulterError') {
    res.status(400).json({ error: err.message, code: err.code });
    return;
  }
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
};
