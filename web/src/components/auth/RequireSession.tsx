import type { FC, ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useRequireSession } from '@/lib/session';

/** Renders children only for a signed-in user; renews the session silently first, else sends them to sign in. */
export const RequireSession: FC<{ children: ReactNode }> = ({ children }) => {
  const state = useRequireSession();
  const loc = useLocation();
  if (state === 'checking') return null;
  if (state === 'signed-out') {
    return <Navigate to={`/signin?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  }
  return <>{children}</>;
};
