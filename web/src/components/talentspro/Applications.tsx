import { useMemo, useState, type FC } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { analyticsApi, applicationsApi } from '@/api';
import { Icon } from './icons';
import { NEXT_STEP, SENT, STAGE_BADGE, asList, jobOf, shortDate, ago, stageOf, toPct, useAsync, type Stage } from './data';
import { Badge, EmptyState, Logo, Skeleton, cardStyle, ghostBtn, primaryBtn } from './parts';

const PAGE = 8;
const REVIEW = ['matched', 'drafted', 'needs_user'];

/** Drafts waiting for you: J.A.V.I sends nothing until you approve it (review mode). */
const ReviewList: FC<{ apps: any[]; loading: boolean; error: string | null; reload: () => void }> = ({ apps, loading, error, reload }) => {
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<string | null>(null);
  const ready = apps.filter((a) => a.status === 'drafted' && a.documents?.generatedAt && (a.documents?.factCheck?.passed || a.documents?.editedByUser));
  const act = async (id: string, kind: 'approve' | 'regenerate' | 'archive') => {
    setBusy(`${kind}:${id}`);
    setMsg((m) => ({ ...m, [id]: '' }));
    try {
      await applicationsApi[kind](id);
      setMsg((m) => ({ ...m, [id]: kind === 'approve' ? 'Approved. J.A.V.I is applying.' : kind === 'regenerate' ? 'Drafting again…' : 'Skipped.' }));
      reload();
    } catch (e: any) {
      setMsg((m) => ({ ...m, [id]: e?.message || 'That did not work. Try again.' }));
    } finally {
      setBusy('');
    }
  };
  const approveAll = async () => {
    setBusy('all');
    for (const a of ready) {
      try {
        await applicationsApi.approve(a._id);
      } catch (e: any) {
        setMsg((m) => ({ ...m, [a._id]: e?.message || 'Could not approve' }));
      }
    }
    setBusy('');
    reload();
  };
  const head: React.CSSProperties = { fontSize: 12, fontWeight: 500, color: '#606979' };

  if (loading) return <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{[0, 1, 2].map((i) => <Skeleton key={i} h={66} r={20} />)}</div>;
  if (error) return <EmptyState icon="close" title="Couldn't load drafts" body={error} />;
  if (!apps.length) return <EmptyState icon="doc" title="Nothing waiting for approval" body="When J.A.V.I drafts an application from a job you added, it appears here for you to check and approve." cta={{ to: '/dash/jobs', label: 'Add jobs' }} />;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '0 6px 6px', flexWrap: 'wrap' }}>
        <span style={head}>{ready.length} ready to send, {apps.length - ready.length} still drafting or need you</span>
        {ready.length > 0 && (
          <button type="button" className="tp-btn-primary" disabled={!!busy} onClick={approveAll} style={{ ...primaryBtn, height: 40, padding: '0 18px', fontSize: 13, color: '#fff' }}>
            {busy === 'all' ? 'Approving…' : `Approve all ${ready.length} ready`}
          </button>
        )}
      </div>
      {apps.map((a) => {
        const j = jobOf(a);
        const d = a.documents ?? {};
        const isReady = ready.includes(a);
        const failed = a.status === 'drafted' && d.generatedAt && !d.factCheck?.passed && !d.editedByUser;
        const state = a.status === 'needs_user' ? ['Needs you', '#FFF5DF', '#8A5A00'] : isReady ? ['Ready to send', '#E6F9F0', '#0B7A4B'] : failed ? ['Failed fact check', '#FDECEE', '#B4232F'] : ['Drafting', '#F1F4F8', '#4C5566'];
        const pct = toPct(a.score);
        return (
          <div key={a._id} style={{ background: '#fff', borderRadius: 20, padding: '12px 16px', boxShadow: '0 1px 2px rgba(23,25,31,.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <Logo name={j.company || j.title} size={42} />
              <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.title || 'Untitled role'}</div>
                <div style={{ fontSize: 12, color: '#606979' }}>{[j.company, pct !== null ? `${pct}% match` : ''].filter(Boolean).join(', ')}</div>
              </div>
              <Badge bg={state[1]} fg={state[2]}>{state[0]}</Badge>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {d.coverLetter && <button type="button" className="tp-btn-ghost" onClick={() => setOpen(open === a._id ? null : a._id)} style={{ ...ghostBtn, height: 36, padding: '0 14px', fontSize: 12 }}>{open === a._id ? 'Hide draft' : 'View draft'}</button>}
                {j.url && /^https?:/.test(j.url) && <a href={j.url} target="_blank" rel="noopener noreferrer" className="tp-btn-ghost" style={{ ...ghostBtn, height: 36, padding: '0 14px', fontSize: 12 }}>Job</a>}
                {['matched', 'drafted'].includes(a.status) && <button type="button" className="tp-btn-ghost" disabled={!!busy} onClick={() => act(a._id, 'regenerate')} style={{ ...ghostBtn, height: 36, padding: '0 14px', fontSize: 12 }}>Regenerate</button>}
                <button type="button" className="tp-btn-ghost" disabled={!!busy} onClick={() => act(a._id, 'archive')} style={{ ...ghostBtn, height: 36, padding: '0 14px', fontSize: 12 }}>Skip</button>
                <button type="button" className="tp-btn-primary" disabled={!!busy || !isReady} title={isReady ? undefined : 'Available once the draft is ready'} onClick={() => act(a._id, 'approve')} style={{ ...primaryBtn, height: 36, padding: '0 16px', fontSize: 12, color: '#fff', opacity: isReady ? 1 : 0.5 }}>
                  {busy === `approve:${a._id}` ? 'Approving…' : 'Approve'}
                </button>
              </div>
            </div>
            {failed && d.factCheck?.blocking?.length > 0 && <div style={{ marginTop: 8, fontSize: 12, color: '#B4232F' }}>{d.factCheck.blocking.slice(0, 3).join(' · ')}</div>}
            {msg[a._id] && <div role="status" style={{ marginTop: 8, fontSize: 12, color: /not|fail|could/i.test(msg[a._id]) ? '#B4232F' : '#0B7A4B' }}>{msg[a._id]}</div>}
            {open === a._id && d.coverLetter && (
              <pre style={{ margin: '10px 0 0', whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 13, lineHeight: 1.55, color: '#30343D', background: '#F5F8FC', borderRadius: 14, padding: 14, maxHeight: 320, overflow: 'auto' }}>{d.coverLetter}</pre>
            )}
          </div>
        );
      })}
    </div>
  );
};
const cols = { role: '1 1 260px', stage: '0 0 116px', applied: '0 0 96px', updated: '0 0 96px', next: '1 1 200px', end: '0 0 36px' };

export const Applications: FC = () => {
  const [params, setParams] = useSearchParams();
  const stage = (params.get('stage') as Stage | null) || null;
  const q = (params.get('q') || '').toLowerCase();
  const [shown, setShown] = useState(PAGE);
  const [newest, setNewest] = useState(true);
  const view = params.get('view') === 'review' ? 'review' : 'sent';
  const res = useAsync(() => applicationsApi.list({ limit: 100 } as any), []);
  const ov = useAsync(() => analyticsApi.overview(), []);

  const sent = useMemo(() => asList(res.data, 'applications').filter((a) => SENT.includes(a.status)), [res.data]);
  const review = useMemo(() => asList(res.data, 'applications').filter((a) => REVIEW.includes(a.status)).sort((a, b) => (b.score ?? 0) - (a.score ?? 0)), [res.data]);
  const setView = (v: 'sent' | 'review') => {
    const n = new URLSearchParams(params);
    v === 'review' ? n.set('view', 'review') : n.delete('view');
    setParams(n, { replace: true });
  };
  const counts = { all: sent.length, submitted: 0, review: 0, interview: 0 } as Record<string, number>;
  sent.forEach((a) => (counts[stageOf(a.status)] += 1));

  const rows = useMemo(() => {
    const r = sent
      .filter((a) => !stage || stageOf(a.status) === stage)
      .filter((a) => {
        const j = jobOf(a);
        return !q || `${j.title} ${j.company}`.toLowerCase().includes(q);
      })
      .sort((a, b) => (+new Date(b.createdAt) - +new Date(a.createdAt)) * (newest ? 1 : -1));
    return r;
  }, [sent, stage, q, newest]);

  const setStage = (s: Stage | null) => {
    const n = new URLSearchParams(params);
    s ? n.set('stage', s) : n.delete('stage');
    setParams(n, { replace: true });
    setShown(PAGE);
  };

  const exportCsv = () => {
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = ['Role,Company,Stage,Applied,Updated']
      .concat(rows.map((a) => [jobOf(a).title, jobOf(a).company, STAGE_BADGE[stageOf(a.status)].label, shortDate(a.createdAt), shortDate(a.updatedAt)].map(esc).join(',')))
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'applications.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const pills: [Stage | null, string][] = [[null, 'All'], ['submitted', 'Submitted'], ['review', 'In review'], ['interview', 'Interviews']];
  const head: React.CSSProperties = { fontSize: 12, fontWeight: 500, color: '#606979' };

  return (
    <main style={{ paddingLeft: 8 }}>
      <div style={{ marginTop: 44, display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, color: '#606979', marginBottom: 8 }}>
            <Link to="/dash" style={{ color: '#606979' }}>Dashboard</Link> / Applications
          </div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 500, letterSpacing: '-.025em' }}>Applications</h1>
          <p style={{ margin: '8px 0 0', fontSize: 14, color: '#606979' }}>
            {res.loading ? 'Loading…' : `${counts.all} sent · ${counts.interview} in interviews · ${counts.review} awaiting review`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="tp-btn-ghost" onClick={exportCsv} disabled={!rows.length} style={ghostBtn}>Export</button>
          <Link to="/dash/jobs" className="tp-btn-primary" style={{ ...primaryBtn, color: '#fff' }}>Find jobs</Link>
        </div>
      </div>

      <div style={{ marginTop: 24, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {(['sent', 'review'] as const).map((v) => (
          <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} style={{ height: 44, padding: '0 8px 0 18px', borderRadius: 999, fontSize: 13, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 10, background: view === v ? '#2457E8' : 'rgba(255,255,255,.7)', color: view === v ? '#fff' : '#17191F', border: `1px solid ${view === v ? '#2457E8' : '#E3E9F2'}` }}>
            {v === 'sent' ? 'Sent' : 'Waiting for approval'}
            <span style={{ minWidth: 28, height: 28, padding: '0 8px', borderRadius: 999, fontSize: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: view === v ? 'rgba(255,255,255,.2)' : '#F1F4F8', color: view === v ? '#fff' : '#4C5566' }}>{res.loading ? '–' : v === 'sent' ? sent.length : review.length}</span>
          </button>
        ))}
      </div>

      {view === 'review' ? (
        <div className="tp-card" style={{ ...cardStyle, marginTop: 20, padding: 16 }}>
          <ReviewList apps={review} loading={res.loading} error={res.error} reload={res.reload} />
        </div>
      ) : (
        <>
      {ov.data && ov.data.sent > 0 && (
        <div className="tp-card" style={{ ...cardStyle, marginTop: 24, padding: 16, flexDirection: 'row', flexWrap: 'wrap', gap: '14px 28px' }}>
          <div style={{ flex: '1 1 280px', minWidth: 0 }}>
            <div style={head}>Platforms applied to</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {ov.data.platforms.map((p: any) => (
                <span key={p.platform} style={{ background: '#fff', border: '1px solid #E3E9F2', borderRadius: 999, padding: '6px 12px', fontSize: 12, fontWeight: 500 }}>
                  {p.platform} <span style={{ color: '#2457E8' }}>{p.count}</span>
                </span>
              ))}
            </div>
          </div>
          <div style={{ flex: '1 1 240px', minWidth: 0 }}>
            <div style={head}>Link types</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {(Object.entries(ov.data.linkTypes) as [string, number][]).filter(([, n]) => n > 0).map(([t, n]) => (
                <span key={t} style={{ background: '#EAF1FF', color: '#1746C7', borderRadius: 999, padding: '6px 12px', fontSize: 12, fontWeight: 500 }}>
                  {({ email: 'Email', form: 'Application form', platform: 'Job platform', unknown: 'Other link' } as Record<string, string>)[t] || t} {n}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 28, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        {pills.map(([k, label]) => {
          const active = stage === k;
          const n = k ? counts[k] : counts.all;
          return (
            <button key={label} type="button" className="tp-pill" onClick={() => setStage(k)} style={{ height: 44, padding: '0 8px 0 18px', borderRadius: 999, fontSize: 13, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 10, background: active ? '#17191F' : 'rgba(255,255,255,.7)', color: active ? '#fff' : '#17191F', border: `1px solid ${active ? '#17191F' : '#E3E9F2'}` }}>
              {label}
              <span style={{ minWidth: 28, height: 28, padding: '0 8px', borderRadius: 999, fontSize: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: active ? 'rgba(255,255,255,.16)' : '#F1F4F8', color: active ? '#fff' : '#4C5566' }}>{res.loading ? '–' : n}</span>
            </button>
          );
        })}
        <button type="button" className="tp-btn-ghost" onClick={() => setNewest(!newest)} style={{ ...ghostBtn, height: 44, marginLeft: 'auto', padding: '0 14px 0 18px', fontSize: 13, gap: 6 }}>
          {newest ? 'Newest first' : 'Oldest first'}
          <Icon name="chevronDown" size={14} />
        </button>
      </div>

      <div className="tp-card" style={{ ...cardStyle, marginTop: 20, padding: 16 }}>
        <div className="tp-hide-sm" style={{ display: 'flex', gap: 16, padding: '6px 16px 12px', ...head }}>
          <span style={{ flex: cols.role }}>Role</span>
          <span style={{ flex: cols.stage }}>Stage</span>
          <span style={{ flex: cols.applied }}>Applied</span>
          <span style={{ flex: cols.updated }}>Updated</span>
          <span style={{ flex: cols.next }}>Next step</span>
          <span style={{ flex: cols.end }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {res.loading ? (
            [0, 1, 2, 3].map((i) => <Skeleton key={i} h={66} r={20} />)
          ) : res.error ? (
            <EmptyState icon="close" title="Couldn't load applications" body={res.error} cta={{ to: '/dash/applications', label: 'Try again' }} />
          ) : rows.length === 0 ? (
            <EmptyState icon="folder" title={sent.length ? 'Nothing matches this filter' : 'No applications yet'} body={sent.length ? 'Try another stage or clear the search.' : 'Applications J.A.V.I sends for you will be listed here.'} cta={{ to: '/dash', label: 'Back to dashboard' }} />
          ) : (
            rows.slice(0, shown).map((a) => {
              const j = jobOf(a);
              const st = stageOf(a.status);
              const b = STAGE_BADGE[st];
              const next = NEXT_STEP[a.status] || '—';
              return (
                <div key={a._id} className="tp-lift" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 16px', padding: '12px 16px', background: '#fff', borderRadius: 20, boxShadow: '0 1px 2px rgba(23,25,31,.04)' }}>
                  <div style={{ flex: cols.role, display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                    <Logo name={j.company || j.title} size={42} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.title || 'Untitled role'}</div>
                      <div style={{ fontSize: 12, color: '#606979' }}>{j.company}</div>
                    </div>
                  </div>
                  <div style={{ flex: cols.stage }}><Badge bg={b.bg} fg={b.fg}>{b.label}</Badge></div>
                  <div style={{ flex: cols.applied, fontSize: 13 }}>{shortDate(a.createdAt)}</div>
                  <div style={{ flex: cols.updated, fontSize: 13, color: '#606979' }}>{ago(a.updatedAt)}</div>
                  <div style={{ flex: cols.next, fontSize: 13, fontWeight: st === 'interview' ? 500 : 400, color: st === 'interview' ? '#17191F' : '#606979' }}>{next}</div>
                  <span style={{ flex: cols.end, width: 36, height: 36, borderRadius: '50%', background: '#F5F8FC', color: '#606979', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="chevron" size={16} /></span>
                </div>
              );
            })
          )}
        </div>
        {!res.loading && rows.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 6px 4px' }}>
            <span role="status" style={{ fontSize: 13, color: '#606979' }}>Showing {Math.min(shown, rows.length)} of {rows.length}</span>
            {shown < rows.length && (
              <button type="button" className="tp-btn-ghost" onClick={() => setShown(shown + PAGE)} style={{ ...ghostBtn, height: 44, padding: '0 22px', fontSize: 13 }}>Load more</button>
            )}
          </div>
        )}
      </div>
        </>
      )}
    </main>
  );
};
