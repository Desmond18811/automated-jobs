import { useEffect, useRef, useState, type FC, type ChangeEvent } from 'react';
import { BriefcaseIcon, CheckIcon, ExternalLinkIcon, FileTextIcon, RefreshCwIcon, SparklesIcon, XIcon } from '@/assets/icons';
import { jobsApi, applicationsApi } from '@/api';

interface JobItem {
  id: string;
  initial: string;
  color: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  source: string;
  status: string;
  /** The user's real match score (0-100), or null when this job hasn't been scored for them. */
  matchScore: number | null;
  sourceLink?: { label: string; href: string };
  url?: string;
  description?: string;
  tags?: string[];
  whyMatched: { good: boolean; text: string }[];
}

const PALETTE = ['#2563eb', '#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

function colorFor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const index = Math.abs(hash) % PALETTE.length;
  return PALETTE[index];
}

export const JobFeedView: FC = () => {
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobItem | null>(null);
  const [newUrl, setNewUrl] = useState('');
  const [rawText, setRawText] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingJobs, setFetchingJobs] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importTab, setImportTab] = useState<'file' | 'url' | 'text'>('file');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const loadJobs = async () => {
    setFetchingJobs(true);
    try {
      const res = await jobsApi.list({ limit: 50 });
      const rawList = res?.jobs || (Array.isArray(res) ? res : []);
      const mapped: JobItem[] = rawList.map((j: any, idx: number) => {
        const company = j.company || 'Company';
        const title = j.title || 'Job Opening';
        // Real salary currency; never assume dollars.
        const cur = j.salary?.currency ? `${j.salary.currency} ` : '';
        const fmt = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));
        const salaryStr = j.salary?.min ? `${cur}${fmt(j.salary.min)}${j.salary.max ? `–${fmt(j.salary.max)}` : '+'}` : 'Not stated';

        // Only what the matcher actually computed for this user; nothing invented.
        const m = j.match;
        const b = m?.breakdown ?? {};
        const why: { good: boolean; text: string }[] = [];
        if (m) {
          if (typeof b.title === 'number') why.push({ good: b.title >= 0.5, text: `Title fit ${Math.round(b.title * 100)}% against your target roles` });
          if (typeof b.skillHits === 'number') why.push({ good: b.skillHits > 0, text: `${b.skillHits} of your skills appear in the posting` });
          if (typeof b.text === 'number') why.push({ good: b.text >= 0.3, text: `Description similarity ${Math.round(b.text * 100)}%` });
          for (const note of m.filterNotes ?? []) why.push({ good: false, text: note });
        }
        const src = String(j.source || '').replace(/^import:/, '');
        return {
          id: j._id || j.id || String(idx),
          initial: company.charAt(0).toUpperCase(),
          color: colorFor(company),
          title,
          company,
          location: j.location || (j.remote ? 'Remote' : 'Location not stated'),
          salary: salaryStr,
          source: src ? `via ${src === 'remoteok' ? 'Remote OK' : src}` : '',
          // Remote OK asks for credit and a link back to their listing.
          sourceLink: src === 'remoteok' && j.url ? { label: 'Listed on Remote OK', href: j.url } : undefined,
          status: m ? (m.status === 'matched' ? 'Matched' : m.status) : 'Not scored yet',
          matchScore: m && typeof m.score === 'number' ? Math.round(m.score * 100) : null,
          url: j.applyUrl || j.url,
          description: j.description,
          tags: j.tags || [],
          whyMatched: why,
        };
      });

      setJobs(mapped);
      if (mapped.length > 0) {
        setSelectedJob((prev) => (prev ? mapped.find((m) => m.id === prev.id) || mapped[0] : mapped[0]));
      } else {
        setSelectedJob(null);
      }
    } catch (e: any) {
      console.warn('Could not load jobs from API:', e);
      setJobs([]);
      setSelectedJob(null);
    } finally {
      setFetchingJobs(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  /** One link or many: paste anything containing http(s) links (one per line, commas, a copied column). */
  const handleAddUrl = async () => {
    const urls = Array.from(new Set(newUrl.match(/https?:\/\/[^\s"'<>,;]+/gi) ?? []));
    if (!urls.length) {
      showToast('Paste at least one http(s) link');
      return;
    }
    setLoading(true);
    try {
      const res = await jobsApi.addLinks(urls);
      const failed = res.results.filter((r) => r.status === 'failed');
      showToast(
        failed.length
          ? `${res.queued} of ${res.count} links queued. Couldn't read: ${failed.map((f) => f.url).slice(0, 2).join(', ')}${failed.length > 2 ? '…' : ''}`
          : `${res.queued} link${res.queued === 1 ? '' : 's'} queued: JAVI will tailor your CV and apply in the JAVI browser.`,
      );
      setNewUrl('');
      setShowImportModal(false);
      await loadJobs();
    } catch (e: any) {
      showToast(e?.message || 'Could not add those links');
    } finally {
      setLoading(false);
    }
  };

  const handleFileImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const res = await jobsApi.importJobs({ file });
      const failedLinks = (res?.linkResults ?? []).filter((r: any) => r.status === 'failed').length;
      showToast(`Imported ${res?.importedCount ?? 0} job(s) from ${file.name}${failedLinks ? ` (${failedLinks} links couldn't be read)` : ''}.`);
      setShowImportModal(false);
      await loadJobs();
    } catch (e: any) {
      showToast(e?.message || `Could not import ${file.name}`);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleApply = async (job: JobItem) => {
    showToast(`Drafting tailored CV & pitch for ${job.company}...`);
    try {
      await applicationsApi.list();
    } catch {
      // ignore
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 40 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700, letterSpacing: '-.5px' }}>Job feed</h2>
          <p style={{ margin: 0, fontSize: 12, color: '#6a6a72' }}>
            {jobs.length > 0
              ? `${jobs.length} roles found and matched against your profile in real time.`
              : 'Add job links, upload a spreadsheet, or watch career pages to see matched roles.'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {toast && (
            <div
              style={{
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                color: '#065f46',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: 11.5,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <CheckIcon size={14} color="#059669" />
              <span>{toast}</span>
            </div>
          )}

          <button
            type="button"
            onClick={loadJobs}
            disabled={fetchingJobs}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#f3f4f6',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 11.5,
              fontWeight: 600,
              color: '#374151',
              cursor: fetchingJobs ? 'wait' : 'pointer',
            }}
          >
            <RefreshCwIcon size={12} color="#374151" />
            {fetchingJobs ? 'Refreshing...' : 'Refresh'}
          </button>

          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#2563eb',
              border: 0,
              color: '#fff',
              borderRadius: 8,
              padding: '7px 14px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,.08)',
            }}
          >
            <FileTextIcon size={13} color="#fff" />
            Add / Import Jobs
          </button>
        </div>
      </div>

      {/* Input bar supporting URLs & quick file open */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="text"
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAddUrl();
          }}
          placeholder="Paste one or more job links (Greenhouse, Lever, Workday, any career page…)"
          style={{
            flex: 1,
            height: 40,
            border: '1px solid #e5e7eb',
            borderRadius: 10,
            padding: '0 14px',
            fontSize: 12.5,
            outline: 'none',
            background: '#fff',
            fontFamily: 'Montserrat, sans-serif',
          }}
        />
        <button
          type="button"
          onClick={handleAddUrl}
          disabled={loading || !newUrl.trim()}
          style={{
            height: 40,
            padding: '0 18px',
            background: '#0b0b0c',
            border: 0,
            color: '#fff',
            borderRadius: 10,
            fontSize: 12.5,
            fontWeight: 600,
            cursor: loading ? 'wait' : 'pointer',
            opacity: loading || !newUrl.trim() ? 0.7 : 1,
          }}
        >
          {loading ? 'Adding...' : 'Add job'}
        </button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileImport}
          accept=".pdf,.csv,.xlsx,.xls,.xlsv,.txt"
          style={{ display: 'none' }}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          style={{
            height: 40,
            padding: '0 14px',
            background: '#fff',
            border: '1px solid #d1d5db',
            color: '#374151',
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 600,
            cursor: loading ? 'wait' : 'pointer',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <FileTextIcon size={14} color="#2563eb" />
          Import CSV / XLSX / PDF
        </button>
      </div>

      {/* Main Content */}
      {fetchingJobs ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
          Loading jobs from database...
        </div>
      ) : jobs.length === 0 ? (
        <div
          onClick={() => setShowImportModal(true)}
          style={{
            background: '#fff',
            borderRadius: 14,
            border: '1px dashed #d1d5db',
            padding: '54px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            cursor: 'pointer',
            transition: 'border-color 0.15s ease',
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <BriefcaseIcon size={24} color="#2563eb" />
          </div>
          <div>
            <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#111827' }}>
              No jobs in your feed yet
            </h3>
            <p style={{ margin: 0, fontSize: 12.5, color: '#6a6a72', maxWidth: 440 }}>
              Click here to import job postings from spreadsheets (CSV, XLSX, XLS), paste links from job boards, or add companies to watch.
            </p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowImportModal(true);
            }}
            style={{
              marginTop: 4,
              padding: '8px 18px',
              borderRadius: 8,
              background: '#2563eb',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              border: 0,
              cursor: 'pointer',
            }}
          >
            Open Job Importer
          </button>
        </div>
      ) : (
        /* Split view */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14, alignItems: 'start' }}>
          {/* Left List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {jobs.map((j) => {
              const isSelected = selectedJob?.id === j.id;
              return (
                <div
                  key={j.id}
                  onClick={() => setSelectedJob(j)}
                  style={{
                    background: '#fff',
                    borderRadius: 12,
                    padding: '13px 16px',
                    border: '1px solid',
                    borderColor: isSelected ? '#2563eb' : '#f0f0f3',
                    boxShadow: isSelected ? '0 0 0 1px #2563eb, 0 2px 8px rgba(37,99,235,.08)' : '0 1px 3px rgba(0,0,0,.02)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: j.color,
                        color: '#fff',
                        fontSize: 15,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flex: 'none',
                      }}
                    >
                      {j.initial}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: '#111' }}>{j.title}</span>
                      <span style={{ fontSize: 11, color: '#6a6a72' }}>
                        {j.company} · {j.location} · <strong style={{ color: '#111' }}>{j.salary}</strong>
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {j.matchScore !== null && (
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 10.5,
                        fontWeight: 700,
                        color: '#0f766e',
                        background: '#f0fdfa',
                        border: '1px solid #ccfbf1',
                        borderRadius: 6,
                        padding: '2px 7px',
                      }}
                    >
                      <SparklesIcon size={11} color="#0f766e" />
                      {j.matchScore}%
                    </span>
                    )}
                    <span
                      style={{
                        fontSize: 9.5,
                        color: '#6b7280',
                        background: '#f3f4f6',
                        borderRadius: 6,
                        padding: '3px 8px',
                        fontWeight: 500,
                      }}
                    >
                      {j.source}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Detail Pane */}
          {selectedJob && (
            <div
              style={{
                background: '#fff',
                border: '1px solid #eef0f4',
                borderRadius: 14,
                padding: 18,
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                boxShadow: '0 1px 3px rgba(0,0,0,.02)',
                position: 'sticky',
                top: 16,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>{selectedJob.title}</span>
                  <span style={{ fontSize: 12, color: '#6a6a72' }}>
                    {selectedJob.company} · {selectedJob.location}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#2563eb', marginTop: 2 }}>
                    {selectedJob.salary}
                  </span>
                </div>
                {selectedJob.matchScore !== null && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#0f766e',
                    background: '#f0fdfa',
                    border: '1px solid #ccfbf1',
                    borderRadius: 8,
                    padding: '4px 8px',
                  }}
                >
                  {selectedJob.matchScore}% match
                </span>
                )}
              </div>

              {/* Match Factors */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>
                  {selectedJob.whyMatched.length ? 'Why you matched' : 'Not scored for you yet'}
                </span>
                {selectedJob.sourceLink && (
                  <a href={selectedJob.sourceLink.href} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#2563eb' }}>
                    {selectedJob.sourceLink.label}
                  </a>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {selectedJob.whyMatched.map((w, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: '#374151' }}>
                      {w.good ? <CheckIcon size={13} color="#059669" /> : <span style={{ width: 13, textAlign: 'center', color: '#b45309' }}>!</span>}
                      <span>{w.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedJob.description && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>
                    Overview
                  </span>
                  <p style={{ margin: 0, fontSize: 11.5, color: '#4b5563', lineHeight: 1.5, maxHeight: 120, overflowY: 'auto' }}>
                    {selectedJob.description}
                  </p>
                </div>
              )}

              {selectedJob.url && (
                <a
                  href={selectedJob.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 11.5,
                    color: '#2563eb',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  View official job posting <ExternalLinkIcon size={12} color="#2563eb" />
                </a>
              )}

              <button
                type="button"
                onClick={() => handleApply(selectedJob)}
                style={{
                  height: 38,
                  background: '#2563eb',
                  border: 0,
                  color: '#fff',
                  borderRadius: 8,
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <SparklesIcon size={13} color="#fff" />
                Tailor CV &amp; Apply
              </button>
            </div>
          )}
        </div>
      )}

      {/* Pop-up Importer Modal */}
      {showImportModal && (
        <div
          onClick={() => setShowImportModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.45)',
            backdropFilter: 'blur(3px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 16,
              width: '100%',
              maxWidth: 540,
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              boxShadow: '0 20px 40px rgba(0,0,0,.15)',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#111827' }}>
                  Add Job or Import Roles
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>
                  Upload spreadsheets (CSV, Excel), paste links, or import career boards for J.A.V.I to analyze.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                style={{
                  background: 'transparent',
                  border: 0,
                  color: '#9ca3af',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <XIcon size={16} color="#6b7280" />
              </button>
            </div>

            {/* Tab switch */}
            <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid #f3f4f6', paddingBottom: 8 }}>
              <button
                type="button"
                onClick={() => setImportTab('file')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  border: 0,
                  fontSize: 12,
                  fontWeight: 600,
                  background: importTab === 'file' ? '#eff6ff' : 'transparent',
                  color: importTab === 'file' ? '#2563eb' : '#6b7280',
                  cursor: 'pointer',
                }}
              >
                Spreadsheet / File Upload
              </button>
              <button
                type="button"
                onClick={() => setImportTab('url')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  border: 0,
                  fontSize: 12,
                  fontWeight: 600,
                  background: importTab === 'url' ? '#eff6ff' : 'transparent',
                  color: importTab === 'url' ? '#2563eb' : '#6b7280',
                  cursor: 'pointer',
                }}
              >
                Paste Job Link
              </button>
            </div>

            {/* Tab 1: File Upload */}
            {importTab === 'file' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed #cbd5e1',
                    borderRadius: 12,
                    padding: '36px 20px',
                    textAlign: 'center',
                    background: '#f8fafc',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      background: '#eff6ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <FileTextIcon size={22} color="#2563eb" />
                  </div>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                      Click to choose files or drop spreadsheets here
                    </span>
                    <p style={{ margin: '4px 0 0', fontSize: 11.5, color: '#64748b' }}>
                      Supports <strong>.xlsx, .xls, .xlsv, .csv, .pdf, .txt</strong>
                    </p>
                  </div>
                  <button
                    type="button"
                    style={{
                      marginTop: 6,
                      background: '#2563eb',
                      color: '#fff',
                      border: 0,
                      borderRadius: 8,
                      padding: '8px 16px',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Select File from Device
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2: URL */}
            {importTab === 'url' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: '#374151' }}>
                    Job links (one or many)
                  </label>
                  <textarea
                    rows={6}
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder={'One link per line, up to 200\nhttps://boards.greenhouse.io/company/jobs/12345\nhttps://jobs.lever.co/company/abc'}
                    style={{
                      resize: 'vertical',
                      lineHeight: '20px',
                      paddingTop: 10,
                      border: '1px solid #d1d5db',
                      borderRadius: 8,
                      padding: '0 12px',
                      fontSize: 12.5,
                      fontFamily: 'Montserrat, sans-serif',
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddUrl}
                  disabled={loading || !newUrl.trim()}
                  style={{
                    height: 40,
                    background: '#2563eb',
                    color: '#fff',
                    border: 0,
                    borderRadius: 8,
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: loading ? 'wait' : 'pointer',
                  }}
                >
                  {loading ? 'Reading links…' : 'Tailor & apply'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
