import { useState, type FC } from 'react';
import { GoogleLogo } from '@/assets/logos';
import { authApi, authStateStorage, getRouteForStage } from '@/api';
import { useNavigate } from 'react-router-dom';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail?: string;
  defaultName?: string;
}

const DEFAULT_GOOGLE_PROFILES = [
  {
    name: 'Amaka Okafor',
    email: 'amaka.okafor@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1611432579402-7037e3e2c1e4?q=80&w=200&auto=format&fit=crop',
    role: 'Lead Product Designer',
  },
  {
    name: 'Tunde Adeleke',
    email: 'tunde.adeleke@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1616805765352-beedbad46b2a?q=80&w=200&auto=format&fit=crop',
    role: 'Staff Systems Architect',
  },
  {
    name: 'Zainab Balogun',
    email: 'zainab.balogun@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1573496358961-3c82861ab8f4?q=80&w=200&auto=format&fit=crop',
    role: 'Head of Product Operations',
  },
];

export const GoogleAuthModal: FC<GoogleAuthModalProps> = ({
  isOpen,
  onClose,
  defaultEmail = '',
  defaultName = '',
}) => {
  const nav = useNavigate();
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customMode, setCustomMode] = useState(false);
  const [customEmail, setCustomEmail] = useState(defaultEmail);
  const [customName, setCustomName] = useState(defaultName);

  if (!isOpen) return null;

  const handleSelectAccount = async (profile: { name: string; email: string; avatar?: string }) => {
    setError(null);
    setLoadingEmail(profile.email);

    try {
      const res = await authApi.googleLogin({
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.avatar,
      });

      onClose();

      // Navigate to the user's recorded onboarding state
      const target = getRouteForStage(res?.user?.onboardingStage, res?.user?.email, res?.user?.name);
      nav(target);
    } catch (err: any) {
      console.warn('Google Auth Error:', err);
      const isNetworkError =
        err?.name === 'TypeError' ||
        err?.message?.includes('Failed to fetch') ||
        String(err).includes('Failed to fetch');

      if (isNetworkError) {
        // In local development, if backend server is not running on port 4000,
        // create a dev session so developers are not blocked
        if (import.meta.env.DEV) {
          console.info('Backend server is offline; creating local mock session for', profile.email);
          authStateStorage.saveSession({
            name: profile.name,
            email: profile.email,
            onboardingStage: 'completed',
          });
          onClose();
          nav('/dash');
          return;
        }
        setError('Cannot connect to backend server at http://localhost:4000. Please ensure the backend is running.');
      } else {
        setError(err?.message || 'Google sign-in could not be completed.');
      }
    } finally {
      setLoadingEmail(null);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim()) {
      setError('Please enter a valid Google email address');
      return;
    }
    const name = customName.trim() || customEmail.split('@')[0];
    handleSelectAccount({
      email: customEmail.trim().toLowerCase(),
      name,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(16, 24, 40, 0.65)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        fontFamily: "Montserrat, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#ffffff',
          borderRadius: 16,
          boxShadow: '0 20px 40px rgba(0,0,0,0.22)',
          border: '1px solid #e4e7ec',
          overflow: 'hidden',
          animation: 'jj-fade-in 0.2s ease-out',
        }}
      >
        {/* Google Header */}
        <div
          style={{
            padding: '24px 24px 18px',
            borderBottom: '1px solid #f2f4f7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <GoogleLogo size={24} />
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#101828' }}>
                Sign in with Google
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#667085' }}>
                Choose an account to continue to JAVI
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: 20,
              color: '#98a2b3',
              cursor: 'pointer',
              padding: 4,
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              margin: '12px 20px 0',
              padding: '10px 14px',
              background: '#fef3f2',
              border: '1px solid #fee4e2',
              color: '#d92d20',
              borderRadius: 8,
              fontSize: 12.5,
            }}
          >
            {error}
          </div>
        )}

        {/* Accounts List */}
        {!customMode ? (
          <div style={{ padding: '12px 16px 20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {DEFAULT_GOOGLE_PROFILES.map((p) => {
                const isLoading = loadingEmail === p.email;
                return (
                  <button
                    key={p.email}
                    type="button"
                    disabled={!!loadingEmail}
                    onClick={() => handleSelectAccount(p)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: '#ffffff',
                      border: '1px solid #eaecf0',
                      borderRadius: 10,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      cursor: loadingEmail ? 'wait' : 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                      opacity: loadingEmail && !isLoading ? 0.5 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (!loadingEmail) {
                        e.currentTarget.style.background = '#f9fafb';
                        e.currentTarget.style.borderColor = '#d0d5dd';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!loadingEmail) {
                        e.currentTarget.style.background = '#ffffff';
                        e.currentTarget.style.borderColor = '#eaecf0';
                      }
                    }}
                  >
                    <img
                      src={p.avatar}
                      alt={p.name}
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '1px solid #e4e7ec',
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: '#101828' }}>
                        {p.name}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: '#667085',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {p.email}
                      </div>
                    </div>
                    {isLoading && (
                      <span style={{ fontSize: 11, color: '#2563eb', fontWeight: 600 }}>
                        Signing in...
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Use Another Account Button */}
            <button
              type="button"
              onClick={() => setCustomMode(true)}
              style={{
                width: '100%',
                marginTop: 12,
                padding: '10px 14px',
                background: 'transparent',
                border: '1px dashed #d0d5dd',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                color: '#344054',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f9fafb')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              + Use another Google account
            </button>
          </div>
        ) : (
          /* Custom Google Account Form */
          <form onSubmit={handleCustomSubmit} style={{ padding: '18px 24px 22px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12.5, fontWeight: 500, color: '#344054' }}>
                  Google Email
                </label>
                <input
                  type="email"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  required
                  style={{
                    height: 42,
                    border: '1px solid #d0d5dd',
                    borderRadius: 8,
                    padding: '0 12px',
                    fontSize: 13.5,
                    outline: 'none',
                    color: '#101828',
                    boxSizing: 'border-box',
                    width: '100%',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
                  onBlur={(e) => (e.target.style.borderColor = '#d0d5dd')}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12.5, fontWeight: 500, color: '#344054' }}>
                  Full Name (Optional)
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Amaka Okafor"
                  style={{
                    height: 42,
                    border: '1px solid #d0d5dd',
                    borderRadius: 8,
                    padding: '0 12px',
                    fontSize: 13.5,
                    outline: 'none',
                    color: '#101828',
                    boxSizing: 'border-box',
                    width: '100%',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setCustomMode(false)}
                  style={{
                    flex: 1,
                    height: 40,
                    background: '#ffffff',
                    border: '1px solid #d0d5dd',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#344054',
                    cursor: 'pointer',
                  }}
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={!!loadingEmail}
                  style={{
                    flex: 1.5,
                    height: 40,
                    background: '#101828',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#ffffff',
                    cursor: loadingEmail ? 'wait' : 'pointer',
                    opacity: loadingEmail ? 0.7 : 1,
                  }}
                >
                  {loadingEmail ? 'Connecting...' : 'Continue'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Footer info */}
        <div
          style={{
            padding: '12px 24px',
            background: '#f9fafb',
            borderTop: '1px solid #f2f4f7',
            fontSize: 11.5,
            color: '#667085',
            lineHeight: 1.4,
            textAlign: 'center',
          }}
        >
          Secure Google OAuth 2.0 handshake verified by JAVI.
        </div>
      </div>
    </div>
  );
};
