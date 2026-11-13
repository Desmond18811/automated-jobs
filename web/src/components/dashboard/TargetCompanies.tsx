import type { FC } from 'react';

const TARGETS = [
  { name: 'Stripe', detail: '8 roles matched · 5 applied', progress: 62 },
  { name: 'Shopify', detail: '20 roles matched · 12 applied', progress: 60 },
  { name: 'Google', detail: '2 roles matched · 2 applied', progress: 100 },
];

export const TargetCompanies: FC = () => (
  <>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 14, fontWeight: 700 }}>Target companies</span>
      <span style={{ fontSize: 11, fontWeight: 500, color: '#8a8a92', cursor: 'pointer' }}>Edit plan</span>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10 }}>
      {TARGETS.map((c) => (
        <div
          key={c.name}
          style={{
            background: '#fff',
            borderRadius: 12,
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            alignItems: 'center',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,.03)',
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: '#f4f5f8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 700,
              color: '#3a3a40',
            }}
          >
            {c.name[0]}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700 }}>{c.name}</span>
            <span style={{ fontSize: 10.5, color: '#8a8a92' }}>{c.detail}</span>
          </div>
          <div style={{ width: '100%', height: 4, borderRadius: 4, background: '#eef0f4' }}>
            <div
              style={{
                width: `${c.progress}%`,
                height: 4,
                borderRadius: 4,
                background: 'linear-gradient(90deg,#3d6ef5,#14b8a6)',
              }}
            />
          </div>
          <button
            style={{
              width: '100%',
              height: 28,
              borderRadius: 8,
              background: '#edf3ff',
              color: '#2f6ef0',
              fontSize: 11,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 0,
              cursor: 'pointer',
            }}
          >
            View roles
          </button>
        </div>
      ))}
    </div>
  </>
);
