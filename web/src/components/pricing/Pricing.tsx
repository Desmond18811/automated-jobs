import type { FC } from 'react';
import { Link } from 'react-router-dom';

export const Pricing: FC = () => (
  <div
    data-screen-label="Pricing"
    style={{
      position: 'absolute',
      inset: 0,
      padding: '130px 120px 80px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
    }}
  >
    <div style={{ fontSize: 11.5, fontWeight: 500, color: '#4b5cf0' }}>Pricing</div>
    <h2
      style={{
        margin: '10px 0 0',
        fontSize: 36,
        lineHeight: '42px',
        fontWeight: 700,
        letterSpacing: '-1.2px',
      }}
    >
      Pay for applications, not seats
    </h2>
    <p style={{ margin: '12px 0 0', fontSize: 13, lineHeight: '20px', color: '#55555c' }}>
      Cancel anytime. Pause when you land the job.
    </p>

    <div
      style={{
        marginTop: 40,
        display: 'grid',
        gridTemplateColumns: 'repeat(3,minmax(0,1fr))',
        gap: 14,
        width: '100%',
        textAlign: 'left',
      }}
    >
      {/* Free */}
      <div
        style={{
          background: 'rgba(255,255,255,.85)',
          border: '1px solid #ececef',
          borderRadius: 16,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          boxShadow: '0 8px 24px rgba(40,60,140,.05)',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600 }}>Free</span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-1px' }}>$0</span>
          <span style={{ fontSize: 12, color: '#8a8a92' }}>/month</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, color: '#55555c' }}>
          <span>10 applications a month</span>
          <span>1 job board</span>
          <span>Email summary</span>
        </div>
        <Link
          to="/waitlist"
          style={{
            marginTop: 'auto',
            fontSize: 11.5,
            fontWeight: 500,
            color: '#3a3a40',
            background: '#fff',
            border: '1px solid #e6e6ea',
            borderRadius: 9,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          Start free
        </Link>
      </div>

      {/* Pro */}
      <div
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
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Pro</span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              background: '#2a2a30',
              borderRadius: 999,
              padding: '3px 8px',
            }}
          >
            Most popular
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-1px' }}>$19</span>
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
          style={{
            marginTop: 'auto',
            fontSize: 11.5,
            fontWeight: 500,
            color: '#0b0b0c',
            background: '#fff',
            borderRadius: 9,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          Join waitlist
        </Link>
      </div>

      {/* Max */}
      <div
        style={{
          background: 'rgba(255,255,255,.85)',
          border: '1px solid #ececef',
          borderRadius: 16,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          boxShadow: '0 8px 24px rgba(40,60,140,.05)',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600 }}>Max</span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-1px' }}>$49</span>
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
          style={{
            marginTop: 'auto',
            fontSize: 11.5,
            fontWeight: 500,
            color: '#3a3a40',
            background: '#fff',
            border: '1px solid #e6e6ea',
            borderRadius: 9,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          Join waitlist
        </Link>
      </div>
    </div>
  </div>
);
