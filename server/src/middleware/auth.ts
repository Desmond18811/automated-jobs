import type { Request, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../lib/http';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(new AppError(401, 'Missing access token'));
  try {
    const payload = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET, { audience: 'javi-api' }) as jwt.JwtPayload;
    if (!payload.sub) throw new Error('missing subject');
    req.userId = payload.sub;
    next();
  } catch {
    next(new AppError(401, 'Invalid or expired access token'));
  }
};

export function currentUser(req: Request): string {
  if (!req.userId) throw new AppError(401, 'Not signed in');
  return req.userId;
}
