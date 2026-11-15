import { useState, useEffect, type FC } from 'react';
import { JaviGlyph } from '@/assets/logos';

export interface TestimonialSlide {
  id: string;
  name: string;
  role: string;
  location: string;
  initials: string;
  avatarBg: string;
  statTime: string;
  statPrimary: string;
  statSecondary: string;
  quote: string;
  badge: string;
  boardInfo: string;
}

const CANDIDATES: TestimonialSlide[] = [
  {
    id: 'ada',
    name: 'Ada Okafor',
    role: 'Product Designer',
    location: 'Lagos',
    initials: 'AO',
    avatarBg: 'rgba(255,255,255,.3)',
    statTime: 'Last 24 hours',
    statPrimary: '14 applications sent',
    statSecondary: '3 recruiter views · 1 interview request',
    quote: '"Javi tailored my CV for every single role. I woke up with 3 interview invites in my first week."',
    badge: 'Batch 04 Early Access',
    boardInfo: '40+ Job Boards Supported',
  },
  {
    id: 'marcus',
    name: 'Marcus Chen',
    role: 'Senior Full-Stack Engineer',
    location: 'London',
    initials: 'MC',
    avatarBg: 'rgba(59,130,246,.35)',
    statTime: 'This week',
    statPrimary: '42 applications sent',
    statSecondary: '9 replies · 4 technical screens scheduled',
    quote: '"The auto-fill handled complex Workday forms and custom screening questions flawlessly while I was asleep."',
    badge: 'Verified Autonomous Apply',
    boardInfo: 'Workday, Greenhouse & Ashby',
  },
  {
    id: 'elena',
    name: 'Elena Rostova',
    role: 'Machine Learning Engineer',
    location: 'Berlin',
    initials: 'ER',
    avatarBg: 'rgba(16,185,129,.35)',
    statTime: 'Past 14 days',
    statPrimary: '28 applications sent',
    statSecondary: '6 replies · 2 offers received',
    quote: '"The fact-checker guarantees Javi never exaggerates or hallucinates skills on my resume."',
    badge: 'Fact-Guarded Documents',
    boardInfo: 'Wellfound & Direct Career Pages',
  },
  {
    id: 'tariq',
    name: 'Tariq Mansour',
    role: 'DevOps & Cloud Architect',
    location: 'Toronto',
    initials: 'TM',
    avatarBg: 'rgba(245,158,11,.35)',
    statTime: 'Last 48 hours',
    statPrimary: '35 applications sent',
    statSecondary: '8 recruiter calls · 3 final rounds',
    quote: '"The \'Needs you\' queue only pinged me for 2 salary questions. Javi completed the other 33 submissions end-to-end."',
    badge: 'Needs You Queue Active',
    boardInfo: 'SmartRecruiters & LinkedIn',
  },
  {
    id: 'sarah',
    name: 'Sarah Jenkins',
    role: 'Growth Product Manager',
    location: 'San Francisco',
    initials: 'SJ',
    avatarBg: 'rgba(236,72,153,.35)',
    statTime: 'Total impact',
    statPrimary: '50 applications sent',
    statSecondary: '12 replies · $165k offer accepted',
    quote: '"From waitlist invite to my first written offer in 18 days. The customized cover letters were indistinguishable from hand-written ones."',
    badge: 'Hired via Javi',
    boardInfo: 'ATS & Automated Email Feeds',
  },
];

export const AuthSlideshow: FC = () => {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % CANDIDATES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [isPaused]);

  const current = CANDIDATES[index];

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      style={{
        position: 'relative',
        padding: 36,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: 'linear-gradient(120deg,#3d6ef5 0%,#2b8fe0 50%,#14b8a6 100%)',
        color: '#fff',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* Radial dot grid overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(rgba(255,255,255,.35) 1px,transparent 1.2px)',
          backgroundSize: '16px 16px',
          opacity: 0.5,
          pointerEvents: 'none',
        }}
      />

      {/* Brand Header */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: '-.3px',
          }}
        >
          <JaviGlyph size={18} color="#fff" />
          Javi
        </div>

        {/* Progress indicator pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {CANDIDATES.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show candidate ${i + 1}`}
              style={{
                width: i === index ? 22 : 6,
                height: 6,
                borderRadius: 999,
                background: i === index ? '#fff' : 'rgba(255,255,255,.35)',
                border: 0,
                padding: 0,
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Slideshow Content Card */}
      <div
        key={current.id}
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          animation: 'jj-fade-in 0.4s ease-out',
        }}
      >
        <div
          style={{
            background: 'rgba(255,255,255,.14)',
            border: '1px solid rgba(255,255,255,.22)',
            borderRadius: 14,
            padding: 16,
            backdropFilter: 'blur(8px)',
            transition: 'transform 0.25s ease',
          }}
        >
          <div style={{ fontSize: 11, opacity: 0.85, marginBottom: 4 }}>{current.statTime}</div>
          <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-.5px' }}>
            {current.statPrimary}
          </div>
          <div style={{ fontSize: 11.5, opacity: 0.85, marginTop: 4 }}>
            {current.statSecondary}
          </div>
        </div>

        <p
          style={{
            margin: 0,
            fontSize: 13,
            lineHeight: '20px',
            opacity: 0.95,
            minHeight: 40,
          }}
        >
          {current.quote}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: current.avatarBg,
              border: '1.5px solid rgba(255,255,255,.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            {current.initials}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', fontSize: 11 }}>
            <span style={{ fontWeight: 600 }}>{current.name}</span>
            <span style={{ opacity: 0.8 }}>
              {current.role} · {current.location}
            </span>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div
        style={{
          position: 'relative',
          fontSize: 11,
          opacity: 0.75,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>{current.badge}</span>
        <span>{current.boardInfo}</span>
      </div>
    </div>
  );
};
