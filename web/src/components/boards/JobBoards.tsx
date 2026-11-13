import type { FC } from 'react';
import { BOARDS } from '@/lib/constants';

export const JobBoards: FC = () => (
  <div
    data-screen-label="Job boards"
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
    <div style={{ fontSize: 11.5, fontWeight: 500, color: '#4b5cf0' }}>Job boards</div>
    <h2
      style={{
        margin: '10px 0 0',
        fontSize: 36,
        lineHeight: '42px',
        fontWeight: 700,
        letterSpacing: '-1.2px',
      }}
    >
      Where Javi applies
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
      Job boards and the applicant tracking systems companies use behind them.
    </p>

    <div
      style={{
        marginTop: 40,
        display: 'grid',
        gridTemplateColumns: 'repeat(4,minmax(0,1fr))',
        gap: 12,
        width: '100%',
        textAlign: 'left',
      }}
    >
      {BOARDS.map((b) => (
        <div
          key={b.name}
          style={{
            background: 'rgba(255,255,255,.85)',
            border: '1px solid #ececef',
            borderRadius: 12,
            padding: 16,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 6px 18px rgba(40,60,140,.04)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>{b.name}</span>
            <span style={{ fontSize: 11, color: '#8a8a92' }}>{b.kind}</span>
          </div>
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              color: '#3a3a40',
              background: '#f4f4f6',
              borderRadius: 999,
              padding: '3px 8px',
            }}
          >
            {b.status}
          </span>
        </div>
      ))}
    </div>
  </div>
);
