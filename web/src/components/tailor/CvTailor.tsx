import type { FC } from 'react';
import { useIsMobile } from '@/hooks/useStageScale';

const BULLETS = [
  'Matches keywords recruiters filter for',
  'Writes a short cover letter when asked',
  'Every version saved so you can review it',
];

export const CvTailor: FC = () => {
  const isMobile = useIsMobile();

  return (
    <div
      data-screen-label="CV Tailor"
      className="jj-page-fade"
      style={{
        position: isMobile ? 'relative' : 'absolute',
        inset: isMobile ? undefined : 0,
        width: '100%',
        padding: isMobile ? '28px 18px 48px' : '130px 80px 80px',
        boxSizing: 'border-box',
        display: isMobile ? 'flex' : 'grid',
        flexDirection: isMobile ? 'column' : undefined,
        gridTemplateColumns: isMobile ? undefined : 'minmax(0,1fr) minmax(0,1.1fr)',
        gap: isMobile ? 32 : 56,
        alignItems: isMobile ? 'stretch' : 'center',
      }}
    >
      {/* Left Column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Section Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 11.5,
            fontWeight: 600,
            color: '#4b5cf0',
            letterSpacing: '.2px',
            animation: 'jj-hero-fade-down 0.75s cubic-bezier(0.16, 1, 0.3, 1) 0.05s backwards',
          }}
        >
          CV Tailor
          <span
            style={{
              fontSize: 7,
              fontWeight: 700,
              background: '#eef0ff',
              border: '1px solid #c9cffd',
              borderRadius: 4,
              padding: '2px 5px',
              color: '#4b5cf0',
              letterSpacing: '.4px',
            }}
          >
            NEW
          </span>
        </div>

        {/* Headline */}
        <h2
          style={{
            margin: 0,
            fontSize: isMobile ? 27 : 36,
            lineHeight: isMobile ? '33px' : '42px',
            fontWeight: 700,
            letterSpacing: '-1.2px',
            animation: 'jj-hero-fade-up 0.85s cubic-bezier(0.16, 1, 0.3, 1) 0.14s backwards',
          }}
        >
          A CV rewritten for every role
        </h2>

        {/* Subtitle */}
        <p
          style={{
            margin: 0,
            fontSize: 13,
            lineHeight: '20px',
            color: '#55555c',
            textWrap: 'pretty',
            animation: 'jj-hero-fade-up 0.85s cubic-bezier(0.16, 1, 0.3, 1) 0.25s backwards',
          }}
        >
          Javi reads each job description and reorders, rephrases and highlights what you already have
          — it never invents experience.
        </p>

        {/* Bullets */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            marginTop: 10,
            fontSize: 12.5,
            color: '#3a3a40',
          }}
        >
          {BULLETS.map((b, i) => (
            <div
              key={b}
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'center',
                animation: `jj-hero-fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${0.36 + i * 0.1}s backwards`,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#4b5cf0',
                  flexShrink: 0,
                }}
              />
              {b}
            </div>
          ))}
        </div>
      </div>

      {/* Right Column - Tailored Showcase Card */}
      <div
        className="jj-animated-card"
        style={{
          border: '1px solid #ececef',
          borderRadius: 16,
          padding: isMobile ? 18 : 22,
          background: 'rgba(250,250,251,.95)',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          boxShadow: '0 12px 32px rgba(40,60,140,.07)',
          animation: 'jj-card-slow-in 0.95s cubic-bezier(0.16, 1, 0.3, 1) 0.22s backwards',
          cursor: 'default',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            animation: 'jj-hero-fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.36s backwards',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#0b0b0c' }}>Product Designer · Stripe</span>
            <span style={{ fontSize: 11, color: '#8a8a92' }}>Tailored 2 min ago</span>
          </div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#1f8f52',
              background: '#e8f7ee',
              borderRadius: 999,
              padding: '4px 10px',
              boxShadow: '0 0 0 1px rgba(31,143,82,.15)',
            }}
          >
            92% match
          </div>
        </div>

        {/* Before Card */}
        <div
          style={{
            background: '#fff',
            border: '1px solid #ececef',
            borderRadius: 10,
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,.02)',
            animation: 'jj-card-slow-in 0.85s cubic-bezier(0.16, 1, 0.3, 1) 0.48s backwards',
          }}
        >
          <span style={{ fontSize: 10, fontWeight: 600, color: '#8a8a92', letterSpacing: '.4px' }}>
            BEFORE
          </span>
          <span style={{ fontSize: 12, lineHeight: '18px', color: '#6a6a72' }}>
            Designed screens for the company's mobile app and worked with engineers.
          </span>
        </div>

        {/* Tailored Card */}
        <div
          style={{
            background: '#fff',
            border: '1.5px solid #c9cffd',
            borderRadius: 10,
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            boxShadow: '0 4px 16px rgba(75,92,240,.08)',
            animation: 'jj-card-slow-in 0.85s cubic-bezier(0.16, 1, 0.3, 1) 0.62s backwards',
          }}
        >
          <span style={{ fontSize: 10, fontWeight: 700, color: '#4b5cf0', letterSpacing: '.4px' }}>
            TAILORED
          </span>
          <span style={{ fontSize: 12, lineHeight: '18px', color: '#0b0b0c', fontWeight: 500 }}>
            Led end-to-end design of payment flows for a mobile app, partnering with engineering to
            ship 3 releases per quarter.
          </span>
        </div>

        {/* Keywords Chips */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['payments', 'end-to-end', 'cross-functional'].map((t, idx) => (
            <span
              key={t}
              style={{
                fontSize: 10.5,
                fontWeight: 500,
                color: '#3a3a40',
                background: '#fff',
                border: '1px solid #ececef',
                borderRadius: 6,
                padding: '3px 8px',
                animation: `jj-chip-pop 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${0.76 + idx * 0.08}s backwards`,
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
