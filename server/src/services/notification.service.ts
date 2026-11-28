import type { Types } from 'mongoose';
import { logger } from '../lib/logger';
import { emitToUser } from '../lib/socket';
import { Notification, type NotificationType } from '../models/notification.model';
import { sendTelegramAlert } from './telegram.service';

/**
 * Single entry point for telling the user something.
 * Dispatches to:
 * 1. Persistent MongoDB Notification store
 * 2. Real-time Socket.IO room `user:<id>` for instant dashboard updates
 * 3. Telegram message for events worth a ping (questions, interviews, drafts, sends); questions come with
 *    buttons or ask for a reply, and the answer goes straight back into the task.
 */
export async function notify(
  userId: string | Types.ObjectId,
  n: { type: NotificationType; title: string; body: string; data?: Record<string, unknown> },
): Promise<void> {
  const uid = String(userId);
  const doc = await Notification.create({ userId, ...n });
  logger.info({ userId: uid, type: n.type }, n.title);

  // 1. Socket.IO live push
  emitToUser(uid, 'notification:new', doc);
  emitToUser(uid, 'notifications:refresh', { countDelta: 1, notification: doc });

  // 2. Telegram for events worth a ping
  const URGENT_TYPES: NotificationType[] = ['needs_user', 'interview_invite', 'draft_needs_attention', 'sent', 'send_failed', 'send_blocked'];
  if (URGENT_TYPES.includes(n.type)) {
    await sendTelegramAlert(uid, { type: n.type, title: n.title, body: n.body, data: n.data }).catch((err) => {
      logger.warn({ err: err?.message, userId: uid }, 'Telegram notification not sent');
    });
  }
}
