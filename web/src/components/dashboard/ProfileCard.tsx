import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { AVATAR_ANGELICA } from '@/assets/avatars';
import { useUserProfile } from '@/context/ProfileContext';

export const ProfileCard: FC<{ onOpenSettings?: () => void }> = ({ onOpenSettings }) => {
  const nav = useNavigate();
  const { profile } = useUserProfile();

  const handleEditClick = () => {
    if (onOpenSettings) {
      onOpenSettings();
    } else {
      nav('/setup');
    }
  };

  const expList = Array.isArray(profile.experience) && profile.experience.length > 0
    ? profile.experience.map((e, idx) => ({
        initial: (e.company || 'C').charAt(0).toUpperCase(),
        color: idx === 0 ? '#f97316' : '#3d6ef5',
        title: e.title,
        meta: `${e.company}${e.start ? ` · ${e.start.split('-')[0]}` : ''} – ${e.current ? 'Present' : e.end ? e.end.split('-')[0] : 'Past'}`,
      }))
    : [];

  const lookingForTags: string[] = [
    ...(Array.isArray(profile.targetRoles) ? profile.targetRoles.slice(0, 3) : []),
    profile.remotePreference ? (profile.remotePreference === 'remote' ? 'Remote' : profile.remotePreference === 'hybrid' ? 'Hybrid' : 'Any location') : '',
    profile.salaryExpectation?.minimum ? `$${Math.round(profile.salaryExpectation.minimum / 1000)}k+` : '',
    ...(Array.isArray(profile.primarySkills) ? profile.primarySkills.slice(0, 3) : []),
  ].filter(Boolean);

  const eligibilityTags: string[] = [
    profile.workAuthorization ? (profile.workAuthorization === 'authorized' ? 'Work authorized' : 'Not authorized') : '',
    profile.requiresSponsorship !== undefined ? (profile.requiresSponsorship ? 'Sponsorship required' : 'No sponsorship needed') : '',
    profile.noticePeriod ? `${profile.noticePeriod} notice` : '',
    profile.willingToRelocate ? 'Open to relocate' : '',
  ].filter(Boolean);

  // Compute actual profile completeness
  const criticalFields = [
    profile.firstName,
    profile.lastName,
    profile.email,
    profile.phone,
    profile.headline,
    profile.location,
    profile.linkedinUrl,
    profile.workAuthorization,
    profile.summary,
    profile.targetRoles?.length,
    profile.primarySkills?.length,
  ];
  const filledCount = criticalFields.filter(Boolean).length;
  const completeness = Math.round((filledCount / criticalFields.length) * 100);

  const displayName = profile.fullName || (profile.firstName ? `${profile.firstName} ${profile.lastName || ''}`.trim() : 'Candidate Profile');

  return (
    <aside
      style={{
        borderLeft: '1px solid #f0f0f3',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        background: '#fff',
      }}
    >
      <div
        style={{
          position: 'relative',
          height: 96,
          background: '#eef1f5',
          overflow: 'hidden',
          flex: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 90,
            top: -40,
            width: 260,
            height: 120,
            borderRadius: '50%',
            background: 'linear-gradient(90deg,#3d6ef5 0%,#3d6ef5 50%,#14b8a6 50%,#14b8a6 100%)',
            transform: 'rotate(-14deg)',
            opacity: 0.9,
          }}
        />
      </div>
      <div
        style={{
          padding: '0 18px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          marginTop: -34,
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <img
            src={profile.avatarUrl || AVATAR_ANGELICA}
            alt={displayName}
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              objectFit: 'cover',
              border: '3px solid #fff',
              boxShadow: '0 4px 12px rgba(0,0,0,.1)',
            }}
          />
          <button
            type="button"
            onClick={handleEditClick}
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#fff',
              background: '#2f6ef0',
              borderRadius: 8,
              padding: '7px 11px',
              border: 0,
              cursor: 'pointer',
              fontFamily: 'Montserrat, sans-serif',
            }}
          >
            Edit profile
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{displayName}</span>
          <span style={{ fontSize: 11, color: '#8a8a92' }}>
            {profile.headline || 'Active Candidate'} {profile.location ? `· ${profile.location}` : ''}
          </span>
        </div>
        <span
          style={{
            alignSelf: 'flex-start',
            fontSize: 10.5,
            fontWeight: 600,
            color: '#0f766e',
            background: '#e7f7f5',
            borderRadius: 999,
            padding: '4px 10px',
          }}
        >
          ● Open to work
        </span>

        {/* Profile Completeness Card */}
        <div
          style={{
            border: '1px solid #eef0f4',
            borderRadius: 12,
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: '#6a6a72' }}>
            <span>Profile completeness</span>
            <span style={{ fontWeight: 700, color: '#0b0b0c' }}>{completeness}%</span>
          </div>
          <div style={{ height: 4, borderRadius: 4, background: '#eef0f4' }}>
            <div
              style={{
                width: `${completeness}%`,
                height: 4,
                borderRadius: 4,
                background: 'linear-gradient(90deg,#3d6ef5,#14b8a6)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          {completeness < 100 && (
            <span
              onClick={handleEditClick}
              style={{ fontSize: 10, color: '#2563eb', cursor: 'pointer', fontWeight: 600 }}
            >
              Complete remaining details in Settings ›
            </span>
          )}
        </div>

        {/* Experience */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700 }}>Experience</span>
          {expList.length === 0 ? (
            <span style={{ fontSize: 11, color: '#9ca3af', fontStyle: 'italic' }}>
              No experience added yet. Update your profile in Settings.
            </span>
          ) : (
            expList.map((e, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: e.color,
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: 'none',
                  }}
                >
                  {e.initial}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600 }}>{e.title}</span>
                  <span style={{ fontSize: 10, color: '#8a8a92' }}>{e.meta}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Target Roles & Skills */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700 }}>Target Roles &amp; Skills</span>
          {lookingForTags.length === 0 ? (
            <span style={{ fontSize: 11, color: '#9ca3af', fontStyle: 'italic' }}>
              Add target roles and skills in Settings.
            </span>
          ) : (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {lookingForTags.map((t, idx) => (
                <span
                  key={idx}
                  style={{
                    fontSize: 10.5,
                    color: '#3a3a40',
                    background: '#f4f5f8',
                    borderRadius: 7,
                    padding: '4px 9px',
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Work Authorization & Legal */}
        {eligibilityTags.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700 }}>Work Eligibility</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {eligibilityTags.map((t, idx) => (
                <span
                  key={idx}
                  style={{
                    fontSize: 10.5,
                    color: '#3a3a40',
                    background: '#f4f5f8',
                    borderRadius: 7,
                    padding: '4px 9px',
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
