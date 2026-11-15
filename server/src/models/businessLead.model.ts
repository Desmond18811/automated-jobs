import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export interface IBusinessLead {
  userId: Types.ObjectId;
  name: string;
  category: string;
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  distanceKm: number;
  rating?: number;
  reviewsCount?: number;
  websiteUrl?: string;
  websiteAudit: {
    hasWebsite: boolean;
    mobileResponsive: boolean;
    hasSsl: boolean;
    techStack: string[];
    issues: string[];
  };
  socialPresence: {
    linkedinUrl?: string;
    twitterUrl?: string;
    instagramUrl?: string;
    facebookUrl?: string;
    notes: string[];
  };
  contacts: Array<{
    name: string;
    title: string;
    email?: string;
    phone?: string;
    linkedinUrl?: string;
  }>;
  needsServices: boolean;
  qualificationReason: string;
  pitchSnippet: string;
  sequence: Array<{
    stepNumber: number;
    channel: 'email' | 'whatsapp' | 'linkedin';
    scheduledAt: Date;
    status: 'pending' | 'sent' | 'replied' | 'paused';
    subject?: string;
    body: string;
  }>;
  stage: 'discovered' | 'qualified' | 'pitch_drafted' | 'sequence_active' | 'sequence_paused' | 'replied' | 'converted' | 'dismissed';
}

const schema = new Schema<IBusinessLead>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    address: { type: String, default: '' },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    distanceKm: { type: Number, default: 1 },
    rating: { type: Number, default: 4.5 },
    reviewsCount: { type: Number, default: 10 },
    websiteUrl: { type: String },
    websiteAudit: {
      hasWebsite: { type: Boolean, default: true },
      mobileResponsive: { type: Boolean, default: true },
      hasSsl: { type: Boolean, default: true },
      techStack: [{ type: String }],
      issues: [{ type: String }],
    },
    socialPresence: {
      linkedinUrl: String,
      twitterUrl: String,
      instagramUrl: String,
      facebookUrl: String,
      notes: [{ type: String }],
    },
    contacts: [
      {
        _id: false,
        name: String,
        title: String,
        email: String,
        phone: String,
        linkedinUrl: String,
      },
    ],
    needsServices: { type: Boolean, default: true },
    qualificationReason: { type: String, default: '' },
    pitchSnippet: { type: String, default: '' },
    sequence: [
      {
        _id: false,
        stepNumber: Number,
        channel: { type: String, enum: ['email', 'whatsapp', 'linkedin'], default: 'email' },
        scheduledAt: Date,
        status: { type: String, enum: ['pending', 'sent', 'replied', 'paused'], default: 'pending' },
        subject: String,
        body: String,
      },
    ],
    stage: {
      type: String,
      enum: ['discovered', 'qualified', 'pitch_drafted', 'sequence_active', 'sequence_paused', 'replied', 'converted', 'dismissed'],
      default: 'qualified',
    },
  },
  { timestamps: true },
);

schema.index({ userId: 1, stage: 1, createdAt: -1 });
schema.index({ 'location.lat': 1, 'location.lng': 1 });

export type BusinessLeadDoc = HydratedDocument<IBusinessLead>;
export const BusinessLead = model<IBusinessLead>('BusinessLead', schema);
