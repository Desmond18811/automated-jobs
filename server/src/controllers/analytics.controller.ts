import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { currentUser } from '../middleware/auth';
import { Application } from '../models/application.model';
import { cacheGet, cacheSet } from '../lib/cache';

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
}
