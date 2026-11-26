import { useEffect, useMemo, useRef, useState, type CSSProperties, type FC, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  businessApi,
  type BusinessLead,
  type BusinessServicesProfile,
  type LeadPitch,
  type LeadStatus,
  type TierId,
  type ValueEstimate,
  type Vertical,
} from '@/api';
import { Icon } from './icons';
import { ago, useAsync } from './data';
import { Badge, EmptyState, Logo, Skeleton, cardStyle, ghostBtn, primaryBtn } from './parts';

const STATUS: Record<LeadStatus, { label: string; bg: string; fg: string }> = {
  new: { label: 'New', bg: '#F1F4F8', fg: '#4C5566' },
  contacted: { label: 'Contacted', bg: '#EAF1FF', fg: '#1746C7' },
  replied: { label: 'Replied', bg: '#FFF5DF', fg: '#8A5A00' },
  call_booked: { label: 'Call booked', bg: '#EDE9FE', fg: '#5B3FC4' },
  won: { label: 'Won', bg: '#E6F9F0', fg: '#0B7A4B' },
  lost: { label: 'Lost', bg: '#FDECEE', fg: '#B4232F' },
};
const FLOW: LeadStatus[] = ['new', 'contacted', 'replied', 'call_booked', 'won', 'lost'];
const SEVERITY: Record<string, string> = { high: '#B4232F', medium: '#8A5A00', low: '#606979' };
const num = (n?: number) => (typeof n === 'number' ? n.toLocaleString('en-GB', { maximumFractionDigits: 0 }) : '–');
const msg = (e: any) => e?.message || 'Something went wrong. Try again.';

const field: CSSProperties = { width: '100%', height: 44, borderRadius: 14, border: '1px solid #DCE3EE', background: '#fff', padding: '0 14px', fontSize: 14, fontFamily: 'inherit', color: '#17191F' };
const label: CSSProperties = { fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.05em', color: '#606979' };
const small: CSSProperties = { ...ghostBtn, height: 38, padding: '0 16px', fontSize: 12 };

const Err: FC<{ text: string }> = ({ text }) => (text ? <div role="alert" style={{ fontSize: 13, color: '#B4232F', lineHeight: 1.45 }}>{text}</div> : null);
const Section: FC<{ title: string; children: ReactNode; right?: ReactNode }> = ({ title, children, right }) => (
  <section style={{ background: '#F5F8FC', borderRadius: 20, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{title}</h3>
      {right}
    </div>
    {children}
  </section>
);

/* ----------------------------- Lead detail ----------------------------- */

const LeadDrawer: FC<{ id: string; onClose: () => void; onChanged: () => void }> = ({ id, onClose, onChanged }) => {
  const res = useAsync(() => businessApi.get(id), [id]);
  const catalog = useAsync(() => businessApi.catalog(), []);
  const [lead, setLead] = useState<BusinessLead | null>(null);
  const [value, setValue] = useState<ValueEstimate | null>(null);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [variant, setVariant] = useState<LeadPitch['variant']>('observation');
  const [channel, setChannel] = useState<LeadPitch['channel']>('whatsapp');
  const [polish, setPolish] = useState(false);
  const [offer, setOffer] = useState('');
  const [note, setNote] = useState('');
  const [lostReason, setLostReason] = useState('');
  const [tier, setTier] = useState<TierId>('better');
  const [scripts, setScripts] = useState<Awaited<ReturnType<typeof businessApi.scripts>> | null>(null);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState('');

  useEffect(() => {
    if (res.data) {
      setLead(res.data.lead);
      setValue(res.data.value);
      setInputs(Object.fromEntries(Object.entries(res.data.lead.valueInputs ?? {}).map(([k, v]) => [k, String(v)])));
    }
  }, [res.data]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);

  const run = async (name: string, fn: () => Promise<void>) => {
    setBusy(name);
    setErr('');
    try {
      await fn();
      onChanged();
    } catch (e) {
      setErr(msg(e));
    } finally {
      setBusy('');
    }
  };
  const apply = (r: { lead: BusinessLead; value: ValueEstimate | null }) => {
    setLead(r.lead);
    setValue(r.value);
  };

  const vert = catalog.data?.verticals.find((v) => v.id === lead?.vertical);
  const bar = (name: string) => ({ disabled: !!busy, style: { ...small, opacity: busy && busy !== name ? 0.6 : 1 } });

  return (
    <div role="dialog" aria-modal="true" aria-label="Business details" onMouseDown={(e) => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, background: 'rgba(23,25,31,.4)', display: 'flex', justifyContent: 'flex-end', zIndex: 80 }}>
      <aside style={{ width: 'min(640px,100%)', height: '100%', overflow: 'auto', background: '#fff', padding: 22, display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '-30px 0 60px -30px rgba(23,25,31,.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {lead && <Logo name={lead.name} size={46} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 19, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead?.name ?? 'Loading…'}</h2>
            {lead && <div style={{ fontSize: 12, color: '#606979' }}>{[vert?.label ?? lead.vertical, lead.area, lead.address].filter(Boolean).join(' · ')}</div>}
          </div>
          {lead && <Badge bg={STATUS[lead.status].bg} fg={STATUS[lead.status].fg}>{STATUS[lead.status].label}</Badge>}
          <button type="button" aria-label="Close" onClick={onClose} style={{ width: 38, height: 38, borderRadius: '50%', border: 0, background: '#EDF1F6', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="close" size={16} /></button>
        </div>

        {res.loading && <Skeleton h={200} r={20} />}
        {res.error && <Err text={res.error} />}
        {lead && (
          <>
            <Err text={err} />

            <Section title="Contact">
              {lead.contacts.length === 0 ? <div style={{ fontSize: 13, color: '#606979' }}>No contact details yet.</div> : lead.contacts.map((c, i) => <div key={i} style={{ fontSize: 13, display: 'flex', gap: 10 }}><span style={{ width: 80, color: '#606979', textTransform: 'capitalize' }}>{c.kind}</span><span style={{ wordBreak: 'break-all' }}>{c.value}</span></div>)}
              {lead.website && <a href={/^https?:/.test(lead.website) ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13 }}>{lead.website}</a>}
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                <input type="checkbox" checked={!!lead.consent?.given} onChange={(e) => run('consent', async () => apply(await businessApi.patch(id, { consent: { given: e.target.checked, channel: 'manual', note: 'ticked in the dashboard' } })))} />
                They agreed to hear from me
              </label>
            </Section>

            <Section title="Audit" right={<button type="button" className="tp-btn-ghost" {...bar('audit')} onClick={() => run('audit', async () => { await businessApi.audit(id); const r = await businessApi.get(id); apply(r); })}>{busy === 'audit' ? 'Checking…' : lead.audit ? 'Run again' : 'Run audit'}</button>}>
              {!lead.audit ? <div style={{ fontSize: 13, color: '#606979' }}>Check their website for things you can fix. Every finding comes with how to verify it.</div> : lead.audit.error ? <Err text={lead.audit.error} /> : lead.audit.findings.length === 0 ? <div style={{ fontSize: 13, color: '#606979' }}>No problems found{lead.audit.reachable === false ? ' (the site could not be reached)' : ''}.</div> : lead.audit.findings.map((f) => (
                <div key={f.id} style={{ background: '#fff', borderRadius: 14, padding: '10px 12px', fontSize: 13 }}>
                  <div style={{ fontWeight: 500, color: SEVERITY[f.severity] }}>{f.title}</div>
                  <div style={{ color: '#4C5566', marginTop: 2 }}>{f.evidence}</div>
                  <div style={{ color: '#98A1AF', marginTop: 2, fontSize: 12 }}>Check it: {f.howToCheck}</div>
                </div>
              ))}
            </Section>

            <Section title="What it is worth to them">
              {vert?.valueInputs.length ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 8 }}>
                    {vert.valueInputs.map((vi) => (
                      <label key={vi.id} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#606979' }}>
                        {vi.label} ({vi.unit}){vi.ownerNumber ? ' · ask the owner' : ''}
                        <input style={{ ...field, height: 40 }} inputMode="decimal" value={inputs[vi.id] ?? ''} placeholder={vi.default !== undefined ? String(vi.default) : ''} onChange={(e) => setInputs({ ...inputs, [vi.id]: e.target.value })} />
                      </label>
                    ))}
                  </div>
                  <button type="button" className="tp-btn-ghost" {...bar('inputs')} onClick={() => run('inputs', async () => {
                    const valueInputs = Object.fromEntries(Object.entries(inputs).filter(([, v]) => v.trim() !== '' && !Number.isNaN(Number(v))).map(([k, v]) => [k, Number(v)]));
                    apply(await businessApi.patch(id, { valueInputs }));
                  })} >Save numbers</button>
                </>
              ) : null}
              {value ? (
                <div style={{ background: '#fff', borderRadius: 14, padding: 12, fontSize: 13, lineHeight: 1.5 }}>
                  <strong>{num(value.monthly)} a month.</strong> {value.sentence}
                  {value.missing.length > 0 && <div style={{ color: '#8A5A00', marginTop: 4 }}>Still needed: {value.missing.join(', ')}</div>}
                </div>
              ) : <div style={{ fontSize: 13, color: '#606979' }}>Add their numbers to see an estimate.</div>}
            </Section>

            <Section title="Quote" right={
              <div style={{ display: 'flex', gap: 6 }}>
                <select aria-label="Offer" value={offer} onChange={(e) => setOffer(e.target.value)} style={{ ...field, height: 38, width: 'auto', fontSize: 12 }}>
                  <option value="">Best fit</option>
                  {catalog.data?.offers.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
                <button type="button" className="tp-btn-ghost" {...bar('quote')} onClick={() => run('quote', async () => apply(await businessApi.quote(id, offer || undefined)))}>{lead.quote ? 'Re-quote' : 'Build quote'}</button>
              </div>}>
              {!lead.quote ? <div style={{ fontSize: 13, color: '#606979' }}>Three price levels, with your costs and your lowest price built in.</div> : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 8 }}>
                    {lead.quote.tiers.map((t) => (
                      <div key={t.tier} style={{ background: '#fff', borderRadius: 14, padding: 12, border: t.recommended ? '1.5px solid #2457E8' : '1px solid transparent' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, textTransform: 'capitalize', fontWeight: 600 }}>{t.tier}{t.recommended && <span style={{ color: '#2457E8' }}>Recommended</span>}</div>
                        <div style={{ fontSize: 13, marginTop: 6 }}>{num(t.setup)} setup</div>
                        <div style={{ fontSize: 13 }}>{num(t.monthly)} / month</div>
                        <ul style={{ margin: '8px 0 0', paddingLeft: 16, fontSize: 11.5, color: '#606979' }}>{t.includes.map((x) => <li key={x}>{x}</li>)}</ul>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, color: '#606979' }}>Your floor: {num(lead.quote.floor.setup)} setup, {num(lead.quote.floor.monthly)} / month.</div>
                  {lead.quote.warnings.map((w) => <div key={w} style={{ fontSize: 12, color: '#8A5A00' }}>{w}</div>)}
                </>
              )}
            </Section>

            <Section title="Outreach">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                <select aria-label="Pitch angle" value={variant} onChange={(e) => setVariant(e.target.value as LeadPitch['variant'])} style={{ ...field, height: 38, width: 'auto', fontSize: 12 }}>
                  <option value="observation">Something I noticed</option>
                  <option value="question">A question</option>
                  <option value="proof">Proof</option>
                </select>
                <select aria-label="Channel" value={channel} onChange={(e) => setChannel(e.target.value as LeadPitch['channel'])} style={{ ...field, height: 38, width: 'auto', fontSize: 12 }}>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                </select>
                <label style={{ fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={polish} onChange={(e) => setPolish(e.target.checked)} />Polish with AI</label>
                <button type="button" className="tp-btn-primary" disabled={!!busy} style={{ ...primaryBtn, height: 38, padding: '0 18px', fontSize: 12, color: '#fff', marginLeft: 'auto' }} onClick={() => run('pitch', async () => { await businessApi.pitch(id, variant, channel, polish); apply(await businessApi.get(id)); })}>{busy === 'pitch' ? 'Writing…' : 'Write pitch'}</button>
              </div>
              {lead.pitches.length === 0 ? <div style={{ fontSize: 13, color: '#606979' }}>No pitches yet.</div> : [...lead.pitches].reverse().map((p) => (
                <div key={p.id} style={{ background: '#fff', borderRadius: 14, padding: 12, fontSize: 13 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 11, color: '#98A1AF', marginBottom: 4 }}>
                    <span style={{ textTransform: 'capitalize' }}>{p.channel} · {p.variant}</span><span>{ago(p.createdAt)}</span>
                  </div>
                  {p.subject && <div style={{ fontWeight: 500 }}>{p.subject}</div>}
                  <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5, marginTop: 2 }}>{p.body}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <button type="button" className="tp-btn-ghost" style={small} onClick={() => navigator.clipboard?.writeText(p.body).then(() => { setCopied(p.id); setTimeout(() => setCopied(''), 1500); })}>{copied === p.id ? 'Copied' : 'Copy'}</button>
                    {p.waLink && <a className="tp-btn-ghost" href={p.waLink} target="_blank" rel="noopener noreferrer" style={{ ...small, display: 'inline-flex', alignItems: 'center' }}>Open WhatsApp</a>}
                  </div>
                </div>
              ))}
            </Section>

            <Section title="Call and walk-in scripts" right={<button type="button" className="tp-btn-ghost" {...bar('scripts')} onClick={() => run('scripts', async () => setScripts(await businessApi.scripts(id)))}>{scripts ? 'Refresh' : 'Show scripts'}</button>}>
              {scripts && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, lineHeight: 1.5 }}>
                  <div><div style={label}>Call</div><ol style={{ margin: '4px 0 0', paddingLeft: 18 }}>{scripts.call.map((x, i) => <li key={i}>{x}</li>)}</ol></div>
                  <div><div style={label}>Walk in</div><ol style={{ margin: '4px 0 0', paddingLeft: 18 }}>{scripts.walkIn.map((x, i) => <li key={i}>{x}</li>)}</ol></div>
                  <div><div style={label}>If they say…</div>{scripts.objections.map((o) => <div key={o.objection} style={{ marginTop: 4 }}><strong>{o.objection}</strong> {o.answer}</div>)}</div>
                  <div style={{ color: '#4C5566' }}>{scripts.takeaway}</div>
                  {scripts.capacityNote && <div style={{ color: '#8A5A00' }}>{scripts.capacityNote}</div>}
                </div>
              )}
            </Section>

            <Section title="Move this deal">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {FLOW.filter((s) => s !== lead.status && s !== 'lost' && s !== 'won').map((s) => (
                  <button key={s} type="button" className="tp-btn-ghost" {...bar(s)} onClick={() => run(s, async () => { await businessApi.move(id, s, { note: note.trim() || undefined }); setNote(''); apply(await businessApi.get(id)); })}>{STATUS[s].label}</button>
                ))}
              </div>
              <input style={field} placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                <select aria-label="Tier won" value={tier} onChange={(e) => setTier(e.target.value as TierId)} style={{ ...field, height: 38, width: 'auto', fontSize: 12 }}>
                  {(['good', 'better', 'best'] as TierId[]).map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <button type="button" className="tp-btn-primary" disabled={!!busy || lead.status === 'won'} style={{ ...primaryBtn, height: 38, padding: '0 18px', fontSize: 12, color: '#fff', background: '#0B7A4B' }} onClick={() => run('won', async () => { await businessApi.move(id, 'won', { note: note.trim() || undefined, deal: { tier } }); apply(await businessApi.get(id)); })}>Mark won</button>
                <input style={{ ...field, height: 38, flex: '1 1 160px', width: 'auto', fontSize: 12 }} placeholder="Why lost? (optional)" value={lostReason} onChange={(e) => setLostReason(e.target.value)} />
                <button type="button" className="tp-btn-ghost" {...bar('lost')} onClick={() => run('lost', async () => { await businessApi.move(id, 'lost', { lostReason: lostReason.trim() || undefined }); apply(await businessApi.get(id)); })}>Mark lost</button>
              </div>
              {lead.deal && <div style={{ fontSize: 13, color: '#0B7A4B' }}>Deal: {lead.deal.tier} · {num(lead.deal.setup)} setup · {num(lead.deal.monthly)} / month</div>}
            </Section>

            <Section title="Notes">
              {lead.notes.map((n, i) => <div key={i} style={{ fontSize: 13 }}>{n.text} <span style={{ color: '#98A1AF', fontSize: 11 }}>{ago(n.at)}</span></div>)}
              <div style={{ display: 'flex', gap: 6 }}>
                <input style={{ ...field, height: 40 }} placeholder="Add a note" value={note} onChange={(e) => setNote(e.target.value)} />
                <button type="button" className="tp-btn-ghost" disabled={!note.trim() || !!busy} style={small} onClick={() => run('note', async () => { apply(await businessApi.patch(id, { note: note.trim() })); setNote(''); })}>Save</button>
              </div>
            </Section>

            <button type="button" onClick={() => window.confirm('Remove this business?') && run('del', async () => { await businessApi.remove(id); onClose(); })} style={{ alignSelf: 'flex-start', border: 0, background: 'none', color: '#B4232F', fontSize: 13, fontWeight: 500 }}>Remove this business</button>
          </>
        )}
      </aside>
    </div>
  );
};

/* ------------------------------ Find tab ------------------------------ */

const FindTab: FC<{ onFound: () => void }> = ({ onFound }) => {
  const catalog = useAsync(() => businessApi.catalog(), []);
  const [vertical, setVertical] = useState<Vertical>('restaurant');
  const [area, setArea] = useState('');
  const [busy, setBusy] = useState('');
  const [msgText, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [manual, setManual] = useState({ name: '', website: '', phone: '', area: '' });
  const file = useRef<HTMLInputElement>(null);
  const verticals = (catalog.data?.verticals ?? []).filter((v) => v.id !== 'other');

  const go = async (name: string, fn: () => Promise<string>) => {
    setBusy(name);
    setErr('');
    setMsg('');
    try {
      setMsg(await fn());
      onFound();
    } catch (e) {
      setErr(msg(e));
    } finally {
      setBusy('');
    }
  };

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
      <div className="tp-card" style={{ ...cardStyle, flex: '2 1 380px', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 500 }}>Search an area</h2>
        <p style={{ margin: 0, fontSize: 13, color: '#606979', lineHeight: 1.5 }}>Pick a type of business and a place. Results come from OpenStreetMap and can take a minute.</p>
        <form onSubmit={(e) => { e.preventDefault(); void go('search', async () => { const r = await businessApi.search(vertical, area.trim()); return `${r.added} new business${r.added === 1 ? '' : 'es'} added${r.cached ? ' (recent search reused)' : ''} near ${r.center.label}.`; }); }} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <select aria-label="Business type" value={vertical} onChange={(e) => setVertical(e.target.value as Vertical)} style={{ ...field, flex: '1 1 160px', width: 'auto' }}>
            {verticals.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
          </select>
          <input style={{ ...field, flex: '2 1 200px', width: 'auto' }} placeholder="Area, e.g. Yaba, Lagos" required minLength={2} value={area} onChange={(e) => setArea(e.target.value)} aria-label="Area" />
          <button type="submit" className="tp-btn-primary" disabled={!!busy} style={{ ...primaryBtn, color: '#fff' }}>{busy === 'search' ? 'Searching…' : 'Find businesses'}</button>
        </form>
        {msgText && <div role="status" style={{ fontSize: 13, color: '#0B7A4B' }}>{msgText}</div>}
        <Err text={err} />
      </div>

      <div className="tp-card" style={{ ...cardStyle, flex: '1 1 300px', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 500 }}>Import a list</h2>
        <p style={{ margin: 0, fontSize: 13, color: '#606979', lineHeight: 1.5 }}>Upload a CSV or spreadsheet. A "consent" column marks who agreed to hear from you.</p>
        <input ref={file} type="file" accept=".csv,.xlsx,.xls" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void go('import', async () => { const r = await businessApi.importLeads(f); return `${r.created} imported${r.skipped.length ? `, ${r.skipped.length} skipped` : ''}.`; }); if (file.current) file.current.value = ''; }} />
        <button type="button" className="tp-btn-ghost" disabled={!!busy} onClick={() => file.current?.click()} style={ghostBtn}>{busy === 'import' ? 'Importing…' : 'Choose file'}</button>
      </div>

      <div className="tp-card" style={{ ...cardStyle, flex: '1 1 100%', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 500 }}>Add one yourself</h2>
        <form onSubmit={(e) => { e.preventDefault(); void go('add', async () => { await businessApi.add({ name: manual.name.trim(), vertical, area: manual.area.trim() || undefined, website: manual.website.trim() || undefined, contacts: manual.phone.trim() ? [{ kind: 'phone', value: manual.phone.trim(), isBusinessLine: true }] : undefined }); setManual({ name: '', website: '', phone: '', area: '' }); return 'Business added to your pipeline.'; }); }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 8 }}>
          <input style={field} placeholder="Business name" required value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })} />
          <input style={field} placeholder="Website (optional)" value={manual.website} onChange={(e) => setManual({ ...manual, website: e.target.value })} />
          <input style={field} placeholder="Phone (optional)" value={manual.phone} onChange={(e) => setManual({ ...manual, phone: e.target.value })} />
          <input style={field} placeholder="Area (optional)" value={manual.area} onChange={(e) => setManual({ ...manual, area: e.target.value })} />
          <button type="submit" className="tp-btn-primary" disabled={!!busy} style={{ ...primaryBtn, color: '#fff' }}>Add</button>
        </form>
        <div style={{ fontSize: 12, color: '#98A1AF' }}>Uses the business type chosen above ({verticals.find((v) => v.id === vertical)?.label ?? vertical}).</div>
      </div>
    </div>
  );
};

/* ------------------------------ Offer tab ------------------------------ */

const OfferTab: FC = () => {
  const res = useAsync(() => businessApi.getServices(), []);
  const [f, setF] = useState<Record<string, string>>({});
  const [ownership, setOwnership] = useState(true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => {
    const s = res.data;
    if (!s) return;
    setOwnership(!!s.guarantees?.ownership);
    setF({
      brandName: s.brandName ?? '', city: s.city ?? '', publicPhone: s.publicPhone ?? '', publicEmail: s.publicEmail ?? '', physicalAddress: s.physicalAddress ?? '',
      hourlyRate: String(s.hourlyRate ?? ''), fxRate: String(s.fxRate ?? ''), marginPct: String(s.marginPct ?? ''),
      monthlyIncomeTarget: s.monthlyIncomeTarget ? String(s.monthlyIncomeTarget) : '', capacityPerMonth: s.capacityPerMonth ? String(s.capacityPerMonth) : '',
      liveByDays: s.guarantees?.liveByDays ? String(s.guarantees.liveByDays) : '',
    });
  }, [res.data]);

  const save = async () => {
    setBusy(true);
    setErr('');
    setNote('');
    const n = (k: string) => (f[k]?.trim() ? Number(f[k]) : undefined);
    try {
      const body: Partial<BusinessServicesProfile> = {
        brandName: f.brandName, city: f.city, publicPhone: f.publicPhone, publicEmail: f.publicEmail, physicalAddress: f.physicalAddress,
        hourlyRate: n('hourlyRate'), fxRate: n('fxRate'), marginPct: n('marginPct'), monthlyIncomeTarget: n('monthlyIncomeTarget'),
        capacityPerMonth: n('capacityPerMonth') ?? null, guarantees: { ownership, liveByDays: n('liveByDays') },
      } as any;
      await businessApi.saveServices(body);
      setNote('Saved.');
    } catch (e) {
      setErr(msg(e));
    } finally {
      setBusy(false);
    }
  };
  const inp = (k: string, ph: string, type = 'text') => (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#606979' }}>{ph}
      <input style={field} type={type} inputMode={type === 'number' ? 'decimal' : undefined} value={f[k] ?? ''} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
    </label>
  );

  if (res.loading) return <Skeleton h={300} r={26} />;
  if (res.error) return <EmptyState icon="close" title="Couldn't load your offer" body={res.error} />;
  return (
    <div className="tp-card" style={{ ...cardStyle, gap: 16 }}>
      <p style={{ margin: 0, fontSize: 13, color: '#606979', lineHeight: 1.5 }}>These details feed your quotes, pitches and scripts. Your lowest price is worked out from your rate and costs, so you never quote below it.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
        {inp('brandName', 'Brand name')}
        {inp('city', 'City')}
        {inp('publicPhone', 'Public phone')}
        {inp('publicEmail', 'Public email', 'email')}
        {inp('physicalAddress', 'Address')}
        {inp('hourlyRate', 'Your hourly rate', 'number')}
        {inp('fxRate', 'Exchange rate', 'number')}
        {inp('marginPct', 'Margin %', 'number')}
        {inp('monthlyIncomeTarget', 'Monthly income target', 'number')}
        {inp('capacityPerMonth', 'New clients you can take a month', 'number')}
        {inp('liveByDays', 'Go live within (days)', 'number')}
      </div>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}><input type="checkbox" checked={ownership} onChange={(e) => setOwnership(e.target.checked)} />Client owns their website and accounts</label>
      <Err text={err} />
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button type="button" className="tp-btn-primary" disabled={busy} onClick={save} style={{ ...primaryBtn, color: '#fff' }}>{busy ? 'Saving…' : 'Save'}</button>
        {note && <span role="status" style={{ fontSize: 13, color: '#0B7A4B' }}>{note}</span>}
      </div>
    </div>
  );
};

/* ---------------------------- Pipeline tab ---------------------------- */

const PipelineTab: FC<{ onOpen: (id: string) => void; goFind: () => void; version: number }> = ({ onOpen, goFind, version }) => {
  const [status, setStatus] = useState<LeadStatus | null>(null);
  const [q, setQ] = useState('');
  const res = useAsync(() => businessApi.list(), [version]);
  const catalog = useAsync(() => businessApi.catalog(), []);
  const leads = res.data?.leads ?? [];
  const counts = useMemo(() => {
    const c = {} as Record<string, number>;
    leads.forEach((l) => (c[l.status] = (c[l.status] ?? 0) + 1));
    return c;
  }, [leads]);
  const rows = leads.filter((l) => (!status || l.status === status) && (!q || `${l.name} ${l.area ?? ''}`.toLowerCase().includes(q.toLowerCase())));
  const vlabel = (id: string) => catalog.data?.verticals.find((v) => v.id === id)?.label ?? id;
  const won = leads.filter((l) => l.status === 'won' && l.deal);
  const mrr = won.reduce((n, l) => n + (l.deal?.monthly ?? 0), 0);

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        {[['Businesses', leads.length], ['In conversation', (counts.contacted ?? 0) + (counts.replied ?? 0) + (counts.call_booked ?? 0)], ['Won', counts.won ?? 0], ['Monthly income won', num(mrr)]].map(([l, v]) => (
          <div key={String(l)} className="tp-card" style={{ ...cardStyle, flex: '1 1 160px', gap: 4 }}>
            <div style={{ fontSize: 12, color: '#606979' }}>{l}</div>
            <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: '-.03em' }}>{res.loading ? '–' : v}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 18, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        {([null, ...FLOW] as (LeadStatus | null)[]).map((s) => {
          const active = status === s;
          return (
            <button key={s ?? 'all'} type="button" onClick={() => setStatus(s)} aria-pressed={active} style={{ height: 40, padding: '0 16px', borderRadius: 999, fontSize: 13, fontWeight: 500, background: active ? '#17191F' : 'rgba(255,255,255,.7)', color: active ? '#fff' : '#17191F', border: `1px solid ${active ? '#17191F' : '#E3E9F2'}` }}>
              {s ? STATUS[s].label : 'All'} {s ? counts[s] ?? 0 : leads.length}
            </button>
          );
        })}
        <input aria-label="Search businesses" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" style={{ ...field, height: 40, marginLeft: 'auto', maxWidth: 240 }} />
      </div>

      <div className="tp-card" style={{ ...cardStyle, marginTop: 16, padding: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {res.loading ? [0, 1, 2].map((i) => <Skeleton key={i} h={68} r={20} />) : res.error ? <EmptyState icon="close" title="Couldn't load businesses" body={res.error} /> : rows.length === 0 ? (
            <EmptyState icon="business" title={leads.length ? 'Nothing matches' : 'No businesses yet'} body={leads.length ? 'Try another stage or search.' : 'Find businesses in an area, import a list, or add one yourself.'} cta={undefined} />
          ) : rows.map((l) => (
            <button key={l._id} type="button" className="tp-lift" onClick={() => onOpen(l._id)} style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', background: '#fff', borderRadius: 20, padding: '12px 16px', border: 0, textAlign: 'left', width: '100%' }}>
              <Logo name={l.name} size={42} />
              <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</div>
                <div style={{ fontSize: 12, color: '#606979' }}>{[vlabel(l.vertical), l.area].filter(Boolean).join(' · ')}</div>
              </div>
              {l.audit && <span style={{ fontSize: 12, color: '#606979' }}>{l.audit.findings.length} finding{l.audit.findings.length === 1 ? '' : 's'}</span>}
              {l.pitches.length > 0 && <span style={{ fontSize: 12, color: '#606979' }}>{l.pitches.length} pitch{l.pitches.length === 1 ? '' : 'es'}</span>}
              <Badge bg={STATUS[l.status].bg} fg={STATUS[l.status].fg}>{STATUS[l.status].label}</Badge>
              <span style={{ fontSize: 12, color: '#98A1AF', minWidth: 60, textAlign: 'right' }}>{ago(l.updatedAt)}</span>
            </button>
          ))}
        </div>
        {!res.loading && leads.length === 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12 }}>
            <button type="button" className="tp-btn-primary" onClick={goFind} style={{ ...primaryBtn, color: '#fff' }}>Find businesses</button>
          </div>
        )}
      </div>
    </>
  );
};

/* -------------------------------- Page -------------------------------- */

export const Business: FC = () => {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as 'pipeline' | 'find' | 'offer') || 'pipeline';
  const [open, setOpen] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const bump = () => setVersion((v) => v + 1);
  const go = (t: string) => setParams(t === 'pipeline' ? {} : { tab: t }, { replace: true });

  const tabBtn = (k: string, text: string) => (
    <button key={k} type="button" onClick={() => go(k)} aria-pressed={tab === k} style={{ height: 44, padding: '0 22px', borderRadius: 999, fontSize: 13, fontWeight: 500, background: tab === k ? '#17191F' : 'rgba(255,255,255,.7)', color: tab === k ? '#fff' : '#17191F', border: `1px solid ${tab === k ? '#17191F' : '#E3E9F2'}` }}>{text}</button>
  );

  return (
    <main style={{ paddingLeft: 8 }}>
      <div style={{ marginTop: 44, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 500, letterSpacing: '-.025em' }}>Business mode</h1>
          <p style={{ margin: '8px 0 0', fontSize: 14, color: '#606979' }}>Find businesses that need what you build, show them what they are missing, and move each one to a yes.</p>
        </div>
        <button type="button" className="tp-btn-primary" onClick={() => go('find')} style={{ ...primaryBtn, color: '#fff', gap: 8 }}><Icon name="plus" size={16} sw={2} />Find businesses</button>
      </div>

      <div style={{ margin: '24px 0 18px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {tabBtn('pipeline', 'Pipeline')}
        {tabBtn('find', 'Find businesses')}
        {tabBtn('offer', 'Your offer')}
      </div>

      {tab === 'pipeline' && <PipelineTab version={version} onOpen={setOpen} goFind={() => go('find')} />}
      {tab === 'find' && <FindTab onFound={() => { bump(); }} />}
      {tab === 'offer' && <OfferTab />}
      {open && <LeadDrawer id={open} onClose={() => setOpen(null)} onChanged={bump} />}
    </main>
  );
};
