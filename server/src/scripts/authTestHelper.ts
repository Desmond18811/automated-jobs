import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { Profile } from '../models/profile.model';
import { User } from '../models/user.model';

/**
 * Test-only: create a verified user and mint a valid access token directly. Real sign-in needs an inbox
 * (see testPasswordlessAuth.ts); other test scripts only need an authenticated user.
 */
export async function createTestSession(email: string, name = 'Test User') {
  const user: any = await User.create({
    email,
    name,
    isEmailVerified: true,
    onboardingStage: 'profile_setup',
    consent: { termsAcceptedAt: new Date() },
  });
  await Profile.create({ userId: user._id, fullName: name, email, status: 'draft' });
  const accessToken = jwt.sign({ stage: 'profile_setup' }, env.JWT_ACCESS_SECRET, {
    subject: String(user._id),
    audience: 'javi-api',
    expiresIn: 3600,
  });
  return { accessToken, userId: String(user._id) };
}
