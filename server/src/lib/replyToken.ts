import crypto from 'node:crypto';
import { env } from '../config/env';

/**
 * Tokens for the one-tap answer links in WhatsApp messages. The link must work on a phone where the
 * user isn't logged in, so it carries its own proof: taskId + HMAC(taskId). It only grants
 * answering that one task.
 */
const sign = (taskId: string) => crypto.createHmac('sha256', env.JWT_ACCESS_SECRET).update(`reply:${taskId}`).digest('base64url').slice(0, 22);

export const replyToken = (taskId: string): string => `${taskId}.${sign(taskId)}`;

export function taskIdFromReplyToken(token: string): string | null {
  const [taskId, sig] = token.split('.');
  if (!taskId || !sig || sig.length !== 22) return null;
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(sign(taskId))) ? taskId : null;
}

export const replyUrl = (taskId: string): string => `${env.APP_URL.replace(/\/$/, '')}/r/${replyToken(taskId)}`;
