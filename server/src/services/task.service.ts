import type { Types } from 'mongoose';
import { AppError } from '../lib/http';
import { enqueueDelivery } from '../queues';
import { Application } from '../models/application.model';
import { transition } from './stateMachine';
import { audit } from '../models/audit.model';
import { notify } from './notification.service';
import { Profile } from '../models/profile.model';
import crypto from 'node:crypto';
import { replyUrl } from '../lib/replyToken';
import { Task, type NeedsReason, type TaskDoc, type TaskQuestion } from '../models/task.model';

const TITLES: Record<NeedsReason, string> = {
  unknown_question: 'A form asked something new',
  captcha: 'A CAPTCHA needs a human',
  login_wall: 'This site needs you to log in',
  salary_question: 'A form is asking about salary',
  interview_invite: 'Interview invite!',
  assisted_platform: 'Ready for you to submit',
  confirm_submission: 'Please confirm this application went through',
  no_form_found: 'Could not find the application form',
  reconnect_gmail: 'Reconnect Gmail',
};

/** A 4-digit code that's unique among the user's open tasks, so a WhatsApp reply maps to one task. */
async function newReplyCode(userId: string): Promise<string> {
  const open = await Task.find({ userId, status: 'open' }, { replyCode: 1 }).lean();
  const taken = new Set(open.map((t: any) => t.replyCode));
  for (let i = 0; i < 50; i++) {
    const code = String(crypto.randomInt(1000, 10000));
    if (!taken.has(code)) return code;
  }
  return String(crypto.randomInt(10000, 100000));
}

export async function openTask(input: {
  userId: string;
  applicationId?: string;
  reason: NeedsReason;
  message: string;
  questions?: TaskQuestion[];
  payload?: Record<string, unknown>;
  /** A live browser session is holding the page open and will continue as soon as this is answered. */
  live?: boolean;
}) {
  const replyCode = await newReplyCode(input.userId);
  const task = await Task.create({ ...input, questions: input.questions ?? [], replyCode });
  await notify(input.userId, {
    type: 'needs_user',
    title: TITLES[input.reason],
    body: input.message,
    data: {
      taskId: task.id,
      applicationId: input.applicationId,
      replyCode,
      replyUrl: replyUrl(task.id),
      live: input.live,
      questions: (input.questions ?? []).map((q) => ({ label: q.label, options: q.options, suggested: q.suggested })),
      jobTitle: input.payload?.jobTitle,
      company: input.payload?.company,
    },
  });
  return task;
}

/**
 * Hold a live session until the user handles the task (dashboard, reply link or WhatsApp reply),
 * or `until()` reports the page no longer needs them (e.g. the CAPTCHA disappeared because they
 * solved it in the window). Returns the final task, or null on timeout.
 */
export async function waitForTask(
  taskId: string,
  opts: { timeoutMs: number; until?: () => Promise<boolean>; pollMs?: number },
): Promise<TaskDoc | null> {
  const deadline = Date.now() + opts.timeoutMs;
  while (Date.now() < deadline) {
    const task = await Task.findById(taskId);
    if (!task) return null;
    if (task.status !== 'open') return task;
    if (opts.until && (await opts.until().catch(() => false))) {
      task.status = 'done';
      task.live = false;
      await task.save();
      return task;
    }
    await new Promise((r) => setTimeout(r, opts.pollMs ?? 2500));
  }
  return null;
}

/** Answers that apply only to one application (e.g. salary for that role). */
export async function oneOffAnswers(applicationId: string): Promise<Record<string, string>> {
  const task = await Task.findOne({ applicationId, status: 'answered' }).sort({ updatedAt: -1 });
  return task?.answers ?? {};
}

/**
 * The user answers once. Reusable answers go into the answer bank so JAVI never asks again;
 * salary answers default to one-off. Then the application resumes from "approved".
 */
export async function answerTask(userId: string, taskId: string, answers: Record<string, string>, remember: Record<string, boolean> = {}) {
  const task = await Task.findOne({ _id: taskId, userId, status: 'open' });
  if (!task) throw new AppError(404, 'Task not found or already handled');
  const missing = task.questions.filter((q) => q.required && !answers[q.key]?.trim());
  if (missing.length) throw new AppError(400, `Please answer: ${missing.map((q) => q.label).join('; ')}`);

  const profile = await Profile.findOne({ userId });
  if (!profile) throw new AppError(404, 'Profile not found');
  for (const q of task.questions) {
    const answer = answers[q.key]?.trim();
    if (!answer) continue;
    const reusable = remember[q.key] ?? !q.isSalary;
    const existing = profile.answerBank.find((a) => a.key === q.key);
    if (existing) Object.assign(existing, { answer, reusable, updatedAt: new Date() });
    else profile.answerBank.push({ key: q.key, question: q.label, answer, reusable, updatedAt: new Date() });
  }
  await profile.save();

  task.status = 'answered';
  task.answers = answers;
  await task.save();
  await resume(task.applicationId, 'answered by you');
  return task;
}

/** For assisted platforms and unconfirmed forms: the user says "I submitted it". */
export async function markTaskDone(userId: string, taskId: string) {
  const task = await Task.findOne({ _id: taskId, userId, status: 'open' });
  if (!task) throw new AppError(404, 'Task not found or already handled');
  task.status = 'done';
  await task.save();
  if (task.applicationId) {
    const app = await Application.findById(task.applicationId);
    if (app && app.status === 'needs_user') {
      app.delivery = { ...app.delivery, sentAt: new Date() };
      await transition(app, 'sent', 'submitted by you');
      await audit({ userId, applicationId: app._id, action: 'send', channel: app.channel, result: 'sent', detail: 'submitted by user' });
    }
  }
  return task;
}

/** CAPTCHA solved / logged in / Gmail reconnected: just try again. */
export async function retryTask(userId: string, taskId: string) {
  const task = await Task.findOne({ _id: taskId, userId, status: 'open' });
  if (!task) throw new AppError(404, 'Task not found or already handled');
  task.status = 'done';
  await task.save();
  await resume(task.applicationId, 'retry requested');
  return task;
}

/**
 * Re-queue the application. A live session waiting on the task keeps the application in "approved"
 * (it's still in flight), so this is a no-op there and the open page simply continues.
 */
async function resume(applicationId: Types.ObjectId | undefined, note: string) {
  if (!applicationId) return;
  const app = await Application.findById(applicationId);
  if (app && app.status === 'needs_user') {
    await transition(app, 'approved', note);
    await enqueueDelivery({ id: app.id, channel: app.channel });
  }
}
