import { useEffect, useMemo, useState, type FC } from 'react';
import { taxonomyApi } from '@/api';
import { PlusIcon } from '@/assets/icons';
import type { UserProfile } from '@/types/profile';
import { C, Field, Notice, Section, Select, StepHeader, TextArea, inputStyle } from '../ui';
import { RequestMissingModal } from '../RequestMissingModal';
import type { StepProps } from './types';

type Bucket = 'primary' | 'secondary' | 'tools';
interface SkillRow {
  name: string;
  years?: number;
  bucket: Bucket;
}

const BUCKETS: Array<{ value: Bucket; label: string }> = [
  { value: 'primary', label: 'Core skill' },
  { value: 'secondary', label: 'Secondary' },
  { value: 'tools', label: 'Tool / framework' },
];

export const MIN_SKILLS = 5;
const MAX_SKILLS = 50;

/** One list in the UI; four fields on the server (skills[] with years + the three name buckets). */
export function rowsFromProfile(d: UserProfile): SkillRow[] {
  const rows = new Map<string, SkillRow>();
  const add = (name: string, bucket: Bucket) => {
    const key = name.toLowerCase();
    if (!rows.has(key)) rows.set(key, { name, bucket });
  };
  d.primarySkills.forEach((n) => add(n, 'primary'));
  d.secondarySkills.forEach((n) => add(n, 'secondary'));
  d.toolsAndFrameworks.forEach((n) => add(n, 'tools'));
  d.skills.forEach((s) => {
    add(s.name, 'primary');
    rows.get(s.name.toLowerCase())!.years = s.years;
  });
  return [...rows.values()];
}

function rowsToProfile(rows: SkillRow[]): Partial<UserProfile> {
  const names = (b: Bucket) => rows.filter((r) => r.bucket === b).map((r) => r.name);
  return {
    skills: rows.map((r) => (r.years === undefined ? { name: r.name } : { name: r.name, years: r.years })),
    primarySkills: names('primary'),
    secondarySkills: names('secondary'),
    toolsAndFrameworks: names('tools'),
  };
}

export const SkillsStep: FC<StepProps> = ({ draft, patch }) => {
  const rows = useMemo(() => rowsFromProfile(draft), [draft]);
  const setRows = (next: SkillRow[]) => patch(rowsToProfile(next));
  const has = (name: string) => rows.some((r) => r.name.toLowerCase() === name.toLowerCase());
  const add = (name: string) => {
    const n = name.trim().slice(0, 60);
    if (!n || has(n) || rows.length >= MAX_SKILLS) return;
    setRows([...rows, { name: n, bucket: 'primary' }]);
  };

  const [suggested, setSuggested] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ name: string; category: string }>>([]);
  const [showRequest, setShowRequest] = useState(false);

  useEffect(() => {
    taxonomyApi
      .getSkillsForRoles(draft.targetRoles, draft.headline)
      .then((r) => setSuggested(r.skills))
      .catch(() => undefined);
  }, [draft.targetRoles, draft.headline]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      taxonomyApi
        .getSkillCatalog(q)
        .then((r) => setResults(r.skills.slice(0, 8)))
        .catch(() => setResults([]));
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  const openSuggestions = suggested.filter((s) => !has(s)).slice(0, 18);

  return (
    <div>
      {showRequest && <RequestMissingModal onClose={() => setShowRequest(false)} />}
      <StepHeader
        title="Skills & summary"
        subtitle={`Add at least ${MIN_SKILLS} skills. Years per skill answer questions like “How many years of React do you have?”; leave blank if you'd rather JAVI ask you.`}
      />

      <Section title="Add skills">
        <div style={{ position: 'relative' }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add(results[0]?.name ?? query);
                setQuery('');
              }
            }}
            placeholder="Search skills, e.g. Figma, Python, Kubernetes"
            style={inputStyle}
            aria-label="Search skills"
          />
          {query.trim() && (
            <div
              style={{
                position: 'absolute',
                top: 48,
                left: 0,
                right: 0,
                background: '#ffffff',
                border: `1px solid ${C.divider}`,
                borderRadius: 10,
                boxShadow: '0 12px 24px rgba(16,24,40,0.08)',
                zIndex: 5,
                overflow: 'hidden',
              }}
            >
              {results.map((r) => (
                <button
                  key={r.name}
                  type="button"
                  disabled={has(r.name)}
                  onClick={() => {
                    add(r.name);
                    setQuery('');
                  }}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '10px 14px',
                    border: 'none',
                    background: 'none',
                    textAlign: 'left',
                    cursor: has(r.name) ? 'default' : 'pointer',
                    fontSize: 13.5,
                    color: has(r.name) ? C.muted : C.text,
                    fontFamily: 'inherit',
                  }}
                >
                  {r.name}
                  <span style={{ fontSize: 12, color: C.muted }}>{has(r.name) ? 'Added' : r.category}</span>
                </button>
              ))}
              {!results.some((r) => r.name.toLowerCase() === query.trim().toLowerCase()) && (
                <button
                  type="button"
                  onClick={() => {
                    add(query);
                    setQuery('');
                  }}
                  style={{ display: 'block', width: '100%', padding: '10px 14px', border: 'none', borderTop: `1px solid ${C.divider}`, background: C.surface, textAlign: 'left', cursor: 'pointer', fontSize: 13, color: C.body, fontFamily: 'inherit' }}
                >
                  Add “{query.trim()}” as a custom skill
                </button>
              )}
            </div>
          )}
        </div>

        {openSuggestions.length > 0 && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 8 }}>
              Suggested for {draft.targetRoles.length ? draft.targetRoles.slice(0, 2).join(', ') : 'your headline'}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {openSuggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => add(s)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 30, padding: '0 11px', borderRadius: 99, border: `1px dashed ${C.border}`, background: '#ffffff', color: C.subtle, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  <PlusIcon size={11} /> {s}
                </button>
              ))}
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={() => setShowRequest(true)}
          style={{ alignSelf: 'flex-start', border: 'none', background: 'none', color: C.focus, fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
        >
          Missing a skill from our list? Tell us
        </button>
      </Section>

      <Section title={`Your skills (${rows.length})`}>
        {rows.length === 0 && <Notice>No skills yet. Search above or tap a suggestion.</Notice>}
        {rows.map((r, i) => (
          <div
            key={r.name}
            style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) 92px minmax(0, 1fr) auto', gap: 8, alignItems: 'center', borderBottom: `1px solid ${C.divider}`, paddingBottom: 10 }}
          >
            <span style={{ fontSize: 14, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</span>
            <input
              type="number"
              min={0}
              max={60}
              value={r.years ?? ''}
              placeholder="Years"
              aria-label={`Years using ${r.name}`}
              onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, years: e.target.value === '' ? undefined : Math.max(0, Math.min(60, Number(e.target.value))) } : x)))}
              style={{ ...inputStyle, height: 38, padding: '0 10px' }}
            />
            <Select value={r.bucket} onChange={(v) => setRows(rows.map((x, j) => (j === i ? { ...x, bucket: (v || 'primary') as Bucket } : x)))} options={BUCKETS} />
            <button
              type="button"
              aria-label={`Remove ${r.name}`}
              onClick={() => setRows(rows.filter((_, j) => j !== i))}
              style={{ border: 'none', background: 'none', color: C.muted, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Remove
            </button>
          </div>
        ))}
      </Section>

      <Section title="About you">
        <Field label="Professional summary" required hint="3–5 sentences. Used on your CV and for “Tell us about yourself” questions.">
          <TextArea value={draft.summary} onChange={(v) => patch({ summary: v })} rows={5} maxLength={3000} />
        </Field>
        <Field label="Elevator pitch" hint="Optional. One or two sentences on what you do best; used to open cover letters.">
          <TextArea value={draft.elevatorPitch} onChange={(v) => patch({ elevatorPitch: v || undefined })} rows={2} maxLength={800} />
        </Field>
      </Section>
    </div>
  );
};

export function validateSkills(d: UserProfile): string[] {
  const out: string[] = [];
  if (rowsFromProfile(d).length < MIN_SKILLS) out.push(`At least ${MIN_SKILLS} skills`);
  if (!d.summary?.trim()) out.push('Professional summary');
  return out;
}
