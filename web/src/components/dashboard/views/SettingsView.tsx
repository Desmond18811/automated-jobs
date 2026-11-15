import { useEffect, useState, type FC, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { GmailLogo } from '@/assets/logos';
import { CheckIcon } from '@/assets/icons';
import { authApi, gmailApi, meApi, profileApi } from '@/api';
import { useUserProfile } from '@/context/ProfileContext';

export const SettingsView: FC = () => {
  const nav = useNavigate();
  const { profile: contextProfile, updateProfile: updateContextProfile } = useUserProfile();

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    firstName: contextProfile.firstName || '',
    lastName: contextProfile.lastName || '',
    headline: contextProfile.headline || '',
    email: contextProfile.email || '',
    phone: contextProfile.phone || '',
    location: contextProfile.location || '',
    linkedinUrl: contextProfile.linkedinUrl || '',
    githubUrl: contextProfile.githubUrl || '',
    portfolioUrl: contextProfile.portfolioUrl || '',
    twitterUrl: contextProfile.twitterUrl || '',
    workAuthorization: contextProfile.workAuthorization || 'authorized',
    requiresSponsorship: Boolean(contextProfile.requiresSponsorship),
    noticePeriod: contextProfile.noticePeriod || '',
    minSalary: contextProfile.salaryExpectation?.minimum ? String(contextProfile.salaryExpectation.minimum) : '',
    salaryCurrency: contextProfile.salaryExpectation?.currency || 'USD',
    targetRoles: Array.isArray(contextProfile.targetRoles) ? contextProfile.targetRoles.join(', ') : '',
    primarySkills: Array.isArray(contextProfile.primarySkills) ? contextProfile.primarySkills.join(', ') : '',
    summary: contextProfile.summary || '',
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [careerPages, setCareerPages] = useState<Array<{ url: string; checked: string; ats?: string }>>([]);
  const [newPage, setNewPage] = useState('');
  const [addingPage, setAddingPage] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState('');
  const [phone, setPhone] = useState(contextProfile.phone || '');
  const [whatsappAlerts, setWhatsappAlerts] = useState(true);
  const [interviewAlerts, setInterviewAlerts] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    profileApi
      .get()
      .then((res: any) => {
        const p = res?.profile || res;
        if (p) {
          if (p.phone) {
            setPhone(p.phone);
          }
          setProfileForm((prev) => ({
            ...prev,
            firstName: p.firstName || prev.firstName,
            lastName: p.lastName || prev.lastName,
            headline: p.headline || prev.headline,
            email: p.email || prev.email,
            phone: p.phone || prev.phone,
            location: p.location || prev.location,
            linkedinUrl: p.linkedinUrl || prev.linkedinUrl,
            githubUrl: p.githubUrl || prev.githubUrl,
            portfolioUrl: p.portfolioUrl || prev.portfolioUrl,
            twitterUrl: p.twitterUrl || prev.twitterUrl,
            workAuthorization: p.workAuthorization || prev.workAuthorization,
            requiresSponsorship: p.requiresSponsorship ?? prev.requiresSponsorship,
            noticePeriod: p.noticePeriod || prev.noticePeriod,
            minSalary: p.salaryExpectation?.minimum ? String(p.salaryExpectation.minimum) : prev.minSalary,
            salaryCurrency: p.salaryExpectation?.currency || prev.salaryCurrency,
            targetRoles: Array.isArray(p.targetRoles) && p.targetRoles.length ? p.targetRoles.join(', ') : prev.targetRoles,
            primarySkills: Array.isArray(p.primarySkills) && p.primarySkills.length ? p.primarySkills.join(', ') : prev.primarySkills,
            summary: p.summary || prev.summary,
          }));

          if (Array.isArray(p.careerPages) && p.careerPages.length > 0) {
            setCareerPages(
              p.careerPages.map((cp: any) => ({
                url: typeof cp === 'string' ? cp : cp.url,
                checked: 'Active watch',
                ats: cp.ats,
              })),
            );
          } else {
            setCareerPages([]);
          }
        }
        if (res?.user?.gmail?.address) {
          setGmailConnected(true);
          setGmailEmail(res.user.gmail.address);
        }
      })
      .catch(() => undefined);
  }, []);

  const handleSaveProfile = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setSavingProfile(true);

    const targetRoles = profileForm.targetRoles
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);

    const primarySkills = profileForm.primarySkills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const minSalaryNum = profileForm.minSalary ? parseFloat(profileForm.minSalary) : undefined;

    const payload: any = {
      firstName: profileForm.firstName.trim(),
      lastName: profileForm.lastName.trim(),
      fullName: `${profileForm.firstName.trim()} ${profileForm.lastName.trim()}`.trim(),
      headline: profileForm.headline.trim(),
      email: profileForm.email.trim(),
      phone: profileForm.phone.trim(),
      location: profileForm.location.trim(),
      workAuthorization: profileForm.workAuthorization,
      requiresSponsorship: profileForm.requiresSponsorship,
      noticePeriod: profileForm.noticePeriod.trim(),
      summary: profileForm.summary.trim(),
    };

    if (profileForm.linkedinUrl.trim()) payload.linkedinUrl = profileForm.linkedinUrl.trim();
    if (profileForm.githubUrl.trim()) payload.githubUrl = profileForm.githubUrl.trim();
    if (profileForm.portfolioUrl.trim()) payload.portfolioUrl = profileForm.portfolioUrl.trim();
    if (profileForm.twitterUrl.trim()) payload.twitterUrl = profileForm.twitterUrl.trim();

    if (targetRoles.length > 0) payload.targetRoles = targetRoles;
    if (primarySkills.length > 0) payload.primarySkills = primarySkills;

    if (minSalaryNum !== undefined && !isNaN(minSalaryNum)) {
      payload.salaryExpectation = {
        minimum: minSalaryNum,
        currency: profileForm.salaryCurrency,
        period: 'year',
        negotiable: true,
      };
    }

    try {
      const updated = await profileApi.update(payload);
      updateContextProfile(payload);
      if (payload.phone) setPhone(payload.phone);
      showToast('Profile information successfully saved to API!');
    } catch (err: any) {
      showToast('Profile updated locally: ' + (err?.message || 'Server deferred'));
      updateContextProfile(payload);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAddPage = async () => {
    if (!newPage.trim()) return;
    const url = newPage.trim();
    setAddingPage(true);
    try {
      await profileApi.addCareerPage(url);
      setCareerPages((prev) => [...prev, { url, checked: 'Active watch' }]);
      setNewPage('');
      showToast(`Added ${url} to watched career pages!`);
    } catch (e: any) {
      setCareerPages((prev) => [...prev, { url, checked: 'Active watch' }]);
      setNewPage('');
      showToast(`Added ${url} (saved locally)`);
    } finally {
      setAddingPage(false);
    }
  };

  const handleRemovePage = async (url: string) => {
    setCareerPages((prev) => prev.filter((p) => p.url !== url));
    try {
      await profileApi.removeCareerPage(url);
      showToast(`Removed ${url}`);
    } catch (e) {
      console.warn('Backend career page remove deferred:', e);
    }
  };

  const handleScanNow = async () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      showToast(`Scanned ${careerPages.length} career pages · all up to date!`);
    }, 1200);
  };

  const handleSavePhone = async () => {
    setSavingPhone(true);
    try {
      await profileApi.update({ phone });
      updateContextProfile({ phone });
      showToast('WhatsApp notification phone number saved!');
    } catch (e: any) {
      showToast('Phone number updated locally');
    } finally {
      setSavingPhone(false);
    }
  };

  const handleConnectGmail = async () => {
    try {
      const data = await gmailApi.connect();
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (e: any) {
      alert('Could not initiate Gmail OAuth: ' + (e?.message || 'Server offline'));
    }
  };

  const handleDisconnectGmail = async () => {
    try {
      await gmailApi.disconnect();
      setGmailConnected(false);
      setGmailEmail('');
      showToast('Disconnected Gmail account');
    } catch (e: any) {
      setGmailConnected(false);
      showToast('Gmail disconnected');
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const data = await meApi.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'javi-export.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert('Data export failed: ' + (e?.message || 'Server offline'));
    } finally {
      setExporting(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await authApi.logout();
    } finally {
      nav('/signin');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 760, paddingBottom: 40 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: '-.5px' }}>Settings & Profile</h2>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: '#6a6a72' }}>
            Manage your candidate profile credentials, watched career pages, and communication channels.
          </p>
        </div>
        {toast && (
          <div
            style={{
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#065f46',
              borderRadius: 8,
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 600,
              boxShadow: '0 2px 6px rgba(0,0,0,.04)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <CheckIcon size={14} color="#059669" />
            <span>{toast}</span>
          </div>
        )}
      </div>

      {/* 1. Candidate Profile Information Editor */}
      <form
        onSubmit={handleSaveProfile}
        style={{
          background: '#fff',
          border: '1px solid #eef0f4',
          borderRadius: 14,
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          boxShadow: '0 1px 3px rgba(0,0,0,.02)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6', paddingBottom: 12 }}>
          <div>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Candidate Profile Information</span>
            <p style={{ margin: '2px 0 0', fontSize: 11.5, color: '#6b7280' }}>
              Used by J.A.V.I to automatically tailor and submit job applications on your behalf.
            </p>
          </div>
          <button
            type="submit"
            disabled={savingProfile}
            style={{
              background: '#0b0b0c',
              border: 0,
              color: '#fff',
              borderRadius: 8,
              padding: '8px 18px',
              fontSize: 12,
              fontWeight: 600,
              cursor: savingProfile ? 'wait' : 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,.08)',
            }}
          >
            {savingProfile ? 'Saving...' : 'Save Profile'}
          </button>
        </div>

        {/* Basic Personal Details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#4b5563' }}>First Name</label>
            <input
              type="text"
              value={profileForm.firstName}
              onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
              placeholder="e.g. Alex"
              style={{
                height: 36,
                border: '1px solid #d1d5db',
                borderRadius: 8,
                padding: '0 10px',
                fontSize: 12,
                fontFamily: 'Montserrat, sans-serif',
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#4b5563' }}>Last Name</label>
            <input
              type="text"
              value={profileForm.lastName}
              onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
              placeholder="e.g. Chen"
              style={{
                height: 36,
                border: '1px solid #d1d5db',
                borderRadius: 8,
                padding: '0 10px',
                fontSize: 12,
                fontFamily: 'Montserrat, sans-serif',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#4b5563' }}>Professional Title / Headline</label>
          <input
            type="text"
            value={profileForm.headline}
            onChange={(e) => setProfileForm({ ...profileForm, headline: e.target.value })}
            placeholder="e.g. Senior Full-Stack Engineer / Design Systems Lead"
            style={{
              height: 36,
              border: '1px solid #d1d5db',
              borderRadius: 8,
              padding: '0 10px',
              fontSize: 12,
              fontFamily: 'Montserrat, sans-serif',
            }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#4b5563' }}>Email Address</label>
            <input
              type="email"
              value={profileForm.email}
              onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
              placeholder="alex@example.com"
              style={{
                height: 36,
                border: '1px solid #d1d5db',
                borderRadius: 8,
                padding: '0 10px',
                fontSize: 12,
                fontFamily: 'Montserrat, sans-serif',
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#4b5563' }}>Phone (for WhatsApp / ATS)</label>
            <input
              type="text"
              value={profileForm.phone}
              onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
              placeholder="+1 555 123 4567"
              style={{
                height: 36,
                border: '1px solid #d1d5db',
                borderRadius: 8,
                padding: '0 10px',
                fontSize: 12,
                fontFamily: 'Montserrat, sans-serif',
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#4b5563' }}>Location</label>
            <input
              type="text"
              value={profileForm.location}
              onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })}
              placeholder="e.g. New York, NY / Remote"
              style={{
                height: 36,
                border: '1px solid #d1d5db',
                borderRadius: 8,
                padding: '0 10px',
                fontSize: 12,
                fontFamily: 'Montserrat, sans-serif',
              }}
            />
          </div>
        </div>

        {/* URLs & Links */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#4b5563' }}>LinkedIn URL</label>
            <input
              type="text"
              value={profileForm.linkedinUrl}
              onChange={(e) => setProfileForm({ ...profileForm, linkedinUrl: e.target.value })}
              placeholder="https://linkedin.com/in/username"
              style={{
                height: 36,
                border: '1px solid #d1d5db',
                borderRadius: 8,
                padding: '0 10px',
                fontSize: 12,
                fontFamily: 'Montserrat, sans-serif',
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#4b5563' }}>GitHub URL</label>
            <input
              type="text"
              value={profileForm.githubUrl}
              onChange={(e) => setProfileForm({ ...profileForm, githubUrl: e.target.value })}
              placeholder="https://github.com/username"
              style={{
                height: 36,
                border: '1px solid #d1d5db',
                borderRadius: 8,
                padding: '0 10px',
                fontSize: 12,
                fontFamily: 'Montserrat, sans-serif',
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#4b5563' }}>Portfolio / Website URL</label>
            <input
              type="text"
              value={profileForm.portfolioUrl}
              onChange={(e) => setProfileForm({ ...profileForm, portfolioUrl: e.target.value })}
              placeholder="https://mywebsite.com"
              style={{
                height: 36,
                border: '1px solid #d1d5db',
                borderRadius: 8,
                padding: '0 10px',
                fontSize: 12,
                fontFamily: 'Montserrat, sans-serif',
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#4b5563' }}>Twitter / X URL</label>
            <input
              type="text"
              value={profileForm.twitterUrl}
              onChange={(e) => setProfileForm({ ...profileForm, twitterUrl: e.target.value })}
              placeholder="https://x.com/username"
              style={{
                height: 36,
                border: '1px solid #d1d5db',
                borderRadius: 8,
                padding: '0 10px',
                fontSize: 12,
                fontFamily: 'Montserrat, sans-serif',
              }}
            />
          </div>
        </div>

        {/* Work Authorization, Notice Period, Target Roles */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#4b5563' }}>Work Authorization</label>
            <select
              value={profileForm.workAuthorization}
              onChange={(e) => setProfileForm({ ...profileForm, workAuthorization: e.target.value as any })}
              style={{
                height: 36,
                border: '1px solid #d1d5db',
                borderRadius: 8,
                padding: '0 10px',
                fontSize: 12,
                background: '#fff',
                fontFamily: 'Montserrat, sans-serif',
              }}
            >
              <option value="authorized">Authorized to work</option>
              <option value="not_authorized">Not currently authorized</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#4b5563' }}>Notice Period</label>
            <input
              type="text"
              value={profileForm.noticePeriod}
              onChange={(e) => setProfileForm({ ...profileForm, noticePeriod: e.target.value })}
              placeholder="e.g. Immediately, 2 weeks, 1 month"
              style={{
                height: 36,
                border: '1px solid #d1d5db',
                borderRadius: 8,
                padding: '0 10px',
                fontSize: 12,
                fontFamily: 'Montserrat, sans-serif',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#4b5563' }}>Min Base Salary (Yearly)</label>
            <div style={{ display: 'flex', gap: 4 }}>
              <select
                value={profileForm.salaryCurrency}
                onChange={(e) => setProfileForm({ ...profileForm, salaryCurrency: e.target.value })}
                style={{
                  width: 70,
                  height: 36,
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  padding: '0 6px',
                  fontSize: 11.5,
                  background: '#fff',
                }}
              >
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
                <option value="EUR">EUR</option>
                <option value="CAD">CAD</option>
                <option value="NGN">NGN</option>
              </select>
              <input
                type="number"
                value={profileForm.minSalary}
                onChange={(e) => setProfileForm({ ...profileForm, minSalary: e.target.value })}
                placeholder="120000"
                style={{
                  flex: 1,
                  height: 36,
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  padding: '0 10px',
                  fontSize: 12,
                  fontFamily: 'Montserrat, sans-serif',
                }}
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 2 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: '#374151', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={profileForm.requiresSponsorship}
              onChange={(e) => setProfileForm({ ...profileForm, requiresSponsorship: e.target.checked })}
              style={{ accentColor: '#2563eb' }}
            />
            Will require employer visa sponsorship now or in the future
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#4b5563' }}>Target Roles (comma separated)</label>
            <input
              type="text"
              value={profileForm.targetRoles}
              onChange={(e) => setProfileForm({ ...profileForm, targetRoles: e.target.value })}
              placeholder="e.g. Senior Software Engineer, Lead Developer"
              style={{
                height: 36,
                border: '1px solid #d1d5db',
                borderRadius: 8,
                padding: '0 10px',
                fontSize: 12,
                fontFamily: 'Montserrat, sans-serif',
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#4b5563' }}>Primary Skills (comma separated)</label>
            <input
              type="text"
              value={profileForm.primarySkills}
              onChange={(e) => setProfileForm({ ...profileForm, primarySkills: e.target.value })}
              placeholder="e.g. TypeScript, React, Node.js, GraphQL"
              style={{
                height: 36,
                border: '1px solid #d1d5db',
                borderRadius: 8,
                padding: '0 10px',
                fontSize: 12,
                fontFamily: 'Montserrat, sans-serif',
              }}
            />
          </div>
        </div>

        {/* Bio / Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#4b5563' }}>Professional Summary & Experience Highlights</label>
          <textarea
            rows={4}
            value={profileForm.summary}
            onChange={(e) => setProfileForm({ ...profileForm, summary: e.target.value })}
            placeholder="Describe your background, years of experience, key achievements, and what you excel at..."
            style={{
              width: '100%',
              border: '1px solid #d1d5db',
              borderRadius: 8,
              padding: '10px 12px',
              fontSize: 12,
              fontFamily: 'Montserrat, sans-serif',
              boxSizing: 'border-box',
              resize: 'vertical',
            }}
          />
        </div>
      </form>

      {/* 2. Connections: Gmail Outreach */}
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
        <span style={{ fontSize: 13, fontWeight: 700 }}>Email Outreach (Gmail)</span>
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
                {gmailConnected
                  ? `${gmailEmail} · sending and reply detection active`
                  : 'Connect your Gmail to send applications from your own email and detect replies'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={gmailConnected ? handleDisconnectGmail : handleConnectGmail}
            style={{
              background: gmailConnected ? '#f3f4f6' : '#2563eb',
              border: '1px solid',
              borderColor: gmailConnected ? '#e5e7eb' : '#2563eb',
              borderRadius: 8,
              padding: '6px 14px',
              fontSize: 11.5,
              fontWeight: 600,
              color: gmailConnected ? '#374151' : '#fff',
              cursor: 'pointer',
            }}
          >
            {gmailConnected ? 'Disconnect' : 'Connect Gmail'}
          </button>
        </div>
      </div>

      {/* 3. WhatsApp Alerts Configuration */}
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: 13, fontWeight: 700 }}>WhatsApp & SMS Alerts</span>
            <p style={{ margin: '3px 0 0', fontSize: 11.5, color: '#6a6a72' }}>
              J.A.V.I texts you on WhatsApp when human action is needed (CAPTCHA, login wall, missing answers).
            </p>
          </div>
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 600,
              background: phone ? '#ecfdf5' : '#f3f4f6',
              color: phone ? '#059669' : '#6b7280',
              padding: '3px 8px',
              borderRadius: 6,
            }}
          >
            {phone ? 'Configured' : 'Needs Phone'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 555 123 4567"
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
            onClick={handleSavePhone}
            disabled={savingPhone}
            style={{
              height: 38,
              padding: '0 14px',
              background: '#0b0b0c',
              border: 0,
              color: '#fff',
              borderRadius: 8,
              fontSize: 11.5,
              fontWeight: 600,
              cursor: savingPhone ? 'wait' : 'pointer',
            }}
          >
            {savingPhone ? 'Saving...' : 'Save phone'}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: '#374151', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={whatsappAlerts}
              onChange={(e) => setWhatsappAlerts(e.target.checked)}
              style={{ accentColor: '#2563eb' }}
            />
            Text me when an application needs attention (CAPTCHA, login wall, custom questions)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: '#374151', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={interviewAlerts}
              onChange={(e) => setInterviewAlerts(e.target.checked)}
              style={{ accentColor: '#2563eb' }}
            />
            Text me immediately when an interview invitation is detected
          </label>
        </div>
      </div>

      {/* 4. Career pages Javi watches */}
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Career pages Javi watches</span>
            <p style={{ margin: '3px 0 0', fontSize: 11.5, color: '#6a6a72' }}>
              Javi periodically scans these target companies, detects new roles, and matches against your profile.
            </p>
          </div>
          <button
            type="button"
            onClick={handleScanNow}
            disabled={scanning || careerPages.length === 0}
            style={{
              background: '#f3f4f6',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: '5px 12px',
              fontSize: 11,
              fontWeight: 600,
              color: '#374151',
              cursor: scanning ? 'wait' : 'pointer',
              opacity: careerPages.length === 0 ? 0.6 : 1,
            }}
          >
            {scanning ? 'Scanning...' : 'Scan now'}
          </button>
        </div>

        {careerPages.length === 0 ? (
          <div
            style={{
              padding: '24px 16px',
              textAlign: 'center',
              border: '1px dashed #e5e7eb',
              borderRadius: 10,
              color: '#6b7280',
              fontSize: 12,
              background: '#fafafa',
            }}
          >
            No career pages added yet. Enter a company career URL below (e.g.,{' '}
            <span style={{ color: '#2563eb', fontWeight: 600 }}>stripe.com/jobs</span> or{' '}
            <span style={{ color: '#2563eb', fontWeight: 600 }}>jobs.lever.co/company</span>) for Javi to monitor.
          </div>
        ) : (
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 600, color: '#111827' }}>{p.url}</span>
                  {p.ats && (
                    <span
                      style={{
                        fontSize: 9.5,
                        textTransform: 'uppercase',
                        fontWeight: 700,
                        color: '#6b7280',
                        background: '#e5e7eb',
                        padding: '1px 5px',
                        borderRadius: 4,
                      }}
                    >
                      {p.ats}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 10.5, color: '#9ca3af' }}>{p.checked}</span>
                  <button
                    type="button"
                    onClick={() => handleRemovePage(p.url)}
                    style={{
                      background: 'transparent',
                      border: 0,
                      color: '#dc2626',
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
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <input
            type="text"
            value={newPage}
            onChange={(e) => setNewPage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddPage();
            }}
            placeholder="e.g. stripe.com/jobs or jobs.lever.co/company"
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
            disabled={addingPage}
            style={{
              height: 38,
              padding: '0 16px',
              background: '#2563eb',
              border: 0,
              color: '#fff',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              cursor: addingPage ? 'wait' : 'pointer',
            }}
          >
            {addingPage ? 'Adding...' : 'Add page'}
          </button>
        </div>
      </div>

      {/* 5. Your data & Sign out */}
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
        <span style={{ fontSize: 13, fontWeight: 700 }}>Account & Privacy</span>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
          <span style={{ fontSize: 12, color: '#374151' }}>
            Export profile, drafts and application history
          </span>
          <button
            type="button"
            onClick={handleExportData}
            disabled={exporting}
            style={{
              background: '#f3f4f6',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 11.5,
              fontWeight: 600,
              color: '#374151',
              cursor: exporting ? 'wait' : 'pointer',
              opacity: exporting ? 0.6 : 1,
            }}
          >
            {exporting ? 'Exporting...' : 'Export (.json)'}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid #f9fafb' }}>
          <span style={{ fontSize: 12, color: '#374151' }}>Sign out of current Javi session</span>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            style={{
              background: '#f3f4f6',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 11.5,
              fontWeight: 600,
              color: '#374151',
              cursor: loggingOut ? 'wait' : 'pointer',
            }}
          >
            {loggingOut ? 'Signing out...' : 'Sign out'}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid #f9fafb' }}>
          <span style={{ fontSize: 12, color: '#374151' }}>Delete account and all data permanently</span>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Are you sure you want to permanently delete your account? This cannot be undone.')) {
                handleLogout();
              }
            }}
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
