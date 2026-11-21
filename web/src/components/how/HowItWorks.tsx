import type { FC } from 'react';
import { Link } from 'react-router-dom';
import { useIsMobile } from '@/hooks/useStageScale';

const STEPS = [
  {
    n: 1,
    title: 'Upload your CV',
    body: 'Javi reads your experience, skills and links, then builds a reusable profile.',
    highlight: 'Instant parsing',
  },
  {
    n: 2,
    title: 'Set your targets',
    body: 'Roles, locations, remote preference, salary floor and companies to skip.',
    highlight: 'Smart filtering',
  },
  {
    n: 3,
    title: 'Javi applies',
    body: 'Each application is tailored, screening questions answered, and submitted.',
    highlight: 'Tailored CVs',
  },
  {
    n: 4,
    title: 'Get notified',
    body: 'A summary by email or Slack, plus an alert the moment a recruiter replies.',
    highlight: 'Real-time alerts',
  },
];

export const HowItWorks: FC = () => {
  const isMobile = useIsMobile();

  return (
    <div
      data-screen-label="How it works"
      className="jj-page-fade"
      style={{
        position: isMobile ? 'relative' : 'absolute',
        inset: isMobile ? undefined : 0,
        width: '100%',
        padding: isMobile ? '28px 18px 48px' : '130px 80px 80px',
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
        How it works
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
        From one CV to fifty applications
      </h2>

      {/* Section Subtitle */}
      <p
        style={{
          margin: '12px 0 0',
          fontSize: 13,
          lineHeight: '20px',
          color: '#55555c',
          maxWidth: 420,
          textWrap: 'pretty',
          animation: 'jj-hero-fade-up 0.85s cubic-bezier(0.16, 1, 0.3, 1) 0.22s backwards',
        }}
      >
        Set it up once. Javi handles the repetitive part of the job search and tells you when someone
        replies.
      </p>

      {/* Staggered Animated Step Cards */}
      <div
        style={{
          marginTop: isMobile ? 28 : 44,
          display: isMobile ? 'flex' : 'grid',
          flexDirection: isMobile ? 'column' : undefined,
          gridTemplateColumns: isMobile ? undefined : 'repeat(4,minmax(0,1fr))',
          gap: 14,
          width: '100%',
          maxWidth: isMobile ? 480 : undefined,
          textAlign: 'left',
        }}
      >
        {STEPS.map((s, idx) => (
          <div
            key={s.n}
            className="jj-animated-card"
            style={{
              background: 'rgba(255,255,255,.9)',
              border: '1px solid #ececef',
              borderRadius: 14,
              padding: isMobile ? '18px 20px' : 22,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              boxShadow: '0 8px 24px rgba(40,60,140,.05)',
              animation: `jj-card-slow-in 0.95s cubic-bezier(0.16, 1, 0.3, 1) ${0.18 + idx * 0.16}s backwards`,
              cursor: 'default',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 8,
                  background: '#0b0b0c',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {s.n}
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: '#4b5cf0',
                  background: '#eef0ff',
                  borderRadius: 999,
                  padding: '2px 8px',
                }}
              >
                {s.highlight}
              </span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4, color: '#0b0b0c' }}>
              {s.title}
            </div>
            <div style={{ fontSize: 12, lineHeight: '18px', color: '#6a6a72' }}>
              {s.body}
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          marginTop: isMobile ? 28 : 40,
          width: isMobile ? '100%' : undefined,
          maxWidth: isMobile ? 360 : undefined,
          justifyContent: 'center',
          animation: 'jj-hero-fade-up 0.85s cubic-bezier(0.16, 1, 0.3, 1) 0.82s backwards',
        }}
      >
        <Link
          to="/waitlist"
          className="jj-btn-primary"
          style={{
            flex: isMobile ? 1 : undefined,
            fontSize: 11.5,
            fontWeight: 500,
            color: '#fff',
            background: '#0b0b0c',
            borderRadius: 9,
            padding: '0 16px',
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(0,0,0,.15)',
          }}
        >
          Upload your CV
        </Link>
        <Link
          to="/boards"
          className="jj-btn-secondary"
          style={{
            flex: isMobile ? 1 : undefined,
            fontSize: 11.5,
            fontWeight: 500,
            color: '#3a3a40',
            background: '#fff',
            border: '1px solid #e6e6ea',
            borderRadius: 9,
            padding: '0 16px',
            height: 34,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          Supported boards
        </Link>
      </div>
    </div>
  );
};
