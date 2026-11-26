import { useEffect, useRef, useState, type CSSProperties, type FC } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { applicationsApi, authApi, notificationsApi, profileApi, tokenStorage } from '@/api';
import { useSocket } from '@/hooks/useSocket';
import { Icon, LogoMark, avatarTone, initialsOf } from './icons';
import { ago, asList, useAsync } from './data';
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

const Dot: FC<{ top?: number; right?: number }> = ({ top = 11, right = 11 }) => (
  <span style={{ position: 'absolute', top, right, width: 7, height: 7, borderRadius: '50%', background: '#E36C77', border: '1.5px solid #fff' }} />
);

export const Shell: FC = () => {
  const nav = useNavigate();
  const loc = useLocation();
  const [me, setMe] = useState<TpContext['me']>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState('');
  const [panel, setPanel] = useState<'' | 'notifs' | 'account'>('');
  const [toast, setToast] = useState('');
  const [params, setParams] = useSearchParams();
  const [calendar, setCalendar] = useState(params.get('calendar') === '1');
  const [sentToday, setSentToday] = useState<number | null>(null);
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
    applicationsApi.activity(from, to).then((r) => setSentToday(r.events.filter((e: any) => e.to === 'sent').length), () => setSentToday(null));
  }, [loc.pathname]);

  const notifs = useAsync(() => notificationsApi.list({ limit: 8 }), []);
  const list = asList(notifs.data, 'notifications');
  const unread = list.filter((n) => !n.readAt).length;

  useSocket({
    onNotificationNew: (n: any) => {
      setToast(n?.title || n?.message || 'New notification');
      clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(''), 4000);
      notifs.reload();
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
          <button type="button" data-tip="Notifications" aria-label="Notifications" className="tp-rail-btn tp-tip tp-rail-extra" onClick={() => setPanel(panel === 'notifs' ? '' : 'notifs')} style={railBtn(false)}>
            <Icon name="bell" />
            {unread > 0 && <Dot right={12} />}
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
          className="tp-pop"
          style={{ position: 'fixed', left: 108, bottom: 24, width: 340, maxWidth: 'calc(100vw - 24px)', background: '#fff', borderRadius: 24, padding: 18, zIndex: 60, boxShadow: '0 1px 2px rgba(23,25,31,.05),0 26px 52px -22px rgba(23,25,31,.32)', transform: 'none' }}
        >
          {panel === 'account' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 500 }}>{displayName || 'Signed in'}</div>
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
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 15, fontWeight: 500 }}>Notifications</div>
                {unread > 0 && (
                  <button type="button" onClick={() => notificationsApi.markAllRead().then(notifs.reload)} style={{ border: 0, background: 'none', color: '#2457E8', fontSize: 12, fontWeight: 500 }}>
                    Mark all read
                  </button>
                )}
              </div>
              {list.length === 0 ? (
                <div style={{ fontSize: 13, color: '#606979', padding: '12px 0' }}>You're all caught up.</div>
              ) : (
                list.map((n) => (
                  <div key={n._id || n.id} style={{ padding: '10px 0', borderTop: '1px solid #EEF2F7', fontSize: 13 }}>
                    <div style={{ fontWeight: n.readAt ? 400 : 500 }}>{n.title || n.message}</div>
                    <div style={{ fontSize: 11, color: '#98A1AF', marginTop: 2 }}>{ago(n.createdAt)}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      <div className="tp-content" style={{ flex: '1 1 auto', minWidth: 0, padding: '26px 40px 56px 12px' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', position: 'relative', zIndex: 10 }}>
          <div className="tp-show-sm" style={{ alignItems: 'center', gap: 10, marginRight: 'auto' }}>
            <LogoMark size={36} />
            <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-.01em' }}>TalentsPro</span>
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
              <span style={{ color: '#606979', display: 'flex' }}><Icon name="search" size={17} /></span>
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={/^\/dash\/(jobs|saved)/.test(loc.pathname) ? 'Search jobs…' : 'Search applications…'} aria-label="Search" style={{ flex: 1, minWidth: 0, border: 0, outline: 0, background: 'none', fontSize: 13, font: 'inherit' }} />
              <button type="button" aria-label="Close search" onClick={() => setSearchOpen(false)} style={{ ...circle(40), border: 0, background: '#F5F8FC', color: '#606979' }}>
                <Icon name="close" size={16} />
              </button>
            </form>
          ) : (
            <button type="button" aria-label="Search" className="tp-icon-btn" onClick={() => setSearchOpen(true)} style={{ ...circle(48), border: '1px solid #E3E9F2', background: 'rgba(255,255,255,.7)', color: '#17191F' }}>
              <Icon name="search" size={19} />
            </button>
          )}

          <div className="tp-hide-sm" style={{ flex: '1 1 760px', maxWidth: 860, minWidth: 0, position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px 4px 18px', borderRadius: 999, background: 'rgba(255,255,255,.78)', border: '1px solid rgba(255,255,255,.95)', boxShadow: '0 1px 2px rgba(23,25,31,.04),0 12px 28px -18px rgba(36,87,232,.22)' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#17191F', whiteSpace: 'nowrap' }}>Your Schedule</span>
              <span style={{ height: 38, padding: '0 12px 0 4px', borderRadius: 999, border: '1px solid #E3E9F2', background: '#fff', display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 500, whiteSpace: 'nowrap' }}>
                <span style={{ ...circle(30), background: '#F2F6FF', color: '#2457E8', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="calendar" size={15} /></span>
                {now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </span>
              <div style={{ position: 'relative', height: 38, flex: '1 1 320px', minWidth: 220, borderRadius: 999, background: 'linear-gradient(90deg,#E2EBFF 0%,#E6EFFB 32%,#DFF4EB 65%,#FFF0CD 100%)', display: 'flex', alignItems: 'center', padding: '0 8px', gap: 4 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,.9)', padding: '2px 9px 2px 3px', borderRadius: 999, fontSize: 10.5, fontWeight: 600, color: '#17191F', boxShadow: '0 1px 2px rgba(23,25,31,.06)', zIndex: 1 }}>
                  <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#2457E8', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9 }}>✓</span>
                  <span>{sentToday === null ? 'Today' : `${sentToday} sent today`}</span>
                </span>
                <div style={{ position: 'absolute', left: `${Math.min(Math.max(nowPct, 28), 72)}%`, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'none', transform: 'translateX(-50%)', zIndex: 2 }}>
                  <span style={{ position: 'absolute', top: -14, background: '#2457E8', color: '#fff', fontSize: 10, fontWeight: 600, padding: '2.5px 7px', borderRadius: 999, whiteSpace: 'nowrap', boxShadow: '0 4px 10px -2px rgba(36,87,232,.6)' }}>{nowLabel}</span>
                  <span style={{ position: 'absolute', top: 5, bottom: 5, width: 2, background: '#2457E8' }} />
                  <span className="tp-pulse" style={{ position: 'absolute', bottom: 2, width: 6, height: 6, borderRadius: '50%', background: '#2457E8' }} />
                </div>
              </div>
              <button type="button" aria-label="Open calendar" onClick={() => setCalendar(true)} className="tp-icon-btn" style={{ ...circle(38), border: '1px solid #E3E9F2', background: '#fff', color: '#17191F', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name="arrow" size={15} sw={1.8} />
              </button>
            </div>
          </div>

          <button type="button" aria-label="Notifications" className="tp-icon-btn tp-show-sm" onClick={() => setPanel(panel === 'notifs' ? '' : 'notifs')} style={{ ...circle(48), position: 'relative', border: '1px solid #E3E9F2', background: 'rgba(255,255,255,.7)', color: '#17191F' }}>
            <Icon name="bell" size={19} />
            {unread > 0 && <Dot />}
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
