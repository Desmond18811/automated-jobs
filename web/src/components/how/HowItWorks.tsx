import type { FC } from 'react';
import { Link } from 'react-router-dom';

const STEPS = [
  {
    n: 1,
    title: 'Upload your CV',
    body: 'Javi reads your experience, skills and links, then builds a reusable profile.',
  },
  {
    n: 2,
    title: 'Set your targets',
    body: 'Roles, locations, remote preference, salary floor and companies to skip.',
  },
  {
    n: 3,
    title: 'Javi applies',
    body: 'Each application is tailored, screening questions answered, and submitted.',
  },
  {
    n: 4,
    title: 'Get notified',
    body: 'A summary by email or Slack, plus an alert the moment a recruiter replies.',
  },
];

export const HowItWorks: FC = () => (
  <div
    data-screen-label="How it works"
    style={{
      position: 'absolute',
      inset: 0,
      padding: '130px 80px 80px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
    }}
  >
    <div style={{ fontSize: 11.5, fontWeight: 500, color: '#4b5cf0' }}>How it works</div>
    <h2
      style={{
        margin: '10px 0 0',
        fontSize: 36,
        lineHeight: '42px',
        fontWeight: 700,
        letterSpacing: '-1.2px',
      }}
    >
      From one CV to fifty applications
    </h2>
    <p
      style={{
        margin: '12px 0 0',
        fontSize: 13,
        lineHeight: '20px',
        color: '#55555c',
        maxWidth: 420,
        textWrap: 'pretty',
      }}
    >
      Set it up once. Javi handles the repetitive part of the job search and tells you when someone
      replies.
    </p>

    <div
      style={{
        marginTop: 44,
        display: 'grid',
        gridTemplateColumns: 'repeat(4,minmax(0,1fr))',
        gap: 14,
        width: '100%',
        textAlign: 'left',
      }}
    >
      {STEPS.map((s) => (
        <div
          key={s.n}
          style={{
            background: 'rgba(255,255,255,.85)',
            border: '1px solid #ececef',
            borderRadius: 14,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            boxShadow: '0 8px 24px rgba(40,60,140,.05)',
          }}
        >
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
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 6 }}>{s.title}</div>
          <div style={{ fontSize: 12, lineHeight: '18px', color: '#6a6a72' }}>{s.body}</div>
        </div>
      ))}
    </div>

    <div style={{ display: 'flex', gap: 12, marginTop: 40 }}>
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
        }}
      >
        Upload your CV
      </Link>
      <Link
        to="/boards"
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
        See supported boards
      </Link>
    </div>
  </div>
);
