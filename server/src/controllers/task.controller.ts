import type { Request, Response } from 'express';
import { z } from 'zod';
import { AppError, parseBody } from '../lib/http';
import { currentUser } from '../middleware/auth';
import { Task } from '../models/task.model';
import { answerTask, markTaskDone, retryTask } from '../services/task.service';

export class TaskController {
  static async list(req: Request, res: Response) {
    const { status } = parseBody(
      z.object({ status: z.enum(['open', 'answered', 'done', 'dismissed']).default('open') }),
      req.query,
    );
    res.json(await Task.find({ userId: currentUser(req), status }).sort({ createdAt: -1 }).limit(100));
  }

  static async answer(req: Request, res: Response) {
    const rawAnswers = req.body?.answers
      ? req.body.answers
      : (req.body?.answer !== undefined ? { default: String(req.body.answer) } : {});
    const rawRemember = req.body?.remember
      ? req.body.remember
      : (req.body?.saveToBank !== undefined ? { default: Boolean(req.body.saveToBank) } : undefined);

    const b = parseBody(
      z.object({ answers: z.record(z.string().max(5000)), remember: z.record(z.boolean()).optional() }),
      { answers: rawAnswers, remember: rawRemember },
    );
    res.json(await answerTask(currentUser(req), req.params.id, b.answers, b.remember));
  }

  static async markDone(req: Request, res: Response) {
    res.json(await markTaskDone(currentUser(req), req.params.id));
  }

  static async retry(req: Request, res: Response) {
    res.json(await retryTask(currentUser(req), req.params.id));
  }

  static async dismiss(req: Request, res: Response) {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: currentUser(req), status: 'open' },
      { status: 'dismissed' },
      { new: true },
    );
    if (!task) throw new AppError(404, 'Task not found');
    res.json(task);
  }
}
