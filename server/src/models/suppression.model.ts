import { Schema, model, type Types } from 'mongoose';

/**
 * Addresses or domains that must never be emailed. userId null = global (e.g. a business that
 * unsubscribed from anyone's outreach); otherwise scoped to one user.
 */
export interface ISuppression {
  userId?: Types.ObjectId | null;
  email?: string;
  domain?: string;
  reason: 'unsubscribed' | 'bounced' | 'complaint' | 'user_blocked';
}

const schema = new Schema<ISuppression>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    email: { type: String, lowercase: true, trim: true },
    domain: { type: String, lowercase: true, trim: true },
    reason: { type: String, required: true },
  },
  { timestamps: true },
);
schema.index({ email: 1 });
schema.index({ domain: 1 });

export const Suppression = model<ISuppression>('Suppression', schema);
