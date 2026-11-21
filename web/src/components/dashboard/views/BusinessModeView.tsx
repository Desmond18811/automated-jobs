import { useEffect, useMemo, useRef, useState, type CSSProperties, type FC, type ReactNode } from 'react';
import {
  businessApi,
  type BusinessLead,
  type BusinessServicesProfile,
  type CatalogVertical,
  type LeadPitch,
  type LeadStatus,
  type TierId,
  type ValueEstimate,
  type Vertical,
} from '@/api';
import { CheckIcon, ExternalLinkIcon, MapPinIcon, PlusIcon, RefreshCwIcon, UploadIcon, XIcon } from '@/assets/icons';
import { OpenFreeMap, type MapMarkerItem } from '../OpenFreeMap';

/**
 * Business Mode lead board: find small businesses (OpenStreetMap, CSV, by hand), audit them, put a
 * price on the fix from the owner's own numbers, and draft a permission-first first message that
 * YOU send. Nothing here invents data about a business.
 */

const COLUMNS: Array<{ id: LeadStatus; label: string }> = [
  { id: 'new', label: 'New' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'replied', label: 'Replied' },
  { id: 'call_booked', label: 'Call booked' },
  { id: 'won', label: 'Won' },
  { id: 'lost', label: 'Lost' },
];

const naira = (n?: number) => (n === undefined || n === null ? '—' : `₦${Math.round(n).toLocaleString('en-NG')}`);

const T = {
  text: '#1e1e24',
  muted: '#6a6a72',
  faint: '#a1a1aa',
  border: '#e5e7eb',
  card: '#ffffff',
  soft: '#f8f9fb',
  blue: '#2563eb',
  green: '#059669',
  amber: '#b45309',
  red: '#b42318',
};

const input: CSSProperties = {
  height: 36,
  border: `1px solid ${T.border}`,
  borderRadius: 8,
  padding: '0 10px',
  fontSize: 12.5,
  fontFamily: 'inherit',
  background: '#fff',
  color: T.text,
  minWidth: 0,
  boxSizing: 'border-box',
};
const btn = (primary = false, disabled = false): CSSProperties => ({
  height: 36,
  padding: '0 14px',
  borderRadius: 8,
  border: primary ? 'none' : `1px solid ${T.border}`,
  background: primary ? '#0b0b0c' : '#fff',
  color: primary ? '#fff' : T.text,
  fontSize: 12.5,
  fontWeight: 600,
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.6 : 1,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  fontFamily: 'inherit',
  whiteSpace: 'nowrap',
});
const card: CSSProperties = { background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14 };

const Section: FC<{ title: string; action?: ReactNode; children: ReactNode }> = ({ title, action, children }) => (
  <section style={{ borderTop: `1px solid ${T.border}`, paddingTop: 14, marginTop: 14 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 8 }}>
      <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: T.text }}>{title}</h4>
      {action}
    </div>
    {children}
  </section>
);

const Banner: FC<{ tone?: 'ok' | 'err' | 'info'; children: ReactNode; onClose?: () => void }> = ({ tone = 'info', children, onClose }) => {
  const c = tone === 'ok' ? ['#ecfdf5', '#a7f3d0', '#065f46'] : tone === 'err' ? ['#fef3f2', '#fecdca', T.red] : ['#eff6ff', '#bfdbfe', '#1e40af'];
  return (
    <div style={{ background: c[0], border: `1px solid ${c[1]}`, color: c[2], borderRadius: 8, padding: '8px 12px', fontSize: 12, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <div style={{ flex: 1, lineHeight: '18px' }}>{children}</div>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Dismiss" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}>
          <XIcon size={13} />
        </button>
      )}
    </div>
  );
};

// ── Lead drawer ───────────────────────────────────────────────────────────────

const LeadDrawer: FC<{
  id: string;
  catalog: CatalogVertical[];
  onClose: () => void;
  onChanged: (lead: BusinessLead) => void;
}> = ({ id, catalog, onClose, onChanged }) => {
  const [lead, setLead] = useState<BusinessLead | null>(null);
  const [value, setValue] = useState<ValueEstimate | null>(null);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [variant, setVariant] = useState<LeadPitch['variant']>('observation');
  const [channel, setChannel] = useState<LeadPitch['channel']>('whatsapp');
  const [scripts, setScripts] = useState<Awaited<ReturnType<typeof businessApi.scripts>> | null>(null);
  const [note, setNote] = useState('');
  const [move, setMove] = useState<{ to: LeadStatus | ''; lostReason: string; tier: TierId }>({ to: '', lostReason: '', tier: 'better' });

  const apply = (r: { lead: BusinessLead; value: ValueEstimate | null }) => {
    setLead(r.lead);
    setValue(r.value);
    setInputs(Object.fromEntries(Object.entries(r.lead.valueInputs ?? {}).map(([k, v]) => [k, String(v)])));
    onChanged(r.lead);
  };
  useEffect(() => {
    setLead(null);
    setScripts(null);
    businessApi.get(id).then(apply).catch((e) => setMsg({ tone: 'err', text: e.message }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setMsg(null);
    try {
      await fn();
    } catch (e: any) {
      setMsg({ tone: 'err', text: e?.message || 'Something went wrong' });
    } finally {
      setBusy('');
    }
  };

  if (!lead) {
    return (
      <aside style={{ ...card, minHeight: 200 }}>
        <p style={{ fontSize: 12.5, color: T.muted }}>Loading…</p>
      </aside>
    );
  }

  const spec = catalog.find((v) => v.id === lead.vertical);
  const findings = lead.audit?.findings ?? [];
  const pitch = lead.pitches?.[0];
  const tiers = lead.quote?.tiers ?? [];

  return (
    <aside style={{ ...card, display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 140px)', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: T.text }}>{lead.name}</h3>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
            {spec?.label ?? 'Business type not set'}
            {lead.area ? ` · ${lead.area}` : ''}
            {lead.source === 'osm' ? ' · from OpenStreetMap' : lead.source === 'referral' ? ` · referred by ${lead.referredBy}` : lead.source === 'csv' ? ' · imported' : ' · added by you'}
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" style={{ border: 'none', background: 'none', cursor: 'pointer', color: T.muted, alignSelf: 'flex-start' }}>
          <XIcon size={16} />
        </button>
      </div>

      {msg && (
        <div style={{ marginTop: 10 }}>
          <Banner tone={msg.tone} onClose={() => setMsg(null)}>
            {msg.text}
          </Banner>
        </div>
      )}

      {/* Contacts & consent */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
        {lead.website && (
          <a href={/^https?:/.test(lead.website) ? lead.website : `https://${lead.website}`} target="_blank" rel="noreferrer" style={{ fontSize: 11.5, color: T.blue, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <ExternalLinkIcon size={12} /> Website
          </a>
        )}
        {lead.contacts.map((c, i) => (
          <span key={i} style={{ fontSize: 11.5, background: T.soft, border: `1px solid ${T.border}`, borderRadius: 99, padding: '2px 8px', color: T.text }}>
            {c.kind}: {c.value}
          </span>
        ))}
        {!lead.contacts.length && !lead.website && <span style={{ fontSize: 11.5, color: T.faint }}>No contact details on the listing. Visit or call.</span>}
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 12, color: T.text }}>
        <input
          type="checkbox"
          checked={Boolean(lead.consent?.given)}
          onChange={(e) =>
            run('consent', async () => apply(await businessApi.patch(lead._id, { consent: { given: e.target.checked, channel: 'recorded by you', note: e.target.checked ? 'They said yes to receiving the audit' : 'Consent withdrawn' } })))
          }
        />
        They agreed to receive the audit (consent)
        {lead.consent?.given && lead.consent.at && <span style={{ color: T.faint }}>· {new Date(lead.consent.at).toLocaleDateString()}</span>}
      </label>

      {/* Audit */}
      <Section
        title={`Audit${findings.length ? ` · ${findings.length} finding${findings.length === 1 ? '' : 's'}` : ''}`}
        action={
          <button type="button" style={btn(false, busy === 'audit')} disabled={busy === 'audit'} onClick={() => run('audit', async () => setLead(await businessApi.audit(lead._id)))}>
            <RefreshCwIcon size={12} /> {busy === 'audit' ? 'Checking…' : lead.audit ? 'Re-run' : 'Run audit'}
          </button>
        }
      >
        {!lead.audit && <p style={{ fontSize: 12, color: T.muted, margin: 0 }}>The audit runs in the background after a lead is added. Re-run it any time.</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {findings.map((f) => (
            <div key={f.id} style={{ borderLeft: `3px solid ${f.severity === 'high' ? T.red : f.severity === 'medium' ? T.amber : T.faint}`, paddingLeft: 10 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: T.text }}>{f.title}</div>
              <div style={{ fontSize: 11.5, color: T.muted }}>{f.evidence}</div>
              <div style={{ fontSize: 11.5, color: T.blue }}>Check it: {f.howToCheck}</div>
            </div>
          ))}
          {lead.audit && !findings.length && <p style={{ fontSize: 12, color: T.green, margin: 0 }}>Nothing obvious to fix on their site. Probably not your best lead.</p>}
        </div>
      </Section>

      {/* Owner's numbers */}
      <Section title="Their numbers">
        {!spec && <p style={{ fontSize: 12, color: T.muted, margin: 0 }}>Set the business type to see the right questions.</p>}
        {spec && (
          <>
            <p style={{ fontSize: 11.5, color: T.muted, margin: '0 0 8px' }}>Ask the owner; JAVI only estimates value from their figures and shows every assumption.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
              {spec.valueInputs.map((vi) => (
                <label key={vi.id} style={{ fontSize: 11.5, color: T.text, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span>
                    {vi.label}
                    {vi.default !== undefined && <span style={{ color: T.faint }}> (default {vi.default}{vi.unit === 'percent' ? '%' : ''})</span>}
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={inputs[vi.id] ?? ''}
                    placeholder={vi.ownerNumber ? 'owner’s number' : String(vi.default ?? '')}
                    onChange={(e) => setInputs({ ...inputs, [vi.id]: e.target.value })}
                    style={input}
                  />
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button
                type="button"
                style={btn(false, busy === 'value')}
                disabled={busy === 'value'}
                onClick={() =>
                  run('value', async () => {
                    const valueInputs = Object.fromEntries(Object.entries(inputs).filter(([, v]) => v !== '').map(([k, v]) => [k, Number(v)]));
                    apply(await businessApi.patch(lead._id, { valueInputs }));
                  })
                }
              >
                Save numbers
              </button>
            </div>
            {value && value.monthly > 0 && (
              <div style={{ marginTop: 10 }}>
                <Banner tone="ok">
                  <strong>About {naira(value.monthly)} a month.</strong> {value.sentence}
                  {value.assumptions.length > 0 && <div style={{ marginTop: 4, color: T.muted }}>Assumed: {value.assumptions.join('; ')}</div>}
                </Banner>
              </div>
            )}
            {value && !value.monthly && value.missing.length > 0 && <p style={{ fontSize: 11.5, color: T.muted, margin: '8px 0 0' }}>Still needed for an estimate: {value.missing.join(', ')}.</p>}
          </>
        )}
      </Section>

      {/* Quote */}
      <Section
        title="Options"
        action={
          spec && (
            <button type="button" style={btn(true, busy === 'quote')} disabled={busy === 'quote'} onClick={() => run('quote', async () => apply(await businessApi.quote(lead._id)))}>
              {busy === 'quote' ? 'Pricing…' : tiers.length ? 'Re-price' : 'Price it'}
            </button>
          )
        }
      >
        {!tiers.length && <p style={{ fontSize: 12, color: T.muted, margin: 0 }}>Good / Better / Best, priced from your rates and their numbers. Better is the one to recommend.</p>}
        {tiers.length > 0 && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
              {tiers.map((t) => (
                <div key={t.tier} style={{ border: `${t.recommended ? 2 : 1}px solid ${t.recommended ? T.blue : T.border}`, borderRadius: 10, padding: 10, background: t.recommended ? '#f5f8ff' : '#fff' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: t.recommended ? T.blue : T.muted }}>
                    {t.tier}
                    {t.recommended ? ' · recommended' : ''}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginTop: 4 }}>{naira(t.setup)}</div>
                  <div style={{ fontSize: 12, color: T.muted }}>+ {naira(t.monthly)}/month</div>
                  <ul style={{ margin: '8px 0 0', paddingLeft: 16, fontSize: 11.5, color: T.text }}>
                    {t.includes.map((i) => (
                      <li key={i}>{i}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11.5, color: T.muted, marginTop: 8 }}>
              Your walk-away for Better: {naira(lead.quote!.floor.setup)} + {naira(lead.quote!.floor.monthly)}/month (running cost {naira(lead.quote!.cost.monthly)}/month). If price is the objection, drop to Good;
              never below this.
            </div>
            <ul style={{ margin: '6px 0 0', paddingLeft: 16, fontSize: 11.5, color: T.text }}>
              {lead.quote!.paymentOptions.map((p) => (
                <li key={p.id}>
                  <strong>{p.label}:</strong> {p.detail}
                </li>
              ))}
            </ul>
            {lead.quote!.warnings.map((w) => (
              <div key={w} style={{ marginTop: 6 }}>
                <Banner>{w}</Banner>
              </div>
            ))}
          </>
        )}
      </Section>

      {/* First message */}
      <Section title="First message">
        <p style={{ fontSize: 11.5, color: T.muted, margin: '0 0 8px' }}>
          Asks permission to send the free audit; no prices, no pressure. On WhatsApp, you open the link and press send yourself.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <select value={variant} onChange={(e) => setVariant(e.target.value as LeadPitch['variant'])} style={input} aria-label="Message style">
            <option value="observation">Lead with what I noticed</option>
            <option value="question">Lead with a question</option>
            <option value="proof">Lead with a case study</option>
          </select>
          <select value={channel} onChange={(e) => setChannel(e.target.value as LeadPitch['channel'])} style={input} aria-label="Channel">
            <option value="whatsapp">WhatsApp (you send)</option>
            <option value="email">Email draft</option>
          </select>
          <button type="button" style={btn(true, busy === 'pitch')} disabled={busy === 'pitch'} onClick={() => run('pitch', async () => setLead((await businessApi.pitch(lead._id, variant, channel)).lead))}>
            {busy === 'pitch' ? 'Writing…' : 'Draft'}
          </button>
        </div>
        {pitch && (
          <div style={{ marginTop: 10, background: T.soft, border: `1px solid ${T.border}`, borderRadius: 10, padding: 10 }}>
            {pitch.subject && <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Subject: {pitch.subject}</div>}
            <div style={{ fontSize: 12.5, color: T.text, whiteSpace: 'pre-wrap', lineHeight: '19px' }}>{pitch.body}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <button type="button" style={btn()} onClick={() => navigator.clipboard?.writeText(pitch.body).then(() => setMsg({ tone: 'ok', text: 'Copied.' }))}>
                Copy
              </button>
              {pitch.waLink && (
                <a href={pitch.waLink} target="_blank" rel="noreferrer" style={{ ...btn(true), textDecoration: 'none' }}>
                  Open in WhatsApp
                </a>
              )}
              {pitch.channel === 'whatsapp' && !pitch.waLink && <span style={{ fontSize: 11.5, color: T.muted, alignSelf: 'center' }}>No phone number on this lead; add one to get a WhatsApp link.</span>}
            </div>
          </div>
        )}
      </Section>

      {/* Scripts */}
      <Section
        title="Call & walk-in scripts"
        action={
          !scripts && (
            <button type="button" style={btn()} onClick={() => run('scripts', async () => setScripts(await businessApi.scripts(lead._id)))}>
              Show
            </button>
          )
        }
      >
        {scripts && (
          <div style={{ fontSize: 12, color: T.text, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <strong>Call</strong>
              <ol style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                {scripts.call.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ol>
            </div>
            <div>
              <strong>Walk-in</strong>
              <ol style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                {scripts.walkIn.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ol>
            </div>
            <div>
              <strong>Objections</strong>
              {scripts.objections.map((o) => (
                <div key={o.objection} style={{ marginTop: 4 }}>
                  <em>“{o.objection}”</em> {o.answer}
                </div>
              ))}
            </div>
            <div style={{ color: T.muted }}>{scripts.takeaway}</div>
          </div>
        )}
      </Section>

      {/* Notes & status */}
      <Section title="Notes & status">
        {lead.notes.map((n, i) => (
          <div key={i} style={{ fontSize: 12, color: T.text, marginBottom: 4 }}>
            <span style={{ color: T.faint }}>{new Date(n.at).toLocaleDateString()} · </span>
            {n.text}
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note (what they said, when to follow up)" style={{ ...input, flex: 1 }} />
          <button
            type="button"
            style={btn(false, !note.trim())}
            disabled={!note.trim()}
            onClick={() =>
              run('note', async () => {
                apply(await businessApi.patch(lead._id, { note }));
                setNote('');
              })
            }
          >
            Add
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: T.muted }}>Now: {COLUMNS.find((c) => c.id === lead.status)?.label}</span>
          <select value={move.to} onChange={(e) => setMove({ ...move, to: e.target.value as LeadStatus })} style={input} aria-label="Move to">
            <option value="">Move to…</option>
            {COLUMNS.filter((c) => c.id !== lead.status).map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          {move.to === 'lost' && <input value={move.lostReason} onChange={(e) => setMove({ ...move, lostReason: e.target.value })} placeholder="Why? (price, timing, has a developer…)" style={{ ...input, flex: 1 }} />}
          {move.to === 'won' && (
            <select value={move.tier} onChange={(e) => setMove({ ...move, tier: e.target.value as TierId })} style={input} aria-label="Tier they chose">
              <option value="better">Better</option>
              <option value="good">Good</option>
              <option value="best">Best</option>
            </select>
          )}
          <button
            type="button"
            style={btn(true, !move.to)}
            disabled={!move.to}
            onClick={() =>
              run('move', async () => {
                const updated = await businessApi.move(lead._id, move.to as LeadStatus, {
                  lostReason: move.to === 'lost' ? move.lostReason : undefined,
                  deal: move.to === 'won' ? { tier: move.tier } : undefined,
                });
                setLead(updated);
                onChanged(updated);
                setMove({ to: '', lostReason: '', tier: 'better' });
              })
            }
          >
            Move
          </button>
        </div>
        {lead.deal && (
          <div style={{ marginTop: 8, fontSize: 12, color: T.green }}>
            <CheckIcon size={12} color={T.green} /> Won: {lead.deal.tier} at {naira(lead.deal.setup)} + {naira(lead.deal.monthly)}/month
          </div>
        )}
        {lead.lostReason && <div style={{ marginTop: 8, fontSize: 12, color: T.muted }}>Lost: {lead.lostReason}</div>}
      </Section>
    </aside>
  );
};

// ── Services settings ─────────────────────────────────────────────────────────

const ServicesPanel: FC = () => {
  const [s, setS] = useState<BusinessServicesProfile | null>(null);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  useEffect(() => {
    businessApi.getServices().then(setS).catch((e) => setMsg({ tone: 'err', text: e.message }));
  }, []);
  if (!s) return <div style={card}>{msg ? <Banner tone="err">{msg.text}</Banner> : <p style={{ fontSize: 12.5, color: T.muted }}>Loading…</p>}</div>;

  const field = (label: string, el: ReactNode, hint?: string) => (
    <label style={{ fontSize: 12, color: T.text, display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label}
      {el}
      {hint && <span style={{ fontSize: 11, color: T.faint }}>{hint}</span>}
    </label>
  );
  const text = (k: keyof BusinessServicesProfile) => <input value={(s[k] as string) ?? ''} onChange={(e) => setS({ ...s, [k]: e.target.value })} style={input} />;
  const num = (k: keyof BusinessServicesProfile) => (
    <input type="number" value={(s[k] as number | undefined) ?? ''} onChange={(e) => setS({ ...s, [k]: e.target.value === '' ? undefined : Number(e.target.value) })} style={input} />
  );
  const save = async () => {
    setMsg(null);
    try {
      setS(
        await businessApi.saveServices({
          ...s,
          publicEmail: s.publicEmail ?? '',
          caseStudies: s.caseStudies.filter((c) => c.name.trim() && c.result.trim()),
        }),
      );
      setMsg({ tone: 'ok', text: 'Saved. New quotes and messages use these.' });
    } catch (e: any) {
      setMsg({ tone: 'err', text: e?.data?.details ? JSON.stringify(e.data.details.fieldErrors) : e.message });
    }
  };

  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 820 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
        {field('Brand name', text('brandName'))}
        {field('City', text('city'))}
        {field('Public phone', text('publicPhone'))}
        {field('Public email', text('publicEmail'))}
        {field('Physical address', text('physicalAddress'), 'Identifies you in every email you send.')}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
        {field('Your hourly rate (₦)', num('hourlyRate'))}
        {field('FX rate (₦ per $)', num('fxRate'), 'For USD-priced tools.')}
        {field('Target margin (%)', num('marginPct'))}
        {field('Monthly income target (₦)', num('monthlyIncomeTarget'))}
        {field('Live-by guarantee (days)', <input type="number" value={s.guarantees.liveByDays ?? ''} onChange={(e) => setS({ ...s, guarantees: { ...s.guarantees, liveByDays: e.target.value ? Number(e.target.value) : undefined } })} style={input} />)}
        {field('Real capacity (clients/month)', <input type="number" value={s.capacityPerMonth ?? ''} onChange={(e) => setS({ ...s, capacityPerMonth: e.target.value ? Number(e.target.value) : null })} style={input} />, 'Only set a real limit.')}
      </div>
      <label style={{ fontSize: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
        <input type="checkbox" checked={s.guarantees.ownership} onChange={(e) => setS({ ...s, guarantees: { ...s.guarantees, ownership: e.target.checked } })} />
        Ownership guarantee: domain, hosting and code in the client's name from day one
      </label>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Case studies</div>
        <p style={{ fontSize: 11.5, color: T.muted, margin: '0 0 8px' }}>Only results you can stand behind. Messages cite a case study only when the client agreed to share it.</p>
        {s.caseStudies.map((c, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto auto', gap: 8, marginBottom: 6, alignItems: 'center' }}>
            <input value={c.name} placeholder="Client (e.g. DopeChef)" onChange={(e) => setS({ ...s, caseStudies: s.caseStudies.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} style={input} />
            <input value={c.result} placeholder="Result in plain words" onChange={(e) => setS({ ...s, caseStudies: s.caseStudies.map((x, j) => (j === i ? { ...x, result: e.target.value } : x)) })} style={input} />
            <label style={{ fontSize: 11.5, display: 'flex', gap: 4, alignItems: 'center', whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={c.permissionToShare} onChange={(e) => setS({ ...s, caseStudies: s.caseStudies.map((x, j) => (j === i ? { ...x, permissionToShare: e.target.checked } : x)) })} />
              may share
            </label>
            <button type="button" aria-label="Remove case study" onClick={() => setS({ ...s, caseStudies: s.caseStudies.filter((_, j) => j !== i) })} style={{ border: 'none', background: 'none', cursor: 'pointer', color: T.muted }}>
              <XIcon size={13} />
            </button>
          </div>
        ))}
        <button type="button" style={btn()} onClick={() => setS({ ...s, caseStudies: [...s.caseStudies, { name: '', result: '', permissionToShare: false }] })}>
          <PlusIcon size={12} /> Add case study
        </button>
      </div>
      {msg && <Banner tone={msg.tone}>{msg.text}</Banner>}
      <div>
        <button type="button" style={btn(true)} onClick={save}>
          Save
        </button>
      </div>
    </div>
  );
};

// ── Main view ─────────────────────────────────────────────────────────────────

export const BusinessModeView: FC = () => {
  const [tab, setTab] = useState<'leads' | 'services'>('leads');
  const [catalog, setCatalog] = useState<CatalogVertical[]>([]);
  const [leads, setLeads] = useState<BusinessLead[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [vertical, setVertical] = useState<Vertical>('restaurant');
  const [filterVertical, setFilterVertical] = useState<Vertical | ''>('');
  const [area, setArea] = useState('');
  const [searching, setSearching] = useState(false);
  const [banner, setBanner] = useState<{ tone: 'ok' | 'err' | 'info'; text: string } | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [add, setAdd] = useState({ name: '', vertical: 'restaurant' as Vertical, area: '', phone: '', website: '', referredBy: '' });
  const [center, setCenter] = useState<[number, number]>([3.4723, 6.4474]);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      setLeads((await businessApi.list()).leads);
    } catch (e: any) {
      setBanner({ tone: 'err', text: e.message });
    }
  };
  useEffect(() => {
    businessApi.catalog().then((c) => setCatalog(c.verticals)).catch(() => undefined);
    load();
  }, []);

  const visible = useMemo(() => (filterVertical ? leads.filter((l) => l.vertical === filterVertical) : leads), [leads, filterVertical]);
  const markers: MapMarkerItem[] = visible
    .filter((l) => l.location)
    .map((l) => ({ id: l._id, name: l.name, category: l.category ?? l.vertical, location: l.location!, address: l.address, opportunity: l.audit?.findings?.[0]?.title }));

  const search = async () => {
    if (area.trim().length < 2) return;
    setSearching(true);
    setBanner({ tone: 'info', text: 'Searching OpenStreetMap… the public servers can take a minute or two.' });
    try {
      const r = await businessApi.search(vertical, area.trim());
      setCenter([r.center.lng, r.center.lat]);
      setBanner({
        tone: 'ok',
        text: `${r.leads.length} found around ${r.center.label.split(',').slice(0, 2).join(',')}${r.added ? `, ${r.added} new` : ''}${r.cached ? ' (from a search cached today)' : ''}. Audits run in the background.`,
      });
      await load();
    } catch (e: any) {
      setBanner({ tone: 'err', text: e.message });
    } finally {
      setSearching(false);
    }
  };

  const updateLead = (lead: BusinessLead) => setLeads((ls) => ls.map((l) => (l._id === lead._id ? lead : l)));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 40 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: '-.5px' }}>Business mode</h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: T.muted, maxWidth: 640 }}>
            Find small businesses with a visible, fixable problem, show it to them with a free audit, and offer a monthly service priced from their own numbers.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['leads', 'services'] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)} style={{ ...btn(tab === t), height: 32 }}>
              {t === 'leads' ? 'Leads' : 'Your services & rates'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'services' ? (
        <ServicesPanel />
      ) : (
        <>
          {/* Find / import / add */}
          <div style={{ ...card, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <select value={vertical} onChange={(e) => setVertical(e.target.value as Vertical)} style={input} aria-label="Business type">
              {catalog.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
            <input
              value={area}
              onChange={(e) => setArea(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && search()}
              placeholder="Area, e.g. Lekki Phase 1, Lagos"
              style={{ ...input, flex: 1, minWidth: 180 }}
              aria-label="Area"
            />
            <button type="button" style={btn(true, searching || area.trim().length < 2)} disabled={searching || area.trim().length < 2} onClick={search}>
              <MapPinIcon size={13} color="#fff" /> {searching ? 'Searching…' : 'Find leads'}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              style={{ display: 'none' }}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  const r = await businessApi.importLeads(f);
                  setBanner({ tone: 'ok', text: `Imported ${r.created} lead${r.created === 1 ? '' : 's'}${r.skipped.length ? `; skipped ${r.skipped.length}` : ''}.` });
                  await load();
                } catch (err: any) {
                  setBanner({ tone: 'err', text: err.message });
                } finally {
                  if (fileRef.current) fileRef.current.value = '';
                }
              }}
            />
            <button type="button" style={btn()} onClick={() => fileRef.current?.click()} title="Columns: name, phone, email, website, area, category, consent, referred_by">
              <UploadIcon size={13} /> Import CSV
            </button>
            <button type="button" style={btn()} onClick={() => setShowAdd((v) => !v)}>
              <PlusIcon size={13} /> Add lead
            </button>
            <span style={{ fontSize: 10.5, color: T.faint, width: '100%' }}>Business data © OpenStreetMap contributors (ODbL). Coverage varies by area; your own contacts and walk-ins are often the best leads.</span>
          </div>

          {showAdd && (
            <div style={{ ...card, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
              <input value={add.name} onChange={(e) => setAdd({ ...add, name: e.target.value })} placeholder="Business name" style={input} />
              <select value={add.vertical} onChange={(e) => setAdd({ ...add, vertical: e.target.value as Vertical })} style={input}>
                {catalog.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
                <option value="other">Other</option>
              </select>
              <input value={add.area} onChange={(e) => setAdd({ ...add, area: e.target.value })} placeholder="Area" style={input} />
              <input value={add.phone} onChange={(e) => setAdd({ ...add, phone: e.target.value })} placeholder="Business phone" style={input} />
              <input value={add.website} onChange={(e) => setAdd({ ...add, website: e.target.value })} placeholder="Website (optional)" style={input} />
              <input value={add.referredBy} onChange={(e) => setAdd({ ...add, referredBy: e.target.value })} placeholder="Referred by (optional)" style={input} />
              <button
                type="button"
                style={btn(true, !add.name.trim())}
                disabled={!add.name.trim()}
                onClick={async () => {
                  try {
                    const lead = await businessApi.add({
                      name: add.name.trim(),
                      vertical: add.vertical,
                      area: add.area || undefined,
                      website: add.website || undefined,
                      referredBy: add.referredBy || undefined,
                      contacts: add.phone ? [{ kind: 'phone', value: add.phone, isBusinessLine: true }] : [],
                    });
                    setShowAdd(false);
                    setAdd({ name: '', vertical: 'restaurant', area: '', phone: '', website: '', referredBy: '' });
                    await load();
                    setSelected(lead._id);
                  } catch (e: any) {
                    setBanner({ tone: 'err', text: e.message });
                  }
                }}
              >
                Save lead
              </button>
            </div>
          )}

          {banner && (
            <Banner tone={banner.tone} onClose={() => setBanner(null)}>
              {banner.text}
            </Banner>
          )}

          {markers.length > 0 && <OpenFreeMap center={center} markers={markers} selectedMarkerId={selected ?? undefined} onSelectMarker={setSelected} height={260} />}

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => setFilterVertical('')} style={{ ...btn(filterVertical === ''), height: 28, fontSize: 11.5 }}>
              All ({leads.length})
            </button>
            {catalog
              .filter((v) => leads.some((l) => l.vertical === v.id))
              .map((v) => (
                <button key={v.id} type="button" onClick={() => setFilterVertical(v.id)} style={{ ...btn(filterVertical === v.id), height: 28, fontSize: 11.5 }}>
                  {v.label} ({leads.filter((l) => l.vertical === v.id).length})
                </button>
              ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: selected ? 'minmax(0, 1fr) minmax(320px, 440px)' : '1fr', gap: 14, alignItems: 'start' }}>
            {/* Board */}
            <div style={{ display: 'grid', gridAutoFlow: 'column', gridAutoColumns: 'minmax(190px, 1fr)', gap: 10, overflowX: 'auto', paddingBottom: 6 }}>
              {COLUMNS.map((col) => {
                const items = visible.filter((l) => l.status === col.id);
                return (
                  <div key={col.id} style={{ background: T.soft, border: `1px solid ${T.border}`, borderRadius: 12, padding: 8, minHeight: 120 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, textTransform: 'uppercase', padding: '2px 4px 8px' }}>
                      {col.label} · {items.length}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {items.map((l) => (
                        <button
                          key={l._id}
                          type="button"
                          onClick={() => setSelected(l._id)}
                          style={{
                            textAlign: 'left',
                            background: '#fff',
                            border: `1px solid ${selected === l._id ? T.blue : T.border}`,
                            borderRadius: 10,
                            padding: 10,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                          }}
                        >
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: T.text }}>{l.name}</div>
                          <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                            {catalog.find((v) => v.id === l.vertical)?.label ?? 'Other'}
                            {l.area ? ` · ${l.area}` : ''}
                          </div>
                          {l.audit?.findings?.[0] && <div style={{ fontSize: 11, color: T.amber, marginTop: 4 }}>{l.audit.findings[0].title}</div>}
                          {l.consent?.given && <div style={{ fontSize: 10.5, color: T.green, marginTop: 4 }}>✓ consented</div>}
                          {l.deal && <div style={{ fontSize: 11, color: T.green, marginTop: 4 }}>{naira(l.deal.monthly)}/month</div>}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            {selected && <LeadDrawer id={selected} catalog={catalog} onClose={() => setSelected(null)} onChanged={updateLead} />}
          </div>
          {!leads.length && (
            <p style={{ fontSize: 12.5, color: T.muted, textAlign: 'center' }}>No leads yet. Search an area you know, import your contacts, or add a walk-in.</p>
          )}
        </>
      )}
    </div>
  );
};

export default BusinessModeView;
