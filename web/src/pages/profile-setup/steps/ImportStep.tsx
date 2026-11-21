import { useRef, useState, type FC } from 'react';
import { profileApi } from '@/api';
import { FileTextIcon, UploadIcon } from '@/assets/icons';
import { C, Notice, StepHeader, primaryButton } from '../ui';
import { describeSaveError } from '../useSetupDraft';
import type { UserProfile } from '@/types/profile';

/**
 * Optional first step. The server parses the CV and merges what it finds into the profile
 * (it never erases fields the parser couldn't read), so every later step starts prefilled.
 */
export const ImportStep: FC<{ draft: UserProfile; onImported: (serverProfile: unknown) => void }> = ({ draft, onImported }) => {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ name: string; warnings: string[]; filled: string[] } | null>(null);

  const upload = async (file: File) => {
    setBusy(true);
    setError('');
    try {
      const res = await profileApi.uploadCv(file);
      const p = res?.profile ?? {};
      const filled = [
        p.fullName && 'name',
        p.email && 'email',
        p.phone && 'phone',
        p.headline && 'headline',
        p.summary && 'summary',
        p.experience?.length && `${p.experience.length} jobs`,
        p.education?.length && `${p.education.length} schools`,
        p.projects?.length && `${p.projects.length} projects`,
        p.certifications?.length && `${p.certifications.length} certifications`,
        p.skills?.length && `${p.skills.length} skills`,
      ].filter(Boolean) as string[];
      onImported(res?.profile);
      setResult({ name: file.name, warnings: res?.warnings ?? [], filled });
    } catch (err) {
      setError(describeSaveError(err).join(' '));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div>
      <StepHeader
        title="Let's set up your profile"
        subtitle="JAVI fills job applications with exactly what you put here, and nothing else. Start with your CV to prefill most of it, or skip and type it in."
      />

      <div
        style={{
          background: 'linear-gradient(135deg, rgba(240, 244, 255, 0.75) 0%, rgba(240, 253, 250, 0.75) 100%)',
          border: '1.5px dashed #3b82f6',
          borderRadius: 14,
          padding: '22px',
          display: 'flex',
          gap: 16,
          alignItems: 'flex-start',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <FileTextIcon size={22} color="#2563eb" />
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: 0 }}>Upload your CV</h3>
          <p style={{ fontSize: 13, color: C.subtle, margin: '4px 0 14px', lineHeight: '19px' }}>
            PDF or Word (.docx), up to 5 MB. Text-based files only; scanned PDFs can't be read.
            {draft.cv?.originalName && (
              <>
                {' '}
                Current file: <strong>{draft.cv.originalName}</strong>.
              </>
            )}
          </p>
          <input
            ref={input}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
            }}
          />
          <button type="button" onClick={() => input.current?.click()} disabled={busy} style={{ ...primaryButton(busy), display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <UploadIcon size={16} color="#ffffff" />
            {busy ? 'Reading your CV…' : draft.cv?.originalName ? 'Upload a different CV' : 'Choose file'}
          </button>
        </div>
      </div>

      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {error && <Notice tone="danger">{error}</Notice>}
        {result && (
          <Notice tone="ok">
            Read <strong>{result.name}</strong>
            {result.filled.length ? `: found ${result.filled.join(', ')}.` : ', but couldn’t pick out structured details. You can fill them in next.'} Check every
            step; nothing is final until you verify at the end.
          </Notice>
        )}
        {result?.warnings.length ? (
          <Notice>
            {result.warnings.slice(0, 5).map((w) => (
              <div key={w}>{w}</div>
            ))}
          </Notice>
        ) : null}
      </div>
    </div>
  );
};
