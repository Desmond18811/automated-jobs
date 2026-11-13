import crypto from 'node:crypto';
import { env } from '../config/env';

const key = Buffer.from(env.TOKEN_ENC_KEY, 'base64');

/** AES-256-GCM. Output: iv.tag.ciphertext (base64 parts). Used for Gmail refresh tokens at rest. */
export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), enc].map((b) => b.toString('base64')).join('.');
}

export function decrypt(payload: string): string {
  const [iv, tag, enc] = payload.split('.').map((p) => Buffer.from(p, 'base64'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}

export const sha256 = (s: string): string => crypto.createHash('sha256').update(s).digest('hex');
export const randomToken = (bytes = 48): string => crypto.randomBytes(bytes).toString('base64url');
export const shortId = (): string => crypto.randomUUID().slice(0, 8);
