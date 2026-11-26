import type { Request, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../lib/http';
import { isProfileComplete } from '../lib/profileComplete';
import { Profile } from '../models/profile.model';
import { RefreshToken } from '../models/refreshToken.model';
import { User } from '../models/user.model';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export const ACCESS_AUDIENCE = 'javi-api';
export const ACCESS_ISSUER = 'javi';

/** Verifies an access token's signature, algorithm, issuer, audience and expiry. Returns its claims or undefined. */
export function verifyAccessToken(token: string): { sub: string; sid?: string } | undefined {
  try {
    const p = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      algorithms: ['HS256'],
      audience: ACCESS_AUDIENCE,
      issuer: ACCESS_ISSUER,
    }) as jwt.JwtPayload;
    return p.sub ? { sub: p.sub, sid: typeof p.sid === 'string' ? p.sid : undefined } : undefined;
  } catch {
    return undefined;
  }
}

// A signed token alone is not enough: the session behind it must still be live and the user must still exist.
// Results are cached briefly so this is not a DB round trip on every request; sign-out clears the cache.
const live = new Map<string, { ok: boolean; at: number }>();
const LIVE_TTL_MS = 5_000;

export function forgetSessions(): void {
  live.clear();
}

async function sessionIsLive(userId: string, sid: string): Promise<boolean> {
  const hit = live.get(sid);
  if (hit && Date.now() - hit.at < LIVE_TTL_MS) return hit.ok;
  const now = Date.now();
  const docs: any[] = await RefreshToken.find({ family: sid });
  const hasLiveToken = docs.some(
    (d) => String(d.userId) === String(userId) && !d.revokedAt && +new Date(d.expiresAt) > now && +new Date(d.absoluteExpiresAt) > now,
  );
  const ok = hasLiveToken && !!(await User.findById(userId).lean());
  if (ok) live.set(sid, { ok, at: now }); // never remember a refusal: a hiccup must not lock someone out
  if (live.size > 5000) live.clear();
  return ok;
}

async function authenticate(header: string | undefined): Promise<string | undefined> {
  if (!header?.startsWith('Bearer ')) return undefined;
  const claims = verifyAccessToken(header.slice(7));
  if (!claims?.sid) return undefined;
  return (await sessionIsLive(claims.sub, claims.sid)) ? claims.sub : undefined;
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    if (!req.headers.authorization?.startsWith('Bearer ')) return next(new AppError(401, 'Missing access token'));
    const userId = await authenticate(req.headers.authorization);
    if (!userId) return next(new AppError(401, 'Invalid or expired access token'));
    req.userId = userId;
    next();
  } catch (err) {
    next(err);
  }
};

export const optionalAuth: RequestHandler = async (req, _res, next) => {
  try {
    const userId = await authenticate(req.headers.authorization);
    if (userId) req.userId = userId;
    next();
  } catch (err) {
    next(err);
  }
};

/** Authenticated AND finished setup. Completion is read from the profile on every call. */
export const requireOnboarded: RequestHandler = async (req, _res, next) => {
  try {
    if (!req.userId) return next(new AppError(401, 'Not signed in'));
    const profile = await Profile.findOne({ userId: req.userId }).lean();
    if (!isProfileComplete(profile)) return next(new AppError(403, 'Finish setting up your profile first'));
    next();
  } catch (err) {
    next(err);
  }
};

export function currentUser(req: Request): string {
  if (!req.userId) throw new AppError(401, 'Not signed in');
  return req.userId;
}
