import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { AVATAR_ADA } from '@/assets/avatars';
import { useUserProfile } from '@/context/ProfileContext';

export const ProfileCard: FC = () => {
  const nav = useNavigate();
  const { profile } = useUserProfile();

  const expList = profile.experience?.length
    ? profile.experience.map((e, idx) => ({
        initial: (e.company || 'C').charAt(0).toUpperCase(),
        color: idx === 0 ? '#f97316' : '#3d6ef5',
        title: e.title,
        meta: `${e.company} · ${e.start ? e.start.split('-')[0] : '2022'} – ${e.current ? 'Present' : e.end ? e.end.split('-')[0] : '2024'}`,
      }))
    : [
        { initial: 'P', color: '#f97316', title: 'Product Designer', meta: 'Paystack · 2022 – Present' },
        { initial: 'F', color: '#3d6ef5', title: 'UI Designer', meta: 'Flutterwave · 2019 – 2022' },
      ];

  const lookingForTags = [
    ...(profile.targetRoles?.slice(0, 2) || ['Product Designer']),
    profile.remotePreference === 'remote' ? 'Remote' : profile.remotePreference === 'hybrid' ? 'Hybrid' : 'Any',
    profile.salaryExpectation?.minimum ? `$${Math.round(profile.salaryExpectation.minimum / 1000)}k+` : '$120k+',
    'Fintech',
    ...(profile.primarySkills?.slice(0, 2) || ['Figma']),
  ];

  const eligibilityTags = [
    profile.workAuthorization === 'authorized' ? 'Work authorized' : 'Not authorized',
    profile.requiresSponsorship ? 'Sponsorship needed' : 'No sponsorship required',
    profile.noticePeriod || '2 weeks notice',
    profile.willingToRelocate ? 'Open to relocate' : 'Local / remote only',
    profile.highestEducationLevel === 'bachelor'
      ? 'B.Sc. verified'
      : profile.highestEducationLevel === 'master'
      ? 'M.Sc. verified'
      : 'Degree verified',
  ];

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
            src={AVATAR_ADA}
            alt={profile.fullName}
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
            onClick={() => nav('/setup')}
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
          <span style={{ fontSize: 15, fontWeight: 700 }}>{profile.fullName || 'Ada Okafor'}</span>
          <span style={{ fontSize: 11, color: '#8a8a92' }}>
            {profile.headline || 'Product Designer'} · {profile.address?.city || 'Lagos'}, {profile.remotePreference === 'remote' ? 'remote' : profile.address?.country || 'Nigeria'}
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

        {/* CV Card */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 30,
                height: 36,
                borderRadius: 5,
                background: '#fdecec',
                color: '#e04848',
                fontSize: 8.5,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              PDF
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {profile.firstName || 'Ada'}_Okafor_CV.pdf
              </span>
              <span style={{ fontSize: 10, color: '#8a8a92' }}>Updated 2 days ago · 2 pages</span>
            </div>
            <span
              onClick={() => nav('/setup')}
              style={{ fontSize: 10.5, fontWeight: 600, color: '#2f6ef0', cursor: 'pointer' }}
            >
              Replace
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#6a6a72' }}>
            <span>Profile completeness</span>
            <span style={{ fontWeight: 700, color: '#0b0b0c' }}>92%</span>
          </div>
          <div style={{ height: 4, borderRadius: 4, background: '#eef0f4' }}>
            <div
              style={{
                width: '92%',
                height: 4,
                borderRadius: 4,
                background: 'linear-gradient(90deg,#3d6ef5,#14b8a6)',
              }}
            />
          </div>
        </div>

        {/* Experience */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700 }}>Experience</span>
          {expList.map((e, idx) => (
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
          ))}
        </div>

        {/* Looking for */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700 }}>Looking for</span>
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
        </div>

        {/* Work Authorization & Legal (New express fields) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700 }}>Work Eligibility &amp; Preferences</span>
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
      </div>
    </aside>
  );
};
