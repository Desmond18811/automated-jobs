import { useEffect, useState, type FC, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthSplitLayout } from './AuthSplitLayout';
import { authError, authInput, authButton, authSub, authTitle, NEXT_KEY } from './authStyles';
import { authApi, getRouteForStage } from '@/api';
import { safeNext } from '@/lib/session';

/** The page the emailed link opens. Second factor: type the 6-digit code from the same email. */
export const VerifyLink: FC = () => {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') || '';

  const [email, setEmail] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(token ? null : 'This sign-in link is incomplete. Request a new one.');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    authApi.openLink(token).then(
      (r) => setEmail(r.email),
      (err) => setLinkError(err?.message || 'This sign-in link is no longer valid. Request a new one.'),
    );
  }, [token]);

  const submit = async (value = code, e?: FormEvent) => {
    e?.preventDefault();
    if (busy || value.length < 6) return;
    setBusy(true);
    setError(null);
    try {
      const res = await authApi.verify(token, value);
      let next: string | null = null;
      try {
        next = safeNext(localStorage.getItem(NEXT_KEY));
        localStorage.removeItem(NEXT_KEY);
      } catch {
        /* ignore */
      }
      nav(res.stage === 'completed' ? next || '/dash' : getRouteForStage(res.stage), { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Could not verify that code.');
      setCode('');
      setBusy(false);
    }
  };

  const onCode = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    setError(null);
    if (digits.length === 6) void submit(digits);
  };

  if (linkError) {
    return (
      <AuthSplitLayout>
        <div style={{ width: '100%' }}>
          <h1 style={authTitle}>Link not valid</h1>
          <p style={authSub}>{linkError}</p>
          <Link to="/signin" style={{ ...authButton(false), display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', boxSizing: 'border-box' }}>
            Back to sign in
          </Link>
        </div>
      </AuthSplitLayout>
    );
  }

  return (
    <AuthSplitLayout>
      <div data-screen-label="Enter code" style={{ width: '100%' }}>
        <h1 style={authTitle}>Enter your code</h1>
        <p style={authSub}>
          {email ? <>Type the 6-digit code we emailed to <strong style={{ color: '#101828' }}>{email}</strong>.</> : 'Checking your link…'}
        </p>
        {error && <div role="alert" style={authError}>{error}</div>}
        <form onSubmit={(e) => submit(code, e)} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <label htmlFor="code" className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
            6-digit code
          </label>
          <input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            disabled={!email || busy}
            value={code}
            onChange={(e) => onCode(e.target.value)}
            placeholder="••••••"
            style={{ ...authInput, height: 56, fontSize: 26, letterSpacing: '0.5em', textAlign: 'center', fontFamily: 'ui-monospace, Menlo, monospace' }}
          />
          <button type="submit" disabled={!email || busy || code.length < 6} style={authButton(busy)}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p style={{ margin: '22px 0 0', fontSize: 13, color: '#667085' }}>
          Code not working? <Link to="/signin" style={{ color: '#344054', fontWeight: 600 }}>Request a new one</Link>
        </p>
      </div>
    </AuthSplitLayout>
  );
};

export default VerifyLink;
