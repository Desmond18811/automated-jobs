import { useEffect, useRef, useState, type FC, type KeyboardEvent } from 'react';
import { profileApi } from '@/api';
import { useUserProfile } from '@/context/ProfileContext';
import { useDash } from '../context';
import { Card, ErrorNote, H2, Icon, ICONS, Muted, PageHead, Skeleton, ago, useAsync } from '../ui';

const EDU: Record<string, string> = { high_school: 'High school', associate: 'Associate degree', bachelor: 'Bachelor’s degree', master: 'Master’s degree', doctorate: 'Doctorate', bootcamp: 'Bootcamp', self_taught: 'Self-taught' };
const AUTH: Record<string, string> = { authorized: 'Authorised to work', not_authorized: 'Not authorised' };
const MODES: Array<[string, string]> = [['remote', 'Remote'], ['hybrid', 'Hybrid'], ['onsite', 'On-site'], ['any', 'Any']];

const Tags: FC<{ label: string; items: string[]; onChange: (v: string[]) => void; danger?: boolean }> = ({ label, items, onChange, danger }) => {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState('');
  const commit = () => { const v = text.trim(); if (v && !items.some((i) => i.toLowerCase() === v.toLowerCase())) onChange([...items, v]); setText(''); setAdding(false); };
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } if (e.key === 'Escape') { setAdding(false); setText(''); } };
  return (
    <ul aria-label={label} style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {items.map((t) => (
        <li key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 30, padding: '0 6px 0 12px', borderRadius: 999, background: danger ? '#FEF2F2' : '#F3F6F9', color: danger ? '#9F1239' : '#2E3338', fontSize: 12 }}>
          {t}<button type="button" aria-label={`Remove ${t}`} onClick={() => onChange(items.filter((i) => i !== t))} style={{ border: 0, background: 'transparent', color: 'inherit', width: 20, height: 20, borderRadius: '50%', padding: 0, fontSize: 14, lineHeight: 1 }}>×</button>
        </li>
      ))}
      <li>{adding ? <input autoFocus value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} onBlur={commit} aria-label={`Add to ${label}`} style={{ height: 30, width: 150, padding: '0 12px', border: '1px solid #2563EB', borderRadius: 999, font: 'inherit', fontSize: 12, outline: 'none' }} />
        : <button type="button" onClick={() => setAdding(true)} style={{ height: 30, padding: '0 12px', borderRadius: 999, border: '1px dashed #BFCAD4', background: 'transparent', fontSize: 12, color: '#4E5862' }}>+ Add</button>}</li>
    </ul>
  );
};

export const CvProfileScreen: FC = () => {
  const { notify, refresh } = useDash();
  const { refreshProfile } = useUserProfile();
  const { data: profile, loading, error, reload } = useAsync(() => profileApi.get().then((p) => p?.profile || p), []);
  const fileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [val, setVal] = useState('');
  const [busy, setBusy] = useState(false);
  const [rules, setRules] = useState<any>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [mode, setMode] = useState('any');
  const [floor, setFloor] = useState('');

  useEffect(() => {
    if (!profile) return;
    setRules({ ...profile.rules });
    setRoles(profile.targetRoles ?? []);
    setBlocked(profile.blockedCompanies ?? []);
    setMode(profile.remotePreference ?? 'any');
    setFloor(profile.salaryFloor?.amount ? String(profile.salaryFloor.amount) : '');
  }, [profile]);

  const save = async (patch: Record<string, unknown>, ok: string) => {
    setBusy(true);
    try { await profileApi.update(patch); notify(ok); await reload(); await refreshProfile(); refresh(); return true; }
    catch (e: any) { notify(e?.message || 'Could not save'); return false; } finally { setBusy(false); }
  };

  const upload = async (file: File) => {
    setBusy(true);
    try { await profileApi.uploadCv(file); notify('CV uploaded. Check what we read below.'); await reload(); await refreshProfile(); }
    catch (e: any) { notify(e?.message || 'Could not read that CV'); } finally { setBusy(false); }
  };

  const verify = async () => {
    setBusy(true);
    try { const r = await profileApi.verify(); notify(r.queuedDrafts ? `Profile verified. ${r.queuedDrafts} drafts queued.` : 'Profile verified.'); await reload(); await refreshProfile(); refresh(); }
    catch (e: any) { const missing = e?.data?.details?.missing; notify(missing?.length ? `Still needed: ${missing.join(', ')}` : e?.message || 'Could not verify'); } finally { setBusy(false); }
  };

  const facts: Array<{ key: string; label: string; value: string; raw: any; kind: 'text' | 'number' | 'select'; options?: Array<[string, string]>; apply: (v: string) => Record<string, unknown> }> = profile ? [
    { key: 'name', label: 'Name', value: profile.fullName || '', raw: profile.fullName, kind: 'text', apply: (v) => { const [first, ...rest] = v.trim().split(/\s+/); return { firstName: first || '', lastName: rest.join(' ') }; } },
    { key: 'headline', label: 'Headline', value: profile.headline || '', raw: profile.headline, kind: 'text', apply: (v) => ({ headline: v }) },
    { key: 'email', label: 'Email', value: profile.email || '', raw: profile.email, kind: 'text', apply: (v) => ({ email: v }) },
    { key: 'phone', label: 'Phone', value: profile.phone || '', raw: profile.phone, kind: 'text', apply: (v) => ({ phone: v }) },
    { key: 'location', label: 'Location', value: profile.location || (profile.address?.city ? `${profile.address.city}, ${profile.address.country || ''}` : ''), raw: profile.location || (profile.address?.city ? `${profile.address.city}, ${profile.address.country || ''}` : ''), kind: 'text', apply: (v) => { const parts = v.split(',').map((s) => s.trim()); return { location: v, address: { city: parts[0] || v, country: parts[1] || '' } }; } },
    { key: 'yoe', label: 'Years of experience', value: profile.yearsOfExperience != null ? `${profile.yearsOfExperience} years` : '', raw: profile.yearsOfExperience ?? '', kind: 'number', apply: (v) => ({ yearsOfExperience: Number(v) }) },
    { key: 'edu', label: 'Education', value: EDU[profile.highestEducationLevel] || '', raw: profile.highestEducationLevel, kind: 'select', options: Object.entries(EDU), apply: (v) => ({ highestEducationLevel: v }) },
    { key: 'auth', label: 'Work authorisation', value: AUTH[profile.workAuthorization] || '', raw: profile.workAuthorization, kind: 'select', options: Object.entries(AUTH), apply: (v) => ({ workAuthorization: v }) },
    { key: 'notice', label: 'Notice period', value: profile.noticePeriod || '', raw: profile.noticePeriod, kind: 'text', apply: (v) => ({ noticePeriod: v }) },
  ] : [];
  const filled = facts.filter((f) => f.value).length;

  const skills: string[] = [...(profile?.primarySkills ?? []), ...(profile?.toolsAndFrameworks ?? [])];
  const linksList: Array<{ label: string; url: string }> = [
    ...(profile?.linkedinUrl ? [{ label: 'LinkedIn', url: profile.linkedinUrl }] : []),
    ...(profile?.githubUrl ? [{ label: 'GitHub', url: profile.githubUrl }] : []),
    ...(profile?.portfolioUrl ? [{ label: 'Portfolio', url: profile.portfolioUrl }] : []),
    ...(profile?.twitterUrl ? [{ label: 'X / Twitter', url: profile.twitterUrl }] : []),
    ...((profile?.links as any[]) || []),
  ];
  const exp: any[] = profile?.experience ?? [];
  const rulesDirty = profile && rules && (JSON.stringify(rules) !== JSON.stringify(profile.rules) || JSON.stringify(roles) !== JSON.stringify(profile.targetRoles ?? []) || JSON.stringify(blocked) !== JSON.stringify(profile.blockedCompanies ?? []) || mode !== (profile.remotePreference ?? 'any') || floor !== (profile.salaryFloor?.amount ? String(profile.salaryFloor.amount) : ''));

  const saveRules = () => save({
    targetRoles: roles, blockedCompanies: blocked, remotePreference: mode,
    rules: { dailySendCap: rules.dailySendCap, approvalMode: rules.approvalMode, autoApproveMinScore: rules.autoApproveMinScore, weekdaysOnly: rules.weekdaysOnly },
    ...(floor ? { salaryFloor: { amount: Number(floor), currency: profile.salaryFloor?.currency || 'USD', period: profile.salaryFloor?.period || 'year' } } : {}),
  }, 'Rules saved');

  return (
    <>
      <PageHead title="CV & profile" blurb="J.A.V.I only writes what’s in your profile. Confirm the facts once, set your rules, and every tailored CV is built from them."
        stats={[{ label: 'Facts filled', value: <>{filled}<span style={{ fontSize: 24, color: '#66707A' }}>/{facts.length || 6}</span></> }, { label: 'Remembered answers', value: profile?.answerBank?.length ?? 0 }, { label: 'Status', value: <span style={{ fontSize: 28 }}>{profile?.status === 'verified' ? 'Verified' : 'Draft'}</span> }]} />
      {error && <div style={{ marginTop: 20 }}><ErrorNote message={error} onRetry={reload} /></div>}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 14, marginTop: 30 }}>
        <div style={{ flex: '999 1 520px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card label="Your CV" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14, padding: '16px 18px' }}>
            <span aria-hidden="true" style={{ width: 46, height: 54, flex: 'none', borderRadius: 10, background: '#FEF2F2', color: '#B42318', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 8, fontSize: 11, fontWeight: 700 }}>PDF</span>
            <span style={{ flex: 1, minWidth: 200 }}>
              <span style={{ display: 'block', fontSize: 15, lineHeight: '20px', fontWeight: 500, color: '#1D2226' }}>{profile?.cv?.originalName || 'No CV uploaded yet'}</span>
              <span style={{ display: 'block', fontSize: 12, lineHeight: '17px', color: '#5F6A74' }}>{profile?.cv?.uploadedAt ? `Uploaded ${ago(profile.cv.uploadedAt)}` : 'Upload a PDF or Word CV and J.A.V.I will read your details from it.'}</span>
            </span>
            <button type="button" className="tint" disabled={busy} onClick={() => fileRef.current?.click()} style={{ height: 38, padding: '0 16px', fontSize: 13 }}><Icon d={ICONS.upload} size={15} />&nbsp;{profile?.cv ? 'Upload new CV' : 'Upload CV'}</button>
            <input ref={fileRef} type="file" hidden accept=".pdf,.doc,.docx" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ''; }} />
            {(profile?.cv?.parseWarnings?.length ?? 0) > 0 && <p style={{ flexBasis: '100%', margin: 0, fontSize: 12, color: '#92400E' }}>{profile.cv.parseWarnings.join(' ')}</p>}
          </Card>

          <Card labelledBy="vf-title" style={{ padding: '18px 20px 8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <H2 id="vf-title">Check what we read from your CV</H2>
              <span style={{ marginLeft: 'auto', fontSize: 12, color: '#5F6A74' }}>{filled} of {facts.length} filled</span>
            </div>
            <div aria-hidden="true" style={{ marginTop: 10, height: 6, borderRadius: 999, background: '#EEF2F5' }}><div style={{ width: `${facts.length ? (filled / facts.length) * 100 : 0}%`, height: 6, borderRadius: 999, background: '#0D9488' }} /></div>
            {loading && !profile ? <Skeleton h={220} style={{ margin: '10px 0' }} /> : (
              <dl style={{ margin: '10px 0 0' }}>
                {facts.map((f, i) => (
                  <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', borderBottom: i === facts.length - 1 ? 0 : '1px solid #EEF2F5' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <dt style={{ fontSize: 12, lineHeight: '16px', color: '#5F6A74' }}>{f.label}</dt>
                      <dd style={{ margin: '2px 0 0' }}>
                        {editing === f.key ? (
                          f.kind === 'select' ? <select autoFocus className="field" style={{ height: 36 }} value={val} onChange={(e) => setVal(e.target.value)}><option value="">Choose…</option>{f.options!.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                            : <input autoFocus className="field" style={{ height: 36 }} type={f.kind === 'number' ? 'number' : 'text'} min={0} value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && val && save(f.apply(val), 'Saved').then((ok) => ok && setEditing(null))} />
                        ) : <span style={{ fontSize: 14, lineHeight: '19px', fontWeight: 500, color: f.value ? '#1D2226' : '#B45309' }}>{f.value || 'Not set'}</span>}
                      </dd>
                    </div>
                    {editing === f.key ? (<>
                      <button type="button" className="ghost" onClick={() => setEditing(null)} style={{ height: 32, padding: '0 12px', fontSize: 12 }}>Cancel</button>
                      <button type="button" className="cta" disabled={busy || !val} onClick={() => save(f.apply(val), 'Saved').then((ok) => ok && setEditing(null))} style={{ height: 32, padding: '0 14px', fontSize: 12 }}>Save</button>
                    </>) : (
                      <button type="button" className={f.value ? 'ghost' : 'cta'} onClick={() => { setEditing(f.key); setVal(f.kind === 'select' ? String(f.raw ?? '') : String(f.raw ?? '')); }} style={{ height: 32, padding: '0 14px', fontSize: 12 }}>{f.value ? 'Edit' : 'Add'}</button>
                    )}
                  </div>
                ))}
              </dl>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, padding: '14px 0 12px', borderTop: '1px solid #EEF2F5' }}>
              <Muted style={{ flex: 1, minWidth: 200, margin: 0 }}>{profile?.status === 'verified' ? 'Verified. J.A.V.I builds every draft from this profile.' : 'Nothing is drafted or sent until you verify your profile.'}</Muted>
              {profile?.status !== 'verified' && <button type="button" className="cta" disabled={busy} onClick={verify} style={{ height: 38, padding: '0 18px', fontSize: 13 }}>Verify my profile</button>}
            </div>
          </Card>

          <Card labelledBy="ex-title" style={{ padding: '18px 20px 20px' }}>
            <H2 id="ex-title">Experience & skills</H2>
            {exp.length === 0 ? <Muted style={{ marginTop: 10 }}>Upload your CV to fill in your experience.</Muted> : (
              <ul style={{ listStyle: 'none', margin: '14px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {exp.slice(0, 5).map((e) => (
                  <li key={e.id || `${e.company}${e.title}`} style={{ display: 'flex', gap: 12 }}>
                    <span aria-hidden="true" style={{ width: 38, height: 38, flex: 'none', borderRadius: 12, background: '#EFF6FF', color: '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon d={['M3.5 11.5v2c0 3.77 0 5.66 1.11 6.83C5.71 21.5 7.49 21.5 11.06 21.5h1.88c3.57 0 5.35 0 6.45-1.17 1.11-1.17 1.11-3.06 1.11-6.83v-2']} size={18} /></span>
                    <span><span style={{ display: 'block', fontSize: 14, lineHeight: '19px', fontWeight: 500, color: '#1D2226' }}>{e.title} · {e.company}</span><span style={{ display: 'block', fontSize: 12, lineHeight: '17px', color: '#5F6A74' }}>{[e.start && `${e.start} – ${e.current ? 'present' : e.end || ''}`, e.bullets?.[0]?.text].filter(Boolean).join(' · ')}</span></span>
                  </li>
                ))}
              </ul>
            )}
            {skills.length > 0 && (<><p style={{ margin: '18px 0 8px', fontSize: 12, color: '#5F6A74' }}>Skills J.A.V.I may mention</p>
              <ul aria-label="Skills" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: 6 }}>{skills.map((s) => <li key={s} style={{ height: 30, display: 'inline-flex', alignItems: 'center', padding: '0 12px', borderRadius: 999, background: '#F3F6F9', fontSize: 12, color: '#2E3338' }}>{s}</li>)}</ul></>)}
            {linksList.length > 0 && (
              <>
                <p style={{ margin: '18px 0 8px', fontSize: 12, color: '#5F6A74' }}>Links & profiles</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {linksList.map((l) => (
                    <a key={l.url} href={l.url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 30, padding: '0 12px', borderRadius: 999, background: '#EFF6FF', color: '#1D4ED8', fontSize: 12, textDecoration: 'none', fontWeight: 500 }}>
                      {l.label}: {l.url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 30)}
                    </a>
                  ))}
                </div>
              </>
            )}
          </Card>
        </div>

        <Card labelledBy="rl-title" style={{ flex: '1 1 420px', minWidth: 0, padding: '20px 22px 22px' }}>
          <H2 id="rl-title">Preferences & rules</H2>
          <Muted style={{ fontSize: 13 }}>What J.A.V.I applies to, and how hard it pushes.</Muted>
          {!rules ? <Skeleton h={300} style={{ marginTop: 20 }} /> : (<>
            <p style={{ margin: '20px 0 8px', fontSize: 13, fontWeight: 500, color: '#1D2226' }}>Target roles</p>
            <Tags label="Target roles" items={roles} onChange={setRoles} />

            <label style={{ display: 'block', marginTop: 22 }}>
              <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, lineHeight: '18px' }}><span style={{ fontWeight: 500, color: '#1D2226' }}>Minimum match to auto-send</span><span style={{ fontWeight: 600 }}>{Math.round(rules.autoApproveMinScore * 100)}%</span></span>
              <input type="range" min={50} max={100} step={5} value={Math.round(rules.autoApproveMinScore * 100)} onChange={(e) => setRules({ ...rules, autoApproveMinScore: Number(e.target.value) / 100 })} />
              <span style={{ display: 'block', fontSize: 12, lineHeight: '16px', color: '#5F6A74' }}>Roles below this wait for your review instead of sending.</span>
            </label>
            <label style={{ display: 'block', marginTop: 20 }}>
              <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, lineHeight: '18px' }}><span style={{ fontWeight: 500, color: '#1D2226' }}>Daily send cap</span><span style={{ fontWeight: 600 }}>{rules.dailySendCap} a day</span></span>
              <input type="range" min={1} max={50} step={1} value={rules.dailySendCap} onChange={(e) => setRules({ ...rules, dailySendCap: Number(e.target.value) })} />
              <span style={{ display: 'block', fontSize: 12, lineHeight: '16px', color: '#5F6A74' }}>Sent between {rules.sendingHours?.start}:00 and {rules.sendingHours?.end}:00 so it never looks automated.</span>
            </label>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 20 }}>
              <label style={{ flex: '1 1 160px', minWidth: 0 }}><span style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#1D2226' }}>Salary floor ({profile?.salaryFloor?.currency || 'USD'} / year)</span>
                <input className="field" inputMode="numeric" value={floor} onChange={(e) => setFloor(e.target.value.replace(/\D/g, ''))} placeholder="e.g. 60000" style={{ marginTop: 8 }} /></label>
              <div style={{ flex: '1 1 220px', minWidth: 0 }}><span id="wm" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#1D2226' }}>Work mode</span>
                <div role="radiogroup" aria-labelledby="wm" style={{ marginTop: 8, display: 'flex', gap: 2, padding: 2, borderRadius: 999, background: '#F1F4F7' }}>
                  {MODES.map(([v, l]) => <button key={v} type="button" role="radio" aria-checked={mode === v} onClick={() => setMode(v)} style={{ flex: 1, height: 38, border: 0, borderRadius: 999, fontSize: 13, background: mode === v ? '#fff' : 'transparent', color: mode === v ? '#111418' : '#3E4851', fontWeight: mode === v ? 500 : 400, boxShadow: mode === v ? '0 1px 3px rgba(16,24,40,.1)' : 'none' }}>{l}</button>)}
                </div></div>
            </div>

            <p style={{ margin: '20px 0 8px', fontSize: 13, fontWeight: 500, color: '#1D2226' }}>Never apply to</p>
            <Tags label="Never apply to" items={blocked} onChange={setBlocked} danger />

            <ul style={{ listStyle: 'none', margin: '22px 0 0', padding: 0, borderTop: '1px solid #EEF2F5' }}>
              {([['Review drafts before sending', 'Off lets J.A.V.I send matches above your bar on its own. You must approve a few drafts first.', rules.approvalMode === 'review', (on: boolean) => setRules({ ...rules, approvalMode: on ? 'review' : 'auto' })], ['Weekdays only', 'Skip sending on weekends', rules.weekdaysOnly, (on: boolean) => setRules({ ...rules, weekdaysOnly: on })]] as const).map(([t, d, on, set], i) => (
                <li key={t} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', borderBottom: i === 0 ? '1px solid #EEF2F5' : 0 }}>
                  <span style={{ flex: 1 }}><span style={{ display: 'block', fontSize: 13, lineHeight: '18px', fontWeight: 500, color: '#1D2226' }}>{t}</span><span style={{ display: 'block', fontSize: 12, lineHeight: '16px', color: '#5F6A74' }}>{d}</span></span>
                  <button type="button" role="switch" aria-checked={on} aria-label={t} onClick={() => set(!on)} style={{ position: 'relative', width: 42, height: 26, flex: 'none', border: 0, borderRadius: 999, background: on ? '#0D9488' : '#CBD3DA', padding: 0 }}><span aria-hidden="true" style={{ position: 'absolute', top: 4, [on ? 'right' : 'left']: 4, width: 18, height: 18, borderRadius: '50%', background: '#fff' }} /></button>
                </li>
              ))}
            </ul>
            <button type="button" className="cta" disabled={busy || !rulesDirty} onClick={saveRules} style={{ marginTop: 20, width: '100%', height: 46, fontSize: 14 }}>{rulesDirty ? 'Save rules' : 'Rules saved'}</button>
          </>)}
        </Card>
      </div>
    </>
  );
};
