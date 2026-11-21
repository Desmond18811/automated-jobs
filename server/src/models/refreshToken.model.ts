import { Schema, model, type Types } from 'mongoose';

/**
 * Opaque refresh tokens, stored hashed and rotated on every use. All tokens of one sign-in share a `family`,
 * which is the "session" a user sees as a device. `expiresAt` slides forward (idle limit); `absoluteExpiresAt`
 * is fixed when the session starts. Reuse of a long-rotated token revokes the whole family.
 */
export interface IRefreshToken {
  userId: Types.ObjectId;
  tokenHash: string;
  family: string;
  expiresAt: Date;
  absoluteExpiresAt: Date;
  sessionStartedAt: Date;
  lastUsedAt: Date;
  userAgent?: string;
  ip?: string;
  /** Set when this token was exchanged for a newer one. */
  rotatedAt?: Date;
  revokedAt?: Date;
}

const schema = new Schema<IRefreshToken>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    family: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    absoluteExpiresAt: { type: Date, required: true },
    sessionStartedAt: { type: Date, required: true },
    lastUsedAt: { type: Date, required: true },
    userAgent: String,
    ip: String,
    rotatedAt: Date,
    revokedAt: Date,
  },
  { timestamps: true },
);
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = model<IRefreshToken>('RefreshToken', schema);
