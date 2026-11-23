import { useEffect, useRef, useState, type FC, type FormEvent, type KeyboardEvent, type ClipboardEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthSplitLayout } from './AuthSplitLayout';
import { authError, authButton, authSub, authTitle, NEXT_KEY } from './authStyles';
import { authApi, getRouteForStage } from '@/api';
import { safeNext } from '@/lib/session';

const CODE_LENGTH = 6;

/** The page the emailed link opens. Second factor: type or paste the 6-digit code from the same email. */
export const VerifyLink: FC = () => {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') || '';

  const [email, setEmail] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(token ? null : 'This sign-in link is incomplete. Request a new one.');
  const [digits, setDigits] = useState<string[]>(() => Array(CODE_LENGTH).fill(''));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!token) return;
    authApi.openLink(token).then(
      (r) => {
        setEmail(r.email);
        setTimeout(() => inputRefs.current[0]?.focus(), 50);
      },
      (err) => setLinkError(err?.message || 'This sign-in link is no longer valid. Request a new one.'),
    );
  }, [token]);

  const code = digits.join('');

  const submit = async (codeToSubmit = code, e?: FormEvent) => {
    e?.preventDefault();
    const clean = codeToSubmit.replace(/\D/g, '');
    if (busy || clean.length < CODE_LENGTH) return;
    setBusy(true);
    setError(null);
    try {
      const res = await authApi.verify(token, clean);
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
      setDigits(Array(CODE_LENGTH).fill(''));
      setBusy(false);
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    }
  };

  const handleChange = (index: number, val: string) => {
    setError(null);
    const cleaned = val.replace(/\D/g, '');
    if (!cleaned) {
      const next = [...digits];
      next[index] = '';
      setDigits(next);
      return;
    }

    // Single digit input
    const char = cleaned.slice(-1);
    const next = [...digits];
    next[index] = char;
    setDigits(next);

    // Auto-advance to next box
    if (index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    const full = next.join('');
    if (full.length === CODE_LENGTH) {
      void submit(full);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        e.preventDefault();
        const next = [...digits];
        next[index - 1] = '';
        setDigits(next);
        inputRefs.current[index - 1]?.focus();
      } else if (digits[index]) {
        e.preventDefault();
        const next = [...digits];
        next[index] = '';
        setDigits(next);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
    if (!paste) return;

    const next = [...digits];
    for (let i = 0; i < CODE_LENGTH; i++) {
      next[i] = paste[i] || '';
    }
    setDigits(next);

    const targetIdx = Math.min(paste.length, CODE_LENGTH - 1);
    inputRefs.current[targetIdx]?.focus();

    if (paste.length === CODE_LENGTH) {
      void submit(paste);
    }
  };

  if (linkError) {
    return (
      <AuthSplitLayout>
        <div style={{ width: '100%' }}>
          <button
            type="button"
            onClick={() => nav('/signin')}
            aria-label="Back to sign in"
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
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span>Back to sign in</span>
          </button>
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
        <button
          type="button"
          onClick={() => nav('/signin')}
          aria-label="Back to sign in"
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

        <h1 style={authTitle}>Enter your code</h1>
        <p style={authSub}>
          {email ? <>Type the 6-digit code we emailed to <strong style={{ color: '#101828' }}>{email}</strong>.</> : 'Checking your link…'}
        </p>

        {error && <div role="alert" style={authError}>{error}</div>}

        <form onSubmit={(e) => submit(code, e)} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* 6 rectangular verification boxes */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              maxWidth: 380,
              margin: '8px 0',
            }}
          >
            {digits.map((digit, idx) => {
              const isFocused = focusedIndex === idx;
              const isFilled = Boolean(digit);
              return (
                <input
                  key={idx}
                  ref={(el) => { inputRefs.current[idx] = el; }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete={idx === 0 ? 'one-time-code' : 'off'}
                  disabled={!email || busy}
                  value={digit}
                  maxLength={1}
                  onChange={(e) => handleChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  onPaste={handlePaste}
                  onFocus={() => setFocusedIndex(idx)}
                  onBlur={() => setFocusedIndex((curr) => (curr === idx ? null : curr))}
                  style={{
                    flex: '1 1 0',
                    minWidth: 0,
                    height: 58,
                    textAlign: 'center',
                    fontSize: 24,
                    fontWeight: 700,
                    fontFamily: "Montserrat, ui-monospace, Menlo, monospace",
                    color: '#101828',
                    backgroundColor: !email ? '#f8fafc' : isFocused ? '#ffffff' : isFilled ? '#f8fafc' : '#ffffff',
                    border: isFocused
                      ? '2px solid #2563eb'
                      : error
                      ? '2px solid #f04438'
                      : isFilled
                      ? '1.5px solid #344054'
                      : '1.5px solid #d0d5dd',
                    borderRadius: 10,
                    boxShadow: isFocused
                      ? '0 0 0 4px rgba(37,99,235,0.12)'
                      : error
                      ? '0 0 0 4px rgba(240,68,56,0.12)'
                      : '0 1px 2px rgba(16,24,40,0.05)',
                    outline: 'none',
                    transition: 'all 0.15s ease',
                    boxSizing: 'border-box',
                    cursor: !email || busy ? 'not-allowed' : 'text',
                  }}
                  aria-label={`Digit ${idx + 1} of 6`}
                />
              );
            })}
          </div>

          <button type="submit" disabled={!email || busy || code.length < CODE_LENGTH} style={authButton(busy)}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p style={{ margin: '22px 0 0', fontSize: 13, color: '#667085' }}>
          Code not working? <Link to="/signin" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>Request a new one</Link>
        </p>
      </div>
    </AuthSplitLayout>
  );
};

export default VerifyLink;
