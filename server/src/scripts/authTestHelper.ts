import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { Profile } from '../models/profile.model';
import { User } from '../models/user.model';
import { RefreshToken } from '../models/refreshToken.model';
import { sha256, randomToken } from '../lib/crypto';
import { ACCESS_AUDIENCE, ACCESS_ISSUER } from '../middleware/auth';

/**
 * Test-only: create a verified user and mint a valid access token directly. Real sign-in needs an inbox
 * (see testPasswordlessAuth.ts); other test scripts only need an authenticated user.
 */
export async function createTestSession(email: string, name = 'Test User') {
  const user: any = await User.create({
    email,
    name,
    isEmailVerified: true,
    onboardingStage: 'completed',
    isSetupCompleted: true,
    setupCompleted: true,
    consent: { termsAcceptedAt: new Date() },
  });
  await Profile.create({
    userId: user._id,
    fullName: name,
    email,
    headline: 'Senior Full Stack Engineer',
    primarySkills: ['TypeScript', 'Node.js', 'React'],
    targetRoles: ['Full Stack Engineer'],
    status: 'verified',
    isSetupCompleted: true,
    setupCompleted: true,
  });
  const sid = randomToken(16);
  const now = new Date();
  const refreshToken = randomToken();
  await RefreshToken.create({
    userId: user._id,
    tokenHash: sha256(refreshToken),
    family: sid,
    expiresAt: new Date(now.getTime() + 30 * 864e5),
    absoluteExpiresAt: new Date(now.getTime() + 90 * 864e5),
    sessionStartedAt: now,
    lastUsedAt: now,
  });
  const accessToken = jwt.sign({ stage: 'completed', sid }, env.JWT_ACCESS_SECRET, {
    subject: String(user._id),
    audience: ACCESS_AUDIENCE,
    issuer: ACCESS_ISSUER,
    expiresIn: 3600,
    algorithm: 'HS256',
  });
  return { accessToken, refreshToken, userId: String(user._id) };
}

