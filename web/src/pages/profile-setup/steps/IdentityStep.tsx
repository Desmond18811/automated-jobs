import { useEffect, useRef, useState, type FC } from 'react';
import { taxonomyApi } from '@/api';
import { CameraIcon, UserIcon } from '@/assets/icons';
import { C, Field, Row, Section, StepHeader, TextInput, secondaryButton } from '../ui';
import type { StepProps } from './types';

/** Shrink the photo to a 256px JPEG so the profile save stays far below the API's 1 MB body limit. */
function resizeImage(file: File, size = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = size / Math.max(img.width, img.height, size);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image'));
    };
    img.src = url;
  });
}

export const IdentityStep: FC<StepProps> = ({ draft, patch }) => {
  const photo = useRef<HTMLInputElement>(null);
  const [countries, setCountries] = useState<string[]>([]);
  const address = draft.address ?? { city: '', country: '' };
  const setAddress = (partial: Partial<typeof address>) => patch({ address: { ...address, ...partial } });

  useEffect(() => {
    taxonomyApi
      .getLocations()
      .then((r) => setCountries([...new Set(r.locations.map((l: any) => l.country).filter((c: string) => c && c !== 'Remote'))] as string[]))
      .catch(() => undefined);
  }, []);

  return (
    <div>
      <StepHeader title="Who you are" subtitle="These go straight into the name, email, phone and address boxes on application forms." />

      <Section title="Photo">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: C.surface,
              border: `1px solid ${C.divider}`,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {draft.avatarUrl ? <img src={draft.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <UserIcon size={26} color={C.muted} />}
          </div>
          <input
            ref={photo}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) patch({ avatarUrl: await resizeImage(f).catch(() => draft.avatarUrl) });
            }}
          />
          <button type="button" onClick={() => photo.current?.click()} style={{ ...secondaryButton, height: 38, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <CameraIcon size={15} /> {draft.avatarUrl ? 'Change' : 'Upload'}
          </button>
          {draft.avatarUrl && (
            <button type="button" onClick={() => patch({ avatarUrl: '' })} style={{ ...secondaryButton, height: 38, border: 'none' }}>
              Remove
            </button>
          )}
        </div>
      </Section>

      <Section title="Name & contact">
        <Row>
          <Field label="First name" required>
            <TextInput value={draft.firstName} onChange={(v) => patch({ firstName: v })} autoComplete="given-name" />
          </Field>
          <Field label="Last name" required>
            <TextInput value={draft.lastName} onChange={(v) => patch({ lastName: v })} autoComplete="family-name" />
          </Field>
        </Row>
        <Row>
          <Field label="Pronouns" hint="Optional. Only used if a form asks.">
            <TextInput value={draft.pronouns} onChange={(v) => patch({ pronouns: v || undefined })} placeholder="e.g. she/her" />
          </Field>
          <Field label="Email for applications" required hint="Recruiters reply here.">
            <TextInput type="email" value={draft.email} onChange={(v) => patch({ email: v })} autoComplete="email" />
          </Field>
        </Row>
        <Field label="Phone (with country code)" required hint="Also where JAVI sends WhatsApp alerts when it needs you, e.g. for a CAPTCHA.">
          <TextInput type="tel" value={draft.phone} onChange={(v) => patch({ phone: v })} placeholder="+234 803 123 4567" autoComplete="tel" />
        </Field>
        <Field label="Professional headline" required hint="One line, e.g. “Senior Product Designer · Fintech”.">
          <TextInput value={draft.headline} onChange={(v) => patch({ headline: v })} />
        </Field>
      </Section>

      <Section title="Address" hint="Forms ask for city and country almost every time; street and postcode only sometimes.">
        <Field label="Street address">
          <TextInput value={address.street} onChange={(v) => setAddress({ street: v })} autoComplete="street-address" />
        </Field>
        <Row>
          <Field label="City" required>
            <TextInput value={address.city} onChange={(v) => setAddress({ city: v })} autoComplete="address-level2" />
          </Field>
          <Field label="State / province">
            <TextInput value={address.state} onChange={(v) => setAddress({ state: v })} autoComplete="address-level1" />
          </Field>
        </Row>
        <Row>
          <Field label="Postal code">
            <TextInput value={address.postalCode} onChange={(v) => setAddress({ postalCode: v })} autoComplete="postal-code" />
          </Field>
          <Field label="Country" required>
            <input
              list="javi-countries"
              value={address.country ?? ''}
              onChange={(e) => setAddress({ country: e.target.value })}
              autoComplete="country-name"
              style={{ width: '100%', height: 44, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0 14px', fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
            <datalist id="javi-countries">
              {countries.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
        </Row>
      </Section>
    </div>
  );
};

export function validateIdentity(d: StepProps['draft']): string[] {
  const out: string[] = [];
  if (d.firstName.trim().length < 1) out.push('First name');
  if (d.lastName.trim().length < 1) out.push('Last name');
  if (!/^\S+@\S+\.\S+$/.test(d.email.trim())) out.push('A valid email');
  if (d.phone.replace(/\D/g, '').length < 7) out.push('Phone number');
  if (d.headline.trim().length < 3) out.push('Headline');
  if (!d.address?.city?.trim()) out.push('City');
  if (!d.address?.country?.trim()) out.push('Country');
  return out;
}
