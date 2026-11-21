import type { FC } from 'react';
import {
  GlassdoorLogo,
  IndeedLogo,
  LinkedInLogo,
  UpworkLogo,
} from '@/assets/logos';
import { useIsMobile } from '@/hooks/useStageScale';

interface BoardLogoItem {
  name: string;
  icon?: React.ReactNode;
  style: React.CSSProperties;
}

const CAROUSEL_BOARDS: BoardLogoItem[] = [
  {
    name: 'LinkedIn',
    icon: <LinkedInLogo size={16} />,
    style: { font: '700 16px Montserrat, sans-serif', letterSpacing: '-.5px' },
  },
  {
    name: 'indeed',
    icon: <IndeedLogo size={17} />,
    style: { font: 'italic 700 17px Poppins, sans-serif', letterSpacing: '-.5px' },
  },
  {
    name: 'glassdoor',
    icon: <GlassdoorLogo size={17} />,
    style: { font: '600 15px Poppins, sans-serif', letterSpacing: '-.3px' },
  },
  {
    name: 'ZipRecruiter',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ display: 'block' }}>
        <path d="M12 2L4 9h3v13h10V9h3L12 2z" fill="#00bf63" />
      </svg>
    ),
    style: { font: '800 14px Nunito, sans-serif' },
  },
  {
    name: 'Wellfound',
    icon: <span style={{ fontSize: 13, fontWeight: 800, color: '#ff3366', lineHeight: 1 }}>✌</span>,
    style: { font: '700 15px Montserrat, sans-serif', letterSpacing: '-.3px' },
  },
  {
    name: 'workday.',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ display: 'block' }}>
        <path d="M4 15a8 8 0 0 1 16 0" stroke="#f68b1f" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="12" cy="15" r="2.5" fill="#f68b1f" />
      </svg>
    ),
    style: { font: '600 16px Poppins, sans-serif', letterSpacing: '-.4px' },
  },
  {
    name: 'greenhouse',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ display: 'block' }}>
        <circle cx="12" cy="12" r="7" fill="#00835c" />
        <circle cx="12" cy="12" r="3" fill="#fff" />
      </svg>
    ),
    style: { font: '500 16px Poppins, sans-serif', letterSpacing: '-.4px' },
  },
  {
    name: 'Lever',
    icon: <span style={{ fontSize: 11, fontWeight: 800, color: '#2b5bf5', lineHeight: 1 }}>◆</span>,
    style: { font: '700 16px Montserrat, sans-serif', letterSpacing: '-.4px' },
  },
  {
    name: 'MONSTER',
    icon: <span style={{ fontSize: 13, fontWeight: 900, color: '#6e44ff', lineHeight: 1 }}>M</span>,
    style: { font: '800 14.5px Nunito, sans-serif', letterSpacing: '.5px' },
  },
  {
    name: 'upwork',
    icon: <UpworkLogo size={17} />,
    style: { font: '700 17px Poppins, sans-serif', letterSpacing: '-.4px' },
  },
  {
    name: 'Ashby',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ display: 'block' }}>
        <circle cx="12" cy="12" r="8" stroke="#111" strokeWidth="2.5" />
      </svg>
    ),
    style: { font: '600 15px Montserrat, sans-serif', letterSpacing: '-.3px' },
  },
  {
    name: 'Dice',
    icon: <span style={{ fontSize: 13, fontWeight: 700, color: '#e53e3e', lineHeight: 1 }}>⚄</span>,
    style: { font: '800 14.5px Nunito, sans-serif', letterSpacing: '.4px' },
  },
];

// Duplicate items twice to ensure endless continuous seamless sliding
const MARQUEE_ITEMS = [...CAROUSEL_BOARDS, ...CAROUSEL_BOARDS];

export const BoardLogos: FC = () => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginTop: 28,
          marginBottom: 16,
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            fontSize: 11,
            fontWeight: 500,
            color: '#8e8e98',
            letterSpacing: '.1px',
            padding: '0 16px',
            animation: 'jj-hero-fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.55s backwards',
          }}
        >
          Applies for you across 40+ job boards and hiring platforms
        </div>

        <div
          className="jj-marquee-container"
          style={{
            width: '100%',
            height: 48,
            marginTop: 8,
            display: 'flex',
            alignItems: 'center',
            animation: 'jj-hero-fade-up 0.85s cubic-bezier(0.16, 1, 0.3, 1) 0.68s backwards',
          }}
        >
          <div className="jj-marquee-track">
            {MARQUEE_ITEMS.map((b, idx) => (
              <div
                key={`${b.name}-${idx}`}
                className="jj-marquee-item"
                title={`Applies via ${b.name}`}
              >
                {b.icon && (
                  <span style={{ display: 'flex', alignItems: 'center', opacity: 0.85 }}>
                    {b.icon}
                  </span>
                )}
                <span style={b.style}>{b.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Desktop BoardLogos
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 668,
          textAlign: 'center',
          fontSize: 11.5,
          fontWeight: 500,
          color: '#8e8e98',
          letterSpacing: '.1px',
          animation: 'jj-hero-fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.55s backwards',
        }}
      >
        Applies for you across 40+ job boards and hiring platforms
      </div>

      {/* Continuous sliding carousel track */}
      <div
        className="jj-marquee-container"
        style={{
          position: 'absolute',
          left: 20,
          right: 20,
          top: 698,
          height: 48,
          display: 'flex',
          alignItems: 'center',
          animation: 'jj-hero-fade-up 0.85s cubic-bezier(0.16, 1, 0.3, 1) 0.68s backwards',
        }}
      >
        <div className="jj-marquee-track">
          {MARQUEE_ITEMS.map((b, idx) => (
            <div
              key={`${b.name}-${idx}`}
              className="jj-marquee-item"
              title={`Applies via ${b.name}`}
            >
              {b.icon && (
                <span style={{ display: 'flex', alignItems: 'center', opacity: 0.85 }}>
                  {b.icon}
                </span>
              )}
              <span style={b.style}>{b.name}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};
