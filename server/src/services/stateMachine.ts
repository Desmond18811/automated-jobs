import { AppError } from '../lib/http';
import type { AppState, ApplicationDoc } from '../models/application.model';

const ALLOWED: Record<AppState, AppState[]> = {
  discovered: ['matched', 'archived'],
  matched: ['drafted', 'archived'],
  drafted: ['drafted', 'approved', 'archived'],
  approved: ['sent', 'needs_user', 'failed', 'archived'],
  needs_user: ['approved', 'sent', 'archived'],
  failed: ['approved', 'archived'],
  sent: ['replied', 'interview', 'rejected', 'no_response', 'offer'],
  replied: ['interview', 'offer', 'rejected', 'no_response'],
  no_response: ['replied', 'interview', 'rejected', 'archived'],
  interview: ['offer', 'rejected', 'interview'],
  offer: ['hired', 'rejected'],
  hired: [],
  rejected: ['archived'],
  archived: [],
};

/** States a user can set by hand (until the Gmail reply classifier does it automatically). */
export const USER_SETTABLE: AppState[] = ['replied', 'interview', 'offer', 'hired', 'rejected', 'no_response', 'archived'];
export const SENT_STATES: AppState[] = ['sent', 'replied', 'interview', 'offer', 'hired', 'rejected', 'no_response'];

export function canTransition(from: AppState, to: AppState): boolean {
  return ALLOWED[from].includes(to);
}

export async function transition(app: ApplicationDoc, to: AppState, note?: string): Promise<void> {
  if (!canTransition(app.status, to)) {
    throw new AppError(409, `Cannot move an application from "${app.status}" to "${to}"`);
  }
  app.history.push({ from: app.status, to, at: new Date(), note });
  app.status = to;
  await app.save();
}
