import type { Request, Response, CookieOptions } from 'express';
import { z } from 'zod';
import { env } from '../config/env';
import { AppError, parseBody } from '../lib/http';
import { currentUser } from '../middleware/auth';
import { isProfileComplete } from '../lib/profileComplete';
import { User } from '../models/user.model';
import { Profile } from '../models/profile.model';
import {
  listSessions,
  logout,
  openLink,
  revokeAllSessions,
  revokeSession,
  rotate,
  startSignIn,
  skipSetup,
  updateOnboardingStage,
  verifySignIn,
  type ClientMeta,
  type Tokens,
} from '../services/auth.service';

export const COOKIE = 'javi_rt';
const baseCookie: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  // Lax so the cookie survives the top-level navigation from the emailed link.
  sameSite: 'lax',
  path: '/',
};

export const StartSchema = z.object({
  email: z.string().trim().email().max(254),
  name: z.string().trim().max(120).optional(),
});

export const OpenLinkSchema = z.object({ token: z.string().min(16).max(200) });

export const VerifySchema = z.object({
  token: z.string().min(16).max(200),
  code: z.string().min(4).max(12),
});

export const UpdateStageSchema = z.object({
  stage: z.enum(['otp_pending', 'profile_setup', 'completed']),
});

const meta = (req: Request): ClientMeta => ({ ip: req.ip, userAgent: req.get('user-agent') ?? undefined });

/** Sets the sliding refresh cookie. Its lifetime tracks the session's idle window, so activity keeps it alive. */
const replyWithTokens = (res: Response, tokens: Tokens, status = 200) =>
  res
    .cookie(COOKIE, tokens.refreshToken, {
      ...baseCookie,
      maxAge: Math.max(0, tokens.refreshExpiresAt.getTime() - Date.now()),
      expires: tokens.refreshExpiresAt,
    })
    .status(status)
    .json({
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
      refreshExpiresAt: tokens.refreshExpiresAt,
      user: tokens.user,
      stage: tokens.stage,
    });

export class AuthController {
  static async start(req: Request, res: Response) {
    const b = parseBody(StartSchema, req.body);
    res.json(await startSignIn(b.email, meta(req), b.name));
  }

  static async openLink(req: Request, res: Response) {
    const b = parseBody(OpenLinkSchema, req.body);
    res.json(await openLink(b.token));
  }

  static async verify(req: Request, res: Response) {
    const b = parseBody(VerifySchema, req.body);
    replyWithTokens(res, await verifySignIn(b.token, b.code, meta(req)));
  }

  static async refresh(req: Request, res: Response) {
    const token = req.cookies?.[COOKIE];
    if (!token) throw new AppError(401, 'No session');
    try {
      replyWithTokens(res, await rotate(token, meta(req)));
    } catch (err) {
      res.clearCookie(COOKIE, baseCookie);
      throw err;
    }
  }

  static async logout(req: Request, res: Response) {
    const token = req.cookies?.[COOKIE];
    if (token) await logout(token);
    res.clearCookie(COOKIE, baseCookie).status(204).end();
  }

  static async logoutAll(req: Request, res: Response) {
    await revokeAllSessions(currentUser(req));
    res.clearCookie(COOKIE, baseCookie).status(204).end();
  }

  static async sessions(req: Request, res: Response) {
    res.json({ sessions: await listSessions(currentUser(req), req.cookies?.[COOKIE]) });
  }

  static async revokeSession(req: Request, res: Response) {
    await revokeSession(currentUser(req), String(req.params.id));
    res.status(204).end();
  }

  static async updateOnboardingStage(req: Request, res: Response) {
    const b = parseBody(UpdateStageSchema, req.body);
    res.json(await updateOnboardingStage(currentUser(req), b.stage));
  }

  static async skipSetup(req: Request, res: Response) {
    res.json(await skipSetup(currentUser(req)));
  }

  static async me(req: Request, res: Response) {
    const userId = currentUser(req);
    const user = await User.findById(userId).lean();
    if (!user) throw new AppError(404, 'User not found');

    const profile = await Profile.findOne({ userId }).lean();
    let stage = user.onboardingStage || 'completed';
    const isCompleted = isProfileComplete(profile);

    if (isCompleted) {
      stage = 'completed';
      if (user.onboardingStage !== 'completed' || !user.isSetupCompleted) {
        await User.updateOne({ _id: userId }, { onboardingStage: 'completed', isSetupCompleted: true, setupCompleted: true });
      }
      if (profile && (!profile.isSetupCompleted || !profile.setupCompleted)) {
        await Profile.updateOne({ _id: profile._id }, { isSetupCompleted: true, setupCompleted: true, status: 'verified' });
      }
    } else if (user.setupSkipped) {
      stage = 'completed';
    }

    res.json({
      id: user._id,
      email: user.email,
      name: user.name,
      isEmailVerified: user.isEmailVerified ?? false,
      onboardingStage: stage,
      setupStep: user.setupStep || 1,
      profileImage: user.profileImage,
      hasProfile: !!profile,
      profileStatus: profile?.status,
      isSetupCompleted: isCompleted,
      setupCompleted: isCompleted,
      setupSkipped: !!user.setupSkipped && !isCompleted,
    });
  }
}
