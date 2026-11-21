import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { randomToken, sha256 } from '../lib/crypto';
import { AppError } from '../lib/http';
import { LoginChallenge } from '../models/loginChallenge.model';
import { Profile } from '../models/profile.model';
import { RefreshToken } from '../models/refreshToken.model';
import { User } from '../models/user.model';
import { emailService } from './email.service';

const DAY = 864e5;
const CODE_TTL_MS = 10 * 60_000;
const MAX_CODE_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 30_000;
const SEND_WINDOW_MS = 15 * 60_000;
const MAX_SENDS_PER_WINDOW = 5;
/** A just-rotated refresh token is still honoured briefly, so two tabs refreshing together don't kill the session. */
const ROTATION_GRACE_MS = 10_000;

export interface ClientMeta {
  ip?: string;
  userAgent?: string;
}

export interface SessionUser {
  id: string;
  email: string;
  name?: string;
  onboardingStage?: string;
  isEmailVerified?: boolean;
  profileImage?: string;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
  expiresIn: number;
  stage: string;
  user: SessionUser;
}

const hmac = (value: string): string => crypto.createHmac('sha256', env.JWT_ACCESS_SECRET).update(value).digest('hex');
const codeHash = (email: string, code: string): string => hmac(`${email}:${code}`);
const safeEqual = (a: string, b: string): boolean => {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
};

const toSessionUser = (user: any): SessionUser => ({
  id: String(user.id || user._id),
  email: user.email,
  name: user.name,
  onboardingStage: user.onboardingStage || 'completed',
  isEmailVerified: user.isEmailVerified ?? false,
  profileImage: user.profileImage,
});

const signAccess = (userId: string, stage: string) =>
  jwt.sign({ stage }, env.JWT_ACCESS_SECRET, {
    subject: userId,
    audience: 'javi-api',
    expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
  });

interface SessionSeed {
  family: string;
  sessionStartedAt: Date;
  absoluteExpiresAt: Date;
}

/** Issue an access token plus a fresh refresh token. The refresh token's idle window never outlives the absolute cap. */
async function issueTokens(user: any, meta: ClientMeta, seed?: SessionSeed): Promise<Tokens> {
  const now = new Date();
  const session: SessionSeed = seed ?? {
    family: randomToken(16),
    sessionStartedAt: now,
    absoluteExpiresAt: new Date(now.getTime() + env.SESSION_ABSOLUTE_DAYS * DAY),
  };
  const refreshToken = randomToken();
  const refreshExpiresAt = new Date(
    Math.min(now.getTime() + env.SESSION_IDLE_DAYS * DAY, session.absoluteExpiresAt.getTime()),
  );
  await RefreshToken.create({
    userId: user._id ?? user.id,
    tokenHash: sha256(refreshToken),
    family: session.family,
    expiresAt: refreshExpiresAt,
    absoluteExpiresAt: session.absoluteExpiresAt,
    sessionStartedAt: session.sessionStartedAt,
    lastUsedAt: now,
    userAgent: meta.userAgent?.slice(0, 300),
    ip: meta.ip,
  });
  const sessionUser = toSessionUser(user);
  const stage = sessionUser.onboardingStage || 'completed';
  return {
    accessToken: signAccess(sessionUser.id, stage),
    refreshToken,
    refreshExpiresAt,
    expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
    stage,
    user: sessionUser,
  };
}

export interface StartResult {
  ok: true;
  email: string;
  message: string;
  resendAfterSeconds: number;
}

/**
 * Begin passwordless sign-in/sign-up. Always answers the same way so it can't be used to discover which emails
 * have accounts. Sends are throttled per email; a throttled request is silently dropped.
 */
export async function startSignIn(email: string, meta: ClientMeta, name?: string): Promise<StartResult> {
  const normalizedEmail = email.toLowerCase().trim();
  const result: StartResult = {
    ok: true,
    email: normalizedEmail,
    message: 'If that address can receive email, a sign-in link and code are on their way.',
    resendAfterSeconds: RESEND_COOLDOWN_MS / 1000,
  };

  const now = Date.now();
  const previous = await LoginChallenge.find({ email: normalizedEmail });
  const recent = previous.filter((c: any) => now - new Date(c.createdAt ?? 0).getTime() < SEND_WINDOW_MS);
  const newest = recent.reduce<number>((t, c: any) => Math.max(t, new Date(c.createdAt ?? 0).getTime()), 0);
  if (recent.length >= MAX_SENDS_PER_WINDOW || now - newest < RESEND_COOLDOWN_MS) return result;

  let user: any = await User.findOne({ email: normalizedEmail });
  if (!user) {
    user = await User.create({
      email: normalizedEmail,
      name,
      isEmailVerified: false,
      onboardingStage: 'otp_pending',
      consent: { termsAcceptedAt: new Date() },
    });
    await Profile.create({ userId: user._id, fullName: name ?? '', email: normalizedEmail, status: 'draft' });
  }

  // Only the newest challenge can be used.
  for (const c of previous as any[]) {
    if (!c.consumedAt) {
      c.consumedAt = new Date();
      await c.save();
    }
  }

  const code = String(crypto.randomInt(100000, 1000000));
  const linkToken = randomToken(32);
  await LoginChallenge.create({
    email: normalizedEmail,
    codeHash: codeHash(normalizedEmail, code),
    linkTokenHash: sha256(linkToken),
    expiresAt: new Date(now + CODE_TTL_MS),
    attempts: 0,
    ip: meta.ip,
    userAgent: meta.userAgent?.slice(0, 300),
  });

  const linkUrl = `${env.APP_URL.replace(/\/$/, '')}/auth/verify?token=${encodeURIComponent(linkToken)}`;
  await emailService.sendSignInEmail(normalizedEmail, code, linkUrl, user.name);
  return result;
}

async function findLiveChallenge(linkToken: string): Promise<any> {
  const matches = await LoginChallenge.find({ linkTokenHash: sha256(linkToken) });
  const challenge: any = matches[0];
  if (!challenge || challenge.consumedAt) throw new AppError(400, 'This sign-in link is no longer valid. Request a new one.');
  if (new Date(challenge.expiresAt) < new Date()) throw new AppError(400, 'This sign-in link has expired. Request a new one.');
  return challenge;
}

/** The emailed link was opened. Confirms it is live and tells the page which address to show; does not sign in. */
export async function openLink(linkToken: string): Promise<{ email: string; expiresAt: Date }> {
  const challenge = await findLiveChallenge(linkToken);
  if (!challenge.linkOpenedAt) {
    challenge.linkOpenedAt = new Date();
    await challenge.save();
  }
  return { email: challenge.email, expiresAt: challenge.expiresAt };
}

/** Both factors: the link token (proves this is the emailed challenge) and the code (proves inbox access). */
export async function verifySignIn(linkToken: string, code: string, meta: ClientMeta): Promise<Tokens> {
  const challenge = await findLiveChallenge(linkToken);
  const cleanCode = (code || '').replace(/\s/g, '');

  if (!safeEqual(codeHash(challenge.email, cleanCode), challenge.codeHash)) {
    challenge.attempts = (challenge.attempts || 0) + 1;
    if (challenge.attempts >= MAX_CODE_ATTEMPTS) challenge.consumedAt = new Date();
    await challenge.save();
    throw new AppError(
      400,
      challenge.attempts >= MAX_CODE_ATTEMPTS
        ? 'Too many wrong codes. Request a new sign-in email.'
        : 'That code is not right. Check your email and try again.',
    );
  }

  challenge.consumedAt = new Date();
  await challenge.save();

  const user: any = await User.findOne({ email: challenge.email });
  if (!user) throw new AppError(404, 'Account not found');
  user.isEmailVerified = true;
  if (!user.onboardingStage || user.onboardingStage === 'otp_pending') user.onboardingStage = 'profile_setup';
  await user.save();

  return issueTokens(user, meta);
}

/**
 * Exchange a refresh token for a new pair, sliding the idle window forward. Rejects past the absolute cap.
 * Presenting a token that was rotated long ago means it leaked: the whole session is closed.
 */
export async function rotate(refreshToken: string, meta: ClientMeta): Promise<Tokens> {
  const now = new Date();
  const matches = await RefreshToken.find({ tokenHash: sha256(refreshToken) });
  const doc: any = matches[0];
  if (!doc) throw new AppError(401, 'Session expired, please sign in again');

  if (doc.revokedAt && !doc.rotatedAt) throw new AppError(401, 'Session was signed out, please sign in again');
  if (doc.rotatedAt && now.getTime() - new Date(doc.rotatedAt).getTime() > ROTATION_GRACE_MS) {
    await RefreshToken.updateMany({ family: doc.family }, { revokedAt: now });
    throw new AppError(401, 'Session was reused and has been closed, please sign in again');
  }
  if (new Date(doc.expiresAt) < now || new Date(doc.absoluteExpiresAt) < now) {
    throw new AppError(401, 'Session expired, please sign in again');
  }

  const user: any = await User.findById(doc.userId);
  if (!user) throw new AppError(401, 'Session expired, please sign in again');

  if (!doc.rotatedAt) {
    doc.rotatedAt = now;
    doc.revokedAt = now;
    await doc.save();
  }
  return issueTokens(user, meta, {
    family: doc.family,
    sessionStartedAt: new Date(doc.sessionStartedAt),
    absoluteExpiresAt: new Date(doc.absoluteExpiresAt),
  });
}

export async function logout(refreshToken: string): Promise<void> {
  const matches = await RefreshToken.find({ tokenHash: sha256(refreshToken) });
  const doc: any = matches[0];
  if (doc) await RefreshToken.updateMany({ family: doc.family }, { revokedAt: new Date() });
}

export interface SessionInfo {
  id: string;
  userAgent?: string;
  ip?: string;
  startedAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
  current: boolean;
}

/** One entry per signed-in device: the newest live refresh token of each family. */
export async function listSessions(userId: string, currentRefreshToken?: string): Promise<SessionInfo[]> {
  const now = new Date();
  const docs = (await RefreshToken.find({ userId })) as any[];
  const currentFamily = currentRefreshToken
    ? docs.find((d) => d.tokenHash === sha256(currentRefreshToken))?.family
    : undefined;
  return docs
    .filter((d) => !d.revokedAt && new Date(d.expiresAt) > now)
    .map((d) => ({
      id: d.family,
      userAgent: d.userAgent,
      ip: d.ip,
      startedAt: d.sessionStartedAt,
      lastUsedAt: d.lastUsedAt,
      expiresAt: d.expiresAt,
      current: d.family === currentFamily,
    }))
    .sort((a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime());
}

export async function revokeSession(userId: string, family: string): Promise<void> {
  await RefreshToken.updateMany({ userId, family }, { revokedAt: new Date() });
}

export async function revokeAllSessions(userId: string): Promise<void> {
  await RefreshToken.updateMany({ userId }, { revokedAt: new Date() });
}

export async function updateOnboardingStage(
  userId: string,
  stage: 'otp_pending' | 'profile_setup' | 'completed',
): Promise<{ ok: boolean; stage: string }> {
  const user = await User.findById(userId);
  if (!user) throw new AppError(404, 'User not found');
  user.onboardingStage = stage;
  await user.save();
  return { ok: true, stage };
}
