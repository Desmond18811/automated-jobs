import type { FC } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi, tokenStorage } from '@/api';
import { useUserProfile } from '@/context/ProfileContext';
import { cardStyle, EmptyState, ghostBtn, primaryBtn } from './parts';
import { useTp } from './Shell';

const SOON: Record<string, { icon: string; title: string }> = {
  messages: { icon: 'mail', title: 'Messages' },
  business: { icon: 'business', title: 'Business mode' },
};

export const ComingSoon: FC<{ page: keyof typeof SOON }> = ({ page }) => {
  const s = SOON[page];
  return (
    <main style={{ marginTop: 52, paddingLeft: 8 }}>
      <h1 style={{ margin: '0 0 24px', fontSize: 30, fontWeight: 500, letterSpacing: '-.025em' }}>{s.title}</h1>
      <div className="tp-card" style={{ ...cardStyle, maxWidth: 560 }}>
        <EmptyState icon={s.icon} title="Nothing here yet" body={page === 'business' ? 'Business mode will find companies and send them outreach so they come to need you. It is being set up next.' : `${s.title} is not available in your workspace yet.`} cta={{ to: '/dash', label: 'Back to dashboard' }} />
      </div>
    </main>
  );
};

export const ProfilePage: FC = () => {
  const { me } = useTp();
  const { profile } = useUserProfile();
  const nav = useNavigate();
  const out = async (all: boolean) => {
    try {
      await (all ? authApi.logoutAll() : authApi.logout());
    } finally {
      tokenStorage.clear();
      nav('/signin', { replace: true });
    }
  };
  const rows: [string, string][] = [
    ['Name', profile.fullName || me?.name || ''],
    ['Email', me?.email || profile.email || ''],
    ['Headline', profile.headline || ''],
    ['Location', profile.location || ''],
    ['Primary skills', (profile.primarySkills || []).join(', ')],
  ];
  return (
    <main style={{ marginTop: 52, paddingLeft: 8 }}>
      <h1 style={{ margin: '0 0 24px', fontSize: 30, fontWeight: 500, letterSpacing: '-.025em' }}>Profile</h1>
      <div className="tp-card" style={{ ...cardStyle, maxWidth: 640, gap: 14 }}>
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: 'flex', gap: 16, fontSize: 14, padding: '10px 0', borderBottom: '1px solid #EEF2F7' }}>
            <span style={{ flex: '0 0 130px', color: '#606979' }}>{k}</span>
            <span style={{ flex: 1 }}>{v || '—'}</span>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
          <Link to="/setup?edit=1" className="tp-btn-primary" style={{ ...primaryBtn, color: '#fff' }}>Edit profile</Link>
          <button type="button" className="tp-btn-ghost" onClick={() => out(false)} style={ghostBtn}>Sign out</button>
          <button type="button" className="tp-btn-ghost" onClick={() => out(true)} style={ghostBtn}>Sign out everywhere</button>
        </div>
      </div>
    </main>
  );
};

export const NotFound: FC<{ home?: string }> = ({ home = '/' }) => (
  <main style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif", color: '#17191F' }}>
    <div style={{ textAlign: 'center', maxWidth: 380 }}>
      <div style={{ fontSize: 64, fontWeight: 500, letterSpacing: '-.04em', color: '#2457E8', lineHeight: 1 }}>404</div>
      <h1 style={{ margin: '12px 0 6px', fontSize: 22, fontWeight: 500 }}>This page doesn't exist</h1>
      <p style={{ margin: '0 0 20px', fontSize: 14, color: '#606979', lineHeight: 1.5 }}>The link may be wrong or the page may have moved.</p>
      <Link to={home} style={{ ...primaryBtn, color: '#fff', textDecoration: 'none' }}>{home === '/' ? 'Go home' : 'Back to dashboard'}</Link>
    </div>
  </main>
);
