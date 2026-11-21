import { Schema, model } from 'mongoose';

/**
 * One passwordless sign-in attempt. The emailed link token and the 6-digit code are both stored only as
 * hashes. Signing in needs both: the link identifies the challenge, the code proves inbox access.
 */
export interface ILoginChallenge {
  email: string;
  codeHash: string;
  linkTokenHash: string;
  expiresAt: Date;
  attempts: number;
  linkOpenedAt?: Date;
  /** Set when used, locked out, or superseded by a newer challenge for the same email. */
  consumedAt?: Date;
  ip?: string;
  userAgent?: string;
}

const schema = new Schema<ILoginChallenge>(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    codeHash: { type: String, required: true },
    linkTokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    linkOpenedAt: Date,
    consumedAt: Date,
    ip: String,
    userAgent: String,
  },
  { timestamps: true },
);
// Keep rows for an hour past expiry so send-rate limits and "expired" errors still work.
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });

export const LoginChallenge = model<ILoginChallenge>('LoginChallenge', schema);
