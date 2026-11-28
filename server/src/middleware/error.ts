import type { ErrorRequestHandler } from 'express';
import { AppError } from '../lib/http';
import fs from 'node:fs';
import path from 'node:path';
import { env } from '../config/env';
import { logger } from '../lib/logger';

/** Development only: unhandled errors are also appended here, since the server's terminal is easy to lose. */
const ERROR_LOG = path.join(process.cwd(), '.data', 'errors.log');

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: err.message, code: err.code, details: err.details });
    return;
  }
  if (err?.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ error: 'That file is too big. CVs can be up to 5 MB and job files up to 10 MB; try exporting a smaller PDF.', code: err.code });
      return;
    }
    res.status(400).json({ error: err.code === 'LIMIT_UNEXPECTED_FILE' ? 'Attach the file in the right field and try again.' : err.message, code: err.code });
    return;
  }
  logger.error({ err }, 'Unhandled error');
  if (env.NODE_ENV !== 'production') {
    try {
      fs.mkdirSync(path.dirname(ERROR_LOG), { recursive: true });
      fs.appendFileSync(ERROR_LOG, `${new Date().toISOString()} ${req.method} ${req.originalUrl}\n${err?.stack ?? err}\n\n`);
    } catch {
      /* logging must never break the response */
    }
    res.status(500).json({ error: 'Internal server error', detail: String(err?.message ?? err).slice(0, 500) });
    return;
  }
  res.status(500).json({ error: 'Internal server error' });
};
