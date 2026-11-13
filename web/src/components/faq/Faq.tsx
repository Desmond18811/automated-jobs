import { useState, type FC } from 'react';
import { FAQS } from '@/lib/constants';

export const Faq: FC = () => {
  const [open, setOpen] = useState<number>(-1);

  return (
    <div
      data-screen-label="FAQ"
      style={{
        position: 'absolute',
        inset: 0,
        padding: '130px 200px 60px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div style={{ fontSize: 11.5, fontWeight: 500, color: '#4b5cf0' }}>FAQ</div>
      <h2
        style={{
          margin: '10px 0 32px',
          fontSize: 36,
          lineHeight: '42px',
          fontWeight: 700,
          letterSpacing: '-1.2px',
        }}
      >
        Questions, answered
      </h2>
      <div
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(255,255,255,.85)',
          border: '1px solid #ececef',
          borderRadius: 16,
          padding: '0 22px',
          boxSizing: 'border-box',
          boxShadow: '0 8px 24px rgba(40,60,140,.05)',
        }}
      >
        {FAQS.map((f, i) => (
          <div key={f.q} style={{ borderBottom: '1px solid #f0f0f3' }}>
            <div
              onClick={() => setOpen(open === i ? -1 : i)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 0',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {f.q}
              <span style={{ fontSize: 18, color: '#8a8a92', width: 16, textAlign: 'center' }}>
                {open === i ? '–' : '+'}
              </span>
            </div>
            {open === i && (
              <div style={{ padding: '0 40px 16px 0', fontSize: 12.5, lineHeight: '20px', color: '#55555c' }}>
                {f.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
