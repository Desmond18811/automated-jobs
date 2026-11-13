import type { FC, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarLogo,
  FiverrLogo,
  GlassdoorLogo,
  GmailLogo,
  IndeedLogo,
  NotionLogo,
  UpworkLogo,
} from '@/assets/logos';

interface ChipItem {
  left: number;
  top: number;
  content: ReactNode;
}

const CHIPS: ChipItem[] = [
  {
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
    left: 286,
    top: 348,
    content: <IndeedLogo size={22} />,
  },
  {
    left: 81,
    top: 420,
    content: <GlassdoorLogo size={22} />,
  },
  {
    left: 297,
    top: 526,
    content: <GmailLogo size={22} />,
  },
  {
    left: 895,
    top: 125,
    content: <UpworkLogo size={22} />,
  },
  {
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
    left: 853,
    top: 348,
    content: <FiverrLogo size={22} />,
  },
  {
    left: 1060,
    top: 420,
    content: <CalendarLogo size={22} />,
  },
  {
    left: 930,
    top: 533,
    content: <NotionLogo size={22} />,
  },
];

export const Hero: FC = () => (
  <>
    {/* Orbit rings */}
    <svg
      width={3586}
      height={3180}
      viewBox="0 0 3586 3180"
      style={{ position: 'absolute', left: -1200, top: -1200, pointerEvents: 'none' }}
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
    {CHIPS.map((c, i) => (
      <div
        key={i}
        style={{
          position: 'absolute',
          left: c.left,
          top: c.top,
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 6px 16px rgba(20,20,40,.08), 0 0 0 1px #f0f0f3',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        {c.content}
      </div>
    ))}

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
      }}
    >
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
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#2fc26b',
            boxShadow: '0 0 0 3px rgba(47,194,107,.18)',
          }}
        />
        Job Automation Virtual Intern · Early access
      </div>
      <h1
        style={{
          margin: '18px 0 0',
          fontSize: 43,
          lineHeight: '49px',
          fontWeight: 700,
          letterSpacing: '-1.6px',
        }}
      >
        Apply to hundreds of jobs
        <br />
        while you sleep
      </h1>
      <p
        style={{
          margin: '13px 0 0',
          fontSize: 13,
          lineHeight: '20px',
          color: '#55555c',
          maxWidth: 380,
          textWrap: 'pretty',
        }}
      >
        Upload your CV once. Javi tailors every application from your profile, submits across top
        job boards, and notifies you when it's done.
      </p>
      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <Link
          to="/waitlist"
          style={{
            fontSize: 11.5,
            fontWeight: 500,
            color: '#fff',
            background: '#0b0b0c',
            borderRadius: 9,
            padding: '0 14px',
            height: 32,
            display: 'flex',
            alignItems: 'center',
            boxShadow: '0 4px 10px rgba(0,0,0,.15)',
          }}
        >
          Upload your CV
        </Link>
        <Link
          to="/how"
          style={{
            fontSize: 11.5,
            fontWeight: 500,
            color: '#3a3a40',
            background: '#fff',
            border: '1px solid #e6e6ea',
            borderRadius: 9,
            padding: '0 14px',
            height: 30,
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
      }}
    />
  </>
);
