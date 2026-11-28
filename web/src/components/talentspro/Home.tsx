import { useEffect, useMemo, useState, type FC } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { applicationsApi, jobsApi, profileApi } from '@/api';
import { useTp } from './Shell';
import { Icon, initialsOf } from './icons';
import { SENT, STAGE_BADGE, ago, asList, jobOf, money, stageOf, toPct, useAsync, type Stage } from './data';
import { AddJob } from './AddJob';
import { Badge, CardHead, EmptyState, IconCircle, Logo, Skeleton, cardStyle, ghostBtn, primaryBtn } from './parts';

const PLANS = {
  pro: {
    name: 'Pro',
    price: '$29/mo',
    desc: 'Automated job applications & AI CV tailoring.',
    perks: ['Unlimited tailored CVs', 'Daily automated applications', 'Auto-fill screening answers'],
  },
  pro_max: {
    name: 'Pro Max',
    price: '$69/mo',
    desc: 'High-speed application queue with recruiter outreach.',
    perks: ['Everything in Pro', 'Direct recruiter email outreach', 'Priority application queueing'],
  },
  enterprise: {
    name: 'Enterprise',
    price: 'Custom',
    desc: 'Dedicated executive talent agent with custom ATS pipelines.',
    perks: ['Everything in Pro Max', 'Dedicated talent manager', 'Custom ATS bypass integrations'],
  },
} as const;

const STEPS = [
  { key: 'general', label: 'General info', ok: (p: any) => !!(p.fullName && p.headline), sub: (p: any) => p.headline || 'Name and headline' },
  { key: 'skills', label: 'Skills', ok: (p: any) => (p.primarySkills?.length || 0) > 0, sub: (p: any) => `${(p.primarySkills?.length || 0) + (p.secondarySkills?.length || 0)} added` },
  { key: 'experience', label: 'Experience', ok: (p: any) => (p.experience?.length || 0) > 0, sub: (p: any) => `${p.experience?.length || 0} roles` },
  { key: 'prefs', label: 'Preferences', ok: (p: any) => (p.targetRoles?.length || 0) > 0 && (p.locations?.length || 0) > 0, sub: (p: any) => ((p.targetRoles?.length || 0) > 0 ? 'Add locations' : 'Up next') },
];

const Orb: FC<{ halo?: boolean }> = ({ halo = true }) => (
  <svg viewBox="0 0 240 210" width="100%" height="100%" aria-hidden="true">
    <defs>
      <radialGradient id="tpHalo"><stop offset="0" stopColor="#C9D8FF" stopOpacity=".75" /><stop offset="1" stopColor="#C9D8FF" stopOpacity="0" /></radialGradient>
      <radialGradient id="tpShade"><stop offset="0" stopColor="#2457E8" stopOpacity=".28" /><stop offset="1" stopColor="#2457E8" stopOpacity="0" /></radialGradient>
      <radialGradient id="tpOrb" cx="34%" cy="28%" r="78%">
        <stop offset="0" stopColor="#D6E2FF" /><stop offset=".3" stopColor="#8EADFC" /><stop offset=".66" stopColor="#4672F2" /><stop offset="1" stopColor="#2148CF" />
      </radialGradient>
    </defs>
    {halo && <circle cx="120" cy="108" r="104" fill="url(#tpHalo)" />}
    {halo && <ellipse cx="122" cy="196" rx="84" ry="11" fill="url(#tpShade)" />}
    {[[60, 84, 24], [186, 82, 26], [96, 66, 34], [150, 64, 36], [70, 122, 38], [172, 120, 40], [120, 112, 50], [122, 156, 32]].map(([cx, cy, r], i) => (
      <circle key={i} cx={cx} cy={cy} r={r} fill="url(#tpOrb)" />
    ))}
  </svg>
);

export const Home: FC = () => {
  const { firstName, me, openCalendar } = useTp();
  const nav = useNavigate();
  const [stageFilter, setStageFilter] = useState<Stage | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const apps = useAsync(() => applicationsApi.list({ limit: 100 } as any), []);
  const prof = useAsync(() => profileApi.get(), []);
  const jobs = useAsync(() => jobsApi.list({ limit: 4 }), []);
  const ints = useAsync(() => applicationsApi.interviews(), []);

  const all = useMemo(() => asList(apps.data, 'applications'), [apps.data]);
  const profile: any = (prof.data as any)?.profile || prof.data || {};
  const sent = all.filter((a) => SENT.includes(a.status));
  const counts = { submitted: 0, review: 0, interview: 0 } as Record<Stage, number>;
  sent.forEach((a) => (counts[stageOf(a.status)] += 1));
  const interviews = asList(ints.data, 'interviews').map((r: any) => ({ ...r, jobId: r.job, updatedAt: r.since }));
  const successful = ints.data?.counts?.successful ?? 0;

  const recs = useMemo(() => {
    const fromApps = all
      .filter((a) => jobOf(a).title && ['discovered', 'matched', 'drafted', 'approved', 'needs_user'].includes(a.status))
      .sort((a, b) => (toPct(b.score) ?? 0) - (toPct(a.score) ?? 0))
      .slice(0, 4)
      .map((a) => ({ id: a._id, job: jobOf(a), match: toPct(a.score) }));
    if (fromApps.length) return fromApps;
    return asList(jobs.data, 'jobs').slice(0, 4).map((j) => ({ id: j._id, job: j, match: null as number | null }));
  }, [all, jobs.data]);

  const steps = STEPS.map((s) => ({ ...s, done: s.ok(profile) }));
  const doneCount = steps.filter((s) => s.done).length;
  const pct = Math.round((doneCount / steps.length) * 100);
  const current = steps.findIndex((s) => !s.done);

  const loading = apps.loading || prof.loading;
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const total = counts.submitted + counts.review + counts.interview;
  const seg = (n: number) => Math.max(n, 0);

  const [activePlanKey, setActivePlanKey] = useState<'pro' | 'pro_max' | 'enterprise'>('pro');

  useEffect(() => {
    const p = profile?.rules?.plan;
    if (p && ['pro', 'pro_max', 'enterprise'].includes(p)) setActivePlanKey(p);
  }, [profile?.rules?.plan]);

  const currentPlan = PLANS[activePlanKey] || PLANS.pro;

  const interviewItems = interviews.slice(0, 4);

  return (
    <main className="tp-home" style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 110px)' }}>
      <section style={{ display: 'flex', flexWrap: 'wrap', gap: '36px 40px', alignItems: 'flex-start', marginTop: 'clamp(40px, 11vh, 120px)' }}>
        <div style={{ flex: '1 1 420px', padding: '14px 0 0 8px' }}>
          <h1 className="tp-greet" style={{ margin: 0, fontSize: 38, lineHeight: 1.16, letterSpacing: '-.028em', fontWeight: 400, maxWidth: 580 }}>
            Welcome <b style={{ fontWeight: 600 }}>{firstName}</b>, here's <span style={{ fontWeight: 500 }}>how things stand today!</span>
          </h1>
          <p style={{ margin: '14px 0 0', fontSize: 13, color: '#606979' }}>Today is {today}</p>
          <div style={{ display: 'flex', gap: 10, marginTop: 34, flexWrap: 'wrap' }}>
            <button type="button" className="tp-btn-primary" onClick={() => setAdding(true)} style={{ ...primaryBtn, color: '#fff', gap: 8 }}><Icon name="plus" size={16} />Add a job</button>
            <button type="button" className="tp-btn-ghost" onClick={openCalendar} style={ghostBtn}>Calendar</button>
          </div>
        </div>

        <div style={{ flex: '1 1 540px', position: 'relative' }}>
          <div className="tp-illus tp-float" style={{ position: 'absolute', right: 4, top: -36, width: 230, height: 200 }}><Orb /></div>
          <div className="tp-pr-illus" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ width: 46, height: 46, borderRadius: '50%', background: '#DCE6FF', color: '#1746C7', border: '2px solid #fff', fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 46px', boxShadow: '0 6px 16px -8px rgba(23,25,31,.35)' }}>
              {initialsOf(me?.name || me?.email || firstName)}
            </span>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500, letterSpacing: '-.015em' }}>{pct === 100 ? 'Your profile is complete' : 'Complete your profile!'}</h2>
              <p style={{ margin: '4px 0 0', fontSize: 13, lineHeight: 1.5, color: '#606979' }}>Update your profile and get access to more opportunities.</p>
            </div>
          </div>

          <div style={{ position: 'relative', marginTop: 64, background: 'rgba(255,255,255,.84)', border: '1px solid #fff', borderRadius: 24, padding: '20px 8px 8px', boxShadow: '0 1px 2px rgba(23,25,31,.04),0 18px 40px -24px rgba(36,87,232,.3)' }}>
            <div style={{ position: 'absolute', left: 22, right: 74, top: 9, height: 4, borderRadius: 4, background: '#E9EEF5' }}>
              <div className="tp-grow" style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: 'linear-gradient(90deg,#A7C0FA,#2457E8)' }} />
              <div style={{ position: 'absolute', left: `${pct}%`, top: -34, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ background: '#17191F', color: '#fff', fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 999, whiteSpace: 'nowrap' }}>{pct}% complete</span>
                <span style={{ width: 2, height: 14, background: '#17191F' }} />
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2457E8', border: '2px solid #fff', marginTop: -2 }} />
              </div>
            </div>
            <div className="tp-steps" style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
              {loading
                ? [0, 1, 2, 3].map((i) => <div key={i} style={{ flex: '1 1 128px', padding: 8 }}><Skeleton h={30} r={15} /></div>)
                : steps.map((s, i) => (
                    <Link key={s.key} to="/setup?edit=1" style={{ flex: '1 1 128px', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 20, background: i === current ? '#EDF3FF' : 'transparent', color: '#17191F', minWidth: 0 }}>
                      <span style={{ width: 30, height: 30, flex: '0 0 30px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: s.done ? '#2457E8' : i === current ? '#fff' : '#F1F4F8', border: s.done ? 0 : i === current ? '2px solid #2457E8' : '1px solid #E3E8F0', color: '#fff' }}>
                        {s.done ? <Icon name="check" size={16} /> : <span style={{ width: i === current ? 8 : 6, height: i === current ? 8 : 6, borderRadius: '50%', background: i === current ? '#2457E8' : '#B7BFCA' }} />}
                      </span>
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</span>
                        <span style={{ display: 'block', fontSize: 11, color: '#606979', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.done ? s.sub(profile) : i === current ? 'Up next' : 'To do'}</span>
                      </span>
                    </Link>
                  ))}
              <button type="button" aria-label="Continue profile setup" className="tp-icon-btn" onClick={() => nav('/setup?edit=1')} style={{ width: 48, height: 48, borderRadius: '50%', border: '1px solid #E3E9F2', background: '#fff', color: '#17191F', marginLeft: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="arrowRight" size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16, marginTop: 'clamp(32px, 8vh, 88px)', alignItems: 'stretch' }}>
        <div className="tp-card" style={{ ...cardStyle, gap: 10, minHeight: 380 }}>
          <CardHead
            title={<>Interviews <span style={{ fontWeight: 400, color: '#606979' }}>{ints.loading ? '' : interviews.length}</span></>}
            to="/dash/applications?stage=interview"
          />
          {ints.loading ? (
            [0, 1, 2].map((i) => <Skeleton key={i} h={68} r={20} />)
          ) : interviewItems.length === 0 ? (
            <EmptyState icon="camera" title="No interviews yet" body="When a recruiter replies and an interview starts, it is tracked here." cta={{ to: '/dash/jobs', label: 'Find jobs' }} />
          ) : (
            interviewItems.map((a: any) => {
              const j = jobOf(a);
              return (
                <Link key={String(a._id)} to={`/dash/applications?q=${encodeURIComponent(j.company || j.title || '')}`} className="tp-lift" style={{ background: '#fff', borderRadius: 20, padding: '12px 16px', minHeight: 68, display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 3px rgba(23,25,31,.04)', color: '#17191F' }}>
                  <IconCircle name="camera" size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.title || 'Interview'}</div>
                    <div style={{ fontSize: 12, color: '#606979', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>{j.company}</div>
                  </div>
                  <span style={{ background: '#2457E8', color: '#fff', fontSize: 12, fontWeight: 600, padding: '6px 13px', borderRadius: 999, whiteSpace: 'nowrap', flexShrink: 0 }}>{ago(a.updatedAt)}</span>
                </Link>
              );
            })
          )}
          <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#606979', padding: '6px 6px 0' }}>
            <span>Successful applications</span>
            <strong style={{ color: '#17191F' }}>{ints.loading ? '–' : successful}</strong>
          </div>
        </div>

        <div className="tp-card" style={{ ...cardStyle, gap: 14, minHeight: 380 }}>
          <CardHead title="Job Applications" to="/dash/applications" />
          {loading ? (
            <Skeleton h={90} r={18} />
          ) : (
            <>
              <div style={{ background: '#fff', borderRadius: 20, padding: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                <IconCircle name="tray" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 30, fontWeight: 500, letterSpacing: '-.03em', lineHeight: 1 }}>{total}</div>
                  <div style={{ fontSize: 12, color: '#606979', marginTop: 4 }}>Applications sent</div>
                </div>
                <Link to="/dash/applications" aria-label="Open applications" className="tp-icon-btn" style={{ width: 44, height: 44, borderRadius: '50%', border: '1px solid #E3E9F2', color: '#17191F', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="arrow" size={16} />
                </Link>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
                {(['submitted', 'review', 'interview'] as Stage[]).map((k) => (
                  <button key={k} type="button" className="tp-stage" onClick={() => setStageFilter(stageFilter === k ? null : k)} style={{ border: 0, textAlign: 'center', padding: '6px 4px', borderRadius: 14, background: stageFilter === k ? '#EAF1FF' : 'transparent' }}>
                    <div style={{ fontSize: 18, fontWeight: 500, letterSpacing: '-.02em', color: stageFilter === k ? '#2457E8' : '#17191F' }}>{counts[k]}</div>
                    <div style={{ fontSize: 11, color: '#606979' }}>{{ submitted: 'Submitted', review: 'In review', interview: 'Interviews' }[k]}</div>
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 4, height: 14, marginTop: 4 }}>
                {([['submitted', '#D6E1F5'], ['review', '#E4E9F1'], ['interview', 'repeating-linear-gradient(90deg,#C6D1E1 0 2px,rgba(198,209,225,0) 2px 6px)']] as [Stage, string][]).map(([k, c]) => (
                  <div key={k} className="tp-grow" style={{ flex: `${seg(counts[k]) || 0.0001} 1 0px`, minWidth: counts[k] ? 18 : 0, borderRadius: 10, background: stageFilter === k ? '#2457E8' : c }} />
                ))}
                {total === 0 && <div style={{ flex: 1, borderRadius: 10, background: '#EDF1F6' }} />}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#606979', padding: '0 4px' }}>
                <span>{stageFilter ? `Filtered: ${stageFilter} (${counts[stageFilter]})` : 'Select a stage to filter'}</span>
                <Link to={`/dash/applications${stageFilter ? `?stage=${stageFilter}` : ''}`} style={{ fontWeight: 500 }}>View list</Link>
              </div>
            </>
          )}
        </div>

      </section>

      <section style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 16, alignItems: 'stretch', flex: '1 0 auto' }}>
        <div className="tp-card" style={{ ...cardStyle, flex: '1.35 1 560px', gap: 14 }}>
          <CardHead title="Recommended Jobs" to="/dash/jobs" extra={<button type="button" onClick={() => setAdding(true)} className="tp-btn-primary" style={{ ...primaryBtn, height: 36, padding: '0 14px', fontSize: 12, gap: 6 }}><Icon name="plus" size={14} />Add job</button>} />
          <div className="tp-jobs-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 10 }}>
            {apps.loading ? (
              [0, 1].map((i) => <Skeleton key={i} h={96} r={20} />)
            ) : recs.length === 0 ? (
              <div style={{ gridColumn: '1/-1' }}><EmptyState icon="briefcase" title="No matches yet" body="Matches appear here as soon as J.A.V.I finds roles that fit your profile." cta={{ to: '/setup?edit=1', label: 'Review preferences' }} /></div>
            ) : (
              recs.map(({ id, job: j, match }) => (
                <div key={id} className="tp-lift" style={{ background: '#fff', borderRadius: 20, padding: 12, display: 'flex', flexDirection: 'column', gap: 8, boxShadow: '0 1px 2px rgba(23,25,31,.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Logo name={j.company || j.title} size={38} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.title}</div>
                      <div style={{ fontSize: 12, color: '#606979', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{[j.company, j.location].filter(Boolean).join(' · ')}</div>
                    </div>
                    <Link to="/dash/applications" aria-label="View" className="tp-icon-btn" style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid #E3E9F2', color: '#17191F', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="arrow" size={14} />
                    </Link>
                  </div>
                  {(match !== null || money(j.salary)) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#606979' }}>
                      {match !== null && (
                        <>
                          <div style={{ flex: 1, height: 5, borderRadius: 5, background: '#EEF2F7' }}><div style={{ width: `${match}%`, height: '100%', borderRadius: 5, background: 'linear-gradient(90deg,#A7C0FA,#2457E8)' }} /></div>
                          <span style={{ fontWeight: 500, color: '#17191F' }}>{match}%</span>
                        </>
                      )}
                      {money(j.salary) && <span style={{ marginLeft: 'auto' }}>{money(j.salary)}</span>}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
        <div className="tp-card" style={{ ...cardStyle, flex: '1 1 380px', gap: 14 }}>
          <CardHead
            title="Payment & Plan"
            extra={
              <span style={{ fontSize: 11, fontWeight: 600, color: '#10B981', background: '#E6F9F0', padding: '4px 10px', borderRadius: 999, border: '1px solid #C1F1DC' }}>
                Active Plan
              </span>
            }
          />
          {prof.loading ? (
            <Skeleton h={140} r={20} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ background: '#fff', borderRadius: 20, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 1px 3px rgba(23,25,31,.04)' }}>
                <span style={{ width: 44, height: 44, borderRadius: '50%', background: activePlanKey === 'enterprise' ? '#FFFBEB' : activePlanKey === 'pro_max' ? '#F5F3FF' : '#EFF6FF', color: activePlanKey === 'enterprise' ? '#B45309' : activePlanKey === 'pro_max' ? '#7C3AED' : '#2457E8', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name="card" size={20} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16, fontWeight: 600, color: '#17191F' }}>{currentPlan.name} Plan</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#2457E8', background: '#EEF4FF', padding: '2px 8px', borderRadius: 999 }}>{currentPlan.price}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#606979', marginTop: 3 }}>Billed monthly · Renews automatically</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, background: '#EDF1F7', padding: 4, borderRadius: 14 }}>
                {(['pro', 'pro_max', 'enterprise'] as const).map((pk) => {
                  const isCurrent = activePlanKey === pk;
                  return (
                    <button
                      key={pk}
                      type="button"
                      onClick={async () => {
                        setActivePlanKey(pk);
                        try {
                          await profileApi.update({ plan: pk });
                          prof.reload();
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                      style={{
                        border: 0,
                        borderRadius: 12,
                        padding: '8px 4px',
                        background: isCurrent ? '#fff' : 'transparent',
                        color: isCurrent ? '#17191F' : '#606979',
                        fontWeight: isCurrent ? 600 : 500,
                        fontSize: 12,
                        cursor: 'pointer',
                        boxShadow: isCurrent ? '0 1px 3px rgba(23,25,31,.08)' : 'none',
                        transition: 'background-color .2s ease, color .2s ease, box-shadow .2s ease',
                      }}
                    >
                      {PLANS[pk].name}
                    </button>
                  );
                })}
              </div>

              <div style={{ background: '#fff', borderRadius: 20, padding: '12px 14px', fontSize: 12, color: '#4B5565', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {currentPlan.perks.map((perk, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#2457E8', display: 'inline-flex' }}><Icon name="check" size={14} sw={2.2} /></span>
                    <span>{perk}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
      {adding && <AddJob onClose={() => setAdding(false)} onDone={() => { setAdding(false); jobs.reload(); apps.reload(); }} />}
    </main>
  );
};

export { Badge, STAGE_BADGE };
