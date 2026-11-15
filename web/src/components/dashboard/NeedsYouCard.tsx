import { useEffect, useState, type FC } from 'react';
import { CheckIcon } from '@/assets/icons';
import { tasksApi } from '@/api';

interface NeedsYouCardProps {
  onOpenQueue: () => void;
}

export const NeedsYouCard: FC<NeedsYouCardProps> = ({ onOpenQueue }) => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tasksApi
      .list()
      .then((res: any) => {
        const list = Array.isArray(res) ? res : res?.items || res?.tasks || [];
        setTasks(list.filter((t: any) => t.status === 'open'));
      })
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, []);

  const openCount = tasks.length;
  const previewItems = tasks.slice(0, 3);

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0b0b0c' }}>Needs you</span>
            {openCount > 0 && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#fff',
                  background: '#ef4444',
                  borderRadius: 999,
                  padding: '1px 6px',
                }}
              >
                {openCount}
              </span>
            )}
          </div>
          <span style={{ fontSize: 11, color: '#8a8a92' }}>
            {openCount === 0
              ? 'No human action required right now.'
              : `${openCount} send${openCount > 1 ? 's' : ''} paused until you step in.`}
          </span>
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

      {loading ? (
        <div style={{ fontSize: 11.5, color: '#9ca3af', padding: '16px 0', textAlign: 'center' }}>
          Checking tasks...
        </div>
      ) : openCount === 0 ? (
        <div
          onClick={onOpenQueue}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 14px',
            borderRadius: 10,
            background: '#f0fdf4',
            border: '1px solid #dcfce7',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: '#bbf7d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 'none',
            }}
          >
            <CheckIcon size={14} color="#15803d" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#166534' }}>All caught up!</span>
            <span style={{ fontSize: 11, color: '#15803d' }}>
              J.A.V.I has all required answers and is applying autonomously.
            </span>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {previewItems.map((task, idx) => {
            const company = task.payload?.company || 'Company';
            const role = task.payload?.role || 'Job Application';
            const reason = task.reason || 'custom_question';

            let badge = 'Answer needed';
            let badgeBg = '#fff7ed';
            let badgeColor = '#c2410c';
            let badgeBorder = '#fed7aa';

            if (reason === 'captcha') {
              badge = 'CAPTCHA';
              badgeBg = '#fef2f2';
              badgeColor = '#dc2626';
              badgeBorder = '#fecaca';
            } else if (reason === 'login_wall') {
              badge = 'Sign in';
              badgeBg = '#eff6ff';
              badgeColor = '#2563eb';
              badgeBorder = '#bfdbfe';
            }

            return (
              <div
                key={task._id || idx}
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
                      background: '#111827',
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {company.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: '#111' }}>{company}</span>
                      <span style={{ fontSize: 10.5, color: '#8a8a92' }}>· {task.message || 'Action required'}</span>
                    </div>
                    <span style={{ fontSize: 11, color: '#6a6a72' }}>{role}</span>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: badgeColor,
                    background: badgeBg,
                    border: `1px solid ${badgeBorder}`,
                    borderRadius: 999,
                    padding: '2px 8px',
                  }}
                >
                  {badge}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
