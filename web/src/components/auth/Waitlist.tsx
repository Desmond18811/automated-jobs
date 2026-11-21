import { useState, type FC, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AVATAR_ADA, AVATAR_USER_2, AVATAR_USER_3 } from '@/assets/avatars';
import { CheckIcon, MailIcon } from '@/assets/icons';
import { useIsMobile } from '@/hooks/useStageScale';

export const Waitlist: FC = () => {
  const nav = useNavigate();
  const isMobile = useIsMobile();
  const [email, setEmail] = useState('');
  const [joined, setJoined] = useState(false);
  const [secureLink, setSecureLink] = useState('');

  const join = () => {
    if (/\S+@\S+\.\S+/.test(email)) {
      const token = 'javi_sec_' + Math.random().toString(36).substring(2) + Date.now().toString(36) + '9a8b7c6d5e4f3a2b1c8f9e0d';
      const link = `/setup?token=${token}&email=${encodeURIComponent(email)}&auth=verified&source=batch04_invite`;
      setSecureLink(link);
      setJoined(true);
    }
  };

  const handleOpenInvite = () => {
    nav(secureLink || `/setup?email=${encodeURIComponent(email || 'amaka.okafor@example.com')}`);
  };

  return (
    <div
      data-screen-label="Waitlist"
      className="jj-page-fade"
      style={{
        position: isMobile ? 'relative' : 'absolute',
        inset: isMobile ? undefined : 0,
        width: '100%',
        padding: isMobile ? '28px 16px 48px' : '40px 20px 30px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: isMobile ? 'flex-start' : 'center',
        textAlign: 'center',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          fontSize: 11.5,
          fontWeight: 600,
          color: '#3a3a40',
          background: 'rgba(255,255,255,.9)',
          border: '1px solid #ececef',
          borderRadius: 999,
          padding: '5px 12px 5px 8px',
          animation: 'jj-hero-fade-down 0.75s cubic-bezier(0.16, 1, 0.3, 1) 0.05s backwards',
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: '#2fc26b',
            boxShadow: '0 0 0 3px rgba(47,194,107,.18)',
            animation: 'jj-pulse-dot 2.2s infinite ease-in-out',
          }}
        />
        Early access · Batch 04 opening now
      </div>
      <h2
        style={{
          margin: '14px 0 0',
          fontSize: isMobile ? 27 : 36,
          lineHeight: isMobile ? '33px' : '42px',
          fontWeight: 800,
          letterSpacing: '-1.2px',
          animation: 'jj-hero-fade-up 0.85s cubic-bezier(0.16, 1, 0.3, 1) 0.12s backwards',
        }}
      >
        Get Javi before
        <br />
        everyone else
      </h2>
      <p
        style={{
          margin: '10px 0 22px',
          fontSize: 13,
          lineHeight: '20px',
          color: '#55555c',
          maxWidth: 420,
          animation: 'jj-hero-fade-up 0.85s cubic-bezier(0.16, 1, 0.3, 1) 0.22s backwards',
        }}
      >
        We're letting candidates in batch by batch. Enter your email to receive an instant invitation link.
      </p>

      <div
        className="jj-animated-card"
        style={{
          width: '100%',
          maxWidth: 480,
          background: 'rgba(255,255,255,.95)',
          border: '1px solid #ececef',
          borderRadius: 20,
          padding: isMobile ? '20px 18px' : 24,
          boxSizing: 'border-box',
          boxShadow: '0 20px 50px rgba(40,80,160,.12)',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          textAlign: 'left',
          animation: 'jj-card-slow-in 0.95s cubic-bezier(0.16, 1, 0.3, 1) 0.28s backwards',
        }}
      >
        {!joined ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: '#3a3a40' }}>Work or personal email</div>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 8 }}>
              <input
                value={email}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') join();
                }}
                placeholder="amaka.okafor@example.com"
                style={{
                  flex: 1,
                  height: 42,
                  border: '1px solid #dcdce2',
                  borderRadius: 10,
                  padding: '0 14px',
                  fontSize: 13,
                  outline: 'none',
                  fontFamily: 'Montserrat, sans-serif',
                }}
              />
              <button
                type="button"
                onClick={join}
                style={{
                  height: 42,
                  padding: '0 20px',
                  borderRadius: 10,
                  background: '#0b0b0c',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 6px 16px rgba(0,0,0,.15)',
                  border: 0,
                  cursor: 'pointer',
                  fontFamily: 'Montserrat, sans-serif',
                }}
              >
                Join waitlist
              </button>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['Instant invite email', 'No credit card required', '40+ job platforms'].map((t) => (
                <span
                  key={t}
                  style={{
                    fontSize: 10,
                    fontWeight: 500,
                    color: '#3a3a40',
                    background: '#f4f4f6',
                    borderRadius: 999,
                    padding: '3px 9px',
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: '50%',
                  background: 'linear-gradient(150deg,#3d6ef5,#14b8a6)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: 'none',
                }}
              >
                <CheckIcon size={20} color="#fff" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>You're invited</span>
                <span style={{ fontSize: 12, color: '#6a6a72' }}>
                  An early access invitation has been dispatched to <strong>{email || 'your email'}</strong>.
                </span>
              </div>
            </div>

            {/* Simulated Inbox Email Card */}
            <div
              style={{
                border: '1.5px solid #c8d5fb',
                background: '#f8faff',
                borderRadius: 14,
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                boxShadow: '0 6px 18px rgba(61,110,245,.08)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <MailIcon size={15} color="#2f6ef0" />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#2f6ef0', letterSpacing: '.4px', textTransform: 'uppercase' }}>
                    Incoming Email Preview
                  </span>
                </div>
                <span style={{ fontSize: 10.5, color: '#888' }}>Just now</span>
              </div>

              <div style={{ borderTop: '1px solid #e2e8fc', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontSize: 12, color: '#444' }}>
                  <strong>From:</strong> Javi Team &lt;team@javi.ai&gt;
                </div>
                <div style={{ fontSize: 12, color: '#444' }}>
                  <strong>Subject:</strong> Your early access invitation to Javi is ready
                </div>
                <p style={{ margin: '8px 0 0', fontSize: 12, lineHeight: '18px', color: '#555' }}>
                  Hello! Your spot in Javi Batch 04 is confirmed. Use your unique, secure onboarding link below to configure your comprehensive profile and activate your automated applying dashboard.
                </p>
                <div
                  style={{
                    background: '#eef3fe',
                    border: '1px solid #d4e2fd',
                    borderRadius: 8,
                    padding: '8px 10px',
                    fontFamily: 'monospace',
                    fontSize: 10,
                    color: '#1e40af',
                    wordBreak: 'break-all',
                    userSelect: 'all',
                    marginTop: 6,
                  }}
                >
                  {typeof window !== 'undefined' ? `${window.location.origin}${secureLink}` : secureLink}
                </div>
              </div>

              <button
                type="button"
                onClick={handleOpenInvite}
                style={{
                  height: 42,
                  background: 'linear-gradient(135deg,#3d6ef5 0%,#14b8a6 100%)',
                  color: '#fff',
                  border: 0,
                  borderRadius: 10,
                  fontSize: 12.5,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(47,110,240,.25)',
                  fontFamily: 'Montserrat, sans-serif',
                }}
              >
                Open Secure Profile Setup Link →
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 4 }}>
          <div style={{ display: 'flex', marginLeft: 8 }}>
            {[AVATAR_ADA, AVATAR_USER_2, AVATAR_USER_3].map((src, i) => (
              <img
                key={i}
                src={src}
                alt=""
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid #fff',
                  marginLeft: -8,
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: 11, color: '#6a6a72' }}>
            <strong>1,420+</strong> candidates in line · average response in 4 hrs
          </span>
        </div>
      </div>
    </div>
  );
};
