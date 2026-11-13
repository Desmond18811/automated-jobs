import { redis } from '../lib/redis';
import { normalizeCompany } from '../lib/normalize';
import { localParts, minutesUntilWindow } from '../lib/time';
import { Application, type ApplicationDoc } from '../models/application.model';
import { SENT_STATES } from './stateMachine';
import type { IJobPost } from '../models/jobPost.model';
import type { IProfile, Rules } from '../models/profile.model';
import { Suppression } from '../models/suppression.model';

export type SendVerdict = { ok: true } | { ok: false; reason: string; delayMs?: number };

const DUPLICATE_WINDOW_DAYS = 90;

/** Every check that must pass before anything leaves on the user's behalf. */
export async function checkSend(input: { app: ApplicationDoc; job: IJobPost; profile: IProfile; recipient?: string }): Promise<SendVerdict> {
  const { app, job, profile, recipient } = input;
  if (app.status !== 'approved') return { ok: false, reason: `application is ${app.status}, not approved` };

  const company = normalizeCompany(job.company);
  if (profile.blockedCompanies.some((b) => normalizeCompany(b) === company)) {
    return { ok: false, reason: `${job.company} is on your blocked list` };
  }

  if (recipient) {
    const email = recipient.toLowerCase();
    const domain = email.split('@')[1];
    const suppressed = await Suppression.exists({
      $and: [{ $or: [{ userId: null }, { userId: app.userId }] }, { $or: [{ email }, { domain }] }],
    });
    if (suppressed) return { ok: false, reason: `${email} is on the do-not-contact list` };
  }

  // Duplicate-apply guard: same role at the same company, from any source, already sent recently.
  const duplicate = await Application.exists({
    _id: { $ne: app._id },
    userId: app.userId,
    fingerprint: app.fingerprint,
    status: { $in: SENT_STATES },
    updatedAt: { $gte: new Date(Date.now() - DUPLICATE_WINDOW_DAYS * 864e5) },
  });
  if (duplicate) return { ok: false, reason: `you already applied for ${job.title} at ${job.company} in the last ${DUPLICATE_WINDOW_DAYS} days` };

  const wait = minutesUntilWindow(profile.rules);
  if (wait > 0) return { ok: false, reason: 'outside your sending hours', delayMs: wait * 60_000 };

  return { ok: true };
}

const capKey = (userId: string, rules: Rules) => `javi:cap:${userId}:${localParts(rules.sendingHours.timezone).date}`;

/** Atomically reserves one send from today's cap (INCR first, roll back if over). */
export async function reserveDailySlot(userId: string, rules: Rules): Promise<boolean> {
  const key = capKey(userId, rules);
  const n = await redis.incr(key);
  if (n === 1) await redis.expire(key, 60 * 60 * 48);
  if (n > rules.dailySendCap) {
    await redis.decr(key);
    return false;
  }
  return true;
}

export async function releaseDailySlot(userId: string, rules: Rules): Promise<void> {
  const key = capKey(userId, rules);
  const n = await redis.decr(key);
  if (n < 0) await redis.set(key, '0');
}
