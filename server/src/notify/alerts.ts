import { getDB, updateJob } from '../store.js';
import type { Job } from '../types.js';
import { hostOf } from '../worker/site.js';
import { whatsappReady, sendAlert, isWebhookEnabled } from './whatsapp.js';
import { runner } from '../worker/runner.js';

let currentTimer: NodeJS.Timeout | null = null;
let currentWaitSeq: number | null = null;

// Rate limiting: at most 20 alerts per rolling hour
const alertTimestamps: number[] = [];

function canSendAlert(): boolean {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;

  while (alertTimestamps.length > 0 && alertTimestamps[0] < oneHourAgo) {
    alertTimestamps.shift();
  }

  if (alertTimestamps.length >= 20) {
    console.warn(
      '[alerts] Hourly alert limit reached (20/hour). Alert dropped.'
    );
    return false;
  }

  alertTimestamps.push(now);
  return true;
}

function extractFirstSentence(msg: string): string {
  if (!msg) return '';
  const match = msg.match(/^.*?[.!?](?:\s|$)/);
  if (match) {
    return match[0].trim();
  }
  return msg.trim();
}

export function clearWaitingTimer(): void {
  if (currentTimer) {
    clearTimeout(currentTimer);
    currentTimer = null;
  }
  currentWaitSeq = null;
}

export function jobWaiting(job: Job, waitSeq: number = 0): void {
  clearWaitingTimer();

  // Form jobs only
  if (job.kind !== 'form') {
    return;
  }

  const db = getDB();
  if (!db.settings.whatsappAlerts || !whatsappReady()) {
    return;
  }

  const isNeedsYou = job.status === 'needs_you';
  const isReviewAllowed =
    job.status === 'review' && db.settings.alertReviewJobs;

  if (!isNeedsYou && !isReviewAllowed) {
    return;
  }

  currentWaitSeq = waitSeq;
  const delaySec = db.settings.alertDelaySec ?? 90;
  const delayMs = delaySec * 1000;

  currentTimer = setTimeout(async () => {
    currentTimer = null;

    const currentStatus = runner.status();
    if (
      currentStatus.waitingOn === job.id &&
      runner.getWaitSeq() === waitSeq
    ) {
      if (!canSendAlert()) return;

      const link = process.env.DASHBOARD_URL || 'http://localhost:5173';
      const title =
        job.title || (job.url ? hostOf(job.url) : 'Job application');
      let reason = extractFirstSentence(
        job.message || 'Application needs your input.'
      );
      if (isWebhookEnabled()) {
        reason = `${reason} Reply retry, skip or done.`.trim();
      }

      const ok = await sendAlert({ title, reason, link });
      if (ok) {
        updateJob(job.id, { alertedAt: new Date().toISOString() });
      }
    }
  }, delayMs);
}

export async function notifyConsecutiveFailures(
  lastError: string
): Promise<void> {
  const db = getDB();
  if (!db.settings.whatsappAlerts || !whatsappReady()) {
    return;
  }

  if (!canSendAlert()) return;

  const link = process.env.DASHBOARD_URL || 'http://localhost:5173';
  const reason = `3 jobs failed in a row. Last error: ${lastError.slice(0, 100)}.`;

  await sendAlert({
    title: 'Run paused',
    reason,
    link
  });
}

export async function runFinished(jobsProcessed: number): Promise<void> {
  clearWaitingTimer();

  if (jobsProcessed <= 0) {
    return;
  }

  const db = getDB();
  if (!db.settings.whatsappAlerts || !whatsappReady()) {
    return;
  }

  if (!canSendAlert()) return;

  const applied = db.jobs.filter((j) => j.status === 'applied').length;
  const needsYou = db.jobs.filter((j) => j.status === 'needs_you').length;
  const emailsToApprove = db.jobs.filter(
    (j) =>
      j.kind === 'email' &&
      (j.status === 'review' || j.status === 'needs_you')
  ).length;
  const failed = db.jobs.filter((j) => j.status === 'failed').length;

  const reason = `${applied} applied, ${needsYou} need you, ${emailsToApprove} emails to approve, ${failed} failed.`;
  const link = process.env.DASHBOARD_URL || 'http://localhost:5173';

  await sendAlert({
    title: 'Queue finished',
    reason,
    link
  });
}
