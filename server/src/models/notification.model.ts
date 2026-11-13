import { Schema, model, type Types } from 'mongoose';

export type NotificationType =
  | 'draft_ready' | 'draft_needs_attention' | 'needs_user' | 'sent'
  | 'send_blocked' | 'send_failed' | 'interview_invite';

export interface INotification {
  userId: Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  readAt?: Date;
}

const schema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, default: '' },
    data: Schema.Types.Mixed,
    readAt: Date,
  },
  { timestamps: true },
);

export const Notification = model<INotification>('Notification', schema);
