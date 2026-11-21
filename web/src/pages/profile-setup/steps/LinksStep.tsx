import type { FC } from 'react';
import type { ProfileLink } from '@/types/profile';
import { AddButton, C, Field, Section, StepHeader, TextInput } from '../ui';
import type { StepProps } from './types';

const isUrl = (v: string) => /^https?:\/\/\S+\.\S+/i.test(v.trim());

/** The server rejects anything that isn't a full URL, so add the scheme people usually leave off. */
const withScheme = (v: string) => (v && !/^https?:\/\//i.test(v) && /\.\S/.test(v) ? `https://${v.trim()}` : v.trim());

export const LinksStep: FC<StepProps> = ({ draft, patch }) => {
  const links = draft.links;
  const setLink = (i: number, p: Partial<ProfileLink>) => patch({ links: links.map((l, j) => (j === i ? { ...l, ...p } : l)) });
  const urlField = (key: 'linkedinUrl' | 'githubUrl' | 'portfolioUrl' | 'twitterUrl', label: string, placeholder: string, required = false, hint?: string) => {
    const v = draft[key] ?? '';
    return (
      <Field label={label} required={required} hint={hint} error={v && !isUrl(v) ? 'Enter a full link, e.g. https://…' : undefined}>
        <TextInput type="url" value={v} onChange={(x) => patch({ [key]: x })} placeholder={placeholder} />
      </Field>
    );
  };

  return (
    <div>
      <StepHeader title="Links" subtitle="Forms ask for these constantly. LinkedIn is required; the rest only if you have them." />
      <Section title="Profiles">
        {urlField('linkedinUrl', 'LinkedIn', 'https://linkedin.com/in/you', true)}
        {urlField('githubUrl', 'GitHub', 'https://github.com/you')}
        {urlField('portfolioUrl', 'Portfolio or personal site', 'https://you.dev', false, 'Used for “Website” and “Portfolio” questions.')}
        {urlField('twitterUrl', 'X / Twitter', 'https://x.com/you')}
      </Section>
      <Section title="Other links" hint="Dribbble, Behance, Medium, a publication… up to 10.">
        {links.map((l, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 0.8fr) minmax(0, 1.6fr) auto', gap: 8, alignItems: 'start' }}>
            <TextInput value={l.label} onChange={(v) => setLink(i, { label: v.slice(0, 40) })} placeholder="Label" />
            <div>
              <TextInput type="url" value={l.url} onChange={(v) => setLink(i, { url: v })} placeholder="https://" />
              {l.url && !isUrl(l.url) && <span style={{ fontSize: 12, color: C.danger }}>Enter a full link</span>}
            </div>
            <button
              type="button"
              onClick={() => patch({ links: links.filter((_, j) => j !== i) })}
              style={{ height: 44, border: 'none', background: 'none', color: C.muted, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Remove
            </button>
          </div>
        ))}
        <AddButton label="Add a link" disabled={links.length >= 10} onClick={() => patch({ links: [...links, { label: '', url: '' }] })} />
      </Section>
    </div>
  );
};

/** Normalise before saving (add https://, drop empty extra links). */
export function normalizeLinks(d: StepProps['draft']): Partial<StepProps['draft']> {
  return {
    linkedinUrl: withScheme(d.linkedinUrl),
    githubUrl: withScheme(d.githubUrl ?? ''),
    portfolioUrl: withScheme(d.portfolioUrl ?? ''),
    twitterUrl: withScheme(d.twitterUrl ?? ''),
    links: d.links.filter((l) => l.url.trim()).map((l) => ({ label: l.label.trim() || 'Link', url: withScheme(l.url) })),
  };
}

export function validateLinks(d: StepProps['draft']): string[] {
  const n = { ...d, ...normalizeLinks(d) };
  const out: string[] = [];
  if (!isUrl(n.linkedinUrl)) out.push('LinkedIn URL');
  for (const [k, label] of [['githubUrl', 'GitHub'], ['portfolioUrl', 'Portfolio'], ['twitterUrl', 'X / Twitter']] as const) {
    if (n[k] && !isUrl(n[k]!)) out.push(`${label} link`);
  }
  n.links.forEach((l, i) => !isUrl(l.url) && out.push(`Other link ${i + 1}`));
  return out;
}
