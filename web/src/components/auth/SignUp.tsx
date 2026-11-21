import { useState, useEffect, type FC, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogo } from '@/assets/logos';
import { EyeIcon, EyeOffIcon, CheckIcon } from '@/assets/icons';
import { AuthSplitLayout } from './AuthSplitLayout';
import { HandDrawnUnderline } from './HandDrawnUnderline';
import { authApi, tokenStorage } from '@/api';

export const SignUp: FC = () => {
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already authenticated with Clerk or local token, route them to onboarding
  useEffect(() => {
    const clerk = (window as any).Clerk;
    if (clerk?.user || tokenStorage.hasToken()) {
      nav('/setup', { replace: true });
    }
  }, [nav]);

  // Password validation indicators
  const hasMinLength = password.length >= 8;
  const hasSpecialOrNumber = /[0-9!@#$%^&*(),.?":{}|<>]/.test(password);

  const handleSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    if (!hasMinLength) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const res = await authApi.register({
        email: cleanEmail,
        password,
        name: name.trim(),
      });

      // Navigate to OTP verification page with candidate email
      nav(`/verify-otp?email=${encodeURIComponent(cleanEmail)}&name=${encodeURIComponent(name.trim())}`);
    } catch (err: any) {
      console.warn('Registration attempt:', err);
      setError(err?.message || 'Registration failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    const clerk = (window as any).Clerk;
    if (clerk) {
      if (clerk.session || clerk.user) {
        nav('/setup');
        return;
      }
      if (clerk.openSignUp) {
        try {
          await clerk.openSignUp({ redirectUrl: '/setup' });
          return;
        } catch (e: any) {
          console.warn('Clerk openSignUp fallback', e);
          if (
            e?.code === 'cannot_render_single_session_enabled' ||
            String(e?.message || e).includes('single_session') ||
            clerk.user ||
            clerk.session
          ) {
            nav('/setup');
            return;
          }
        }
      }
    }
    handleSubmit();
  };

  return (
    <AuthSplitLayout>
      <div data-screen-label="Sign up" style={{ width: '100%' }}>
        {/* Main Title & Subtitle */}
        <h1
          style={{
            margin: '0 0 8px',
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: '-0.025em',
            color: '#101828',
          }}
        >
          Start your 14-day trial
        </h1>
        <p
          style={{
            margin: '0 0 26px',
            fontSize: 14,
            color: '#667085',
            lineHeight: '20px',
          }}
        >
          Get started immediately. No credit card required, cancel anytime.
        </p>

        {/* Google Social Sign Up Button */}
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
          Sign up with Google
        </button>

        {/* Divider "or" */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            margin: '18px 0',
            color: '#667085',
            fontSize: 13,
          }}
        >
          <div style={{ flex: 1, height: 1, background: '#eaecf0' }} />
          <span>or continue with email</span>
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

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Full Name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#344054' }}>Full name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Amaka Okafor"
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

          {/* Email */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#344054' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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

          {/* Password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#344054' }}>Password</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a strong password"
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

            {/* Password Validation Hints (Matching Image Style) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: hasMinLength ? '#027a48' : '#98a2b3' }}>
                <CheckIcon size={13} color={hasMinLength ? '#12b76a' : '#d0d5dd'} />
                <span>Must be at least 8 characters</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: hasSpecialOrNumber ? '#027a48' : '#98a2b3' }}>
                <CheckIcon size={13} color={hasSpecialOrNumber ? '#12b76a' : '#d0d5dd'} />
                <span>Must contain a number or special character</span>
              </div>
            </div>
          </div>

          {/* Submit Button */}
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
            {loading ? 'Setting up your trial...' : 'Get started immediately'}
          </button>
        </form>

        {/* Bottom Switcher */}
        <div
          style={{
            textAlign: 'center',
            fontSize: 13.5,
            color: '#667085',
            marginTop: 22,
          }}
        >
          <span>Already have an account? </span>
          <Link
            to="/signin"
            style={{
              color: '#101828',
              fontWeight: 700,
              textDecoration: 'none',
              position: 'relative',
              display: 'inline-block',
            }}
          >
            Log in
            <HandDrawnUnderline width="105%" color="#101828" />
          </Link>
        </div>
      </div>
    </AuthSplitLayout>
  );
};
export default SignUp;
