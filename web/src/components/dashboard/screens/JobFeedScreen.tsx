import { useEffect, useMemo, useRef, useState, type DragEvent, type FC, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { applicationsApi, jobsApi, profileApi } from '@/api';
import { useDash } from '../context';
import { Card, EmptyNote, ErrorNote, H2, Icon, ICONS, Logo, Muted, PageHead, Skeleton, asList, matchTone, money, toPct, useAsync } from '../ui';
import { statusLine } from './status';

const SOURCE_LABEL: Record<string, string> = { manual: 'Pasted link', link: 'Pasted link', import: 'File import', file: 'File import', greenhouse: 'Watched page', lever: 'Watched page', ashby: 'Watched page', workable: 'Watched page', workday: 'Watched page', remoteok: 'Job board', adzuna: 'Job board', rss: 'Job board' };
const sourceLabel = (s?: string) => SOURCE_LABEL[String(s || '').toLowerCase()] || 'Job board';
const TABS = ['All', 'New', 'Strong match', 'Below your bar'] as const;
type Tab = (typeof TABS)[number];
const SORTS = ['Best match', 'Newest', 'Highest salary'] as const;

interface Result { url: string; status: string; title?: string; company?: string; error?: string }

export const JobFeedScreen: FC = () => {
  const { version, notify, refresh } = useDash();
  const [params, setParams] = useSearchParams();
  const apps = useAsync(async () => asList<any>(await applicationsApi.list({ limit: 100 }), 'applications'), [version]);
  const profile = useAsync(() => profileApi.get().then((p) => p?.profile || p).catch(() => null), [version]);
  const [tab, setTab] = useState<Tab>('All');
  const [sort, setSort] = useState<(typeof SORTS)[number]>('Best match');
  const [links, setLinks] = useState('');
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [dragging, setDragging] = useState(false);
  const [career, setCareer] = useState('');
  const [careerBusy, setCareerBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (params.get('add')) {
      input.current?.focus();
      params.delete('add');
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const bar = Math.round((profile.data?.rules?.autoApproveMinScore ?? 0.75) * 100);
  const list = apps.data ?? [];
  const midnight = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }, []);
  const filtered = useMemo(() => {
    const f = list.filter((a) => {
      const pct = toPct(a.score);
      if (tab === 'New') return new Date(a.createdAt).getTime() >= midnight;
      if (tab === 'Strong match') return pct >= 85;
      if (tab === 'Below your bar') return pct < bar;
      return true;
    });
    const sal = (a: any) => a.jobId?.salary?.max || a.jobId?.salary?.min || 0;
    return [...f].sort((a, b) => sort === 'Newest' ? +new Date(b.createdAt) - +new Date(a.createdAt) : sort === 'Highest salary' ? sal(b) - sal(a) : toPct(b.score) - toPct(a.score));
  }, [list, tab, sort, bar, midnight]);
  const counts: Record<Tab, number> = { All: list.length, New: list.filter((a) => new Date(a.createdAt).getTime() >= midnight).length, 'Strong match': list.filter((a) => toPct(a.score) >= 85).length, 'Below your bar': list.filter((a) => toPct(a.score) < bar).length };
  const avg = list.length ? Math.round(list.reduce((s, a) => s + toPct(a.score), 0) / list.length) : 0;
  const bySource = useMemo(() => {
    const m = new Map<string, number>();
    list.forEach((a) => m.set(sourceLabel(a.jobId?.source), (m.get(sourceLabel(a.jobId?.source)) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [list]);

  const addLinks = async (e?: FormEvent) => {
    e?.preventDefault();
    const urls = links.split(/[\s,]+/).filter((u) => /^https?:\/\//i.test(u));
    if (!urls.length) return notify('Paste one or more job links starting with http');
    setBusy(true);
    try {
      const r = await jobsApi.addLinks(urls);
      setResults(r.results);
      setLinks('');
      notify(`${r.queued} job${r.queued === 1 ? '' : 's'} queued`);
      refresh();
    } catch (err: any) { notify(err?.message || 'Could not add those links'); } finally { setBusy(false); }
  };

  const importFile = async (file: File) => {
    setBusy(true);
    try {
      const r = await jobsApi.importJobs({ file });
      setResults(r?.results ?? []);
      notify(`${file.name}: ${r?.queued ?? r?.count ?? 0} roles found`);
      refresh();
    } catch (err: any) { notify(err?.message || 'Could not read that file'); } finally { setBusy(false); setDragging(false); }
  };
  const onDrop = (e: DragEvent) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) void importFile(f); else setDragging(false); };

  const watch = async (e: FormEvent) => {
    e.preventDefault();
    if (!career.trim()) return;
    setCareerBusy(true);
    try { await profileApi.addCareerPage(career.trim()); setCareer(''); notify('Watching that page for new roles'); await profile.reload(); }
    catch (err: any) { notify(err?.message || 'Could not watch that page'); } finally { setCareerBusy(false); }
  };
  const unwatch = async (url: string) => { try { await profileApi.removeCareerPage(url); await profile.reload(); } catch (err: any) { notify(err?.message || 'Could not remove it'); } };
  const archive = async (id: string) => { try { await applicationsApi.archive(id); notify('Removed from your feed'); refresh(); } catch (err: any) { notify(err?.message || 'Could not remove it'); } };

  const pages: any[] = profile.data?.careerPages ?? [];

  return (
    <>
      <PageHead title="Job feed" blurb="Every role J.A.V.I is considering: links you paste, files you upload and career pages it watches. Anything above your bar gets a tailored draft."
        stats={[{ label: 'In your feed', value: list.length }, { label: 'New today', value: counts.New }, { label: 'Average match', value: `${avg}%` }]} />
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 14, marginTop: 30 }}>
        <div style={{ flex: '999 1 560px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <section aria-label="Add jobs" className="card" style={{ padding: 18 }} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}>
            <form onSubmit={addLinks} style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <label style={{ flex: '1 1 360px', minWidth: 0, height: 48, display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', borderRadius: 999, border: '1px solid #DCE3E8', color: '#5F6A74' }}>
                <Icon d={ICONS.link} size={18} /><span className="sr">Job links</span>
                <input ref={input} value={links} onChange={(e) => setLinks(e.target.value)} placeholder="Paste one or more job links: Greenhouse, Lever, Workday or any careers page" style={{ flex: 1, minWidth: 0, border: 0, outline: 'none', background: 'transparent', font: 'inherit', fontSize: 14, color: '#141414', padding: 0 }} />
              </label>
              <button type="submit" className="cta" disabled={busy} style={{ height: 48, padding: '0 22px', fontSize: 14 }}>{busy ? 'Adding…' : 'Add jobs'}</button>
              <button type="button" className="ghost" disabled={busy} onClick={() => fileInput.current?.click()} style={{ height: 48, padding: '0 18px', fontSize: 14, fontWeight: 500 }}><Icon d={ICONS.upload} size={17} />Import a file</button>
              <input ref={fileInput} type="file" hidden accept=".csv,.xlsx,.xls,.pdf,.doc,.docx,.txt,image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importFile(f); e.target.value = ''; }} />
            </form>
            <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 14, border: `1px dashed ${dragging ? '#2563EB' : '#CBD5DF'}`, background: dragging ? '#EFF6FF' : '#F8FAFC', fontSize: 13, lineHeight: '18px', color: '#4E5862' }}>
              Or drop a file anywhere here. CSV, XLSX, PDF, Word docs and screenshots all work.
            </div>
            {results.length > 0 && (
              <ul aria-label="Results" style={{ listStyle: 'none', margin: '12px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5 }}>
                {results.slice(0, 8).map((r) => (
                  <li key={r.url} style={{ display: 'flex', gap: 8, color: r.status === 'failed' ? '#B42318' : r.status === 'queued' ? '#0F766E' : '#4E5862' }}>
                    <span aria-hidden="true">{r.status === 'failed' ? '✕' : r.status === 'queued' ? '✓' : '•'}</span>
                    <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{r.title ? `${r.title}${r.company ? ` · ${r.company}` : ''}` : r.url} — {r.status === 'already_added' ? 'already in your feed' : r.error || r.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div role="tablist" aria-label="Filter jobs" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {TABS.map((t) => <button key={t} type="button" role="tab" className="pillbtn" aria-selected={tab === t} onClick={() => setTab(t)}>{t} · {counts[t]}</button>)}
            </div>
            <label style={{ height: 40, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 14px', borderRadius: 999, background: '#fff', fontSize: 13, color: '#4E5862' }}>Sort
              <select value={sort} onChange={(e) => setSort(e.target.value as any)} style={{ border: 0, outline: 'none', background: 'transparent', font: 'inherit', fontSize: 13, fontWeight: 500, color: '#1D2226' }}>{SORTS.map((s) => <option key={s}>{s}</option>)}</select>
            </label>
          </div>

          {apps.error && <ErrorNote message={apps.error} onRetry={apps.reload} />}
          {apps.loading && !apps.data ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>{[0, 1, 2].map((i) => <Skeleton key={i} h={206} style={{ borderRadius: 16 }} />)}</div>
          ) : filtered.length === 0 ? (
            <Card><EmptyNote title={list.length ? 'No roles in this view' : 'Your feed is empty'} body={list.length ? undefined : 'Paste a job link above or drop a file. J.A.V.I will match each role against your profile.'} /></Card>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
              {filtered.map((a) => {
                const j = a.jobId || {};
                const pct = toPct(a.score);
                const tone = matchTone(pct);
                const st = statusLine(a);
                const below = pct < bar && ['discovered', 'matched'].includes(a.status);
                const chips = [j.applyMethod?.type === 'email' ? 'Email apply' : j.applyMethod?.type === 'form' ? 'Form apply' : '', j.remote ? 'Remote' : '', sourceLabel(j.source)].filter(Boolean);
                const pay = money(j.salary);
                return (
                  <article key={a._id} className="card" style={{ minHeight: 206, display: 'flex', flexDirection: 'column', padding: 20, borderRadius: 16, background: below ? 'rgba(255,255,255,.65)' : '#fff' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <h3 style={{ margin: 0, fontSize: 20, lineHeight: '26px', fontWeight: 500, letterSpacing: '-0.01em', color: below ? '#3E4851' : '#111418' }}>{j.title || 'Untitled role'}</h3>
                        <p style={{ margin: '2px 0 0', fontSize: 13, lineHeight: '18px', color: '#56606A' }}>{[j.company, j.location].filter(Boolean).join(' · ')}</p>
                      </div>
                      <span title="Match score" style={{ flex: 'none', height: 30, display: 'inline-flex', alignItems: 'center', padding: '0 10px', borderRadius: 999, background: tone.bg, color: tone.fg, fontSize: 13, fontWeight: 600 }}>{pct}%</span>
                    </div>
                    {chips.length > 0 && <ul aria-label="Job details" style={{ listStyle: 'none', margin: '12px 0 0', padding: 0, display: 'flex', flexWrap: 'wrap', gap: 6 }}>{chips.map((c) => <li key={c} className="chip">{c}</li>)}</ul>}
                    {pay && <p style={{ margin: '14px 0 0', fontSize: 15, lineHeight: '20px', fontWeight: 600, color: '#111418' }}>{pay}</p>}
                    <div style={{ margin: 'auto 0 0', paddingTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderTop: '1px solid #EEF2F5', fontSize: 12 }}>
                      {st.to ? <Link to={st.to} style={{ display: 'flex', alignItems: 'center', gap: 8, color: st.color, textDecoration: 'none' }}><span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: st.dot }} />{st.text}</Link>
                        : <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: st.color }}><span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: st.dot }} />{below ? `Below your ${bar}% bar` : st.text}</span>}
                      {['discovered', 'matched', 'drafted'].includes(a.status) && <button type="button" onClick={() => archive(a._id)} style={{ border: 0, background: 'transparent', padding: 0, fontSize: 12, fontWeight: 500, color: '#5F6A74' }}>Remove</button>}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <aside aria-label="Sources" style={{ flex: '0 1 336px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card labelledBy="wc-title">
            <H2 id="wc-title">Watched career pages</H2>
            <Muted>New roles from these pages land in your feed.</Muted>
            {pages.length === 0 ? <EmptyNote title="No pages watched" body="Paste a company careers URL below." /> : (
              <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0 }}>
                {pages.map((p) => {
                  let host = p.url; try { host = new URL(p.url).hostname.replace(/^(www|boards|jobs)\./, ''); } catch { /* keep raw */ }
                  return (
                    <li key={p.url} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px solid #EEF2F5' }}>
                      <Logo name={host} size={34} round={false} />
                      <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: 'block', fontSize: 13, lineHeight: '18px', fontWeight: 500, color: '#1D2226', overflow: 'hidden', textOverflow: 'ellipsis' }}>{host}</span><span style={{ display: 'block', fontSize: 12, lineHeight: '16px', color: '#5F6A74', textTransform: 'capitalize' }}>{p.ats === 'unsupported' ? 'Careers page' : p.ats}</span></span>
                      <button type="button" aria-label={`Stop watching ${host}`} onClick={() => unwatch(p.url)} style={{ border: 0, background: 'transparent', color: '#5F6A74', fontSize: 12 }}>Remove</button>
                    </li>
                  );
                })}
              </ul>
            )}
            <form onSubmit={watch} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <label style={{ flex: 1, minWidth: 0, height: 40, display: 'flex', alignItems: 'center', padding: '0 14px', borderRadius: 999, background: '#F3F6F9' }}><span className="sr">Company careers page</span>
                <input value={career} onChange={(e) => setCareer(e.target.value)} placeholder="Paste a careers page URL" style={{ flex: 1, minWidth: 0, border: 0, outline: 'none', background: 'transparent', font: 'inherit', fontSize: 13, padding: 0 }} /></label>
              <button type="submit" className="tint" disabled={careerBusy} style={{ height: 40, padding: '0 14px', fontSize: 13 }}>Watch</button>
            </form>
          </Card>
          <Card labelledBy="src-title">
            <H2 id="src-title">Where your jobs came from</H2>
            {bySource.length === 0 ? <Muted>Nothing yet.</Muted> : (
              <dl style={{ margin: '14px 0 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {bySource.map(([label, n]) => (
                  <div key={label}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, lineHeight: '18px' }}><dt style={{ color: '#3E4851' }}>{label}</dt><dd style={{ margin: 0, fontWeight: 600, color: '#1D2226' }}>{n}</dd></div>
                    <div aria-hidden="true" style={{ marginTop: 6, height: 6, borderRadius: 999, background: '#EEF2F5' }}><div style={{ width: `${Math.round((n / bySource[0][1]) * 100)}%`, height: 6, borderRadius: 999, background: '#2563EB' }} /></div></div>
                ))}
              </dl>
            )}
          </Card>
        </aside>
      </div>
    </>
  );
};
