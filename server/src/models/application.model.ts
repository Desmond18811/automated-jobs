import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export const APP_STATES = [
  'discovered', 'matched', 'drafted', 'approved', 'needs_user', 'sent', 'replied',
  'interview', 'offer', 'hired', 'rejected', 'no_response', 'failed', 'archived',
] as const;
export type AppState = (typeof APP_STATES)[number];
export type Channel = 'email' | 'form' | 'assisted';

export interface FactCheck { passed: boolean; blocking: string[]; warnings: string[] }

export interface IApplication {
  userId: Types.ObjectId;
  jobId: Types.ObjectId;
  fingerprint: string;
  status: AppState;
  score: number;
  scoreBreakdown: Record<string, number>;
  filterNotes: string[];
  channel: Channel;
  documents?: {
    emailSubject?: string;
    emailBody?: string;
    coverLetter?: string;
    proposal?: string;
    cvSummary?: string;
    cvPdfPath?: string;
    usedFactIds?: string[];
    factCheck?: FactCheck;
    editedByUser?: boolean;
    generatedAt?: Date;
  };
  delivery?: { messageId?: string; threadId?: string; sentAt?: Date; screenshotPath?: string };
  needsUserTaskId?: Types.ObjectId;
  history: { from: AppState | null; to: AppState; at: Date; note?: string }[];
}

const schema = new Schema<IApplication>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    jobId: { type: Schema.Types.ObjectId, ref: 'JobPost', required: true },
    fingerprint: { type: String, required: true },
    status: { type: String, enum: APP_STATES, required: true },
    score: { type: Number, default: 0 },
    scoreBreakdown: { type: Schema.Types.Mixed, default: {} },
    filterNotes: [String],
    channel: { type: String, enum: ['email', 'form', 'assisted'], required: true },
    documents: {
      emailSubject: String,
      emailBody: String,
      coverLetter: String,
      proposal: String,
      cvSummary: String,
      cvPdfPath: String,
      usedFactIds: [String],
      factCheck: { passed: Boolean, blocking: [String], warnings: [String] },
      editedByUser: Boolean,
      generatedAt: Date,
    },
    delivery: { messageId: String, threadId: String, sentAt: Date, screenshotPath: String },
    needsUserTaskId: { type: Schema.Types.ObjectId, ref: 'Task' },
    history: [{ _id: false, from: String, to: String, at: Date, note: String }],
  },
  { timestamps: true },
);
schema.index({ userId: 1, jobId: 1 }, { unique: true }); // never two applications for the same posting
schema.index({ userId: 1, fingerprint: 1 });
schema.index({ userId: 1, status: 1, updatedAt: -1 });

export type ApplicationDoc = HydratedDocument<IApplication>;
export const Application = model<IApplication>('Application', schema);
