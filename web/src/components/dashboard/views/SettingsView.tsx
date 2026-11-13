import { useState, type FC } from 'react';
import { GmailLogo } from '@/assets/logos';

export const SettingsView: FC = () => {
  const [careerPages, setCareerPages] = useState([
    { url: 'stripe.com/jobs', checked: 'Checked 1h ago' },
    { url: 'shopify.com/careers', checked: 'Checked 1h ago' },
    { url: 'jobs.lever.co/monzo', checked: 'Checked 2h ago' },
  ]);
  const [newPage, setNewPage] = useState('');

  const handleAddPage = () => {
    if (newPage.trim()) {
      setCareerPages((prev) => [...prev, { url: newPage.trim(), checked: 'Just added' }]);
      setNewPage('');
    }
  };

  const handleRemovePage = (url: string) => {
    setCareerPages((prev) => prev.filter((p) => p.url !== url));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 680 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: '-.5px' }}>Settings</h2>
      </div>

      {/* Connections */}
      <div
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
        <span style={{ fontSize: 13, fontWeight: 700 }}>Connections</span>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: '#fef2f2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <GmailLogo size={18} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Gmail</span>
              <span style={{ fontSize: 11, color: '#6b7280' }}>
                ada@gmail.com · sending and reply detection
              </span>
            </div>
          </div>

          <button
            type="button"
            style={{
              background: '#f3f4f6',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 11.5,
              fontWeight: 600,
              color: '#374151',
              cursor: 'pointer',
            }}
          >
            Disconnect
          </button>
        </div>
      </div>

      {/* Career pages Javi watches */}
      <div
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
        <span style={{ fontSize: 13, fontWeight: 700 }}>Career pages Javi watches</span>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {careerPages.map((p) => (
            <div
              key={p.url}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '9px 12px',
                background: '#f9fafb',
                border: '1px solid #f3f4f6',
                borderRadius: 8,
                fontSize: 12,
              }}
            >
              <span style={{ fontWeight: 600, color: '#111827' }}>{p.url}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 10.5, color: '#9ca3af' }}>{p.checked}</span>
                <button
                  type="button"
                  onClick={() => handleRemovePage(p.url)}
                  style={{
                    background: 'transparent',
                    border: 0,
                    color: '#6b7280',
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <input
            type="text"
            value={newPage}
            onChange={(e) => setNewPage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddPage();
            }}
            placeholder="careers.company.com"
            style={{
              flex: 1,
              height: 38,
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: '0 12px',
              fontSize: 12,
              outline: 'none',
              fontFamily: 'Montserrat, sans-serif',
            }}
          />
          <button
            type="button"
            onClick={handleAddPage}
            style={{
              height: 38,
              padding: '0 16px',
              background: '#2563eb',
              border: 0,
              color: '#fff',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Add page
          </button>
        </div>
      </div>

      {/* Your data */}
      <div
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
        <span style={{ fontSize: 13, fontWeight: 700 }}>Your data</span>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
          <span style={{ fontSize: 12, color: '#374151' }}>
            Export profile, drafts and application history
          </span>
          <button
            type="button"
            style={{
              background: '#f3f4f6',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 11.5,
              fontWeight: 600,
              color: '#374151',
              cursor: 'pointer',
            }}
          >
            Export (.zip)
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid #f9fafb' }}>
          <span style={{ fontSize: 12, color: '#374151' }}>Delete account and all data permanently</span>
          <button
            type="button"
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 11.5,
              fontWeight: 600,
              color: '#dc2626',
              cursor: 'pointer',
            }}
          >
            Delete account
          </button>
        </div>
      </div>
    </div>
  );
};
