import { useState, type FC, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { CheckIcon, KeyIcon, ArrowLeftIcon } from '@/assets/icons';
import { AuthSplitLayout } from './AuthSplitLayout';
import { authApi } from '@/api';

export const ForgotPassword: FC = () => {
  const [email, setEmail] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  // Step 1: Send reset code
  const handleRequestReset = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);

    try {
      const res = await authApi.forgotPassword(cleanEmail);
      setInfoMsg(res.message || 'If an account exists, a password reset code has been sent.');
      setCodeSent(true);
    } catch (err: any) {
      console.warn('Forgot password error:', err);
      setError(err?.message || 'Failed to send reset code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Set new password with OTP
  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (otp.length < 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    setLoading(true);

    try {
      const res = await authApi.resetPassword(email.trim().toLowerCase(), otp.trim(), newPassword);
      setResetDone(true);
      setInfoMsg(res.message || 'Password reset successfully! You can now log in.');
    } catch (err: any) {
      console.warn('Reset password error:', err);
      setError(err?.message || 'Invalid or expired code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout>
      <div data-screen-label="Forgot password" style={{ width: '100%' }}>
        {/* Clean Back Button Header (Matching Image 1) */}
        <div style={{ marginBottom: 24 }}>
          <Link
            to="/signin"
            onClick={(e) => {
              if (codeSent && !resetDone) {
                e.preventDefault();
                setCodeSent(false);
                setError(null);
                setInfoMsg(null);
              }
            }}
            aria-label="Back to sign in"
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: '#ffffff',
              border: '1px solid #d0d5dd',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#344054',
              textDecoration: 'none',
              boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f9fafb';
              e.currentTarget.style.borderColor = '#98a2b3';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.borderColor = '#d0d5dd';
            }}
          >
            <ArrowLeftIcon size={18} color="#344054" />
          </Link>
        </div>

        {/* Title & Subtitle */}
        <h1
          style={{
            margin: '0 0 8px',
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: '-0.025em',
            color: '#101828',
          }}
        >
          {resetDone ? 'Password reset' : codeSent ? 'Set new password' : 'Forgot password'}
        </h1>
        <p
          style={{
            margin: '0 0 24px',
            fontSize: 14,
            color: '#667085',
            lineHeight: '22px',
          }}
        >
          {resetDone
            ? 'Your password has been successfully reset. You can now log in with your new credentials.'
            : codeSent
            ? `Enter the 6-digit code sent to ${email} along with your new password.`
            : "No worries! Enter your email address and we'll send you reset instructions."}
        </p>

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

        {/* Success Alert */}
        {infoMsg && (
          <div
            style={{
              background: '#ecfdf3',
              border: '1px solid #d1fadf',
              color: '#027a48',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 13,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <CheckIcon size={16} color="#12b76a" />
            <span>{infoMsg}</span>
          </div>
        )}

        {/* Step 3: Success Screen */}
        {resetDone ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Link
              to="/signin"
              style={{
                height: 44,
                background: '#101828',
                color: '#ffffff',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 600,
                textDecoration: 'none',
                boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)',
              }}
            >
              Continue to log in
            </Link>
          </div>
        ) : !codeSent ? (
          /* Step 1: Email Form */
          <form onSubmit={handleRequestReset} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#344054' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your registered email"
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
                marginTop: 4,
                boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)',
                opacity: loading ? 0.7 : 1,
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#1d2939')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#101828')}
            >
              {loading ? 'Sending instructions...' : 'Forgot password'}
            </button>
          </form>
        ) : (
          /* Step 2: Code & New Password Form */
          <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#344054' }}>6-Digit Verification Code</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                placeholder="123456"
                required
                maxLength={6}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  height: 44,
                  border: '1px solid #d0d5dd',
                  borderRadius: 8,
                  padding: '0 14px',
                  fontSize: 16,
                  letterSpacing: '3px',
                  fontWeight: 600,
                  outline: 'none',
                  color: '#101828',
                  background: '#ffffff',
                  boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#344054' }}>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                minLength={8}
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
                }}
              />
            </div>

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
                marginTop: 4,
                boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Updating password...' : 'Reset password'}
            </button>
          </form>
        )}

        {/* Back to Log In */}
        <div style={{ textAlign: 'center', marginTop: 26 }}>
          <Link
            to="/signin"
            style={{
              fontSize: 13.5,
              fontWeight: 600,
              color: '#344054',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>&larr;</span> Back to log in
          </Link>
        </div>
      </div>
    </AuthSplitLayout>
  );
};

export default ForgotPassword;
