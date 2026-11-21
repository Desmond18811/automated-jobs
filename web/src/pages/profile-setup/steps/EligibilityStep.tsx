import type { FC } from 'react';
import type { EeoDisclosures, SecurityClearance, WorkAuthorization } from '@/types/profile';
import { Choice, Field, Notice, Row, Section, Select, StepHeader, TextInput, YES_NO } from '../ui';
import type { StepProps } from './types';

const CLEARANCE: Array<{ value: SecurityClearance; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'confidential', label: 'Confidential' },
  { value: 'secret', label: 'Secret' },
  { value: 'top_secret', label: 'Top Secret' },
  { value: 'other', label: 'Other' },
];

const NOTICE = ['Immediately', '1 week', '2 weeks', '1 month', '2 months', '3 months'].map((n) => ({ value: n, label: n }));

const GENDER: Array<{ value: NonNullable<EeoDisclosures['gender']>; label: string }> = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'other', label: 'Other' },
  { value: 'decline', label: 'Prefer not to say' },
];
const RACE: Array<{ value: NonNullable<EeoDisclosures['raceEthnicity']>; label: string }> = [
  { value: 'black_african_american', label: 'Black / African' },
  { value: 'white', label: 'White' },
  { value: 'asian', label: 'Asian' },
  { value: 'hispanic_latino', label: 'Hispanic / Latino' },
  { value: 'native_american', label: 'Native American / Alaska Native' },
  { value: 'two_or_more', label: 'Two or more' },
  { value: 'decline', label: 'Prefer not to say' },
];
const VETERAN: Array<{ value: NonNullable<EeoDisclosures['veteranStatus']>; label: string }> = [
  { value: 'not_veteran', label: 'Not a veteran' },
  { value: 'veteran', label: 'Veteran' },
  { value: 'decline', label: 'Prefer not to say' },
];
const DISABILITY: Array<{ value: NonNullable<EeoDisclosures['disabilityStatus']>; label: string }> = [
  { value: 'no', label: 'No' },
  { value: 'yes', label: 'Yes' },
  { value: 'decline', label: 'Prefer not to say' },
];

export const EligibilityStep: FC<StepProps> = ({ draft, patch }) => {
  const eeo: EeoDisclosures = draft.eeo ?? {};
  const setEeo = (p: Partial<EeoDisclosures>) => patch({ eeo: { gender: 'decline', raceEthnicity: 'decline', veteranStatus: 'decline', disabilityStatus: 'decline', ...eeo, ...p } });

  return (
    <div>
      <StepHeader
        title="Eligibility"
        subtitle="Answers to the legal questions on application forms. JAVI never guesses these: anything you leave blank, it will ask you about on WhatsApp when a form needs it."
      />

      <Section title="Right to work" hint="For the countries you're applying to. If it differs by country, answer for where most of your target jobs are.">
        <Field label="Are you legally authorized to work there?" required group>
          <Choice<WorkAuthorization>
            value={draft.workAuthorization}
            onChange={(v) => patch({ workAuthorization: v })}
            options={[
              { value: 'authorized', label: 'Yes' },
              { value: 'not_authorized', label: 'No' },
            ]}
          />
        </Field>
        <Field label="Will you need visa sponsorship now?" required group>
          <Choice value={draft.requiresSponsorship} onChange={(v) => patch({ requiresSponsorship: v })} options={YES_NO} />
        </Field>
        <Field label="Will you need sponsorship in the future?" group>
          <Choice value={draft.futureSponsorship} onChange={(v) => patch({ futureSponsorship: v })} options={YES_NO} />
        </Field>
        <Field label="Security clearance">
          <Select value={draft.securityClearance} onChange={(v) => patch({ securityClearance: v || undefined })} options={CLEARANCE} placeholder="Not answered" />
        </Field>
      </Section>

      <Section title="Availability">
        <Row>
          <Field label="Notice period">
            <Select value={draft.noticePeriod} onChange={(v) => patch({ noticePeriod: v || undefined })} options={NOTICE} placeholder="Not answered" />
          </Field>
          <Field label="Earliest start date" hint="Free text, e.g. “1 March 2027” or “Immediately”.">
            <TextInput value={draft.earliestStartDate} onChange={(v) => patch({ earliestStartDate: v || undefined })} />
          </Field>
        </Row>
      </Section>

      <Section title="Voluntary self-identification (EEO)" hint="Many US and UK forms ask these. They're optional and never affect which jobs JAVI picks.">
        <Notice>Leaving these on “Prefer not to say” is always fine. Employers can't use them in hiring decisions.</Notice>
        <Row>
          <Field label="Gender">
            <Select value={eeo.gender} onChange={(v) => setEeo({ gender: v || 'decline' })} options={GENDER} placeholder="Prefer not to say" />
          </Field>
          <Field label="Race / ethnicity">
            <Select value={eeo.raceEthnicity} onChange={(v) => setEeo({ raceEthnicity: v || 'decline' })} options={RACE} placeholder="Prefer not to say" />
          </Field>
        </Row>
        <Row>
          <Field label="Veteran status">
            <Select value={eeo.veteranStatus} onChange={(v) => setEeo({ veteranStatus: v || 'decline' })} options={VETERAN} placeholder="Prefer not to say" />
          </Field>
          <Field label="Disability">
            <Select value={eeo.disabilityStatus} onChange={(v) => setEeo({ disabilityStatus: v || 'decline' })} options={DISABILITY} placeholder="Prefer not to say" />
          </Field>
        </Row>
      </Section>
    </div>
  );
};

export function validateEligibility(d: StepProps['draft']): string[] {
  const out: string[] = [];
  if (!d.workAuthorization) out.push('Work authorization');
  if (d.requiresSponsorship === undefined) out.push('Visa sponsorship');
  return out;
}
