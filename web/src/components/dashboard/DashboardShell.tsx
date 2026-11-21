import { useCallback, useEffect, useMemo, useRef, useState, type FC } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { JaviBrandMark } from '@/assets/logos';
import { authApi, applicationsApi, notificationsApi, tasksApi } from '@/api';
import { useSocket } from '@/hooks/useSocket';
import { useUserProfile } from '@/context/ProfileContext';
import { DashCtx } from './context';
import { Icon, ICONS, Logo, Toast, asList, ago, useToast } from './ui';
import './dashboard.css';

const NAV: Array<{ to: string; label: string; end?: boolean; paths: string[]; fill?: boolean }> = [
  { to: '/dash', label: 'Dashboard', end: true, paths: ['M7.09 4.76 6.09 5.54C4.57 6.73 3.81 7.32 3.41 8.15 3 8.99 3 9.95 3 11.88v2.09c0 3.79 0 5.68 1.17 6.85C5.34 22 7.23 22 11 22h2c3.77 0 5.66 0 6.83-1.18C21 19.65 21 17.76 21 13.97v-2.09c0-1.93 0-2.89-.41-3.73-.4-.83-1.16-1.42-2.68-2.61l-1-.78C14.55 2.92 13.37 2 12 2s-2.55.92-4.91 2.76Z', 'M15 22v-3.5c0-1.66-1.34-3-3-3s-3 1.34-3 3V22'] },
  { to: '/dash/needs-you', label: 'Needs you', paths: ['M5.67 9.91 8.73 5.77c1.98-2.68 2.97-4.02 3.89-3.73.92.28.92 1.92.92 5.21v.31c0 1.19 0 1.78.38 2.15l.02.02c.39.36 1 .36 2.24.36 2.22 0 3.33 0 3.7.67l.02.03c.35.68-.29 1.55-1.57 3.29l-3.06 4.14c-1.98 2.68-2.97 4.02-3.89 3.73-.92-.28-.92-1.92-.92-5.21v-.31c0-1.19 0-1.78-.38-2.15l-.02-.02c-.39-.36-1-.36-2.24-.36-2.22 0-3.33 0-3.7-.67l-.02-.03c-.35-.68.29-1.55 1.57-3.29Z'] },
  { to: '/dash/jobs', label: 'Job feed', paths: ['M3.5 11.5v2c0 3.77 0 5.66 1.11 6.83C5.71 21.5 7.49 21.5 11.06 21.5h1.88c3.57 0 5.35 0 6.45-1.17 1.11-1.17 1.11-3.06 1.11-6.83v-2', 'M13.9 13.5h1.18c1.28 0 1.93 0 2.47-.12 1.58-.33 2.87-1.36 3.44-2.74.2-.47.27-1.05.43-2.2.06-.43.09-.65.06-.82-.08-.52-.5-.94-1.05-1.07-.19-.05-.43-.05-.91-.05H4.48c-.48 0-.72 0-.91.05-.56.13-.97.55-1.05 1.07-.03.17 0 .39.06.82.16 1.15.24 1.73.43 2.2.57 1.38 1.86 2.41 3.44 2.74.55.12 1.19.12 2.47.12h1.18', 'M15.5 6.5l-.08-.26c-.38-1.32-.58-1.98-1.04-2.36-.45-.38-1.06-.38-2.28-.38h-.2c-1.22 0-1.83 0-2.29.38-.46.38-.65 1.04-1.04 2.36L8.5 6.5'] },
  { to: '/dash/drafts', label: 'Drafts', paths: ['M13.6 2.75H11C7.01 2.75 5.02 2.75 3.76 3.99 2.5 5.23 2.5 7.22 2.5 11.21v1.58c0 3.99 0 5.98 1.26 7.22C5.02 21.25 7.01 21.25 11 21.25h2c3.99 0 5.98 0 7.24-1.24 1.26-1.24 1.26-3.23 1.26-7.22v-2.14c0-.68 0-1.02-.13-1.32-.12-.31-.36-.55-.84-1.03L15.95 3.72c-.48-.48-.72-.72-1.03-.84-.3-.13-.64-.13-1.32-.13Z', 'M14.5 3v1.5c0 2.36 0 3.54.73 4.27.73.73 1.91.73 4.27.73h1.7'] },
  { to: '/dash/tracker', label: 'Tracker', paths: ['M2.5 12c0-4.48 0-6.72 1.39-8.11C5.28 2.5 7.52 2.5 12 2.5s6.72 0 8.11 1.39C21.5 5.28 21.5 7.52 21.5 12s0 6.72-1.39 8.11C18.72 21.5 16.48 21.5 12 21.5s-6.72 0-8.11-1.39C2.5 18.72 2.5 16.48 2.5 12Z', 'M8 7v9M12 7v5M16 7v7'] },
  { to: '/dash/profile', label: 'CV & profile', paths: ['M6.58 15.48c-1.42.84-5.13 2.56-2.87 4.72C4.82 21.25 6.05 22 7.59 22h8.82c1.55 0 2.78-.75 3.88-1.8 2.26-2.16-1.45-3.88-2.87-4.72a10.66 10.66 0 0 0-10.84 0Z', 'M16.5 6.5a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z'] },
  { to: '/dash/business', label: 'Business mode', paths: ['M3 10.99v4.5c0 2.84 0 4.25.88 5.13.88.88 2.29.88 5.12.88h6c2.83 0 4.24 0 5.12-.88.88-.88.88-2.29.88-5.13v-4.5', 'M15 16.98c-.68.6-1.77 1-3 1s-2.32-.4-3-1', 'M17.8 2.02 6.15 2.05c-1.74-.09-2.18 1.25-2.18 1.9 0 .59-.08 1.44-1.14 3.04-1.07 1.6-.99 2.08-.39 3.19.5.92 1.77 1.28 2.43 1.34 2.1.05 3.12-1.77 3.12-3.04 1.04 3.2 4.01 3.2 5.33 2.84 1.32-.37 2.46-1.68 2.72-2.84.16 1.44.63 2.28 2.03 2.85 1.45.6 2.69-.32 3.32-.9.63-.59 1.03-1.88-.09-3.31-.77-.98-1.09-1.91-1.19-2.87-.06-.56-.11-1.15-.51-1.53-.57-.56-1.39-.7-1.8-.69Z'] },
  { to: '/dash/ask', label: 'Ask J.A.V.I', paths: ['M14.6 4.2l1.3 3.2 3.2 1.3-3.2 1.3-1.3 3.2-1.3-3.2-3.2-1.3 3.2-1.3Z', 'M8.4 11.6l.9 2.2 2.2.9-2.2.9-.9 2.2-.9-2.2-2.2-.9 2.2-.9Z'] },
];

const dateParts = () => {
  const d = new Date();
  return {
    day: d.getDate(),
    wk: new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(d) + ',',
    month: new Intl.DateTimeFormat('en-US', { month: 'long' }).format(d),
  };
};

const Notifications: FC = () => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const [list, count] = await Promise.all([notificationsApi.list({ limit: 8 }), notificationsApi.getUnreadCount()]);
      setItems(asList(list, 'notifications'));
      setUnread(count?.unreadCount ?? 0);
    } catch {
      /* the bell is optional; stay quiet if the call fails */
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  useSocket({ onNotificationNew: () => void load() });

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <div ref={box} style={{ position: 'relative' }}>
      <button type="button" aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'} aria-expanded={open} onClick={() => setOpen((o) => !o)}
        style={{ width: 44, height: 44, border: 0, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#141414', padding: 0, position: 'relative' }}>
        <Icon d={ICONS.bell} size={18} />
        {unread > 0 && <span aria-hidden="true" style={{ position: 'absolute', top: 9, right: 10, width: 8, height: 8, borderRadius: '50%', background: '#B45309' }} />}
      </button>
      {open && (
        <div role="dialog" aria-label="Notifications" className="card" style={{ position: 'absolute', right: 0, top: 52, width: 340, maxWidth: 'calc(100vw - 32px)', zIndex: 30, padding: 14, boxShadow: '0 16px 40px rgba(16,24,40,.12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 4px 8px' }}>
            <strong style={{ fontSize: 14, fontWeight: 500 }}>Notifications</strong>
            {unread > 0 && (
              <button type="button" onClick={async () => { await notificationsApi.markAllRead().catch(() => {}); void load(); }} style={{ border: 0, background: 'transparent', color: '#1D4ED8', fontSize: 12, fontWeight: 500 }}>
                Mark all read
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p style={{ margin: 0, padding: '18px 4px', fontSize: 13, color: '#5F6A74' }}>Nothing new. J.A.V.I will tell you when something happens.</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', maxHeight: 360, overflowY: 'auto' }}>
              {items.map((n) => (
                <li key={n._id || n.id} style={{ display: 'flex', gap: 10, padding: '10px 4px', borderTop: '1px solid #EEF2F5' }}>
                  <span aria-hidden="true" style={{ marginTop: 6, width: 8, height: 8, flex: 'none', borderRadius: '50%', background: n.read ? '#CBD3DA' : '#2563EB' }} />
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13, lineHeight: '18px', fontWeight: 500, color: '#1D2226' }}>{n.title}</span>
                    {n.body && <span style={{ display: 'block', fontSize: 12, lineHeight: '16px', color: '#5F6A74' }}>{n.body}</span>}
                    <span style={{ fontSize: 11, color: '#7A858F' }}>{ago(n.createdAt)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

const AccountMenu: FC = () => {
  const nav = useNavigate();
  const { profile } = useUserProfile();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const name = profile.fullName || [profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.email || 'Account';

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const signOut = async () => {
    await authApi.logout().catch(() => {});
    nav('/signin', { replace: true });
  };
  const item = { display: 'block', width: '100%', textAlign: 'left' as const, padding: '10px 12px', border: 0, background: 'transparent', borderRadius: 10, fontSize: 13, color: '#1D2226', textDecoration: 'none' };

  return (
    <div ref={box} style={{ position: 'relative' }}>
      <button type="button" aria-label="Account menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} style={{ border: 0, background: 'transparent', padding: 0, borderRadius: '50%' }}>
        {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" width={42} height={42} style={{ borderRadius: '50%', objectFit: 'cover', display: 'block' }} /> : <Logo name={name} size={42} />}
      </button>
      {open && (
        <div role="menu" className="card" style={{ position: 'absolute', right: 0, top: 52, width: 232, zIndex: 30, padding: 8, boxShadow: '0 16px 40px rgba(16,24,40,.12)' }}>
          <div style={{ padding: '8px 12px 10px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#111418' }}>{name}</div>
            {profile.email && <div style={{ fontSize: 12, color: '#5F6A74', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile.email}</div>}
          </div>
          <Link role="menuitem" to="/dash/profile" onClick={() => setOpen(false)} className="row" style={item}>CV & profile</Link>
          <Link role="menuitem" to="/dash/settings" onClick={() => setOpen(false)} className="row" style={item}>Settings & devices</Link>
          <button role="menuitem" type="button" onClick={signOut} className="row" style={item}>Sign out</button>
        </div>
      )}
    </div>
  );
};

export const DashboardShell: FC = () => {
  const { day, wk, month } = useMemo(dateParts, []);
  const [openTasks, setOpenTasks] = useState(0);
  const [drafts, setDrafts] = useState(0);
  const [version, setVersion] = useState(0);
  const { toast, show } = useToast();

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let live = true;
    tasksApi.list().then((r) => live && setOpenTasks(asList(r, 'tasks').filter((t: any) => t.status === 'open').length)).catch(() => {});
    applicationsApi.list({ status: 'drafted', limit: 100 }).then((r) => live && setDrafts(asList(r, 'applications').length)).catch(() => {});
    return () => {
      live = false;
    };
  }, [version]);

  useSocket({
    onApplicationUpdated: (a) => { show(`${a?.company || 'An application'} moved to ${String(a?.status || 'a new stage').replace('_', ' ')}`); refresh(); },
    onTaskNew: () => { show('J.A.V.I needs you on something'); refresh(); },
    onTaskUpdated: refresh,
  });

  const ctx = useMemo(() => ({ openTasks, drafts, version, refresh, notify: show }), [openTasks, drafts, version, refresh, show]);

  return (
    <DashCtx.Provider value={ctx}>
      <div className="dv">
        <header className="dv-head">
          <Link to="/dash" aria-label="J.A.V.I home" style={{ flex: '0 1 407px', display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <JaviBrandMark glyphSize={28} fontSize={17} />
          </Link>
          <nav aria-label="Primary" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            {NAV.map((n) => {
              const count = n.to === '/dash/needs-you' ? openTasks : n.to === '/dash/drafts' ? drafts : 0;
              return (
                <NavLink key={n.to} to={n.to} end={n.end} className="nv" title={n.label} aria-label={count ? `${n.label}, ${count} waiting` : n.label}>
                  <svg className="ic" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                    {n.paths.map((d, i) => <path key={i} className={i === 0 ? 'f' : 'w'} d={d} />)}
                  </svg>
                  {count > 0 && n.to === '/dash/needs-you' && <span className="bdg" aria-hidden="true">{count}</span>}
                </NavLink>
              );
            })}
          </nav>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <p style={{ margin: '0 14px 0 0', display: 'flex', alignItems: 'center', gap: 6 }} aria-label={`${wk} ${month} ${day}`}>
              <span style={{ fontSize: 34, lineHeight: 1, letterSpacing: '-0.03em', color: '#111418' }}>{day}</span>
              <span style={{ display: 'flex', flexDirection: 'column', fontSize: 11, lineHeight: '13px', color: '#2E3338' }}><span>{wk}</span><span>{month}</span></span>
            </p>
            <Link to="/dash/jobs?add=1" className="cta" style={{ height: 40, gap: 10, padding: '0 18px 0 20px', fontSize: 14 }}>
              Add jobs <Icon d={ICONS.plus} size={16} sw={2} />
            </Link>
            <Notifications />
            <AccountMenu />
          </div>
        </header>
        <main className="dv-main">
          <Outlet />
        </main>
        <Toast message={toast} />
      </div>
    </DashCtx.Provider>
  );
};
