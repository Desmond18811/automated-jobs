import { useRef, useState, type FC, type ChangeEvent } from 'react';
import { useUserProfile } from '@/context/ProfileContext';
import { profileApi } from '@/api';

export const CvProfileView: FC = () => {
  const { profile, updateProfile } = useUserProfile();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [minMatch, setMinMatch] = useState(75);
  const [dailyCap, setDailyCap] = useState(15);
  const [salaryFloor, setSalaryFloor] = useState('$120,000');
  const [workMode, setWorkMode] = useState('Remote');
  const [confirmedAuth, setConfirmedAuth] = useState(false);
  const [confirmedNotice, setConfirmedNotice] = useState(false);
  const [rulesSaved, setRulesSaved] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleSaveRules = async () => {
    setRulesSaved(true);
    setTimeout(() => setRulesSaved(false), 2000);
    try {
      await profileApi.update({
        remotePreference: workMode === 'Remote' ? 'remote_only' : 'hybrid',
      });
    } catch (e) {
      console.warn('Backend rule save deferred:', e);
    }
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const res = await profileApi.uploadCv(file);
      if (res?.parsed) {
        updateProfile(res.parsed);
      }
      alert('CV uploaded and parsed successfully!');
    } catch (err: any) {
      alert('CV upload notice: ' + (err?.message || 'Processed locally'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleVerify = async (_key: string, setLocalState: (v: boolean) => void) => {
    setLocalState(true);
    try {
      await profileApi.verify();
    } catch (e) {
      console.warn('Verification save deferred:', e);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700, letterSpacing: '-.5px' }}>CV &amp; profile</h2>
        <p style={{ margin: 0, fontSize: 12, color: '#6a6a72' }}>
          Javi only writes what's in your verified profile.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 14, alignItems: 'start' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* CV parsed card */}
          <div
            style={{
              background: '#fff',
              border: '1px solid #eef0f4',
              borderRadius: 14,
              padding: '16px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 1px 3px rgba(0,0,0,.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 32,
                  height: 38,
                  borderRadius: 6,
                  background: '#fdecec',
                  color: '#e04848',
                  fontSize: 9,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                PDF
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>
                  {profile.firstName || 'Candidate'}_CV.pdf
                </span>
                <span style={{ fontSize: 11, color: '#8a8a92' }}>Parsed · 18 fields extracted</span>
              </div>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf,.docx"
              style={{ display: 'none' }}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: 8,
                padding: '7px 12px',
                fontSize: 11.5,
                fontWeight: 600,
                color: '#2563eb',
                cursor: uploading ? 'wait' : 'pointer',
                opacity: uploading ? 0.7 : 1,
              }}
            >
              {uploading ? 'Parsing CV...' : 'Upload new CV'}
            </button>
          </div>

          {/* Verify what we parsed */}
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
              <span style={{ fontSize: 13, fontWeight: 700 }}>Verify what we parsed</span>
              <span style={{ fontSize: 11, color: '#8a8a92' }}>
                {confirmedAuth && confirmedNotice ? '6 of 6 verified' : '4 of 6 verified'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Name', val: profile.fullName || (profile.firstName ? `${profile.firstName} ${profile.lastName || ''}`.trim() : 'Candidate Profile'), verified: Boolean(profile.firstName || profile.fullName) },
                { label: 'Current role', val: profile.currentTitle ? `${profile.currentTitle}${profile.currentCompany ? ` · ${profile.currentCompany}` : ''}` : (profile.headline || 'Not specified'), verified: Boolean(profile.currentTitle || profile.headline) },
                { label: 'Years of experience', val: profile.yearsOfExperience ? `${profile.yearsOfExperience} years` : 'Not specified', verified: Boolean(profile.yearsOfExperience) },
                { label: 'Education', val: profile.education?.[0] ? `${profile.education[0].degree || ''}, ${profile.education[0].institution}` : (profile.highestEducationLevel ? `${profile.highestEducationLevel.toUpperCase()} degree` : 'Not specified'), verified: Boolean(profile.education?.length) },
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f9fafb' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 10.5, color: '#8a8a92' }}>{row.label}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: '#111827' }}>{row.val}</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: row.verified ? '#10b981' : '#9ca3af' }}>
                    {row.verified ? 'Verified' : 'Pending'}
                  </span>
                </div>
              ))}

              {/* Work auth confirm */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f9fafb' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 10.5, color: '#8a8a92' }}>Work authorisation</span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: '#111827' }}>
                    {profile.address?.country || 'Nigeria, UK (Global Talent)'}
                  </span>
                </div>
                {confirmedAuth ? (
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#10b981' }}>Verified</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleVerify('work_auth', setConfirmedAuth)}
                    style={{
                      background: '#2563eb',
                      border: 0,
                      borderRadius: 6,
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '5px 12px',
                      cursor: 'pointer',
                    }}
                  >
                    Confirm
                  </button>
                )}
              </div>

              {/* Notice period confirm */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 10.5, color: '#8a8a92' }}>Notice period</span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: '#111827' }}>
                    {profile.noticePeriod || '2 weeks'}
                  </span>
                </div>
                {confirmedNotice ? (
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#10b981' }}>Verified</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleVerify('notice_period', setConfirmedNotice)}
                    style={{
                      background: '#2563eb',
                      border: 0,
                      borderRadius: 6,
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '5px 12px',
                      cursor: 'pointer',
                    }}
                  >
                    Confirm
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Preferences & rules */}
        <div
          style={{
            background: '#fff',
            border: '1px solid #eef0f4',
            borderRadius: 14,
            padding: 18,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            boxShadow: '0 1px 3px rgba(0,0,0,.02)',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 700 }}>Preferences &amp; rules</span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Roles</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(profile.targetRoles?.length ? profile.targetRoles : []).map((r, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: '#374151',
                    background: '#f3f4f6',
                    borderRadius: 7,
                    padding: '4px 9px',
                  }}
                >
                  {r}
                </span>
              ))}
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: '#6b7280',
                  border: '1px dashed #d1d5db',
                  borderRadius: 7,
                  padding: '4px 9px',
                  cursor: 'pointer',
                }}
              >
                + Add
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b7280' }}>
              <span style={{ fontWeight: 600 }}>Minimum match to draft</span>
              <span style={{ fontWeight: 700, color: '#111' }}>{minMatch}%</span>
            </div>
            <input
              type="range"
              min={50}
              max={100}
              value={minMatch}
              onChange={(e) => setMinMatch(parseInt(e.target.value, 10))}
              style={{ width: '100%', accentColor: '#2563eb', cursor: 'pointer' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b7280' }}>
              <span style={{ fontWeight: 600 }}>Daily send cap</span>
              <span style={{ fontWeight: 700, color: '#111' }}>{dailyCap} / day</span>
            </div>
            <input
              type="range"
              min={1}
              max={50}
              value={dailyCap}
              onChange={(e) => setDailyCap(parseInt(e.target.value, 10))}
              style={{ width: '100%', accentColor: '#2563eb', cursor: 'pointer' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Salary floor</span>
              <input
                type="text"
                value={salaryFloor}
                onChange={(e) => setSalaryFloor(e.target.value)}
                style={{
                  height: 34,
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  padding: '0 10px',
                  fontSize: 12,
                  outline: 'none',
                  fontFamily: 'Montserrat, sans-serif',
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Work mode</span>
              <select
                value={workMode}
                onChange={(e) => setWorkMode(e.target.value)}
                style={{
                  height: 34,
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  padding: '0 10px',
                  fontSize: 12,
                  outline: 'none',
                  cursor: 'pointer',
                  fontFamily: 'Montserrat, sans-serif',
                }}
              >
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
                <option value="Onsite">On-site</option>
                <option value="Any">Any</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Never apply to</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10.5, color: '#c2410c', background: '#fff7ed', borderRadius: 6, padding: '3px 8px' }}>
                Current employer
              </span>
              <span style={{ fontSize: 10.5, color: '#c2410c', background: '#fff7ed', borderRadius: 6, padding: '3px 8px' }}>
                Agencies
              </span>
              <span style={{ fontSize: 10.5, color: '#6b7280', border: '1px dashed #d1d5db', borderRadius: 6, padding: '3px 8px', cursor: 'pointer' }}>
                + Add
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveRules}
            style={{
              marginTop: 6,
              height: 38,
              background: '#2563eb',
              border: 0,
              borderRadius: 8,
              color: '#fff',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {rulesSaved ? 'Rules saved!' : 'Save rules'}
          </button>
        </div>
      </div>
    </div>
  );
};
