import { useEffect, useState, type FC } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authApi, gmailApi, meApi, type SessionInfo } from '@/api';
import { useUserProfile } from '@/context/ProfileContext';
import { useDash } from '../context';
import { Card, EmptyNote, ErrorNote, H2, Muted, PageHead, Skeleton, ago, useAsync } from '../ui';

const deviceName = (ua?: string): string => {
  if (!ua) return 'Unknown device';
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  const os = /Windows/.test(ua) ? 'Windows' : /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '';
  return [browser, os && `on ${os}`].filter(Boolean).join(' ');
};

export const SettingsScreen: FC = () => {
  const nav = useNavigate();
  const { notify } = useDash();
  const { profile } = useUserProfile();
  const [params] = useSearchParams();
  const sessions = useAsync(() => authApi.sessions(), []);
  const [busy, setBusy] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const g = params.get('gmail');
    if (g === 'connected') notify('Gmail connected. J.A.V.I can now send and read replies.');
    else if (g === 'error') notify(params.get('message') || 'Could not connect Gmail');
  }, [params, notify]);

  const connectGmail = async () => {
    setBusy(true);
    try { const { url } = await gmailApi.connect(); window.location.assign(url); }
    catch (e: any) { notify(e?.message || 'Could not start Gmail connection'); setBusy(false); }
  };
  const disconnectGmail = async () => {
    setBusy(true);
    try { await gmailApi.disconnect(); notify('Gmail disconnected'); } catch (e: any) { notify(e?.message || 'Could not disconnect'); } finally { setBusy(false); }
  };
  const revoke = async (s: SessionInfo) => {
    try { await authApi.revokeSession(s.id); notify('Signed out that device'); await sessions.reload(); } catch (e: any) { notify(e?.message || 'Could not sign it out'); }
  };
  const signOutEverywhere = async () => {
    if (!window.confirm('Sign out of every device, including this one?')) return;
    await authApi.logoutAll().catch(() => {});
    nav('/signin', { replace: true });
  };
  const exportData = async () => {
    try {
      const data = await meApi.exportData();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a'); a.href = url; a.download = 'javi-export.json'; a.click(); URL.revokeObjectURL(url);
    } catch (e: any) { notify(e?.message || 'Could not export your data'); }
  };
  const deleteAccount = async () => {
    setBusy(true);
    try { await meApi.deleteAccount(confirmEmail); nav('/', { replace: true }); }
    catch (e: any) { notify(e?.message || 'Could not delete your account'); setBusy(false); }
  };

  return (
    <>
      <PageHead title="Settings" blurb="Connect Gmail, see where you’re signed in, and manage your data." />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 30, maxWidth: 760 }}>
        <Card labelledBy="gm-title">
          <H2 id="gm-title">Gmail</H2>
          <Muted style={{ fontSize: 13 }}>Lets J.A.V.I send applications from your address and notice replies and interview invites, which move your Tracker stages automatically.</Muted>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button type="button" className="cta" disabled={busy} onClick={connectGmail} style={{ height: 40, padding: '0 18px', fontSize: 13 }}>Connect Gmail</button>
            <button type="button" className="ghost" disabled={busy} onClick={disconnectGmail} style={{ height: 40, padding: '0 16px', fontSize: 13 }}>Disconnect</button>
          </div>
        </Card>

        <Card labelledBy="dv-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <H2 id="dv-title">Signed-in devices</H2>
            <button type="button" className="ghost" onClick={signOutEverywhere} style={{ marginLeft: 'auto', height: 34, padding: '0 14px', fontSize: 13 }}>Sign out everywhere</button>
          </div>
          <Muted style={{ fontSize: 13 }}>You stay signed in on a device until you’ve been away for 30 days, or 90 days after you signed in.</Muted>
          {sessions.error && <div style={{ marginTop: 12 }}><ErrorNote message={sessions.error} onRetry={sessions.reload} /></div>}
          {sessions.loading && !sessions.data ? <Skeleton h={90} style={{ marginTop: 12 }} /> : (sessions.data?.length ?? 0) === 0 ? <EmptyNote title="No other sessions" /> : (
            <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0 }}>
              {sessions.data!.map((s) => (
                <li key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: '1px solid #EEF2F5' }}>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 14, lineHeight: '19px', fontWeight: 500, color: '#1D2226' }}>{deviceName(s.userAgent)}{s.current && <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 999, background: '#E3F5EF', color: '#2F7A66', fontSize: 11, fontWeight: 600 }}>This device</span>}</span>
                    <span style={{ display: 'block', fontSize: 12, lineHeight: '16px', color: '#5F6A74' }}>Active {ago(s.lastUsedAt)} · signed in {new Date(s.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{s.ip ? ` · ${s.ip}` : ''}</span>
                  </span>
                  {!s.current && <button type="button" className="ghost" onClick={() => revoke(s)} style={{ height: 32, padding: '0 14px', fontSize: 12 }}>Sign out</button>}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card labelledBy="da-title">
          <H2 id="da-title">Your data</H2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            <button type="button" className="ghost" onClick={exportData} style={{ height: 40, padding: '0 16px', fontSize: 13 }}>Download everything (JSON)</button>
            <button type="button" className="ghost" onClick={() => setDeleting((d) => !d)} style={{ height: 40, padding: '0 16px', fontSize: 13, color: '#B42318' }}>Delete my account</button>
          </div>
          {deleting && (
            <div role="group" aria-label="Confirm account deletion" style={{ marginTop: 14, padding: 14, borderRadius: 14, background: '#FEF3F2' }}>
              <p style={{ margin: 0, fontSize: 13, lineHeight: '19px', color: '#7A271A' }}>This permanently deletes your profile, applications, leads and files. Type <strong>{profile.email || 'your email'}</strong> to confirm.</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                <input className="field" aria-label="Confirm your email" value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} style={{ flex: '1 1 240px', background: '#fff' }} />
                <button type="button" disabled={busy || !confirmEmail} onClick={deleteAccount} style={{ height: 44, padding: '0 18px', border: 0, borderRadius: 999, background: '#B42318', color: '#fff', fontSize: 13, fontWeight: 500, opacity: busy || !confirmEmail ? 0.55 : 1 }}>Delete everything</button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </>
  );
};
