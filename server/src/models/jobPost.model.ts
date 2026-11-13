import { Schema, model, type HydratedDocument } from 'mongoose';
import type { Period } from './profile.model';

export type ApplyType = 'email' | 'form' | 'platform' | 'unknown';

export interface Salary { min?: number; max?: number; currency?: string; period?: Period }

/** One normalized schema for every source: feeds, APIs, career pages and manual adds. */
export interface IJobPost {
  source: string;
  sourceId?: string;
  url: string;
  company: string;
  title: string;
  location?: string;
  remote?: boolean | null;
  description: string;
  salary?: Salary | null;
  postedAt?: Date;
  applyMethod: { type: ApplyType; email?: string; formUrl?: string; platform?: string };
  tags: string[];
  dedupeHash: string;
  fingerprint: string;
  discoveredAt: Date;
}

const schema = new Schema<IJobPost>(
  {
    source: { type: String, required: true, index: true },
    sourceId: String,
    url: { type: String, required: true },
    company: { type: String, required: true },
    title: { type: String, required: true },
    location: String,
    remote: { type: Boolean, default: null },
    description: { type: String, default: '' },
    salary: { min: Number, max: Number, currency: String, period: { type: String, enum: ['hour', 'month', 'year'] } },
    postedAt: Date,
    applyMethod: {
      type: { type: String, enum: ['email', 'form', 'platform', 'unknown'], required: true },
      email: String,
      formUrl: String,
      platform: String,
    },
    tags: [String],
    dedupeHash: { type: String, required: true, unique: true },
    fingerprint: { type: String, required: true, index: true },
    discoveredAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true },
);

export type JobPostDoc = HydratedDocument<IJobPost>;
export const JobPost = model<IJobPost>('JobPost', schema);
