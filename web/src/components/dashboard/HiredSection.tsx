import type { FC } from 'react';
import { AVATAR_DANIEL, AVATAR_MAYA, AVATAR_JAMES } from '@/assets/avatars';

const HIRED = [
  { name: 'Daniel Kim', role: 'Product Manager', from: 'Wipro', to: 'Spotify', av: AVATAR_DANIEL },
  { name: 'Maya Patel', role: 'UX Designer', from: 'Freelance', to: 'Notion', av: AVATAR_MAYA },
  { name: 'James Ortiz', role: 'Frontend Engineer', from: 'Andela', to: 'Vercel', av: AVATAR_JAMES },
];

export const HiredSection: FC = () => (
  <>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 14, fontWeight: 700 }}>Hired with Javi</span>
      <span style={{ fontSize: 11, fontWeight: 500, color: '#8a8a92', cursor: 'pointer' }}>View all</span>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10 }}>
      {HIRED.map((h) => (
        <div
          key={h.name}
          style={{
            background: '#fff',
            borderRadius: 12,
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            boxShadow: '0 1px 3px rgba(0,0,0,.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img
              src={h.av}
              alt=""
              style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>{h.name}</span>
              <span style={{ fontSize: 10.5, color: '#8a8a92' }}>{h.role}</span>
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 11,
            }}
          >
            <span style={{ color: '#55555c' }}>{h.from}</span>
            <span style={{ color: '#9a9aa3' }}>»</span>
            <span style={{ fontWeight: 700, color: '#2f6ef0' }}>{h.to}</span>
          </div>
          <button
            style={{
              height: 28,
              borderRadius: 8,
              background: '#edf3ff',
              color: '#0a66c2',
              fontSize: 11,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 0,
              cursor: 'pointer',
            }}
          >
            Connect on LinkedIn
          </button>
        </div>
      ))}
    </div>
  </>
);
