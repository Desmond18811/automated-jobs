import { useEffect, useRef, useState, type FC, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { jobsApi } from '@/api';
import { useDash } from '../context';
import { Icon, ICONS, Sparkle } from '../ui';

interface Msg { id: number; from: 'you' | 'javi'; text: string; links?: Array<[string, string]> }

const CARDS: Array<[string, string, string, any, string, string]> = [
  ['Add jobs', 'Paste links or drop a file (PDF, spreadsheet, screenshot) and I’ll pull out every role.', '/dash/jobs?add=1', ICONS.link, '#EFF6FF', '#1D4ED8'],
  ['Review drafts', 'Tailored applications are waiting. I’ll walk you through what each one says.', '/dash/drafts', ICONS.doc, '#EFF6FF', '#1D4ED8'],
  ['Find business leads', 'Name an area and a type of business. I’ll find ones with a problem you can fix.', '/dash/business', ICONS.pin, '#F0FDFA', '#0F766E'],
];

/**
 * Ask J.A.V.I. There is no chat backend yet, so this routes what it can (pasted job links go straight to the
 * job feed pipeline, shortcuts open the right screen) and says so plainly for everything else.
 */
export const AskScreen: FC = () => {
  const { refresh } = useDash();
  const [params, setParams] = useSearchParams();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const seq = useRef(0);
  const push = (m: Omit<Msg, 'id'>) => setMsgs((x) => [...x, { ...m, id: seq.current++ }]);

  const send = async (raw: string) => {
    const q = raw.trim();
    if (!q || busy) return;
    push({ from: 'you', text: q });
    setText('');
    const urls = q.match(/https?:\/\/[^\s,]+/g);
    if (urls) {
      setBusy(true);
      try {
        const r = await jobsApi.addLinks(urls);
        const ok = r.results.filter((x) => x.status === 'queued').length;
        const dup = r.results.filter((x) => x.status === 'already_added').length;
        const bad = r.results.filter((x) => x.status === 'failed');
        push({ from: 'javi', text: [ok && `Added ${ok} job${ok === 1 ? '' : 's'}. I’m matching ${ok === 1 ? 'it' : 'them'} to your profile now.`, dup && `${dup} ${dup === 1 ? 'was' : 'were'} already in your feed.`, bad.length && `Couldn’t read ${bad.length}: ${bad[0].error || 'unknown error'}.`].filter(Boolean).join(' '), links: [['/dash/jobs', 'Open job feed']] });
        refresh();
      } catch (e: any) { push({ from: 'javi', text: e?.message || 'I couldn’t add those links.' }); } finally { setBusy(false); }
      return;
    }
    const l = q.toLowerCase();
    if (/draft|review|approve/.test(l)) push({ from: 'javi', text: 'Your drafts are in one place. Open them to read, edit and approve.', links: [['/dash/drafts', 'Review drafts']] });
    else if (/lead|business|restaurant|salon|clinic/.test(l)) push({ from: 'javi', text: 'Business mode finds local businesses with a fixable problem. Pick a type and an area.', links: [['/dash/business', 'Find leads']] });
    else if (/pause|stuck|waiting|answer|captcha/.test(l)) push({ from: 'javi', text: 'Anything I couldn’t finish on my own waits in Needs you.', links: [['/dash/needs-you', 'Open Needs you']] });
    else if (/track|status|reply|interview|offer|applied/.test(l)) push({ from: 'javi', text: 'Every application and where it stands is on the Tracker.', links: [['/dash/tracker', 'Open Tracker']] });
    else if (/cv|profile|rules|salary|cap/.test(l)) push({ from: 'javi', text: 'Your facts and rules live in CV & profile.', links: [['/dash/profile', 'Open CV & profile']] });
    else push({ from: 'javi', text: 'I can’t hold a free-form conversation yet. For now: paste job links and I’ll add them, or use the shortcuts below.', links: [['/dash/jobs?add=1', 'Add jobs'], ['/dash/drafts', 'Review drafts'], ['/dash/business', 'Find leads']] });
  };

  useEffect(() => {
    const q = params.get('q');
    if (q) { params.delete('q'); setParams(params, { replace: true }); void send(q); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [msgs]);

  const onSubmit = (e: FormEvent) => { e.preventDefault(); void send(text); };

  return (
    <section aria-label="Ask J.A.V.I" className="card" style={{ padding: '24px 24px 16px', background: 'rgba(255,255,255,.72)', minHeight: 'calc(100vh - 160px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, height: 44 }}>
        <span aria-hidden="true" style={{ width: 44, height: 44, flex: 'none', borderRadius: '50%', background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Sparkle /></span>
        <h1 style={{ margin: '0 auto 0 0', fontSize: 14, lineHeight: '18px', fontWeight: 500 }}>Ask J.A.V.I</h1>
        <Link to="/dash" aria-label="Collapse Ask J.A.V.I" className="ghost" style={{ width: 44, height: 44, color: '#141414' }}><Icon d={ICONS.collapse} sw={1.8} /></Link>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0 22px', minHeight: 0 }}>
        {msgs.length === 0 ? (
          <>
            <div aria-hidden="true" style={{ flex: 2, minHeight: 24 }} />
            <h2 style={{ margin: 0, textAlign: 'center', fontSize: 35, lineHeight: '49px', fontWeight: 300, letterSpacing: '-0.015em', color: '#333A41' }}>Ready To Land Top<br /><strong style={{ fontWeight: 500, color: '#1D2226' }}>Jobs</strong> Or Revisit Your Pipeline?</h2>
            <p style={{ margin: '12px 0 0', textAlign: 'center', fontSize: 14, lineHeight: '20px', color: '#5F6A74' }}>Ask about any application, or tell J.A.V.I what to do next.</p>
            <div style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,248px))', justifyContent: 'center', gap: 14, marginTop: 30 }}>
              {CARDS.map(([t, d, to, ic, bg, fg]) => (
                <Link key={t} to={to} style={{ minHeight: 170, display: 'flex', flexDirection: 'column', padding: 16, borderRadius: 16, border: '1px solid #E8EDF2', background: '#fff', textDecoration: 'none', color: '#262B30' }}>
                  <span style={{ fontSize: 16, lineHeight: '20px', fontWeight: 500 }}>{t}</span>
                  <span style={{ marginTop: 8, fontSize: 13, lineHeight: '19px', color: '#5F6A74' }}>{d}</span>
                  <span aria-hidden="true" style={{ marginTop: 'auto', alignSelf: 'flex-end', width: 40, height: 40, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: fg }}><Icon d={ic} size={17} sw={1.8} /></span>
                </Link>
              ))}
            </div>
            <div aria-hidden="true" style={{ flex: 1, minHeight: 24 }} />
          </>
        ) : (
          <div role="log" aria-live="polite" style={{ width: '100%', maxWidth: 760, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', flex: 1 }}>
            {msgs.map((m) => (
              <div key={m.id} style={{ alignSelf: m.from === 'you' ? 'flex-end' : 'flex-start', maxWidth: '85%', padding: '12px 16px', borderRadius: 18, background: m.from === 'you' ? '#141414' : '#fff', color: m.from === 'you' ? '#fff' : '#1D2226', border: m.from === 'you' ? 0 : '1px solid #E8EDF2', fontSize: 14, lineHeight: '21px' }}>
                {m.text}
                {m.links && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>{m.links.map(([to, l]) => <Link key={to} to={to} className="tint" style={{ height: 32, padding: '0 14px', fontSize: 12 }}>{l}</Link>)}</div>}
              </div>
            ))}
            <div ref={end} />
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} style={{ width: '100%', maxWidth: 867, alignSelf: 'center', display: 'flex', alignItems: 'center', gap: 12 }}>
        <label style={{ flex: 1, minWidth: 0, height: 54, display: 'flex', alignItems: 'center', gap: 8, padding: '0 20px 0 14px', borderRadius: 999, border: '1px solid #E3E9EE', background: '#fff' }}>
          <Icon d={ICONS.plus} size={18} sw={2} /><span className="sr">Message J.A.V.I</span>
          <input value={text} onChange={(e) => setText(e.target.value)} disabled={busy} placeholder="Paste a job link or ask anything..." style={{ flex: 1, minWidth: 0, border: 0, outline: 'none', background: 'transparent', font: 'inherit', fontSize: 15, color: '#141414', padding: 0 }} />
        </label>
        <button type="submit" className="cta" disabled={busy || !text.trim()} style={{ height: 54, padding: '0 24px', fontSize: 14 }}>{busy ? 'Working…' : 'Send'}</button>
      </form>
    </section>
  );
};
