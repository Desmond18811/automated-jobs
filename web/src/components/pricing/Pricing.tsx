import type { FC } from 'react';
import { Link } from 'react-router-dom';
import { useIsMobile } from '@/hooks/useStageScale';

export const Pricing: FC = () => {
  const isMobile = useIsMobile();

  return (
    <div
      data-screen-label="Pricing"
      className="jj-page-fade"
      style={{
        position: isMobile ? 'relative' : 'absolute',
        inset: isMobile ? undefined : 0,
        width: '100%',
        padding: isMobile ? '28px 16px 48px' : '130px 120px 80px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
      }}
    >
      {/* Section Badge */}
      <div
        style={{
          fontSize: 11.5,
          fontWeight: 600,
          color: '#4b5cf0',
          letterSpacing: '.2px',
          animation: 'jj-hero-fade-down 0.75s cubic-bezier(0.16, 1, 0.3, 1) 0.05s backwards',
        }}
      >
        Pricing
      </div>

      {/* Section Headline */}
      <h2
        style={{
          margin: '10px 0 0',
          fontSize: isMobile ? 27 : 36,
          lineHeight: isMobile ? '33px' : '42px',
          fontWeight: 700,
          letterSpacing: '-1.2px',
          animation: 'jj-hero-fade-up 0.85s cubic-bezier(0.16, 1, 0.3, 1) 0.12s backwards',
        }}
      >
        Pay for applications, not seats
      </h2>

      {/* Section Subtitle */}
      <p
        style={{
          margin: '12px 0 0',
          fontSize: 13,
          lineHeight: '20px',
          color: '#55555c',
          animation: 'jj-hero-fade-up 0.85s cubic-bezier(0.16, 1, 0.3, 1) 0.22s backwards',
        }}
      >
        Cancel anytime. Pause when you land the job.
      </p>

      {/* Animated Pricing Cards Grid */}
      <div
        style={{
          marginTop: isMobile ? 24 : 40,
          display: isMobile ? 'flex' : 'grid',
          flexDirection: isMobile ? 'column' : undefined,
          gridTemplateColumns: isMobile ? undefined : 'repeat(3,minmax(0,1fr))',
          gap: isMobile ? 16 : 14,
          width: '100%',
          maxWidth: isMobile ? 440 : undefined,
          textAlign: 'left',
        }}
      >
        {/* Free Card */}
        <div
          className="jj-animated-card"
          style={{
            background: 'rgba(255,255,255,.9)',
            border: '1px solid #ececef',
            borderRadius: 16,
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            boxShadow: '0 8px 24px rgba(40,60,140,.05)',
            animation: 'jj-card-slow-in 0.95s cubic-bezier(0.16, 1, 0.3, 1) 0.18s backwards',
            cursor: 'default',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: '#0b0b0c' }}>Pro</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-1px' }}>₦1000</span>
            <span style={{ fontSize: 12, color: '#8a8a92' }}>/month</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, color: '#55555c' }}>
            <span>10 applications a month</span>
            <span>1 job board</span>
            <span>Email summary</span>
          </div>
          <Link
            to="/waitlist"
            className="jj-btn-secondary"
            style={{
              marginTop: 'auto',
              fontSize: 11.5,
              fontWeight: 500,
              color: '#3a3a40',
              background: '#fff',
              border: '1px solid #e6e6ea',
              borderRadius: 9,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            Get Started
          </Link>
        </div>

        {/* Pro Card (Hero / Popular) */}
        <div
          className="jj-animated-card"
          style={{
            border: '1px solid #0b0b0c',
            background: '#0b0b0c',
            color: '#fff',
            borderRadius: 16,
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            boxShadow: '0 16px 36px rgba(40,60,140,.18)',
            animation: 'jj-card-slow-in 0.95s cubic-bezier(0.16, 1, 0.3, 1) 0.34s backwards',
            cursor: 'default',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Max</span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: '#fff',
                background: 'linear-gradient(135deg, #4b5cf0 0%, #2fc26b 100%)',
                borderRadius: 999,
                padding: '3px 9px',
                letterSpacing: '.3px',
              }}
            >
              Most popular
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-1px' }}>₦2000</span>
            <span style={{ fontSize: 12, color: '#a0a0a8' }}>/month</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, color: '#d0d0d6' }}>
            <span>300 applications a month</span>
            <span>All job boards</span>
            <span>CV Tailor on every application</span>
            <span>Email and Slack alerts</span>
          </div>
          <Link
            to="/waitlist"
            className="jj-btn-primary"
            style={{
              marginTop: 'auto',
              fontSize: 11.5,
              fontWeight: 600,
              color: '#0b0b0c',
              background: '#fff',
              borderRadius: 9,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(255,255,255,.2)',
            }}
          >
            Get started
          </Link>
        </div>

        {/* Max Card */}
        <div
          className="jj-animated-card"
          style={{
            background: 'rgba(255,255,255,.9)',
            border: '1px solid #ececef',
            borderRadius: 16,
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            boxShadow: '0 8px 24px rgba(40,60,140,.05)',
            animation: 'jj-card-slow-in 0.95s cubic-bezier(0.16, 1, 0.3, 1) 0.50s backwards',
            cursor: 'default',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: '#0b0b0c' }}>Enterprise</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-1px' }}>₦5000</span>
            <span style={{ fontSize: 12, color: '#8a8a92' }}>/month</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, color: '#55555c' }}>
            <span>Unlimited applications</span>
            <span>Cover letters</span>
            <span>Priority queue</span>
            <span>Review-before-submit mode</span>
          </div>
          <Link
            to="/waitlist"
            className="jj-btn-secondary"
            style={{
              marginTop: 'auto',
              fontSize: 11.5,
              fontWeight: 500,
              color: '#3a3a40',
              background: '#fff',
              border: '1px solid #e6e6ea',
              borderRadius: 9,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            Get started
          </Link>
        </div>
      </div>
    </div>
  );
};
