import type { Request, Response } from 'express';
import { env } from '../config/env';
import { AppError, errorMessage } from '../lib/http';
import { currentUser } from '../middleware/auth';
import { User } from '../models/user.model';
import { disconnectGmail, gmailConfigured, gmailAuthUrl, handleGmailCallback } from '../services/gmail.service';

export class GmailController {
  static async status(req: Request, res: Response) {
    const user = await User.findById(currentUser(req)).lean();
    res.json({
      configured: gmailConfigured(),
      connected: !!user?.gmail?.refreshTokenEnc,
      address: user?.gmail?.address || null,
      connectedAt: user?.gmail?.connectedAt || null,
    });
  }

  static async connect(req: Request, res: Response) {
    res.json({ url: gmailAuthUrl(currentUser(req)) });
  }

  static async callback(req: Request, res: Response) {
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    if (!code || !state) throw new AppError(400, 'Missing code or state');
    try {
      await handleGmailCallback(code, state);
      res.redirect(`${env.APP_URL}/dash/settings?gmail=connected`);
    } catch (err) {
      res.redirect(`${env.APP_URL}/dash/settings?gmail=error&message=${encodeURIComponent(errorMessage(err))}`);
    }
  }

  static async disconnect(req: Request, res: Response) {
    await disconnectGmail(currentUser(req));
    res.status(204).end();
  }
}
