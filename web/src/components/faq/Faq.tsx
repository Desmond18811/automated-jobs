import { useState, type FC } from 'react';
import { FAQS } from '@/lib/constants';
import { useIsMobile } from '@/hooks/useStageScale';

export const Faq: FC = () => {
  const [open, setOpen] = useState<number>(-1);
  const isMobile = useIsMobile();

  return (
    <div
      data-screen-label="FAQ"
      className="jj-page-fade"
      style={{
        position: isMobile ? 'relative' : 'absolute',
        inset: isMobile ? undefined : 0,
        width: '100%',
        padding: isMobile ? '28px 16px 48px' : '130px 200px 60px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
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
        FAQ
      </div>

      {/* Section Headline */}
      <h2
        style={{
          margin: isMobile ? '10px 0 20px' : '10px 0 32px',
          fontSize: isMobile ? 27 : 36,
          lineHeight: isMobile ? '33px' : '42px',
          fontWeight: 700,
          letterSpacing: '-1.2px',
          textAlign: 'center',
          animation: 'jj-hero-fade-up 0.85s cubic-bezier(0.16, 1, 0.3, 1) 0.12s backwards',
        }}
      >
        Questions, answered
      </h2>

      {/* FAQ Card Container */}
      <div
        className="jj-animated-card"
        style={{
          width: '100%',
          maxWidth: isMobile ? 540 : undefined,
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(255,255,255,.9)',
          border: '1px solid #ececef',
          borderRadius: 16,
          padding: isMobile ? '2px 16px' : '4px 24px',
          boxSizing: 'border-box',
          boxShadow: '0 8px 24px rgba(40,60,140,.05)',
          animation: 'jj-card-slow-in 0.95s cubic-bezier(0.16, 1, 0.3, 1) 0.22s backwards',
          cursor: 'default',
        }}
      >
        {FAQS.map((f, i) => (
          <div
            key={f.q}
            style={{
              borderBottom: i === FAQS.length - 1 ? 'none' : '1px solid #f0f0f3',
              animation: `jj-hero-fade-up 0.75s cubic-bezier(0.16, 1, 0.3, 1) ${0.3 + i * 0.06}s backwards`,
            }}
          >
            <div
              onClick={() => setOpen(open === i ? -1 : i)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 0',
                cursor: 'pointer',
                fontSize: isMobile ? 13 : 14,
                fontWeight: 500,
                color: open === i ? '#4b5cf0' : '#0b0b0c',
                transition: 'color 0.2s ease',
                gap: 12,
              }}
            >
              <span>{f.q}</span>
              <span
                style={{
                  fontSize: 18,
                  color: open === i ? '#4b5cf0' : '#8a8a92',
                  width: 22,
                  height: 22,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  background: open === i ? '#eef0ff' : 'transparent',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                }}
              >
                {open === i ? '−' : '+'}
              </span>
            </div>
            {open === i && (
              <div
                style={{
                  padding: '0 20px 16px 0',
                  fontSize: 12.5,
                  lineHeight: '20px',
                  color: '#55555c',
                  animation: 'jj-hero-fade-down 0.3s ease-out',
                }}
              >
                {f.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
