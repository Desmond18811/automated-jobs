import { Schema, model, type Types } from 'mongoose';

/**
 * An account JAVI created or used on a job site for one user. Passwords are generated per site and
 * stored encrypted (lib/crypto, TOKEN_ENC_KEY); "google" accounts have no password.
 */
export interface ISiteAccount {
  userId: Types.ObjectId;
  /** Registrable host, e.g. "myworkdayjobs.com" or "jobs.lever.co". */
  domain: string;
  method: 'google' | 'password';
  email?: string;
  passwordEnc?: string;
  verified?: boolean;
  lastUsedAt?: Date;
}

const schema = new Schema<ISiteAccount>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    domain: { type: String, required: true },
    method: { type: String, enum: ['google', 'password'], required: true },
    email: String,
    passwordEnc: String,
    verified: Boolean,
    lastUsedAt: Date,
  },
  { timestamps: true },
);
schema.index({ userId: 1, domain: 1 }, { unique: true });

export const SiteAccount = model<ISiteAccount>('SiteAccount', schema);
