import type { Request, Response, CookieOptions } from 'express';
import { z } from 'zod';
import { env } from '../config/env';
import { AppError, parseBody } from '../lib/http';
import { currentUser } from '../middleware/auth';
import { User } from '../models/user.model';
import {
  login,
  loginGoogle,
  logout,
  register,
  rotate,
  verifyOtp,
  resendOtp,
  forgotPassword,
  resetPassword,
  updateOnboardingStage,
  type Tokens,
} from '../services/auth.service';

export const COOKIE = 'javi_rt';
export const cookieOpts: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
  path: '/',
  maxAge: env.REFRESH_TOKEN_DAYS * 864e5,
};

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
  name: z.string().max(120).optional(),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const GoogleLoginSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  avatarUrl: z.string().optional(),
});

export const VerifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().min(4).max(10),
});

export const ResendOtpSchema = z.object({
  email: z.string().email(),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const ResetPasswordSchema = z.object({
  email: z.string().email(),
  otp: z.string().min(4).max(10),
  newPassword: z.string().min(8).max(200).optional(),
});

export const UpdateStageSchema = z.object({
  stage: z.enum(['otp_pending', 'profile_setup', 'completed']),
});

const replyWithTokens = (res: Response, tokens: any, status = 200) =>
  res.cookie(COOKIE, tokens.refreshToken, cookieOpts).status(status).json({
    accessToken: tokens.accessToken,
    user: tokens.user,
    ok: tokens.ok ?? true,
    stage: tokens.stage,
    message: tokens.message,
  });

export class AuthController {
  static async register(req: Request, res: Response) {
    const b = parseBody(RegisterSchema, req.body);
    const tokens = await register(b.email, b.password, b.name);
    replyWithTokens(res, tokens, 201);
  }

  static async login(req: Request, res: Response) {
    const b = parseBody(LoginSchema, req.body);
    const tokens = await login(b.email, b.password);
    replyWithTokens(res, tokens);
  }

  static async googleLogin(req: Request, res: Response) {
    const b = parseBody(GoogleLoginSchema, req.body);
    const tokens = await loginGoogle(b.email, b.name, b.avatarUrl);
    replyWithTokens(res, tokens);
  }

  static async verifyOtp(req: Request, res: Response) {
    const b = parseBody(VerifyOtpSchema, req.body);
    const tokens = await verifyOtp(b.email, b.otp);
    replyWithTokens(res, tokens, 200);
  }

  static async resendOtp(req: Request, res: Response) {
    const b = parseBody(ResendOtpSchema, req.body);
    const result = await resendOtp(b.email);
    res.json(result);
  }

  static async forgotPassword(req: Request, res: Response) {
    const b = parseBody(ForgotPasswordSchema, req.body);
    const result = await forgotPassword(b.email);
    res.json(result);
  }

  static async resetPassword(req: Request, res: Response) {
    const b = parseBody(ResetPasswordSchema, req.body);
    const result = await resetPassword(b.email, b.otp, b.newPassword);
    res.json(result);
  }

  static async updateOnboardingStage(req: Request, res: Response) {
    const userId = currentUser(req);
    const b = parseBody(UpdateStageSchema, req.body);
    const result = await updateOnboardingStage(userId, b.stage);
    res.json(result);
  }

  static async refresh(req: Request, res: Response) {
    const token = req.cookies?.[COOKIE];
    if (!token) throw new AppError(401, 'No session');
    const tokens = await rotate(token);
    replyWithTokens(res, tokens);
  }

  static async logout(req: Request, res: Response) {
    const token = req.cookies?.[COOKIE];
    if (token) await logout(token);
    res.clearCookie(COOKIE, { path: '/' }).status(204).end();
  }

  static async me(req: Request, res: Response) {
    const userId = currentUser(req);
    const user = await User.findById(userId).select('-passwordHash').lean();
    if (!user) throw new AppError(404, 'User not found');
    res.json({
      id: user._id,
      email: user.email,
      name: user.name,
      isEmailVerified: user.isEmailVerified ?? false,
      onboardingStage: user.onboardingStage || 'completed',
      profileImage: user.profileImage,
    });
  }
}
