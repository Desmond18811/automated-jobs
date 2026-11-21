import type { Request, Response } from 'express';
import { z } from 'zod';
import { parseBody } from '../lib/http';
import { TaxonomyService } from '../services/taxonomy.service';

const RequestSchema = z.object({
  role_name: z.string().max(120).optional(),
  industry_name: z.string().max(120).optional(),
  skill_name: z.string().max(120).optional(),
  context: z.string().max(800).optional(),
  email: z.string().email().optional(),
});

export class TaxonomyController {
  static async getRoles(req: Request, res: Response) {
    const query = typeof req.query.query === 'string' ? req.query.query : undefined;
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const roles = TaxonomyService.getRoles(query, category);
    res.json({ roles, count: roles.length });
  }

  static async getIndustries(req: Request, res: Response) {
    const query = typeof req.query.query === 'string' ? req.query.query : undefined;
    const industries = TaxonomyService.getIndustries(query);
    res.json({ industries, count: industries.length });
  }

  static async getLocations(req: Request, res: Response) {
    const region = typeof req.query.region === 'string' ? req.query.region : undefined;
    const query = typeof req.query.query === 'string' ? req.query.query : undefined;
    const locations = TaxonomyService.getLocations(region, query);
    res.json({ locations, count: locations.length });
  }

  /** Suggestions for a headline and one `role`, or several comma-separated `roles`. */
  static async getSkills(req: Request, res: Response) {
    const headline = typeof req.query.headline === 'string' ? req.query.headline : undefined;
    const role = typeof req.query.role === 'string' ? req.query.role : undefined;
    const query = typeof req.query.query === 'string' ? req.query.query : undefined;
    if (typeof req.query.roles === 'string') {
      const roles = req.query.roles.split(',').map((r) => r.trim()).filter(Boolean).slice(0, 15);
      res.json(TaxonomyService.getSkillsForRoles(roles, headline, query));
      return;
    }
    res.json(TaxonomyService.getSkillsForHeadline(headline, role, query));
  }

  static async getSkillCatalog(req: Request, res: Response) {
    const query = typeof req.query.query === 'string' ? req.query.query : undefined;
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const result = TaxonomyService.getSkillCatalog(query, category);
    res.json({ ...result, count: result.skills.length });
  }

  static async getFields(_req: Request, res: Response) {
    res.json(TaxonomyService.getJobFields());
  }

  static async requestOption(req: Request, res: Response) {
    const body = parseBody(RequestSchema, req.body);
    const entry = await TaxonomyService.logTaxonomyRequest(body);
    res.status(201).json({
      success: true,
      message: "Option request logged. We'll review and notify when added to JAVI.",
      item: entry,
    });
  }
}
