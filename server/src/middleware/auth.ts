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

function userIdFromHeader(header: string | undefined): string | undefined {
  if (!header?.startsWith('Bearer ')) return undefined;
  try {
    const payload = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET, { audience: 'javi-api' }) as jwt.JwtPayload;
    return payload.sub;
  } catch {
    return undefined;
  }
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.headers.authorization?.startsWith('Bearer ')) return next(new AppError(401, 'Missing access token'));
  const userId = userIdFromHeader(req.headers.authorization);
  if (!userId) return next(new AppError(401, 'Invalid or expired access token'));
  req.userId = userId;
  next();
};

export const optionalAuth: RequestHandler = (req, _res, next) => {
  const userId = userIdFromHeader(req.headers.authorization);
  if (userId) req.userId = userId;
  next();
};

export function currentUser(req: Request): string {
  if (!req.userId) throw new AppError(401, 'Not signed in');
  return req.userId;
}
