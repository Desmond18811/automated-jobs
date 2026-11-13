import type { FC, ReactNode } from 'react';
import { ArrowUpRightIcon, RepeatIcon } from '@/assets/icons';

interface Stat {
  label: string;
  value: string;
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
}

const STATS: Stat[] = [
  {
    label: 'CVs tailored',
    value: '312',
    icon: 'CV',
    iconBg: '#edf3ff',
    iconColor: '#2f6ef0',
  },
  {
    label: 'Applications sent',
    value: '1,284',
    icon: <ArrowUpRightIcon size={16} color="#0f9488" />,
    iconBg: '#e7f7f5',
    iconColor: '#0f9488',
  },
  {
    label: 'Replies received',
    value: '47',
    icon: <RepeatIcon size={16} color="#6366f1" />,
    iconBg: '#eef2ff',
    iconColor: '#6366f1',
  },
  {
    label: 'Interviews scheduled',
    value: '9',
    icon: '9',
    iconBg: '#edf3ff',
    iconColor: '#2f6ef0',
  },
];

export const StatCards: FC = () => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
    {STATS.map((s) => (
      <div
        key={s.label}
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,.03)',
          border: '1px solid #f0f0f3',
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: s.iconBg,
            color: s.iconColor,
            fontSize: 13,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 'none',
          }}
        >
          {s.icon}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-.4px' }}>{s.value}</span>
          <span style={{ fontSize: 11, color: '#8a8a92', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {s.label}
          </span>
        </div>
      </div>
    ))}
  </div>
);
