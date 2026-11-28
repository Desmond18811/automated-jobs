import { useRef, useState, type CSSProperties, type FC, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { jobsApi, telegramApi, testApi } from '@/api';
import { useAsync } from './data';
import { Badge, cardStyle, ghostBtn, primaryBtn } from './parts';

const field: CSSProperties = { width: '100%', borderRadius: 14, border: '1px solid #DCE3EE', background: '#fff', padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', color: '#17191F' };

type Out = { ok: boolean; data: unknown } | null;

const Result: FC<{ out: Out }> = ({ out }) =>
  out ? (
    <pre style={{ margin: 0, maxHeight: 260, overflow: 'auto', background: out.ok ? '#F2FBF6' : '#FDF1F2', border: `1px solid ${out.ok ? '#CFEEDC' : '#F6D3D6'}`, borderRadius: 14, padding: 12, fontSize: 12, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
      {typeof out.data === 'string' ? out.data : JSON.stringify(out.data, null, 2)}
    </pre>
  ) : null;

/** Runs one action, keeps its output, and never lets an error escape the card. */
function useRun() {
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<Out>(null);
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setOut(null);
    try {
      setOut({ ok: true, data: await fn() });
    } catch (e: any) {
      setOut({ ok: false, data: e?.data ?? e?.message ?? 'Failed' });
    } finally {
      setBusy(false);
    }
  };
  return { busy, out, run };
}

const Card: FC<{ title: string; hint: string; children: ReactNode }> = ({ title, hint, children }) => (
  <div className="tp-card" style={{ ...cardStyle, flex: '1 1 420px', gap: 12 }}>
    <div>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>{title}</h2>
      <p style={{ margin: '4px 0 0', fontSize: 13, color: '#606979', lineHeight: 1.5 }}>{hint}</p>
    </div>
    {children}
  </div>
);

const TelegramCard: FC = () => {
  const st = useAsync(() => telegramApi.status(), []);
  const { busy, out, run } = useRun();
  const t = st.data;
  return (
    <Card title="Telegram alerts" hint="J.A.V.I sends alerts and asks questions in Telegram. Questions come with buttons, or you reply to the message.">
      {st.loading ? (
        <div style={{ fontSize: 13, color: '#606979' }}>Checking…</div>
      ) : st.error ? (
        <div role="alert" style={{ fontSize: 13, color: '#B4232F' }}>{st.error}</div>
      ) : t && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <Badge bg={t.configured ? '#E6F9F0' : '#FDECEE'} fg={t.configured ? '#0B7A4B' : '#B4232F'}>{t.configured ? `Bot @${t.bot}` : 'Bot not set up (TELEGRAM_BOT_TOKEN)'}</Badge>
          <Badge bg={t.linked ? '#E6F9F0' : '#FFF5DF'} fg={t.linked ? '#0B7A4B' : '#8A5A00'}>{t.linked ? `Connected${t.username ? ` as @${t.username}` : ''}` : 'Not connected'}</Badge>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {t?.linked ? (
          <button type="button" className="tp-btn-primary" disabled={busy} onClick={() => run(() => telegramApi.test())} style={{ ...primaryBtn, color: '#fff' }}>{busy ? 'Sending…' : 'Send test message'}</button>
        ) : (
          <button type="button" className="tp-btn-primary" disabled={busy || !t?.configured} onClick={() => run(async () => { const r = await telegramApi.link(); window.open(r.url, '_blank', 'noopener'); return { ...r, next: 'Tap Start in the bot, then refresh this page.' }; })} style={{ ...primaryBtn, color: '#fff', opacity: t?.configured ? 1 : 0.5 }}>Connect Telegram</button>
        )}
        <button type="button" className="tp-btn-ghost" onClick={st.reload} style={ghostBtn}>Refresh</button>
      </div>
      <Result out={out} />
    </Card>
  );
};

const Simple: FC<{ title: string; hint: string; label: string; ready: boolean; fn: () => Promise<unknown> }> = ({ title, hint, label, ready, fn }) => {
  const { busy, out, run } = useRun();
  return (
    <Card title={title} hint={hint}>
      <button type="button" className="tp-btn-ghost" disabled={busy || !ready} onClick={() => run(fn)} style={{ ...ghostBtn, alignSelf: 'flex-start', opacity: ready ? 1 : 0.5 }}>{busy ? 'Running… this can take a while' : label}</button>
      <Result out={out} />
    </Card>
  );
};

const Links: FC = () => {
  const [text, setText] = useState('');
  const { busy, out, run } = useRun();
  const file = useRef<HTMLInputElement>(null);
  return (
    <Card title="Add job links" hint="Paste one or many links, one per line. Each is read, matched to your profile and prepared for application by the real pipeline.">
      <textarea style={{ ...field, minHeight: 110, resize: 'vertical' }} placeholder={'https://company.com/careers/role\nhttps://boards.greenhouse.io/…'} value={text} onChange={(e) => setText(e.target.value)} aria-label="Job links" />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className="tp-btn-primary" disabled={busy || !text.trim()} onClick={() => run(() => jobsApi.addLinks(text.split(/\s+/).filter(Boolean)))} style={{ ...primaryBtn, color: '#fff' }}>{busy ? 'Reading…' : 'Add links'}</button>
        <input ref={file} type="file" accept=".csv,.xlsx,.xls,.pdf,.txt" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void run(() => jobsApi.importJobs({ file: f })); if (file.current) file.current.value = ''; }} />
        <button type="button" className="tp-btn-ghost" disabled={busy} onClick={() => file.current?.click()} style={ghostBtn}>Import a file</button>
      </div>
      <Result out={out} />
    </Card>
  );
};

export const TestLab: FC = () => {
  const st = useAsync(() => testApi.status(), []);
  const on = !!st.data?.enabled;
  const ready = on && !st.loading;
  return (
    <main style={{ paddingLeft: 8 }}>
      <h1 style={{ margin: '44px 0 8px', fontSize: 30, fontWeight: 500, letterSpacing: '-.025em' }}>Test lab</h1>
      <p style={{ margin: '0 0 18px', fontSize: 14, color: '#606979' }}>Run the real job, form and Telegram pipelines from here. Development only.</p>

      <div className="tp-card" style={{ ...cardStyle, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        {st.loading ? 'Checking…' : st.error ? <span style={{ color: '#B4232F', fontSize: 13 }}>{st.error}</span> : (
          <>
            <Badge bg={on ? '#E6F9F0' : '#FDECEE'} fg={on ? '#0B7A4B' : '#B4232F'}>{on ? 'Test endpoints on' : 'Test endpoints off'}</Badge>
            <Badge bg={st.data?.whatsappConfigured ? '#E6F9F0' : '#FFF5DF'} fg={st.data?.whatsappConfigured ? '#0B7A4B' : '#8A5A00'}>{st.data?.whatsappConfigured ? 'Provider configured' : 'Provider not configured'}</Badge>
            {!on && <span style={{ fontSize: 13, color: '#606979' }}>Set ENABLE_TEST_ROUTES=true in server/.env and restart the server.</span>}
            <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <Link to="/dash/jobs" className="tp-btn-ghost" style={{ ...ghostBtn, height: 36, padding: '0 16px', fontSize: 12 }}>Find jobs</Link>
              <Link to="/dash/business" className="tp-btn-ghost" style={{ ...ghostBtn, height: 36, padding: '0 16px', fontSize: 12 }}>Business mode</Link>
            </span>
          </>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <Links />
        <TelegramCard />
        <Simple title="Form fill" hint="Maps your profile into a sample application form (contacts, links, résumé PDF)." label="Run form-fill test" ready={ready} fn={testApi.testFormFill} />
        <Simple title="End-to-end apply" hint="Simulates a full form submission and its confirmation alert." label="Run end-to-end test" ready={ready} fn={testApi.testE2EApply} />
        <Simple title="Tailored apply" hint="Tailors your CV for a sample payments role with the AI, answers custom questions, fills the form and sends the alert." label="Run tailored-apply test" ready={ready} fn={testApi.testStripeTailoredApply} />
      </div>
    </main>
  );
};
