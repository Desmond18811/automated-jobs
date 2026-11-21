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

let clerkClientInstance: any = null;

async function getClerkClient() {
  if (clerkClientInstance) return clerkClientInstance;
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) return null;
  try {
    const { createClerkClient } = await import('@clerk/backend');
    clerkClientInstance = createClerkClient({ secretKey });
    return clerkClientInstance;
  } catch {
    return null;
  }
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(new AppError(401, 'Missing access token'));
  const token = header.slice(7);

  // 1. Try local J.A.V.I JWT verification
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, { audience: 'javi-api' }) as jwt.JwtPayload;
    if (payload.sub) {
      req.userId = payload.sub;
      return next();
    }
  } catch {
    // Token may be a Clerk session token
  }

  // 2. Dual-Verification: Verify Clerk token if CLERK_SECRET_KEY is configured
  const secretKey = process.env.CLERK_SECRET_KEY || env.CLERK_SECRET_KEY;
  if (secretKey) {
    try {
      const { verifyToken } = await import('@clerk/backend');
      const verified: any = await verifyToken(token, { secretKey });
      if (verified?.sub) {
        req.userId = verified.sub;
        return next();
      }
    } catch {
      // Not a valid Clerk token
    }
  }

  next(new AppError(401, 'Invalid or expired access token'));
};

export const optionalAuth: RequestHandler = async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next();
  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, { audience: 'javi-api' }) as jwt.JwtPayload;
    if (payload.sub) {
      req.userId = payload.sub;
      return next();
    }
  } catch {
    // Try Clerk
  }

  const secretKey = process.env.CLERK_SECRET_KEY || env.CLERK_SECRET_KEY;
  if (secretKey) {
    try {
      const { verifyToken } = await import('@clerk/backend');
      const verified: any = await verifyToken(token, { secretKey });
      if (verified?.sub) {
        req.userId = verified.sub;
        return next();
      }
    } catch {
      // Ignore
    }
  }

  next();
};

export function currentUser(req: Request): string {
  if (!req.userId) throw new AppError(401, 'Not signed in');
  return req.userId;
}
