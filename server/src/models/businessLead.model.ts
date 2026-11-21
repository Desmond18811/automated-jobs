import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

/**
 * A small business JAVI might sell a monthly service to. Everything here is either from a real
 * source (OpenStreetMap, the user's CSV, what the user typed) or computed by the audit/quote engines.
 * No defaults invent facts about the business.
 */
export type LeadStatus = 'new' | 'contacted' | 'replied' | 'call_booked' | 'won' | 'lost';
export type LeadSource = 'osm' | 'csv' | 'manual' | 'referral';
export type Vertical = 'restaurant' | 'salon' | 'clinic' | 'shop' | 'school' | 'real_estate' | 'other';
export type OfferId = 'website' | 'ordering' | 'booking' | 'whatsapp_automation' | 'workflow_automation' | 'mobile_app';
export type Tier = 'good' | 'better' | 'best';

export interface LeadContact {
  kind: 'phone' | 'email' | 'whatsapp' | 'instagram' | 'facebook' | 'website' | 'other';
  value: string;
  name?: string;
  /** A shop line / info@ address, as opposed to a person's own number. Outreach goes to business lines. */
  isBusinessLine?: boolean;
}

export interface AuditFinding {
  id: string;
  title: string;
  /** What JAVI actually saw, quoted or measured. */
  evidence: string;
  /** How the owner can confirm it themselves in under a minute. */
  howToCheck: string;
  severity: 'high' | 'medium' | 'low';
  offer?: OfferId;
}

export interface LeadAudit {
  ranAt: Date;
  url?: string;
  reachable?: boolean;
  findings: AuditFinding[];
  signals: Record<string, unknown>;
  error?: string;
}

export interface QuoteTier {
  tier: Tier;
  setup: number;
  monthly: number;
  includes: string[];
  recommended?: boolean;
}

export interface LeadQuote {
  offer: OfferId;
  createdAt: Date;
  tiers: QuoteTier[];
  floor: { setup: number; monthly: number };
  cost: { setup: number; monthly: number };
  monthlyValue?: number;
  warnings: string[];
  paymentOptions: Array<{ id: string; label: string; detail: string }>;
}

export interface LeadPitch {
  id: string;
  variant: 'observation' | 'question' | 'proof';
  channel: 'email' | 'whatsapp';
  subject?: string;
  body: string;
  waLink?: string;
  polished?: boolean;
  createdAt: Date;
}

export interface IBusinessLead {
  userId: Types.ObjectId;
  status: LeadStatus;
  source: LeadSource;
  /** "node/123" | "way/456", unique per user, for OSM leads. */
  osmId?: string;
  referredBy?: string;
  name: string;
  vertical: Vertical;
  category?: string;
  area?: string;
  address?: string;
  location?: { lat: number; lng: number };
  website?: string;
  openingHours?: string;
  contacts: LeadContact[];
  consent?: { given: boolean; at?: Date; channel?: string; note?: string };
  /** The owner's own numbers (orders/day, average order, hours on WhatsApp...), keyed by catalog input id. */
  valueInputs: Record<string, number>;
  audit?: LeadAudit;
  quote?: LeadQuote;
  pitches: LeadPitch[];
  notes: Array<{ text: string; at: Date }>;
  lostReason?: string;
  deal?: { offer: OfferId; tier: Tier; setup: number; monthly: number; startedAt: Date };
  history: Array<{ from: LeadStatus | null; to: LeadStatus; at: Date; note?: string }>;
}

const opts = { _id: false } as const;

const schema = new Schema<IBusinessLead>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['new', 'contacted', 'replied', 'call_booked', 'won', 'lost'], default: 'new' },
    source: { type: String, enum: ['osm', 'csv', 'manual', 'referral'], required: true },
    osmId: String,
    referredBy: String,
    name: { type: String, required: true },
    vertical: { type: String, enum: ['restaurant', 'salon', 'clinic', 'shop', 'school', 'real_estate', 'other'], default: 'other' },
    category: String,
    area: String,
    address: String,
    location: new Schema({ lat: Number, lng: Number }, opts),
    website: String,
    openingHours: String,
    contacts: [new Schema({ kind: String, value: String, name: String, isBusinessLine: Boolean }, opts)],
    consent: new Schema({ given: Boolean, at: Date, channel: String, note: String }, opts),
    valueInputs: { type: Schema.Types.Mixed, default: {} },
    audit: Schema.Types.Mixed,
    quote: Schema.Types.Mixed,
    pitches: { type: Schema.Types.Mixed, default: [] },
    notes: [new Schema({ text: String, at: Date }, opts)],
    lostReason: String,
    deal: new Schema({ offer: String, tier: String, setup: Number, monthly: Number, startedAt: Date }, opts),
    history: [new Schema({ from: String, to: String, at: Date, note: String }, opts)],
  },
  { timestamps: true },
);
schema.index({ userId: 1, status: 1, updatedAt: -1 });
schema.index({ userId: 1, osmId: 1 }, { unique: true, partialFilterExpression: { osmId: { $type: 'string' } } });

export type BusinessLeadDoc = HydratedDocument<IBusinessLead>;
export const BusinessLead = model<IBusinessLead>('BusinessLead', schema);
