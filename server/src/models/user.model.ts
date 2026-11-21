import { Schema, model, type HydratedDocument } from 'mongoose';

export interface IUser {
  email: string;
  passwordHash: string;
  name?: string;
  isEmailVerified?: boolean;
  onboardingStage?: 'otp_pending' | 'profile_setup' | 'completed';
  profileImage?: string;
  otp?: {
    code: string;
    expiresAt: Date;
    attempts: number;
  };
  gmail?: { address?: string; refreshTokenEnc?: string; connectedAt?: Date; scopes?: string[] };
  consent?: { termsAcceptedAt?: Date };
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: String,
    isEmailVerified: { type: Boolean, default: false },
    onboardingStage: {
      type: String,
      enum: ['otp_pending', 'profile_setup', 'completed'],
      default: 'otp_pending',
    },
    profileImage: String,
    otp: {
      code: String,
      expiresAt: Date,
      attempts: { type: Number, default: 0 },
    },
    gmail: { address: String, refreshTokenEnc: String, connectedAt: Date, scopes: [String] },
    consent: { termsAcceptedAt: Date },
  },
  { timestamps: true },
);

export type UserDoc = HydratedDocument<IUser>;
export const User = model<IUser>('User', userSchema);
