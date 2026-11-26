import { useState, useEffect, type FC } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { JaviBrandMark } from '@/assets/logos';
import { useIsMobile } from '@/hooks/useStageScale';
import { tokenStorage } from '@/api';
import { ensureSession } from '@/lib/session';

const NAV_LINKS = [
  { to: '/how', label: 'How it works' },
  { to: '/boards', label: 'Job boards' },
  { to: '/tailor', label: 'CV Tailor', badge: 'NEW' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/faq', label: 'FAQ' },
];

export const Navbar: FC = () => {
  const { pathname } = useLocation();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(() => tokenStorage.hasToken());

  // Close mobile drawer on route change & refresh session status
  useEffect(() => {
    setMobileMenuOpen(false);
    void ensureSession().then((ok) => setIsSignedIn(ok));
  }, [pathname]);

  if (isMobile) {
    return (
      <header
        style={{
          position: 'sticky',
          top: 0,
          left: 0,
          right: 0,
          width: '100%',
          height: 56,
          boxSizing: 'border-box',
          padding: '0 16px',
          background: 'rgba(255,255,255,.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid #ededf0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 100,
        }}
      >
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            textDecoration: 'none',
          }}
        >
          <JaviBrandMark />
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isSignedIn ? (
            <Link
              to="/dash"
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#fff',
                background: '#2563EB',
                borderRadius: 8,
                padding: '6px 14px',
                textDecoration: 'none',
              }}
            >
              Dashboard
            </Link>
          ) : (
            <Link
              to="/signin"
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#3a3a40',
                background: '#f4f4f6',
                border: '1px solid #ececef',
                borderRadius: 8,
                padding: '6px 12px',
              }}
            >
              Sign in
            </Link>
          )}

          {/* Hamburger Menu Toggle Button */}
          <button
            type="button"
            aria-label="Toggle navigation menu"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              background: mobileMenuOpen ? '#0b0b0c' : '#f4f4f6',
              color: mobileMenuOpen ? '#fff' : '#0b0b0c',
              border: '1px solid #e6e6ea',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              cursor: 'pointer',
              padding: 0,
              transition: 'all 0.2s ease',
            }}
          >
            {mobileMenuOpen ? (
              <span style={{ fontSize: 18, fontWeight: 700, lineHeight: 1 }}>✕</span>
            ) : (
              <>
                <span style={{ width: 16, height: 2, background: 'currentColor', borderRadius: 2 }} />
                <span style={{ width: 16, height: 2, background: 'currentColor', borderRadius: 2 }} />
                <span style={{ width: 12, height: 2, background: 'currentColor', borderRadius: 2, alignSelf: 'flex-start', marginLeft: 11 }} />
              </>
            )}
          </button>
        </div>

        {/* Mobile Slide-down Drawer */}
        {mobileMenuOpen && (
          <div
            style={{
              position: 'fixed',
              top: 56,
              left: 0,
              right: 0,
              background: 'rgba(255,255,255,0.98)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderBottom: '1px solid #e6e6ea',
              boxShadow: '0 16px 36px rgba(20,20,40,.12)',
              padding: '16px 20px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              zIndex: 99,
              animation: 'jj-hero-fade-down 0.25s ease-out',
            }}
          >
            {NAV_LINKS.map((l) => {
              const isActive = pathname === l.to;
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#4b5cf0' : '#0b0b0c',
                    background: isActive ? '#f0f3ff' : 'transparent',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>{l.label}</span>
                  {l.badge && (
                    <span
                      style={{
                        fontSize: 8,
                        fontWeight: 700,
                        color: '#4b5cf0',
                        background: '#eef0ff',
                        border: '1px solid #c9cffd',
                        borderRadius: 4,
                        padding: '2px 5px',
                        letterSpacing: '.3px',
                      }}
                    >
                      {l.badge}
                    </span>
                  )}
                </Link>
              );
            })}

            <div style={{ height: 1, background: '#f0f0f3', margin: '8px 0' }} />

            <div style={{ display: 'grid', gridTemplateColumns: isSignedIn ? '1fr' : '1fr 1fr', gap: 10, marginTop: 4 }}>
              {isSignedIn ? (
                <Link
                  to="/dash"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    height: 42,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#fff',
                    background: '#2563EB',
                    borderRadius: 10,
                    textDecoration: 'none',
                    boxShadow: '0 4px 12px rgba(37,99,235,.25)',
                  }}
                >
                  Go to Dashboard →
                </Link>
              ) : (
                <>
                  <Link
                    to="/signin"
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      height: 40,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#3a3a40',
                      background: '#f4f4f6',
                      borderRadius: 10,
                      border: '1px solid #ececef',
                    }}
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/signin"
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      height: 40,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#fff',
                      background: '#0b0b0c',
                      borderRadius: 10,
                      boxShadow: '0 4px 12px rgba(0,0,0,.15)',
                    }}
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>
    );
  }

  // Desktop Navbar
  return (
    <nav
      style={{
        position: 'absolute',
        left: 135,
        top: 11,
        width: 915,
        height: 53,
        boxSizing: 'border-box',
        padding: '0 14px 0 16px',
        background: 'rgba(255,255,255,.94)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid #ededf0',
        borderRadius: 16,
        boxShadow: '0 4px 14px rgba(20,20,40,.04)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 20,
        animation: 'jj-hero-fade-down 0.6s cubic-bezier(0.16, 1, 0.3, 1) backwards',
      }}
    >
      <Link
        to="/"
        style={{
          display: 'flex',
          alignItems: 'center',
          textDecoration: 'none',
          transition: 'transform 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.03)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <JaviBrandMark />
      </Link>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 22,
          fontSize: 11.5,
          fontWeight: 500,
          color: '#3a3a40',
          marginLeft: 40,
        }}
      >
        {NAV_LINKS.map((l) => {
          const isActive = pathname === l.to;
          return (
            <Link
              key={l.to}
              to={l.to}
              style={{
                color: isActive ? '#0b0b0c' : '#55555c',
                fontWeight: isActive ? 600 : 500,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '6px 10px',
                borderRadius: 8,
                background: isActive ? '#f4f4f6' : 'transparent',
                transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = '#0b0b0c';
                  e.currentTarget.style.background = '#f8f8fa';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = '#55555c';
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              {l.label}
              {l.badge && (
                <span
                  style={{
                    fontSize: 7,
                    fontWeight: 700,
                    color: '#4b5cf0',
                    background: '#eef0ff',
                    border: '1px solid #c9cffd',
                    borderRadius: 4,
                    padding: '2px 4px',
                    letterSpacing: '.3px',
                  }}
                >
                  {l.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        {isSignedIn ? (
          <Link
            to="/dash"
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#fff',
              background: '#2563EB',
              borderRadius: 8,
              padding: '7px 16px',
              textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(37,99,235,.2)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            Dashboard →
          </Link>
        ) : (
          <>
            <Link
              to="/signin"
              className="jj-btn-secondary"
              style={{
                fontSize: 11.5,
                fontWeight: 500,
                color: '#3a3a40',
                background: '#f4f4f6',
                border: '1px solid #ececef',
                borderRadius: 8,
                padding: '7px 12px',
              }}
            >
              Sign in
            </Link>
            <Link
              to="/signin"
              className="jj-btn-primary"
              style={{
                fontSize: 11.5,
                fontWeight: 500,
                color: '#fff',
                background: '#0b0b0c',
                borderRadius: 8,
                padding: '8px 13px',
                boxShadow: '0 4px 10px rgba(0,0,0,.15)',
              }}
            >
              Get Started
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};
