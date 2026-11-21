import { useEffect, useState } from 'react';
import { authApi, refreshSession, tokenStorage } from '@/api';

/** Seconds until a JWT expires, or null if it can't be read. */
function secondsLeft(token: string | null): number | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' ? payload.exp - Date.now() / 1000 : null;
  } catch {
    return null;
  }
}

const REFRESH_MARGIN_S = 90;

/**
 * Make sure there is a usable access token, renewing it from the refresh cookie when it is missing or about to
 * expire. This is what lets a returning user skip the sign-in screen after days away.
 */
export async function ensureSession(): Promise<boolean> {
  const left = secondsLeft(tokenStorage.get());
  if (left !== null && left > REFRESH_MARGIN_S) return true;
  if (await refreshSession()) return true;
  // Refresh failed. If it was only the network, a still-valid token is good enough.
  return (secondsLeft(tokenStorage.get()) ?? 0) > 0;
}

/**
 * Keeps a signed-in tab signed in: refreshes shortly before the access token expires and again whenever the
 * tab becomes visible (laptop woken, tab revisited). Active use also slides the server-side idle window.
 */
export function startSessionKeepAlive(): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const schedule = () => {
    clearTimeout(timer);
    const left = secondsLeft(tokenStorage.get());
    if (left === null) return;
    timer = setTimeout(async () => {
      await refreshSession();
      schedule();
    }, Math.max(5, left - REFRESH_MARGIN_S) * 1000);
  };

  const onVisible = () => {
    if (document.visibilityState !== 'visible' || !tokenStorage.get()) return;
    void ensureSession().then(schedule);
  };

  const unsub = tokenStorage.subscribe(schedule);
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('online', onVisible);
  schedule();

  return () => {
    clearTimeout(timer);
    unsub();
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('online', onVisible);
  };
}

export type SessionState = 'checking' | 'signed-in' | 'signed-out';

/** Route guard hook: resolves the session once on mount. */
export function useRequireSession(): SessionState {
  const [state, setState] = useState<SessionState>(() => (tokenStorage.get() ? 'signed-in' : 'checking'));

  useEffect(() => {
    let live = true;
    void ensureSession().then((ok) => {
      if (live) setState(ok ? 'signed-in' : 'signed-out');
    });
    return () => {
      live = false;
    };
  }, []);

  return state;
}

/** Where to send someone after sign-in: the page they were trying to reach, if it is inside the app. */
export function safeNext(next: string | null | undefined): string | null {
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/signin') && !next.startsWith('/auth')
    ? next
    : null;
}

export { authApi };
