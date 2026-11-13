import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { randomToken, sha256 } from '../lib/crypto';
import { AppError } from '../lib/http';
import { Profile } from '../models/profile.model';
import { RefreshToken } from '../models/refreshToken.model';
import { User } from '../models/user.model';

export interface Tokens { accessToken: string; refreshToken: string }

const signAccess = (userId: string) =>
  jwt.sign({}, env.JWT_ACCESS_SECRET, { subject: userId, audience: 'javi-api', expiresIn: env.ACCESS_TOKEN_TTL_SECONDS });

async function issueTokens(userId: string, family = randomToken(16)): Promise<Tokens> {
  const refreshToken = randomToken();
  await RefreshToken.create({
    userId,
    tokenHash: sha256(refreshToken),
    family,
    expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_DAYS * 864e5),
  });
  return { accessToken: signAccess(userId), refreshToken };
}

export async function register(email: string, password: string, name?: string): Promise<Tokens> {
  if (await User.exists({ email: email.toLowerCase() })) throw new AppError(409, 'An account with this email already exists');
  const user = await User.create({
    email,
    passwordHash: await bcrypt.hash(password, 12),
    name,
    consent: { termsAcceptedAt: new Date() },
  });
  await Profile.create({ userId: user._id, fullName: name ?? '', email });
  return issueTokens(user.id);
}

export async function login(email: string, password: string): Promise<Tokens> {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new AppError(401, 'Wrong email or password');
  return issueTokens(user.id);
}

/** Rotation with reuse detection: presenting an already-rotated token revokes the whole family. */
export async function rotate(refreshToken: string): Promise<Tokens> {
  const doc = await RefreshToken.findOne({ tokenHash: sha256(refreshToken) });
  if (!doc || doc.expiresAt < new Date()) throw new AppError(401, 'Session expired, please log in again');
  if (doc.revokedAt) {
    await RefreshToken.updateMany({ family: doc.family }, { revokedAt: new Date() });
    throw new AppError(401, 'Session was reused and has been closed, please log in again');
  }
  doc.revokedAt = new Date();
  await doc.save();
  return issueTokens(String(doc.userId), doc.family);
}

export async function logout(refreshToken: string): Promise<void> {
  const doc = await RefreshToken.findOne({ tokenHash: sha256(refreshToken) });
  if (doc) await RefreshToken.updateMany({ family: doc.family }, { revokedAt: new Date() });
}

export async function verifyPassword(userId: string, password: string): Promise<void> {
  const user = await User.findById(userId);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new AppError(401, 'Wrong password');
}
