import type { Request, Response } from 'express';
import { z } from 'zod';
import { currentUser } from '../middleware/auth';
import { Notification } from '../models/notification.model';
import { AppError, parseBody } from '../lib/http';
import { notify } from '../services/notification.service';

const CreateNotificationSchema = z.object({
  type: z
    .enum([
      'draft_ready',
      'draft_needs_attention',
      'needs_user',
      'sent',
      'send_blocked',
      'send_failed',
      'interview_invite',
    ])
    .default('draft_ready'),
  title: z.string().min(1).max(200),
  body: z.string().default(''),
  data: z.record(z.unknown()).optional(),
});

export class NotificationController {
  static async list(req: Request, res: Response) {
    const userId = currentUser(req);
    const unreadOnly = req.query.unread === 'true';
    const limit = Math.min(Number(req.query.limit) || 50, 100);

    const filter: any = { userId };
    if (unreadOnly) {
      filter.readAt = null;
    }

    const [items, unreadCount, total] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).limit(limit),
      Notification.countDocuments({ userId, readAt: null }),
      Notification.countDocuments({ userId }),
    ]);

    res.json({
      success: true,
      notifications: items,
      unreadCount,
      total,
      count: items.length,
    });
  }

  static async unreadCount(req: Request, res: Response) {
    const userId = currentUser(req);
    const count = await Notification.countDocuments({ userId, readAt: null });
    res.json({ success: true, unreadCount: count });
  }

  static async markRead(req: Request, res: Response) {
    const userId = currentUser(req);
    const { id } = req.params;

    const notif = await Notification.findOneAndUpdate(
      { _id: id, userId },
      { readAt: new Date() },
      { new: true },
    );

    if (!notif) {
      throw new AppError(404, 'Notification not found');
    }

    res.json({ success: true, notification: notif });
  }

  static async markAllRead(req: Request, res: Response) {
    const userId = currentUser(req);
    const result = await Notification.updateMany({ userId, readAt: null }, { readAt: new Date() });
    res.json({ success: true, count: result.modifiedCount || 0 });
  }

  static async delete(req: Request, res: Response) {
    const userId = currentUser(req);
    const { id } = req.params;
    await Notification.deleteOne({ _id: id, userId });
    res.json({ success: true });
  }

  static async clearAll(req: Request, res: Response) {
    const userId = currentUser(req);
    await Notification.deleteMany({ userId });
    res.json({ success: true });
  }

  static async create(req: Request, res: Response) {
    const userId = currentUser(req);
    const body = parseBody(CreateNotificationSchema, req.body);
    await notify(userId, body);
    res.status(201).json({ success: true, message: 'Notification dispatched' });
  }
}
