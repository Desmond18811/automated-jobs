import { useState, type FC } from 'react';
import { Link } from 'react-router-dom';
import { profileApi, tasksApi } from '@/api';
import { useDash } from '../context';
import { Card, EmptyNote, ErrorNote, H2, Logo, Muted, PageHead, Skeleton, ago, asList, pad2, useAsync } from '../ui';

const REASON: Record<string, { label: string; bg: string; fg: string }> = {
  unknown_question: { label: 'Custom question', bg: '#EFF6FF', fg: '#1D4ED8' },
  salary_question: { label: 'Salary question', bg: '#EFF6FF', fg: '#1D4ED8' },
  captcha: { label: 'Verification', bg: '#FFF7ED', fg: '#9A3412' },
  login_wall: { label: 'Login wall', bg: '#F0FDFA', fg: '#0F766E' },
  interview_invite: { label: 'Interview invite', bg: '#F0FDFA', fg: '#0F766E' },
  assisted_platform: { label: 'Apply by hand', bg: '#F3F6F9', fg: '#3E4851' },
  confirm_submission: { label: 'Confirm', bg: '#FFF7ED', fg: '#9A3412' },
  no_form_found: { label: 'No form found', bg: '#FEF2F2', fg: '#B42318' },
  reconnect_gmail: { label: 'Reconnect Gmail', bg: '#FEF2F2', fg: '#B42318' },
};
const FILTERS: Array<[string, string[]]> = [
  ['All', []],
  ['Questions', ['unknown_question', 'salary_question', 'confirm_submission']],
  ['Verification', ['captcha']],
  ['Logins', ['login_wall', 'reconnect_gmail']],
];

const TaskCard: FC<{ task: any; onChanged: () => void }> = ({ task, onChanged }) => {
  const { notify } = useDash();
  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    Object.fromEntries((task.questions || []).map((q: any) => [q.key, q.suggested ?? ''])));
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const r = REASON[task.reason] || { label: 'Needs you', bg: '#F3F6F9', fg: '#3E4851' };
  const company = task.payload?.company;
  const role = task.payload?.role || task.payload?.jobTitle;
  const openUrl = task.payload?.openUrl || task.payload?.pageUrl || task.payload?.url;
  const hasQuestions = (task.questions || []).length > 0;
  const missingRequired = (task.questions || []).some((q: any) => q.required && !String(answers[q.key] ?? '').trim());

  const run = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await fn();
      notify(done);
      onChanged();
    } catch (e: any) {
      notify(e?.message || 'That did not work');
      setBusy(false);
    }
  };

  const title = hasQuestions ? task.questions[0].label : task.message || r.label;

  return (
    <article aria-labelledby={`t-${task._id}`} className="card" style={{ padding: '20px 22px 22px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
        <Logo name={company} size={40} />
        <span style={{ flex: 1, minWidth: 200 }}>
          <span style={{ display: 'block', fontSize: 14, lineHeight: '19px', fontWeight: 500, color: '#1D2226' }}>{[company, role].filter(Boolean).join(' · ') || 'Application'}</span>
          <span style={{ display: 'block', fontSize: 12, lineHeight: '16px', color: '#5F6A74' }}>Paused {ago(task.createdAt)}</span>
        </span>
        <span style={{ height: 26, display: 'inline-flex', alignItems: 'center', padding: '0 10px', borderRadius: 999, background: r.bg, color: r.fg, fontSize: 12, fontWeight: 500 }}>{r.label}</span>
      </div>
      <h2 id={`t-${task._id}`} style={{ margin: '18px 0 0', fontSize: 20, lineHeight: '28px', fontWeight: 500, letterSpacing: '-0.01em', color: '#111418' }}>{title}</h2>
      {task.message && task.message !== title && <Muted style={{ fontSize: 13 }}>{task.message}</Muted>}

      {hasQuestions && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
          {task.questions.map((q: any, i: number) => {
            const id = `q-${task._id}-${q.key}`;
            return (
              <div key={q.key}>
                {i > 0 && <label htmlFor={id} style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>{q.label}</label>}
                {(q.type === 'select' || q.type === 'radio') && q.options?.length ? (
                  <div role="radiogroup" aria-label={q.label} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {q.options.map((o: string) => (
                      <label key={o} className="opt"><input type="radio" name={id} checked={answers[q.key] === o} onChange={() => setAnswers((a) => ({ ...a, [q.key]: o }))} /><span>{o}</span></label>
                    ))}
                  </div>
                ) : q.type === 'textarea' ? (
                  <textarea id={id} className="field" rows={4} value={answers[q.key] ?? ''} onChange={(e) => setAnswers((a) => ({ ...a, [q.key]: e.target.value }))} />
                ) : q.type === 'checkbox' ? (
                  <label className="opt"><input type="checkbox" checked={answers[q.key] === 'true'} onChange={(e) => setAnswers((a) => ({ ...a, [q.key]: String(e.target.checked) }))} /><span>{answers[q.key] === 'true' ? 'Yes' : 'No'}</span></label>
                ) : (
                  <input id={id} className="field" type="text" value={answers[q.key] ?? ''} onChange={(e) => setAnswers((a) => ({ ...a, [q.key]: e.target.value }))} />
                )}
                {q.suggested && answers[q.key] === q.suggested && <Muted>Drafted from your profile. Edit it if it’s not quite right.</Muted>}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginTop: 20, paddingTop: 16, borderTop: '1px solid #EEF2F5' }}>
        {hasQuestions ? (
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#2E3338', cursor: 'pointer' }}>
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} style={{ width: 18, height: 18, accentColor: '#1D4ED8' }} />
            Remember this answer for future applications
          </label>
        ) : <span />}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button type="button" className="ghost" disabled={busy} onClick={() => run(() => tasksApi.dismiss(task._id), 'Skipped. J.A.V.I won’t apply to this one.')} style={{ height: 40, padding: '0 16px', fontSize: 13 }}>Skip this job</button>
          {openUrl && !hasQuestions && <a href={openUrl} target="_blank" rel="noreferrer" className="ghost" style={{ height: 40, padding: '0 16px', fontSize: 13 }}>Open page</a>}
          {task.reason === 'no_form_found' || task.reason === 'confirm_submission' ? (
            <button type="button" className="ghost" disabled={busy} onClick={() => run(() => tasksApi.retry(task._id), 'Trying again')} style={{ height: 40, padding: '0 16px', fontSize: 13 }}>Retry</button>
          ) : null}
          {hasQuestions ? (
            <button type="button" className="cta" disabled={busy || missingRequired}
              onClick={() => run(() => tasksApi.answer(task._id, { answers, remember: Object.fromEntries(Object.keys(answers).map((k) => [k, remember])) }), 'Saved. J.A.V.I has picked this application back up.')}
              style={{ height: 40, padding: '0 18px', fontSize: 13 }}>Save & resume</button>
          ) : (
            <button type="button" className="cta" disabled={busy} onClick={() => run(() => tasksApi.markDone(task._id), 'Done. J.A.V.I will carry on.')} style={{ height: 40, padding: '0 18px', fontSize: 13 }}>
              {task.reason === 'captcha' ? 'I solved it' : task.reason === 'login_wall' ? 'I signed in' : 'Mark as done'}
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

export const NeedsYouScreen: FC = () => {
  const { version, refresh } = useDash();
  const tasks = useAsync(async () => asList<any>(await tasksApi.list(), 'tasks').filter((t) => t.status === 'open'), [version]);
  const profile = useAsync(() => profileApi.get().then((p) => p?.profile || p).catch(() => null), []);
  const [filter, setFilter] = useState(0);

  const all = tasks.data ?? [];
  const shown = FILTERS[filter][1].length ? all.filter((t) => FILTERS[filter][1].includes(t.reason)) : all;
  const bank: any[] = profile.data?.answerBank ?? [];
  const count = (f: string[]) => (f.length ? all.filter((t) => f.includes(t.reason)).length : all.length);

  return (
    <>
      <PageHead title="Needs you" blurb="Applications J.A.V.I couldn’t finish on its own. Answer once and it’s remembered for every future application."
        stats={[{ label: 'Waiting on you', value: pad2(all.length) }, { label: 'Answers remembered', value: pad2(bank.length) }]} />
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 14, marginTop: 30 }}>
        <div style={{ flex: '999 1 560px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div role="tablist" aria-label="Filter queue" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {FILTERS.map(([label, f], i) => (
              <button key={label} type="button" role="tab" className="pillbtn" aria-selected={filter === i} onClick={() => setFilter(i)}>{label} · {count(f)}</button>
            ))}
          </div>
          {tasks.error && <ErrorNote message={tasks.error} onRetry={tasks.reload} />}
          {tasks.loading && !tasks.data ? <Skeleton h={220} style={{ borderRadius: 20 }} /> : shown.length === 0 ? (
            <Card><EmptyNote title={all.length ? 'Nothing in this filter' : 'You’re all caught up'} body="When J.A.V.I hits a question, a CAPTCHA or a login it shouldn’t guess, it pauses here and waits." /></Card>
          ) : shown.map((t) => <TaskCard key={t._id} task={t} onChanged={() => { void tasks.reload(); refresh(); }} />)}
        </div>

        <aside aria-label="Remembered answers" style={{ flex: '0 1 336px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card labelledBy="ra-title">
            <H2 id="ra-title">Remembered answers</H2>
            <Muted>Reused automatically on every form.</Muted>
            {bank.length === 0 ? <EmptyNote title="Nothing saved yet" body="Tick “remember” when you answer and it lands here." /> : (
              <dl style={{ margin: '14px 0 0' }}>
                {bank.slice(0, 6).map((a) => (
                  <div key={a.key} style={{ padding: '11px 0', borderTop: '1px solid #EEF2F5' }}>
                    <dt style={{ fontSize: 12, lineHeight: '16px', color: '#5F6A74' }}>{a.question}</dt>
                    <dd style={{ margin: 0, fontSize: 14, lineHeight: '19px', fontWeight: 500, color: '#1D2226', overflowWrap: 'anywhere' }}>{a.answer}</dd>
                  </div>
                ))}
              </dl>
            )}
            {bank.length > 6 && <Link to="/dash/profile" style={{ display: 'block', marginTop: 6, paddingTop: 12, borderTop: '1px solid #EEF2F5', fontSize: 13, fontWeight: 500, color: '#1D4ED8', textDecoration: 'none' }}>{bank.length - 6} more in CV & profile →</Link>}
          </Card>
          <Card labelledBy="wp-title">
            <H2 id="wp-title" size={16}>Why applications pause</H2>
            <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13, lineHeight: '18px', color: '#3E4851' }}>
              {[['#2563EB', 'A form asks something your profile doesn’t cover'], ['#F59E0B', 'A CAPTCHA or human check blocks submit'], ['#14B8A6', 'The portal needs an account or a login']].map(([c, t]) => (
                <li key={t} style={{ display: 'flex', gap: 10 }}><span aria-hidden="true" style={{ marginTop: 5, width: 8, height: 8, flex: 'none', borderRadius: '50%', background: c }} />{t}</li>
              ))}
            </ul>
            <Muted style={{ marginTop: 14 }}>Nothing is submitted until it’s complete.</Muted>
          </Card>
        </aside>
      </div>
    </>
  );
};
