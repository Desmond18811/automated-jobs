import { useCallback, useEffect, useState } from 'react';

/** Normalises the API's list responses ({items}, {applications}, ... or a bare array). */
export function asList(res: any, ...keys: string[]): any[] {
  if (Array.isArray(res)) return res;
  for (const k of [...keys, 'items', 'data']) if (Array.isArray(res?.[k])) return res[k];
  return [];
}

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: string | null }>({ data: null, loading: true, error: null });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fn().then(
      (data) => live && setState({ data, loading: false, error: null }),
      (e) => live && setState({ data: null, loading: false, error: e?.message || 'Something went wrong' }),
    );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  const reload = useCallback(() => setTick((n) => n + 1), []);
  return { ...state, reload };
}

export type Stage = 'submitted' | 'review' | 'interview';

/** Statuses that mean an application actually went out. */
export const SENT = ['sent', 'no_response', 'rejected', 'replied', 'interview', 'offer', 'hired'];

export const stageOf = (status: string): Stage =>
  status === 'interview' || status === 'offer' || status === 'hired' ? 'interview' : status === 'replied' ? 'review' : 'submitted';

export const STAGE_BADGE: Record<Stage, { label: string; bg: string; fg: string }> = {
  submitted: { label: 'Submitted', bg: '#F1F4F8', fg: '#4C5566' },
  review: { label: 'In review', bg: '#FFF5DF', fg: '#8A5A00' },
  interview: { label: 'Interview', bg: '#EAF1FF', fg: '#1746C7' },
};

export const NEXT_STEP: Record<string, string> = {
  sent: 'Awaiting reply',
  no_response: 'No reply yet',
  rejected: 'Not selected',
  replied: 'Recruiter replied',
  interview: 'Interview in progress',
  offer: 'Offer received',
  hired: 'Hired',
};

export const jobOf = (a: any) => (a?.jobId && typeof a.jobId === 'object' ? a.jobId : {});

export function ago(d?: string | Date): string {
  if (!d) return '';
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 172800) return 'Yesterday';
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export const shortDate = (d?: string | Date) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '');

export const toPct = (n?: number): number | null => (typeof n !== 'number' ? null : Math.round(n <= 1 ? n * 100 : n));

export function money(s?: { min?: number; max?: number; currency?: string; period?: string }): string {
  if (!s || (!s.min && !s.max)) return '';
  const f = (n: number) => (n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(n));
  const cur = s.currency === 'USD' || !s.currency ? '$' : `${s.currency} `;
  const range = s.min && s.max ? `${cur}${f(s.min)}–${f(s.max)}` : `${cur}${f((s.min || s.max)!)}`;
  return s.period ? `${range} / ${s.period.replace(/ly$/, '').replace('year', 'yr').replace('month', 'mo').replace('hour', 'hr')}` : range;
}
