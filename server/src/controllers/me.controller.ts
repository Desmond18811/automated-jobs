import type { Request, Response } from 'express';
import { z } from 'zod';
import { parseBody } from '../lib/http';
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
import { verifyPassword } from '../services/auth.service';
import { disconnectGmail } from '../services/gmail.service';

export class MeController {
  static async exportData(req: Request, res: Response) {
    const userId = currentUser(req);
    const [user, profile, applications, tasks, notifications, audit] = await Promise.all([
      User.findById(userId, { passwordHash: 0, 'gmail.refreshTokenEnc': 0 }).lean(),
      Profile.findOne({ userId }).lean(),
      Application.find({ userId }).lean(),
      Task.find({ userId }).lean(),
      Notification.find({ userId }).lean(),
      AuditLog.find({ userId }).lean(),
    ]);
    res.setHeader('Content-Disposition', 'attachment; filename="javi-export.json"');
    res.json({ exportedAt: new Date(), user, profile, applications, tasks, notifications, audit });
  }

  static async deleteAccount(req: Request, res: Response) {
    const userId = currentUser(req);
    const { password } = parseBody(z.object({ password: z.string().min(1) }), req.body);
    await verifyPassword(userId, password);

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
    ]);
    await User.deleteOne({ _id: userId });
    logger.info({ files }, 'account deleted');
    res.clearCookie('javi_rt', { path: '/api/auth' }).status(204).end();
  }
}
