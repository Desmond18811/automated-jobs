import { useEffect, useMemo, useState, type FC } from 'react';
import { applicationsApi } from '@/api';
import { Icon } from './icons';
import { ago } from './data';

const LABEL: Record<string, string> = {
  discovered: 'Found', matched: 'Matched to you', drafted: 'Drafted', approved: 'Approved', needs_user: 'Needs your input',
  sent: 'Application sent', replied: 'Recruiter replied', interview: 'Interview', offer: 'Offer received', hired: 'Hired',
  rejected: 'Not selected', no_response: 'No response', failed: 'Failed to send', archived: 'Archived',
};
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/** Overlay showing what happened on every day this month, and the detail for the day you pick. */
export const Calendar: FC<{ onClose: () => void }> = ({ onClose }) => {
  const today = new Date();
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [sel, setSel] = useState(today);
  const [events, setEvents] = useState<any[] | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let live = true;
    setEvents(null);
    setErr('');
    const from = new Date(month.getFullYear(), month.getMonth(), 1);
    const to = new Date(month.getFullYear(), month.getMonth() + 1, 1, 0, 0, -1);
    applicationsApi.activity(from, to).then(
      (r) => live && setEvents(r.events ?? []),
      (e) => live && (setErr(e?.message || 'Could not load activity'), setEvents([])),
    );
    return () => {
      live = false;
    };
  }, [month]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);

  const byDay = useMemo(() => {
    const m = new Map<string, any[]>();
    (events ?? []).forEach((e) => m.set(dayKey(new Date(e.at)), [...(m.get(dayKey(new Date(e.at))) ?? []), e]));
    return m;
  }, [events]);

  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const lead = (first.getDay() + 6) % 7;
  const total = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((lead + total) / 7) * 7 }, (_, i) => (i < lead || i >= lead + total ? null : new Date(month.getFullYear(), month.getMonth(), i - lead + 1)));
  const dayEvents = byDay.get(dayKey(sel)) ?? [];
  const sentOn = (d: Date) => (byDay.get(dayKey(d)) ?? []).filter((e) => e.to === 'sent').length;
  const nav = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  const btn = { width: 44, height: 44, borderRadius: '50%', border: '1px solid #E3E9F2', background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' } as const;

  return (
    <div role="dialog" aria-modal="true" aria-label="Calendar" onMouseDown={(e) => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, background: 'rgba(23,25,31,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 80 }}>
      <div style={{ width: 'min(880px,100%)', maxHeight: '92vh', overflow: 'auto', background: '#fff', borderRadius: 24, padding: 24, display: 'flex', flexWrap: 'wrap', gap: 24, boxShadow: '0 30px 60px -30px rgba(23,25,31,.5)' }}>
        <div style={{ flex: '1 1 360px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 500, flex: 1 }}>{month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</h2>
            <button type="button" aria-label="Previous month" onClick={() => nav(-1)} style={{ ...btn, transform: 'scaleX(-1)' }}><Icon name="chevron" size={16} /></button>
            <button type="button" aria-label="Next month" onClick={() => nav(1)} style={btn}><Icon name="chevron" size={16} /></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, textAlign: 'center' }}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <div key={i} style={{ fontSize: 11, color: '#98A1AF', padding: 4 }}>{d}</div>)}
            {cells.map((d, i) => {
              if (!d) return <div key={i} />;
              const n = (byDay.get(dayKey(d)) ?? []).length;
              const active = dayKey(d) === dayKey(sel);
              const isToday = dayKey(d) === dayKey(today);
              return (
                <button key={i} type="button" onClick={() => setSel(d)} aria-label={`${d.toDateString()}, ${n} updates`} aria-pressed={active} style={{ height: 52, borderRadius: 14, border: isToday && !active ? '1.5px solid #2457E8' : '1px solid transparent', background: active ? '#2457E8' : n ? '#F2F6FF' : 'transparent', color: active ? '#fff' : '#17191F', fontSize: 14, fontWeight: 500, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                  {d.getDate()}
                  <span style={{ fontSize: 11, fontWeight: 500, color: active ? 'rgba(255,255,255,.85)' : '#2457E8', height: 12 }}>{sentOn(d) ? `${sentOn(d)} sent` : n ? `${n}` : ''}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ flex: '1 1 300px', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 500 }}>{sel.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
              <div style={{ fontSize: 12, color: '#606979', marginTop: 2 }}>{events === null ? 'Loading…' : `${dayEvents.length} update${dayEvents.length === 1 ? '' : 's'}, ${sentOn(sel)} application${sentOn(sel) === 1 ? '' : 's'} sent`}</div>
            </div>
            <button type="button" aria-label="Close calendar" onClick={onClose} style={btn}><Icon name="close" size={16} /></button>
          </div>
          {err && <div role="alert" style={{ fontSize: 13, color: '#B4232F', marginBottom: 8 }}>{err}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflow: 'auto' }}>
            {events !== null && dayEvents.length === 0 && <div style={{ background: '#F5F8FC', borderRadius: 20, padding: 18, fontSize: 13, color: '#606979' }}>Nothing happened on this day.</div>}
            {dayEvents.map((e, i) => (
              <div key={i} style={{ background: '#F5F8FC', borderRadius: 20, padding: '10px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13, fontWeight: 500 }}>
                  <span>{LABEL[e.to] || e.to}</span>
                  <span style={{ color: '#98A1AF', fontWeight: 400 }}>{new Date(e.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div style={{ fontSize: 12, color: '#606979', marginTop: 2 }}>{[e.job?.title, e.job?.company].filter(Boolean).join(' at ') || ago(e.at)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
