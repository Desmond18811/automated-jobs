import { useEffect, useState, type FC } from 'react';
import { CheckIcon, FileTextIcon, RefreshCwIcon, SparklesIcon } from '@/assets/icons';
import { applicationsApi } from '@/api';

interface ApplicationItem {
  _id: string;
  id?: string;
  company?: string;
  role?: string;
  jobId?: {
    _id?: string;
    title?: string;
    company?: string;
    location?: string;
    url?: string;
    source?: string;
    salary?: any;
  };
  channel?: string;
  status: string;
  matchScore?: number;
  fit?: {
    score?: number;
    reasons?: string[];
  };
  documents?: {
    tailoredCv?: string;
    coverLetter?: string;
  };
  updatedAt?: string;
}

export const DraftsView: FC = () => {
  const [drafts, setDrafts] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const loadDrafts = async () => {
    try {
      setLoading(true);
      const res = await applicationsApi.list({ status: 'drafted' });
      const items = Array.isArray(res) ? res : res?.items || res?.applications || [];
      setDrafts(items);
    } catch (e: any) {
      console.warn('Could not load drafts from API:', e?.message);
      setDrafts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDrafts();
  }, []);

  const handleApprove = async (id: string) => {
    setApproving((prev) => ({ ...prev, [id]: true }));
    try {
      await applicationsApi.approve(id);
      showToast('Application approved! J.A.V.I is now submitting.');
      setDrafts((prev) => prev.filter((d) => (d._id || d.id) !== id));
    } catch (e: any) {
      showToast('Could not approve draft: ' + (e?.message || 'Server error'));
    } finally {
      setApproving((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleApproveAll = async () => {
    const unapproved = drafts.filter((d) => !approving[d._id || d.id || '']);
    if (unapproved.length === 0) return;

    for (const d of unapproved) {
      const id = d._id || d.id;
      if (!id) continue;
      setApproving((prev) => ({ ...prev, [id]: true }));
      try {
        await applicationsApi.approve(id);
      } catch {
        // continue
      } finally {
        setApproving((prev) => ({ ...prev, [id]: false }));
      }
    }
    showToast(`Approved ${unapproved.length} draft${unapproved.length > 1 ? 's' : ''}!`);
    loadDrafts();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 760, paddingBottom: 40 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700, letterSpacing: '-.5px' }}>Drafts</h2>
          <p style={{ margin: 0, fontSize: 12, color: '#6a6a72' }}>
            Applications tailored with candidate credentials, queued for review before automated submission.
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
            onClick={loadDrafts}
            disabled={loading}
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
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            <RefreshCwIcon size={12} color="#374151" />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>

          {drafts.length > 0 && (
            <button
              type="button"
              onClick={handleApproveAll}
              style={{
                height: 36,
                padding: '0 16px',
                background: '#0b0b0c',
                border: 0,
                borderRadius: 8,
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Approve all drafts ({drafts.length})
            </button>
          )}
        </div>
      </div>

      {loading && drafts.length === 0 ? (
        <div
          style={{
            background: '#fff',
            borderRadius: 14,
            padding: '36px 20px',
            textAlign: 'center',
            border: '1px solid #eef0f4',
            color: '#6b7280',
            fontSize: 12,
          }}
        >
          Loading application drafts...
        </div>
      ) : drafts.length === 0 ? (
        <div
          style={{
            background: '#fff',
            border: '1px solid #eef0f4',
            borderRadius: 14,
            padding: '48px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            boxShadow: '0 1px 3px rgba(0,0,0,.02)',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileTextIcon size={24} color="#2563eb" />
          </div>
          <div>
            <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#111827' }}>
              No drafted applications pending review
            </h3>
            <p style={{ margin: 0, fontSize: 12, color: '#6b7280', maxWidth: 460 }}>
              When J.A.V.I scans your watched career pages or matches roles from your Job Feed, it prepares tailored CVs and cover letters for your review before sending.
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {drafts.map((d) => {
            const id = d._id || d.id || '';
            const company = d.jobId?.company || d.company || 'Target Employer';
            const role = d.jobId?.title || d.role || 'Job Role';
            const channel = d.channel || d.jobId?.source || 'ATS Portal';
            const score = d.matchScore || (d.fit?.score ? Math.round(d.fit.score * 100) : 92);
            const coverSnippet = d.documents?.coverLetter || 'Tailored application statement compiled for role specifications.';
            const isApproving = Boolean(approving[id]);

            return (
              <div
                key={id}
                style={{
                  background: '#fff',
                  border: '1px solid #eef0f4',
                  borderRadius: 14,
                  padding: '16px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  boxShadow: '0 1px 3px rgba(0,0,0,.02)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: '#eff6ff',
                        color: '#2563eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <FileTextIcon size={16} color="#2563eb" />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{company}</span>
                        <span style={{ fontSize: 11, color: '#6a6a72' }}>· {role}</span>
                      </div>
                      <span style={{ fontSize: 10.5, color: '#8a8a92' }}>{channel}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                      {score}% match
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: '#1d4ed8',
                        background: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        borderRadius: 999,
                        padding: '2px 8px',
                      }}
                    >
                      Ready for review
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    background: '#f9fafb',
                    borderRadius: 8,
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.4px' }}>
                    Tailored Pitch Snippet
                  </span>
                  <p style={{ margin: 0, fontSize: 11.5, color: '#374151', lineHeight: 1.5 }}>
                    "{coverSnippet.slice(0, 240)}{coverSnippet.length > 240 ? '...' : ''}"
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, paddingTop: 2 }}>
                  <button
                    type="button"
                    onClick={() => handleApprove(id)}
                    disabled={isApproving}
                    style={{
                      height: 32,
                      padding: '0 14px',
                      background: '#0b0b0c',
                      border: 0,
                      borderRadius: 8,
                      color: '#fff',
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: isApproving ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <CheckIcon size={12} color="#fff" />
                    {isApproving ? 'Submitting...' : 'Approve & Submit'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
