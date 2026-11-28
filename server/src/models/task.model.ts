import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export type NeedsReason =
  | 'unknown_question' | 'captcha' | 'login_wall' | 'salary_question' | 'interview_invite'
  | 'assisted_platform' | 'confirm_submission' | 'no_form_found' | 'reconnect_gmail';

export interface TaskQuestion {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'file';
  options?: string[];
  required: boolean;
  isSalary?: boolean;
  /** An LLM-drafted answer from the profile and job (open-ended questions only). The user confirms or edits it. */
  suggested?: string;
}

/** The "needs you" loop: anything JAVI must not guess becomes a task the user answers once. */
export interface ITask {
  userId: Types.ObjectId;
  applicationId?: Types.ObjectId;
  reason: NeedsReason;
  message: string;
  questions: TaskQuestion[];
  payload?: Record<string, unknown>;
  status: 'open' | 'answered' | 'done' | 'dismissed';
  answers?: Record<string, string>;
  /** 4-digit code the user puts at the start of a WhatsApp reply ("4821 yes"). */
  replyCode?: string;
  /** The Telegram message that asked this, so a reply to it answers this task. */
  telegramMessageId?: number;
  /** True while a live browser session is holding the page open, waiting on this task. */
  live?: boolean;
}

const schema = new Schema<ITask>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    applicationId: { type: Schema.Types.ObjectId, ref: 'Application' },
    reason: { type: String, required: true },
    message: { type: String, default: '' },
    questions: [{ _id: false, key: String, label: String, type: { type: String }, options: [String], required: Boolean, isSalary: Boolean, suggested: String }],
    payload: Schema.Types.Mixed,
    status: { type: String, enum: ['open', 'answered', 'done', 'dismissed'], default: 'open' },
    answers: Schema.Types.Mixed,
    replyCode: String,
    telegramMessageId: Number,
    live: Boolean,
  },
  { timestamps: true },
);
schema.index({ userId: 1, status: 1, createdAt: -1 });
schema.index({ applicationId: 1, status: 1 });

export type TaskDoc = HydratedDocument<ITask>;
export const Task = model<ITask>('Task', schema);
