import { useState, type FC, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { GoogleLogo, LinkedInLogo } from '@/assets/logos';
import { EyeIcon, EyeOffIcon } from '@/assets/icons';
import { AuthSlideshow } from './AuthSlideshow';
import { useUserProfile } from '@/context/ProfileContext';
import { authApi } from '@/api';

export const SignUp: FC = () => {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const initialEmail = searchParams.get('email') || '';
  const { updateProfile } = useUserProfile();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState(initialEmail || 'you@example.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await authApi.register({
        email,
        password,
        name: `${firstName} ${lastName}`.trim(),
      });
      updateProfile({
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`.trim(),
        email,
      });
      nav('/setup');
    } catch (err: any) {
      console.warn('Register attempt:', err);
      setError(err?.message || 'Registration failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      data-screen-label="Sign up"
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
          height: 590,
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
            padding: '32px 38px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 12,
            overflowY: 'auto',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-.6px' }}>
              Create your Javi account
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6a6a72' }}>
              Welcome to the private beta! Next up: extensive profile setup.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button
              type="button"
              onClick={() => handleSubmit()}
              style={{
                height: 38,
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
              Sign up with Google
            </button>
            <button
              type="button"
              onClick={() => handleSubmit()}
              style={{
                height: 38,
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
              Sign up with LinkedIn
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              margin: '2px 0',
              color: '#a0a0aa',
              fontSize: 11,
            }}
          >
            <div style={{ flex: 1, height: 1, background: '#eee' }} />
            <span>or sign up with email</span>
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

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#3a3a40' }}>First name *</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value)}
                  placeholder="Ada"
                  style={{
                    height: 36,
                    border: '1px solid #e6e6ea',
                    borderRadius: 8,
                    padding: '0 10px',
                    fontSize: 12.5,
                    outline: 'none',
                    fontFamily: 'Montserrat, sans-serif',
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#3a3a40' }}>Last name *</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setLastName(e.target.value)}
                  placeholder="Okafor"
                  style={{
                    height: 36,
                    border: '1px solid #e6e6ea',
                    borderRadius: 8,
                    padding: '0 10px',
                    fontSize: 12.5,
                    outline: 'none',
                    fontFamily: 'Montserrat, sans-serif',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#3a3a40' }}>Email address *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                placeholder="you@email.com"
                style={{
                  height: 36,
                  border: '1px solid #e6e6ea',
                  borderRadius: 8,
                  padding: '0 10px',
                  fontSize: 12.5,
                  outline: 'none',
                  fontFamily: 'Montserrat, sans-serif',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#3a3a40' }}>Password *</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  placeholder="Choose a password"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    height: 36,
                    border: '1px solid #e6e6ea',
                    borderRadius: 8,
                    padding: '0 36px 0 10px',
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
                  {showPassword ? <EyeOffIcon size={15} /> : <EyeIcon size={15} />}
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
                marginTop: 6,
                boxShadow: '0 4px 14px rgba(0,0,0,.12)',
                fontFamily: 'Montserrat, sans-serif',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Creating account...' : 'Continue to Extensive Profile Setup →'}
            </button>
          </form>

          <div style={{ textAlign: 'center', fontSize: 11.5, color: '#6a6a72', marginTop: 2 }}>
            Already have an account?{' '}
            <Link to="/signin" style={{ color: '#2f6ef0', fontWeight: 600 }}>
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
