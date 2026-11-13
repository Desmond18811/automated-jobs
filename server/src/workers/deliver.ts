import type { Job } from 'bullmq';
import { adapterFor } from '../adapters';
import type { AdapterResult } from '../adapters/types';
import { errorMessage } from '../lib/http';
import { minutesUntilNextDayWindow } from '../lib/time';
import { Application } from '../models/application.model';
import { transition } from '../services/stateMachine';
import { audit } from '../models/audit.model';
import { JobPost } from '../models/jobPost.model';
import { notify } from '../services/notification.service';
import { Profile } from '../models/profile.model';
import { checkSend, releaseDailySlot, reserveDailySlot } from '../services/safety.service';
import { oneOffAnswers, openTask } from '../services/task.service';
import { enqueueDelivery } from '../queues';

/** Shared by the "send" queue (email, assisted) and the "browser" queue (forms). */
export async function deliverProcessor(job: Job<{ applicationId: string }>) {
  const app = await Application.findById(job.data.applicationId);
  if (!app || app.status !== 'approved') return { skipped: app?.status ?? 'missing' };
  const [post, profile] = await Promise.all([JobPost.findById(app.jobId), Profile.findOne({ userId: app.userId })]);
  if (!post || !profile) return { skipped: 'missing job or profile' };

  const userId = String(app.userId);
  const recipient = app.channel === 'email' ? post.applyMethod.email : undefined;

  // 1. Rules: blocked companies, suppression list, duplicate-apply guard, sending hours.
  const verdict = await checkSend({ app, job: post, profile, recipient });
  if (!verdict.ok) {
    if (verdict.delayMs) {
      await enqueueDelivery({ id: app.id, channel: app.channel }, verdict.delayMs);
      return { deferred: verdict.reason };
    }
    await audit({ userId, applicationId: app._id, action: 'send', channel: app.channel, to: recipient, result: 'blocked', detail: verdict.reason });
    await transition(app, 'archived', `not sent: ${verdict.reason}`);
    await notify(userId, { type: 'send_blocked', title: `Not sent: ${post.title} at ${post.company}`, body: verdict.reason, data: { applicationId: app.id } });
    return { blocked: verdict.reason };
  }

  // 2. Daily cap (assisted sends nothing itself, so it doesn't count).
  const usesSlot = app.channel !== 'assisted';
  if (usesSlot && !(await reserveDailySlot(userId, profile.rules))) {
    await enqueueDelivery({ id: app.id, channel: app.channel }, minutesUntilNextDayWindow(profile.rules) * 60_000);
    return { deferred: 'daily cap reached' };
  }

  // 3. Hand off to the channel adapter.
  let result: AdapterResult;
  try {
    result = await adapterFor(app.channel).apply({ userId, app, job: post, profile, extraAnswers: await oneOffAnswers(app.id) });
  } catch (err) {
    result = { status: 'failed', error: errorMessage(err), retryable: true };
  }
  if (usesSlot && result.status !== 'sent') await releaseDailySlot(userId, profile.rules);

  await audit({
    userId,
    applicationId: app._id,
    action: 'send',
    channel: app.channel,
    to: recipient ?? post.applyMethod.formUrl ?? post.url,
    subject: app.documents?.emailSubject,
    body: app.documents?.emailBody ?? app.documents?.coverLetter,
    result: result.status,
    detail: result.status === 'failed' ? result.error : result.detail,
  });

  // 4. Act on the outcome.
  if (result.status === 'sent') {
    app.delivery = { ...result.ref, sentAt: new Date(), screenshotPath: result.screenshotPath };
    await transition(app, 'sent', result.detail);
    return { sent: true };
  }

  if (result.status === 'needs_user') {
    const task = await openTask({
      userId,
      applicationId: app.id,
      reason: result.reason,
      message: result.detail,
      questions: result.questions,
      payload: { ...result.payload, jobTitle: post.title, company: post.company },
    });
    app.needsUserTaskId = task._id;
    await transition(app, 'needs_user', result.reason);
    return { needsUser: result.reason };
  }

  const lastAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
  if (result.retryable && !lastAttempt) throw new Error(result.error); // BullMQ retries with backoff
  await transition(app, 'failed', result.error);
  await notify(userId, { type: 'send_failed', title: `Could not send: ${post.title}`, body: result.error, data: { applicationId: app.id } });
  return { failed: result.error };
}
