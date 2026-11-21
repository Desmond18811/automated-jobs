import { useState, type FC } from 'react';
import { taxonomyApi } from '@/api';
import { CheckIcon, XIcon } from '@/assets/icons';

// ── Request Missing Option Modal ──────────────────────────────────────────────
interface RequestMissingModalProps {
  initialRole?: string;
  initialIndustry?: string;
  onClose: () => void;
}

export const RequestMissingModal: FC<RequestMissingModalProps> = ({
  initialRole = '',
  initialIndustry = '',
  onClose,
}) => {
  const [roleName, setRoleName] = useState(initialRole);
  const [industryName, setIndustryName] = useState(initialIndustry);
  const [context, setContext] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const isValid = roleName.trim().length >= 2 || industryName.trim().length >= 2;

  const handleSubmit = async () => {
    if (!isValid) return;
    setSubmitting(true);
    setError('');
    try {
      await taxonomyApi.requestOption({
        role_name: roleName.trim() || undefined,
        industry_name: industryName.trim() || undefined,
        context: context.trim() || undefined,
        email: email.trim() || undefined,
      });
      setDone(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(16, 24, 40, 0.55)',
          backdropFilter: 'blur(4px)',
        }}
      />
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 440,
          background: '#ffffff',
          borderRadius: 16,
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
          border: '1px solid #eaecf0',
          padding: 24,
          zIndex: 10,
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: '#101828', margin: 0 }}>
            Request missing role or industry
          </h3>
          <button
            onClick={onClose}
            type="button"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#667085',
              padding: 4,
            }}
          >
            <XIcon size={18} />
          </button>
        </div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: '#ecfdf3',
                color: '#027a48',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
              }}
            >
              <CheckIcon size={24} color="#027a48" />
            </div>
            <h4 style={{ fontSize: 16, fontWeight: 700, color: '#101828', margin: '0 0 6px' }}>
              Option Request Logged
            </h4>
            <p style={{ fontSize: 13, color: '#667085', margin: '0 0 20px', lineHeight: '20px' }}>
              Thank you! Our taxonomy team will review this role/industry and notify you by email once it's added.
            </p>
            <button
              onClick={onClose}
              type="button"
              style={{
                width: '100%',
                height: 42,
                borderRadius: 8,
                background: '#101828',
                color: '#ffffff',
                border: 'none',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 13, color: '#667085', margin: '0 0 16px', lineHeight: '20px' }}>
              Can't find your exact role or industry? Let us know what you need and Javi will index it.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#344054', display: 'block', marginBottom: 4 }}>
                  Target Role
                </label>
                <input
                  type="text"
                  placeholder="e.g. Embedded Firmware Engineer"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  style={{
                    width: '100%',
                    height: 40,
                    borderRadius: 8,
                    border: '1px solid #d0d5dd',
                    padding: '0 12px',
                    fontSize: 13.5,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#344054', display: 'block', marginBottom: 4 }}>
                  Industry
                </label>
                <input
                  type="text"
                  placeholder="e.g. Agritech & Precision Farming"
                  value={industryName}
                  onChange={(e) => setIndustryName(e.target.value)}
                  style={{
                    width: '100%',
                    height: 40,
                    borderRadius: 8,
                    border: '1px solid #d0d5dd',
                    padding: '0 12px',
                    fontSize: 13.5,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#344054', display: 'block', marginBottom: 4 }}>
                  Your Email (for notification)
                </label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    height: 40,
                    borderRadius: 8,
                    border: '1px solid #d0d5dd',
                    padding: '0 12px',
                    fontSize: 13.5,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#344054', display: 'block', marginBottom: 4 }}>
                  Additional Context (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Specific requirements, toolstack, or job links..."
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  style={{
                    width: '100%',
                    borderRadius: 8,
                    border: '1px solid #d0d5dd',
                    padding: '8px 12px',
                    fontSize: 13,
                    outline: 'none',
                    resize: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {error && <div style={{ fontSize: 12, color: '#d92d20' }}>{error}</div>}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1,
                  height: 42,
                  borderRadius: 8,
                  background: '#ffffff',
                  border: '1px solid #d0d5dd',
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: '#344054',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!isValid || submitting}
                onClick={handleSubmit}
                style={{
                  flex: 1,
                  height: 42,
                  borderRadius: 8,
                  background: '#101828',
                  border: 'none',
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: '#ffffff',
                  cursor: !isValid || submitting ? 'not-allowed' : 'pointer',
                  opacity: !isValid || submitting ? 0.6 : 1,
                }}
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

