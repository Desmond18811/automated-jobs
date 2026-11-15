import type { Request, Response } from 'express';
import { z } from 'zod';
import { parseBody } from '../lib/http';
import { currentUser } from '../middleware/auth';
import { BusinessService } from '../services/business.service';

const SearchSchema = z.object({
  query: z.string().min(1).max(100).default('Fintech'),
  location: z.string().max(120).optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  radiusKm: z.coerce.number().min(1).max(100).default(10),
});

export class BusinessController {
  static async search(req: Request, res: Response) {
    const userId = currentUser(req);
    const body = parseBody(SearchSchema, req.body);
    const leads = await BusinessService.searchNearby(userId, body);
    res.json({
      success: true,
      count: leads.length,
      leads,
    });
  }

  static async list(req: Request, res: Response) {
    const userId = currentUser(req);
    const stage = typeof req.query.stage === 'string' ? req.query.stage : undefined;
    const leads = await BusinessService.listLeads(userId, stage);
    res.json(leads);
  }

  static async getLead(req: Request, res: Response) {
    const userId = currentUser(req);
    const lead = await BusinessService.getLead(userId, req.params.id);
    res.json(lead);
  }

  static async generatePitch(req: Request, res: Response) {
    const userId = currentUser(req);
    const lead = await BusinessService.generatePitch(userId, req.params.id);
    res.json(lead);
  }

  static async startSequence(req: Request, res: Response) {
    const userId = currentUser(req);
    const lead = await BusinessService.startSequence(userId, req.params.id);
    res.json(lead);
  }

  static async pauseSequence(req: Request, res: Response) {
    const userId = currentUser(req);
    const lead = await BusinessService.pauseSequence(userId, req.params.id);
    res.json(lead);
  }

  static async dismiss(req: Request, res: Response) {
    const userId = currentUser(req);
    const lead = await BusinessService.dismiss(userId, req.params.id);
    res.json(lead);
  }
}
