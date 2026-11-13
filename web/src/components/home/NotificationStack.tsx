import type { FC } from 'react';
import { NOTIFICATIONS } from '@/lib/constants';
import { useNotificationCycle } from '@/hooks/useNotificationCycle';

const SLOTS: Record<string, { top: number; sc: number; op: number; z: number; bg: string }> = {
  '0': { top: 427, sc: 1, op: 1, z: 5, bg: '#fff' },
  '1': { top: 483, sc: 0.88, op: 1, z: 4, bg: '#fafafb' },
  '2': { top: 530, sc: 0.75, op: 0.85, z: 3, bg: '#f7f7f9' },
  exit: { top: 392, sc: 1.03, op: 0, z: 6, bg: '#fff' },
  hidden: { top: 560, sc: 0.68, op: 0, z: 1, bg: '#f7f7f9' },
};

const Avatar: FC<{ av: string }> = ({ av }) => {
  if (av === 'javi') {
    return (
      <div style={{ position: 'relative', width: 32, height: 32, flex: 'none' }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: '#0b0b0c',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 1,
            }}
          >
            {['50% 50% 0 50%', '50% 50% 50% 0', '50% 0 50% 50%', '0 50% 50% 50%'].map(
              (br, i) => (
                <div key={i} style={{ background: '#fff', borderRadius: br }} />
              )
            )}
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            right: -3,
            top: 0,
            width: 9,
            height: 9,
            borderRadius: 3,
            background: '#4b6cf5',
            border: '1.5px solid #fff',
            transform: 'rotate(45deg)',
          }}
        />
      </div>
    );
  }
  return (
    <div style={{ position: 'relative', width: 32, height: 32, flex: 'none' }}>
      <img
        src={av}
        alt=""
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          objectFit: 'cover',
          background: '#ececef',
          display: 'block',
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: -2,
          top: -1,
          width: 9,
          height: 9,
          borderRadius: '50%',
          background: '#2fc26b',
          border: '1.5px solid #fff',
        }}
      />
    </div>
  );
};

export const NotificationStack: FC = () => {
  const tick = useNotificationCycle(NOTIFICATIONS.length);
  const N = NOTIFICATIONS.length;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {NOTIFICATIONS.map((n, i) => {
        const k = ((i - tick) % N + N) % N;
        const sl = k <= 2 ? SLOTS[String(k)] : k === N - 1 ? SLOTS.exit : SLOTS.hidden;
        return (
          <div
            key={n.id}
            style={{
              position: 'absolute',
              left: 447,
              top: sl.top,
              width: 292,
              height: 52,
              boxSizing: 'border-box',
              background: sl.bg,
              border: '1px solid #efeff2',
              borderRadius: 10,
              boxShadow: k === 0 ? '0 10px 24px rgba(30,40,90,.09)' : '0 6px 14px rgba(30,40,90,.05)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '0 12px',
              transform: `scale(${sl.sc})`,
              transformOrigin: '50% 0',
              opacity: sl.op,
              zIndex: sl.z,
              transition:
                'top .8s cubic-bezier(.2,.7,.2,1), transform .8s cubic-bezier(.2,.7,.2,1), opacity .6s ease, background .6s ease',
            }}
          >
            <Avatar av={n.av} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
              <span
                style={{
                  fontSize: 11.5,
                  color: '#55555c',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                <span style={{ fontWeight: 500, color: '#0b0b0c' }}>{n.b}</span>
                {n.t}
                {n.b2 && <span style={{ fontWeight: 500, color: '#0b0b0c' }}>{n.b2}</span>}
              </span>
              <span
                style={{
                  fontSize: 9.5,
                  color: '#6a6a72',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {n.sub}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
