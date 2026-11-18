import type { FC } from 'react';
import { Link } from 'react-router-dom';
import { JaviGlyph } from '@/assets/logos';

const NAV_LINKS = [
  { to: '/how', label: 'How it works' },
  { to: '/boards', label: 'Job boards' },
  { to: '/tailor', label: 'CV Tailor', badge: 'NEW' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/faq', label: 'FAQ' },
];

export const Navbar: FC = () => (
  <nav
    style={{
      position: 'absolute',
      left: 135,
      top: 11,
      width: 915,
      height: 53,
      boxSizing: 'border-box',
      padding: '0 13px 0 16px',
      background: 'rgba(255,255,255,.92)',
      border: '1px solid #ededf0',
      borderRadius: 16,
      boxShadow: '0 4px 14px rgba(20,20,40,.04)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      zIndex: 10,
    }}
  >
    <Link
      to="/"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        fontWeight: 600,
        fontSize: 18,
        letterSpacing: '-.4px',
        color: '#0b0b0c',
      }}
    >
      <JaviGlyph size={18} />
      Javi
    </Link>

    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 23,
        fontSize: 11.5,
        fontWeight: 500,
        color: '#3a3a40',
        marginLeft: 60,
      }}
    >
      {NAV_LINKS.map((l) => (
        <Link
          key={l.to}
          to={l.to}
          style={{
            color: '#3a3a40',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          {l.label}
          {l.badge && (
            <span
              style={{
                fontSize: 7,
                fontWeight: 600,
                color: '#4b5cf0',
                background: '#eef0ff',
                border: '1px solid #c9cffd',
                borderRadius: 4,
                padding: '2px 4px',
                letterSpacing: '.2px',
              }}
            >
              {l.badge}
            </span>
          )}
        </Link>
      ))}
    </div>

    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <Link
        to="/signin"
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
        style={{
          fontSize: 11.5,
          fontWeight: 500,
          color: '#fff',
          background: '#0b0b0c',
          borderRadius: 8,
          padding: '8px 12px',
        }}
      >
        Get Started
      </Link>
    </div>
  </nav>
);
