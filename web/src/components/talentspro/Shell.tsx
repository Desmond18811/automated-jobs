import { useEffect, useRef, useState, type CSSProperties, type FC } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { applicationsApi, authApi, notificationsApi, profileApi, tasksApi, tokenStorage } from '@/api';
import { useSocket } from '@/hooks/useSocket';
import { Icon, LogoMark, avatarTone, initialsOf } from './icons';
import { EVENT, KIND, ago, asList, useAsync } from './data';
import { Calendar } from './Calendar';
import './tp.css';

export interface TpContext {
  me: { name?: string; email?: string } | null;
  firstName: string;
  openCalendar: () => void;
}

export const useTp = () => useOutletContext<TpContext>();

const RAIL: { to: string; icon: string; label: string; end?: boolean; extra?: boolean }[] = [
  { to: '/dash', icon: 'home', label: 'Dashboard', end: true },
  { to: '/dash/applications', icon: 'folder', label: 'Applications' },
  { to: '/dash/jobs', icon: 'briefcase', label: 'Find jobs' },
  { to: '/dash/saved', icon: 'star', label: 'Saved jobs', extra: true },
  { to: '#calendar', icon: 'calendar', label: 'Calendar' },
  { to: '/dash/analytics', icon: 'analytics', label: 'Analytics', extra: true },
  { to: '/dash/business', icon: 'business', label: 'Business mode' },
  { to: '/dash/profile', icon: 'user', label: 'Profile' },
];

const circle = (size: number): CSSProperties => ({
  width: size,
  height: size,
  borderRadius: '50%',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flex: `0 0 ${size}px`,
});

/** Unread count on the bell; shows 9+ past nine. */
const Count: FC<{ n: number }> = ({ n }) => (n > 0 ? <span className="tp-bell-count" aria-hidden="true">{n > 9 ? '9+' : n}</span> : null);

const NOTIF: Record<string, { icon: string; tone: 'blue' | 'amber' | 'green' | 'red'; to: string }> = {
  draft_ready: { icon: 'doc', tone: 'blue', to: '/dash/applications' },
  draft_needs_attention: { icon: 'doc', tone: 'amber', to: '/dash/applications' },
  needs_user: { icon: 'user', tone: 'amber', to: '/dash/applications' },
  sent: { icon: 'check', tone: 'green', to: '/dash/applications' },
  send_blocked: { icon: 'close', tone: 'red', to: '/dash/applications' },
  send_failed: { icon: 'close', tone: 'red', to: '/dash/applications' },
  interview_invite: { icon: 'camera', tone: 'blue', to: '/dash/applications?stage=interview' },
  default: { icon: 'bell', tone: 'blue', to: '/dash/applications' },
};

export const Shell: FC = () => {
  const nav = useNavigate();
  const loc = useLocation();
  const [me, setMe] = useState<TpContext['me']>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState('');
  const [panel, setPanel] = useState<'' | 'notifs' | 'account' | 'tasks'>('');
  const [toast, setToast] = useState('');
  const [params, setParams] = useSearchParams();
  const [calendar, setCalendar] = useState(params.get('calendar') === '1');
  const [today, setToday] = useState<any[] | null>(null);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [ring, setRing] = useState(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    authApi.getMe().then(
      async (m: any) => {
        setMe(m);
        if (m?.name) return;
        // Passwordless sign-up may not have captured a name; the profile (from the CV) has one.
        try {
          const r: any = await profileApi.get();
          const p = r?.profile || r;
          const n = p?.fullName || [p?.firstName, p?.lastName].filter(Boolean).join(' ');
          if (n) setMe((cur) => ({ ...(cur || {}), ...m, name: n }));
        } catch {
          /* keep the email-based fallback */
        }
      },
      () => undefined,
    );
  }, []);
  useEffect(() => setPanel(''), [loc.pathname]);
  useEffect(() => {
    if (params.get('calendar') !== '1') return;
    setCalendar(true);
    const n = new URLSearchParams(params);
    n.delete('calendar');
    setParams(n, { replace: true });
  }, [params, setParams]);
  useEffect(() => {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(from.getTime() + 864e5 - 1);
    applicationsApi.activity(from, to).then((r) => setToday(r.events ?? []), () => setToday([]));
  }, [loc.pathname]);

  const tasks = useAsync(() => tasksApi.list(), [loc.pathname]);
  const openTasks = asList(tasks.data, 'tasks');
  const notifs = useAsync(() => notificationsApi.list({ limit: 8 }), []);
  const list = asList(notifs.data, 'notifications');
  const unread = list.filter((n) => !n.readAt).length;
  const shown = onlyUnread ? list.filter((n) => !n.readAt) : list;

  useSocket({
    onNotificationNew: (n: any) => {
      setToast(n?.title || n?.message || 'New notification');
      clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(''), 4000);
      notifs.reload();
      tasks.reload();
      setRing((r) => r + 1);
    },
  });

  const displayName = me?.name || me?.email?.split('@')[0] || '';
  const firstName = displayName.split(/\s+/)[0] || 'there';
  const [bg, fg] = avatarTone(displayName || 'x');
  const initials = initialsOf(displayName);

  const signOut = async () => {
    try {
      await authApi.logout();
    } finally {
      tokenStorage.clear();
      nav('/signin', { replace: true });
    }
  };

  const railBtn = (active: boolean): CSSProperties => ({
    ...circle(48),
    border: 0,
    background: active ? '#2457E8' : '#EDF1F6',
    color: active ? '#fff' : '#606979',
    textDecoration: 'none',
  });

  const now = new Date();
  const nowPct = ((now.getHours() * 60 + now.getMinutes()) / 1440) * 100;
  const tally = {
    sent: (today ?? []).filter((e) => e.to === 'sent').length,
    replies: (today ?? []).filter((e) => e.to === 'replied').length,
    needs: (today ?? []).filter((e) => e.to === 'needs_user').length,
    wins: (today ?? []).filter((e) => ['interview', 'offer', 'hired'].includes(e.to)).length,
  };
  const nowLabel = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="tp-root">
      <nav className="tp-rail" aria-label="Main" style={{ flex: '0 0 112px', width: 112, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '26px 0 28px' }}>
        <Link to="/dash" className="tp-rail-logo" aria-label="J.A.V.I" style={{ width: 48, height: 48, marginBottom: 196, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <LogoMark />
        </Link>
        {RAIL.map((r) =>
          r.to === '#calendar' ? (
            <button key={r.to} type="button" data-tip={r.label} aria-label={r.label} aria-haspopup="dialog" onClick={() => setCalendar(true)} className="tp-rail-btn tp-tip" style={railBtn(calendar)}>
              <Icon name={r.icon} />
            </button>
          ) : (
            <NavLink
              key={r.to}
              to={r.to}
              end={r.end}
              data-tip={r.label}
              aria-label={r.label}
              className={({ isActive }) => `tp-rail-btn tp-tip${isActive ? ' is-active' : ''}${r.extra ? ' tp-rail-extra' : ''}`}
              style={({ isActive }) => railBtn(isActive)}
            >
              <Icon name={r.icon} />
            </NavLink>
          ),
        )}
        <div className="tp-rail-bottom" style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <button type="button" data-tip="Notifications" aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'} aria-haspopup="dialog" aria-expanded={panel === 'notifs'} className={`tp-rail-btn tp-tip tp-rail-extra${unread ? ' has-unread' : ''}`} onClick={() => setPanel(panel === 'notifs' ? '' : 'notifs')} style={railBtn(panel === 'notifs')}>
            <span key={ring} className={ring ? 'tp-ring' : undefined} style={{ display: 'flex' }}><Icon name="bell" /></span>
            <Count n={unread} />
          </button>
          <NavLink to="/dash/messages" data-tip="Messages" aria-label="Messages" className="tp-rail-btn tp-tip tp-rail-extra" style={({ isActive }) => railBtn(isActive)}>
            <Icon name="mail" />
          </NavLink>
          <button
            type="button"
            data-tip={displayName || 'Account'}
            aria-label="Account"
            className="tp-rail-btn tp-tip"
            onClick={() => setPanel(panel === 'account' ? '' : 'account')}
            style={{ ...circle(48), border: '2px solid #fff', background: bg, color: fg, fontSize: 14, fontWeight: 600, boxShadow: '0 6px 16px -8px rgba(23,25,31,.35)' }}
          >
            {initials}
          </button>
        </div>
      </nav>

      {panel && (
        <div
          role="dialog"
          className="tp-panel-in"
          style={{ position: 'fixed', ...(panel === 'tasks' ? { top: 92, right: 40 } : { left: 124, bottom: 24 }), width: panel === 'notifs' ? 380 : 340, maxWidth: 'calc(100vw - 24px)', background: '#fff', borderRadius: 24, padding: 18, zIndex: 60, boxShadow: '0 1px 2px rgba(23,25,31,.05),0 26px 52px -22px rgba(23,25,31,.32)', transform: 'none' }}
        >
          {panel === 'tasks' ? (
            <div>
              <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>Needs you</div>
              <div style={{ fontSize: 12, color: '#606979', marginBottom: 8 }}>J.A.V.I paused these applications until you answer.</div>
              {tasks.loading ? (
                <div style={{ fontSize: 13, color: '#606979', padding: '8px 0' }}>Loading…</div>
              ) : tasks.error ? (
                <div role="alert" style={{ fontSize: 13, color: '#B4232F', padding: '8px 0' }}>Couldn't load them: {tasks.error}</div>
              ) : openTasks.length === 0 ? (
                <div style={{ fontSize: 13, color: '#606979', padding: '8px 0' }}>Nothing is waiting on you. Applications are running on their own.</div>
              ) : (
                openTasks.slice(0, 6).map((t: any) => (
                  <div key={t._id} style={{ padding: '10px 0', borderTop: '1px solid #EEF2F7', fontSize: 13 }}>
                    <div style={{ fontWeight: 500 }}>{t.message || 'An application needs an answer'}</div>
                    <div style={{ fontSize: 11, color: '#98A1AF', marginTop: 2 }}>
                      {t.questions?.length ? `${t.questions.length} question${t.questions.length === 1 ? '' : 's'}, ` : ''}{ago(t.createdAt)}
                    </div>
                  </div>
                ))
              )}
              <Link to="/dash/applications" className="tp-btn-ghost" style={{ marginTop: 8, height: 44, borderRadius: 999, border: '1px solid #DCE3EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 500, color: '#17191F' }}>
                Open applications
              </Link>
            </div>
          ) : panel === 'account' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{displayName || 'Signed in'}</div>
              <div style={{ fontSize: 12, color: '#606979' }}>{me?.email}</div>
              <Link to="/dash/profile" className="tp-btn-ghost" style={{ height: 44, borderRadius: 999, border: '1px solid #DCE3EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 500, color: '#17191F' }}>
                Profile
              </Link>
              <Link to="/dash/test" className="tp-btn-ghost" style={{ height: 44, borderRadius: 999, border: '1px solid #DCE3EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 500, color: '#17191F' }}>
                Test lab
              </Link>
              <button type="button" className="tp-btn-primary" onClick={signOut} style={{ height: 44, borderRadius: 999, border: 0, background: '#2457E8', color: '#fff', fontSize: 13, fontWeight: 500 }}>
                Sign out
              </button>
            </div>
          ) : (
            <div className="tp-notifs">
              <div className="tp-notifs-head">
                <div>
                  <div className="tp-notifs-title">Notifications</div>
                  <div className="tp-notifs-sub" role="status" aria-atomic="true">{unread ? `${unread} unread` : 'All read'}</div>
                </div>
                {unread > 0 && (
                  <button type="button" className="tp-notifs-link" onClick={() => notificationsApi.markAllRead().then(notifs.reload)}>
                    Mark all read
                  </button>
                )}
              </div>
              <div className="tp-notifs-tabs" role="group" aria-label="Show">
                <button type="button" aria-pressed={!onlyUnread} onClick={() => setOnlyUnread(false)}>All</button>
                <button type="button" aria-pressed={onlyUnread} onClick={() => setOnlyUnread(true)}>Unread{unread ? ` ${unread}` : ''}</button>
              </div>
              <div className="tp-notifs-list">
                {notifs.loading && list.length === 0 ? (
                  <div className="tp-notifs-empty">Loading…</div>
                ) : notifs.error ? (
                  <div className="tp-notifs-empty" role="alert">
                    Couldn't load notifications.{' '}
                    <button type="button" className="tp-notifs-link" onClick={notifs.reload}>Try again</button>
                  </div>
                ) : shown.length === 0 ? (
                  <div className="tp-notifs-empty">
                    <span className="tp-notifs-empty-icon"><Icon name="bell" size={18} /></span>
                    <strong>{onlyUnread ? 'Nothing unread' : "You're all caught up"}</strong>
                    <span>Sent applications, replies and anything that needs you will show up here.</span>
                  </div>
                ) : (
                  shown.map((n) => {
                    const k = NOTIF[n.type] ?? NOTIF.default;
                    return (
                      <button
                        key={n._id || n.id}
                        type="button"
                        className={`tp-notif${n.readAt ? '' : ' is-unread'}`}
                        onClick={() => {
                          if (!n.readAt) void notificationsApi.markRead(n._id || n.id).then(notifs.reload, () => undefined);
                          setPanel('');
                          nav(k.to);
                        }}
                      >
                        <span className={`tp-notif-icon is-${k.tone}`}><Icon name={k.icon} size={16} /></span>
                        <span className="tp-notif-text">
                          <span className="tp-notif-title">{n.title || n.message}</span>
                          {n.body && <span className="tp-notif-body">{n.body}</span>}
                          <span className="tp-notif-time">{ago(n.createdAt)}</span>
                        </span>
                        {!n.readAt && <span className="tp-notif-dot" aria-label="Unread" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="tp-content" style={{ flex: '1 1 auto', minWidth: 0, padding: '26px 40px 56px 12px' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', position: 'relative', zIndex: 10 }}>
          <div className="tp-show-sm" style={{ alignItems: 'center', gap: 10, marginRight: 'auto' }}>
            <LogoMark size={36} />
            <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-.01em' }}>TalentsPro</span>
          </div>

          {searchOpen ? (
            <form
              className="tp-search"
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                const base = /^\/dash\/(jobs|saved)/.test(loc.pathname) ? '/dash/jobs' : '/dash/applications';
                nav(`${base}${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`);
                setSearchOpen(false);
              }}
              style={{ flex: '0 1 280px', height: 48, padding: '0 4px 0 16px', borderRadius: 999, background: '#fff', border: '1px solid #E3E9F2', display: 'flex', alignItems: 'center', gap: 10 }}
            >
              <span style={{ color: '#606979', display: 'flex' }}><Icon name="search" size={16} /></span>
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={/^\/dash\/(jobs|saved)/.test(loc.pathname) ? 'Search jobs…' : 'Search applications…'} aria-label="Search" style={{ flex: 1, minWidth: 0, border: 0, outline: 0, background: 'none', font: 'inherit', fontSize: 13 }} />
              <button type="button" aria-label="Close search" onClick={() => setSearchOpen(false)} style={{ ...circle(44), border: 0, background: '#F5F8FC', color: '#606979' }}>
                <Icon name="close" size={16} />
              </button>
            </form>
          ) : (
            <button type="button" aria-label="Search" className="tp-icon-btn" onClick={() => setSearchOpen(true)} style={{ ...circle(48), border: '1px solid #E3E9F2', background: 'rgba(255,255,255,.7)', color: '#17191F' }}>
              <Icon name="search" size={20} />
            </button>
          )}

          <div className="tp-hide-sm tp-today" style={{ flex: '1 1 auto', maxWidth: 1180, minWidth: 0, margin: '0 auto' }}>
            <div className="tp-today-date">
              <strong>Today</strong>
              <span>{now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
            </div>
            <div className="tp-today-track" role="img" aria-label={`Today's activity: ${tally.sent} sent, ${tally.replies} replies, ${tally.needs} waiting on you`}>
              <span className="tp-today-past" style={{ width: `${nowPct}%` }} />
              <span className="tp-today-future" style={{ left: `${nowPct}%` }} />
              {[6, 12, 18].map((h) => (
                <span key={h} className="tp-today-hour" style={{ left: `${(h / 24) * 100}%` }}>{String(h).padStart(2, '0')}</span>
              ))}
              {(today ?? []).map((e, i) => {
                const at = new Date(e.at);
                const kind = KIND[e.to] ?? 'other';
                return (
                  <span
                    key={i}
                    className={`tp-today-tick is-${kind}`}
                    style={{ left: `${((at.getHours() * 60 + at.getMinutes()) / 1440) * 100}%` }}
                    title={`${at.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}  ${EVENT[e.to] || e.to}${e.job?.title ? `, ${e.job.title}` : ''}${e.job?.company ? ` at ${e.job.company}` : ''}`}
                  />
                );
              })}
              <span className="tp-today-now" style={{ left: `${nowPct}%` }}>
                <span>{nowLabel}</span>
              </span>
            </div>
            <span className="tp-today-sum" role="status" aria-atomic="true">
              {today === null ? 'Loading…' : today.length === 0 ? 'Nothing yet today' : (
                <>
                  <b>{tally.sent}</b> sent{tally.replies > 0 && <>, <b>{tally.replies}</b> {tally.replies === 1 ? 'reply' : 'replies'}</>}
                  {tally.wins > 0 && <>, <b>{tally.wins}</b> {tally.wins === 1 ? 'interview' : 'interviews'}</>}
                </>
              )}
            </span>
            <button
              type="button"
              className={`tp-today-needs${openTasks.length ? ' is-on' : ''}`}
              onClick={() => setPanel(panel === 'tasks' ? '' : 'tasks')}
              aria-haspopup="dialog"
              aria-expanded={panel === 'tasks'}
            >
              {openTasks.length ? <><span className="tp-today-dot" />{openTasks.length} need{openTasks.length === 1 ? 's' : ''} you</> : <><Icon name="check" size={14} />All clear</>}
            </button>
            <button type="button" aria-label="Open calendar" onClick={() => setCalendar(true)} className="tp-icon-btn" style={{ ...circle(36), border: '1px solid #E3E9F2', background: '#fff', color: '#17191F', flexShrink: 0 }}>
              <Icon name="calendar" size={16} />
            </button>
          </div>

          <button type="button" aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'} aria-haspopup="dialog" aria-expanded={panel === 'notifs'} className="tp-icon-btn tp-show-sm" onClick={() => setPanel(panel === 'notifs' ? '' : 'notifs')} style={{ ...circle(48), position: 'relative', border: '1px solid #E3E9F2', background: 'rgba(255,255,255,.7)', color: '#17191F' }}>
            <span key={ring} className={ring ? 'tp-ring' : undefined} style={{ display: 'flex' }}><Icon name="bell" size={20} /></span>
            <Count n={unread} />
          </button>
          <Link to="/dash/profile" aria-label="Settings" className="tp-icon-btn tp-hide-sm" style={{ ...circle(48), border: '1px solid #E3E9F2', background: 'rgba(255,255,255,.7)', color: '#17191F' }}>
            <Icon name="settings" size={20} />
          </Link>
        </header>

        <Outlet context={{ me, firstName, openCalendar: () => setCalendar(true) } satisfies TpContext} />
        {calendar && <Calendar onClose={() => setCalendar(false)} />}
      </div>

      {toast && (
        <div role="status" style={{ position: 'fixed', right: 24, bottom: 24, background: '#17191F', color: '#fff', padding: '10px 16px', borderRadius: 14, fontSize: 13, zIndex: 80 }}>
          {toast}
        </div>
      )}
    </div>
  );
};
