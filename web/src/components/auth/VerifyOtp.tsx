import { useState, useRef, useEffect, type FC, type FormEvent, type ClipboardEvent, type KeyboardEvent } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { MailIcon, CheckIcon } from '@/assets/icons';
import { AuthSplitLayout } from './AuthSplitLayout';
import { authApi } from '@/api';

export const VerifyOtp: FC = () => {
  const [searchParams] = useSearchParams();
  const nav = useNavigate();
  const email = searchParams.get('email') || 'candidate@example.com';
  const name = searchParams.get('name') || '';

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(30);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Cooldown countdown for resending
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Focus first input on mount
  useEffect(() => {
    if (inputsRef.current[0]) {
      inputsRef.current[0].focus();
    }
  }, []);

  const handleDigitChange = (index: number, value: string) => {
    const char = value.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);
    setError(null);

    // Auto-advance
    if (char && index < 5 && inputsRef.current[index + 1]) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim().replace(/[^0-9]/g, '');
    if (pasted.length >= 6) {
      const newDigits = pasted.slice(0, 6).split('');
      setDigits(newDigits);
      if (inputsRef.current[5]) {
        inputsRef.current[5].focus();
      }
    }
  };

  const otpCode = digits.join('');

  const handleSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    if (otpCode.length < 6) {
      setError('Please enter all 6 digits of the verification code.');
      return;
    }

    setLoading(true);

    try {
      const res = await authApi.verifyOtp({
        email: email.trim().toLowerCase(),
        otp: otpCode,
      });

      setSuccessMsg('Email verified successfully! Preparing your profile setup...');

      setTimeout(() => {
        nav('/setup');
      }, 700);
    } catch (err: any) {
      console.warn('Verify OTP error:', err);
      setError(err?.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setError(null);
    try {
      await authApi.resendOtp(email.trim().toLowerCase());
      setSuccessMsg('A new 6-digit code has been dispatched to your email.');
      setResendCooldown(30);
      setDigits(['', '', '', '', '', '']);
      inputsRef.current[0]?.focus();
    } catch (err: any) {
      setError(err?.message || 'Failed to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthSplitLayout>
      <div data-screen-label="Verify OTP" style={{ width: '100%' }}>
        {/* Email Icon Header */}
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 12,
            background: '#f4f5f7',
            border: '1px solid #e4e7ec',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#101828',
            marginBottom: 20,
          }}
        >
          <MailIcon size={26} color="#101828" />
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
          Check your email
        </h1>
        <p
          style={{
            margin: '0 0 24px',
            fontSize: 14,
            color: '#667085',
            lineHeight: '22px',
          }}
        >
          We sent a 6-digit verification code to{' '}
          <strong style={{ color: '#101828', fontWeight: 600 }}>{email}</strong>
        </p>

        {/* Success Alert */}
        {successMsg && (
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
            <span>{successMsg}</span>
          </div>
        )}

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

        {/* OTP Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* 6 Digit Input Boxes */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              justifyContent: 'space-between',
              width: '100%',
            }}
          >
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (inputsRef.current[idx] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onPaste={idx === 0 ? handlePaste : undefined}
                style={{
                  width: 'calc(100% / 6 - 8px)',
                  boxSizing: 'border-box',
                  height: 54,
                  fontSize: 22,
                  fontWeight: 700,
                  textAlign: 'center',
                  borderRadius: 10,
                  border: digit ? '2px solid #101828' : '1px solid #d0d5dd',
                  background: '#ffffff',
                  outline: 'none',
                  color: '#101828',
                  boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)',
                  transition: 'all 0.15s ease',
                  fontFamily: 'monospace',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
                onBlur={(e) => (e.target.style.borderColor = digit ? '#101828' : '#d0d5dd')}
              />
            ))}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || otpCode.length < 6}
            style={{
              height: 44,
              background: '#101828',
              color: '#ffffff',
              borderRadius: 8,
              border: 'none',
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer',
              boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)',
              opacity: loading || otpCode.length < 6 ? 0.65 : 1,
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (otpCode.length === 6) e.currentTarget.style.background = '#1d2939';
            }}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#101828')}
          >
            {loading ? 'Verifying code...' : 'Verify email and continue'}
          </button>
        </form>

        {/* Resend Action */}
        <div
          style={{
            textAlign: 'center',
            fontSize: 13.5,
            color: '#667085',
            marginTop: 24,
          }}
        >
          <span>Didn't receive the email? </span>
          <button
            type="button"
            disabled={resendCooldown > 0 || resending}
            onClick={handleResend}
            style={{
              background: 'transparent',
              border: 'none',
              color: resendCooldown > 0 ? '#98a2b3' : '#101828',
              fontWeight: 700,
              cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
              padding: 0,
            }}
          >
            {resendCooldown > 0 ? `Click to resend in ${resendCooldown}s` : 'Click to resend'}
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Link to="/signin" style={{ fontSize: 13, color: '#475467', textDecoration: 'none' }}>
            &larr; Back to log in
          </Link>
        </div>
      </div>
    </AuthSplitLayout>
  );
};
export default VerifyOtp;
