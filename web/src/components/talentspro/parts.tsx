import type { CSSProperties, FC, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon, avatarTone, initialsOf } from './icons';

export const cardStyle: CSSProperties = {
  background: 'rgba(255,255,255,.58)',
  border: '1px solid rgba(255,255,255,.95)',
  borderRadius: 26,
  padding: 16,
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 1px 2px rgba(23,25,31,.03),0 16px 40px -24px rgba(36,87,232,.2)',
};

export const CardHead: FC<{ title: ReactNode; to?: string; cta?: string; extra?: ReactNode }> = ({ title, to, cta = 'All', extra }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 2px 4px 6px' }}>
    <h2 style={{ margin: 0, fontSize: 17, fontWeight: 500, letterSpacing: '-.01em' }}>{title}</h2>
    <span style={{ display: 'flex', gap: 8 }}>
    {extra}
    {to && (
      <Link to={to} className="tp-btn-ghost" style={{ height: 36, minWidth: 48, padding: '0 14px', borderRadius: 999, border: '1px solid #E3E9F2', background: '#fff', fontSize: 13, fontWeight: 500, color: '#17191F', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        {cta}
      </Link>
    )}
    </span>
  </div>
);

export const Skeleton: FC<{ w?: number | string; h?: number; r?: number }> = ({ w = '100%', h = 20, r = 8 }) => (
  <span className="tp-shimmer" style={{ width: w, height: h, borderRadius: r }} />
);

export const Logo: FC<{ name: string; size?: number }> = ({ name, size = 46 }) => {
  const [bg, fg] = avatarTone(name || '?');
  return (
    <span style={{ width: size, height: size, flex: `0 0 ${size}px`, borderRadius: '50%', background: bg, color: fg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: size > 44 ? 17 : 15, fontWeight: 600 }}>
      {(name || '?').trim()[0]?.toUpperCase()}
    </span>
  );
};

export const IconCircle: FC<{ name: string; size?: number }> = ({ name, size = 46 }) => (
  <span style={{ width: size, height: size, flex: `0 0 ${size}px`, borderRadius: '50%', background: '#F2F6FF', border: '1px solid #E6EDFA', color: '#2457E8', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
    <Icon name={name} size={19} />
  </span>
);

export const EmptyState: FC<{ icon: string; title: string; body: string; cta?: { to: string; label: string } }> = ({ icon, title, body, cta }) => (
  <div style={{ background: '#fff', borderRadius: 20, padding: '16px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 6 }}>
    <span style={{ width: 38, height: 38, borderRadius: '50%', background: '#F2F6FF', color: '#2457E8', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={icon} size={18} />
    </span>
    <div style={{ fontSize: 15, fontWeight: 500 }}>{title}</div>
    <div style={{ fontSize: 12, color: '#606979', maxWidth: 240, lineHeight: 1.4 }}>{body}</div>
    {cta && (
      <Link to={cta.to} className="tp-btn-ghost" style={{ height: 36, padding: '0 16px', borderRadius: 999, border: '1px solid #DCE3EE', background: 'rgba(255,255,255,.6)', fontSize: 12, fontWeight: 500, color: '#17191F', display: 'inline-flex', alignItems: 'center' }}>
        {cta.label}
      </Link>
    )}
  </div>
);

export const Badge: FC<{ bg: string; fg: string; children: ReactNode }> = ({ bg, fg, children }) => (
  <span style={{ background: bg, color: fg, fontSize: 11, fontWeight: 500, padding: '5px 11px', borderRadius: 999, whiteSpace: 'nowrap' }}>{children}</span>
);

export const primaryBtn: CSSProperties = { height: 48, padding: '0 26px', borderRadius: 999, border: 0, background: '#2457E8', color: '#fff', fontSize: 14, fontWeight: 500, boxShadow: '0 10px 22px -12px rgba(36,87,232,.7)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };
export const ghostBtn: CSSProperties = { height: 48, padding: '0 26px', borderRadius: 999, border: '1px solid #DCE3EE', background: 'rgba(255,255,255,.6)', color: '#17191F', fontSize: 14, fontWeight: 500, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };

export { initialsOf };
