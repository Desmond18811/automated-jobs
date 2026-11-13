import { Schema, model, type Types } from 'mongoose';
import { sha256 } from '../lib/crypto';

/** Append-only record of every outbound attempt. Bodies are hashed; the full text lives on the application. */
export interface IAuditLog {
  userId: Types.ObjectId;
  applicationId?: Types.ObjectId;
  action: 'send' | 'followup' | 'generate' | 'delete_data' | 'gmail_connect' | 'gmail_disconnect';
  channel?: string;
  to?: string;
  subject?: string;
  bodyHash?: string;
  result: 'sent' | 'needs_user' | 'failed' | 'blocked' | 'ok';
  detail?: string;
}

const schema = new Schema<IAuditLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    applicationId: { type: Schema.Types.ObjectId, ref: 'Application' },
    action: { type: String, required: true },
    channel: String,
    to: String,
    subject: String,
    bodyHash: String,
    result: { type: String, required: true },
    detail: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const AuditLog = model<IAuditLog>('AuditLog', schema);

export async function audit(entry: Omit<IAuditLog, 'userId' | 'applicationId' | 'bodyHash'> & {
  userId: string | Types.ObjectId;
  applicationId?: string | Types.ObjectId;
  body?: string;
}): Promise<void> {
  const { body, ...rest } = entry;
  await AuditLog.create({ ...rest, bodyHash: body ? sha256(body) : undefined });
}
