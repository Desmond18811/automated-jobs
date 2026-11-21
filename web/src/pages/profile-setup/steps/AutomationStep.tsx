import { useState, type FC } from 'react';
import { profileApi } from '@/api';
import type { Rules, UserProfile } from '@/types/profile';
import { AddButton, C, Choice, Field, Notice, Row, Section, Select, StepHeader, TagInput, TextInput, Toggle } from '../ui';
import { describeSaveError } from '../useSetupDraft';
import type { StepProps } from './types';

const CAPS = [5, 10, 15, 25, 40, 50];
const HOURS = Array.from({ length: 25 }, (_, h) => ({ value: String(h), label: `${String(h).padStart(2, '0')}:00` }));

export const AutomationStep: FC<StepProps & { onServerProfile: (p: UserProfile) => void }> = ({ draft, patch, onServerProfile }) => {
  const rules = draft.rules;
  const setRules = (p: Partial<Rules>) => patch({ rules: { ...rules, ...p } });
  const hours = rules.sendingHours;
  const [pageUrl, setPageUrl] = useState('');
  const [pageBusy, setPageBusy] = useState(false);
  const [pageMsg, setPageMsg] = useState<{ tone: 'ok' | 'danger'; text: string } | null>(null);

  // Career pages have their own endpoints (they also start a crawl), so they save immediately.
  const addPage = async () => {
    const url = /^https?:\/\//i.test(pageUrl.trim()) ? pageUrl.trim() : `https://${pageUrl.trim()}`;
    setPageBusy(true);
    setPageMsg(null);
    try {
      const res = await profileApi.addCareerPage(url);
      onServerProfile(await profileApi.get());
      setPageMsg({ tone: 'ok', text: res?.note ?? 'Career page added.' });
      setPageUrl('');
    } catch (err) {
      setPageMsg({ tone: 'danger', text: describeSaveError(err).join(' ') });
    } finally {
      setPageBusy(false);
    }
  };
  const removePage = async (url: string) => {
    try {
      await profileApi.removeCareerPage(url);
      onServerProfile(await profileApi.get());
    } catch (err) {
      setPageMsg({ tone: 'danger', text: describeSaveError(err).join(' ') });
    }
  };

  return (
    <div>
      <StepHeader title="How JAVI applies" subtitle="Pace, approval and the companies to avoid. You can change all of this later in Settings." />

      <Section title="Approval">
        <Field label="Before each application is sent" group>
          <Choice value={'review' as const} onChange={() => setRules({ approvalMode: 'review' })} allowClear={false} options={[{ value: 'review' as const, label: 'I review every draft' }]} />
        </Field>
        <Notice>
          Auto-send unlocks after you've approved 10 drafts yourself, so you can see JAVI's work before it sends anything on its own. Turn it on later
          in Settings.
        </Notice>
      </Section>

      <Section title="Pace">
        <Field label="Applications per day (maximum)" group>
          <Choice value={rules.dailySendCap} onChange={(v) => setRules({ dailySendCap: v ?? 15 })} allowClear={false} options={CAPS.map((c) => ({ value: c, label: String(c) }))} />
        </Field>
        <Row min={140}>
          <Field label="Send between">
            <Select value={String(hours.start)} onChange={(v) => setRules({ sendingHours: { ...hours, start: Number(v || 8) } })} options={HOURS.slice(0, 24)} />
          </Field>
          <Field label="and" error={hours.end <= hours.start ? 'Must be after the start' : undefined}>
            <Select value={String(hours.end)} onChange={(v) => setRules({ sendingHours: { ...hours, end: Number(v || 18) } })} options={HOURS.slice(1)} />
          </Field>
          <Field label="Time zone">
            <TextInput value={hours.timezone} onChange={(v) => setRules({ sendingHours: { ...hours, timezone: v } })} placeholder="e.g. Africa/Lagos" />
          </Field>
        </Row>
        <Toggle checked={rules.weekdaysOnly} onChange={(v) => setRules({ weekdaysOnly: v })} label="Weekdays only" hint="Applications sent on weekends tend to sit unread." />
      </Section>

      <Section title="Companies to skip" hint="Your current employer, past employers, anyone you'd rather not hear from you.">
        <TagInput values={draft.blockedCompanies} onChange={(v) => patch({ blockedCompanies: v.map((x) => x.slice(0, 120)) })} max={200} placeholder="Company name, then Enter" />
      </Section>

      <Section title="Career pages to watch" hint="Paste a company's jobs page (Greenhouse, Lever and Ashby boards work best). JAVI checks it for new openings.">
        {draft.careerPages.map((c) => (
          <div key={c.url} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, border: `1px solid ${C.divider}`, borderRadius: 8, padding: '8px 12px' }}>
            <span style={{ fontSize: 13, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {c.url} <span style={{ color: C.muted }}>· {c.ats}</span>
            </span>
            <button type="button" onClick={() => removePage(c.url)} style={{ border: 'none', background: 'none', color: C.muted, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Remove
            </button>
          </div>
        ))}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 8 }}>
          <TextInput type="url" value={pageUrl} onChange={setPageUrl} placeholder="https://boards.greenhouse.io/company" />
          <AddButton label={pageBusy ? 'Adding…' : 'Add'} onClick={addPage} disabled={pageBusy || !pageUrl.trim()} />
        </div>
        {pageMsg && <Notice tone={pageMsg.tone}>{pageMsg.text}</Notice>}
      </Section>
    </div>
  );
};

export function validateAutomation(d: StepProps['draft']): string[] {
  const h = d.rules.sendingHours;
  const out: string[] = [];
  if (h.end <= h.start) out.push('Sending hours: end must be after start');
  if (!h.timezone.trim()) out.push('Time zone');
  return out;
}
