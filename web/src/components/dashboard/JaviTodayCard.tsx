import type { FC } from 'react';

export const JaviTodayCard: FC = () => {
  const stats = [
    { label: 'Scanned', value: 142, max: 150, color: '#3d6ef5' },
    { label: 'Matched', value: 38, max: 150, color: '#14b8a6' },
    { label: 'Drafted', value: 12, max: 150, color: '#3d6ef5' },
    { label: 'Sent', value: 9, max: 150, color: '#14b8a6' },
  ];

  const alerts = [
    {
      dotColor: '#2563eb',
      text: 'Monzo application sent',
      time: '12 min ago',
    },
    {
      dotColor: '#10b981',
      text: 'Stripe reply: interview invite',
      time: '1h ago',
      badge: 'Phase 6',
    },
    {
      dotColor: '#9ca3af',
      text: 'Revolut status set to Closed',
      time: 'Yesterday',
    },
  ];

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 14,
        padding: '16px 18px',
        border: '1px solid #f0f0f3',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        boxShadow: '0 1px 3px rgba(0,0,0,.03)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#0b0b0c' }}>Javi today</span>
        <span style={{ fontSize: 11, color: '#8a8a92' }}>Next scan in 46 min</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 56, fontSize: 11, color: '#6a6a72', flex: 'none' }}>{s.label}</span>
            <div style={{ flex: 1, height: 6, borderRadius: 999, background: '#f0f1f5', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${(s.value / s.max) * 100}%`,
                  height: '100%',
                  borderRadius: 999,
                  background: s.color,
                }}
              />
            </div>
            <span style={{ width: 26, fontSize: 11, fontWeight: 700, color: '#111', textAlign: 'right' }}>
              {s.value}
            </span>
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px solid #f0f0f3', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: '#3a3a40' }}>Alerts</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {alerts.map((a, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: a.dotColor,
                    flex: 'none',
                  }}
                />
                <span style={{ fontSize: 11, color: '#374151', fontWeight: 500 }}>{a.text}</span>
                <span style={{ fontSize: 10.5, color: '#9ca3af' }}>· {a.time}</span>
              </div>
              {a.badge && (
                <span
                  style={{
                    fontSize: 8.5,
                    fontWeight: 600,
                    color: '#6b7280',
                    border: '1px dashed #d1d5db',
                    borderRadius: 999,
                    padding: '1px 6px',
                    background: '#f9fafb',
                  }}
                >
                  {a.badge}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
