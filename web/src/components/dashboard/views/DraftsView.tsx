import { useState, type FC } from 'react';
import { CheckIcon, FileTextIcon, SparklesIcon } from '@/assets/icons';

interface Draft {
  id: string;
  company: string;
  role: string;
  platform: string;
  status: 'Ready' | 'Review required' | 'Generating';
  matchScore: number;
  cvVariant: string;
  pitchSnippet: string;
}

const DRAFTS: Draft[] = [
  {
    id: 'd1',
    company: 'Stripe',
    role: 'Senior Product Designer, Payments',
    platform: 'Greenhouse',
    status: 'Ready',
    matchScore: 94,
    cvVariant: 'Fintech & Design Systems focus (v3)',
    pitchSnippet: 'Led merchant checkout workflows at Paystack boosting activation by 18%...',
  },
  {
    id: 'd2',
    company: 'Linear',
    role: 'Product Designer',
    platform: 'Direct Outreach',
    status: 'Ready',
    matchScore: 84,
    cvVariant: 'Product Taste & Speed focus (v2)',
    pitchSnippet: 'Hi Karri — daily Linear user for 2+ years with deep design token experience...',
  },
  {
    id: 'd3',
    company: 'Monzo',
    role: 'Design Systems Lead',
    platform: 'Lever',
    status: 'Review required',
    matchScore: 91,
    cvVariant: 'Governance & Token Architecture (v4)',
    pitchSnippet: 'Structured component libraries supporting 40+ engineers across 12 markets...',
  },
];

export const DraftsView: FC = () => {
  const [drafts, setDrafts] = useState<Draft[]>(DRAFTS);
  const [approved, setApproved] = useState<Record<string, boolean>>({});

  const handleApprove = (id: string) => {
    setApproved((prev) => ({ ...prev, [id]: true }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700, letterSpacing: '-.5px' }}>Drafts</h2>
          <p style={{ margin: 0, fontSize: 12, color: '#6a6a72' }}>
            Tailored applications queued for review before submission.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            const all: Record<string, boolean> = {};
            drafts.forEach((d) => (all[d.id] = true));
            setApproved(all);
          }}
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
          Approve all drafts ({drafts.filter((d) => !approved[d.id]).length})
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {drafts.map((d) => {
          const isApproved = approved[d.id];
          return (
            <div
              key={d.id}
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>
                      {d.company} — <span style={{ fontWeight: 600, color: '#4b5563' }}>{d.role}</span>
                    </span>
                    <span style={{ fontSize: 11, color: '#8a8a92' }}>
                      {d.platform} · {d.cvVariant}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#10b981',
                      background: '#ecfdf5',
                      padding: '3px 8px',
                      borderRadius: 6,
                    }}
                  >
                    {d.matchScore}% Match
                  </span>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 600,
                      color: isApproved ? '#065f46' : '#b45309',
                      background: isApproved ? '#d1fae5' : '#fef3c7',
                      borderRadius: 999,
                      padding: '3px 9px',
                    }}
                  >
                    {isApproved ? 'Approved for dispatch' : d.status}
                  </span>
                </div>
              </div>

              <div
                style={{
                  background: '#f9fafb',
                  borderRadius: 8,
                  padding: '10px 12px',
                  fontSize: 12,
                  color: '#374151',
                  border: '1px solid #f3f4f6',
                }}
              >
                "{d.pitchSnippet}"
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  style={{
                    background: '#f3f4f6',
                    border: 0,
                    borderRadius: 8,
                    padding: '8px 14px',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#4b5563',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <SparklesIcon size={13} color="#4b5563" />
                  Regenerate
                </button>
                <button
                  type="button"
                  disabled={isApproved}
                  onClick={() => handleApprove(d.id)}
                  style={{
                    background: isApproved ? '#10b981' : '#2563eb',
                    border: 0,
                    borderRadius: 8,
                    padding: '8px 16px',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#fff',
                    cursor: isApproved ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {isApproved ? (
                    <>
                      <CheckIcon size={14} color="#fff" /> Approved
                    </>
                  ) : (
                    'Approve & queue send'
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
