import type { FC } from 'react';
import { analyticsApi } from '@/api';
import { useAsync } from './data';
import { EmptyState, Skeleton, cardStyle } from './parts';

const TYPE_LABEL: Record<string, string> = { email: 'Email', form: 'Application form', platform: 'Job platform', unknown: 'Other link' };

const Tile: FC<{ label: string; value: string | number; sub?: string }> = ({ label, value, sub }) => (
  <div className="tp-card" style={{ ...cardStyle, flex: '1 1 180px', gap: 6 }}>
    <div style={{ fontSize: 12, color: '#606979' }}>{label}</div>
    <div style={{ fontSize: 30, fontWeight: 500, letterSpacing: '-.03em', lineHeight: 1.1 }}>{value}</div>
    {sub && <div style={{ fontSize: 12, color: '#98A1AF' }}>{sub}</div>}
  </div>
);

const Bar: FC<{ label: string; n: number; max: number }> = ({ label, n, max }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13 }}>
    <span style={{ flex: '0 0 130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
    <div style={{ flex: 1, height: 10, borderRadius: 10, background: '#EEF2F7' }}><div style={{ width: `${max ? (n / max) * 100 : 0}%`, height: '100%', borderRadius: 10, background: 'linear-gradient(90deg,#A7C0FA,#2457E8)' }} /></div>
    <span style={{ flex: '0 0 28px', textAlign: 'right', fontWeight: 500 }}>{n}</span>
  </div>
);

export const Analytics: FC = () => {
  const o = useAsync(() => analyticsApi.overview(), []);
  const f = useAsync(() => analyticsApi.getFunnel(), []);
  const d = o.data;
  const funnel: { stage: string; count: number; rate: number }[] = f.data?.funnel ?? [];
  const maxDay = Math.max(1, ...(d?.perDay ?? []).map((x: any) => x.sent));
  const types = Object.entries(d?.linkTypes ?? {}).filter(([, n]) => (n as number) > 0) as [string, number][];

  return (
    <main style={{ paddingLeft: 8 }}>
      <h1 style={{ margin: '44px 0 8px', fontSize: 30, fontWeight: 500, letterSpacing: '-.025em' }}>Analytics</h1>
      <p style={{ margin: '0 0 24px', fontSize: 14, color: '#606979' }}>Everything J.A.V.I has done for you so far.</p>

      {o.loading ? (
        <Skeleton h={260} r={26} />
      ) : o.error ? (
        <EmptyState icon="close" title="Couldn't load analytics" body={o.error} />
      ) : (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            <Tile label="Applications sent" value={d.sent} sub={`${d.total} found in total`} />
            <Tile label="Replies" value={f.data ? f.data.funnel?.[1]?.count ?? 0 : '–'} sub={f.data ? `${f.data.rates?.sentToReplied ?? 0}% of sent` : undefined} />
            <Tile label="Interviews" value={f.data ? f.data.funnel?.[2]?.count ?? 0 : '–'} />
            <Tile label="Average match" value={d.averageMatch === null ? '–' : `${d.averageMatch}%`} sub="How well jobs fit your profile" />
          </div>

          <div className="tp-card" style={{ ...cardStyle, marginTop: 16, gap: 14 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>Applications sent, last 30 days</h2>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 120 }} role="img" aria-label="Applications sent per day">
              {d.perDay.map((x: any) => (
                <div key={x.day} title={`${x.day}: ${x.sent}`} style={{ flex: 1, height: `${Math.max(x.sent ? 8 : 3, (x.sent / maxDay) * 100)}%`, borderRadius: 4, background: x.sent ? '#2457E8' : '#E3E9F2' }} />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 16 }}>
            <div className="tp-card" style={{ ...cardStyle, flex: '1 1 340px', gap: 12 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>Where you applied</h2>
              {d.platforms.length === 0 ? <div style={{ fontSize: 13, color: '#606979' }}>Platforms appear here once applications are sent.</div> : d.platforms.map((p: any) => <Bar key={p.platform} label={p.platform} n={p.count} max={d.platforms[0].count} />)}
            </div>
            <div className="tp-card" style={{ ...cardStyle, flex: '1 1 340px', gap: 12 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>How you applied</h2>
              {types.length === 0 ? <div style={{ fontSize: 13, color: '#606979' }}>Link types appear here once applications are sent.</div> : types.map(([t, n]) => <Bar key={t} label={TYPE_LABEL[t] || t} n={n} max={Math.max(...types.map((x) => x[1]))} />)}
            </div>
            <div className="tp-card" style={{ ...cardStyle, flex: '1 1 340px', gap: 12 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>Funnel</h2>
              {funnel.length === 0 ? <div style={{ fontSize: 13, color: '#606979' }}>{f.loading ? 'Loading…' : 'No data yet.'}</div> : funnel.map((s) => <Bar key={s.stage} label={s.stage} n={s.count} max={Math.max(1, funnel[0].count)} />)}
            </div>
          </div>
        </>
      )}
    </main>
  );
};
