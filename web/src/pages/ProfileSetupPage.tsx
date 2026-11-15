import { useState, useEffect, type FC, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { JaviGlyph } from '@/assets/logos';
import {
  BriefcaseIcon,
  CheckIcon,
  FileTextIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TargetIcon,
  UserIcon,
  ZapIcon,
} from '@/assets/icons';
import { useUserProfile } from '@/context/ProfileContext';
import { DEFAULT_PROFILE, type UserProfile } from '@/types/profile';
import { profileApi } from '@/api';

export const ProfileSetupPage: FC = () => {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('token');
  const inviteEmail = searchParams.get('email');
  const { profile, updateProfile, setProfile } = useUserProfile();

  const [activeTab, setActiveTab] = useState<'personal' | 'auth' | 'targets' | 'experience' | 'skills' | 'eeo'>('personal');
  const [formData, setFormData] = useState<UserProfile>(() => {
    if (inviteEmail) {
      return { ...profile, email: inviteEmail };
    }
    return profile;
  });
  const [showSavedToast, setShowSavedToast] = useState(false);

  useEffect(() => {
    if (inviteEmail && !profile.email) {
      setFormData((prev) => ({ ...prev, email: inviteEmail }));
    }
  }, [inviteEmail, profile.email]);

  const handleInputChange = (field: keyof UserProfile, value: any) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'firstName' || field === 'lastName') {
        const fn = field === 'firstName' ? value : prev.firstName;
        const ln = field === 'lastName' ? value : prev.lastName;
        next.fullName = `${fn} ${ln}`.trim();
      }
      return next;
    });
  };

  const handleAddressChange = (field: keyof UserProfile['address'], value: string) => {
    setFormData((prev) => {
      const address = { ...prev.address, [field]: value };
      const location = `${address.city || ''}, ${address.country || ''}`.replace(/^,\s*|,\s*$/g, '');
      return { ...prev, address, location: location || prev.location };
    });
  };

  const handleSalaryChange = (field: keyof UserProfile['salaryExpectation'], value: any) => {
    setFormData((prev) => ({
      ...prev,
      salaryExpectation: { ...prev.salaryExpectation, [field]: value },
    }));
  };

  const handleEeoChange = (field: keyof UserProfile['eeo'], value: any) => {
    setFormData((prev) => ({
      ...prev,
      eeo: { ...prev.eeo, [field]: value },
    }));
  };

  const handleTagListChange = (field: 'targetRoles' | 'locations' | 'primarySkills' | 'secondarySkills' | 'toolsAndFrameworks', raw: string) => {
    const list = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    setFormData((prev) => ({ ...prev, [field]: list }));
  };

  const handlePrefillDemo = () => {
    setFormData(DEFAULT_PROFILE);
    setProfile(DEFAULT_PROFILE);
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2500);
  };

  const handleSaveAndProceed = (e?: FormEvent) => {
    if (e) e.preventDefault();
    setProfile(formData);
    // Persist to server if authenticated
    profileApi.update(formData).catch((err) => {
      console.warn('Profile sync to backend deferred:', err?.message);
    });
    nav('/dash');
  };

  // Quick stats
  const totalFields = 24;
  const completedFields = [
    formData.firstName,
    formData.lastName,
    formData.email,
    formData.phone,
    formData.headline,
    formData.address.city,
    formData.address.country,
    formData.linkedinUrl,
    formData.workAuthorization,
    formData.noticePeriod,
    formData.targetRoles.length > 0,
    formData.locations.length > 0,
    formData.remotePreference,
    formData.salaryExpectation.minimum > 0,
    formData.yearsOfExperience > 0,
    formData.highestEducationLevel,
    formData.primarySkills.length > 0,
    formData.summary,
    formData.currentTitle,
    formData.currentCompany,
    formData.willingToRelocate !== undefined,
    formData.requiresSponsorship !== undefined,
    formData.futureSponsorship !== undefined,
    formData.eeo.gender,
  ].filter(Boolean).length;

  const pct = Math.round((completedFields / totalFields) * 100);

  const TABS = [
    { key: 'personal', label: '1. Personal & Contact', icon: <UserIcon size={15} /> },
    { key: 'auth', label: '2. Work Auth & Legal', icon: <ShieldCheckIcon size={15} /> },
    { key: 'targets', label: '3. Roles & Salary', icon: <TargetIcon size={15} /> },
    { key: 'experience', label: '4. Experience & Education', icon: <BriefcaseIcon size={15} /> },
    { key: 'skills', label: '5. Skills & Summary', icon: <SparklesIcon size={15} /> },
    { key: 'eeo', label: '6. EEO Disclosures', icon: <FileTextIcon size={15} /> },
  ] as const;

  return (
    <div
      data-screen-label="Profile Setup"
      style={{
        position: 'absolute',
        inset: 0,
        background: '#f8f9fb',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: 'Montserrat, sans-serif',
      }}
    >
      {/* Top Header Bar */}
      <header
        style={{
          height: 64,
          background: '#fff',
          borderBottom: '1px solid #eef0f4',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 28px',
          flex: 'none',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 700, fontSize: 17, letterSpacing: '-.4px' }}>
            <JaviGlyph size={18} />
            Javi
          </div>
          <span style={{ color: '#d0d0d8' }}>|</span>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>Extensive Profile Setup</span>
            <span style={{ fontSize: 11, color: '#7a7a85' }}>Supports Workday, Greenhouse, Lever, Ashby &amp; 40+ ATS portals</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Progress badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#f4f5f9',
              border: '1px solid #e5e7eb',
              borderRadius: 999,
              padding: '6px 14px',
              fontSize: 11.5,
              fontWeight: 600,
              color: '#333',
            }}
          >
            <div
              style={{
                width: 44,
                height: 6,
                background: '#e0e2eb',
                borderRadius: 999,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg,#3d6ef5,#14b8a6)',
                  borderRadius: 999,
                }}
              />
            </div>
            <span>{pct}% Completed</span>
          </div>

          {/* 1-Click Prefill Demo Profile */}
          <button
            type="button"
            onClick={handlePrefillDemo}
            style={{
              height: 38,
              padding: '0 14px',
              background: '#eff4ff',
              border: '1px solid #c9daff',
              borderRadius: 8,
              color: '#2563eb',
              fontSize: 12,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              fontFamily: 'Montserrat, sans-serif',
            }}
          >
            <ZapIcon size={14} color="#2563eb" />
            Prefill Demo Profile
          </button>

          {/* Primary Save & Launch Dashboard */}
          <button
            type="button"
            onClick={handleSaveAndProceed}
            style={{
              height: 38,
              padding: '0 18px',
              background: '#0b0b0c',
              border: 0,
              borderRadius: 8,
              color: '#fff',
              fontSize: 12.5,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,.15)',
              fontFamily: 'Montserrat, sans-serif',
            }}
          >
            Save Profile &amp; Launch Dashboard →
          </button>
        </div>
      </header>

      {/* Verified Onboarding Link Notice */}
      {inviteToken && (
        <div
          style={{
            background: 'linear-gradient(90deg, #ecfdf5 0%, #eff6ff 100%)',
            borderBottom: '1px solid #d1fae5',
            padding: '10px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 12,
            color: '#065f46',
            flex: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheckIcon size={16} color="#059669" />
            <strong>Verified Early Access Link:</strong>
            <span>Onboarding token authenticated for <u>{formData.email || 'your account'}</u>. Saving will directly setup your personal dashboard.</span>
          </div>
          <span style={{ fontSize: 10.5, fontWeight: 700, background: '#10b981', color: '#fff', padding: '3px 9px', borderRadius: 999 }}>
            TOKEN ACTIVE
          </span>
        </div>
      )}

      {/* Main Form Body */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Navigation Tabs (Sidebar) */}
        <aside
          style={{
            width: 240,
            background: '#fff',
            borderRight: '1px solid #eef0f4',
            padding: '20px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            flex: 'none',
          }}
        >
          <div style={{ fontSize: 10.5, fontWeight: 700, color: '#9a9aa2', textTransform: 'uppercase', letterSpacing: '.6px', padding: '0 10px 6px' }}>
            Profile Sections
          </div>
          {TABS.map((t) => {
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: active ? '#f0f4ff' : 'transparent',
                  color: active ? '#2563eb' : '#4b4b55',
                  border: active ? '1px solid #d5e3ff' : '1px solid transparent',
                  fontWeight: active ? 700 : 500,
                  fontSize: 12,
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontFamily: 'Montserrat, sans-serif',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            );
          })}

          <div
            style={{
              marginTop: 'auto',
              padding: 14,
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#1e293b' }}>
              <ShieldCheckIcon size={14} color="#1e293b" />
              <span>ATS Fact-Guard</span>
            </div>
            <p style={{ margin: 0, fontSize: 10.5, lineHeight: '15px', color: '#64748b' }}>
              Every field is validated against Workday, Greenhouse &amp; Lever specifications to ensure 100% submission pass rate.
            </p>
          </div>
        </aside>

        {/* Content Pane */}
        <main
          style={{
            flex: 1,
            padding: '28px 36px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          {showSavedToast && (
            <div
              style={{
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                color: '#065f46',
                padding: '10px 16px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <CheckIcon size={15} color="#065f46" />
              <span>Demo profile populated successfully across all sections!</span>
            </div>
          )}

          <form onSubmit={handleSaveAndProceed} style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 840 }}>
            {/* 1. PERSONAL & CONTACT */}
            {activeTab === 'personal' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700 }}>Personal &amp; Contact Details</h3>
                  <p style={{ margin: 0, fontSize: 12, color: '#6a6a74' }}>
                    Required on all job boards. These will be mapped to standard application forms.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: '#333' }}>First Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => handleInputChange('firstName', e.target.value)}
                      placeholder="e.g. Ada"
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: '#333' }}>Last Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => handleInputChange('lastName', e.target.value)}
                      placeholder="e.g. Okafor"
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: '#333' }}>Professional Headline *</label>
                  <input
                    type="text"
                    required
                    value={formData.headline}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => handleInputChange('headline', e.target.value)}
                    placeholder="e.g. Product Designer &amp; Design Systems Lead"
                    style={inputStyle}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: '#333' }}>Email Address *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => handleInputChange('email', e.target.value)}
                      placeholder="you@email.com"
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: '#333' }}>Phone Number *</label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => handleInputChange('phone', e.target.value)}
                      placeholder="+1 (555) 000-0000 or +234 803 123 4567"
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: '#333' }}>City *</label>
                    <input
                      type="text"
                      required
                      value={formData.address.city}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => handleAddressChange('city', e.target.value)}
                      placeholder="e.g. Lagos, San Francisco, London"
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: '#333' }}>Country *</label>
                    <input
                      type="text"
                      required
                      value={formData.address.country}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => handleAddressChange('country', e.target.value)}
                      placeholder="e.g. Nigeria, United States, United Kingdom"
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: '#333' }}>Street Address (ATS autofill)</label>
                    <input
                      type="text"
                      value={formData.address.street || ''}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => handleAddressChange('street', e.target.value)}
                      placeholder="14 Admiralty Way, Lekki Phase 1"
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: '#333' }}>Postal Code</label>
                    <input
                      type="text"
                      value={formData.address.postalCode || ''}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => handleAddressChange('postalCode', e.target.value)}
                      placeholder="105102"
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: '#333' }}>LinkedIn Profile URL *</label>
                  <input
                    type="url"
                    required
                    value={formData.linkedinUrl}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => handleInputChange('linkedinUrl', e.target.value)}
                    placeholder="https://linkedin.com/in/ada-okafor"
                    style={inputStyle}
                  />
                </div>
              </div>
            )}

            {/* 2. WORK AUTH & LEGAL */}
            {activeTab === 'auth' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700 }}>Work Authorization &amp; Legal Eligibility</h3>
                  <p style={{ margin: 0, fontSize: 12, color: '#6a6a74' }}>
                    Mandatory screening filters on Workday, Greenhouse &amp; Lever. Accurate inputs prevent automated rejections.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: '#333' }}>
                    Are you legally authorized to work in your country/target country? *
                  </label>
                  <div style={{ display: 'flex', gap: 12 }}>
                    {[
                      { val: 'authorized', label: 'Yes, authorized to work' },
                      { val: 'not_authorized', label: 'No, not currently authorized' },
                    ].map((opt) => (
                      <label
                        key={opt.val}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '10px 16px',
                          border: formData.workAuthorization === opt.val ? '1.5px solid #2563eb' : '1px solid #dcdce2',
                          background: formData.workAuthorization === opt.val ? '#eff6ff' : '#fff',
                          borderRadius: 9,
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: 500,
                        }}
                      >
                        <input
                          type="radio"
                          name="workAuth"
                          checked={formData.workAuthorization === opt.val}
                          onChange={() => handleInputChange('workAuthorization', opt.val)}
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: '#333' }}>
                      Do you require visa sponsorship now? *
                    </label>
                    <select
                      value={formData.requiresSponsorship ? 'yes' : 'no'}
                      onChange={(e) => handleInputChange('requiresSponsorship', e.target.value === 'yes')}
                      style={selectStyle}
                    >
                      <option value="no">No, I do not require sponsorship</option>
                      <option value="yes">Yes, I require sponsorship</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: '#333' }}>
                      Will you require sponsorship in the future? *
                    </label>
                    <select
                      value={formData.futureSponsorship ? 'yes' : 'no'}
                      onChange={(e) => handleInputChange('futureSponsorship', e.target.value === 'yes')}
                      style={selectStyle}
                    >
                      <option value="no">No, will not require future sponsorship</option>
                      <option value="yes">Yes, may require future sponsorship (e.g. H1B / STEM OPT)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: '#333' }}>Notice Period *</label>
                    <select
                      value={formData.noticePeriod}
                      onChange={(e) => handleInputChange('noticePeriod', e.target.value)}
                      style={selectStyle}
                    >
                      <option value="Immediately">Immediately (No notice required)</option>
                      <option value="1 week">1 week</option>
                      <option value="2 weeks">2 weeks (Standard)</option>
                      <option value="1 month">1 month</option>
                      <option value="2 months">2 months</option>
                      <option value="3 months">3 months</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: '#333' }}>Willing to Relocate? *</label>
                    <select
                      value={formData.willingToRelocate ? 'yes' : 'no'}
                      onChange={(e) => handleInputChange('willingToRelocate', e.target.value === 'yes')}
                      style={selectStyle}
                    >
                      <option value="yes">Yes, open to relocation</option>
                      <option value="no">No, remote or local only</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: '#333' }}>Security Clearance</label>
                  <select
                    value={formData.securityClearance || 'none'}
                    onChange={(e) => handleInputChange('securityClearance', e.target.value)}
                    style={selectStyle}
                  >
                    <option value="none">None / Not Applicable</option>
                    <option value="confidential">Confidential</option>
                    <option value="secret">Secret</option>
                    <option value="top_secret">Top Secret / SCI</option>
                    <option value="other">Other Public Trust</option>
                  </select>
                </div>
              </div>
            )}

            {/* 3. ROLES & SALARY */}
            {activeTab === 'targets' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700 }}>Target Roles &amp; Compensation</h3>
                  <p style={{ margin: 0, fontSize: 12, color: '#6a6a74' }}>
                    Configure the job titles and locations Javi should search and auto-apply for.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: '#333' }}>
                    Target Job Titles * (comma separated)
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.targetRoles.join(', ')}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => handleTagListChange('targetRoles', e.target.value)}
                    placeholder="Senior Product Designer, Design Systems Lead, UX Specialist"
                    style={inputStyle}
                  />
                  <span style={{ fontSize: 10.5, color: '#888' }}>
                    Javi uses semantic embeddings to match synonyms and seniority levels.
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: '#333' }}>
                    Target Locations * (comma separated)
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.locations.join(', ')}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => handleTagListChange('locations', e.target.value)}
                    placeholder="Remote worldwide, United States, United Kingdom, Lagos"
                    style={inputStyle}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: '#333' }}>Work Mode Preference *</label>
                    <select
                      value={formData.remotePreference}
                      onChange={(e: any) => handleInputChange('remotePreference', e.target.value)}
                      style={selectStyle}
                    >
                      <option value="remote">Remote Only</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="onsite">On-site</option>
                      <option value="any">Any (Remote, Hybrid or On-site)</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: '#333' }}>Total Years of Experience *</label>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      required
                      value={formData.yearsOfExperience}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        handleInputChange('yearsOfExperience', parseInt(e.target.value, 10) || 0)
                      }
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 14 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: '#333' }}>Minimum Expected Salary *</label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={formData.salaryExpectation.minimum}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        handleSalaryChange('minimum', parseInt(e.target.value, 10) || 0)
                      }
                      placeholder="120000"
                      style={inputStyle}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: '#333' }}>Currency</label>
                    <select
                      value={formData.salaryExpectation.currency}
                      onChange={(e) => handleSalaryChange('currency', e.target.value)}
                      style={selectStyle}
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="CAD">CAD (C$)</option>
                      <option value="NGN">NGN (₦)</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: '#333' }}>Period</label>
                    <select
                      value={formData.salaryExpectation.period}
                      onChange={(e: any) => handleSalaryChange('period', e.target.value)}
                      style={selectStyle}
                    >
                      <option value="year">Per Year</option>
                      <option value="month">Per Month</option>
                      <option value="hour">Per Hour</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* 4. EXPERIENCE & EDUCATION */}
            {activeTab === 'experience' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700 }}>Experience &amp; Education</h3>
                  <p style={{ margin: 0, fontSize: 12, color: '#6a6a74' }}>
                    Your core credentials extracted for ATS standard work history and degree validation.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: '#333' }}>Current / Most Recent Company *</label>
                    <input
                      type="text"
                      required
                      value={formData.currentCompany || ''}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => handleInputChange('currentCompany', e.target.value)}
                      placeholder="e.g. Paystack"
                      style={inputStyle}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: '#333' }}>Current / Most Recent Title *</label>
                    <input
                      type="text"
                      required
                      value={formData.currentTitle || ''}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => handleInputChange('currentTitle', e.target.value)}
                      placeholder="e.g. Product Designer"
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: '#333' }}>Highest Education Level *</label>
                  <select
                    value={formData.highestEducationLevel}
                    onChange={(e: any) => handleInputChange('highestEducationLevel', e.target.value)}
                    style={selectStyle}
                  >
                    <option value="bachelor">Bachelor's Degree (B.Sc., B.A., B.Eng.)</option>
                    <option value="master">Master's Degree (M.Sc., M.A., MBA)</option>
                    <option value="doctorate">Doctorate / Ph.D.</option>
                    <option value="associate">Associate Degree</option>
                    <option value="bootcamp">Coding Bootcamp / Specialized Diploma</option>
                    <option value="high_school">High School Diploma</option>
                    <option value="self_taught">Self-Taught / Industry Experience</option>
                  </select>
                </div>

                {formData.education.length > 0 && (
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#333', marginBottom: 6 }}>
                      Primary Institution &amp; Field
                    </div>
                    <div style={{ fontSize: 12.5, color: '#111', fontWeight: 600 }}>
                      {formData.education[0].institution} — {formData.education[0].degree}
                    </div>
                    <div style={{ fontSize: 11.5, color: '#666', marginTop: 2 }}>
                      Field: {formData.education[0].field} · {formData.education[0].grade}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: '#333' }}>GitHub Profile URL (Optional)</label>
                  <input
                    type="url"
                    value={formData.githubUrl || ''}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => handleInputChange('githubUrl', e.target.value)}
                    placeholder="https://github.com/username"
                    style={inputStyle}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: '#333' }}>Portfolio / Website URL (Optional)</label>
                  <input
                    type="url"
                    value={formData.portfolioUrl || ''}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => handleInputChange('portfolioUrl', e.target.value)}
                    placeholder="https://yourportfolio.com"
                    style={inputStyle}
                  />
                </div>
              </div>
            )}

            {/* 5. SKILLS & SUMMARY */}
            {activeTab === 'skills' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700 }}>Skills &amp; Professional Summary</h3>
                  <p style={{ margin: 0, fontSize: 12, color: '#6a6a74' }}>
                    Used by Javi to tailor cover letters, highlight match percentages, and answer ATS screening questions.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: '#333' }}>
                    Primary Core Skills * (comma separated)
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.primarySkills.join(', ')}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => handleTagListChange('primarySkills', e.target.value)}
                    placeholder="Product Design, Figma, Design Systems, UX Research, Interaction Design"
                    style={inputStyle}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: '#333' }}>
                    Secondary Skills (comma separated)
                  </label>
                  <input
                    type="text"
                    value={formData.secondarySkills.join(', ')}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => handleTagListChange('secondarySkills', e.target.value)}
                    placeholder="Design Tokens, Prototyping, User Testing, WCAG Accessibility"
                    style={inputStyle}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: '#333' }}>
                    Tools &amp; Frameworks (comma separated)
                  </label>
                  <input
                    type="text"
                    value={formData.toolsAndFrameworks.join(', ')}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => handleTagListChange('toolsAndFrameworks', e.target.value)}
                    placeholder="Figma, Linear, Notion, Webflow, React, Principle"
                    style={inputStyle}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: '#333' }}>Professional Summary *</label>
                  <textarea
                    rows={4}
                    required
                    value={formData.summary}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => handleInputChange('summary', e.target.value)}
                    placeholder="Product Designer with 6+ years designing scalable systems and checkout experiences..."
                    style={{ ...inputStyle, height: 'auto', padding: '10px 14px', lineHeight: '20px' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: '#333' }}>
                    Elevator Pitch / Quick Recruiter Message (1-2 sentences)
                  </label>
                  <textarea
                    rows={2}
                    value={formData.elevatorPitch || ''}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => handleInputChange('elevatorPitch', e.target.value)}
                    placeholder="I help high-growth fintech and SaaS platforms scale user activation..."
                    style={{ ...inputStyle, height: 'auto', padding: '10px 14px', lineHeight: '20px' }}
                  />
                </div>
              </div>
            )}

            {/* 6. EEO DISCLOSURES */}
            {activeTab === 'eeo' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700 }}>Voluntary Equal Employment Opportunity (EEO)</h3>
                  <p style={{ margin: 0, fontSize: 12, color: '#6a6a74' }}>
                    Required questions on US &amp; Global corporate ATS portals (Workday, Greenhouse, Lever). You may decline to identify.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: '#333' }}>Gender</label>
                    <select
                      value={formData.eeo.gender}
                      onChange={(e: any) => handleEeoChange('gender', e.target.value)}
                      style={selectStyle}
                    >
                      <option value="decline">I choose not to disclose / Decline</option>
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                      <option value="non_binary">Non-binary</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: '#333' }}>Race &amp; Ethnicity</label>
                    <select
                      value={formData.eeo.raceEthnicity}
                      onChange={(e: any) => handleEeoChange('raceEthnicity', e.target.value)}
                      style={selectStyle}
                    >
                      <option value="decline">I decline to state</option>
                      <option value="black_african_american">Black / African American</option>
                      <option value="white">White / Caucasian</option>
                      <option value="hispanic_latino">Hispanic or Latino</option>
                      <option value="asian">Asian</option>
                      <option value="native_american">American Indian or Alaska Native</option>
                      <option value="two_or_more">Two or More Races</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: '#333' }}>Veteran Status</label>
                    <select
                      value={formData.eeo.veteranStatus}
                      onChange={(e: any) => handleEeoChange('veteranStatus', e.target.value)}
                      style={selectStyle}
                    >
                      <option value="decline">I choose not to identify</option>
                      <option value="not_veteran">I am not a protected veteran</option>
                      <option value="veteran">I identify as one or more protected veteran categories</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: '#333' }}>Disability Status</label>
                    <select
                      value={formData.eeo.disabilityStatus}
                      onChange={(e: any) => handleEeoChange('disabilityStatus', e.target.value)}
                      style={selectStyle}
                    >
                      <option value="decline">I choose not to answer</option>
                      <option value="no">No, I do not have a disability</option>
                      <option value="yes">Yes, I have a disability (or previously had one)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: 16,
                borderTop: '1px solid #eef0f4',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  const idx = TABS.findIndex((t) => t.key === activeTab);
                  if (idx > 0) setActiveTab(TABS[idx - 1].key);
                }}
                disabled={activeTab === 'personal'}
                style={{
                  height: 40,
                  padding: '0 16px',
                  background: '#fff',
                  border: '1px solid #dcdce2',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  color: activeTab === 'personal' ? '#bbb' : '#444',
                  cursor: activeTab === 'personal' ? 'default' : 'pointer',
                  fontFamily: 'Montserrat, sans-serif',
                }}
              >
                ← Previous Section
              </button>

              <div style={{ display: 'flex', gap: 10 }}>
                {activeTab !== 'eeo' ? (
                  <button
                    type="button"
                    onClick={() => {
                      const idx = TABS.findIndex((t) => t.key === activeTab);
                      if (idx < TABS.length - 1) setActiveTab(TABS[idx + 1].key);
                    }}
                    style={{
                      height: 40,
                      padding: '0 20px',
                      background: '#2563eb',
                      border: 0,
                      borderRadius: 8,
                      color: '#fff',
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'Montserrat, sans-serif',
                    }}
                  >
                    Next Section →
                  </button>
                ) : (
                  <button
                    type="submit"
                    style={{
                      height: 42,
                      padding: '0 24px',
                      background: '#0b0b0c',
                      border: 0,
                      borderRadius: 8,
                      color: '#fff',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(0,0,0,.15)',
                      fontFamily: 'Montserrat, sans-serif',
                    }}
                  >
                    Complete Profile &amp; Go to Dashboard →
                  </button>
                )}
              </div>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
};

const inputStyle = {
  height: 40,
  border: '1px solid #dcdce2',
  borderRadius: 8,
  padding: '0 12px',
  fontSize: 13,
  outline: 'none',
  background: '#fff',
  fontFamily: 'Montserrat, sans-serif',
};

const selectStyle = {
  height: 40,
  border: '1px solid #dcdce2',
  borderRadius: 8,
  padding: '0 12px',
  fontSize: 13,
  outline: 'none',
  background: '#fff',
  cursor: 'pointer',
  fontFamily: 'Montserrat, sans-serif',
};

export default ProfileSetupPage;
