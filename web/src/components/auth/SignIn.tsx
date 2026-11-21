import { useState, useEffect, type FC, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { GoogleLogo } from '@/assets/logos';
import { EyeIcon, EyeOffIcon } from '@/assets/icons';
import { AuthSplitLayout } from './AuthSplitLayout';
import { HandDrawnUnderline } from './HandDrawnUnderline';
import { GoogleAuthModal } from './GoogleAuthModal';
import { authApi, authStateStorage, getRouteForStage, tokenStorage } from '@/api';
import { useUserProfile } from '@/context/ProfileContext';

export const SignIn: FC = () => {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile } = useUserProfile();

  const [email, setEmail] = useState<string>(() => {
    return searchParams.get('email') || authStateStorage.getLastEmail() || '';
  });

  const [userName, setUserName] = useState<string>(() => {
    return (
      searchParams.get('name') ||
      authStateStorage.getLastName() ||
      profile.firstName ||
      (profile.fullName ? profile.fullName.split(' ')[0] : '') ||
      ''
    );
  });

  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  // If already authenticated with a valid token or Clerk session, route them immediately
  useEffect(() => {
    let mounted = true;

    const checkExistingAuth = async () => {
      const clerk = (window as any).Clerk;
      if (!tokenStorage.hasToken() && clerk?.session) {
        try {
          const clerkToken = await clerk.session.getToken();
          if (clerkToken && mounted) {
            tokenStorage.set(clerkToken);
          }
        } catch {}
      }

      if (tokenStorage.hasToken()) {
        try {
          const me = await authApi.getMe();
          if (me?.email && mounted) {
            authStateStorage.saveSession(me);
            const target = getRouteForStage(me.onboardingStage, me.email, me.name);
            nav(target, { replace: true });
            return;
          }
        } catch (err: any) {
          if (err?.status === 401) {
            tokenStorage.clear();
          } else if (clerk?.user && mounted) {
            // Server may be offline, but Clerk user is signed in
            nav('/dash', { replace: true });
            return;
          }
        }
      } else if (clerk?.user && mounted) {
        nav('/dash', { replace: true });
      }
    };

    checkExistingAuth();

    // Re-check when Clerk loads or session changes
    const clerk = (window as any).Clerk;
    if (clerk?.addListener) {
      const unsubscribe = clerk.addListener(() => {
        if (mounted) checkExistingAuth();
      });
      return () => {
        mounted = false;
        if (typeof unsubscribe === 'function') unsubscribe();
      };
    }

    return () => {
      mounted = false;
    };
  }, [nav]);

  // Dynamically personalize greeting if user enters a known email
  const handleEmailChange = (val: string) => {
    setEmail(val);
    const lower = val.toLowerCase();
    if (lower.includes('amaka') && !userName) setUserName('Amaka Okafor');
    else if (lower.includes('olivia') && !userName) setUserName('Olivia');
    else if (lower.includes('tunde') && !userName) setUserName('Tunde Adeleke');
    else if (lower.includes('zainab') && !userName) setUserName('Zainab Balogun');
    else if (lower.includes('babajide') && !userName) setUserName('Babajide Sanwo');
    else if (lower.includes('chioma') && !userName) setUserName('Chioma Okonkwo');
  };

  const firstName = userName ? userName.trim().split(' ')[0] : '';

  const handleSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setError('Please enter both your email and password');
      return;
    }

    setLoading(true);

    try {
      const res = await authApi.login({
        email: cleanEmail,
        password,
      });

      if (rememberMe) {
        authStateStorage.setLastEmail(cleanEmail);
      } else {
        localStorage.removeItem('javi_last_email');
      }

      if (res?.user?.name) {
        setUserName(res.user.name);
      }

      // Seamlessly route candidate based on their exact saved state in the funnel
      const target = getRouteForStage(res?.user?.onboardingStage, cleanEmail, res?.user?.name);
      nav(target);
    } catch (err: any) {
      console.warn('Login attempt:', err);
      setError(err?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    const clerk = (window as any).Clerk;
    if (clerk) {
      // 1. If user is already signed in to Clerk, prevent single-session conflict and route immediately
      if (clerk.session || clerk.user) {
        try {
          const t = await clerk.session?.getToken();
          if (t) tokenStorage.set(t);
        } catch {}
        nav('/dash');
        return;
      }

      // 2. Open Clerk sign-in modal if available
      if (clerk.openSignIn) {
        try {
          await clerk.openSignIn({ redirectUrl: '/dash' });
          return;
        } catch (e: any) {
          console.warn('Clerk openSignIn fallback', e);
          if (
            e?.code === 'cannot_render_single_session_enabled' ||
            String(e?.message || e).includes('single_session') ||
            clerk.user ||
            clerk.session
          ) {
            nav('/dash');
            return;
          }
        }
      }
    }
    setShowGoogleModal(true);
  };

  return (
    <AuthSplitLayout>
      <div data-screen-label="Sign in" style={{ width: '100%' }}>
        {/* Main Title & Subtitle (Strictly Personalized: Welcome back, {firstName}) */}
        <h1
          style={{
            margin: '0 0 8px',
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: '-0.025em',
            color: '#101828',
          }}
        >
          Welcome back{firstName ? `, ${firstName}` : ''}
        </h1>
        <p
          style={{
            margin: '0 0 28px',
            fontSize: 14,
            color: '#667085',
            lineHeight: '20px',
          }}
        >
          Welcome back! Please enter your details.
        </p>

        {/* Google Social Login Button */}
        <button
          type="button"
          onClick={handleGoogleAuth}
          style={{
            width: '100%',
            height: 44,
            border: '1px solid #d0d5dd',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            fontSize: 14,
            fontWeight: 600,
            color: '#344054',
            background: '#ffffff',
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#f9fafb')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
        >
          <GoogleLogo size={18} />
          Log in with Google
        </button>

        {/* Divider "or" */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            margin: '22px 0',
            color: '#667085',
            fontSize: 13,
          }}
        >
          <div style={{ flex: 1, height: 1, background: '#eaecf0' }} />
          <span>or</span>
          <div style={{ flex: 1, height: 1, background: '#eaecf0' }} />
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              background: '#fef3f2',
              border: '1px solid #fee4e2',
              color: '#d92d20',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 12.5,
              lineHeight: '18px',
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        {/* Sign In Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Email Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#344054' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              placeholder="Enter your email"
              required
              style={{
                width: '100%',
                boxSizing: 'border-box',
                height: 44,
                border: '1px solid #d0d5dd',
                borderRadius: 8,
                padding: '0 14px',
                fontSize: 14,
                outline: 'none',
                color: '#101828',
                background: '#ffffff',
                boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)',
                transition: 'border-color 0.15s ease',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
              onBlur={(e) => (e.target.style.borderColor = '#d0d5dd')}
            />
          </div>

          {/* Password Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#344054' }}>Password</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  height: 44,
                  border: '1px solid #d0d5dd',
                  borderRadius: 8,
                  padding: '0 42px 0 14px',
                  fontSize: 14,
                  outline: 'none',
                  color: '#101828',
                  background: '#ffffff',
                  boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)',
                  transition: 'border-color 0.15s ease',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
                onBlur={(e) => (e.target.style.borderColor = '#d0d5dd')}
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((prev) => !prev)}
                style={{
                  position: 'absolute',
                  right: 12,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#667085',
                }}
              >
                {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
              </button>
            </div>
          </div>

          {/* Remember Me & Forgot Password Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                color: '#344054',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 4,
                  border: '1px solid #d0d5dd',
                  accentColor: '#101828',
                  cursor: 'pointer',
                }}
              />
              Remember for 30 days
            </label>

            <Link
              to="/forgot-password"
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#344054',
                textDecoration: 'none',
              }}
            >
              Forgot password
            </Link>
          </div>

          {/* Primary Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              height: 44,
              background: '#101828',
              color: '#ffffff',
              borderRadius: 8,
              border: 'none',
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer',
              marginTop: 6,
              boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)',
              opacity: loading ? 0.7 : 1,
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#1d2939')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#101828')}
          >
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        {/* Bottom Switcher with Handcrafted Underline Accent (Strictly Matching Image 2) */}
        <div
          style={{
            textAlign: 'center',
            fontSize: 13.5,
            color: '#667085',
            marginTop: 26,
          }}
        >
          <span>Don't have an account? </span>
          <Link
            to="/signup"
            style={{
              color: '#101828',
              fontWeight: 700,
              textDecoration: 'none',
              position: 'relative',
              display: 'inline-block',
            }}
          >
            Sign up for free
            <HandDrawnUnderline width="105%" color="#101828" />
          </Link>
        </div>
      </div>

      {/* Google Sign In Handshake Modal */}
      <GoogleAuthModal
        isOpen={showGoogleModal}
        onClose={() => setShowGoogleModal(false)}
        defaultEmail={email}
        defaultName={userName}
      />
    </AuthSplitLayout>
  );
};

export default SignIn;
