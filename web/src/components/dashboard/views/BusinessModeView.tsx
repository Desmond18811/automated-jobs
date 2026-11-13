import { useState, type FC } from 'react';
import { ExternalLinkIcon, StarIcon } from '@/assets/icons';

interface BusinessLead {
  id: string;
  name: string;
  category: string;
  rating: string;
  websiteCheck: string;
  websiteStatus: 'orange' | 'red' | 'green';
  stage: string;
}

const LEADS: BusinessLead[] = [
  { id: '1', name: 'Bukka Hut Lekki', category: 'Restaurant', rating: '4.3', websiteCheck: 'Not mobile-friendly', websiteStatus: 'orange', stage: 'Pitch drafted' },
  { id: '2', name: 'Ofada Boy', category: 'Restaurant', rating: '4.6', websiteCheck: 'No website', websiteStatus: 'red', stage: 'New' },
  { id: '3', name: 'Craft Gourmet', category: 'Restaurant', rating: '4.4', websiteCheck: 'Looks fine', websiteStatus: 'green', stage: 'Skipped' },
  { id: '4', name: 'The Yellow Chilli', category: 'Restaurant', rating: '4.5', websiteCheck: 'No SSL, slow', websiteStatus: 'orange', stage: 'Contacted' },
  { id: '5', name: 'Sweet Sensation', category: 'Fast food', rating: '4.0', websiteCheck: 'No website', websiteStatus: 'red', stage: 'Unsubscribed' },
];

export const BusinessModeView: FC = () => {
  const [keyword, setKeyword] = useState('Restaurants');
  const [location, setLocation] = useState('Lekki, Lagos');
  const [sequenceStarted, setSequenceStarted] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: '-.5px' }}>Business mode</h2>
            <span
              style={{
                fontSize: 9,
                fontWeight: 600,
                color: '#6b7280',
                border: '1px dashed #d1d5db',
                borderRadius: 999,
                padding: '2px 8px',
                background: '#f9fafb',
              }}
            >
              Phase 7 preview
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6a6a72' }}>
            Find local businesses that need your services and pitch them.
          </p>
        </div>

        <button
          type="button"
          style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            padding: '7px 14px',
            fontSize: 12,
            fontWeight: 600,
            color: '#374151',
            cursor: 'pointer',
          }}
        >
          Import CSV
        </button>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Category or service (e.g. Restaurants, Dentists)"
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
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Location (e.g. Lekki, Lagos)"
          style={{
            width: 200,
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
          style={{
            height: 40,
            padding: '0 18px',
            background: '#2563eb',
            border: 0,
            color: '#fff',
            borderRadius: 10,
            fontSize: 12.5,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Find leads
        </button>
      </div>

      {/* Split view */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 14, alignItems: 'start' }}>
        {/* Leads Table */}
        <div
          style={{
            background: '#fff',
            border: '1px solid #eef0f4',
            borderRadius: 14,
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,.02)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 140px 110px',
              padding: '10px 16px',
              borderBottom: '1px solid #eef0f4',
              fontSize: 11,
              fontWeight: 700,
              color: '#8a8a92',
              background: '#fcfcfd',
            }}
          >
            <span>Business</span>
            <span>Website check</span>
            <span>Stage</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {LEADS.map((b) => {
              const bg = b.websiteStatus === 'green' ? '#ecfdf5' : b.websiteStatus === 'red' ? '#fef2f2' : '#fff7ed';
              const text = b.websiteStatus === 'green' ? '#065f46' : b.websiteStatus === 'red' ? '#b91c1c' : '#c2410c';
              return (
                <div
                  key={b.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 140px 110px',
                    padding: '12px 16px',
                    borderBottom: '1px solid #f8fafc',
                    alignItems: 'center',
                    fontSize: 12,
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontWeight: 700, color: '#111827' }}>{b.name}</span>
                    <span style={{ fontSize: 10.5, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 3 }}>
                      {b.category} · {b.rating} <StarIcon size={10} color="#f59e0b" />
                    </span>
                  </div>

                  <div>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: text,
                        background: bg,
                        borderRadius: 6,
                        padding: '3px 7px',
                      }}
                    >
                      {b.websiteCheck}
                    </span>
                  </div>

                  <span style={{ fontSize: 11.5, color: '#4b5563', fontWeight: 500 }}>{b.stage}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right side sequence & portfolio */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Outreach Sequence */}
          <div
            style={{
              background: '#fff',
              border: '1px solid #eef0f4',
              borderRadius: 14,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              boxShadow: '0 1px 3px rgba(0,0,0,.02)',
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700 }}>Outreach sequence</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: '#6b7280' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600 }}>Day 0</span>
                <span>Generated pitch</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600 }}>Day 3</span>
                <span>Short follow-up</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600 }}>Day 8</span>
                <span>Last nudge + portfolio</span>
              </div>
            </div>

            <div
              style={{
                background: '#f9fafb',
                border: '1px solid #f3f4f6',
                borderRadius: 8,
                padding: '9px 12px',
                fontSize: 11.5,
                color: '#374151',
                lineHeight: '16px',
              }}
            >
              "Hi Bukka Hut team — I noticed your menu page doesn't load on mobile. I design fast, simple restaurant sites; here are two I built in Lagos..."
            </div>

            <span style={{ fontSize: 10, color: '#9ca3af' }}>Every email includes one-click unsubscribe.</span>

            <button
              type="button"
              onClick={() => setSequenceStarted(true)}
              style={{
                height: 38,
                background: sequenceStarted ? '#10b981' : '#0b0b0c',
                border: 0,
                color: '#fff',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {sequenceStarted ? 'Sequence active for 4 leads' : 'Start sequence for 4 leads'}
            </button>
          </div>

          {/* Portfolio Page */}
          <div
            style={{
              background: '#fff',
              border: '1px solid #eef0f4',
              borderRadius: 14,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              boxShadow: '0 1px 3px rgba(0,0,0,.02)',
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700 }}>Portfolio page</span>
            <a
              href="#"
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              javi.page/ada-okafor <ExternalLinkIcon size={12} color="#2563eb" />
            </a>
            <span style={{ fontSize: 10.5, color: '#6b7280' }}>
              Linked in every pitch. 6 projects, 2 testimonials.
            </span>
            <button
              type="button"
              style={{
                height: 34,
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: 8,
                fontSize: 11.5,
                fontWeight: 600,
                color: '#2563eb',
                cursor: 'pointer',
              }}
            >
              Publish page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
