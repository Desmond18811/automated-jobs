import { useEffect, useState, type FC } from 'react';
import { profileApi } from '@/api';

interface TargetCompany {
  name: string;
  url: string;
  ats?: string;
  detail: string;
}

export const TargetCompanies: FC<{ onOpenSettings?: () => void }> = ({ onOpenSettings }) => {
  const [companies, setCompanies] = useState<TargetCompany[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    profileApi
      .get()
      .then((res: any) => {
        const p = res?.profile || res;
        if (p?.careerPages && Array.isArray(p.careerPages) && p.careerPages.length > 0) {
          const parsed = p.careerPages.map((cp: any) => {
            const rawUrl = typeof cp === 'string' ? cp : cp.url;
            let hostName = rawUrl;
            try {
              hostName = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`).hostname.replace(/^www\./, '');
            } catch {
              hostName = rawUrl.split('/')[0];
            }
            const cleanName = hostName.split('.')[0];
            const name = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
            return {
              name,
              url: rawUrl,
              ats: cp.ats || 'Direct career page',
              detail: `Active watch · ${rawUrl}`,
            };
          });
          setCompanies(parsed);
        } else {
          setCompanies([]);
        }
      })
      .catch(() => setCompanies([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '16px 0', fontSize: 11.5, color: '#9ca3af', textAlign: 'center' }}>
        Loading watched target companies...
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: '20px 16px',
          textAlign: 'center',
          border: '1px dashed #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>No target companies watched yet</span>
        <span style={{ fontSize: 11, color: '#64748b', maxWidth: 360 }}>
          Add career pages to your watch list in Settings. J.A.V.I monitors those companies daily for openings matching your profile.
        </span>
        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            style={{
              marginTop: 4,
              padding: '6px 14px',
              borderRadius: 8,
              background: '#2563eb',
              color: '#fff',
              fontSize: 11.5,
              fontWeight: 600,
              border: 0,
              cursor: 'pointer',
            }}
          >
            Add career pages
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>Target companies ({companies.length})</span>
        {onOpenSettings && (
          <span
            onClick={onOpenSettings}
            style={{ fontSize: 11, fontWeight: 500, color: '#2563eb', cursor: 'pointer' }}
          >
            Edit watch list
          </span>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10 }}>
        {companies.map((c) => (
          <div
            key={c.url}
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              alignItems: 'center',
              textAlign: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,.03)',
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: '#f4f5f8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 700,
                color: '#3a3a40',
              }}
            >
              {c.name[0]}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700 }}>{c.name}</span>
              <span style={{ fontSize: 10.5, color: '#8a8a92' }}>{c.detail}</span>
            </div>
            <span
              style={{
                fontSize: 9.5,
                fontWeight: 600,
                color: '#2563eb',
                background: '#eff6ff',
                borderRadius: 4,
                padding: '2px 6px',
              }}
            >
              {c.ats}
            </span>
          </div>
        ))}
      </div>
    </>
  );
};
