import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

/**
 * The user's own business: who they are, what their time costs, and the proof they may cite.
 * Pitches and proposals may only state facts from here (plus the lead's audit and owner numbers).
 */
export interface CaseStudy {
  name: string;
  vertical?: string;
  offer?: string;
  /** A result you can stand behind, in your client's words or numbers. */
  result: string;
  url?: string;
  /** Only case studies the client agreed to share are ever cited. */
  permissionToShare: boolean;
}

export interface IBusinessServices {
  userId: Types.ObjectId;
  brandName?: string;
  city?: string;
  publicPhone?: string;
  publicEmail?: string;
  /** Identifies the sender in every email (required before round-2 email outreach). */
  physicalAddress?: string;
  hourlyRate: number;
  /** NGN per USD, for USD-priced running costs. */
  fxRate: number;
  marginPct: number;
  monthlyIncomeTarget?: number;
  guarantees: { ownership: boolean; liveByDays?: number };
  /** Only set this to a real limit; scarcity is mentioned only when it is set. */
  capacityPerMonth?: number;
  caseStudies: CaseStudy[];
}

const schema = new Schema<IBusinessServices>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    brandName: String,
    city: String,
    publicPhone: String,
    publicEmail: String,
    physicalAddress: String,
    hourlyRate: { type: Number, default: 7500 },
    fxRate: { type: Number, default: 1550 },
    marginPct: { type: Number, default: 30 },
    monthlyIncomeTarget: Number,
    guarantees: { ownership: { type: Boolean, default: true }, liveByDays: { type: Number, default: 21 } },
    capacityPerMonth: Number,
    caseStudies: [
      new Schema({ name: String, vertical: String, offer: String, result: String, url: String, permissionToShare: { type: Boolean, default: false } }, { _id: false }),
    ],
  },
  { timestamps: true },
);

export type BusinessServicesDoc = HydratedDocument<IBusinessServices>;
export const BusinessServices = model<IBusinessServices>('BusinessServices', schema);
