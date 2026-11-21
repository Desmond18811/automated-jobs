import { useEffect, useState, type FC } from 'react';
import { useParams } from 'react-router-dom';
import { replyApi, type PublicTask } from '@/api';
import { JaviBrandMark } from '@/assets/logos';
import { C, Field, Notice, Select, TextArea, TextInput, primaryButton, secondaryButton } from './profile-setup/ui';

/**
 * Opened from the "Answer here" link in a WhatsApp alert, usually on a phone where the user isn't
 * logged in. The link itself authorises answering this one request.
 */
const REASON_HELP: Record<string, string> = {
  captcha: 'Solve the CAPTCHA in the JAVI browser window on your computer. JAVI notices when it clears; tap Continue if it doesn’t.',
  login_wall: 'Finish signing in (or enter the code below) and JAVI carries on.',
  no_form_found: 'Open the application form in the JAVI browser window, then tap Continue.',
  confirm_submission: 'Check the form in the JAVI window, fix anything it flags and submit, then tap Continue.',
};

export const ReplyPage: FC = () => {
  const { token = '' } = useParams();
  const [task, setTask] = useState<PublicTask | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    replyApi
      .get(token)
      .then((t) => {
        setTask(t);
        // Prefill LLM-drafted suggestions so a good draft is one tap to accept.
        setAnswers(Object.fromEntries(t.questions.filter((q) => q.suggested).map((q) => [q.key, q.suggested!])));
      })
      .catch((e) => setError(e?.message || 'This link is not valid.'));
  }, [token]);

  const send = async (action: 'answer' | 'continue' | 'submitted') => {
    setBusy(true);
    setError('');
    try {
      setTask(await replyApi.send(token, action, action === 'answer' ? answers : undefined));
    } catch (e: any) {
      setError(e?.message || 'Could not send. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const missing = task?.questions.filter((q) => q.required && !answers[q.key]?.trim()) ?? [];

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', fontFamily: "Montserrat, system-ui, sans-serif", padding: '20px 16px 48px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: 520, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <JaviBrandMark />
        {!task && !error && <p style={{ color: C.muted, fontSize: 14 }}>Loading…</p>}
        {error && <Notice tone="danger">{error}</Notice>}

        {task && (
          <>
            <div>
              {(task.jobTitle || task.company) && (
                <div style={{ fontSize: 12.5, fontWeight: 600, color: C.muted, marginBottom: 4 }}>{[task.jobTitle, task.company].filter(Boolean).join(' · ')}</div>
              )}
              <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: '0 0 8px', letterSpacing: '-0.02em' }}>{task.message}</h1>
              {REASON_HELP[task.reason] && <p style={{ fontSize: 14, color: C.subtle, margin: 0, lineHeight: '21px' }}>{REASON_HELP[task.reason]}</p>}
            </div>

            {task.status !== 'open' ? (
              <Notice tone="ok">{task.live ? 'Done. JAVI is carrying on in the browser.' : 'Done. Thanks, JAVI has what it needs.'}</Notice>
            ) : (
              <>
                {task.live && <Notice>The page is open in the JAVI browser window. JAVI continues the moment you answer.</Notice>}

                {task.questions.map((q) => (
                  <Field key={q.key} label={q.label} required={q.required} hint={q.suggested ? 'JAVI drafted this from your profile. Edit it or send as is.' : undefined}>
                    {q.options?.length ? (
                      <Select value={answers[q.key] ?? ''} onChange={(v) => setAnswers({ ...answers, [q.key]: v })} options={q.options.map((o) => ({ value: o, label: o }))} />
                    ) : q.type === 'textarea' || (q.suggested?.length ?? 0) > 80 ? (
                      <TextArea value={answers[q.key]} onChange={(v) => setAnswers({ ...answers, [q.key]: v })} rows={5} />
                    ) : (
                      <TextInput value={answers[q.key]} onChange={(v) => setAnswers({ ...answers, [q.key]: v })} />
                    )}
                  </Field>
                ))}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {task.questions.length > 0 ? (
                    <button type="button" onClick={() => send('answer')} disabled={busy || missing.length > 0} style={{ ...primaryButton(busy || missing.length > 0), width: '100%' }}>
                      {busy ? 'Sending…' : 'Send answers'}
                    </button>
                  ) : (
                    <button type="button" onClick={() => send('continue')} disabled={busy} style={{ ...primaryButton(busy), width: '100%' }}>
                      {busy ? 'Sending…' : 'Done, continue'}
                    </button>
                  )}
                  {task.reason === 'confirm_submission' || task.reason === 'no_form_found' ? (
                    <button type="button" onClick={() => send('submitted')} disabled={busy} style={{ ...secondaryButton, width: '100%' }}>
                      I submitted it myself
                    </button>
                  ) : null}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ReplyPage;
