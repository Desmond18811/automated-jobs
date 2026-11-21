import type { FC } from 'react';
import { BOARDS } from '@/lib/constants';
import { useIsMobile } from '@/hooks/useStageScale';

export const JobBoards: FC = () => {
  const isMobile = useIsMobile();

  return (
    <div
      data-screen-label="Job boards"
      className="jj-page-fade"
      style={{
        position: isMobile ? 'relative' : 'absolute',
        inset: isMobile ? undefined : 0,
        width: '100%',
        padding: isMobile ? '28px 16px 48px' : '130px 80px 80px',
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
        Job boards
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
        Where Javi applies
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
        Job boards and the applicant tracking systems companies use behind them.
      </p>

      {/* Staggered Animated Board Cards */}
      <div
        style={{
          marginTop: isMobile ? 24 : 40,
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))',
          gap: isMobile ? 10 : 12,
          width: '100%',
          maxWidth: isMobile ? 540 : undefined,
          textAlign: 'left',
        }}
      >
        {BOARDS.map((b, idx) => {
          const isLive = b.status === 'Live';
          const isBeta = b.status === 'Beta';
          const badgeBg = isLive ? '#e8f7ee' : isBeta ? '#eef2ff' : '#f4f4f6';
          const badgeColor = isLive ? '#1f8f52' : isBeta ? '#4355ec' : '#6b7280';

          return (
            <div
              key={b.name}
              className="jj-animated-card"
              style={{
                background: 'rgba(255,255,255,.9)',
                border: '1px solid #ececef',
                borderRadius: 12,
                padding: isMobile ? '12px 14px' : 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 6px 18px rgba(40,60,140,.04)',
                animation: `jj-card-slow-in 0.9s cubic-bezier(0.16, 1, 0.3, 1) ${0.12 + idx * 0.055}s backwards`,
                cursor: 'default',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                <span style={{ fontSize: isMobile ? 13 : 13.5, fontWeight: 600, color: '#0b0b0c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {b.name}
                </span>
                <span style={{ fontSize: 10.5, color: '#8a8a92' }}>{b.kind}</span>
              </div>
              <span
                style={{
                  fontSize: 9.5,
                  fontWeight: 600,
                  color: badgeColor,
                  background: badgeBg,
                  borderRadius: 999,
                  padding: '3px 7px',
                  letterSpacing: '.2px',
                  flexShrink: 0,
                  marginLeft: 6,
                }}
              >
                {b.status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
