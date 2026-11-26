import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { currentUser } from '../middleware/auth';
import { Application } from '../models/application.model';
import { cacheGet, cacheSet } from '../lib/cache';
import { safeHost } from '../lib/normalize';

export class AnalyticsController {
  static async getFunnel(req: Request, res: Response) {
    const userId = currentUser(req);
    const cacheKey = `analytics:funnel:${userId}`;

    const cached = await cacheGet(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const apps = await Application.find({ userId: new Types.ObjectId(userId) });

    const counts = {
      total: apps.length,
      discovered: 0,
      matched: 0,
      drafted: 0,
      approved: 0,
      sent: 0,
      replied: 0,
      interview: 0,
      offer: 0,
      hired: 0,
      rejected: 0,
      no_response: 0,
    };

    for (const app of apps) {
      const s = app.status as keyof typeof counts;
      if (counts[s] !== undefined) {
        counts[s]++;
      }
    }

    const totalSent = counts.sent + counts.replied + counts.interview + counts.offer + counts.hired;
    const totalReplied = counts.replied + counts.interview + counts.offer + counts.hired;
    const totalInterview = counts.interview + counts.offer + counts.hired;
    const totalOffer = counts.offer + counts.hired;

    const rates = {
      sentToReplied: totalSent > 0 ? Number(((totalReplied / totalSent) * 100).toFixed(1)) : 0,
      repliedToInterview: totalReplied > 0 ? Number(((totalInterview / totalReplied) * 100).toFixed(1)) : 0,
      interviewToOffer: totalInterview > 0 ? Number(((totalOffer / totalInterview) * 100).toFixed(1)) : 0,
    };

    const response = {
      counts,
      funnel: [
        { stage: 'Sent', count: totalSent, rate: 100 },
        { stage: 'Replied', count: totalReplied, rate: rates.sentToReplied },
        { stage: 'Interview', count: totalInterview, rate: rates.repliedToInterview },
        { stage: 'Offer', count: totalOffer, rate: rates.interviewToOffer },
      ],
      rates,
      computedAt: new Date(),
    };

    // Cache for 60 seconds
    await cacheSet(cacheKey, response, 60);
    res.json(response);
  }

  /** GET /analytics/overview: where you applied (platform and link type), activity per day, and how matches scored. */
  static async overview(req: Request, res: Response) {
    const userId = currentUser(req);
    const all: any[] = (await Application.find({ userId }).populate('jobId', 'url source applyMethod').lean()) as any[];
    const apps = all.filter((a) => String(a.userId) === String(userId));
    const SENT = ['sent', 'replied', 'interview', 'offer', 'hired', 'rejected', 'no_response'];
    const sent = apps.filter((a) => SENT.includes(a.status));

    const platforms = new Map<string, number>();
    const linkTypes: Record<string, number> = { email: 0, form: 0, platform: 0, unknown: 0 };
    for (const a of sent) {
      const j = a.jobId && typeof a.jobId === 'object' ? a.jobId : null;
      const name = j?.applyMethod?.platform || (j?.url ? safeHost(j.url) : 'unknown');
      platforms.set(name, (platforms.get(name) ?? 0) + 1);
      const t = j?.applyMethod?.type ?? 'unknown';
      linkTypes[t] = (linkTypes[t] ?? 0) + 1;
    }

    const days = 30;
    const perDay: { day: string; sent: number }[] = [];
    const index = new Map<string, number>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
      index.set(d, perDay.push({ day: d, sent: 0 }) - 1);
    }
    for (const a of sent) {
      const at = a.delivery?.sentAt ?? (a.history ?? []).find((h: any) => h.to === 'sent')?.at;
      const k = at ? new Date(at).toISOString().slice(0, 10) : '';
      if (index.has(k)) perDay[index.get(k)!].sent++;
    }

    const scored = apps.filter((a) => typeof a.score === 'number' && a.score > 0);
    res.json({
      total: apps.length,
      sent: sent.length,
      platforms: [...platforms].map(([platform, count]) => ({ platform, count })).sort((a, b) => b.count - a.count).slice(0, 12),
      linkTypes,
      perDay,
      averageMatch: scored.length ? Math.round((scored.reduce((n, a) => n + a.score, 0) / scored.length) * 100) : null,
    });
  }
}
