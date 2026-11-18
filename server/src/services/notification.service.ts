import type { Types } from 'mongoose';
import { logger } from '../lib/logger';
import { emitToUser } from '../lib/socket';
import { Notification, type NotificationType } from '../models/notification.model';
import { sendWhatsAppAlert } from './whatsapp.service';

/**
 * Single entry point for telling the user something.
 * Dispatches to:
 * 1. Persistent MongoDB Notification store
 * 2. Real-time Socket.IO room `user:<id>` for instant dashboard updates
 * 3. WhatsApp SMS notification for urgent events (needs_user, interview_invite, etc.)
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

  // 2. WhatsApp text notification for actionable / urgent events & application deliveries
  const URGENT_TYPES: NotificationType[] = ['needs_user', 'interview_invite', 'draft_needs_attention', 'sent'];
  if (URGENT_TYPES.includes(n.type)) {
    await sendWhatsAppAlert(uid, {
      type: n.type,
      title: n.title,
      body: n.body,
      data: n.data,
    }).catch((err) => {
      logger.warn({ err: err?.message, userId: uid }, 'Deferred WhatsApp notification dispatch');
    });
  }
}
