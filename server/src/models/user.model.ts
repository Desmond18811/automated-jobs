import { Schema, model, type HydratedDocument } from 'mongoose';

export interface IUser {
  email: string;
  passwordHash: string;
  name?: string;
  gmail?: { address?: string; refreshTokenEnc?: string; connectedAt?: Date; scopes?: string[] };
  consent?: { termsAcceptedAt?: Date };
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: String,
    gmail: { address: String, refreshTokenEnc: String, connectedAt: Date, scopes: [String] },
    consent: { termsAcceptedAt: Date },
  },
  { timestamps: true },
);

export type UserDoc = HydratedDocument<IUser>;
export const User = model<IUser>('User', userSchema);
