import type { Request, Response } from 'express';
import { currentUser } from '../middleware/auth';
import { Notification } from '../models/notification.model';

export class NotificationController {
  static async list(req: Request, res: Response) {
    res.json(await Notification.find({ userId: currentUser(req) }).sort({ createdAt: -1 }).limit(50));
  }

  static async markAllRead(req: Request, res: Response) {
    await Notification.updateMany({ userId: currentUser(req), readAt: null }, { readAt: new Date() });
    res.status(204).end();
  }
}
