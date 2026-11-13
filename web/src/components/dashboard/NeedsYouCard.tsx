import type { FC } from 'react';

interface NeedsYouCardProps {
  onOpenQueue: () => void;
}

export const NeedsYouCard: FC<NeedsYouCardProps> = ({ onOpenQueue }) => {
  const items = [
    {
      initial: 'S',
      color: '#6366f1',
      company: 'Stripe',
      action: 'Form question',
      role: 'Senior Product Designer',
      status: 'Answer needed',
      badgeBg: '#fff7ed',
      badgeColor: '#c2410c',
      badgeBorder: '#fed7aa',
    },
    {
      initial: 'M',
      color: '#f97316',
      company: 'Monzo',
      action: 'Send failed',
      role: 'Design Systems Lead',
      status: 'Retry or dismiss',
      badgeBg: '#fef2f2',
      badgeColor: '#b91c1c',
      badgeBorder: '#fecaca',
    },
    {
      initial: 'F',
      color: '#0ea5e9',
      company: 'Figma',
      action: 'Apply yourself',
      role: 'Product Designer, Editor',
      status: 'Manual',
      badgeBg: '#eff6ff',
      badgeColor: '#1d4ed8',
      badgeBorder: '#bfdbfe',
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
        gap: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,.03)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#0b0b0c' }}>Needs you</span>
          <span style={{ fontSize: 11, color: '#8a8a92' }}>Javi paused these sends until you step in.</span>
        </div>
        <button
          type="button"
          onClick={onOpenQueue}
          style={{
            fontSize: 11.5,
            fontWeight: 600,
            color: '#2f6ef0',
            background: 'transparent',
            border: 0,
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: 6,
          }}
        >
          Open queue ›
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item, idx) => (
          <div
            key={idx}
            onClick={onOpenQueue}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              borderRadius: 10,
              background: '#fafbfd',
              border: '1px solid #f0f1f5',
              cursor: 'pointer',
              transition: 'background 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: item.color,
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: 'none',
                }}
              >
                {item.initial}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#111' }}>
                  {item.company} · <span style={{ color: '#555' }}>{item.action}</span>
                </span>
                <span style={{ fontSize: 10.5, color: '#8a8a92' }}>{item.role}</span>
              </div>
            </div>

            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: item.badgeColor,
                background: item.badgeBg,
                border: `1px solid ${item.badgeBorder}`,
                borderRadius: 999,
                padding: '3px 9px',
                whiteSpace: 'nowrap',
              }}
            >
              {item.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
