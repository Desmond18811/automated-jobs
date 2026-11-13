import { useState, type FC } from 'react';

interface KanbanCard {
  id: string;
  company: string;
  role: string;
  date: string;
  channel: string;
  status: 'Queued' | 'Sent' | 'Replied' | 'Interview' | 'Offer';
  badgeNote?: string;
}

const INITIAL_CARDS: KanbanCard[] = [
  { id: '1', company: 'Linear', role: 'Product Designer', date: 'Today', channel: 'Assisted', status: 'Queued' },
  { id: '2', company: 'Wise', role: 'Senior Designer', date: 'Today', channel: 'Web form', status: 'Queued' },
  { id: '3', company: 'Monzo', role: 'Design Systems Lead', date: 'Nov 12', channel: 'Web form', status: 'Sent' },
  { id: '4', company: 'Notion', role: 'Product Designer, AI', date: 'Nov 10', channel: 'Email', status: 'Sent' },
  { id: '5', company: 'Shopify', role: 'Staff Product Designer', date: 'Nov 8', channel: 'Email', status: 'Replied', badgeNote: 'Reply: "next steps"' },
  { id: '6', company: 'Stripe', role: 'Senior Product Designer', date: 'Nov 11', channel: 'Web form', status: 'Interview', badgeNote: 'Invite detected · Gmail' },
  { id: '7', company: 'Vercel', role: 'Design Engineer', date: 'Oct 21', channel: 'Web form', status: 'Offer' },
];

const COLUMNS: { key: KanbanCard['status']; label: string; color: string }[] = [
  { key: 'Queued', label: 'Queued', color: '#9ca3af' },
  { key: 'Sent', label: 'Sent', color: '#3b82f6' },
  { key: 'Replied', label: 'Replied', color: '#8b5cf6' },
  { key: 'Interview', label: 'Interview', color: '#10b981' },
  { key: 'Offer', label: 'Offer', color: '#f59e0b' },
];

export const TrackerView: FC = () => {
  const [cards, setCards] = useState<KanbanCard[]>(INITIAL_CARDS);

  const handleStatusChange = (id: string, newStatus: KanbanCard['status']) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c)));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700, letterSpacing: '-.5px' }}>Tracker</h2>
        <p style={{ margin: 0, fontSize: 12, color: '#6a6a72' }}>
          Every application in one place. Change a status by hand anytime.
        </p>
      </div>

      {/* Banner */}
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
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', flex: 'none' }} />
          <span style={{ fontSize: 12, color: '#166534', fontWeight: 600 }}>
            Interview invite detected — <span style={{ fontWeight: 500 }}>Stripe replied in Gmail. Javi moved it to Interview.</span>
          </span>
          <span
            style={{
              fontSize: 8.5,
              fontWeight: 600,
              color: '#6b7280',
              border: '1px dashed #d1d5db',
              borderRadius: 999,
              padding: '1px 6px',
              background: '#fff',
            }}
          >
            Phase 6
          </span>
        </div>
        <button
          type="button"
          style={{
            background: '#fff',
            border: '1px solid #bbf7d0',
            borderRadius: 6,
            padding: '4px 10px',
            fontSize: 11,
            fontWeight: 600,
            color: '#15803d',
            cursor: 'pointer',
          }}
        >
          View reply
        </button>
      </div>

      {/* Main split */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 14, alignItems: 'start' }}>
        {/* Kanban Board */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 8 }}>
          {COLUMNS.map((col) => {
            const colCards = cards.filter((c) => c.status === col.key);
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
                  minHeight: 340,
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
                  {colCards.map((card) => (
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
                            padding: '3px 6px',
                          }}
                        >
                          {card.badgeNote}
                        </div>
                      )}

                      <select
                        value={card.status}
                        onChange={(e) => handleStatusChange(card.id, e.target.value as any)}
                        style={{
                          fontSize: 10,
                          fontWeight: 500,
                          border: '1px solid #cbd5e1',
                          borderRadius: 6,
                          padding: '2px 4px',
                          background: '#fff',
                          outline: 'none',
                          cursor: 'pointer',
                          fontFamily: 'Montserrat, sans-serif',
                        }}
                      >
                        {COLUMNS.map((c) => (
                          <option key={c.key} value={c.key}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
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
              <span style={{ fontSize: 8.5, color: '#6b7280', border: '1px dashed #d1d5db', borderRadius: 999, padding: '1px 6px' }}>
                Phase 6
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600 }}>Notion</span>
                  <span style={{ fontSize: 10, color: '#94a3b8' }}>No reply in 7 days</span>
                </div>
                <button
                  type="button"
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
                  Send
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600 }}>Monzo</span>
                  <span style={{ fontSize: 10, color: '#94a3b8' }}>Recruiter viewed, no reply</span>
                </div>
                <button
                  type="button"
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
                  Send
                </button>
              </div>
            </div>
          </div>

          {/* Referrals */}
          <div
            style={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>Referrals</span>
              <span style={{ fontSize: 8.5, color: '#6b7280', border: '1px dashed #d1d5db', borderRadius: 999, padding: '1px 6px' }}>
                Phase 6
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 11, color: '#475569', lineHeight: '16px' }}>
              <strong>Kemi Adebayo</strong> works at Shopify and is a 2nd-degree connection.
            </p>
            <button
              type="button"
              style={{
                height: 32,
                background: '#0b0b0c',
                border: 0,
                color: '#fff',
                borderRadius: 8,
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Ask for a referral
            </button>
          </div>

          {/* Hire summary */}
          <div
            style={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>Hire summary</span>
              <span style={{ fontSize: 8.5, color: '#6b7280', border: '1px dashed #d1d5db', borderRadius: 999, padding: '1px 6px' }}>
                Phase 6
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 11, color: '#64748b', lineHeight: '16px' }}>
              When you accept an offer, Javi recaps what worked: sources, response rate, time to hire.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
