import { useState, type FC, type ChangeEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { GoogleLogo, JaviGlyph, LinkedInLogo } from '@/assets/logos';
import { CheckIcon } from '@/assets/icons';
import { useUserProfile } from '@/context/ProfileContext';

export const SignUp: FC = () => {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const initialEmail = searchParams.get('email') || '';
  const { updateProfile } = useUserProfile();

  const [firstName, setFirstName] = useState('Ada');
  const [lastName, setLastName] = useState('Okafor');
  const [email, setEmail] = useState(initialEmail || 'ada.okafor@example.com');
  const [password, setPassword] = useState('••••••••••••');

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    updateProfile({
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`.trim(),
      email,
    });
    nav('/setup');
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
        {/* Left gradient side */}
        <div
          style={{
            position: 'relative',
            padding: 36,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: 'linear-gradient(120deg,#3d6ef5 0%,#2b8fe0 50%,#14b8a6 100%)',
            color: '#fff',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'radial-gradient(rgba(255,255,255,.35) 1px,transparent 1.2px)',
              backgroundSize: '16px 16px',
              opacity: 0.5,
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: '-.3px',
            }}
          >
            <JaviGlyph size={18} color="#fff" />
            Javi
          </div>

          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div
              style={{
                background: 'rgba(255,255,255,.14)',
                border: '1px solid rgba(255,255,255,.22)',
                borderRadius: 14,
                padding: 16,
                backdropFilter: 'blur(8px)',
              }}
            >
              <div style={{ fontSize: 11, opacity: 0.85, marginBottom: 4 }}>Early Access Spot Verified</div>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.5px' }}>
                Join Batch 04 Today
              </div>
              <div style={{ fontSize: 11.5, opacity: 0.85, marginTop: 4 }}>
                Instant ATS parsing · Workday, Greenhouse &amp; Lever integration
              </div>
            </div>

            <p style={{ margin: 0, fontSize: 13, lineHeight: '20px', opacity: 0.9 }}>
              "Configure your comprehensive profile once. Javi monitors open roles, customizes your application materials, and applies while you rest."
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 12,
                }}
              >
                <CheckIcon size={16} color="#fff" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', fontSize: 11 }}>
                <span style={{ fontWeight: 600 }}>Zero repetitive forms</span>
                <span style={{ opacity: 0.75 }}>Full platform support</span>
              </div>
            </div>
          </div>

          <div
            style={{
              position: 'relative',
              fontSize: 11,
              opacity: 0.7,
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>End-to-End Encryption</span>
            <span>Step 1 of 2: Create Account</span>
          </div>
        </div>

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
              <input
                type="password"
                required
                value={password}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                placeholder="Choose a password"
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

            <button
              type="submit"
              style={{
                height: 42,
                background: '#0b0b0c',
                color: '#fff',
                borderRadius: 8,
                border: 0,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                marginTop: 6,
                boxShadow: '0 4px 14px rgba(0,0,0,.12)',
                fontFamily: 'Montserrat, sans-serif',
              }}
            >
              Continue to Extensive Profile Setup →
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
