import { Schema, model, type HydratedDocument } from 'mongoose';

export interface IUser {
  email: string;
  name?: string;
  isEmailVerified?: boolean;
  onboardingStage?: 'otp_pending' | 'profile_setup' | 'completed';
  setupStep?: number;
  /** The user chose to skip profile setup and go straight to the dashboard. */
  setupSkipped?: boolean;
  isSetupCompleted?: boolean;
  setupCompleted?: boolean;
  profileImage?: string;
  gmail?: { address?: string; refreshTokenEnc?: string; connectedAt?: Date; scopes?: string[] };
  consent?: { termsAcceptedAt?: Date };
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: String,
    isEmailVerified: { type: Boolean, default: false },
    onboardingStage: {
      type: String,
      enum: ['otp_pending', 'profile_setup', 'completed'],
      default: 'otp_pending',
    },
    setupStep: { type: Number, default: 1, min: 1, max: 9 },
    setupSkipped: { type: Boolean, default: false },
    isSetupCompleted: { type: Boolean, default: false },
    setupCompleted: { type: Boolean, default: false },
    profileImage: String,
    gmail: { address: String, refreshTokenEnc: String, connectedAt: Date, scopes: [String] },
    consent: { termsAcceptedAt: Date },
  },
  { timestamps: true },
);

export type UserDoc = HydratedDocument<IUser>;
export const User = model<IUser>('User', userSchema);
