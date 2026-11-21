import { useState, useRef, useEffect, type FC, type ReactNode } from 'react';
import {
  BriefcaseIcon,
  ChevronDownIcon,
  FileTextIcon,
  LogOutIcon,
  RepeatIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TargetIcon,
  UserIcon,
  ZapIcon,
} from '@/assets/icons';
import { AVATAR_ADA } from '@/assets/avatars';
import { useUserProfile } from '@/context/ProfileContext';
import { authApi } from '@/api';

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
  needsYouCount = 0,
  draftsCount = 0,
}) => {
  const { profile } = useUserProfile();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const displayName =
    profile.fullName ||
    [profile.firstName, profile.lastName].filter(Boolean).join(' ') ||
    'Amaka Okafor';
  const displayEmail = profile.email || 'candidate@javi.ai';
  const candidateRole = profile.headline || profile.targetRoles?.[0] || 'UI / UX Designer';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const handleLogout = async () => {
    try {
      if ((window as any).Clerk?.signOut) {
        await (window as any).Clerk.signOut();
      }
      await authApi.logout();
    } finally {
      window.location.href = '/signin';
    }
  };

  const handleCopyEmail = () => {
    navigator.clipboard?.writeText(displayEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const NAV_ITEMS: { key: DashboardTab; label: string; icon: ReactNode; badge?: number }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: <TargetIcon size={15} /> },
    { key: 'needs_you', label: 'Needs you', icon: <ZapIcon size={15} />, badge: needsYouCount > 0 ? needsYouCount : undefined },
    { key: 'job_feed', label: 'Job feed', icon: <BriefcaseIcon size={15} /> },
    { key: 'drafts', label: 'Drafts', icon: <FileTextIcon size={15} />, badge: draftsCount > 0 ? draftsCount : undefined },
    { key: 'tracker', label: 'Tracker', icon: <RepeatIcon size={15} /> },
    { key: 'cv_profile', label: 'CV & profile', icon: <UserIcon size={15} /> },
    { key: 'business_mode', label: 'Business mode', icon: <ShieldCheckIcon size={15} /> },
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ color: isActive ? '#2f6ef0' : '#8a8a92', display: 'flex', alignItems: 'center' }}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </div>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ color: activeTab === 'settings' ? '#2f6ef0' : '#8a8a92', display: 'flex', alignItems: 'center' }}>
            <SparklesIcon size={15} />
          </span>
          <span>Settings</span>
        </div>
      </div>

      {/* User Account Card with Dropdown (Replaces 18/30 Days Pro Trial) */}
      <div ref={dropdownRef} style={{ marginTop: 'auto', position: 'relative' }}>
        {dropdownOpen && (
          <div
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 8px)',
              left: 0,
              width: '100%',
              background: '#fff',
              border: '1px solid #e7e8ec',
              borderRadius: 12,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              padding: '6px',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <div style={{ padding: '8px 10px', borderBottom: '1px solid #f0f0f3', display: 'flex', alignItems: 'center', gap: 8 }}>
              <img
                src={profile.avatarUrl || AVATAR_ADA}
                alt={displayName}
                style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '1px solid #e4e4e7', flexShrink: 0 }}
              />
              <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#1a1a1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {displayName}
                </div>
                <div style={{ fontSize: 10, color: '#2563eb', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {candidateRole}
                </div>
                <div
                  style={{
                    fontSize: 9.5,
                    color: '#71717a',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {displayEmail}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onSelectTab('settings');
                setDropdownOpen(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '7px 10px',
                borderRadius: 7,
                fontSize: 11.5,
                fontWeight: 500,
                color: '#3f3f46',
                background: 'transparent',
                border: 0,
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f4f4f5')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <UserIcon size={14} color="#71717a" />
              Settings
            </button>

            <button
              type="button"
              onClick={handleCopyEmail}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '7px 10px',
                borderRadius: 7,
                fontSize: 11.5,
                fontWeight: 500,
                color: '#3f3f46',
                background: 'transparent',
                border: 0,
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f4f4f5')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <FileTextIcon size={14} color="#71717a" />
              {copied ? 'Email copied!' : 'Copy email'}
            </button>

            <div style={{ height: 1, background: '#f0f0f3', margin: '2px 0' }} />

            <button
              type="button"
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '7px 10px',
                borderRadius: 7,
                fontSize: 11.5,
                fontWeight: 600,
                color: '#dc2626',
                background: 'transparent',
                border: 0,
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#fee2e2')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <LogOutIcon size={14} color="#dc2626" />
              Log out
            </button>
          </div>
        )}

        <div
          onClick={() => setDropdownOpen(!dropdownOpen)}
          style={{
            background: dropdownOpen ? '#edf3ff' : '#f8f9fb',
            border: `1px solid ${dropdownOpen ? '#2f6ef0' : '#e6e7ec'}`,
            borderRadius: 12,
            padding: '10px 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            userSelect: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: '#fff',
                border: '1.5px solid #dbeafe',
                overflow: 'hidden',
                flexShrink: 0,
                boxShadow: '0 2px 6px rgba(47,110,240,0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={profile.avatarUrl || AVATAR_ADA}
                alt={displayName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: '#18181b',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {displayName}
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: '#2563eb',
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {candidateRole}
              </span>
            </div>
          </div>

          <span
            style={{
              color: '#8a8a92',
              transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <ChevronDownIcon size={14} />
          </span>
        </div>
      </div>
    </aside>
  );
};
