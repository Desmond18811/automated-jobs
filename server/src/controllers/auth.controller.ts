import type { Request, Response, CookieOptions } from 'express';
import { z } from 'zod';
import { env } from '../config/env';
import { AppError, parseBody } from '../lib/http';
import { login, logout, register, rotate, type Tokens } from '../services/auth.service';

export const COOKIE = 'javi_rt';
export const cookieOpts: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/api/auth',
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

const replyWithTokens = (res: Response, tokens: Tokens, status = 200) =>
  res.cookie(COOKIE, tokens.refreshToken, cookieOpts).status(status).json({ accessToken: tokens.accessToken });

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

  static async refresh(req: Request, res: Response) {
    const token = req.cookies?.[COOKIE];
    if (!token) throw new AppError(401, 'No session');
    const tokens = await rotate(token);
    replyWithTokens(res, tokens);
  }

  static async logout(req: Request, res: Response) {
    const token = req.cookies?.[COOKIE];
    if (token) await logout(token);
    res.clearCookie(COOKIE, { path: '/api/auth' }).status(204).end();
  }
}
