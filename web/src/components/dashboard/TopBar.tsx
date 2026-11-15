import { useState, useEffect, type FC } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { JaviGlyph } from '@/assets/logos';
import { BellIcon } from '@/assets/icons';
import { AVATAR_ADA } from '@/assets/avatars';
import { useUserProfile } from '@/context/ProfileContext';
import { notificationsApi } from '@/api';
import { useSocket } from '@/hooks/useSocket';
import { NotificationPopup } from './NotificationPopup';
import type { DashboardTab } from './Sidebar';

interface TopBarProps {
  onOpenSettings?: () => void;
  onSelectTab?: (tab: DashboardTab) => void;
}

export const TopBar: FC<TopBarProps> = ({ onOpenSettings, onSelectTab }) => {
  const nav = useNavigate();
  const { profile } = useUserProfile();
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = async () => {
    try {
      const res = await notificationsApi.getUnreadCount();
      if (typeof res?.unreadCount === 'number') {
        setUnreadCount(res.unreadCount);
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    refreshUnreadCount();
  }, []);

  // Real-time updates via Socket
  useSocket({
    onNotificationNew: () => {
      setUnreadCount((prev) => prev + 1);
    },
  });

  return (
    <div
      style={{
        gridColumn: '1 / -1',
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        padding: '0 20px',
        borderBottom: '1px solid #f0f0f3',
        background: '#fff',
        height: 60,
        boxSizing: 'border-box',
        zIndex: 50,
        position: 'relative',
      }}
    >
      <Link
        to="/"
        style={{
          width: 150,
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          fontWeight: 700,
          fontSize: 17,
          letterSpacing: '-.4px',
          color: '#0b0b0c',
        }}
      >
        <JaviGlyph size={16} />
        Javi
      </Link>
      <div
        style={{
          width: 340,
          height: 36,
          background: '#f6f7f9',
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 4px 0 12px',
          boxSizing: 'border-box',
        }}
      >
        <span style={{ fontSize: 11.5, color: '#9a9aa3' }}>Search roles, companies, leads…</span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#3a3a40',
            background: '#fff',
            borderRadius: 7,
            padding: '6px 10px',
            boxShadow: '0 1px 3px rgba(0,0,0,.06)',
            cursor: 'pointer',
          }}
        >
          Jobs ▾
        </span>
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 11.5, fontWeight: 500, color: '#3a3a40', cursor: 'pointer' }}>Eng (US) ▾</span>

        {/* Bell Icon & Notification Popup */}
        <div style={{ position: 'relative' }}>
          <div
            title="Notifications"
            onClick={() => setShowNotifications(!showNotifications)}
            style={{
              position: 'relative',
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: showNotifications ? '#edf3ff' : '#f6f7f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              border: `1px solid ${showNotifications ? '#bfdbfe' : 'transparent'}`,
            }}
          >
            <BellIcon size={16} color={showNotifications ? '#2563eb' : '#3a3a40'} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: 3,
                  right: 3,
                  minWidth: 14,
                  height: 14,
                  padding: '0 3px',
                  borderRadius: 999,
                  background: '#ef4444',
                  color: '#fff',
                  border: '1.5px solid #fff',
                  fontSize: 8.5,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxSizing: 'border-box',
                }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>

          <NotificationPopup
            isOpen={showNotifications}
            onClose={() => setShowNotifications(false)}
            onSelectTab={onSelectTab}
            onUnreadCountChange={setUnreadCount}
          />
        </div>

        <div
          onClick={() => (onOpenSettings ? onOpenSettings() : nav('/setup'))}
          style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
          title="Account profile"
        >
          <img
            src={profile.avatarUrl || AVATAR_ADA}
            alt={profile.fullName}
            style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover' }}
          />
          <span style={{ fontSize: 12, fontWeight: 600 }}>{profile.firstName || 'Candidate'} ▾</span>
        </div>
      </div>
    </div>
  );
};

