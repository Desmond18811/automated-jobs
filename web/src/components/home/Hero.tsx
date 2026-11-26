import { useState, useEffect, type FC, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { tokenStorage } from '@/api';
import { ensureSession } from '@/lib/session';
import {
  CalendarLogo,
  FiverrLogo,
  GlassdoorLogo,
  GmailLogo,
  IndeedLogo,
  NotionLogo,
  UpworkLogo,
} from '@/assets/logos';
import { useIsMobile } from '@/hooks/useStageScale';

interface ChipItem {
  name: string;
  left: number;
  top: number;
  content: ReactNode;
}

const CHIPS: ChipItem[] = [
  {
    name: 'Slack',
    left: 243,
    top: 125,
    content: (
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: 5,
          background: '#4a154b',
          color: '#fff',
          font: '700 14px Montserrat, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        #
      </div>
    ),
  },
  {
    name: 'LinkedIn',
    left: 131,
    top: 265,
    content: (
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: 4,
          background: '#0a66c2',
          color: '#fff',
          font: '700 13px Montserrat, sans-serif',
          letterSpacing: '-.5px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        in
      </div>
    ),
  },
  {
    name: 'Indeed',
    left: 286,
    top: 348,
    content: <IndeedLogo size={22} />,
  },
  {
    name: 'Glassdoor',
    left: 81,
    top: 420,
    content: <GlassdoorLogo size={22} />,
  },
  {
    name: 'Gmail',
    left: 297,
    top: 526,
    content: <GmailLogo size={22} />,
  },
  {
    name: 'Upwork',
    left: 895,
    top: 125,
    content: <UpworkLogo size={22} />,
  },
  {
    name: 'Workday',
    left: 1007,
    top: 265,
    content: (
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: 5,
          background: '#0b0b0c',
          color: '#fff',
          font: '700 11px Montserrat, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        W
      </div>
    ),
  },
  {
    name: 'Fiverr',
    left: 853,
    top: 348,
    content: <FiverrLogo size={22} />,
  },
  {
    name: 'Google Calendar',
    left: 1060,
    top: 420,
    content: <CalendarLogo size={22} />,
  },
  {
    name: 'Notion',
    left: 930,
    top: 533,
    content: <NotionLogo size={22} />,
  },
];

export const Hero: FC = () => {
  const isMobile = useIsMobile();
  const [isSignedIn, setIsSignedIn] = useState(() => tokenStorage.hasToken());
  useEffect(() => {
    void ensureSession().then((ok) => setIsSignedIn(ok));
  }, []);

  if (isMobile) {
    return (
      <div
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '36px 18px 16px',
          boxSizing: 'border-box',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle background glow */}
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 320,
            height: 200,
            background:
              'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(70,125,255,.22), rgba(30,200,190,.12) 60%, rgba(255,255,255,0) 80%)',
            filter: 'blur(20px)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        {/* Live Early Access Pill Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            fontSize: 11,
            fontWeight: 600,
            color: '#3a3a40',
            background: '#f6f6f8',
            border: '1px solid #ececef',
            borderRadius: 999,
            padding: '5px 12px 5px 8px',
            animation: 'jj-hero-fade-down 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.08s backwards',
            zIndex: 1,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#2fc26b',
              boxShadow: '0 0 0 3px rgba(47,194,107,.18)',
              animation: 'jj-pulse-dot 2.2s infinite ease-in-out',
            }}
          />
          Early access · Virtual Job Intern
        </div>

        {/* Responsive Mobile Headline */}
        <h1
          style={{
            margin: '16px 0 0',
            fontSize: 29,
            lineHeight: '35px',
            fontWeight: 800,
            letterSpacing: '-1.2px',
            animation: 'jj-hero-fade-up 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.18s backwards',
            zIndex: 1,
          }}
        >
          Apply to hundreds of jobs
          <br />
          <span
            style={{
              background: 'linear-gradient(135deg, #0b0b0c 20%, #4355ec 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            while you sleep
          </span>
        </h1>

        {/* Subtitle / Paragraph */}
        <p
          style={{
            margin: '12px 0 0',
            fontSize: 13,
            lineHeight: '19px',
            color: '#55555c',
            maxWidth: 340,
            textWrap: 'pretty',
            animation: 'jj-hero-fade-up 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.3s backwards',
            zIndex: 1,
          }}
        >
          Upload your CV once. Javi tailors every application from your profile, submits across top
          job boards, and notifies you when it's done.
        </p>

        {/* CTA Buttons */}
        <div
          style={{
            display: 'flex',
            gap: 10,
            marginTop: 22,
            width: '100%',
            maxWidth: 340,
            justifyContent: 'center',
            animation: 'jj-hero-fade-up 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.44s backwards',
            zIndex: 1,
          }}
        >
          <Link
            to={isSignedIn ? "/dash" : "/signin"}
            className="jj-btn-primary"
            style={{
              flex: 1,
              fontSize: 12,
              fontWeight: 600,
              color: '#fff',
              background: isSignedIn ? '#2563EB' : '#0b0b0c',
              borderRadius: 10,
              padding: '0 12px',
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isSignedIn ? '0 4px 12px rgba(37,99,235,.25)' : '0 4px 12px rgba(0,0,0,.18)',
            }}
          >
            {isSignedIn ? 'Go to Dashboard →' : 'Upload your CV'}
          </Link>
          <Link
            to="/how"
            className="jj-btn-secondary"
            style={{
              flex: 1,
              fontSize: 12,
              fontWeight: 600,
              color: '#3a3a40',
              background: '#fff',
              border: '1px solid #e6e6ea',
              borderRadius: 10,
              padding: '0 12px',
              height: 38,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            See how it works
          </Link>
        </div>

        {/* Mobile Platform Chips Strip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            flexWrap: 'wrap',
            marginTop: 26,
            maxWidth: 340,
            zIndex: 1,
          }}
        >
          {CHIPS.slice(0, 7).map((c, idx) => (
            <div
              key={c.name}
              className="jj-hero-chip"
              title={c.name}
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: '#fff',
                boxShadow: '0 4px 12px rgba(20,20,40,.07), 0 0 0 1px #f0f0f3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: `jj-chip-pop 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${0.1 * idx}s backwards`,
              }}
            >
              {c.content}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Desktop Hero
  return (
    <>
      {/* Orbit rings */}
      <svg
        width={3586}
        height={3180}
        viewBox="0 0 3586 3180"
        style={{
          position: 'absolute',
          left: -1200,
          top: -1200,
          pointerEvents: 'none',
          animation: 'jj-fade-in 1.4s ease-out backwards',
        }}
        fill="none"
      >
        <g stroke="#ececef" strokeWidth={1}>
          {[290, 364, 438, 508, 588, 668, 756, 852, 956].map((r) => (
            <circle key={r} cx={1793} cy={1515} r={r} />
          ))}
        </g>
      </svg>

      {/* Bottom gradient fade */}
      <div
        style={{
          position: 'absolute',
          left: -1200,
          right: -1200,
          top: 520,
          bottom: -1200,
          background: 'linear-gradient(to bottom, rgba(255,255,255,0), #fff 22%)',
          pointerEvents: 'none',
        }}
      />

      {/* Floating app icon chips on orbits */}
      {CHIPS.map((c, i) => {
        const floatAnim = `jj-float-${i % 3}`;
        const floatDur = `${3.8 + (i % 4) * 0.7}s`;
        const floatDelay = `${i * -0.5}s`;
        const popDelay = `${0.08 * i}s`;

        return (
          <div
            key={c.name}
            title={c.name}
            style={{
              position: 'absolute',
              left: c.left,
              top: c.top,
              width: 48,
              height: 48,
              animation: `jj-chip-pop 0.85s cubic-bezier(0.16, 1, 0.3, 1) ${popDelay} backwards`,
              zIndex: 4,
            }}
          >
            <div
              className="jj-hero-chip"
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: '#fff',
                boxShadow: '0 6px 16px rgba(20,20,40,.08), 0 0 0 1px #f0f0f3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: `${floatAnim} ${floatDur} ease-in-out infinite alternate ${floatDelay}`,
              }}
            >
              {c.content}
            </div>
          </div>
        );
      })}

      {/* Center headline, lead, and CTA buttons */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 146,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          zIndex: 5,
        }}
      >
        {/* Pill Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            fontSize: 11.5,
            fontWeight: 500,
            color: '#3a3a40',
            background: '#f6f6f8',
            border: '1px solid #ececef',
            borderRadius: 999,
            padding: '5px 11px 5px 7px',
            animation: 'jj-hero-fade-down 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.08s backwards',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#2fc26b',
              boxShadow: '0 0 0 3px rgba(47,194,107,.18)',
              animation: 'jj-pulse-dot 2.2s infinite ease-in-out',
            }}
          />
          Job Automation Virtual Intern · Early access
        </div>

        {/* Main Headline */}
        <h1
          style={{
            margin: '18px 0 0',
            fontSize: 43,
            lineHeight: '49px',
            fontWeight: 700,
            letterSpacing: '-1.6px',
            animation: 'jj-hero-fade-up 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.2s backwards',
          }}
        >
          Apply to hundreds of jobs
          <br />
          <span
            style={{
              background: 'linear-gradient(135deg, #0b0b0c 30%, #4355ec 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            while you sleep
          </span>
        </h1>

        {/* Subtitle / Paragraph */}
        <p
          style={{
            margin: '13px 0 0',
            fontSize: 13,
            lineHeight: '20px',
            color: '#55555c',
            maxWidth: 380,
            textWrap: 'pretty',
            animation: 'jj-hero-fade-up 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.34s backwards',
          }}
        >
          Upload your CV once. Javi tailors every application from your profile, submits across top
          job boards, and notifies you when it's done.
        </p>

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            marginTop: 24,
            animation: 'jj-hero-fade-up 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.48s backwards',
          }}
        >
          <Link
            to={isSignedIn ? "/dash" : "/signin"}
            className="jj-btn-primary"
            style={{
              fontSize: 11.5,
              fontWeight: 600,
              color: '#fff',
              background: isSignedIn ? '#2563EB' : '#0b0b0c',
              borderRadius: 9,
              padding: '0 18px',
              height: 35,
              display: 'flex',
              alignItems: 'center',
              boxShadow: isSignedIn ? '0 4px 12px rgba(37,99,235,.25)' : '0 4px 10px rgba(0,0,0,.15)',
            }}
          >
            {isSignedIn ? 'Go to Dashboard →' : 'Upload your CV'}
          </Link>
          <Link
            to="/how"
            className="jj-btn-secondary"
            style={{
              fontSize: 11.5,
              fontWeight: 500,
              color: '#3a3a40',
              background: '#fff',
              border: '1px solid #e6e6ea',
              borderRadius: 9,
              padding: '0 15px',
              height: 31,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            See how it works
          </Link>
        </div>
      </div>

      {/* Center radial glow under notification cards */}
      <div
        style={{
          position: 'absolute',
          left: 393,
          top: 395,
          width: 400,
          height: 250,
          background:
            'radial-gradient(ellipse 45% 55% at 36% 50%,rgba(70,125,255,.38),rgba(70,125,255,0) 70%),radial-gradient(ellipse 45% 55% at 64% 50%,rgba(30,200,190,.32),rgba(30,200,190,0) 70%)',
          filter: 'blur(6px)',
          pointerEvents: 'none',
          animation: 'jj-glow-pulse 6s ease-in-out infinite',
        }}
      />
    </>
  );
};
