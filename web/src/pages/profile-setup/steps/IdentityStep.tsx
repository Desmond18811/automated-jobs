import { useEffect, useRef, useState, type FC } from 'react';
import { gmailApi, taxonomyApi, telegramApi, type TelegramStatus } from '@/api';
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
      const g = canvas.getContext('2d')!;
      // JPEG has no transparency; paint white first so transparent PNGs don't turn black.
      g.fillStyle = '#ffffff';
      g.fillRect(0, 0, canvas.width, canvas.height);
      g.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('This browser can\'t open that image. Use a JPG or PNG (iPhone HEIC photos need converting first).'));
    };
    img.src = url;
  });
}

export const IdentityStep: FC<StepProps> = ({ draft, patch }) => {
  const photo = useRef<HTMLInputElement>(null);
  const [photoError, setPhotoError] = useState('');
  const [countries, setCountries] = useState<string[]>([]);
  const address = draft.address ?? { city: '', country: '' };
  const setAddress = (partial: Partial<typeof address>) => patch({ address: { ...address, ...partial } });

  const [gmailStatus, setGmailStatus] = useState<{ connected: boolean; address: string | null; configured?: boolean } | null>(null);
  const [gmailMsg, setGmailMsg] = useState('');

  useEffect(() => {
    taxonomyApi
      .getLocations()
      .then((r) => setCountries([...new Set(r.locations.map((l: any) => l.country).filter((c: string) => c && c !== 'Remote'))] as string[]))
      .catch(() => undefined);
    gmailApi
      .status()
      .then(setGmailStatus)
      .catch(() => setGmailStatus({ connected: false, address: null })); // unknown, not "not configured"
  }, []);

  // Telegram: connect opens the bot with a one-time link; we watch for the chat to be connected.
  const [tgStatus, setTgStatus] = useState<TelegramStatus | null>(null);
  const [tgBusy, setTgBusy] = useState('');
  const [tgMsg, setTgMsg] = useState<{ tone: 'ok' | 'danger'; text: string } | null>(null);
  const tgWatch = useRef<ReturnType<typeof setInterval>>();
  useEffect(() => {
    telegramApi.status().then(setTgStatus, () => setTgStatus(null));
    return () => clearInterval(tgWatch.current);
  }, []);
  const connectTelegram = async () => {
    setTgMsg(null);
    setTgBusy('connect');
    try {
      const { url } = await telegramApi.link();
      window.open(url, '_blank', 'noopener');
      setTgMsg({ tone: 'ok', text: 'Telegram is opening. Tap Start in the bot, then come back here.' });
      clearInterval(tgWatch.current);
      let tries = 0;
      tgWatch.current = setInterval(async () => {
        tries += 1;
        const st = await telegramApi.status().catch(() => null);
        if (st) setTgStatus(st);
        if (st?.linked) {
          clearInterval(tgWatch.current);
          setTgMsg({ tone: 'ok', text: `Connected${st.username ? ` as @${st.username}` : ''}. J.A.V.I will message you there.` });
        } else if (tries > 100) clearInterval(tgWatch.current);
      }, 3000);
    } catch (err: any) {
      setTgMsg({ tone: 'danger', text: err?.message || 'Could not start the Telegram connection.' });
    } finally {
      setTgBusy('');
    }
  };
  const testTelegram = async () => {
    setTgBusy('test');
    setTgMsg(null);
    try {
      await telegramApi.test();
      setTgMsg({ tone: 'ok', text: 'Test message sent. Check Telegram.' });
    } catch (err: any) {
      setTgMsg({ tone: 'danger', text: err?.message || 'Could not send the test message.' });
    } finally {
      setTgBusy('');
    }
  };
  const disconnectTelegram = async () => {
    setTgBusy('unlink');
    try {
      setTgStatus(await telegramApi.unlink());
      setTgMsg(null);
    } finally {
      setTgBusy('');
    }
  };


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
              e.target.value = '';
              if (!f) return;
              try {
                setPhotoError('');
                patch({ avatarUrl: await resizeImage(f) });
              } catch (err: any) {
                setPhotoError(err?.message || 'Could not use that photo.');
              }
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
          {photoError && (
            <span role="alert" style={{ fontSize: 12, color: '#B4232F', flexBasis: '100%' }}>
              {photoError}
            </span>
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
        <Field label="Phone (with country code)" required hint="Application forms ask for it. Alerts and questions from J.A.V.I go to Telegram (below).">
          <TextInput type="tel" value={draft.phone} onChange={(v) => patch({ phone: v })} placeholder="+234 803 123 4567" autoComplete="tel" />
        </Field>
        <Field label="Professional headline" required hint="One line, e.g. “Senior Product Designer · Fintech”.">
          <TextInput value={draft.headline} onChange={(v) => patch({ headline: v })} />
        </Field>
      </Section>

      <Section title="How J.A.V.I reaches you" hint="Your email is used on applications. Telegram is where J.A.V.I sends alerts and asks you questions when it needs an answer.">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
          {/* Email Channel */}
          <div
            style={{
              padding: '16px',
              borderRadius: 12,
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Email Channel</span>
              {gmailStatus?.connected ? (
                <span style={{ fontSize: 11, fontWeight: 600, color: '#047857', background: '#ECFDF5', padding: '2px 8px', borderRadius: 999 }}>
                  ● Gmail Connected
                </span>
              ) : (
                <span style={{ fontSize: 11, fontWeight: 600, color: '#1D4ED8', background: '#EFF6FF', padding: '2px 8px', borderRadius: 999 }}>
                  ● Application Email
                </span>
              )}
            </div>
            <span style={{ fontSize: 13, color: '#334155', wordBreak: 'break-all', fontWeight: 500 }}>
              {draft.email || 'No email entered'}
            </span>
            <span style={{ fontSize: 12, color: '#64748B', lineHeight: '17px' }}>
              Recruiter confirmations and interview requests will arrive directly at this inbox.
            </span>
            {!gmailStatus?.connected ? (
              <button
                type="button"
                onClick={async () => {
                  try {
                    const { url } = await gmailApi.connect();
                    window.location.assign(url);
                  } catch (err: any) {
                    setGmailMsg(
                      err?.data?.code === 'gmail_not_configured'
                        ? "Gmail sending isn't available yet. You can connect it later in Settings."
                        : err?.message || 'Could not connect Gmail',
                    );
                  }
                }}
                disabled={gmailStatus?.configured === false}
                style={{
                  ...secondaryButton,
                  height: 34,
                  fontSize: 12,
                  marginTop: 4,
                  alignSelf: 'flex-start',
                }}
              >
                Connect Gmail Account
              </button>
            ) : null}
            {!gmailStatus?.connected && (gmailStatus?.configured === false || gmailMsg) ? (
              <span style={{ fontSize: 12, color: '#64748B' }}>
                {gmailMsg || "Gmail sending isn't available yet. You can connect it later in Settings."}
              </span>
            ) : null}
            {gmailStatus?.connected && (
              <span style={{ fontSize: 12, color: '#047857', fontWeight: 500 }}>
                Sending enabled as {gmailStatus.address}
              </span>
            )}
          </div>

          {/* Telegram */}
          <div style={{ padding: '16px', borderRadius: 12, background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Telegram</span>
              {tgStatus?.linked ? (
                <span style={{ fontSize: 11, fontWeight: 600, color: '#047857', background: '#ECFDF5', padding: '2px 8px', borderRadius: 999 }}>● Connected</span>
              ) : tgStatus && !tgStatus.configured ? (
                <span style={{ fontSize: 11, fontWeight: 600, color: '#64748B', background: '#F1F5F9', padding: '2px 8px', borderRadius: 999 }}>Not set up yet</span>
              ) : (
                <span style={{ fontSize: 11, fontWeight: 600, color: '#B45309', background: '#FEF3C7', padding: '2px 8px', borderRadius: 999 }}>Not connected</span>
              )}
            </div>
            <span style={{ fontSize: 13, color: '#334155', fontWeight: 500 }}>
              {tgStatus?.linked ? `@${tgStatus.username || 'your chat'}` : tgStatus?.bot ? `Bot: @${tgStatus.bot}` : 'J.A.V.I bot'}
            </span>
            <span style={{ fontSize: 12, color: '#64748B', lineHeight: '17px' }}>
              Alerts and questions, e.g. a CAPTCHA to solve or an answer a form needs. Tap a button or reply to the message to answer.
            </span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
              {!tgStatus?.linked ? (
                <button type="button" disabled={!!tgBusy || tgStatus?.configured === false} onClick={connectTelegram} style={{ ...secondaryButton, height: 34, fontSize: 12 }}>
                  {tgBusy === 'connect' ? 'Opening…' : 'Connect Telegram'}
                </button>
              ) : (
                <>
                  <button type="button" disabled={!!tgBusy} onClick={testTelegram} style={{ ...secondaryButton, height: 34, fontSize: 12 }}>
                    {tgBusy === 'test' ? 'Sending…' : 'Send test message'}
                  </button>
                  <button type="button" disabled={!!tgBusy} onClick={disconnectTelegram} style={{ ...secondaryButton, height: 34, fontSize: 12, border: 'none' }}>
                    Disconnect
                  </button>
                </>
              )}
            </div>
            {tgStatus?.configured === false && !tgMsg && (
              <span style={{ fontSize: 12, color: '#64748B' }}>The Telegram bot isn't set up on this server yet. You can connect it later.</span>
            )}
            {tgMsg && (
              <span role={tgMsg.tone === 'danger' ? 'alert' : 'status'} style={{ fontSize: 12, fontWeight: 500, color: tgMsg.tone === 'ok' ? '#047857' : '#B42318', marginTop: 2 }}>
                {tgMsg.text}
              </span>
            )}
          </div>
        </div>
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
