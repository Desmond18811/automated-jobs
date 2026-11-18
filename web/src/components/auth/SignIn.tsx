import { useState, type FC, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogo, LinkedInLogo } from '@/assets/logos';
import { EyeIcon, EyeOffIcon } from '@/assets/icons';
import { AuthSlideshow } from './AuthSlideshow';
import { authApi } from '@/api';

export const SignIn: FC = () => {
  const nav = useNavigate();
  const [email, setEmail] = useState('you@example.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await authApi.login({ email, password: password || 'password123' });
      nav('/dash');
    } catch (err: any) {
      console.warn('Login attempt:', err);
      // If server returned an error message, show it
      setError(err?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = () => {
    if ((window as any).Clerk?.openSignIn) {
      (window as any).Clerk.openSignIn({ redirectUrl: '/dash' });
    } else {
      handleSubmit();
    }
  };

  return (
    <div
      data-screen-label="Sign in"
      style={{
        position: 'absolute',
        inset: 0,
        padding: '96px 150px 40px',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 960,
          height: 560,
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)',
          background: 'rgba(255,255,255,.95)',
          border: '1px solid #ececef',
          borderRadius: 22,
          overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(40,80,160,.12)',
        }}
      >
        {/* Left gradient side with interactive candidate stories slideshow */}
        <AuthSlideshow />

        {/* Right form side */}
        <div
          style={{
            padding: 38,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 14,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-.6px' }}>
            Welcome back
          </h2>
          <p style={{ margin: '0 0 8px', fontSize: 12.5, color: '#6a6a72' }}>
            Sign in to see what Javi applied to.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button
              type="button"
              onClick={handleGoogleAuth}
              style={{
                height: 40,
                border: '1px solid #e6e6ea',
                borderRadius: 9,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontSize: 12,
                fontWeight: 600,
                color: '#3a3a40',
                background: '#fff',
                cursor: 'pointer',
                fontFamily: 'Montserrat, sans-serif',
              }}
            >
              <GoogleLogo size={18} />
              Google
            </button>
            <button
              type="button"
              onClick={handleGoogleAuth}
              style={{
                height: 40,
                border: '1px solid #e6e6ea',
                borderRadius: 9,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontSize: 12,
                fontWeight: 600,
                color: '#3a3a40',
                background: '#fff',
                cursor: 'pointer',
                fontFamily: 'Montserrat, sans-serif',
              }}
            >
              <LinkedInLogo size={18} />
              LinkedIn
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              margin: '6px 0',
              color: '#a0a0aa',
              fontSize: 11,
            }}
          >
            <div style={{ flex: 1, height: 1, background: '#eee' }} />
            <span>or continue with email</span>
            <div style={{ flex: 1, height: 1, background: '#eee' }} />
          </div>

          {error && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 11.5,
                lineHeight: '16px',
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#3a3a40' }}>Work or personal email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  height: 38,
                  border: '1px solid #e6e6ea',
                  borderRadius: 8,
                  padding: '0 12px',
                  fontSize: 12.5,
                  outline: 'none',
                  fontFamily: 'Montserrat, sans-serif',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#3a3a40' }}>Password</label>
                <a href="#" style={{ fontSize: 11, color: '#2f6ef0' }}>
                  Forgot?
                </a>
              </div>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    height: 38,
                    border: '1px solid #e6e6ea',
                    borderRadius: 8,
                    padding: '0 38px 0 12px',
                    fontSize: 12.5,
                    outline: 'none',
                    fontFamily: 'Montserrat, sans-serif',
                  }}
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((prev) => !prev)}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: showPassword ? '#2f6ef0' : '#8e8e93',
                  }}
                >
                  {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                height: 42,
                background: '#0b0b0c',
                color: '#fff',
                borderRadius: 8,
                border: 0,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: loading ? 'wait' : 'pointer',
                marginTop: 4,
                boxShadow: '0 4px 14px rgba(0,0,0,.12)',
                fontFamily: 'Montserrat, sans-serif',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Signing in...' : 'Sign in to Javi'}
            </button>
          </form>

          <div
            style={{
              textAlign: 'center',
              fontSize: 11.5,
              color: '#6a6a72',
              marginTop: 4,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>Don't have an account?</span>
            <Link to="/signup" style={{ color: '#2f6ef0', fontWeight: 600 }}>
              Sign up
            </Link>


          </div>
        </div>
      </div>
    </div>
  );
};
