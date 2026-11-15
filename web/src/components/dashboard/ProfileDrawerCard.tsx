import type { FC } from 'react';
import { useUserProfile } from '@/context/ProfileContext';
import { BriefcaseIcon, EditIcon, GraduationCapIcon, UsersIcon, ZapIcon } from '@/assets/icons';
import { AVATAR_ADA } from '@/assets/avatars';

interface ProfileDrawerCardProps {
  onEditProfile: () => void;
}

export const ProfileDrawerCard: FC<ProfileDrawerCardProps> = ({ onEditProfile }) => {
  const { profile } = useUserProfile();

  const fullName =
    profile.fullName ||
    [profile.firstName, profile.lastName].filter(Boolean).join(' ') ||
    'Angelica Greeze';
  const headline = profile.headline || profile.targetRoles?.[0] || 'UI / UX Designer';

  // Fallback experiences if candidate hasn't completed experience yet
  const experiences =
    profile.experience && profile.experience.length > 0
      ? profile.experience.slice(0, 3)
      : [
          {
            title: headline,
            company: 'Ideologist Team',
            location: 'Remote',
            start: 'Jan 2022',
            end: 'Present',
            current: true,
          },
          {
            title: 'Product Designer',
            company: 'Tigabatang',
            location: 'Fulltime',
            start: 'Jan 2021',
            end: 'Dec 2021',
            current: false,
          },
        ];

  // Fallback educations if candidate hasn't completed education yet
  const educations =
    profile.education && profile.education.length > 0
      ? profile.education.slice(0, 2)
      : [
          {
            institution: 'Oxford University',
            degree: 'Student - Software Engineering',
            start: '2018',
            end: '2021',
          },
          {
            institution: 'Oxford Vocational High School',
            degree: 'Student - Software Engineering',
            start: '2015',
            end: '2018',
          },
        ];

  // Skills
  const rawSkills = [
    ...(profile.primarySkills || []),
    ...(profile.secondarySkills || []),
    ...(profile.toolsAndFrameworks || []),
  ];
  const skills =
    rawSkills.length > 0
      ? Array.from(new Set(rawSkills)).slice(0, 8)
      : ['UI', 'UX', 'Website Design', 'Mobile Design', 'Research', 'Interaction'];

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 20,
        boxShadow: '0 2px 14px rgba(0,0,0,0.04)',
        border: '1px solid #f0f0f3',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        width: '100%',
      }}
    >
      {/* 1. Header Banner */}
      <div style={{ position: 'relative', height: 95, background: '#e8f0fe', overflow: 'hidden' }}>
        {/* Decorative SVG curves matching reference image */}
        <svg
          viewBox="0 0 360 120"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          preserveAspectRatio="none"
        >
          <path
            d="M0,0 L360,0 L360,50 Q240,120 120,40 Q60,0 0,60 Z"
            fill="#2f6ef0"
            opacity="0.85"
          />
          <circle cx="310" cy="15" r="55" fill="#5b93ff" opacity="0.6" />
        </svg>
      </div>

      {/* 2. Candidate Identity & Full Circular Avatar (No Clipping) */}
      <div style={{ padding: '0 20px 16px', position: 'relative', zIndex: 3 }}>
        {/* Full circular avatar overlapping the banner */}
        <div
          style={{
            marginTop: -38,
            marginBottom: 12,
            width: 76,
            height: 76,
            borderRadius: '50%',
            background: '#fff',
            border: '4px solid #fff',
            boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <img
            src={profile.avatarUrl || AVATAR_ADA}
            alt={fullName}
            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', display: 'block' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#1a1a1f', letterSpacing: '-0.3px' }}>
              {fullName}
            </h2>
            <span style={{ fontSize: 12.5, color: '#71717a', fontWeight: 500, marginTop: 2, display: 'inline-block' }}>
              {headline}
            </span>
          </div>

          <button
            type="button"
            onClick={onEditProfile}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              borderRadius: 999,
              background: '#2f6ef0',
              color: '#fff',
              border: 0,
              fontSize: 11.5,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(47,110,240,0.3)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#255cd4')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#2f6ef0')}
          >
            <EditIcon size={12} color="#fff" />
            Edit Profile
          </button>
        </div>
      </div>

      <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* 3. Availability Section */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1e1e24' }}>Availability</span>
            <span style={{ color: '#8a8a92', cursor: 'pointer' }} onClick={onEditProfile}>
              <EditIcon size={13} />
            </span>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 14px',
              borderRadius: 10,
              background: '#ff5459',
              color: '#fff',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '-0.2px',
              boxShadow: '0 2px 8px rgba(255,84,89,0.25)',
            }}
          >
            <BriefcaseIcon size={14} color="#fff" />
            <span>Available For Work</span>
          </div>
        </div>

        {/* 4. Experience Section */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1e1e24' }}>Experience</span>
            <span style={{ color: '#8a8a92', cursor: 'pointer' }} onClick={onEditProfile}>
              <EditIcon size={13} />
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {experiences.map((exp: any, idx: number) => {
              const iconBg = idx === 0 ? '#ff6b4a' : '#4a7aff';
              const dateStr = [exp.start, exp.end || (exp.current ? 'Present' : '')].filter(Boolean).join(' - ');

              return (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: iconBg,
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    {idx === 0 ? <ZapIcon size={16} color="#fff" /> : <UsersIcon size={16} color="#fff" />}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#18181b' }}>{exp.title}</div>
                    <div style={{ fontSize: 11.5, color: '#71717a' }}>
                      {exp.company} {exp.location ? `· ${exp.location}` : ''}
                    </div>
                    {dateStr && <div style={{ fontSize: 10.5, color: '#a1a1aa', marginTop: 2 }}>{dateStr}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 5. Education Section */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1e1e24' }}>Education</span>
            <span style={{ color: '#8a8a92', cursor: 'pointer' }} onClick={onEditProfile}>
              <EditIcon size={13} />
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {educations.map((edu: any, idx: number) => {
              const dateStr = [edu.start, edu.end].filter(Boolean).join(' - ');

              return (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: '#eff6ff',
                      color: '#2f6ef0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: 2,
                      border: '1px solid #dbeafe',
                    }}
                  >
                    <GraduationCapIcon size={16} color="#2f6ef0" />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#18181b' }}>{edu.institution}</div>
                    <div style={{ fontSize: 11.5, color: '#71717a' }}>{edu.degree || edu.field || 'Student'}</div>
                    {dateStr && <div style={{ fontSize: 10.5, color: '#a1a1aa', marginTop: 2 }}>{dateStr}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 6. Skills Section */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1e1e24' }}>Skills</span>
            <span style={{ color: '#8a8a92', cursor: 'pointer' }} onClick={onEditProfile}>
              <EditIcon size={13} />
            </span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {skills.map((skill: string, idx: number) => (
              <span
                key={idx}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#4b5563',
                  background: '#f3f4f6',
                  padding: '6px 12px',
                  borderRadius: 14,
                  border: '1px solid #e5e7eb',
                  transition: 'all 0.15s ease',
                  cursor: 'default',
                }}
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
