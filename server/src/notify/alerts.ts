import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR, getDB, updateJob } from '../store.js';
import type { Job, NotifyLogEntry, NotifySettings } from '../types.js';
import { sendAlertDetailed, whatsappReady, validateWhatsAppConfig, type SendResult } from './whatsapp.js';

/**
 * Every WhatsApp message goes through here. Same function names the runner
 * already calls (jobStarted, jobWaiting, captchaNeeded, runFinished, ...),
 * plus new ones for applied / failed / account created / run started.
 */

type EventName =
  | 'run_started'
  | 'jobs_found'
  | 'job_started'
  | 'account_created'
  | 'applied'
  | 'needs_you'
  | 'failed'
  | 'run_finished'
  | 'test';

const SETTING_FOR: Record<EventName, keyof NotifySettings | null> = {
  run_started: 'runStarted',
  jobs_found: 'runStarted',
  job_started: 'jobStarted',
  account_created: 'accountCreated',
  applied: 'applied',
  needs_you: 'needsYou',
  failed: 'failed',
  run_finished: 'runFinished',
  test: null
};

const LABEL: Record<EventName, string> = {
  run_started: 'Run started',
  jobs_found: 'Jobs found',
  job_started: 'Started applying',
  account_created: 'Account created',
  applied: 'Applied',
  needs_you: 'Needs you',
  failed: 'Could not apply',
  run_finished: 'Run finished',
  test: 'Test'
};

const LOW_PRIORITY = new Set<EventName>(['job_started', 'applied']);

interface Outgoing {
  event: EventName;
  jobId?: string;
  title: string; // job title or host
  reason: string; // one short sentence
  text: string; // full text for CallMeBot / TextMeBot
}

const LOG_FILE = path.join(DATA_DIR, 'notify-log.json');
const queue: Outgoing[] = [];
const sentAt: number[] = [];
let pumping = false;
let log: NotifyLogEntry[] = loadLog();

function loadLog(): NotifyLogEntry[] {
  try {
    const data = JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8'));
    return Array.isArray(data) ? data.slice(-200) : [];
  } catch {
    return [];
  }
}

function writeLog(entry: NotifyLogEntry) {
  log.push(entry);
  if (log.length > 200) log = log.slice(-200);
  try {
    fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
  } catch {
    /* logging must never break the run */
  }
}

export function getLog(limit = 50): NotifyLogEntry[] {
  return log.slice(-limit).reverse();
}

export function lastEntry(): NotifyLogEntry | null {
  return log.length ? log[log.length - 1] : null;
}

const dashboard = () => process.env.DASHBOARD_URL || 'http://localhost:5173';
const firstSentence = (s: string) => (s || '').split(/(?<=[.!?])\s/)[0].slice(0, 160);
const jobName = (job: Partial<Job>) => {
  if (job.title) return job.title.slice(0, 80);
  try {
    return job.url ? new URL(job.url).hostname.replace(/^www\./, '') : job.applyEmail || 'a job';
  } catch {
    return job.applyEmail || 'a job';
  }
};
const where = (job: Partial<Job>) => {
  if (job.company) return job.company;
  try {
    return job.url ? new URL(job.url).hostname.replace(/^www\./, '') : job.applyEmail || '';
  } catch {
    return '';
  }
};

function enabled(event: EventName): boolean {
  const s = getDB().settings;
  if (event === 'test') return true;
  if (!s.whatsappAlerts) return false;
  const key = SETTING_FOR[event];
  return key ? s.notify?.[key] !== false : true;
}

function enqueue(msg: Outgoing) {
  if (!enabled(msg.event)) return;
  if (!whatsappReady()) {
    writeLog({
      at: new Date().toISOString(),
      event: msg.event,
      jobId: msg.jobId,
      text: msg.text,
      provider: 'none',
      ok: false,
      response: `Not sent: ${validateWhatsAppConfig()}`
    });
    return;
  }
  // Important messages jump the queue.
  if (LOW_PRIORITY.has(msg.event)) queue.push(msg);
  else queue.unshift(msg);
  void pump();
}

function mergeLowPriority() {
  const low = queue.filter((m) => LOW_PRIORITY.has(m.event));
  if (queue.length <= 5 || low.length < 2) return;
  const started = low.filter((m) => m.event === 'job_started').map((m) => m.title);
  const applied = low.filter((m) => m.event === 'applied').map((m) => m.title);
  const parts: string[] = [];
  if (started.length) parts.push(`started ${started.length} job${started.length === 1 ? '' : 's'} (${started.slice(0, 6).join(', ')}${started.length > 6 ? ', …' : ''})`);
  if (applied.length) parts.push(`applied: ${applied.slice(0, 6).join(', ')}${applied.length > 6 ? ', …' : ''}`);
  const digest: Outgoing = {
    event: 'applied',
    title: `${low.length} updates`,
    reason: parts.join('; '),
    text: `Job Autopilot: ${parts.join('. ')}.`
  };
  for (const m of low) queue.splice(queue.indexOf(m), 1);
  queue.push(digest);
}

function hourlyCapReached(): boolean {
  const hourAgo = Date.now() - 3_600_000;
  while (sentAt.length && sentAt[0] < hourAgo) sentAt.shift();
  return sentAt.length >= (getDB().settings.notifyMaxPerHour || 60);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function deliver(msg: Outgoing): Promise<SendResult> {
  const payload = { event: LABEL[msg.event], title: msg.title, reason: msg.reason, link: dashboard(), text: msg.text };
  let result = await sendAlertDetailed(payload);
  if (!result.ok) {
    await sleep(30_000);
    result = await sendAlertDetailed(payload);
  }
  return result;
}

async function pump() {
  if (pumping) return;
  pumping = true;
  try {
    while (queue.length) {
      mergeLowPriority();
      const msg = queue.shift()!;
      if (hourlyCapReached() && LOW_PRIORITY.has(msg.event)) {
        writeLog({ at: new Date().toISOString(), event: msg.event, jobId: msg.jobId, text: msg.text, provider: 'none', ok: false, response: 'Skipped: hourly message limit reached' });
        continue;
      }
      const result = await deliver(msg);
      sentAt.push(Date.now());
      writeLog({
        at: new Date().toISOString(),
        event: msg.event,
        jobId: msg.jobId,
        text: msg.text,
        provider: result.provider,
        ok: result.ok,
        status: result.status,
        response: result.response
      });
      if (msg.jobId && msg.event === 'needs_you' && result.ok) {
        updateJob(msg.jobId, { alertedAt: new Date().toISOString() });
      }
      if (queue.length) await sleep((getDB().settings.notifyGapSec || 8) * 1000);
    }
  } finally {
    pumping = false;
  }
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export function jobsFound(matchedCount: number, totalCount: number) {
  enqueue({
    event: 'jobs_found',
    title: 'Jobs Found',
    reason: `${matchedCount} matching roles found out of ${totalCount}`,
    text: `Job Autopilot: found ${matchedCount} matching job${matchedCount === 1 ? '' : 's'} (out of ${totalCount}) tailored to your skills. Starting application runner!`
  });
}

export function runStarted(queuedCount: number) {
  enqueue({
    event: 'run_started',
    title: 'Job Autopilot',
    reason: `${queuedCount} jobs queued`,
    text: `Job Autopilot: started a run with ${queuedCount} job${queuedCount === 1 ? '' : 's'} queued.`
  });
}

export async function jobStarted(job: Job) {
  enqueue({
    event: 'job_started',
    jobId: job.id,
    title: jobName(job),
    reason: `Started applying${where(job) ? ` at ${where(job)}` : ''}`,
    text: `Job Autopilot: started applying for ${jobName(job)}${where(job) ? ` at ${where(job)}` : ''}.`
  });
}

export function accountCreated(job: Job, host: string, email: string) {
  enqueue({
    event: 'account_created',
    jobId: job.id,
    title: jobName(job),
    reason: `Created an account on ${host} with ${email}`,
    text: `Job Autopilot: created an account on ${host} with ${email} for ${jobName(job)}.`
  });
}

export function applied(job: Job) {
  const how =
    job.kind === 'email'
      ? `Emailed ${job.draft?.to || job.applyEmail || 'the employer'}`
      : job.message === 'Marked as applied by you'
        ? 'You marked it as applied'
        : 'Submitted, confirmation seen';
  enqueue({
    event: 'applied',
    jobId: job.id,
    title: jobName(job),
    reason: how,
    text: `Job Autopilot: applied for ${jobName(job)}${where(job) ? ` at ${where(job)}` : ''}. ${how}.`
  });
}

export function failed(job: Job, error: string) {
  const short = (error || 'Unknown error').split('\n')[0].slice(0, 120);
  enqueue({
    event: 'failed',
    jobId: job.id,
    title: jobName(job),
    reason: short,
    text: `Job Autopilot: couldn't apply for ${jobName(job)}. ${short}`
  });
}

// --- waiting on you ---

let currentWait: { jobId: string; seq: number } | null = null;
let waitTimer: NodeJS.Timeout | null = null;
let captchaFor: string | null = null;

/** Runner calls this right before ask() when it sees a CAPTCHA, so the alert says so and goes out at once. */
export async function captchaNeeded(job: Job) {
  captchaFor = job.id;
}

export function jobWaiting(job: Job, waitSeq: number) {
  clearWaitingTimer();
  const s = getDB().settings;
  const isCaptcha = captchaFor === job.id;
  captchaFor = null;
  if (job.status !== 'needs_you' && !(job.status === 'review' && s.alertReviewJobs)) return;

  currentWait = { jobId: job.id, seq: waitSeq };
  const reason = isCaptcha ? 'Solve the CAPTCHA in the bot\'s window' : firstSentence(job.message || 'It needs you');
  const send = () => {
    if (!currentWait || currentWait.jobId !== job.id || currentWait.seq !== waitSeq) return;
    enqueue({
      event: 'needs_you',
      jobId: job.id,
      title: jobName(job),
      reason,
      text: `Job Autopilot: ${jobName(job)} needs you. ${reason} ${dashboard()}`
    });
  };
  const delay = isCaptcha ? 0 : (s.alertDelaySec || 0) * 1000;
  if (delay === 0) send();
  else waitTimer = setTimeout(send, delay);
}

export function clearWaitingTimer() {
  if (waitTimer) clearTimeout(waitTimer);
  waitTimer = null;
  currentWait = null;
}

export async function notifyConsecutiveFailures(lastError: string) {
  const short = (lastError || '').split('\n')[0].slice(0, 100);
  enqueue({
    event: 'needs_you',
    title: 'Job Autopilot',
    reason: `Run paused: 3 jobs failed in a row. Last error: ${short}`,
    text: `Job Autopilot: run paused, 3 jobs failed in a row. Last error: ${short} ${dashboard()}`
  });
}

export async function runFinished(_processed?: number) {
  const jobs = getDB().jobs;
  const count = (f: (j: Job) => boolean) => jobs.filter(f).length;
  const a = count((j) => j.status === 'applied');
  const n = count((j) => j.status === 'needs_you' && j.kind === 'form');
  const e = count((j) => j.kind === 'email' && (j.status === 'review' || j.status === 'needs_you'));
  const f = count((j) => j.status === 'failed');
  const summary = `${a} applied, ${n} need you, ${e} emails to approve, ${f} failed`;
  enqueue({
    event: 'run_finished',
    title: 'Job Autopilot',
    reason: summary,
    text: `Job Autopilot: run finished. ${summary}. ${dashboard()}`
  });
}

/** Sends immediately (not queued) so the dashboard can show the provider's exact reply. */
export async function sendTest(): Promise<SendResult> {
  const msg: Outgoing = {
    event: 'test',
    title: 'Job Autopilot',
    reason: 'WhatsApp messages are working',
    text: 'Job Autopilot: test message. WhatsApp messages are working.'
  };
  const result = await sendAlertDetailed({ event: 'Test', title: msg.title, reason: msg.reason, link: dashboard(), text: msg.text });
  writeLog({ at: new Date().toISOString(), event: 'test', text: msg.text, provider: result.provider, ok: result.ok, status: result.status, response: result.response });
  return result;
}
