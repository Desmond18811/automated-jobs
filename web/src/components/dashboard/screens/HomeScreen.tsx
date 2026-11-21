import { useMemo, useState, type FC, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { analyticsApi, applicationsApi, jobsApi, notificationsApi, profileApi, tasksApi } from '@/api';
import { useDash } from '../context';
import { Card, EmptyNote, ErrorNote, H2, Icon, ICONS, Logo, Muted, Skeleton, Sparkle, asList, ago, useAsync } from '../ui';

const DAY = 864e5;

const REASON_LABEL: Record<string, string> = {
  unknown_question: 'Custom question', salary_question: 'Salary question', captcha: 'Verification', login_wall: 'Login wall',
  interview_invite: 'Interview invite', assisted_platform: 'Apply by hand', confirm_submission: 'Confirm submission',
  no_form_found: 'No form found', reconnect_gmail: 'Reconnect Gmail',
};
const REASON_ACTION: Record<string, string> = { captcha: 'Solve', login_wall: 'Sign in', unknown_question: 'Answer', salary_question: 'Answer', reconnect_gmail: 'Reconnect' };

interface HomeData {
  funnel: any;
  apps: any[];
  tasks: any[];
  jobsTotal: number;
  notes: any[];
  profile: any;
}

async function loadHome(): Promise<HomeData> {
  const [funnel, apps, tasks, jobs, notes, profile] = await Promise.all([
    analyticsApi.getFunnel().catch(() => null),
    applicationsApi.list({ limit: 100 }).catch(() => null),
    tasksApi.list().catch(() => null),
    jobsApi.list({ limit: 1 }).catch(() => null),
    notificationsApi.list({ limit: 4 }).catch(() => null),
    profileApi.get().catch(() => null),
  ]);
  return {
    funnel,
    apps: asList(apps, 'applications'),
    tasks: asList(tasks, 'tasks').filter((t: any) => t.status === 'open'),
    jobsTotal: jobs?.total ?? jobs?.jobs?.length ?? 0,
    notes: asList(notes, 'notifications'),
    profile: profile?.profile || profile,
  };
}

/** Semicircle gauge: grey track, blue progress. */
const Gauge: FC<{ value: number; goal: number }> = ({ value, goal }) => {
  const p = goal > 0 ? Math.min(1, value / goal) : 0;
  const cx = 150, cy = 152, r = 144;
  const pt = (frac: number) => `${(cx - r * Math.cos(frac * Math.PI)).toFixed(2)} ${(cy - r * Math.sin(frac * Math.PI)).toFixed(2)}`;
  return (
    <div style={{ position: 'relative', width: 300, maxWidth: '100%', height: 162, margin: '22px auto 0' }}>
      <svg width="300" height="162" viewBox="0 0 300 162" role="img" aria-label={`${value} of ${goal} applications sent this week`} style={{ display: 'block', maxWidth: '100%', height: 'auto', overflow: 'visible' }}>
        <path d={`M6 152A144 144 0 0 1 294 152`} fill="none" stroke="#DDE3E8" strokeWidth="4" strokeLinecap="round" />
        {p > 0 && <path d={`M6 152A144 144 0 0 1 ${pt(p)}`} fill="none" stroke="#2563EB" strokeWidth="11" strokeLinecap="round" />}
      </svg>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 84, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 44, lineHeight: '46px', letterSpacing: '-0.02em', color: '#1D2226' }}>{value}<span style={{ fontSize: 22, color: '#66707A' }}>/{goal}</span></span>
        <span style={{ fontSize: 13, lineHeight: '16px', color: '#5F6A74' }}>Applications sent</span>
      </div>
    </div>
  );
};

export const HomeScreen: FC = () => {
  const nav = useNavigate();
  const { version, notify, refresh } = useDash();
  const { data, loading, error, reload } = useAsync(loadHome, [version]);
  const [ask, setAsk] = useState('');
  const [autoBusy, setAutoBusy] = useState(false);

  const derived = useMemo(() => {
    if (!data) return null;
    const c = data.funnel?.counts ?? {};
    const rules = data.profile?.rules ?? {};
    const cap = rules.dailySendCap ?? 15;
    const goal = cap * (rules.weekdaysOnly === false ? 7 : 5);
    const weekAgo = Date.now() - 7 * DAY;
    const sentAt = (a: any) => (a.history || []).find((h: any) => h.to === 'sent')?.at || a.delivery?.sentAt;
    const sentThisWeek = data.apps.filter((a) => { const t = sentAt(a); return t && new Date(t).getTime() >= weekAgo; }).length;
    const since = new Date(); since.setHours(0, 0, 0, 0);
    const today = data.apps.filter((a) => new Date(a.createdAt).getTime() >= since.getTime());
    const stages = (s: string[]) => today.filter((a) => s.includes(a.status)).length;
    const sentTotal = (c.sent ?? 0) + (c.replied ?? 0) + (c.interview ?? 0) + (c.offer ?? 0) + (c.hired ?? 0);
    return {
      cap, goal, sentThisWeek, sentTotal,
      tailored: (c.drafted ?? 0) + (c.approved ?? 0) + sentTotal,
      interviews: (c.interview ?? 0) + (c.offer ?? 0) + (c.hired ?? 0),
      todayFound: today.length,
      todayMatched: today.filter((a) => a.status !== 'discovered').length,
      todayDrafted: stages(['drafted', 'approved', 'sent', 'replied', 'interview', 'offer', 'hired']),
      todaySent: stages(['sent', 'replied', 'interview', 'offer', 'hired']),
      auto: rules.approvalMode === 'auto',
      interviewApps: data.apps.filter((a) => a.status === 'interview'),
    };
  }, [data]);

  const toggleAuto = async () => {
    if (!data || !derived) return;
    setAutoBusy(true);
    try {
      await profileApi.update({ rules: { approvalMode: derived.auto ? 'review' : 'auto' } });
      notify(derived.auto ? 'Auto-apply paused. New drafts wait for your review.' : 'Auto-apply is on.');
      refresh();
    } catch (e: any) {
      notify(e?.message || 'Could not change auto-apply');
    } finally {
      setAutoBusy(false);
    }
  };

  const submitAsk = (e: FormEvent) => {
    e.preventDefault();
    nav(`/dash/ask${ask.trim() ? `?q=${encodeURIComponent(ask.trim())}` : ''}`);
  };

  const p = data?.profile;
  const first = p?.firstName || (p?.fullName ? String(p.fullName).split(' ')[0] : '');
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const dateLine = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
  const stat = (v?: number) => (loading && !data ? '–' : String(v ?? 0).padStart(2, '0'));

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 14 }}>
      <aside aria-label="Assistant and weekly goal" style={{ flex: '0 1 336px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14, width: '100%', maxWidth: 420 }}>
        <section aria-label="Ask J.A.V.I" className="card" style={{ minHeight: 460, display: 'flex', flexDirection: 'column', padding: '14px 16px', background: 'radial-gradient(420px 320px at 100% 0%,rgba(37,99,235,.12) 0%,rgba(20,184,166,.07) 45%,rgba(20,184,166,0) 75%),#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span aria-hidden="true" style={{ width: 44, height: 44, flex: 'none', borderRadius: '50%', background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Sparkle /></span>
            <span style={{ fontSize: 14, fontWeight: 500 }}>Ask J.A.V.I</span>
            <Link to="/dash/ask" aria-label="Expand Ask J.A.V.I" className="ghost" style={{ marginLeft: 'auto', width: 36, height: 36, color: '#141414' }}><Icon d={ICONS.expand} sw={1.8} /></Link>
          </div>
          <h2 style={{ margin: 'auto 0 0', fontSize: 24, lineHeight: '32px', fontWeight: 400, letterSpacing: '-0.01em', color: '#2A2F35' }}>
            Ready To Land Top <strong style={{ fontWeight: 500, color: '#111418' }}>Jobs</strong> Or Revisit Your Pipeline?
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 26 }}>
            {[['/dash/jobs?add=1', 'Add jobs', ICONS.link], ['/dash/drafts', 'Review drafts', ICONS.doc], ['/dash/business', 'Find leads', ICONS.pin]].map(([to, label, d]) => (
              <Link key={to as string} to={to as string} className="ghost" style={{ height: 32, padding: '0 10px', fontSize: 11, color: '#3E4851' }}>
                <Icon d={d as any} size={15} />{label as string}
              </Link>
            ))}
          </div>
          <form onSubmit={submitAsk} style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 30 }}>
            <label style={{ flex: 1, minWidth: 0, height: 46, display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', borderRadius: 999, background: '#F3F6F9' }}>
              <Icon d={ICONS.plus} sw={2} />
              <span className="sr">Ask J.A.V.I</span>
              <input value={ask} onChange={(e) => setAsk(e.target.value)} placeholder="Ask me anything..." style={{ flex: 1, minWidth: 0, border: 0, outline: 'none', background: 'transparent', font: 'inherit', fontSize: 14, padding: 0 }} />
            </label>
          </form>
        </section>

        <Card labelledBy="wg-title" style={{ padding: '16px 18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 40 }}>
            <H2 id="wg-title">Weekly goal</H2>
            <Link to="/dash/profile" aria-label="Change weekly goal in your rules" className="ghost" style={{ width: 40, height: 40, color: '#141414' }}><Icon d={['M17 7 6 18', 'M11 6.13s5.64-.48 6.46.34c.82.82.34 6.46.34 6.46']} sw={1.8} /></Link>
          </div>
          {derived ? (
            <>
              <Gauge value={derived.sentThisWeek} goal={derived.goal} />
              <p style={{ margin: '14px 0 0', textAlign: 'center', fontSize: 12, lineHeight: '16px', color: '#5F6A74' }}>
                {Math.max(0, derived.goal - derived.sentThisWeek)} to go · based on your {derived.cap} a day cap
              </p>
            </>
          ) : <Skeleton h={162} style={{ marginTop: 22 }} />}
        </Card>
      </aside>

      <div style={{ flex: '999 1 560px', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, padding: '22px 56px 0 24px' }}>
          <div>
            <p style={{ margin: 0, fontSize: 13, lineHeight: '18px', color: '#5F6A74' }}>{dateLine}</p>
            <h1 style={{ margin: '2px 0 0', fontSize: 28, lineHeight: '36px', fontWeight: 500, letterSpacing: '-0.02em', color: '#111418' }}>{greeting}{first ? `, ${first}` : ''}</h1>
            <button type="button" role="switch" aria-checked={!!derived?.auto} disabled={!derived || autoBusy} onClick={toggleAuto}
              style={{ marginTop: 14, height: 40, display: 'inline-flex', alignItems: 'center', gap: 10, padding: '0 16px 0 6px', border: '1px solid #E3E9EE', borderRadius: 999, background: '#fff', fontSize: 13, fontWeight: 500, color: '#1D2226' }}>
              <span aria-hidden="true" style={{ position: 'relative', width: 38, height: 24, borderRadius: 999, background: derived?.auto ? '#0D9488' : '#CBD3DA', display: 'block' }}>
                <span style={{ position: 'absolute', top: 4, [derived?.auto ? 'right' : 'left']: 4, width: 16, height: 16, borderRadius: '50%', background: '#fff' }} />
              </span>
              {derived?.auto ? 'Auto-apply on' : 'Review before sending'}
              <span style={{ fontWeight: 400, color: '#5F6A74' }}>· {derived?.auto ? `${derived.cap} a day` : 'drafts wait for you'}</span>
            </button>
          </div>
          <dl style={{ margin: 0, display: 'flex', flexWrap: 'wrap', gap: '16px 40px' }}>
            {[['Roles tracked', data?.jobsTotal], ['CVs tailored', derived?.tailored], ['Applications sent', derived?.sentTotal], ['Interviews', derived?.interviews]].map(([l, v]) => (
              <div className="stat" key={l as string}><dt>{l as string}</dt><dd>{stat(v as number | undefined)}</dd></div>
            ))}
          </dl>
        </div>

        {error && <div style={{ marginTop: 20 }}><ErrorNote message={error} onRetry={reload} /></div>}

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 14, marginTop: 30 }}>
          <div style={{ flex: '999 1 560px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Card labelledBy="ny-title" style={{ padding: '16px 18px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 40 }}>
                <H2 id="ny-title">Needs you</H2>
                {(data?.tasks.length ?? 0) > 0 && <span style={{ height: 24, display: 'inline-flex', alignItems: 'center', padding: '0 10px', borderRadius: 999, background: '#FEF3C7', color: '#92400E', fontSize: 12, fontWeight: 500 }}>{data!.tasks.length} waiting</span>}
                <Link to="/dash/needs-you" style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 500, color: '#1D4ED8', textDecoration: 'none' }}>Open queue →</Link>
              </div>
              <Muted style={{ margin: '2px 0 10px', fontSize: 13 }}>Applications paused on something only you can answer. Each answer is remembered.</Muted>
              {loading && !data ? <Skeleton h={120} /> : data && data.tasks.length === 0 ? (
                <EmptyNote title="Nothing needs you right now" body="J.A.V.I will pause and ask here when it hits a question it shouldn’t guess." />
              ) : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {data?.tasks.slice(0, 3).map((t) => (
                    <li key={t._id} className="row" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 8px', borderTop: '1px solid #EEF2F5', borderRadius: 10 }}>
                      <Logo name={t.payload?.company} size={38} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 14, lineHeight: '19px', fontWeight: 500, color: '#1D2226', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.questions?.[0]?.label || t.message || REASON_LABEL[t.reason]}</span>
                        <span style={{ display: 'block', fontSize: 12, lineHeight: '16px', color: '#5F6A74' }}>{REASON_LABEL[t.reason] || 'Needs you'}{t.payload?.company ? ` · ${t.payload.company}` : ''}{t.payload?.role || t.payload?.jobTitle ? ` · ${t.payload.role || t.payload.jobTitle}` : ''}</span>
                      </span>
                      <Link to="/dash/needs-you" className="tint" style={{ height: 34, padding: '0 14px', fontSize: 13 }}>{REASON_ACTION[t.reason] || 'Open'}</Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 14 }}>
              <Card labelledBy="jt-title" style={{ padding: '16px 18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 40 }}>
                  <H2 id="jt-title">J.A.V.I today</H2>
                  {derived?.auto && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#0F766E' }}><span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: '#14B8A6' }} />Working</span>}
                </div>
                <dl style={{ margin: '16px 0 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {derived ? ([['Roles found', derived.todayFound, '#BFDBFE'], ['Matched your rules', derived.todayMatched, '#60A5FA'], ['Drafted', derived.todayDrafted, '#2563EB'], ['Sent', derived.todaySent, '#0D9488']] as const).map(([l, v, col]) => (
                    <div key={l}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, lineHeight: '18px' }}><dt style={{ color: '#3E4851' }}>{l}</dt><dd style={{ margin: 0, fontWeight: 600, color: '#1D2226' }}>{v}</dd></div>
                      <div aria-hidden="true" style={{ marginTop: 6, height: 8, borderRadius: 999, background: '#EEF2F5' }}><div style={{ width: `${derived.todayFound ? Math.round((v / derived.todayFound) * 100) : 0}%`, height: 8, borderRadius: 999, background: col }} /></div>
                    </div>
                  )) : <Skeleton h={150} />}
                </dl>
              </Card>

              <Card labelledBy="la-title" style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 40 }}>
                  <H2 id="la-title">Live alerts</H2>
                  <Link to="/dash/tracker" style={{ fontSize: 13, fontWeight: 500, color: '#1D4ED8', textDecoration: 'none' }}>Tracker →</Link>
                </div>
                {loading && !data ? <Skeleton h={140} style={{ marginTop: 12 }} /> : data && data.notes.length === 0 ? (
                  <EmptyNote title="No alerts yet" body="Replies, interview invites and ready drafts show up here." />
                ) : (
                  <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {data?.notes.map((n) => (
                      <li key={n._id} style={{ display: 'flex', gap: 12 }}>
                        <span aria-hidden="true" style={{ marginTop: 6, width: 8, height: 8, flex: 'none', borderRadius: '50%', background: n.read ? '#CBD3DA' : '#0D9488' }} />
                        <span><span style={{ display: 'block', fontSize: 13, lineHeight: '18px', fontWeight: 500, color: '#1D2226' }}>{n.title}</span><span style={{ display: 'block', fontSize: 12, lineHeight: '16px', color: '#5F6A74' }}>{ago(n.createdAt)}{n.body ? ` · ${n.body}` : ''}</span></span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </div>

          <div style={{ flex: '0 1 336px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Card label="Your profile">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {p?.avatarUrl ? <img src={p.avatarUrl} alt="" width={60} height={60} style={{ borderRadius: '50%', objectFit: 'cover' }} /> : <Logo name={p?.fullName || p?.email} size={60} />}
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 17, lineHeight: '22px', fontWeight: 600, color: '#111418' }}>{p?.fullName || 'Your profile'}</span>
                  <span style={{ display: 'block', marginTop: 2, fontSize: 12, lineHeight: '17px', color: '#5F6A74' }}>{p?.headline || 'Add a headline'}</span>
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 16, padding: '12px 14px', borderRadius: 14, background: p?.status === 'verified' ? '#F0FDFA' : '#FFF7ED' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: p?.status === 'verified' ? '#0F766E' : '#B45309' }}><span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: p?.status === 'verified' ? '#14B8A6' : '#F59E0B' }} />{p?.status === 'verified' ? 'Open to work' : 'Profile not verified'}</span>
                <span style={{ fontSize: 12, color: '#3E5A57' }}>{[p?.remotePreference, p?.salaryExpectation?.minimum ? `from ${p.salaryExpectation.currency || '$'}${Math.round(p.salaryExpectation.minimum / 1000)}k` : ''].filter(Boolean).join(' · ')}</span>
              </div>
              {(p?.primarySkills?.length ?? 0) > 0 && (<>
                <p style={{ margin: '16px 0 8px', fontSize: 12, lineHeight: '16px', color: '#5F6A74' }}>Top skills</p>
                <ul aria-label="Top skills" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {p.primarySkills.slice(0, 6).map((s: string) => <li key={s} style={{ padding: '6px 10px', borderRadius: 999, background: '#F3F6F9', fontSize: 12, color: '#2E3338' }}>{s}</li>)}
                </ul>
              </>)}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingTop: 14, borderTop: '1px solid #EEF2F5' }}>
                <span style={{ fontSize: 12, color: '#5F6A74' }}>{p?.status === 'verified' ? 'Verified' : 'Needs review'}</span>
                <Link to="/dash/profile" style={{ fontSize: 13, fontWeight: 500, color: '#1D4ED8', textDecoration: 'none' }}>Edit profile →</Link>
              </div>
            </Card>

            <Card labelledBy="ui-title" style={{ padding: '16px 18px 18px' }}>
              <H2 id="ui-title">Interviews</H2>
              {data && derived && derived.interviewApps.length === 0 ? (
                <EmptyNote title="No interviews yet" body="When an invite lands in your inbox it appears here." />
              ) : (
                <ul style={{ listStyle: 'none', margin: '14px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {derived?.interviewApps.slice(0, 4).map((a) => (
                    <li key={a._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, borderRadius: 14, background: '#F7F9FB' }}>
                      <Logo name={a.jobId?.company} size={40} />
                      <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: 'block', fontSize: 13, lineHeight: '18px', fontWeight: 500, color: '#1D2226' }}>{a.jobId?.company}</span><span style={{ display: 'block', fontSize: 12, lineHeight: '16px', color: '#5F6A74' }}>{a.jobId?.title}</span></span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
