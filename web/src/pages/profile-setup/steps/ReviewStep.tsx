import type { FC, ReactNode } from 'react';
import type { UserProfile } from '@/types/profile';
import { C, Notice, StepHeader } from '../ui';
import { STEPS, stepForMissing } from '../useSetupDraft';

const Line: FC<{ label: string; children: ReactNode }> = ({ label, children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '150px minmax(0, 1fr)', gap: 12, padding: '8px 0', borderBottom: `1px solid ${C.divider}`, fontSize: 13.5 }}>
    <span style={{ color: C.muted }}>{label}</span>
    <span style={{ color: C.text, overflowWrap: 'anywhere' }}>{children || <em style={{ color: C.muted }}>Not answered</em>}</span>
  </div>
);

const WORK_MODEL: Record<string, string> = { remote: 'Remote', hybrid: 'Hybrid', onsite: 'On-site', any: 'Open to all' };
const EDUCATION: Record<string, string> = {
  high_school: 'High school', associate: 'Associate / OND / HND', bachelor: "Bachelor's", master: "Master's",
  doctorate: 'Doctorate', bootcamp: 'Bootcamp / certificate', self_taught: 'Self-taught',
};
const CLEARANCE: Record<string, string> = { none: 'None', confidential: 'Confidential', secret: 'Secret', top_secret: 'Top Secret', other: 'Other' };

const yn = (b: boolean | undefined) => (b === undefined ? '' : b ? 'Yes' : 'No');
const money = (n: number | undefined, cur?: string, per?: string) => (n ? `${cur ?? ''} ${n.toLocaleString()} / ${per ?? 'year'}` : '');

export const ReviewStep: FC<{ draft: UserProfile; missing: string[]; onJump: (step: number) => void }> = ({ draft: d, missing, onJump }) => {
  const group = (title: string, step: number, rows: ReactNode) => (
    <section style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: '0 0 4px' }}>{title}</h3>
        <button type="button" onClick={() => onJump(step)} style={{ border: 'none', background: 'none', color: C.focus, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          Edit
        </button>
      </div>
      {rows}
    </section>
  );
  const idx = (id: string) => STEPS.findIndex((s) => s.id === id);

  return (
    <div>
      <StepHeader title="Review & verify" subtitle="This is everything JAVI will use. Verifying unlocks matching and draft generation." />
      {missing.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <Notice tone="danger">
            <strong>Still needed before you can verify:</strong>
            <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
              {missing.map((m) => (
                <li key={m}>
                  <button type="button" onClick={() => onJump(stepForMissing(m))} style={{ border: 'none', background: 'none', padding: 0, color: 'inherit', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>
                    {m}
                  </button>
                </li>
              ))}
            </ul>
          </Notice>
        </div>
      )}

      {group('Identity', idx('identity'), (
        <>
          <Line label="Name">{`${d.firstName} ${d.lastName}`.trim()}{d.pronouns ? ` (${d.pronouns})` : ''}</Line>
          <Line label="Email">{d.email}</Line>
          <Line label="Phone">{d.phone}</Line>
          <Line label="Headline">{d.headline}</Line>
          <Line label="Address">{[d.address?.street, d.address?.city, d.address?.state, d.address?.postalCode, d.address?.country].filter(Boolean).join(', ')}</Line>
        </>
      ))}
      {group('Career target', idx('career'), (
        <>
          <Line label="Target roles">{d.targetRoles.join(', ')}</Line>
          <Line label="Industry">{d.industry}</Line>
          <Line label="Current">{[d.currentTitle, d.currentCompany].filter(Boolean).join(' at ')}</Line>
          <Line label="Experience">{d.yearsOfExperience !== undefined ? `${d.yearsOfExperience} years${d.validatedLevel ? ` · ${d.validatedLevel}` : ''}` : ''}</Line>
          <Line label="Work model">{WORK_MODEL[d.remotePreference]}{d.locations.length ? ` · ${d.locations.join(', ')}` : ''}</Line>
          <Line label="Relocate">{yn(d.willingToRelocate)}</Line>
          <Line label="Expected salary">{money(d.salaryExpectation?.minimum, d.salaryExpectation?.currency, d.salaryExpectation?.period)}{d.salaryExpectation ? (d.salaryExpectation.negotiable ? ' (negotiable)' : ' (firm)') : ''}</Line>
          <Line label="Hard minimum">{money(d.salaryFloor?.amount, d.salaryFloor?.currency, d.salaryFloor?.period)}</Line>
        </>
      ))}
      {group('Background', idx('background'), (
        <>
          <Line label="Jobs">{d.experience.map((e) => `${e.title} · ${e.company}`).join('; ')}</Line>
          <Line label="Education">{[d.highestEducationLevel && EDUCATION[d.highestEducationLevel], ...d.education.map((e) => e.institution)].filter(Boolean).join('; ')}</Line>
          <Line label="Projects">{d.projects.map((p) => p.name).join(', ')}</Line>
          <Line label="Certifications">{d.certifications.map((c) => c.name).join(', ')}</Line>
          <Line label="Languages">{d.languages.map((l) => `${l.language} (${l.proficiency})`).join(', ')}</Line>
        </>
      ))}
      {group('Skills', idx('skills'), (
        <>
          <Line label="Skills">{d.skills.map((s) => (s.years !== undefined ? `${s.name} (${s.years}y)` : s.name)).join(', ')}</Line>
          <Line label="Summary">{d.summary}</Line>
        </>
      ))}
      {group('Links', idx('links'), (
        <>
          <Line label="LinkedIn">{d.linkedinUrl}</Line>
          <Line label="Others">{[d.githubUrl, d.portfolioUrl, d.twitterUrl, ...d.links.map((l) => l.url)].filter(Boolean).join(', ')}</Line>
        </>
      ))}
      {group('Eligibility', idx('eligibility'), (
        <>
          <Line label="Authorized to work">{d.workAuthorization ? (d.workAuthorization === 'authorized' ? 'Yes' : 'No') : ''}</Line>
          <Line label="Needs sponsorship">{yn(d.requiresSponsorship)}{d.futureSponsorship !== undefined ? ` (future: ${yn(d.futureSponsorship)})` : ''}</Line>
          <Line label="Clearance">{d.securityClearance && CLEARANCE[d.securityClearance]}</Line>
          <Line label="Notice / start">{[d.noticePeriod, d.earliestStartDate].filter(Boolean).join(' · ')}</Line>
        </>
      ))}
      {group('Automation', idx('automation'), (
        <>
          <Line label="Approval">{d.rules.approvalMode === 'auto' ? `Auto-send at ≥ ${Math.round(d.rules.autoApproveMinScore * 100)}% match` : 'Review every draft'}</Line>
          <Line label="Pace">{`Up to ${d.rules.dailySendCap}/day, ${d.rules.sendingHours.start}:00–${d.rules.sendingHours.end}:00 ${d.rules.sendingHours.timezone}${d.rules.weekdaysOnly ? ', weekdays' : ''}`}</Line>
          <Line label="Skipping">{d.blockedCompanies.join(', ')}</Line>
          <Line label="Watching">{d.careerPages.map((c) => c.url).join(', ')}</Line>
        </>
      ))}
    </div>
  );
};
