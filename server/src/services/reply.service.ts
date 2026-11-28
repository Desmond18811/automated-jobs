import { AppError } from '../lib/http';
import { Profile } from '../models/profile.model';
import { Task, type TaskDoc } from '../models/task.model';
import { answerTask, markTaskDone, retryTask } from './task.service';

/**
 * Answers that arrive outside the dashboard: the one-tap reply page and WhatsApp text replies.
 * Both end up in the same task functions the dashboard uses.
 */

export type ReplyAction = 'answer' | 'continue' | 'submitted';

/** What the reply page needs to render (no profile data beyond the task itself). */
export function publicTask(t: TaskDoc) {
  return {
    id: t.id,
    reason: t.reason,
    message: t.message,
    status: t.status,
    live: Boolean(t.live),
    questions: t.questions,
    jobTitle: t.payload?.jobTitle,
    company: t.payload?.company,
    openUrl: t.payload?.openUrl,
    createdAt: (t as any).createdAt,
  };
}

export async function handleReply(task: TaskDoc, action: ReplyAction, answers: Record<string, string> = {}) {
  if (task.status !== 'open') throw new AppError(409, 'This one is already handled.');
  const userId = String(task.userId);
  if (action === 'answer') return answerTask(userId, task.id, answers);
  if (action === 'submitted') return markTaskDone(userId, task.id);
  // "Continue": a live session is waiting on the page, so just release it; otherwise try again.
  if (task.live) {
    task.status = 'done';
    await task.save();
    return task;
  }
  return retryTask(userId, task.id);
}

const digits = (s: string) => s.replace(/\D/g, '');

/** Match the sender to a profile by phone (last 10 digits, so "+234 803…" equals "0803…"). */
async function profileByPhone(from: string) {
  const want = digits(from).slice(-10);
  if (want.length < 7) return null;
  const candidates = await Profile.find({ phone: { $regex: want.slice(-4) } }, { userId: 1, phone: 1 }).limit(50);
  return candidates.find((p) => digits(p.phone ?? '').slice(-10) === want) ?? null;
}

/** Map one typed answer to a question: an option number ("2") picks that option. */
function resolveAnswer(raw: string, options?: string[]): string {
  const n = Number(raw.trim());
  if (options?.length && Number.isInteger(n) && n >= 1 && n <= options.length) return options[n - 1];
  const exact = options?.find((o) => o.toLowerCase() === raw.trim().toLowerCase());
  return exact ?? raw.trim();
}

/**
 * "<code> <answer>" | "<code> a | b" | "<code> done" | "<code> submitted". The code can be left out
 * when the user has only one open task. Returns the text to reply with.
 */
export async function handleWhatsAppText(from: string, body: string): Promise<string> {
  const profile = await profileByPhone(from);
  if (!profile) return "JAVI doesn't recognise this number. Add it to your profile (Identity step) to reply here.";
  return handleTextReply(String(profile.userId), body);
}

/**
 * One typed reply from a user (WhatsApp, Telegram), already matched to their account. `taskId` pins the
 * task when the channel knows it (a Telegram reply to the question's message); otherwise the reply code
 * at the start of the text, or the only open task, decides.
 */
export async function handleTextReply(userId: string, body: string, opts: { taskId?: string } = {}): Promise<string> {
  const all = await Task.find({ userId, status: 'open' }).sort({ createdAt: -1 });
  // Some stores ignore the filter; keep only this user's open tasks.
  const open = all.filter((t: any) => String(t.userId) === String(userId) && t.status === 'open');
  if (!open.length) return 'Nothing is waiting on you right now. 👍';

  const m = body.trim().match(/^(\d{4,5})\b\s*([\s\S]*)$/);
  let task = opts.taskId ? open.find((t: any) => String(t._id ?? t.id) === opts.taskId) : undefined;
  if (!task && m) task = open.find((t) => t.replyCode === m[1]);
  const rest = (m && task && task.replyCode === m[1] ? m[2] : body).trim();
  if (!task) {
    if (open.length > 1) {
      return `You have ${open.length} things waiting. Start your reply with the code from the message, e.g. "${open[0].replyCode} yes". Codes: ${open
        .slice(0, 5)
        .map((t) => `${t.replyCode} (${t.payload?.company ?? t.reason})`)
        .join(', ')}`;
    }
    task = open[0];
  }

  try {
    if (/^(done|continue|ok|solved)$/i.test(rest)) {
      await handleReply(task, 'continue');
      return task.live ? '✅ Got it. JAVI is carrying on in the browser.' : '✅ Got it. JAVI will try again.';
    }
    if (/^submitted$/i.test(rest)) {
      await handleReply(task, 'submitted');
      return '✅ Marked as submitted.';
    }
    if (!task.questions.length) return `Reply "${task.replyCode} done" once you've handled it in the browser.`;

    const parts = task.questions.length > 1 ? rest.split('|') : [rest];
    const answers: Record<string, string> = {};
    task.questions.forEach((q, i) => {
      const raw = parts[i]?.trim() || (/^(yes|y|ok|use it)$/i.test(rest) && q.suggested ? q.suggested : '');
      if (raw) answers[q.key] = resolveAnswer(raw, q.options);
    });
    await handleReply(task, 'answer', answers);
    return task.live ? '✅ Thanks. JAVI is filling it in now.' : '✅ Saved. JAVI will use this from now on.';
  } catch (err) {
    return `⚠️ ${(err as Error).message}`;
  }
}
