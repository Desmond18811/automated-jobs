import { useEffect, useMemo, useState, type FC } from 'react';
import { taxonomyApi } from '@/api';
import type { Period, RemotePreference, SalaryExpectation, SalaryFloor } from '@/types/profile';
import { C, Choice, Field, Row, Section, Select, StepHeader, TagInput, TextInput, YES_NO } from '../ui';
import { RequestMissingModal } from '../RequestMissingModal';
import type { StepProps } from './types';

type Level = 'entry' | 'junior' | 'mid' | 'senior' | 'expert';

const LEVELS: Array<{ value: Level; label: string }> = [
  { value: 'entry', label: 'Entry' },
  { value: 'junior', label: 'Junior' },
  { value: 'mid', label: 'Mid-level' },
  { value: 'senior', label: 'Senior' },
  { value: 'expert', label: 'Staff / Lead' },
];

export const levelFromYears = (years: number): Level =>
  years < 1 ? 'entry' : years <= 2 ? 'junior' : years <= 5 ? 'mid' : years <= 9 ? 'senior' : 'expert';

const WORK_MODELS: Array<{ value: RemotePreference; label: string }> = [
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site' },
  { value: 'any', label: 'Open to all' },
];

const CURRENCIES = ['USD', 'NGN', 'GBP', 'EUR', 'CAD', 'KES', 'ZAR', 'GHS'].map((c) => ({ value: c, label: c }));
const PERIODS: Array<{ value: Period; label: string }> = [
  { value: 'year', label: 'per year' },
  { value: 'month', label: 'per month' },
  { value: 'hour', label: 'per hour' },
];

const MAX_ROLES = 15;

export const CareerStep: FC<StepProps> = ({ draft, patch }) => {
  const [fields, setFields] = useState<Array<{ category: string; roles: Array<{ name: string }> }>>([]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [locationOptions, setLocationOptions] = useState<string[]>([]);
  const [category, setCategory] = useState('');
  const [showRequest, setShowRequest] = useState(false);

  useEffect(() => {
    taxonomyApi
      .getFields()
      .then((r) => {
        setFields(r.fields);
        setIndustries(r.industries.map((i) => i.name));
      })
      .catch(() => undefined);
    taxonomyApi
      .getLocations()
      .then((r) => setLocationOptions(r.locations.map((l: any) => l.name)))
      .catch(() => undefined);
  }, []);

  const rolesInCategory = useMemo(
    () => (category ? fields.find((f) => f.category === category)?.roles.map((r) => r.name) ?? [] : fields.flatMap((f) => f.roles.map((r) => r.name))),
    [fields, category],
  );

  const setYears = (raw: string) => {
    const n = raw === '' ? undefined : Math.max(0, Math.min(60, Number(raw)));
    patch({
      yearsOfExperience: n,
      inferredLevel: n === undefined ? '' : levelFromYears(n),
    });
  };

  const expectation: SalaryExpectation = draft.salaryExpectation ?? { minimum: 0, currency: 'USD', period: 'year', negotiable: true };
  const setExpectation = (p: Partial<SalaryExpectation>) => patch({ salaryExpectation: { ...expectation, ...p } });
  const floor: SalaryFloor = draft.salaryFloor ?? { currency: expectation.currency, period: expectation.period };
  const setFloor = (p: Partial<SalaryFloor>) => patch({ salaryFloor: { ...floor, ...p } });

  return (
    <div>
      {showRequest && <RequestMissingModal initialIndustry={draft.industry} onClose={() => setShowRequest(false)} />}
      <StepHeader title="What you're looking for" subtitle="JAVI only applies to jobs that fit these. Roles and salary also decide how it answers screening questions." />

      <Section title="Target roles" hint={`Pick up to ${MAX_ROLES}. Browse by job field, or type any title and press Enter.`}>
        <Field label="Job field">
          <Select
            value={category}
            onChange={setCategory}
            placeholder="All fields"
            options={fields.map((f) => ({ value: f.category, label: f.category }))}
          />
        </Field>
        <Field label="Roles" required group>
          <TagInput
            values={draft.targetRoles}
            onChange={(v) => patch({ targetRoles: v.filter((r) => r.length >= 2).map((r) => r.slice(0, 80)) })}
            max={MAX_ROLES}
            placeholder="e.g. Product Designer"
            suggestions={rolesInCategory}
          />
        </Field>
        <Row>
          <Field label="Industry">
            <Select value={draft.industry} onChange={(v) => patch({ industry: v })} options={industries.map((i) => ({ value: i, label: i }))} />
          </Field>
          <Field label="Specific title you want" hint="Optional, e.g. “Design Systems Lead”.">
            <TextInput value={draft.specificTitle} onChange={(v) => patch({ specificTitle: v })} />
          </Field>
        </Row>
        <button
          type="button"
          onClick={() => setShowRequest(true)}
          style={{ alignSelf: 'flex-start', border: 'none', background: 'none', color: C.focus, fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
        >
          Can't find your role or industry? Request it
        </button>
      </Section>

      <Section title="Where you are now">
        <Row>
          <Field label="Current job title" hint="Leave blank if you're between roles.">
            <TextInput value={draft.currentTitle} onChange={(v) => patch({ currentTitle: v || undefined })} />
          </Field>
          <Field label="Current company">
            <TextInput value={draft.currentCompany} onChange={(v) => patch({ currentCompany: v || undefined })} />
          </Field>
        </Row>
        <Row>
          <Field label="Years of professional experience" required>
            <TextInput type="number" min={0} max={60} step={1} value={draft.yearsOfExperience} onChange={setYears} placeholder="e.g. 4" />
          </Field>
          <Field label="Your level" hint={draft.inferredLevel ? `From your years we'd guess ${draft.inferredLevel}. Confirm or change it.` : undefined}>
            <Select value={draft.validatedLevel as Level | ''} onChange={(v) => patch({ validatedLevel: v })} options={LEVELS} />
          </Field>
        </Row>
      </Section>

      <Section title="Work arrangement & location">
        <Field label="Work model" required group>
          <Choice value={draft.remotePreference} onChange={(v) => patch({ remotePreference: v ?? 'any' })} options={WORK_MODELS} allowClear={false} />
        </Field>
        <Field label="Preferred job locations" hint="Cities or remote regions you'd accept. Leave empty to rely on your work model only." group>
          <TagInput values={draft.locations} onChange={(v) => patch({ locations: v })} max={15} placeholder="e.g. London, UK" suggestions={locationOptions} />
        </Field>
        <Field label="Willing to relocate?" group>
          <Choice value={draft.willingToRelocate} onChange={(v) => patch({ willingToRelocate: v })} options={YES_NO} />
        </Field>
      </Section>

      <Section title="Compensation" hint="The expected salary answers salary questions on forms. The hard minimum filters out jobs that pay less.">
        <Row min={140}>
          <Field label="Expected salary">
            <TextInput
              type="number"
              min={0}
              value={draft.salaryExpectation ? expectation.minimum || '' : ''}
              onChange={(v) => (v === '' ? patch({ salaryExpectation: undefined }) : setExpectation({ minimum: Math.max(0, Number(v)) }))}
              placeholder="e.g. 90000"
            />
          </Field>
          <Field label="Currency">
            <Select value={expectation.currency} onChange={(v) => setExpectation({ currency: v || 'USD' })} options={CURRENCIES} placeholder="Currency" />
          </Field>
          <Field label="Period">
            <Select value={expectation.period} onChange={(v) => setExpectation({ period: (v || 'year') as Period })} options={PERIODS} placeholder="Period" />
          </Field>
        </Row>
        {draft.salaryExpectation && (
          <Choice
            value={expectation.negotiable}
            onChange={(v) => setExpectation({ negotiable: v ?? true })}
            options={[
              { value: true, label: 'Negotiable' },
              { value: false, label: 'Firm' },
            ]}
            allowClear={false}
          />
        )}
        <Row min={140}>
          <Field label="Hard minimum (optional)">
            <TextInput
              type="number"
              min={0}
              value={floor.amount}
              onChange={(v) => (v === '' ? patch({ salaryFloor: undefined }) : setFloor({ amount: Math.max(1, Number(v)) }))}
              placeholder="Skip jobs below"
            />
          </Field>
          <Field label="Currency">
            <Select value={floor.currency} onChange={(v) => setFloor({ currency: v || 'USD' })} options={CURRENCIES} placeholder="Currency" />
          </Field>
          <Field label="Period">
            <Select value={floor.period} onChange={(v) => setFloor({ period: (v || 'year') as Period })} options={PERIODS} placeholder="Period" />
          </Field>
        </Row>
      </Section>
    </div>
  );
};

export function validateCareer(d: StepProps['draft']): string[] {
  const out: string[] = [];
  if (!d.targetRoles.length) out.push('At least one target role');
  if (d.yearsOfExperience === undefined || Number.isNaN(d.yearsOfExperience)) out.push('Years of experience');
  return out;
}
