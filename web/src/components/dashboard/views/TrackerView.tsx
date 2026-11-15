import { useEffect, useState, type FC } from 'react';
import { CheckIcon, RefreshCwIcon } from '@/assets/icons';
import { applicationsApi } from '@/api';

export type ColumnKey = 'Queued' | 'Sent' | 'Replied' | 'Interview' | 'Offer';

interface KanbanCard {
  id: string;
  company: string;
  role: string;
  date: string;
  channel: string;
  rawStatus: string;
  column: ColumnKey;
  badgeNote?: string;
  updatedAt?: string;
}

const COLUMNS: { key: ColumnKey; label: string; color: string }[] = [
  { key: 'Queued', label: 'Queued', color: '#9ca3af' },
  { key: 'Sent', label: 'Sent', color: '#3b82f6' },
  { key: 'Replied', label: 'Replied', color: '#8b5cf6' },
  { key: 'Interview', label: 'Interview', color: '#10b981' },
  { key: 'Offer', label: 'Offer', color: '#f59e0b' },
];

function mapStatusToColumn(status: string): ColumnKey {
  if (['sent'].includes(status)) return 'Sent';
  if (['replied'].includes(status)) return 'Replied';
  if (['interview'].includes(status)) return 'Interview';
  if (['offer', 'hired'].includes(status)) return 'Offer';
  return 'Queued';
}

function mapColumnToApiStatus(col: ColumnKey): string {
  switch (col) {
    case 'Sent':
      return 'sent';
    case 'Replied':
      return 'replied';
    case 'Interview':
      return 'interview';
    case 'Offer':
      return 'offer';
    default:
      return 'approved';
  }
}

export const TrackerView: FC = () => {
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const loadApplications = async () => {
    try {
      setLoading(true);
      const res = await applicationsApi.list();
      const items = Array.isArray(res) ? res : res?.items || res?.applications || [];

      const parsed: KanbanCard[] = items.map((app: any) => {
        const id = app._id || app.id;
        const company = app.jobId?.company || app.company || 'Company';
        const role = app.jobId?.title || app.role || 'Role';
        const rawStatus = app.status || 'discovered';
        const col = mapStatusToColumn(rawStatus);

        let dateStr = 'Recently';
        if (app.updatedAt || app.createdAt) {
          try {
            dateStr = new Date(app.updatedAt || app.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            });
          } catch {
            dateStr = 'Recently';
          }
        }

        let badgeNote: string | undefined;
        if (rawStatus === 'interview') badgeNote = 'Interview scheduled';
        else if (rawStatus === 'replied') badgeNote = 'Reply received';
        else if (rawStatus === 'offer') badgeNote = 'Offer received';

        return {
          id,
          company,
          role,
          date: dateStr,
          channel: app.channel === 'email' ? 'Email' : 'Web form',
          rawStatus,
          column: col,
          badgeNote,
          updatedAt: app.updatedAt,
        };
      });

      setCards(parsed);
    } catch (e: any) {
      console.warn('Could not load applications from API:', e?.message);
      setCards([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  const handleStatusChange = async (id: string, newCol: ColumnKey) => {
    const targetStatus = mapColumnToApiStatus(newCol);
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, column: newCol, rawStatus: targetStatus } : c)));

    try {
      await applicationsApi.updateStatus(id, targetStatus);
      showToast(`Status updated to ${newCol}`);
    } catch (e: any) {
      showToast('Could not persist status: ' + (e?.message || 'Check connection'));
      loadApplications();
    }
  };

  const interviewOrRepliedCard = cards.find((c) => c.column === 'Interview' || c.column === 'Replied');

  // Real follow-ups: sent applications older than 5 days
  const now = Date.now();
  const followUpsDue = cards.filter((c) => {
    if (c.column !== 'Sent' || !c.updatedAt) return false;
    const diffDays = (now - new Date(c.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 5;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 40 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700, letterSpacing: '-.5px' }}>Application Tracker</h2>
          <p style={{ margin: 0, fontSize: 12, color: '#6a6a72' }}>
            Live status of every submitted application. Statuses update automatically from Gmail replies or can be adjusted manually.
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
            onClick={loadApplications}
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
        </div>
      </div>

      {/* Dynamic Interview / Reply Banner */}
      {interviewOrRepliedCard && (
        <div
          style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 12,
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', flex: 'none' }} />
            <span style={{ fontSize: 12, color: '#166534', fontWeight: 600 }}>
              {interviewOrRepliedCard.column === 'Interview' ? 'Interview invite active — ' : 'Employer response received — '}
              <span style={{ fontWeight: 500 }}>
                {interviewOrRepliedCard.company} replied to your application for {interviewOrRepliedCard.role}.
              </span>
            </span>
          </div>
        </div>
      )}

      {/* Main Kanban split */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 14, alignItems: 'start' }}>
        {/* Kanban Board */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 8 }}>
          {COLUMNS.map((col) => {
            const colCards = cards.filter((c) => c.column === col.key);
            return (
              <div
                key={col.key}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: '10px 8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  minHeight: 380,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: col.color }} />
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: '#1e293b' }}>{col.label}</span>
                  </div>
                  <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{colCards.length}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {loading && cards.length === 0 ? (
                    <div style={{ fontSize: 10.5, color: '#94a3b8', textAlign: 'center', padding: '16px 0' }}>
                      Loading...
                    </div>
                  ) : colCards.length === 0 ? (
                    <div
                      style={{
                        padding: '16px 6px',
                        textAlign: 'center',
                        fontSize: 10.5,
                        color: '#94a3b8',
                        border: '1px dashed #e2e8f0',
                        borderRadius: 6,
                      }}
                    >
                      No applications
                    </div>
                  ) : (
                    colCards.map((card) => (
                      <div
                        key={card.id}
                        style={{
                          background: '#fff',
                          border: '1px solid #e2e8f0',
                          borderRadius: 8,
                          padding: 10,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                          boxShadow: '0 1px 2px rgba(0,0,0,.02)',
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{card.company}</span>
                          <span style={{ fontSize: 10.5, color: '#64748b' }}>{card.role}</span>
                          <span style={{ fontSize: 9.5, color: '#94a3b8' }}>
                            {card.date} · {card.channel}
                          </span>
                        </div>

                        {card.badgeNote && (
                          <div
                            style={{
                              fontSize: 9.5,
                              fontWeight: 600,
                              color: col.key === 'Interview' ? '#047857' : '#6d28d9',
                              background: col.key === 'Interview' ? '#d1fae5' : '#ede9fe',
                              borderRadius: 4,
                              padding: '2px 6px',
                            }}
                          >
                            {card.badgeNote}
                          </div>
                        )}

                        <select
                          value={card.column}
                          onChange={(e) => handleStatusChange(card.id, e.target.value as ColumnKey)}
                          style={{
                            fontSize: 10,
                            fontWeight: 500,
                            border: '1px solid #cbd5e1',
                            borderRadius: 6,
                            padding: '3px 4px',
                            background: '#fff',
                            outline: 'none',
                            cursor: 'pointer',
                            fontFamily: 'Montserrat, sans-serif',
                          }}
                        >
                          {COLUMNS.map((c) => (
                            <option key={c.key} value={c.key}>
                              Move to: {c.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right side panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Follow-ups due */}
          <div
            style={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>Follow-ups due</span>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: '#64748b' }}>
                {followUpsDue.length}
              </span>
            </div>

            {followUpsDue.length === 0 ? (
              <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
                No follow-ups due right now. When applications sent 5+ days ago receive no response, follow-up reminders will appear here.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {followUpsDue.map((fu) => (
                  <div key={fu.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: 11.5, fontWeight: 600 }}>{fu.company}</span>
                      <span style={{ fontSize: 10, color: '#94a3b8' }}>Sent 5+ days ago</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => showToast(`Follow-up drafted for ${fu.company}`)}
                      style={{
                        background: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        color: '#2563eb',
                        borderRadius: 6,
                        padding: '3px 8px',
                        fontSize: 10.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Follow up
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Funnel Metrics Breakdown */}
          <div
            style={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>Funnel Metrics</span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: '#2563eb',
                  background: '#eff6ff',
                  borderRadius: 6,
                  padding: '2px 6px',
                }}
              >
                Conversion Funnel
              </span>
            </div>

            {(() => {
              const queuedCount = cards.filter((c) => c.column === 'Queued').length;
              const sentCount = cards.filter((c) => ['Sent', 'Replied', 'Interview', 'Offer'].includes(c.column)).length;
              const repliedCount = cards.filter((c) => ['Replied', 'Interview', 'Offer'].includes(c.column)).length;
              const interviewCount = cards.filter((c) => ['Interview', 'Offer'].includes(c.column)).length;
              const offerCount = cards.filter((c) => c.column === 'Offer').length;

              const replyRate = sentCount > 0 ? Math.round((repliedCount / sentCount) * 100) : 0;
              const interviewRate = repliedCount > 0 ? Math.round((interviewCount / repliedCount) * 100) : 0;
              const offerRate = interviewCount > 0 ? Math.round((offerCount / interviewCount) * 100) : 0;

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 11.5 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                      <span>Sent → Replied Rate:</span>
                      <strong style={{ color: '#0f172a' }}>{replyRate}% ({repliedCount}/{sentCount || 0})</strong>
                    </div>
                    <div style={{ width: '100%', height: 4, borderRadius: 4, background: '#f1f5f9' }}>
                      <div style={{ width: `${replyRate}%`, height: '100%', borderRadius: 4, background: '#3b82f6' }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                      <span>Replied → Interview Rate:</span>
                      <strong style={{ color: '#0f172a' }}>{interviewRate}% ({interviewCount}/{repliedCount || 0})</strong>
                    </div>
                    <div style={{ width: '100%', height: 4, borderRadius: 4, background: '#f1f5f9' }}>
                      <div style={{ width: `${interviewRate}%`, height: '100%', borderRadius: 4, background: '#10b981' }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                      <span>Interview → Offer Rate:</span>
                      <strong style={{ color: '#0f172a' }}>{offerRate}% ({offerCount}/{interviewCount || 0})</strong>
                    </div>
                    <div style={{ width: '100%', height: 4, borderRadius: 4, background: '#f1f5f9' }}>
                      <div style={{ width: `${offerRate}%`, height: '100%', borderRadius: 4, background: '#f59e0b' }} />
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 4, color: '#64748b', fontSize: 10.5 }}>
                    <span style={{ fontWeight: 600, color: '#334155' }}>How J.A.V.I Tracks Stages:</span>
                    <span>• <strong>Queued:</strong> Draft approved &amp; awaiting send window</span>
                    <span>• <strong>Sent:</strong> Auto-submitted via Browser / Gmail</span>
                    <span>• <strong>Replied:</strong> Inbound message detected via Gmail API</span>
                    <span>• <strong>Interview:</strong> Invite/calendar detected + WhatsApp alert</span>
                    <span>• <strong>Offer:</strong> Offer letter or manual acceptance</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};
