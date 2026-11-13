import type { FC } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { JaviGlyph } from '@/assets/logos';
import { BellIcon } from '@/assets/icons';
import { AVATAR_ADA } from '@/assets/avatars';
import { useUserProfile } from '@/context/ProfileContext';

export const TopBar: FC<{ onOpenSettings?: () => void }> = ({ onOpenSettings }) => {
  const nav = useNavigate();
  const { profile } = useUserProfile();

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
        zIndex: 5,
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

        {/* Proper Bell Icon */}
        <div
          title="Notifications"
          style={{
            position: 'relative',
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: '#f6f7f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'background 0.15s ease',
          }}
        >
          <BellIcon size={16} color="#3a3a40" />
          <span
            style={{
              position: 'absolute',
              top: 5,
              right: 6,
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: '#ef4444',
              border: '1.5px solid #fff',
            }}
          />
        </div>

        <div
          onClick={() => (onOpenSettings ? onOpenSettings() : nav('/setup'))}
          style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
          title="Account profile"
        >
          <img
            src={AVATAR_ADA}
            alt={profile.fullName}
            style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover' }}
          />
          <span style={{ fontSize: 12, fontWeight: 600 }}>{profile.firstName || 'Ada'} ▾</span>
        </div>
      </div>
    </div>
  );
};
