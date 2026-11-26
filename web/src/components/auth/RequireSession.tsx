import type { FC, ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useGuard } from '@/lib/session';

/**
 * Renders children only once the server has confirmed the session (and, for dashboard pages, a finished profile).
 * Anything else redirects: no session -> sign-in (remembering the link), unfinished setup -> /setup,
 * already finished setup on /setup -> /dash.
 */
export const RequireSession: FC<{ children: ReactNode; kind?: 'dash' | 'setup' }> = ({ children, kind = 'dash' }) => {
  const { state, complete, retry } = useGuard(kind);
  const loc = useLocation();
  const editing = new URLSearchParams(loc.search).get('edit') === '1';

  if (state === 'checking') return null;
  if (state === 'signed-out') {
    return <Navigate to={`/signin?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  }
  if (state === 'needs-setup') return <Navigate to="/setup" replace />;
  if (state === 'error') {
    return (
      <div style={{ padding: 40, fontFamily: 'system-ui, sans-serif', color: '#17191F' }}>
        We couldn't reach the server.{' '}
        <button type="button" onClick={retry} style={{ textDecoration: 'underline', background: 'none', border: 0, cursor: 'pointer', color: '#2457E8', font: 'inherit' }}>
          Try again
        </button>
      </div>
    );
  }
  if (kind === 'setup' && complete && !editing) return <Navigate to="/dash" replace />;
  return <>{children}</>;
};
