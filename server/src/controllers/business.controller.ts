import type { Request, Response } from 'express';
import { z } from 'zod';
import { AppError, parseBody } from '../lib/http';
import { currentUser } from '../middleware/auth';
import { catalogForClient } from '../services/business/catalog';
import * as Leads from '../services/business/leads.service';

const VERTICAL = z.enum(['restaurant', 'salon', 'clinic', 'shop', 'school', 'real_estate', 'other']);
const OFFER = z.enum(['website', 'ordering', 'booking', 'whatsapp_automation', 'workflow_automation', 'mobile_app']);
const CONTACT = z.object({
  kind: z.enum(['phone', 'email', 'whatsapp', 'instagram', 'facebook', 'website', 'other']),
  value: z.string().min(1).max(200),
  name: z.string().max(100).optional(),
  isBusinessLine: z.boolean().optional(),
});
const CONSENT = z.object({ given: z.boolean(), channel: z.string().max(40).optional(), note: z.string().max(300).optional() });

const ServicesSchema = z
  .object({
    brandName: z.string().max(80),
    city: z.string().max(80),
    publicPhone: z.string().max(40),
    publicEmail: z.string().email().or(z.literal('')),
    physicalAddress: z.string().max(200),
    hourlyRate: z.number().min(500).max(200_000),
    fxRate: z.number().min(100).max(10_000),
    marginPct: z.number().min(0).max(200),
    monthlyIncomeTarget: z.number().min(0).max(1_000_000_000),
    guarantees: z.object({ ownership: z.boolean(), liveByDays: z.number().int().min(1).max(180).optional() }),
    capacityPerMonth: z.number().int().min(1).max(100).nullable(),
    caseStudies: z
      .array(
        z.object({
          name: z.string().min(1).max(80),
          vertical: z.string().max(40).optional(),
          offer: z.string().max(60).optional(),
          result: z.string().min(1).max(300),
          url: z.string().url().optional().or(z.literal('')),
          permissionToShare: z.boolean(),
        }),
      )
      .max(30),
  })
  .partial();

const SearchSchema = z.object({ vertical: VERTICAL.exclude(['other']), area: z.string().min(2).max(120), radiusM: z.number().min(500).max(8000).optional() });
const AddSchema = z.object({
  name: z.string().min(1).max(120),
  vertical: VERTICAL.default('other'),
  category: z.string().max(60).optional(),
  area: z.string().max(120).optional(),
  address: z.string().max(200).optional(),
  website: z.string().max(200).optional(),
  contacts: z.array(CONTACT).max(10).default([]),
  referredBy: z.string().max(120).optional(),
  consent: CONSENT.optional(),
});
const PatchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  vertical: VERTICAL.optional(),
  area: z.string().max(120).optional(),
  website: z.string().max(200).optional(),
  contacts: z.array(CONTACT).max(10).optional(),
  valueInputs: z.record(z.number().min(0).max(1_000_000_000)).optional(),
  note: z.string().max(1000).optional(),
  consent: CONSENT.optional(),
});
const PitchSchema = z.object({
  variant: z.enum(['observation', 'question', 'proof']).default('observation'),
  channel: z.enum(['email', 'whatsapp']).default('whatsapp'),
  polish: z.boolean().default(false),
});
const StatusSchema = z.object({
  to: z.enum(['new', 'contacted', 'replied', 'call_booked', 'won', 'lost']),
  note: z.string().max(500).optional(),
  lostReason: z.string().max(300).optional(),
  deal: z.object({ offer: OFFER.optional(), tier: z.enum(['good', 'better', 'best']), setup: z.number().min(0).optional(), monthly: z.number().min(0).optional() }).optional(),
});

export class BusinessController {
  static async getServices(req: Request, res: Response) {
    res.json(await Leads.getServices(currentUser(req)));
  }
  static async putServices(req: Request, res: Response) {
    const body = parseBody(ServicesSchema, req.body);
    res.json(await Leads.updateServices(currentUser(req), { ...body, capacityPerMonth: body.capacityPerMonth ?? undefined }));
  }
  static async catalog(_req: Request, res: Response) {
    res.json(catalogForClient());
  }
  static async search(req: Request, res: Response) {
    const b = parseBody(SearchSchema, req.body);
    res.json(await Leads.searchLeads(currentUser(req), b.vertical, b.area, b.radiusM));
  }
  static async importLeads(req: Request, res: Response) {
    if (!req.file) throw new AppError(400, 'Attach a CSV or XLSX file in the "file" field');
    res.status(201).json(await Leads.importLeads(currentUser(req), req.file.buffer));
  }
  static async add(req: Request, res: Response) {
    res.status(201).json(await Leads.addLead(currentUser(req), parseBody(AddSchema, req.body) as any));
  }
  static async list(req: Request, res: Response) {
    const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined);
    res.json({ leads: await Leads.listLeads(currentUser(req), { status: str(req.query.status), vertical: str(req.query.vertical) }) });
  }
  static async get(req: Request, res: Response) {
    res.json(await Leads.getLead(currentUser(req), req.params.id));
  }
  static async patch(req: Request, res: Response) {
    const lead = await Leads.patchLead(currentUser(req), req.params.id, parseBody(PatchSchema, req.body));
    res.json(await Leads.getLead(currentUser(req), lead.id));
  }
  static async audit(req: Request, res: Response) {
    res.json(await Leads.rerunAudit(currentUser(req), req.params.id));
  }
  static async quote(req: Request, res: Response) {
    const { offer } = parseBody(z.object({ offer: OFFER.optional() }), req.body ?? {});
    res.json(await Leads.quoteLead(currentUser(req), req.params.id, offer));
  }
  static async pitch(req: Request, res: Response) {
    const b = parseBody(PitchSchema, req.body ?? {});
    res.status(201).json(await Leads.pitchLead(currentUser(req), req.params.id, b.variant, b.channel, b.polish));
  }
  static async scripts(req: Request, res: Response) {
    res.json(await Leads.scriptsFor(currentUser(req), req.params.id));
  }
  static async status(req: Request, res: Response) {
    const b = parseBody(StatusSchema, req.body);
    res.json(await Leads.moveLead(currentUser(req), req.params.id, b.to, b));
  }
  static async remove(req: Request, res: Response) {
    await Leads.deleteLead(currentUser(req), req.params.id);
    res.status(204).end();
  }
}
