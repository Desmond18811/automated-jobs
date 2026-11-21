import type { Request, Response } from 'express';
import { z } from 'zod';
import { AppError, parseBody } from '../lib/http';
import { logger } from '../lib/logger';
import { removeUserFiles } from '../lib/storage';
import { currentUser } from '../middleware/auth';
import { Application } from '../models/application.model';
import { AuditLog } from '../models/audit.model';
import { RefreshToken } from '../models/refreshToken.model';
import { User } from '../models/user.model';
import { Notification } from '../models/notification.model';
import { Profile } from '../models/profile.model';
import { Suppression } from '../models/suppression.model';
import { Task } from '../models/task.model';
import { SiteAccount } from '../models/siteAccount.model';
import { BusinessLead } from '../models/businessLead.model';
import { BusinessServices } from '../models/businessServices.model';
import { TaxonomyRequest } from '../models/taxonomyRequest.model';
import { disconnectGmail } from '../services/gmail.service';

export class MeController {
  static async exportData(req: Request, res: Response) {
    const userId = currentUser(req);
    const [user, profile, applications, tasks, notifications, audit, siteAccounts, businessLeads, businessServices] = await Promise.all([
      User.findById(userId, { passwordHash: 0, 'gmail.refreshTokenEnc': 0 }).lean(),
      Profile.findOne({ userId }).lean(),
      Application.find({ userId }).lean(),
      Task.find({ userId }).lean(),
      Notification.find({ userId }).lean(),
      AuditLog.find({ userId }).lean(),
      // Which sites JAVI holds an account on, never the passwords.
      SiteAccount.find({ userId }, { passwordEnc: 0 }).lean(),
      BusinessLead.find({ userId }).lean(),
      BusinessServices.findOne({ userId }).lean(),
    ]);
    res.setHeader('Content-Disposition', 'attachment; filename="javi-export.json"');
    res.json({ exportedAt: new Date(), user, profile, applications, tasks, notifications, audit, siteAccounts, businessLeads, businessServices });
  }

  static async deleteAccount(req: Request, res: Response) {
    const userId = currentUser(req);
    // No password to re-enter any more: the user must type their own email to confirm.
    const { confirmEmail } = parseBody(z.object({ confirmEmail: z.string().min(1) }), req.body);
    const email = (await User.findById(userId, { email: 1 }).lean())?.email;
    if (!email || email.toLowerCase() !== confirmEmail.toLowerCase().trim()) {
      throw new AppError(400, 'Type your account email to confirm deletion');
    }
    await disconnectGmail(userId).catch((err) => logger.warn({ err }, 'gmail revoke failed during deletion'));
    const files = await removeUserFiles(userId);
    await Promise.all([
      Application.deleteMany({ userId }),
      Task.deleteMany({ userId }),
      Notification.deleteMany({ userId }),
      AuditLog.deleteMany({ userId }),
      Suppression.deleteMany({ userId }),
      RefreshToken.deleteMany({ userId }),
      Profile.deleteOne({ userId }),
      SiteAccount.deleteMany({ userId }),
      BusinessLead.deleteMany({ userId }),
      BusinessServices.deleteOne({ userId }),
      ...(email ? [TaxonomyRequest.deleteMany({ email })] : []),
    ]);
    await User.deleteOne({ _id: userId });
    logger.info({ files }, 'account deleted');
    res.clearCookie('javi_rt', { path: '/api/auth' }).status(204).end();
  }
}
