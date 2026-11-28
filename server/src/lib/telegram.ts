import { env } from '../config/env';

/** Telegram Bot API. https://core.telegram.org/bots/api */
export const telegramConfigured = (): boolean => !!env.TELEGRAM_BOT_TOKEN;

export async function tg<T = any>(method: string, params: Record<string, unknown> = {}, timeoutMs = 20_000): Promise<T> {
  if (!env.TELEGRAM_BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN is not set');
  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const json: any = await res.json().catch(() => ({}));
  if (!json.ok) throw new Error(`Telegram ${method}: ${json.description ?? res.status}`);
  return json.result as T;
}

let me: { username: string; first_name: string } | null = null;

/** The bot's @username (cached). */
export async function botInfo(): Promise<{ username: string; first_name: string } | null> {
  if (!telegramConfigured()) return null;
  me ??= await tg('getMe').catch(() => null);
  return me;
}

/** Text is sent as HTML; escape anything that comes from users or job pages. */
export const esc = (s: unknown): string => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);
