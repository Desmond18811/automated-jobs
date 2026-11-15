import { useState, useEffect, type FC, type ReactNode } from 'react';
import { ArrowUpRightIcon, BriefcaseIcon, CalendarIcon, FileTextIcon, RepeatIcon } from '@/assets/icons';
import { applicationsApi, authApi, jobsApi } from '@/api';

export interface DashboardStats {
  jobsCount?: number;
  tailoredCount?: number;
  sentCount?: number;
  repliesCount?: number;
  interviewsCount?: number;
}

interface StatItem {
  label: string;
  value: string;
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
}

export const StatCards: FC<{ stats?: DashboardStats }> = ({ stats }) => {
  const [computedStats, setComputedStats] = useState<DashboardStats>(() => stats || {});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (stats) {
      setComputedStats(stats);
      setLoaded(true);
      return;
    }

    // If no stats provided, fetch directly from authenticated API
    if (authApi.isAuthenticated()) {
      Promise.all([
        applicationsApi.list().catch(() => ({ items: [] })),
        jobsApi.list().catch(() => ({ jobs: [] })),
      ])
        .then(([appsRes, jobsRes]) => {
          const list = Array.isArray(appsRes) ? appsRes : appsRes?.items || appsRes?.applications || [];
          const rawJobs = Array.isArray(jobsRes) ? jobsRes : jobsRes?.jobs || [];
          const totalJobs = Math.max(list.length, rawJobs.length);

          const tailored = list.filter((a: any) =>
            a.documents?.tailoredCv || ['drafted', 'sent', 'replied', 'interview', 'offer'].includes(a.status),
          ).length;
          const sent = list.filter((a: any) =>
            ['sent', 'replied', 'interview', 'offer', 'hired'].includes(a.status),
          ).length;
          const replies = list.filter((a: any) => a.status === 'replied').length;
          const interviews = list.filter((a: any) => a.status === 'interview').length;

          setComputedStats({
            jobsCount: totalJobs,
            tailoredCount: tailored,
            sentCount: sent,
            repliesCount: replies,
            interviewsCount: interviews,
          });
          setLoaded(true);
        })
        .catch(() => {
          setComputedStats({ jobsCount: 0, tailoredCount: 0, sentCount: 0, repliesCount: 0, interviewsCount: 0 });
          setLoaded(true);
        });
    } else {
      setComputedStats({ jobsCount: 0, tailoredCount: 0, sentCount: 0, repliesCount: 0, interviewsCount: 0 });
      setLoaded(true);
    }
  }, [stats]);

  const cards: StatItem[] = [
    {
      label: 'Roles tracked',
      value: loaded ? String(computedStats.jobsCount ?? 0) : '0',
      icon: <BriefcaseIcon size={18} color="#2563eb" />,
      iconBg: '#eff6ff',
      iconColor: '#2563eb',
    },
    {
      label: 'CVs tailored',
      value: loaded ? String(computedStats.tailoredCount ?? 0) : '0',
      icon: <FileTextIcon size={18} color="#0284c7" />,
      iconBg: '#f0f9ff',
      iconColor: '#0284c7',
    },
    {
      label: 'Applications sent',
      value: loaded ? (computedStats.sentCount ?? 0).toLocaleString() : '0',
      icon: <ArrowUpRightIcon size={18} color="#0f9488" />,
      iconBg: '#e7f7f5',
      iconColor: '#0f9488',
    },
    {
      label: 'Interviews scheduled',
      value: loaded ? String(computedStats.interviewsCount ?? 0) : '0',
      icon: <CalendarIcon size={18} color="#7c3aed" />,
      iconBg: '#f5f3ff',
      iconColor: '#7c3aed',
    },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
      {cards.map((s) => (
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
};
