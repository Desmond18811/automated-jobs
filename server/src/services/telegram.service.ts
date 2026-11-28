import crypto from 'node:crypto';
import { env } from '../config/env';
import { logger } from '../lib/logger';
import { botInfo, esc, telegramConfigured, tg } from '../lib/telegram';
import { Profile } from '../models/profile.model';
import { Task } from '../models/task.model';
import { handleReply, handleTextReply } from './reply.service';

/* ------------------------------------------------------------------ linking */

/** One-time codes from "Connect Telegram"; they only need to live until the user taps Start. */
const linkCodes = new Map<string, { userId: string; expires: number }>();

/** A t.me link that opens the bot and, on Start, connects this account's chat. */
export async function createLinkUrl(userId: string): Promise<{ url: string; bot: string }> {
  const bot = await botInfo();
  if (!bot) throw new Error('The Telegram bot is not set up on this server (TELEGRAM_BOT_TOKEN).');
  for (const [k, v] of linkCodes) if (v.expires < Date.now()) linkCodes.delete(k);
  const code = crypto.randomBytes(12).toString('base64url');
  linkCodes.set(code, { userId, expires: Date.now() + 15 * 60_000 });
  return { url: `https://t.me/${bot.username}?start=${code}`, bot: bot.username };
}

export async function telegramStatus(userId: string) {
  const bot = await botInfo();
  const p: any = await Profile.findOne({ userId }).lean();
  return {
    configured: !!bot,
    bot: bot?.username ?? null,
    linked: !!p?.telegramChatId,
    username: p?.telegramUsername ?? null,
    linkedAt: p?.telegramLinkedAt ?? null,
  };
}

export async function unlinkTelegram(userId: string): Promise<void> {
  const p: any = await Profile.findOne({ userId });
  if (!p) return;
  p.set({ telegramChatId: undefined, telegramUsername: undefined, telegramLinkedAt: undefined });
  await p.save();
}

async function profileByChat(chatId: number | string) {
  return Profile.findOne({ telegramChatId: String(chatId) });
}

/* ------------------------------------------------------------------- sending */

export interface TelegramAlert {
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

const ICON: Record<string, string> = {
  needs_user: '🙋', interview_invite: '🎉', draft_needs_attention: '✏️', draft_ready: '📝', sent: '✅', send_failed: '⚠️', send_blocked: '⛔', test: '👋',
};

/**
 * Sends an alert to the user's Telegram chat. A question (needs_user with a task) gets buttons for its
 * options, a "Use this" button for a suggested answer, or asks for a reply to this message.
 */
export async function sendTelegramAlert(userId: string, a: TelegramAlert): Promise<{ sent: boolean; error?: string }> {
  if (!telegramConfigured()) return { sent: false, error: 'Telegram bot not configured' };
  const p: any = await Profile.findOne({ userId }).lean();
  if (!p?.telegramChatId) return { sent: false, error: 'Telegram not connected' };

  const d = a.data ?? {};
  const lines = [`${ICON[a.type] ?? '🔔'} <b>${esc(a.title)}</b>`];
  if (d.jobTitle || d.company) lines.push(`<i>${esc([d.jobTitle, d.company].filter(Boolean).join(' at '))}</i>`);
  if (a.body) lines.push('', esc(a.body));

  const taskId = typeof d.taskId === 'string' ? d.taskId : undefined;
  const qs = (Array.isArray(d.questions) ? d.questions : []) as { label: string; options?: string[]; suggested?: string }[];
  const keyboard: { text: string; callback_data: string }[][] = [];
  if (taskId) {
    if (qs.length === 1 && qs[0].options?.length && qs[0].options.length <= 8) {
      lines.push('', esc(qs[0].label));
      qs[0].options.forEach((o, i) => keyboard.push([{ text: o.slice(0, 60), callback_data: `a:${taskId}:${i}` }]));
    } else if (qs.length) {
      qs.forEach((q, i) => lines.push(`${qs.length > 1 ? `${i + 1}. ` : ''}${esc(q.label)}${q.options?.length ? ` (${esc(q.options.join(' / '))})` : ''}`));
      lines.push('', qs.length > 1 ? '<b>Reply to this message</b> with your answers separated by |' : '<b>Reply to this message</b> with your answer.');
      if (qs.length === 1 && qs[0].suggested) keyboard.push([{ text: `Use: ${qs[0].suggested}`.slice(0, 60), callback_data: `s:${taskId}` }]);
    } else {
      lines.push('', d.live ? 'Sort it out in the J.A.V.I browser window, then tap Done.' : 'Tap Done once it is handled.');
      keyboard.push([{ text: 'Done', callback_data: `c:${taskId}` }, { text: 'I submitted it myself', callback_data: `d:${taskId}` }]);
    }
    if (typeof d.replyUrl === 'string') lines.push('', `Or answer here: ${esc(d.replyUrl)}`);
  }

  try {
    const msg = await tg('sendMessage', {
      chat_id: p.telegramChatId,
      text: lines.join('\n').slice(0, 4000),
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      ...(keyboard.length ? { reply_markup: { inline_keyboard: keyboard } } : {}),
    });
    if (taskId) {
      const t: any = await Task.findById(taskId).catch(() => null);
      if (t) {
        t.telegramMessageId = msg.message_id;
        await t.save().catch(() => undefined);
      }
    }
    return { sent: true };
  } catch (err) {
    logger.warn({ err: (err as Error).message, userId }, 'Telegram alert not delivered');
    return { sent: false, error: (err as Error).message };
  }
}

/* ------------------------------------------------------------------ receiving */

const say = (chatId: number | string, text: string, extra: Record<string, unknown> = {}) =>
  tg('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true, ...extra }).catch((err) =>
    logger.warn({ err: (err as Error).message }, 'Telegram reply failed'),
  );

async function onStart(chatId: number, from: any, code: string) {
  const link = code ? linkCodes.get(code) : undefined;
  if (!link || link.expires < Date.now()) {
    const known = await profileByChat(chatId);
    return say(chatId, known
      ? '👋 This chat is already connected to J.A.V.I. You will get alerts and questions here.'
      : 'To connect, open J.A.V.I → Profile → <b>Connect Telegram</b> and tap the link there. (Links work for 15 minutes.)');
  }
  linkCodes.delete(code);
  // One chat belongs to one account: disconnect it from anyone else first.
  const other: any = await profileByChat(chatId);
  if (other && String(other.userId) !== link.userId) {
    other.set({ telegramChatId: undefined, telegramUsername: undefined, telegramLinkedAt: undefined });
    await other.save();
  }
  const p: any = await Profile.findOne({ userId: link.userId });
  if (!p) return say(chatId, 'Your J.A.V.I profile was not found. Sign in and try Connect Telegram again.');
  p.set({ telegramChatId: String(chatId), telegramUsername: from?.username ?? from?.first_name ?? '', telegramLinkedAt: new Date() });
  await p.save();
  return say(chatId, '✅ <b>Connected.</b> J.A.V.I will send alerts here and ask you here when it needs an answer. Reply to a question message to answer it, or tap its buttons.');
}

async function onText(msg: any) {
  const chatId = msg.chat.id;
  const text = String(msg.text ?? '').trim();
  if (text.startsWith('/start')) return onStart(chatId, msg.from, text.split(/\s+/)[1] ?? '');
  const p: any = await profileByChat(chatId);
  if (!p) return say(chatId, 'This chat is not connected yet. In J.A.V.I open Profile → <b>Connect Telegram</b>.');
  if (/^\/(help|tasks)$/.test(text)) {
    const open = (await Task.find({ userId: p.userId, status: 'open' })).filter((t: any) => String(t.userId) === String(p.userId) && t.status === 'open');
    return say(chatId, open.length
      ? `You have ${open.length} open question${open.length === 1 ? '' : 's'}:\n${open.slice(0, 8).map((t: any) => `• <code>${t.replyCode}</code> ${esc(t.payload?.company ?? t.reason)}`).join('\n')}\n\nReply to the question message, or start with its code, e.g. <code>${open[0].replyCode} yes</code>.`
      : 'Nothing is waiting on you right now. 👍');
  }
  // A reply to a question message answers that question.
  let taskId: string | undefined;
  const repliedTo = msg.reply_to_message?.message_id;
  if (repliedTo) {
    const open = (await Task.find({ userId: p.userId, status: 'open' })).filter((t: any) => String(t.userId) === String(p.userId));
    const hit: any = open.find((t: any) => t.telegramMessageId === repliedTo);
    if (hit) taskId = String(hit._id ?? hit.id);
  }
  return say(chatId, esc(await handleTextReply(String(p.userId), text, { taskId })), { reply_to_message_id: msg.message_id });
}

async function onButton(q: any) {
  const [kind, taskId, idx] = String(q.data ?? '').split(':');
  const chatId = q.message?.chat?.id;
  const ack = (text: string) => tg('answerCallbackQuery', { callback_query_id: q.id, text }).catch(() => undefined);
  const p: any = chatId ? await profileByChat(chatId) : null;
  const task: any = taskId ? await Task.findById(taskId).catch(() => null) : null;
  if (!p || !task || String(task.userId) !== String(p.userId)) return ack('That question is no longer available.');
  if (task.status !== 'open') return ack('Already handled.');
  try {
    let done = '';
    if (kind === 'a' || kind === 's') {
      const qn = task.questions[0];
      const value = kind === 'a' ? qn?.options?.[Number(idx)] : qn?.suggested;
      if (!qn || !value) return ack('That option is no longer available.');
      await handleReply(task, 'answer', { [qn.key]: value });
      done = `✅ Answered: ${value}`;
    } else if (kind === 'c') {
      await handleReply(task, 'continue');
      done = task.live ? '✅ J.A.V.I is carrying on in the browser.' : '✅ J.A.V.I will try again.';
    } else if (kind === 'd') {
      await handleReply(task, 'submitted');
      done = '✅ Marked as submitted.';
    }
    await ack(done.replace(/^✅ /, ''));
    await tg('editMessageReplyMarkup', { chat_id: chatId, message_id: q.message.message_id, reply_markup: { inline_keyboard: [] } }).catch(() => undefined);
    await say(chatId, esc(done), { reply_to_message_id: q.message.message_id });
  } catch (err) {
    await ack(`⚠️ ${(err as Error).message}`.slice(0, 190));
  }
}

let polling = false;

/** Listens for bot messages with long polling, so it works on localhost without a public URL. One per process. */
export async function startTelegramPolling(): Promise<void> {
  if (polling || !telegramConfigured() || !env.TELEGRAM_POLLING) return;
  polling = true;
  const bot = await botInfo();
  if (!bot) {
    polling = false;
    logger.warn('Telegram bot token was rejected (getMe failed); alerts are off until it is fixed.');
    return;
  }
  await tg('deleteWebhook', { drop_pending_updates: false }).catch(() => undefined);
  logger.info(`Telegram bot @${bot.username} is listening`);
  let offset = 0;
  void (async () => {
    while (polling) {
      try {
        const updates: any[] = await tg('getUpdates', { offset, timeout: 25, allowed_updates: ['message', 'callback_query'] }, 35_000);
        for (const u of updates) {
          offset = u.update_id + 1;
          try {
            if (u.message?.text) await onText(u.message);
            else if (u.callback_query) await onButton(u.callback_query);
          } catch (err) {
            logger.warn({ err: (err as Error).message }, 'Telegram update failed');
          }
        }
      } catch (err) {
        const m = (err as Error).message;
        // Another process is polling with the same token (e.g. a second server); back off instead of fighting.
        logger.warn({ err: m }, 'Telegram polling error');
        await new Promise((r) => setTimeout(r, /409|Conflict/.test(m) ? 30_000 : 5_000));
      }
    }
  })();
}

export function stopTelegramPolling(): void {
  polling = false;
}
