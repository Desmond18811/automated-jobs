import { useEffect, useState, type FC } from 'react';
import { applicationsApi, notificationsApi } from '@/api';

interface AlertItem {
  id?: string;
  dotColor: string;
  text: string;
  time: string;
  badge?: string;
}

export const JaviTodayCard: FC = () => {
  const [stats, setStats] = useState([
    { label: 'Scanned', value: 0, color: '#3d6ef5' },
    { label: 'Matched', value: 0, color: '#14b8a6' },
    { label: 'Drafted', value: 0, color: '#3d6ef5' },
    { label: 'Sent', value: 0, color: '#14b8a6' },
  ]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      applicationsApi.list().catch(() => ({ items: [] })),
      notificationsApi.list().catch(() => []),
    ])
      .then(([appsRes, notifsRes]) => {
        if (!isMounted) return;

        const list = Array.isArray(appsRes) ? appsRes : appsRes?.items || appsRes?.applications || [];
        const scannedCount = list.length;
        const matchedCount = list.filter((a: any) =>
          ['matched', 'drafted', 'approved', 'sent', 'replied', 'interview', 'offer', 'hired'].includes(a.status),
        ).length;
        const draftedCount = list.filter((a: any) => ['drafted', 'approved'].includes(a.status)).length;
        const sentCount = list.filter((a: any) =>
          ['sent', 'replied', 'interview', 'offer', 'hired'].includes(a.status),
        ).length;

        setStats([
          { label: 'Scanned', value: scannedCount, color: '#3d6ef5' },
          { label: 'Matched', value: matchedCount, color: '#14b8a6' },
          { label: 'Drafted', value: draftedCount, color: '#3d6ef5' },
          { label: 'Sent', value: sentCount, color: '#14b8a6' },
        ]);

        const rawNotifs = Array.isArray(notifsRes) ? notifsRes : notifsRes?.notifications || notifsRes?.items || [];
        if (rawNotifs.length > 0) {
          const parsed = rawNotifs.slice(0, 4).map((n: any) => {
            let dotColor = '#2563eb';
            if (n.type === 'interview' || n.type === 'interview_invite') dotColor = '#10b981';
            else if (n.type === 'task' || n.type === 'needs_user') dotColor = '#f59e0b';
            else if (n.type === 'error' || n.type === 'failed') dotColor = '#ef4444';

            let timeStr = 'Recently';
            if (n.createdAt) {
              try {
                const diffMins = Math.round((Date.now() - new Date(n.createdAt).getTime()) / (1000 * 60));
                if (diffMins < 60) timeStr = `${Math.max(1, diffMins)} min ago`;
                else if (diffMins < 1440) timeStr = `${Math.round(diffMins / 60)}h ago`;
                else timeStr = 'Yesterday';
              } catch {
                timeStr = 'Recently';
              }
            }

            return {
              id: n._id || n.id,
              dotColor,
              text: n.title || n.message || 'Application updated',
              time: timeStr,
              badge: n.type === 'interview' ? 'Interview' : undefined,
            };
          });
          setAlerts(parsed);
        } else {
          setAlerts([]);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const maxVal = Math.max(...stats.map((s) => s.value), 10);

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
        <span style={{ fontSize: 11, color: '#8a8a92' }}>Active monitoring</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 56, fontSize: 11, color: '#6a6a72', flex: 'none' }}>{s.label}</span>
            <div style={{ flex: 1, height: 6, borderRadius: 999, background: '#f0f1f5', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.min(100, (s.value / maxVal) * 100)}%`,
                  height: '100%',
                  borderRadius: 999,
                  background: s.color,
                  transition: 'width 0.4s ease',
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
        <span style={{ fontSize: 11.5, fontWeight: 700, color: '#3a3a40' }}>Live Alerts</span>
        {loading ? (
          <span style={{ fontSize: 11, color: '#9ca3af' }}>Loading alerts...</span>
        ) : alerts.length === 0 ? (
          <span style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.4 }}>
            No recent alerts. J.A.V.I will alert you when applications are submitted or responses arrive.
          </span>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {alerts.map((a, idx) => (
              <div key={a.id || idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                      color: '#059669',
                      border: '1px solid #a7f3d0',
                      borderRadius: 999,
                      padding: '1px 6px',
                      background: '#ecfdf5',
                    }}
                  >
                    {a.badge}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
