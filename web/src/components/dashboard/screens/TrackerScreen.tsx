import { useMemo, useState, type DragEvent, type FC } from 'react';
import { Link } from 'react-router-dom';
import { analyticsApi, applicationsApi } from '@/api';
import { useDash } from '../context';
import { Card, EmptyNote, ErrorNote, H2, Logo, Muted, PageHead, Skeleton, ago, asList, pad2, useAsync } from '../ui';
import { sentAt } from './status';

const COLUMNS = [
  { id: 'queued', label: 'Queued', dot: '#94A3B8', statuses: ['approved', 'needs_user'], drop: 'approved' },
  { id: 'sent', label: 'Sent', dot: '#2563EB', statuses: ['sent', 'no_response'], drop: 'sent' },
  { id: 'replied', label: 'Replied', dot: '#60A5FA', statuses: ['replied'], drop: 'replied' },
  { id: 'interview', label: 'Interview', dot: '#14B8A6', statuses: ['interview'], drop: 'interview' },
  { id: 'offer', label: 'Offer', dot: '#0F766E', statuses: ['offer', 'hired'], drop: 'offer' },
] as const;
const FOLLOW_UP_DAYS = 6;
const MOVES: Array<[string, string]> = [['sent', 'Sent'], ['replied', 'Replied'], ['interview', 'Interview'], ['offer', 'Offer'], ['rejected', 'Not moving forward'], ['no_response', 'No response']];

export const TrackerScreen: FC = () => {
  const { version, notify, refresh } = useDash();
  const apps = useAsync(async () => asList<any>(await applicationsApi.list({ limit: 100 }), 'applications'), [version]);
  const funnel = useAsync(() => analyticsApi.getFunnel().catch(() => null), [version]);
  const [over, setOver] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const list = apps.data ?? [];
  const board = useMemo(() => COLUMNS.map((c) => ({ ...c, items: list.filter((a) => (c.statuses as readonly string[]).includes(a.status)) })), [list]);
  const followUps = useMemo(() => list.filter((a) => a.status === 'sent' && sentAt(a) && Date.now() - +sentAt(a)! > FOLLOW_UP_DAYS * 864e5), [list]);
  const sentTotal = (funnel.data?.funnel?.[0]?.count ?? 0) as number;
  const rates = funnel.data?.rates;

  const move = async (id: string, to: string) => {
    const app = list.find((a) => a._id === id);
    if (!app || app.status === to) return;
    try { await applicationsApi.updateStatus(id, to); notify(`${app.jobId?.company || 'Application'} moved to ${to.replace('_', ' ')}`); await apps.reload(); refresh(); }
    catch (e: any) { notify(e?.message || 'That move isn’t allowed from the current stage'); }
  };
  const onDrop = (e: DragEvent, to: string) => { e.preventDefault(); setOver(null); const id = e.dataTransfer.getData('text/plain'); if (id) void move(id, to); };

  const sub = (a: any) => {
    const t = sentAt(a);
    if (a.status === 'needs_user') return { text: 'Paused · needs you', color: '#92400E' };
    if (a.status === 'approved') return { text: 'Queued to send', color: '#1D4ED8' };
    if (a.status === 'sent') return { text: `Sent ${ago(t ?? undefined)}${t && Date.now() - +t > FOLLOW_UP_DAYS * 864e5 ? ' · follow-up due' : ''}`, color: t && Date.now() - +t > FOLLOW_UP_DAYS * 864e5 ? '#92400E' : '#5F6A74' };
    if (a.status === 'no_response') return { text: 'No response', color: '#5F6A74' };
    return { text: `Updated ${ago(a.updatedAt)}`, color: a.status === 'interview' || a.status === 'offer' || a.status === 'hired' ? '#0F766E' : '#1D2226' };
  };

  return (
    <>
      <PageHead title="Tracker" blurb="Where every application stands. Stages move on their own when a reply or calendar invite lands in your inbox, or drag a card to change it."
        stats={[{ label: 'Applications sent', value: sentTotal }, { label: 'Got a reply', value: `${Math.round(rates?.sentToReplied ?? 0)}%` }, { label: 'Follow-ups due', value: pad2(followUps.length) }]} />
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 14, marginTop: 30 }}>
        <div style={{ flex: '999 1 560px', minWidth: 0, overflowX: 'auto' }}>
          {apps.error && <ErrorNote message={apps.error} onRetry={apps.reload} />}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(176px,1fr))', gap: 12, minWidth: 920 }}>
            {board.map((c) => {
              const shown = expanded[c.id] ? c.items : c.items.slice(0, 5);
              return (
                <section key={c.id} aria-labelledby={`c-${c.id}`} onDragOver={(e) => { e.preventDefault(); setOver(c.id); }} onDragLeave={() => setOver(null)} onDrop={(e) => onDrop(e, c.drop)}
                  style={{ minHeight: 560, padding: 12, borderRadius: 18, background: over === c.id ? 'rgba(219,234,254,.6)' : 'rgba(255,255,255,.6)', border: `1px solid ${over === c.id ? '#93C5FD' : '#E8EDF2'}` }}>
                  <h2 id={`c-${c.id}`} style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8, padding: '2px 4px', fontSize: 14, lineHeight: '20px', fontWeight: 600, color: '#1D2226' }}>
                    <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: c.dot }} />{c.label}<span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 500, color: '#5F6A74' }}>{c.items.length}</span>
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {apps.loading && !apps.data && <Skeleton h={78} />}
                    {shown.map((a) => { const s = sub(a); const win = a.status === 'offer' || a.status === 'hired'; return (
                      <div key={a._id} className="kc" draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', a._id)} style={{ cursor: 'grab', ...(win ? { borderColor: '#99E3D3', background: '#F0FDFA' } : {}) }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Logo name={a.jobId?.company} size={30} />
                          <span style={{ minWidth: 0 }}><span style={{ display: 'block', fontSize: 13, lineHeight: '18px', fontWeight: 500, color: '#1D2226' }}>{a.jobId?.company}</span><span style={{ display: 'block', fontSize: 12, lineHeight: '16px', color: '#5F6A74' }}>{a.jobId?.title}</span></span>
                        </span>
                        <span style={{ display: 'block', marginTop: 10, fontSize: 11, lineHeight: '15px', color: s.color }}>{s.text}</span>
                        {a.status !== 'needs_user' && a.status !== 'approved' && (
                          <label style={{ display: 'block', marginTop: 8 }}><span className="sr">Move {a.jobId?.company} to</span>
                            <select value="" onChange={(e) => e.target.value && move(a._id, e.target.value)} style={{ width: '100%', height: 28, border: '1px solid #E3E9EE', borderRadius: 8, background: '#fff', fontSize: 11, color: '#4E5862' }}>
                              <option value="">Move to…</option>{MOVES.filter(([v]) => v !== a.status).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                            </select></label>
                        )}
                      </div>); })}
                    {c.items.length === 0 && !apps.loading && <p style={{ margin: 0, padding: '8px 4px', fontSize: 12, color: '#7A858F' }}>Nothing here.</p>}
                    {c.items.length > 5 && <button type="button" className="ghost" onClick={() => setExpanded((x) => ({ ...x, [c.id]: !x[c.id] }))} style={{ height: 36, borderRadius: 12, background: 'transparent', fontSize: 12, fontWeight: 500, color: '#1D4ED8' }}>{expanded[c.id] ? 'Show less' : `Show ${c.items.length - 5} more`}</button>}
                  </div>
                </section>);
            })}
          </div>
        </div>

        <aside aria-label="Follow-ups and funnel" style={{ flex: '0 1 336px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card labelledBy="fu-title">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><H2 id="fu-title">Follow-ups due</H2>{followUps.length > 0 && <span style={{ height: 22, display: 'inline-flex', alignItems: 'center', padding: '0 8px', borderRadius: 999, background: '#FEF3C7', color: '#92400E', fontSize: 11, fontWeight: 600 }}>{followUps.length}</span>}</div>
            <Muted>No reply {FOLLOW_UP_DAYS}+ days after sending.</Muted>
            {followUps.length === 0 ? <EmptyNote title="No follow-ups due" /> : (
              <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {followUps.slice(0, 5).map((a) => (
                  <li key={a._id} style={{ padding: 12, borderRadius: 14, background: '#F7F9FB' }}>
                    <span style={{ display: 'block', fontSize: 13, lineHeight: '18px', fontWeight: 500, color: '#1D2226' }}>{a.jobId?.company} · {a.jobId?.title}</span>
                    <span style={{ display: 'block', fontSize: 12, lineHeight: '16px', color: '#5F6A74' }}>Sent {ago(sentAt(a) ?? undefined)}</span>
                    <span style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      {a.jobId?.url && <a href={a.jobId.url} target="_blank" rel="noreferrer" className="ghost" style={{ height: 32, padding: '0 12px', fontSize: 12, background: '#fff' }}>Open posting</a>}
                      <button type="button" className="ghost" onClick={() => move(a._id, 'no_response')} style={{ height: 32, padding: '0 12px', fontSize: 12, background: '#fff' }}>Mark no response</button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card labelledBy="fn-title">
            <H2 id="fn-title">Conversion</H2>
            <dl style={{ margin: '14px 0 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {([['Sent → Replied', rates?.sentToReplied, '#2563EB'], ['Replied → Interview', rates?.repliedToInterview, '#14B8A6'], ['Interview → Offer', rates?.interviewToOffer, '#0F766E']] as const).map(([l, v, col]) => (
                <div key={l}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, lineHeight: '18px' }}><dt style={{ color: '#3E4851' }}>{l}</dt><dd style={{ margin: 0, fontWeight: 600, color: '#1D2226' }}>{Math.round(v ?? 0)}%</dd></div>
                  <div aria-hidden="true" style={{ marginTop: 6, height: 6, borderRadius: 999, background: '#EEF2F5' }}><div style={{ width: `${Math.min(100, v ?? 0)}%`, height: 6, borderRadius: 999, background: col }} /></div></div>
              ))}
            </dl>
            <h3 style={{ margin: '18px 0 8px', paddingTop: 14, borderTop: '1px solid #EEF2F5', fontSize: 13, lineHeight: '18px', fontWeight: 600, color: '#1D2226' }}>How stages update</h3>
            <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, lineHeight: '17px', color: '#4E5862' }}>
              <li><strong style={{ fontWeight: 600, color: '#1D2226' }}>Sent</strong> when J.A.V.I submits the form or email</li>
              <li><strong style={{ fontWeight: 600, color: '#1D2226' }}>Replied</strong> when a response arrives in Gmail</li>
              <li><strong style={{ fontWeight: 600, color: '#1D2226' }}>Interview</strong> when an invite is detected</li>
              <li><strong style={{ fontWeight: 600, color: '#1D2226' }}>Offer</strong> when an offer arrives, or you mark it</li>
            </ul>
            <Link to="/dash/settings" style={{ display: 'block', marginTop: 12, fontSize: 12, color: '#1D4ED8', textDecoration: 'none' }}>Connect Gmail so replies update stages →</Link>
          </Card>
        </aside>
      </div>
    </>
  );
};
