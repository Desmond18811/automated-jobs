import { useEffect, useState, type FC } from 'react';
import { applicationsApi, profileApi } from '@/api';
import { useDash } from '../context';
import { Card, EmptyNote, ErrorNote, H2, Icon, ICONS, Logo, Muted, PageHead, Skeleton, asList, matchTone, money, pad2, toPct, useAsync } from '../ui';

type Part = 'cv' | 'letter' | 'email';

const Chip: FC<{ ok: boolean; children: string }> = ({ ok, children }) => (
  <li style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 999, background: ok ? '#E3F5EF' : '#FBE3E8', color: ok ? '#1F6B57' : '#8A2C42', fontSize: 12 }}>
    <Icon d={ok ? ICONS.check : 'M7 7l10 10M17 7 7 17'} size={12} sw={2.6} />{children}
  </li>
);

export const DraftsScreen: FC = () => {
  const { version, notify, refresh } = useDash();
  const list = useAsync(async () => asList<any>(await applicationsApi.list({ status: 'drafted', limit: 100 }), 'applications'), [version]);
  const profile = useAsync(() => profileApi.get().then((p) => p?.profile || p).catch(() => null), []);
  const approved = useAsync(async () => asList<any>(await applicationsApi.list({ status: 'approved', limit: 100 }), 'applications'), [version]);
  const [selected, setSelected] = useState<string | null>(null);
  const [part, setPart] = useState<Part>('cv');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<{ coverLetter: string; emailSubject: string; emailBody: string }>({ coverLetter: '', emailSubject: '', emailBody: '' });
  const [busy, setBusy] = useState(false);

  const drafts = list.data ?? [];
  const current = drafts.find((d) => d._id === selected) ?? drafts[0];
  const doc = current?.documents ?? {};
  const parts: Array<[Part, string, boolean]> = [['cv', 'Tailored CV', !!doc.cvSummary], ['letter', 'Cover letter', !!doc.coverLetter], ['email', 'Email', !!(doc.emailBody || doc.emailSubject)]];
  const available = parts.filter((p) => p[2]);
  const activePart: Part = available.find((p) => p[0] === part) ? part : (available[0]?.[0] ?? 'cv');

  useEffect(() => {
    setEditing(false);
    setDraft({ coverLetter: doc.coverLetter ?? '', emailSubject: doc.emailSubject ?? '', emailBody: doc.emailBody ?? '' });
  }, [current?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try { await fn(); notify(ok); setSelected(null); await list.reload(); refresh(); }
    catch (e: any) { notify(e?.message || 'That did not work'); } finally { setBusy(false); }
  };
  const save = async () => {
    setBusy(true);
    try { await applicationsApi.updateDocuments(current._id, draft); notify('Edits saved'); setEditing(false); await list.reload(); }
    catch (e: any) { notify(e?.message || 'Could not save your edits'); } finally { setBusy(false); }
  };
  const approveAll = async () => {
    if (!window.confirm(`Approve all ${drafts.length} drafts? They send in the next window without further review.`)) return;
    setBusy(true);
    const r = await Promise.allSettled(drafts.map((d) => applicationsApi.approve(d._id)));
    const failed = r.filter((x) => x.status === 'rejected').length;
    notify(failed ? `${r.length - failed} approved, ${failed} could not be approved` : `${r.length} approved and queued`);
    setSelected(null); await list.reload(); refresh(); setBusy(false);
  };

  const j = current?.jobId ?? {};
  const pct = toPct(current?.score);
  const tone = matchTone(pct);
  const fc = doc.factCheck;
  const hours = profile.data?.rules?.sendingHours;
  const breakdown = Object.entries(current?.scoreBreakdown ?? {}).filter(([, v]) => typeof v === 'number') as Array<[string, number]>;

  return (
    <>
      <PageHead title="Drafts" blurb="Tailored CVs, cover letters and emails waiting for your OK. Approve and J.A.V.I sends them in the next send window."
        stats={[{ label: 'Waiting for review', value: pad2(drafts.length) }, { label: 'Approved, queued', value: pad2(approved.data?.length ?? 0) }, { label: 'Sending hours', value: hours ? `${pad2(hours.start)}–${pad2(hours.end)}` : '–' }]} />
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 14, marginTop: 30 }}>
        <Card label="Drafts to review" style={{ flex: '0 1 360px', minWidth: 0, width: '100%', padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '0 2px' }}>
            <h2 style={{ margin: 0, fontSize: 16, lineHeight: '22px', fontWeight: 500, color: '#1D2226' }}>{drafts.length} to review</h2>
            {drafts.length > 1 && <button type="button" className="tint" disabled={busy} onClick={approveAll} style={{ height: 34, padding: '0 14px', fontSize: 13 }}>Approve all</button>}
          </div>
          {list.error && <div style={{ marginTop: 12 }}><ErrorNote message={list.error} onRetry={list.reload} /></div>}
          {list.loading && !list.data ? <Skeleton h={160} style={{ marginTop: 14 }} /> : drafts.length === 0 ? <EmptyNote title="No drafts waiting" body="When a role clears your match bar, its tailored draft appears here." /> : (
            <ul style={{ listStyle: 'none', margin: '14px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {drafts.map((d) => {
                const on = d._id === current?._id; const t = matchTone(toPct(d.score));
                return (
                  <li key={d._id}>
                    <button type="button" aria-current={on} onClick={() => setSelected(d._id)} style={{ display: 'flex', gap: 12, width: '100%', textAlign: 'left', padding: 14, borderRadius: 16, border: `1.5px solid ${on ? '#2563EB' : '#EEF2F5'}`, background: on ? '#F5F8FF' : '#fff', font: 'inherit' }}>
                      <Logo name={d.jobId?.company} size={38} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span style={{ fontSize: 14, lineHeight: '19px', fontWeight: 500, color: '#1D2226' }}>{d.jobId?.title}</span><span style={{ fontSize: 12, fontWeight: 600, color: t.fg }}>{toPct(d.score)}%</span></span>
                        <span style={{ display: 'block', fontSize: 12, lineHeight: '17px', color: '#5F6A74' }}>{[d.jobId?.company, d.jobId?.location].filter(Boolean).join(' · ')}</span>
                        <span style={{ display: 'block', marginTop: 6, fontSize: 11, lineHeight: '15px', color: '#5F6A74' }}>{[d.documents?.cvSummary && 'CV', d.documents?.coverLetter && 'cover letter', d.documents?.emailBody && 'email'].filter(Boolean).join(' + ') || 'Draft'}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {drafts.length > 0 && <Muted style={{ margin: '14px 2px 2px' }}>{profile.data?.rules?.approvalMode === 'auto' ? 'Auto mode is on: drafts above your bar send without review.' : 'Nothing sends until you approve it.'}</Muted>}
        </Card>

        {current && (
          <section aria-labelledby="pv-title" className="card" style={{ flex: '999 1 560px', minWidth: 0, padding: '20px 22px 22px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14 }}>
              <Logo name={j.company} size={46} />
              <div style={{ flex: 1, minWidth: 220 }}>
                <h2 id="pv-title" style={{ margin: 0, fontSize: 20, lineHeight: '26px', fontWeight: 500, letterSpacing: '-0.01em', color: '#111418' }}>{j.title} · {j.company}</h2>
                <p style={{ margin: '2px 0 0', fontSize: 13, lineHeight: '18px', color: '#5F6A74' }}>
                  <span style={{ color: tone.fg, fontWeight: 600 }}>{pct}% match</span>{[j.location, money(j.salary)].filter(Boolean).map((x) => ` · ${x}`).join('')}{j.url && <> · <a href={j.url} target="_blank" rel="noreferrer" style={{ color: '#1D4ED8' }}>View posting</a></>}
                </p>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button type="button" className="ghost" disabled={busy} onClick={() => act(() => applicationsApi.archive(current._id), 'Draft rejected')} style={{ height: 40, padding: '0 16px', fontSize: 13 }}>Reject</button>
                <button type="button" className="ghost" disabled={busy} onClick={() => act(async () => { await applicationsApi.regenerate(current._id); }, 'Regenerating. A fresh draft will appear shortly.')} style={{ height: 40, padding: '0 16px', fontSize: 13 }}>Regenerate</button>
                {!editing && (doc.coverLetter || doc.emailBody) && <button type="button" className="ghost" onClick={() => setEditing(true)} style={{ height: 40, padding: '0 16px', fontSize: 13 }}>Edit</button>}
                <button type="button" className="cta" disabled={busy || editing} onClick={() => act(() => applicationsApi.approve(current._id), 'Approved. It sends in the next window.')} style={{ height: 40, padding: '0 18px', fontSize: 13 }}>Approve & queue</button>
              </div>
            </div>

            {available.length > 1 && (
              <div role="tablist" aria-label="Draft parts" style={{ display: 'flex', gap: 24, marginTop: 20, borderBottom: '1px solid #EEF2F5' }}>
                {available.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={activePart === id} onClick={() => setPart(id)} style={{ height: 38, padding: '0 2px', border: 0, borderBottom: `2px solid ${activePart === id ? '#1D4ED8' : 'transparent'}`, background: 'transparent', fontSize: 14, fontWeight: activePart === id ? 500 : 400, color: activePart === id ? '#1D2226' : '#5F6A74' }}>{label}</button>)}
              </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, marginTop: 18 }}>
              <div style={{ flex: '1 1 280px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ padding: 16, borderRadius: 16, background: '#F7F9FB' }}>
                  <h3 style={{ margin: 0, fontSize: 14, lineHeight: '19px', fontWeight: 600, color: '#1D2226' }}>Why it matched</h3>
                  {breakdown.length === 0 ? <Muted>No breakdown recorded for this match.</Muted> : (
                    <ul style={{ margin: '10px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {breakdown.map(([k, v]) => { const p = Math.round((v <= 1 ? v : v / 100) * 100); return (
                        <li key={k}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#3E4851', textTransform: 'capitalize' }}><span>{k.replace(/([A-Z])/g, ' $1').toLowerCase()}</span><span style={{ fontWeight: 600 }}>{p}%</span></div><div aria-hidden="true" style={{ marginTop: 4, height: 5, borderRadius: 999, background: '#E6ECF1' }}><div style={{ width: `${Math.min(100, p)}%`, height: 5, borderRadius: 999, background: '#2563EB' }} /></div></li>); })}
                    </ul>
                  )}
                </div>
                <div style={{ padding: 16, borderRadius: 16, background: '#F7F9FB' }}>
                  <h3 style={{ margin: 0, fontSize: 14, lineHeight: '19px', fontWeight: 600, color: '#1D2226' }}>Fact check</h3>
                  <ul aria-label="Fact check" style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {fc ? <Chip ok={fc.passed}>{fc.passed ? 'Every claim traces to your profile' : 'Needs attention'}</Chip> : <Chip ok>No claims to check</Chip>}
                    {(fc?.blocking ?? []).map((b: string) => <Chip key={b} ok={false}>{b}</Chip>)}
                    {(fc?.warnings ?? []).map((w: string) => <li key={w} style={{ padding: '5px 10px', borderRadius: 999, background: '#FDF3E2', color: '#94652A', fontSize: 12 }}>{w}</li>)}
                  </ul>
                  <Muted style={{ marginTop: 10, fontSize: 12 }}>J.A.V.I only writes facts from your verified profile. Skills you haven’t confirmed are left out.</Muted>
                </div>
              </div>

              <article aria-label="Draft preview" style={{ flex: '1.3 1 340px', minWidth: 0, padding: '24px 26px', borderRadius: 16, border: '1px solid #E3E9EE', background: '#fff', boxShadow: '0 6px 24px rgba(16,24,40,.05)' }}>
                {available.length === 0 ? <Muted>This draft has no written documents yet.</Muted> : activePart === 'cv' ? (
                  <><p style={{ margin: 0, fontSize: 18, lineHeight: '24px', fontWeight: 600, color: '#111418' }}>{profile.data?.fullName}</p><p style={{ margin: '2px 0 0', fontSize: 12, color: '#4E5862' }}>{profile.data?.headline}</p>
                    <p style={{ margin: '16px 0 4px', fontSize: 11, fontWeight: 600, letterSpacing: '.06em', color: '#5F6A74' }}>SUMMARY</p>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: '20px', color: '#2E3338', whiteSpace: 'pre-wrap' }}>{doc.cvSummary}</p></>
                ) : activePart === 'letter' ? (
                  editing ? <textarea aria-label="Cover letter" className="field" rows={14} value={draft.coverLetter} onChange={(e) => setDraft((d) => ({ ...d, coverLetter: e.target.value }))} />
                    : <p style={{ margin: 0, fontSize: 13, lineHeight: '21px', color: '#2E3338', whiteSpace: 'pre-wrap' }}>{doc.coverLetter}</p>
                ) : editing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}><input aria-label="Subject" className="field" value={draft.emailSubject} onChange={(e) => setDraft((d) => ({ ...d, emailSubject: e.target.value }))} /><textarea aria-label="Email body" className="field" rows={12} value={draft.emailBody} onChange={(e) => setDraft((d) => ({ ...d, emailBody: e.target.value }))} /></div>
                ) : (<><p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{doc.emailSubject}</p><p style={{ margin: '12px 0 0', fontSize: 13, lineHeight: '21px', color: '#2E3338', whiteSpace: 'pre-wrap' }}>{doc.emailBody}</p></>)}
                {editing && <div style={{ display: 'flex', gap: 8, marginTop: 14 }}><button type="button" className="cta" disabled={busy} onClick={save} style={{ height: 38, padding: '0 18px', fontSize: 13 }}>Save edits</button><button type="button" className="ghost" onClick={() => setEditing(false)} style={{ height: 38, padding: '0 16px', fontSize: 13 }}>Cancel</button></div>}
                {doc.editedByUser && !editing && <p style={{ margin: '14px 0 0', fontSize: 11, color: '#5F6A74' }}>You edited this draft.</p>}
              </article>
            </div>
          </section>
        )}
      </div>
    </>
  );
};
