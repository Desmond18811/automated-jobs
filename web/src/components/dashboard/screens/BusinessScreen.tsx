import { useEffect, useMemo, useRef, useState, type FC, type FormEvent } from 'react';
import { businessApi, type BusinessLead, type LeadPitch, type LeadStatus, type Vertical } from '@/api';
import { useDash } from '../context';
import { Card, EmptyNote, ErrorNote, Icon, ICONS, Logo, Muted, PageHead, Skeleton, useAsync } from '../ui';

const COLS: Array<{ id: LeadStatus; label: string; dot: string }> = [
  { id: 'new', label: 'NEW', dot: '#94A3B8' }, { id: 'contacted', label: 'CONTACTED', dot: '#2563EB' }, { id: 'replied', label: 'REPLIED', dot: '#60A5FA' },
  { id: 'call_booked', label: 'CALL BOOKED', dot: '#14B8A6' }, { id: 'won', label: 'WON', dot: '#0F766E' }, { id: 'lost', label: 'LOST', dot: '#CBD3DA' },
];
const num = (n: number) => (n >= 1000 ? `${Math.round(n / 100) / 10}k`.replace('.0k', 'k') : String(n));
const sevColor = { high: '#EF4444', medium: '#F59E0B', low: '#94A3B8' };

const LeadPanel: FC<{ id: string; onChanged: () => void }> = ({ id, onChanged }) => {
  const { notify } = useDash();
  const detail = useAsync(() => businessApi.get(id), [id]);
  const [busy, setBusy] = useState('');
  const [pitch, setPitch] = useState<LeadPitch | null>(null);
  const lead = detail.data?.lead;
  const value = detail.data?.value;

  useEffect(() => setPitch(null), [id]);

  const run = async (name: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(name);
    try { await fn(); await detail.reload(); onChanged(); if (ok) notify(ok); } catch (e: any) { notify(e?.message || 'That did not work'); } finally { setBusy(''); }
  };
  const moveTo = (to: LeadStatus) => {
    if (!lead || to === lead.status) return;
    const extra: any = {};
    if (to === 'lost') { const r = window.prompt('Why was it lost? (optional)'); if (r === null) return; extra.lostReason = r; }
    if (to === 'won') { const tier = lead.quote?.tiers.find((t) => t.recommended)?.tier ?? lead.quote?.tiers[0]?.tier; if (!tier) return notify('Build a quote first so there is a deal to record.'); extra.deal = { tier }; }
    void run('move', () => businessApi.move(id, to, extra), `Moved to ${to.replace('_', ' ')}`);
  };

  if (detail.loading && !lead) return <Skeleton h={420} style={{ borderRadius: 20 }} />;
  if (detail.error) return <ErrorNote message={detail.error} onRetry={detail.reload} />;
  if (!lead) return null;
  const tier = lead.quote?.tiers.find((t) => t.recommended) ?? lead.quote?.tiers[0];
  const phone = lead.contacts.find((c) => c.kind === 'phone' || c.kind === 'whatsapp')?.value;

  return (
    <aside aria-labelledby="ld-title" className="card" style={{ flex: '0 1 336px', minWidth: 0, width: '100%', padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <Logo name={lead.name} size={42} round={false} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <h2 id="ld-title" style={{ margin: 0, fontSize: 17, lineHeight: '22px', fontWeight: 600, color: '#111418' }}>{lead.name}</h2>
          <span style={{ display: 'block', fontSize: 12, lineHeight: '17px', color: '#5F6A74' }}>{[lead.category || lead.vertical, lead.area].filter(Boolean).join(' · ')}</span>
        </span>
      </div>

      <label style={{ display: 'block', marginTop: 14 }}><span style={{ fontSize: 12, color: '#5F6A74' }}>Stage</span>
        <select className="field" style={{ height: 38, marginTop: 4 }} value={lead.status} disabled={!!busy} onChange={(e) => moveTo(e.target.value as LeadStatus)}>{COLS.map((c) => <option key={c.id} value={c.id}>{c.label[0] + c.label.slice(1).toLowerCase()}</option>)}</select></label>

      <h3 style={{ margin: '18px 0 8px', fontSize: 13, lineHeight: '18px', fontWeight: 600, color: '#1D2226' }}>What the audit found</h3>
      {!lead.audit ? <Muted style={{ margin: 0 }}>{lead.website ? 'Run the audit to check their website and listing.' : 'No website on file. That is itself the finding. Run the audit to record it.'}</Muted> : lead.audit.findings.length === 0 ? <Muted style={{ margin: 0 }}>{lead.audit.error || 'Nothing obviously wrong found.'}</Muted> : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {lead.audit.findings.map((f) => <li key={f.id} style={{ display: 'flex', gap: 10, fontSize: 13, lineHeight: '18px', color: '#2E3338' }}><span aria-hidden="true" style={{ marginTop: 5, width: 8, height: 8, flex: 'none', borderRadius: '50%', background: sevColor[f.severity] }} /><span><strong style={{ fontWeight: 500 }}>{f.title}.</strong> {f.evidence}</span></li>)}
        </ul>
      )}

      {tier && (
        <div style={{ marginTop: 16, padding: 14, borderRadius: 14, background: '#F0F6FF' }}>
          <p style={{ margin: 0, fontSize: 12, lineHeight: '16px', color: '#3E4851' }}>Your offer</p>
          <p style={{ margin: '2px 0 0', fontSize: 15, lineHeight: '20px', fontWeight: 600, color: '#111418', textTransform: 'capitalize' }}>{lead.quote!.offer.replace(/_/g, ' ')}</p>
          <p style={{ margin: '6px 0 0', fontSize: 22, lineHeight: '28px', fontWeight: 500, letterSpacing: '-0.02em', color: '#1D4ED8' }}>{num(tier.monthly)}<span style={{ fontSize: 13, fontWeight: 400, color: '#3E4851' }}> / month · {num(tier.setup)} setup</span></p>
          {value?.sentence && <p style={{ margin: '6px 0 0', fontSize: 12, lineHeight: '17px', color: '#3E4851' }}>{value.sentence}</p>}
          {lead.quote!.warnings.map((w) => <p key={w} style={{ margin: '6px 0 0', fontSize: 12, lineHeight: '17px', color: '#92400E' }}>{w}</p>)}
        </div>
      )}

      {lead.deal && <p style={{ margin: '12px 0 0', fontSize: 13, fontWeight: 600, color: '#0F766E' }}>Won: {num(lead.deal.monthly)} / month</p>}
      {lead.lostReason && <p style={{ margin: '12px 0 0', fontSize: 12, color: '#5F6A74' }}>Lost: {lead.lostReason}</p>}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
        <button type="button" className="ghost" disabled={!!busy} onClick={() => run('audit', () => businessApi.audit(id), 'Audit complete')} style={{ flex: 1, height: 42, fontSize: 13 }}>{busy === 'audit' ? 'Auditing…' : lead.audit ? 'Re-run audit' : 'Run audit'}</button>
        <button type="button" className="ghost" disabled={!!busy} onClick={() => run('quote', () => businessApi.quote(id), 'Quote ready')} style={{ flex: 1, height: 42, fontSize: 13 }}>{busy === 'quote' ? 'Pricing…' : lead.quote ? 'Reprice' : 'Build quote'}</button>
        <button type="button" className="cta" disabled={!!busy} onClick={() => run('pitch', async () => { const r = await businessApi.pitch(id, 'observation', phone ? 'whatsapp' : 'email'); setPitch(r.pitch); }, 'Pitch drafted')} style={{ flexBasis: '100%', height: 42, fontSize: 13 }}>{busy === 'pitch' ? 'Writing…' : 'Draft pitch'}</button>
      </div>

      {(pitch || lead.pitches.length > 0) && (() => {
        const p = pitch ?? lead.pitches[lead.pitches.length - 1];
        return (
          <div style={{ marginTop: 14, padding: 12, borderRadius: 12, border: '1px solid #E8EDF2' }}>
            <p style={{ margin: 0, fontSize: 12, color: '#5F6A74' }}>{p.channel === 'whatsapp' ? 'WhatsApp message' : 'Email'} · {p.variant}</p>
            {p.subject && <p style={{ margin: '6px 0 0', fontSize: 13, fontWeight: 600 }}>{p.subject}</p>}
            <p style={{ margin: '6px 0 0', fontSize: 13, lineHeight: '19px', whiteSpace: 'pre-wrap', color: '#2E3338' }}>{p.body}</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button type="button" className="ghost" onClick={() => navigator.clipboard?.writeText(p.body).then(() => notify('Copied'))} style={{ height: 32, padding: '0 12px', fontSize: 12 }}>Copy</button>
              {p.waLink && <a className="tint" href={p.waLink} target="_blank" rel="noreferrer" style={{ height: 32, padding: '0 12px', fontSize: 12 }}>Open WhatsApp</a>}
            </div>
          </div>);
      })()}
      <p style={{ margin: '10px 0 0', textAlign: 'center', fontSize: 11, lineHeight: '15px', color: '#5F6A74' }}>J.A.V.I writes the pitch. You send it from your own WhatsApp or email.</p>
    </aside>
  );
};

export const BusinessScreen: FC = () => {
  const { version, notify } = useDash();
  const catalog = useAsync(() => businessApi.catalog(), []);
  const leads = useAsync(async () => (await businessApi.list()).leads, [version]);
  const [vertical, setVertical] = useState<Vertical>('restaurant');
  const [area, setArea] = useState('');
  const [busy, setBusy] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [walkIn, setWalkIn] = useState(false);
  const [wName, setWName] = useState('');
  const [wPhone, setWPhone] = useState('');
  const [attrib, setAttrib] = useState('');
  const csv = useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const list: BusinessLead[] = leads.data ?? [];
  const by = useMemo(() => COLS.map((c) => ({ ...c, items: list.filter((l) => l.status === c.id) })), [list]);
  const wonMonthly = list.filter((l) => l.status === 'won').reduce((s, l) => s + (l.deal?.monthly ?? 0), 0);
  const audited = list.filter((l) => l.status !== 'new').length;
  const current = selected ?? list[0]?._id ?? null;

  const search = async (e: FormEvent) => {
    e.preventDefault();
    if (!area.trim()) return notify('Enter an area, e.g. Wuse 2, Abuja');
    setBusy('search');
    try { const r = await businessApi.search(vertical, area.trim()); setAttrib(r.attribution); notify(r.added ? `${r.added} new leads found` : 'No new leads in that area'); await leads.reload(); }
    catch (err: any) { notify(err?.message || 'Search failed. Try a more specific area.'); } finally { setBusy(''); }
  };
  const importCsv = async (f: File) => {
    setBusy('csv');
    try { const r = await businessApi.importLeads(f); notify(`${r.created} leads imported${r.skipped.length ? `, ${r.skipped.length} skipped` : ''}`); await leads.reload(); }
    catch (err: any) { notify(err?.message || 'Could not read that CSV'); } finally { setBusy(''); }
  };
  const addWalkIn = async (e: FormEvent) => {
    e.preventDefault();
    if (!wName.trim()) return;
    setBusy('add');
    try { const l = await businessApi.add({ name: wName.trim(), vertical, area: area.trim() || undefined, contacts: wPhone ? [{ kind: 'phone', value: wPhone.trim() }] : [] }); setWName(''); setWPhone(''); setWalkIn(false); setSelected(l._id); await leads.reload(); notify('Lead added'); }
    catch (err: any) { notify(err?.message || 'Could not add that lead'); } finally { setBusy(''); }
  };

  return (
    <>
      <PageHead title="Business mode" blurb="Find small businesses with a visible, fixable problem. J.A.V.I audits them, then prices a monthly service from their own numbers."
        stats={[{ label: 'Leads found', value: list.length }, { label: 'Contacted', value: audited }, { label: 'Won, monthly', value: num(wonMonthly) }]} />

      <section aria-label="Find leads" className="card" style={{ marginTop: 30, padding: '16px 18px 12px', borderRadius: 20 }}>
        <form onSubmit={search} style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <label style={{ height: 46, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 14px', borderRadius: 999, border: '1px solid #DCE3E8', fontSize: 13, color: '#4E5862' }}><span className="sr">Business type</span>
            <select value={vertical} onChange={(e) => setVertical(e.target.value as Vertical)} style={{ border: 0, outline: 'none', background: 'transparent', font: 'inherit', fontSize: 14, fontWeight: 500, color: '#1D2226' }}>
              {(catalog.data?.verticals ?? [{ id: 'restaurant', label: 'Restaurants' }]).map((v: any) => <option key={v.id} value={v.id}>{v.label}</option>)}</select></label>
          <label style={{ flex: '1 1 280px', minWidth: 0, height: 46, display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', borderRadius: 999, border: '1px solid #DCE3E8', color: '#5F6A74' }}><Icon d={ICONS.pin} size={17} /><span className="sr">Area</span>
            <input value={area} onChange={(e) => setArea(e.target.value)} placeholder="Area, e.g. Wuse 2, Abuja" style={{ flex: 1, minWidth: 0, border: 0, outline: 'none', background: 'transparent', font: 'inherit', fontSize: 14, color: '#141414', padding: 0 }} /></label>
          <button type="submit" className="cta" disabled={!!busy} style={{ height: 46, padding: '0 20px', fontSize: 14 }}>{busy === 'search' ? 'Searching… this can take a minute' : 'Find leads'}</button>
          <button type="button" className="ghost" disabled={!!busy} onClick={() => csv.current?.click()} style={{ height: 46, padding: '0 16px', fontSize: 14 }}>Import CSV</button>
          <input ref={csv} type="file" hidden accept=".csv,text/csv" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importCsv(f); e.target.value = ''; }} />
          <button type="button" className="ghost" onClick={() => setWalkIn((w) => !w)} style={{ height: 46, padding: '0 16px', fontSize: 14 }}>+ Add a walk-in</button>
        </form>
        {walkIn && <form onSubmit={addWalkIn} style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
          <input className="field" aria-label="Business name" placeholder="Business name" value={wName} onChange={(e) => setWName(e.target.value)} style={{ flex: '1 1 220px', width: 'auto' }} />
          <input className="field" aria-label="Phone (optional)" placeholder="Phone (optional)" value={wPhone} onChange={(e) => setWPhone(e.target.value)} style={{ flex: '1 1 180px', width: 'auto' }} />
          <button type="submit" className="cta" disabled={!!busy || !wName.trim()} style={{ height: 44, padding: '0 20px', fontSize: 14 }}>Add lead</button></form>}
        <p style={{ margin: '10px 4px 0', fontSize: 11, lineHeight: '15px', color: '#5F6A74' }}>{attrib || 'Business data © OpenStreetMap contributors (ODbL).'} Coverage varies; your own contacts and walk-ins are often the best leads.</p>
      </section>

      {leads.error && <div style={{ marginTop: 14 }}><ErrorNote message={leads.error} onRetry={leads.reload} /></div>}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 14, marginTop: 14 }}>
        <div style={{ flex: '999 1 560px', minWidth: 0, overflowX: 'auto' }}>
          {list.length === 0 && !leads.loading ? <Card><EmptyNote title="No leads yet" body="Pick a business type and an area above, import a CSV, or add someone you met in person." /></Card> : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,minmax(150px,1fr))', gap: 10, minWidth: 950 }}>
              {by.map((c) => { const shown = expanded[c.id] ? c.items : c.items.slice(0, 4); return (
                <section key={c.id} aria-labelledby={`b-${c.id}`} style={{ minHeight: 520, padding: 10, borderRadius: 18, background: 'rgba(255,255,255,.6)', border: '1px solid #E8EDF2' }}>
                  <h2 id={`b-${c.id}`} style={{ margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6, padding: '2px 4px', fontSize: 12, lineHeight: '18px', fontWeight: 600, letterSpacing: '.02em', color: '#1D2226' }}><span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: c.dot }} />{c.label}<span style={{ marginLeft: 'auto', fontWeight: 500, color: '#5F6A74' }}>{c.items.length}</span></h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {leads.loading && !leads.data && <Skeleton h={70} />}
                    {shown.map((l) => { const on = l._id === current; const top = l.audit?.findings?.[0]; return (
                      <button key={l._id} type="button" className="kc" aria-current={on} onClick={() => setSelected(l._id)} style={{ padding: 11, cursor: 'pointer', border: on ? '1.5px solid #2563EB' : undefined, background: on ? '#F5F8FF' : c.id === 'won' ? '#F0FDFA' : c.id === 'lost' ? '#FAFBFC' : '#fff' }}>
                        <span style={{ display: 'block', fontSize: 13, lineHeight: '18px', fontWeight: 500, color: '#1D2226' }}>{l.name}</span>
                        <span style={{ display: 'block', fontSize: 11, lineHeight: '15px', color: '#5F6A74' }}>{[l.category || l.vertical, l.area].filter(Boolean).join(' · ')}</span>
                        {l.deal ? <span style={{ display: 'block', marginTop: 8, fontSize: 11, fontWeight: 600, color: '#0F766E' }}>{num(l.deal.monthly)} / month</span>
                          : top ? <span style={{ display: 'inline-flex', marginTop: 8, padding: '3px 8px', borderRadius: 999, background: '#FFF7ED', color: '#9A3412', fontSize: 11, lineHeight: '15px' }}>{top.title}</span>
                          : !l.website && l.status === 'new' ? <span style={{ display: 'inline-flex', marginTop: 8, padding: '3px 8px', borderRadius: 999, background: '#FFF7ED', color: '#9A3412', fontSize: 11, lineHeight: '15px' }}>No website</span> : null}
                      </button>); })}
                    {c.items.length > 4 && <button type="button" className="ghost" onClick={() => setExpanded((x) => ({ ...x, [c.id]: !x[c.id] }))} style={{ height: 32, borderRadius: 10, background: 'transparent', fontSize: 12, fontWeight: 500, color: '#1D4ED8' }}>{expanded[c.id] ? 'Show less' : `Show ${c.items.length - 4} more`}</button>}
                  </div>
                </section>); })}
            </div>
          )}
        </div>
        {current && <LeadPanel id={current} onChanged={() => void leads.reload()} />}
      </div>
    </>
  );
};
