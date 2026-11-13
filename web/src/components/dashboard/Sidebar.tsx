import type { FC } from 'react';

export type DashboardTab =
  | 'dashboard'
  | 'needs_you'
  | 'job_feed'
  | 'drafts'
  | 'tracker'
  | 'cv_profile'
  | 'business_mode'
  | 'settings';

interface SidebarProps {
  activeTab: DashboardTab;
  onSelectTab: (tab: DashboardTab) => void;
  needsYouCount?: number;
  draftsCount?: number;
}

export const Sidebar: FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  needsYouCount = 4,
  draftsCount = 3,
}) => {
  const NAV_ITEMS: { key: DashboardTab; label: string; badge?: number; tag?: string }[] = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'needs_you', label: 'Needs you', badge: needsYouCount },
    { key: 'job_feed', label: 'Job feed' },
    { key: 'drafts', label: 'Drafts', badge: draftsCount },
    { key: 'tracker', label: 'Tracker' },
    { key: 'cv_profile', label: 'CV & profile' },
    { key: 'business_mode', label: 'Business mode', tag: 'Phase 7' },
  ];

  return (
    <aside
      style={{
        padding: '16px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        borderRight: '1px solid #f0f0f3',
        background: '#fff',
        width: 190,
        boxSizing: 'border-box',
        flex: 'none',
        height: '100%',
        overflowY: 'auto',
      }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = activeTab === item.key;
        return (
          <div
            key={item.key}
            onClick={() => onSelectTab(item.key)}
            style={{
              fontSize: 12,
              fontWeight: isActive ? 600 : 500,
              color: isActive ? '#2f6ef0' : '#55555c',
              background: isActive ? '#edf3ff' : 'transparent',
              padding: '9px 12px',
              borderRadius: 9,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <span>{item.label}</span>
            {item.badge !== undefined && (
              <span
                style={{
                  fontSize: 9.5,
                  fontWeight: 700,
                  color: '#fff',
                  background: '#2f6ef0',
                  borderRadius: 999,
                  width: 16,
                  height: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {item.badge}
              </span>
            )}
            {item.tag && (
              <span
                style={{
                  fontSize: 8.5,
                  fontWeight: 600,
                  color: '#6b7280',
                  border: '1px dashed #d1d5db',
                  borderRadius: 999,
                  padding: '1px 6px',
                  background: '#f9fafb',
                }}
              >
                {item.tag}
              </span>
            )}
          </div>
        );
      })}

      <div style={{ fontSize: 10.5, fontWeight: 600, color: '#9a9aa3', padding: '16px 12px 6px' }}>
        Account
      </div>

      <div
        onClick={() => onSelectTab('settings')}
        style={{
          fontSize: 12,
          fontWeight: activeTab === 'settings' ? 600 : 500,
          color: activeTab === 'settings' ? '#2f6ef0' : '#55555c',
          background: activeTab === 'settings' ? '#edf3ff' : 'transparent',
          padding: '9px 12px',
          borderRadius: 9,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        Settings
      </div>

      <div
        style={{
          marginTop: 'auto',
          background: '#f6f7f9',
          borderRadius: 14,
          padding: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <span
          style={{
            fontSize: 9.5,
            fontWeight: 700,
            color: '#fff',
            background: 'linear-gradient(90deg,#3d6ef5,#14b8a6)',
            borderRadius: 999,
            padding: '3px 8px',
          }}
        >
          Pro trial
        </span>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#2f6ef0', letterSpacing: '-.6px' }}>
          18<span style={{ fontSize: 13, color: '#55555c' }}>/30 days</span>
        </div>
        <span style={{ fontSize: 10.5, color: '#6a6a72' }}>Upgrade to keep auto-applying</span>
        <button
          type="button"
          style={{
            marginTop: 4,
            width: '100%',
            height: 32,
            borderRadius: 9,
            background: '#0b0b0c',
            color: '#fff',
            fontSize: 11.5,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 0,
            cursor: 'pointer',
          }}
        >
          Upgrade
        </button>
      </div>
    </aside>
  );
};
