import { useEffect, useMemo, useState, type FC } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { jobsApi } from '@/api';
import { AddJob } from './AddJob';
import { Icon } from './icons';
import { asList, money, toPct, useAsync } from './data';
import { EmptyState, Logo, Skeleton, cardStyle, ghostBtn, primaryBtn } from './parts';

/** Scan jobs, save the ones you want to look at later, and send in links of your own. */
export const Jobs: FC<{ saved?: boolean }> = ({ saved: savedTab = false }) => {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const [text, setText] = useState(q);
  const [adding, setAdding] = useState(false);
  const [ids, setIds] = useState<string[]>([]);
  const [busy, setBusy] = useState('');

  const list = useAsync<{ jobs: any[] }>(() => (savedTab ? jobsApi.saved() : jobsApi.list({ q: q || undefined, limit: 40 })), [savedTab, q]);
  const rows = useMemo(() => asList(list.data, 'jobs'), [list.data]);
  const savedIds = useAsync(() => jobsApi.saved(), []);
  useEffect(() => {
    if (savedIds.data?.ids) setIds(savedIds.data.ids.map(String));
  }, [savedIds.data]);

  const toggle = async (id: string) => {
    setBusy(id);
    const on = ids.includes(id);
    try {
      const r = on ? await jobsApi.unsave(id) : await jobsApi.save(id);
      setIds(r.ids.map(String));
      if (savedTab && on) list.reload();
    } finally {
      setBusy('');
    }
  };

  const tab = (to: string, label: string, active: boolean) => (
    <Link to={to} style={{ height: 44, padding: '0 20px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', fontSize: 13, fontWeight: 500, background: active ? '#17191F' : 'rgba(255,255,255,.7)', color: active ? '#fff' : '#17191F', border: `1px solid ${active ? '#17191F' : '#E3E9F2'}` }}>
      {label}
    </Link>
  );

  return (
    <main style={{ paddingLeft: 8 }}>
      <div style={{ marginTop: 44, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 500, letterSpacing: '-.025em' }}>{savedTab ? 'Saved jobs' : 'Find jobs'}</h1>
          <p style={{ margin: '8px 0 0', fontSize: 14, color: '#606979' }}>{savedTab ? 'Jobs you kept to come back to.' : 'Scan roles, save the ones to look at later, or add a link of your own.'}</p>
        </div>
        <button type="button" className="tp-btn-primary" onClick={() => setAdding(true)} style={{ ...primaryBtn, gap: 8, color: '#fff' }}><Icon name="plus" size={16} sw={2} />Add job</button>
      </div>

      <div style={{ marginTop: 24, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        {tab('/dash/jobs', 'All jobs', !savedTab)}
        {tab('/dash/saved', `Saved${ids.length ? ` (${ids.length})` : ''}`, savedTab)}
        {!savedTab && (
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              setParams(text.trim() ? { q: text.trim() } : {}, { replace: true });
            }}
            className="tp-search"
            style={{ marginLeft: 'auto', flex: '1 1 260px', maxWidth: 420, height: 48, padding: '0 6px 0 16px', borderRadius: 999, background: '#fff', border: '1px solid #E3E9F2', display: 'flex', alignItems: 'center', gap: 10 }}
          >
            <span style={{ color: '#606979', display: 'flex' }}><Icon name="search" size={17} /></span>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Role, company or place" aria-label="Search jobs" style={{ flex: 1, minWidth: 0, border: 0, outline: 0, background: 'none', font: 'inherit', fontSize: 13 }} />
            <button type="submit" className="tp-btn-primary" style={{ ...primaryBtn, height: 36, padding: '0 16px', fontSize: 12, color: '#fff' }}>Scan</button>
          </form>
        )}
      </div>

      <div className="tp-card" style={{ ...cardStyle, marginTop: 18, padding: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {list.loading ? (
            [0, 1, 2, 3].map((i) => <Skeleton key={i} h={72} r={20} />)
          ) : list.error ? (
            <EmptyState icon="close" title="Couldn't load jobs" body={list.error} />
          ) : rows.length === 0 ? (
            <EmptyState icon={savedTab ? 'star' : 'briefcase'} title={savedTab ? 'No saved jobs yet' : q ? 'No jobs match that search' : 'No jobs found yet'} body={savedTab ? 'Tap the star on any job to keep it here.' : 'Add a job link and J.A.V.I will take it from there.'} cta={savedTab ? { to: '/dash/jobs', label: 'Browse jobs' } : undefined} />
          ) : (
            rows.map((j) => {
              const id = String(j._id);
              const on = ids.includes(id);
              const match = toPct(j.match?.score);
              return (
                <div key={id} className="tp-lift" style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', background: '#fff', borderRadius: 20, padding: '12px 16px' }}>
                  <Logo name={j.company || j.title} size={42} />
                  <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.title}</div>
                    <div style={{ fontSize: 12, color: '#606979' }}>{[j.company, j.location, j.remote ? 'Remote' : ''].filter(Boolean).join(' · ')}</div>
                  </div>
                  {money(j.salary) && <span style={{ fontSize: 12, color: '#606979' }}>{money(j.salary)}</span>}
                  {match !== null && <span style={{ fontSize: 12, fontWeight: 500, background: '#EAF1FF', color: '#1746C7', padding: '5px 11px', borderRadius: 999 }}>{match}% match</span>}
                  {j.url && /^https?:/.test(j.url) && <a href={j.url} target="_blank" rel="noopener noreferrer" className="tp-btn-ghost" style={{ ...ghostBtn, height: 40, padding: '0 16px', fontSize: 12 }}>Open</a>}
                  <button type="button" aria-label={on ? 'Remove from saved' : 'Save job'} aria-pressed={on} disabled={busy === id} onClick={() => toggle(id)} className="tp-icon-btn" style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid #E3E9F2', background: on ? '#EAF1FF' : '#fff', color: on ? '#2457E8' : '#17191F', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="star" size={17} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
      {adding && <AddJob onClose={() => setAdding(false)} onDone={() => { setAdding(false); list.reload(); }} />}
    </main>
  );
};
