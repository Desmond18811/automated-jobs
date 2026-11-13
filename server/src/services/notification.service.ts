import type { Types } from 'mongoose';
import { logger } from '../lib/logger';
import { Notification, type NotificationType } from '../models/notification.model';

/**
 * Single entry point for telling the user something. Today: stored in-app notification.
 * Phase 5 adds fan-out here: Socket.io room `user:<id>`, web push, transactional email,
 * and WhatsApp/SMS for urgent types (needs_user, interview_invite).
 */
export async function notify(
  userId: string | Types.ObjectId,
  n: { type: NotificationType; title: string; body: string; data?: Record<string, unknown> },
): Promise<void> {
  await Notification.create({ userId, ...n });
  logger.info({ userId: String(userId), type: n.type }, n.title);
}
