import { createContext, useContext } from 'react';

export interface DashContext {
  /** Open "needs you" tasks and drafts waiting for review: the numbers shown on the nav. */
  openTasks: number;
  drafts: number;
  /** Bumps whenever live data changes (socket events, mutations). Screens reload when it changes. */
  version: number;
  refresh: () => void;
  notify: (message: string) => void;
}

export const DashCtx = createContext<DashContext | null>(null);

export function useDash(): DashContext {
  const ctx = useContext(DashCtx);
  if (!ctx) throw new Error('useDash must be used inside the dashboard shell');
  return ctx;
}
