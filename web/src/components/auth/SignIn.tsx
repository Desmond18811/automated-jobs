import type { FC } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogo, JaviGlyph, LinkedInLogo } from '@/assets/logos';

export const SignIn: FC = () => {
  const nav = useNavigate();

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
              <div style={{ fontSize: 11, opacity: 0.85, marginBottom: 4 }}>Last 24 hours</div>
              <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-.5px' }}>
                14 applications sent
              </div>
              <div style={{ fontSize: 11.5, opacity: 0.85, marginTop: 4 }}>
                3 recruiter views · 1 interview request
              </div>
            </div>

            <p style={{ margin: 0, fontSize: 13, lineHeight: '20px', opacity: 0.9 }}>
              "Javi tailored my CV for every single role. I woke up with 3 interview invites in my
              first week."
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
                AO
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', fontSize: 11 }}>
                <span style={{ fontWeight: 600 }}>Ada Okafor</span>
                <span style={{ opacity: 0.75 }}>Product Designer · Lagos</span>
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
            <span>Batch 04 Early Access</span>
            <span>40+ Job Boards Supported</span>
          </div>
        </div>

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
              onClick={() => nav('/dash')}
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
              onClick={() => nav('/dash')}
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#3a3a40' }}>Work or personal email</label>
            <input
              type="email"
              defaultValue="ada.okafor@example.com"
              placeholder="you@email.com"
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
            <input
              type="password"
              defaultValue="••••••••••••"
              placeholder="••••••••"
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

          <button
            type="button"
            onClick={() => nav('/dash')}
            style={{
              height: 42,
              background: '#0b0b0c',
              color: '#fff',
              borderRadius: 8,
              border: 0,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              marginTop: 4,
              boxShadow: '0 4px 14px rgba(0,0,0,.12)',
              fontFamily: 'Montserrat, sans-serif',
            }}
          >
            Sign in to Javi
          </button>

          <div style={{ textAlign: 'center', fontSize: 11.5, color: '#6a6a72', marginTop: 4 }}>
            Don't have an account?{' '}
            <Link to="/waitlist" style={{ color: '#2f6ef0', fontWeight: 600 }}>
              Join waitlist
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
