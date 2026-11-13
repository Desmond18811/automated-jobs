import type { FC } from 'react';

const BULLETS = [
  'Matches keywords recruiters filter for',
  'Writes a short cover letter when asked',
  'Every version saved so you can review it',
];

export const CvTailor: FC = () => (
  <div
    data-screen-label="CV Tailor"
    style={{
      position: 'absolute',
      inset: 0,
      padding: '130px 80px 80px',
      boxSizing: 'border-box',
      display: 'grid',
      gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.1fr)',
      gap: 56,
      alignItems: 'center',
    }}
  >
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 11.5,
          fontWeight: 500,
          color: '#4b5cf0',
        }}
      >
        CV Tailor
        <span
          style={{
            fontSize: 7,
            fontWeight: 600,
            background: '#eef0ff',
            border: '1px solid #c9cffd',
            borderRadius: 4,
            padding: '2px 4px',
          }}
        >
          NEW
        </span>
      </div>
      <h2
        style={{
          margin: 0,
          fontSize: 36,
          lineHeight: '42px',
          fontWeight: 700,
          letterSpacing: '-1.2px',
        }}
      >
        A CV rewritten for every role
      </h2>
      <p style={{ margin: 0, fontSize: 13, lineHeight: '20px', color: '#55555c', textWrap: 'pretty' }}>
        Javi reads each job description and reorders, rephrases and highlights what you already have
        — it never invents experience.
      </p>
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
        {BULLETS.map((b) => (
          <div key={b} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#4b5cf0',
              }}
            />
            {b}
          </div>
        ))}
      </div>
    </div>

    <div
      style={{
        border: '1px solid #ececef',
        borderRadius: 16,
        padding: 20,
        background: 'rgba(250,250,251,.9)',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        boxShadow: '0 12px 32px rgba(40,60,140,.07)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Product Designer · Stripe</span>
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
          }}
        >
          92% match
        </div>
      </div>
      <div
        style={{
          background: '#fff',
          border: '1px solid #ececef',
          borderRadius: 10,
          padding: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 600, color: '#8a8a92', letterSpacing: '.4px' }}>
          BEFORE
        </span>
        <span style={{ fontSize: 12, lineHeight: '18px', color: '#6a6a72' }}>
          Designed screens for the company's mobile app and worked with engineers.
        </span>
      </div>
      <div
        style={{
          background: '#fff',
          border: '1px solid #c9cffd',
          borderRadius: 10,
          padding: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 600, color: '#4b5cf0', letterSpacing: '.4px' }}>
          TAILORED
        </span>
        <span style={{ fontSize: 12, lineHeight: '18px', color: '#0b0b0c' }}>
          Led end-to-end design of payment flows for a mobile app, partnering with engineering to
          ship 3 releases per quarter.
        </span>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {['payments', 'end-to-end', 'cross-functional'].map((t) => (
          <span
            key={t}
            style={{
              fontSize: 10.5,
              color: '#3a3a40',
              background: '#fff',
              border: '1px solid #ececef',
              borderRadius: 6,
              padding: '3px 8px',
            }}
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  </div>
);
