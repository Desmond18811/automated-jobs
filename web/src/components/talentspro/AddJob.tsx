import { useRef, useState, type CSSProperties, type DragEvent, type FC, type FormEvent } from 'react';
import { jobsApi } from '@/api';
import { Icon } from './icons';
import { ghostBtn, primaryBtn } from './parts';

const field: CSSProperties = { width: '100%', height: 44, borderRadius: 14, border: '1px solid #DCE3EE', background: '#fff', padding: '0 14px', fontSize: 14, fontFamily: 'inherit', color: '#17191F' };
const ACCEPT = '.csv,.xlsx,.xls,.pdf,.txt,.tsv';
const urlsIn = (t: string) => [...new Set(t.split(/[\s,;]+/).filter((x) => /^https?:\/\//i.test(x)))];

type Done = { lines: string[] } | null;

/** Add jobs from one link, a pile of links, or a spreadsheet / PDF / text file. Only the link or file is required. */
export const AddJob: FC<{ onClose: () => void; onDone: () => void }> = ({ onClose, onDone }) => {
  const [mode, setMode] = useState<'links' | 'file'>('links');
  const [text, setText] = useState('');
  const [f, setF] = useState({ title: '', company: '', location: '', description: '' });
  const [more, setMore] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState<Done>(null);
  const input = useRef<HTMLInputElement>(null);
  const urls = urlsIn(text);
  const single = urls.length === 1;
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const pick = (list?: FileList | null) => {
    const x = list?.[0];
    if (x) {
      setFile(x);
      setErr('');
    }
  };
  const drop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    pick(e.dataTransfer.files);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      if (mode === 'file') {
        if (!file) return;
        const r = await jobsApi.importJobs({ file });
        const n = r?.created ?? r?.count ?? r?.imported ?? r?.jobs?.length;
        setDone({ lines: [`${file.name} was read${typeof n === 'number' ? `: ${n} job${n === 1 ? '' : 's'} found` : ''}. Each one is being matched to your profile.`] });
      } else if (single) {
        const body: Record<string, string> = { url: urls[0] };
        (['title', 'company', 'location', 'description'] as const).forEach((k) => f[k].trim() && (body[k] = f[k].trim()));
        const r = await jobsApi.addManual(body as any);
        setDone({ lines: [`${r?.job?.title || 'Job'}${r?.job?.company ? ` at ${r.job.company}` : ''} is saved and being matched to your profile.`] });
      } else {
        const r = await jobsApi.addLinks(urls);
        setDone({ lines: [`${r.queued} of ${r.count} links queued.`, ...r.results.filter((x) => x.status === 'failed').map((x) => `Could not read ${x.url}${x.error ? `: ${x.error}` : ''}`)] });
      }
    } catch (x: any) {
      if (x?.status === 422 && single) setMore(true);
      setErr(x?.message || 'Could not add this. Check it and try again.');
    } finally {
      setBusy(false);
    }
  };

  const tab = (k: 'links' | 'file', label: string) => (
    <button type="button" onClick={() => { setMode(k); setErr(''); }} aria-pressed={mode === k} style={{ height: 40, padding: '0 20px', borderRadius: 999, fontSize: 13, fontWeight: 500, background: mode === k ? '#17191F' : '#F1F4F8', color: mode === k ? '#fff' : '#17191F', border: 0 }}>{label}</button>
  );
  const ready = mode === 'file' ? !!file : urls.length > 0;

  return (
    <div role="dialog" aria-modal="true" aria-label="Add jobs" onMouseDown={(e) => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, background: 'rgba(23,25,31,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 80 }}>
      <form onSubmit={submit} style={{ width: 'min(680px,100%)', minHeight: 'min(560px,92vh)', maxHeight: '92vh', overflow: 'auto', background: '#fff', borderRadius: 28, padding: 26, display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '0 30px 60px -30px rgba(23,25,31,.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 500 }}>Add jobs</h2>
          <button type="button" aria-label="Close" onClick={onClose} style={{ border: 0, background: '#EDF1F6', width: 36, height: 36, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="close" size={16} /></button>
        </div>

        {done ? (
          <>
            <div style={{ background: '#F2F6FF', borderRadius: 18, padding: 18, fontSize: 14, lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {done.lines.map((l, i) => <div key={i}>{l}</div>)}
            </div>
            <button type="button" className="tp-btn-primary" onClick={onDone} style={{ ...primaryBtn, marginTop: 'auto' }}>Done</button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8 }}>{tab('links', 'Links')}{tab('file', 'Spreadsheet or file')}</div>

            {mode === 'links' ? (
              <>
                <p style={{ margin: 0, fontSize: 13, color: '#606979', lineHeight: 1.5 }}>Paste one link, or as many as you like, separated by spaces or new lines. We read each page for the role, company and description.</p>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: 14, color: '#606979', display: 'flex' }}><Icon name="link" size={18} /></span>
                  <textarea autoFocus aria-label="Job links" value={text} onChange={(e) => setText(e.target.value)} placeholder={'https://company.com/careers/role\nhttps://boards.greenhouse.io/…'} style={{ ...field, height: 150, padding: '12px 14px 12px 42px', resize: 'vertical', lineHeight: 1.5 }} />
                </div>
                <div style={{ fontSize: 12, color: '#98A1AF' }}>{urls.length === 0 ? 'No links yet' : `${urls.length} link${urls.length === 1 ? '' : 's'} found`}</div>
                {single && (
                  <>
                    <button type="button" onClick={() => setMore(!more)} style={{ alignSelf: 'flex-start', border: 0, background: 'none', color: '#2457E8', fontSize: 13, fontWeight: 500, padding: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      {more ? 'Hide details' : 'Add details (optional)'}<Icon name={more ? 'chevronDown' : 'chevron'} size={14} />
                    </button>
                    {more && (
                      <>
                        <input style={field} placeholder="Job title (optional)" value={f.title} onChange={set('title')} />
                        <input style={field} placeholder="Company (optional)" value={f.company} onChange={set('company')} />
                        <input style={field} placeholder="Location (optional)" value={f.location} onChange={set('location')} />
                        <textarea style={{ ...field, height: 96, padding: 12, resize: 'vertical' }} placeholder="Job description (optional)" value={f.description} onChange={set('description')} />
                      </>
                    )}
                  </>
                )}
              </>
            ) : (
              <>
                <p style={{ margin: 0, fontSize: 13, color: '#606979', lineHeight: 1.5 }}>Upload a spreadsheet (.xlsx, .xls, .csv), a PDF or a text file. Use columns like title, company and link in a sheet. Links inside any file are picked up too.</p>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={drop}
                  style={{ flex: 1, minHeight: 180, borderRadius: 22, border: `2px dashed ${drag ? '#2457E8' : '#C7D4EC'}`, background: drag ? '#F2F6FF' : '#F8FAFD', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, textAlign: 'center', padding: 20 }}
                >
                  <input ref={input} type="file" accept={ACCEPT} hidden onChange={(e) => pick(e.target.files)} />
                  <span style={{ width: 52, height: 52, borderRadius: '50%', background: '#EAF1FF', color: '#2457E8', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="doc" size={22} /></span>
                  {file ? <div style={{ fontSize: 14, fontWeight: 500 }}>{file.name} <span style={{ color: '#98A1AF', fontWeight: 400 }}>({Math.max(1, Math.round(file.size / 1024))} KB)</span></div> : <div style={{ fontSize: 14 }}>Drop a file here</div>}
                  <button type="button" className="tp-btn-ghost" onClick={() => input.current?.click()} style={{ ...ghostBtn, height: 40, fontSize: 13 }}>{file ? 'Choose another' : 'Choose file'}</button>
                  <div style={{ fontSize: 11, color: '#98A1AF' }}>Up to 10 MB</div>
                </div>
              </>
            )}

            {err && <div role="alert" style={{ fontSize: 13, color: '#B4232F', lineHeight: 1.45 }}>{err}</div>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 'auto' }}>
              <button type="button" className="tp-btn-ghost" onClick={onClose} style={ghostBtn}>Cancel</button>
              <button type="submit" className="tp-btn-primary" disabled={busy || !ready} style={{ ...primaryBtn, color: '#fff', opacity: busy || !ready ? 0.6 : 1 }}>{busy ? 'Working…' : mode === 'file' ? 'Import file' : urls.length > 1 ? `Add ${urls.length} jobs` : 'Add job'}</button>
            </div>
          </>
        )}
      </form>
    </div>
  );
};
