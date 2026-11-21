import type { FC } from 'react';
import type { CertificationItem, EducationItem, EducationLevel, ExperienceItem, LanguageProficiency, LanguageSkill, ProjectItem } from '@/types/profile';
import {
  AddButton, BulletsInput, C, DATE_PLACEHOLDER, Field, ItemCard, Row, Section, Select, StepHeader, TagInput, TextArea, TextInput, Toggle, newId,
} from '../ui';
import type { StepProps } from './types';

const EDUCATION_LEVELS: Array<{ value: EducationLevel; label: string }> = [
  { value: 'high_school', label: 'High school / secondary' },
  { value: 'associate', label: 'Associate degree / OND / HND' },
  { value: 'bachelor', label: "Bachelor's degree" },
  { value: 'master', label: "Master's degree / MBA" },
  { value: 'doctorate', label: 'Doctorate / PhD' },
  { value: 'bootcamp', label: 'Bootcamp / certificate' },
  { value: 'self_taught', label: 'Self-taught' },
];

const PROFICIENCY: Array<{ value: LanguageProficiency; label: string }> = [
  { value: 'native', label: 'Native' },
  { value: 'fluent', label: 'Fluent' },
  { value: 'conversational', label: 'Conversational' },
  { value: 'basic', label: 'Basic' },
];

/** Replace item `i` of a list with a patched copy. */
function update<T>(list: T[], i: number, p: Partial<T>): T[] {
  return list.map((x, j) => (j === i ? { ...x, ...p } : x));
}

export const BackgroundStep: FC<StepProps> = ({ draft, patch }) => {
  const exp = draft.experience;
  const edu = draft.education;
  const proj = draft.projects;
  const certs = draft.certifications;
  const langs = draft.languages;

  const setExp = (i: number, p: Partial<ExperienceItem>) => patch({ experience: update(exp, i, p) });
  const setEdu = (i: number, p: Partial<EducationItem>) => patch({ education: update(edu, i, p) });
  const setProj = (i: number, p: Partial<ProjectItem>) => patch({ projects: update(proj, i, p) });
  const setCert = (i: number, p: Partial<CertificationItem>) => patch({ certifications: update(certs, i, p) });
  const setLang = (i: number, p: Partial<LanguageSkill>) => patch({ languages: update(langs, i, p) });

  return (
    <div>
      <StepHeader
        title="Your background"
        subtitle="Tailored CVs and cover letters are written only from what's here, so list real roles and achievements. Add at least one job or project."
      />

      <Section title="Work experience" hint="Most recent first. Achievements work best as one short line each, with numbers where you have them.">
        {exp.map((e, i) => (
          <ItemCard key={e.id} title={e.title || e.company ? `${e.title || 'Role'} · ${e.company || 'Company'}` : `Job ${i + 1}`} onRemove={() => patch({ experience: exp.filter((_, j) => j !== i) })}>
            <Row>
              <Field label="Job title" required>
                <TextInput value={e.title} onChange={(v) => setExp(i, { title: v })} />
              </Field>
              <Field label="Company" required>
                <TextInput value={e.company} onChange={(v) => setExp(i, { company: v })} />
              </Field>
            </Row>
            <Row min={140}>
              <Field label="Location">
                <TextInput value={e.location} onChange={(v) => setExp(i, { location: v })} placeholder="e.g. Lagos / Remote" />
              </Field>
              <Field label="Start">
                <TextInput value={e.start} onChange={(v) => setExp(i, { start: v })} placeholder={DATE_PLACEHOLDER} />
              </Field>
              {!e.current && (
                <Field label="End">
                  <TextInput value={e.end} onChange={(v) => setExp(i, { end: v })} placeholder={DATE_PLACEHOLDER} />
                </Field>
              )}
            </Row>
            <Toggle checked={!!e.current} onChange={(v) => setExp(i, { current: v, end: v ? undefined : e.end })} label="I currently work here" />
            <Field label="Achievements">
              <BulletsInput bullets={e.bullets} onChange={(b) => setExp(i, { bullets: b })} />
            </Field>
          </ItemCard>
        ))}
        <AddButton
          label="Add a job"
          disabled={exp.length >= 25}
          onClick={() => patch({ experience: [...exp, { id: newId(), company: '', title: '', bullets: [] }] })}
        />
      </Section>

      <Section title="Education">
        <Field label="Highest level of education">
          <Select value={draft.highestEducationLevel} onChange={(v) => patch({ highestEducationLevel: v || undefined })} options={EDUCATION_LEVELS} />
        </Field>
        {edu.map((e, i) => (
          <ItemCard key={e.id} title={e.institution || `School ${i + 1}`} onRemove={() => patch({ education: edu.filter((_, j) => j !== i) })}>
            <Field label="School / institution" required>
              <TextInput value={e.institution} onChange={(v) => setEdu(i, { institution: v })} />
            </Field>
            <Row>
              <Field label="Degree">
                <TextInput value={e.degree} onChange={(v) => setEdu(i, { degree: v })} placeholder="e.g. B.Sc." />
              </Field>
              <Field label="Field of study">
                <TextInput value={e.field} onChange={(v) => setEdu(i, { field: v })} placeholder="e.g. Computer Science" />
              </Field>
            </Row>
            <Row min={140}>
              <Field label="Start">
                <TextInput value={e.start} onChange={(v) => setEdu(i, { start: v })} placeholder="e.g. 2016" />
              </Field>
              <Field label="End">
                <TextInput value={e.end} onChange={(v) => setEdu(i, { end: v })} placeholder="e.g. 2020" />
              </Field>
              <Field label="Grade">
                <TextInput value={e.grade} onChange={(v) => setEdu(i, { grade: v })} placeholder="e.g. Second Class Upper" />
              </Field>
            </Row>
          </ItemCard>
        ))}
        <AddButton label="Add education" disabled={edu.length >= 15} onClick={() => patch({ education: [...edu, { id: newId(), institution: '' }] })} />
      </Section>

      <Section title="Projects" hint="Side projects, open source, freelance work. Useful when you're early in your career.">
        {proj.map((p, i) => (
          <ItemCard key={p.id} title={p.name || `Project ${i + 1}`} onRemove={() => patch({ projects: proj.filter((_, j) => j !== i) })}>
            <Row>
              <Field label="Project name" required>
                <TextInput value={p.name} onChange={(v) => setProj(i, { name: v })} />
              </Field>
              <Field label="Link">
                <TextInput type="url" value={p.url} onChange={(v) => setProj(i, { url: v })} placeholder="https://" />
              </Field>
            </Row>
            <Field label="What it is">
              <TextArea value={p.description} onChange={(v) => setProj(i, { description: v })} rows={2} />
            </Field>
            <Field label="Skills used" group>
              <TagInput values={p.skills ?? []} onChange={(v) => setProj(i, { skills: v })} placeholder="Type and press Enter" />
            </Field>
            <Field label="Highlights">
              <BulletsInput bullets={p.bullets} onChange={(b) => setProj(i, { bullets: b.slice(0, 10) })} />
            </Field>
          </ItemCard>
        ))}
        <AddButton label="Add a project" disabled={proj.length >= 25} onClick={() => patch({ projects: [...proj, { id: newId(), name: '', bullets: [] }] })} />
      </Section>

      <Section title="Certifications">
        {certs.map((c, i) => (
          <ItemCard key={c.id} title={c.name || `Certification ${i + 1}`} onRemove={() => patch({ certifications: certs.filter((_, j) => j !== i) })}>
            <Row min={140}>
              <Field label="Name" required>
                <TextInput value={c.name} onChange={(v) => setCert(i, { name: v })} placeholder="e.g. AWS Solutions Architect" />
              </Field>
              <Field label="Issuer">
                <TextInput value={c.issuer} onChange={(v) => setCert(i, { issuer: v })} />
              </Field>
              <Field label="Year">
                <TextInput value={c.year} onChange={(v) => setCert(i, { year: v })} placeholder="e.g. 2024" />
              </Field>
            </Row>
          </ItemCard>
        ))}
        <AddButton label="Add a certification" disabled={certs.length >= 30} onClick={() => patch({ certifications: [...certs, { id: newId(), name: '' }] })} />
      </Section>

      <Section title="Languages you speak">
        {langs.map((l, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) auto', gap: 10, alignItems: 'center' }}>
            <TextInput value={l.language} onChange={(v) => setLang(i, { language: v })} placeholder="e.g. English" />
            <Select value={l.proficiency} onChange={(v) => setLang(i, { proficiency: (v || 'fluent') as LanguageProficiency })} options={PROFICIENCY} />
            <button
              type="button"
              onClick={() => patch({ languages: langs.filter((_, j) => j !== i) })}
              style={{ border: 'none', background: 'none', color: C.muted, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Remove
            </button>
          </div>
        ))}
        <AddButton label="Add a language" disabled={langs.length >= 20} onClick={() => patch({ languages: [...langs, { language: '', proficiency: 'fluent' }] })} />
      </Section>
    </div>
  );
};

/** Matches the server: required names on every entry, and /verify needs one job or project. */
export function validateBackground(d: StepProps['draft']): string[] {
  const out: string[] = [];
  if (!d.experience.length && !d.projects.length) out.push('At least one job or project');
  d.experience.forEach((e, i) => {
    if (!e.title.trim() || !e.company.trim()) out.push(`Job ${i + 1}: title and company`);
  });
  d.education.forEach((e, i) => !e.institution.trim() && out.push(`Education ${i + 1}: school name`));
  d.projects.forEach((p, i) => !p.name.trim() && out.push(`Project ${i + 1}: name`));
  d.certifications.forEach((c, i) => !c.name.trim() && out.push(`Certification ${i + 1}: name`));
  d.languages.forEach((l, i) => !l.language.trim() && out.push(`Language ${i + 1}: name`));
  return out;
}
