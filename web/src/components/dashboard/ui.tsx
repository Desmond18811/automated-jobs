import { useCallback, useEffect, useRef, useState, type CSSProperties, type FC, type ReactNode } from 'react';

/** Pull a list out of the several response shapes the API returns ({items}, {applications}, bare array...). */
export function asList<T = any>(res: any, ...keys: string[]): T[] {
  if (Array.isArray(res)) return res;
  for (const k of ['items', ...keys]) if (Array.isArray(res?.[k])) return res[k];
  return [];
}

export interface Async<T> {
  data: T | undefined;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  set: (v: T | ((prev: T | undefined) => T | undefined)) => void;
}

/** Load data on mount (and when deps change). Keeps stale data visible while reloading. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []): Async<T> {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const v = await fnRef.current();
      if (alive.current) {
        setData(v);
        setError(null);
      }
    } catch (e: any) {
      if (alive.current) setError(e?.message || 'Something went wrong');
    } finally {
      if (alive.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, reload, set: setData as Async<T>['set'] };
}

export const initialsOf = (name?: string): string =>
  (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || '?';

const AVATAR_TONES = [
  ['#DBEAFE', '#1E40AF'], ['#CCFBF1', '#115E59'], ['#E0E7FF', '#3730A3'], ['#FEF3C7', '#92400E'],
  ['#FCE7F3', '#9D174D'], ['#EDE9FE', '#5B21B6'], ['#DCFCE7', '#166534'], ['#CFFAFE', '#155E75'],
];
export const toneOf = (s = ''): [string, string] => {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length] as [string, string];
};

export const Logo: FC<{ name?: string; size?: number; round?: boolean }> = ({ name, size = 38, round = true }) => {
  const [bg, fg] = toneOf(name);
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, flex: 'none', borderRadius: round ? '50%' : 12, background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.round(size * 0.32), fontWeight: 600 }}
    >
      {initialsOf(name)}
    </span>
  );
};

export const PageHead: FC<{ title: string; blurb: string; stats?: Array<{ label: string; value: ReactNode }> }> = ({ title, blurb, stats }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, padding: '22px 56px 0 8px' }}>
    <div style={{ maxWidth: 560 }}>
      <h1 style={{ margin: 0, fontSize: 28, lineHeight: '36px', fontWeight: 500, letterSpacing: '-0.02em', color: '#111418' }}>{title}</h1>
      <p style={{ margin: '6px 0 0', fontSize: 14, lineHeight: '21px', color: '#4E5862' }}>{blurb}</p>
    </div>
    {stats && (
      <dl style={{ margin: 0, display: 'flex', flexWrap: 'wrap', gap: '16px 40px' }}>
        {stats.map((s) => (
          <div className="stat" key={s.label}>
            <dt>{s.label}</dt>
            <dd>{s.value}</dd>
          </div>
        ))}
      </dl>
    )}
  </div>
);

export const Card: FC<{ children: ReactNode; style?: CSSProperties; label?: string; labelledBy?: string }> = ({ children, style, label, labelledBy }) => (
  <section className="card" aria-label={label} aria-labelledby={labelledBy} style={{ padding: 18, ...style }}>
    {children}
  </section>
);

export const H2: FC<{ id?: string; children: ReactNode; size?: number }> = ({ id, children, size = 18 }) => (
  <h2 id={id} style={{ margin: 0, fontSize: size, lineHeight: '24px', fontWeight: 500, color: '#1D2226' }}>{children}</h2>
);

export const Muted: FC<{ children: ReactNode; style?: CSSProperties }> = ({ children, style }) => (
  <p style={{ margin: '4px 0 0', fontSize: 12.5, lineHeight: '18px', color: '#5F6A74', ...style }}>{children}</p>
);

export const Skeleton: FC<{ h?: number; w?: number | string; style?: CSSProperties }> = ({ h = 16, w = '100%', style }) => (
  <div className="skel" aria-hidden="true" style={{ height: h, width: w, ...style }} />
);

export const ErrorNote: FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '12px 14px', borderRadius: 12, background: '#FEF3F2', border: '1px solid #FEE4E2', color: '#B42318', fontSize: 13 }}>
    <span style={{ flex: 1, minWidth: 160 }}>{message}</span>
    {onRetry && (
      <button type="button" className="ghost" onClick={onRetry} style={{ height: 32, padding: '0 14px', fontSize: 12 }}>
        Try again
      </button>
    )}
  </div>
);

export const EmptyNote: FC<{ title: string; body?: string; action?: ReactNode }> = ({ title, body, action }) => (
  <div style={{ padding: '28px 16px', textAlign: 'center', color: '#5F6A74' }}>
    <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: '#1D2226' }}>{title}</p>
    {body && <p style={{ margin: '6px auto 0', maxWidth: 380, fontSize: 13, lineHeight: '19px' }}>{body}</p>}
    {action && <div style={{ marginTop: 14 }}>{action}</div>}
  </div>
);

/** Number formatted for the big stat figures, zero-padded like the prototypes ("04"). */
export const pad2 = (n: number): string => String(n).padStart(2, '0');

export const matchTone = (pct: number): { bg: string; fg: string } =>
  pct >= 85 ? { bg: '#E3F5EF', fg: '#2F7A66' } : pct >= 75 ? { bg: '#FDF3E2', fg: '#94652A' } : { bg: '#FBE3E8', fg: '#8A2C42' };

export const toPct = (score?: number): number => Math.round((score ?? 0) <= 1 ? (score ?? 0) * 100 : score ?? 0);

export const money = (s?: { min?: number; max?: number; currency?: string; period?: string } | null): string => {
  if (!s || (!s.min && !s.max)) return '';
  const k = (n?: number) => (n == null ? '' : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));
  const cur = s.currency === 'USD' || !s.currency ? '$' : `${s.currency} `;
  const range = s.min && s.max && s.min !== s.max ? `${cur}${k(s.min)} – ${cur}${k(s.max)}` : `${cur}${k(s.min || s.max)}`;
  return `${range} /${s.period === 'month' ? 'mo' : s.period === 'hour' ? 'hr' : 'yr'}`;
};

export const ago = (iso?: string | Date): string => {
  if (!iso) return '';
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24);
  return d === 1 ? 'yesterday' : `${d} days ago`;
};

/** Tiny toast hook for action feedback. */
export function useToast(): { toast: string | null; show: (m: string) => void } {
  const [toast, setToast] = useState<string | null>(null);
  const t = useRef<ReturnType<typeof setTimeout>>();
  const show = useCallback((m: string) => {
    setToast(m);
    clearTimeout(t.current);
    t.current = setTimeout(() => setToast(null), 3800);
  }, []);
  return { toast, show };
}

export const Toast: FC<{ message: string | null }> = ({ message }) =>
  message ? (
    <div role="status" style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 50, background: '#141414', color: '#fff', padding: '12px 20px', borderRadius: 999, fontSize: 13, boxShadow: '0 10px 30px rgba(16,24,40,.25)', maxWidth: 'calc(100vw - 32px)' }}>
      {message}
    </div>
  ) : null;

export const Icon: FC<{ d: string | readonly string[]; size?: number; sw?: number }> = ({ d, size = 16, sw }) => (
  <svg className="ic" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={sw ? { strokeWidth: sw } : undefined}>
    {(typeof d === 'string' ? [d] : d).map((p, i) => <path key={i} d={p} />)}
  </svg>
);

export const ICONS = {
  plus: 'M12 5v14M5 12h14',
  check: 'm5 12.5 4.5 4.5L19 7.5',
  link: ['M9.52 14.48l4.96-4.96', 'M16.96 14.48l2.64-2.64a4.68 4.68 0 0 0-6.62-6.62l-2.64 2.64M14.48 16.96l-2.64 2.64a4.68 4.68 0 0 1-6.62-6.62l2.64-2.64'],
  expand: 'M13.5 10.5 21 3M16 3h5v5M10.5 13.5 3 21M8 21H3v-5',
  collapse: 'M14 10l7-7M14 10V5M14 10h5M10 14l-7 7M10 14v5M10 14H5',
  upload: ['M12 4.5v10M12 4.5c-.7 0-2.01 1.99-2.5 2.5M12 4.5c.7 0 2.01 1.99 2.5 2.5', 'M20 16.5c0 2.48-.52 3-3 3H7c-2.48 0-3-.52-3-3'],
  bell: ['M15.5 18a3.5 3.5 0 0 1-7 0', 'M19.23 18H4.77C3.79 18 3 17.21 3 16.23c0-.47.19-.92.52-1.25l.6-.6c.56-.56.88-1.33.88-2.12V9.5a7 7 0 0 1 14 0v2.76c0 .79.32 1.56.88 2.12l.6.6c.33.33.52.78.52 1.25 0 .98-.79 1.77-1.77 1.77Z'],
  mic: ['M17 7v4a5 5 0 0 1-10 0V7a5 5 0 0 1 10 0Z', 'M20 11a8 8 0 0 1-16 0M12 19v3m0 0h3m-3 0H9'],
  pin: ['M13.62 21.49a2.34 2.34 0 0 1-1.62.65 2.34 2.34 0 0 1-1.62-.65C6.41 17.65 1.1 13.37 3.69 7.14 5.09 3.77 8.45 1.86 12 1.86s6.91 1.91 8.31 5.28c2.59 6.22-2.71 10.53-6.69 14.35Z', 'M15.5 11a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z'],
  doc: ['M3.5 10c0-3.77 0-5.66 1.17-6.83C5.84 2 7.73 2 11.5 2h1c3.77 0 5.66 0 6.83 1.17C20.5 4.34 20.5 6.23 20.5 10v4c0 3.77 0 5.66-1.17 6.83C18.16 22 16.27 22 12.5 22h-1c-3.77 0-5.66 0-6.83-1.17C3.5 19.66 3.5 17.77 3.5 14v-4Z', 'M8 7h8M8 12h8M8 17h4'],
  help: ['M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12s4.48 10 10 10 10-4.48 10-10Z', 'M10 9a2 2 0 1 1 3.68 1.08c-.6.92-1.68 1.8-1.68 2.92v.5M11.99 17h.01'],
  shield: ['M21 11.18V8.27c0-1.64 0-2.47-.4-3-.41-.54-1.33-.8-3.17-1.32-1.25-.36-2.36-.79-3.24-1.18-1.2-.53-1.8-.8-2.19-.8s-.98.27-2.19.8c-.89.39-1.99.82-3.24 1.18-1.84.52-2.76.78-3.17 1.32C3 5.8 3 6.63 3 8.27v2.91c0 5.65 5.08 9.03 7.62 10.37.61.32.92.48 1.38.48s.77-.16 1.38-.48C15.92 20.21 21 16.83 21 11.18Z', 'm9 11.5 2 2 4-4'],
  lock: ['M4.27 18.84c.23 1.67 1.61 2.98 3.3 3.06 1.42.07 2.86.1 4.43.1s3.01-.03 4.43-.1c1.69-.08 3.07-1.39 3.3-3.06.15-1.09.27-2.2.27-3.34s-.12-2.25-.27-3.34c-.23-1.67-1.61-2.98-3.3-3.06C15.01 9.03 13.57 9 12 9s-3.01.03-4.43.1c-1.69.08-3.07 1.39-3.3 3.06-.15 1.09-.27 2.2-.27 3.34s.12 2.25.27 3.34Z', 'M7.5 9V6.5a4.5 4.5 0 0 1 9 0V9M12 15.5v1'],
  calendar: ['M2.5 12.24c0-4.36 0-6.53 1.25-7.89C5 3 7.02 3 11.05 3h1.9c4.03 0 6.05 0 7.3 1.35 1.25 1.36 1.25 3.53 1.25 7.89v.52c0 4.36 0 6.53-1.25 7.89C19 21 16.98 21 12.95 21h-1.9c-4.03 0-6.05 0-7.3-1.35-1.25-1.36-1.25-3.53-1.25-7.89v-.52Z', 'M16 2v4M8 2v4M3 9h18'],
  edit: 'M15.21 4.73l1.4-1.39a2 2 0 0 1 2.82 0l1.23 1.23a2 2 0 0 1 0 2.83l-1.39 1.39M15.21 4.73l-9.15 9.15A5.54 5.54 0 0 0 4.44 17.8v1.76H6.2c1.47 0 2.88-.58 3.92-1.62l9.15-9.15M15.21 4.73l4.06 4.06',
  more: 'M5.5 12h.01M12 12h.01M18.5 12h.01',
  mail: ['M2 8l8.4 5.6a3 3 0 0 0 3.2 0L22 8', 'M2 8c0-1.9 0-2.85.6-3.45.6-.6 1.55-.6 3.45-.6h11.9c1.9 0 2.85 0 3.45.6.6.6.6 1.55.6 3.45v8c0 1.9 0 2.85-.6 3.45-.6.6-1.55.6-3.45.6H6.05c-1.9 0-2.85 0-3.45-.6C2 18.85 2 17.9 2 16V8Z'],
} as const;

export const Sparkle: FC<{ size?: number; color?: string }> = ({ size = 18, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M14.6 4.2l1.3 3.2 3.2 1.3-3.2 1.3-1.3 3.2-1.3-3.2-3.2-1.3 3.2-1.3Z" fill={color} />
    <path d="M8.4 11.6l.9 2.2 2.2.9-2.2.9-.9 2.2-.9-2.2-2.2-.9 2.2-.9Z" fill={color} />
  </svg>
);
