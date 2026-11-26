import type { Request, Response } from 'express';
import { z } from 'zod';
import { AppError, parseBody } from '../lib/http';
import { currentUser } from '../middleware/auth';
import { Application, APP_STATES } from '../models/application.model';
import { enqueueDelivery, enqueueGenerate } from '../queues';
import { transition, USER_SETTABLE } from '../services/stateMachine';

export async function loadOwnedApplication(userId: string, id: string) {
  const app = await Application.findOne({ _id: id, userId });
  if (!app) throw new AppError(404, 'Application not found');
  return app;
}

export class ApplicationController {
  static async list(req: Request, res: Response) {
    const userId = currentUser(req);
    const q = parseBody(
      z.object({
        status: z.enum(APP_STATES).optional(),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(30),
      }),
      req.query,
    );
    const filter = { userId, ...(q.status ? { status: q.status } : {}) };
    const [items, total] = await Promise.all([
      Application.find(filter)
        .sort({ updatedAt: -1 })
        .skip((q.page - 1) * q.limit)
        .limit(q.limit)
        .populate('jobId', 'title company location url source applyMethod salary'),
      Application.countDocuments(filter),
    ]);
    res.json({ items, total, page: q.page });
  }

  static async getOne(req: Request, res: Response) {
    const app = await loadOwnedApplication(currentUser(req), req.params.id);
    await app.populate('jobId');
    res.json(app);
  }

  static async updateDocuments(req: Request, res: Response) {
    const app = await loadOwnedApplication(currentUser(req), req.params.id);
    if (app.status !== 'drafted') throw new AppError(409, 'Only drafts can be edited');
    const b = parseBody(
      z.object({
        emailSubject: z.string().max(200),
        emailBody: z.string().max(5000),
        coverLetter: z.string().max(8000),
        proposal: z.string().max(5000),
      }).partial(),
      req.body,
    );
    app.documents = { ...app.toObject().documents, ...b, editedByUser: true };
    await app.save();
    res.json(app);
  }

  static async approve(req: Request, res: Response) {
    const app = await loadOwnedApplication(currentUser(req), req.params.id);
    const docs = app.documents;
    if (!docs?.generatedAt) throw new AppError(409, 'Nothing to approve yet');
    if (!docs.factCheck?.passed && !docs.editedByUser) {
      throw new AppError(409, 'This draft failed the fact check. Edit it or regenerate it first.', 'fact_check_failed', docs.factCheck);
    }
    await transition(app, 'approved', 'approved by you');
    await enqueueDelivery({ id: app.id, channel: app.channel });
    res.json(app);
  }

  static async regenerate(req: Request, res: Response) {
    const app = await loadOwnedApplication(currentUser(req), req.params.id);
    if (!['matched', 'drafted'].includes(app.status)) throw new AppError(409, `Cannot regenerate a ${app.status} application`);
    await enqueueGenerate(app.id);
    res.status(202).json({ queued: true });
  }

  static async archive(req: Request, res: Response) {
    const app = await loadOwnedApplication(currentUser(req), req.params.id);
    await transition(app, 'archived', 'archived by you');
    res.json(app);
  }

  static async updateStatus(req: Request, res: Response) {
    const { status, note } = parseBody(
      z.object({ status: z.enum(APP_STATES), note: z.string().max(500).optional() }),
      req.body,
    );
    if (!USER_SETTABLE.includes(status)) throw new AppError(400, `You cannot set "${status}" by hand`);
    const app = await loadOwnedApplication(currentUser(req), req.params.id);
    await transition(app, status, note ?? 'updated by you');
    res.json(app);
  }

  /** GET /applications/interviews: interviews you have and applications that turned into offers or jobs. */
  static async interviews(req: Request, res: Response) {
    const userId = currentUser(req);
    const apps: any[] = (await Application.find({ userId }).populate('jobId', 'title company location url source applyMethod').lean()) as any[];
    const mine = apps.filter((a) => String(a.userId) === String(userId));
    const reached = (a: any, state: string) => [...(a.history ?? [])].reverse().find((h: any) => h.to === state)?.at ?? a.updatedAt;
    const row = (a: any, state: string) => ({ _id: a._id, status: a.status, score: a.score, job: a.jobId, since: reached(a, state), note: (a.history ?? []).slice(-1)[0]?.note });
    const interviews = mine.filter((a) => a.status === 'interview').map((a) => row(a, 'interview'));
    const successful = mine.filter((a) => a.status === 'offer' || a.status === 'hired').map((a) => row(a, a.status));
    const everInterviewed = mine.filter((a) => ['interview', 'offer', 'hired'].includes(a.status) || (a.history ?? []).some((h: any) => h.to === 'interview')).length;
    const sent = mine.filter((a) => ['sent', 'replied', 'interview', 'offer', 'hired', 'rejected', 'no_response'].includes(a.status)).length;
    res.json({ interviews, successful, counts: { interviews: interviews.length, successful: successful.length, everInterviewed, sent } });
  }

  /** GET /applications/activity?from=ISO&to=ISO: every status change in the window, for the calendar. */
  static async activity(req: Request, res: Response) {
    const userId = currentUser(req);
    const q = parseBody(z.object({ from: z.coerce.date(), to: z.coerce.date() }), req.query);
    if (q.to.getTime() - q.from.getTime() > 62 * 864e5) throw new AppError(400, 'Choose a window of up to two months');
    const apps: any[] = (await Application.find({ userId }).populate('jobId', 'title company url applyMethod').lean()) as any[];
    const events: any[] = [];
    for (const a of apps) {
      if (String(a.userId) !== String(userId)) continue;
      for (const h of a.history ?? []) {
        const at = new Date(h.at);
        if (at >= q.from && at <= q.to) events.push({ applicationId: a._id, to: h.to, from: h.from, at, note: h.note, job: a.jobId && typeof a.jobId === 'object' ? { title: a.jobId.title, company: a.jobId.company, url: a.jobId.url } : null });
      }
    }
    events.sort((x, y) => +new Date(y.at) - +new Date(x.at));
    res.json({ events });
  }
}
