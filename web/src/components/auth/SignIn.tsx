import { useEffect, useState, type FC, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MailIcon } from '@/assets/icons';
import { AuthSplitLayout } from './AuthSplitLayout';
import { authError, authInput, authButton, authLinkButton, authSub, authTitle, NEXT_KEY } from './authStyles';
import { authApi, authStateStorage, getRouteForStage } from '@/api';
import { ensureSession, safeNext } from '@/lib/session';

/** Passwordless sign-in: one email field, then "check your inbox". Works for new and returning users alike. */
export const SignIn: FC = () => {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState(() => params.get('email') || authStateStorage.getLastEmail() || '');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const next = safeNext(params.get('next'));
  useEffect(() => {
    try {
      if (next) localStorage.setItem(NEXT_KEY, next);
    } catch {
      /* private mode: we just land on the dashboard */
    }
  }, [next]);

  // Someone with a live session or completed setup never needs to see this page.
  useEffect(() => {
    let live = true;
    (async () => {
      if (await ensureSession()) {
        try {
          const me = await authApi.getMe();
          if (!live) return;
          authStateStorage.saveSession(me);
          if (
            me.onboardingStage === 'completed' ||
            (me as any).isSetupCompleted ||
            (me as any).setupCompleted ||
            (me as any).profileStatus === 'verified'
          ) {
            nav(next || '/dash', { replace: true });
            return;
          }
          nav(getRouteForStage(me.onboardingStage), { replace: true });
          return;
        } catch {
          /* fall through to the form */
        }
      }
      if (live) setChecking(false);
    })();
    return () => {
      live = false;
    };
  }, [nav, next]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const send = async (e?: FormEvent) => {
    e?.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!clean) return setError('Enter your email address');
    setBusy(true);
    setError(null);
    try {
      const res = await authApi.start(clean);
      setSentTo(clean);
      setCooldown(res.resendAfterSeconds);
    } catch (err: any) {
      setError(err?.message || 'Could not send the email. Try again.');
    } finally {
      setBusy(false);
    }
  };

  if (checking) return <AuthSplitLayout><div style={{ height: 120 }} /></AuthSplitLayout>;

  return (
    <AuthSplitLayout>
      {sentTo ? (
        <div data-screen-label="Check your email" style={{ width: '100%' }}>
          <button
            type="button"
            onClick={() => { setSentTo(null); setError(null); }}
            aria-label="Back to enter email"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              border: 'none',
              background: 'transparent',
              color: '#475467',
              fontSize: 13.5,
              fontWeight: 600,
              cursor: 'pointer',
              padding: '6px 12px 6px 8px',
              borderRadius: 8,
              marginBottom: 16,
              marginLeft: -8,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f2f4f7';
              e.currentTarget.style.color = '#101828';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#475467';
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span>Back</span>
          </button>
          <span
            aria-hidden="true"
            style={{ width: 48, height: 48, borderRadius: 12, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}
          >
            <MailIcon size={22} />
          </span>
          <h1 style={authTitle}>Check your email</h1>
          <p style={authSub}>
            We sent a sign-in link and a 6-digit code to <strong style={{ color: '#101828' }}>{sentTo}</strong>. Open the link, then enter the code on the page that opens.
          </p>
          {error && <div role="alert" style={authError}>{error}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13, color: '#667085' }}>
            <span>
              Didn’t get it?{' '}
              {cooldown > 0 ? (
                <span>You can resend in {cooldown}s.</span>
              ) : (
                <button type="button" onClick={() => send()} disabled={busy} style={authLinkButton}>
                  Send again
                </button>
              )}
            </span>
            <span>
              Wrong address?{' '}
              <button type="button" onClick={() => { setSentTo(null); setError(null); }} style={authLinkButton}>
                Use a different email
              </button>
            </span>
          </div>
        </div>
      ) : (
        <div data-screen-label="Sign in" style={{ width: '100%' }}>
          <h1 style={authTitle}>Sign in to J.A.V.I</h1>
          <p style={authSub}>Enter your email. We’ll send you a link and a code. No password to remember.</p>
          {error && <div role="alert" style={authError}>{error}</div>}
          <form onSubmit={send} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label htmlFor="email" style={{ fontSize: 13, fontWeight: 500, color: '#344054' }}>Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                style={authInput}
              />
            </div>
            <button type="submit" disabled={busy} style={authButton(busy)}>
              {busy ? 'Sending…' : 'Continue with email'}
            </button>
          </form>
          <p style={{ margin: '22px 0 0', fontSize: 12, color: '#667085', lineHeight: '18px' }}>
            New here? The same step creates your account.
          </p>
        </div>
      )}
    </AuthSplitLayout>
  );
};

export default SignIn;
