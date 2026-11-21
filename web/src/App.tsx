import { Component, type FC, type ReactNode, type ErrorInfo } from 'react';
import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { DotGrid, CornerGlow, StageFrame } from '@/components/layout/Background';
import { useStageScale, useIsMobile } from '@/hooks/useStageScale';
import { ProfileProvider } from '@/context/ProfileContext';

import { HomePage } from '@/pages/HomePage';
import { HowPage } from '@/pages/HowPage';
import { BoardsPage } from '@/pages/BoardsPage';
import { TailorPage } from '@/pages/TailorPage';
import { PricingPage } from '@/pages/PricingPage';
import { FaqPage } from '@/pages/FaqPage';
import { SignInPage } from '@/pages/SignInPage';
import { VerifyLinkPage } from '@/pages/VerifyLinkPage';
import { RequireSession } from '@/components/auth/RequireSession';
import { onSessionExpired } from '@/api';
import { startSessionKeepAlive } from '@/lib/session';
import { WaitlistPage } from '@/pages/WaitlistPage';
import { ProfileSetupPage } from '@/pages/profile-setup/ProfileSetupPage';
import { ReplyPage } from '@/pages/ReplyPage';
import { DashboardPage } from '@/pages/DashboardPage';

const AppContent: FC = () => {
  const scale = useStageScale();
  const isMobile = useIsMobile();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // Keep signed-in tabs signed in, and send people to sign-in (remembering where they were) if a session ends.
  useEffect(() => {
    const stop = startSessionKeepAlive();
    onSessionExpired(() => {
      if (/^\/(signin|signup|auth)/.test(window.location.pathname)) return;
      navigate(`/signin?next=${encodeURIComponent(window.location.pathname + window.location.search)}`, { replace: true });
    });
    return () => {
      stop();
      onSessionExpired(null);
    };
  }, [navigate]);

  const isDashboard = pathname === '/dash' || pathname.startsWith('/dash/') || pathname === '/dashboard';
  const isAuthOrSetup =
    pathname === '/signin' ||
    pathname === '/signup' ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/setup') ||
    pathname.startsWith('/r/');
  const isStandalone = isDashboard || isAuthOrSetup;

  return (
    <>
      {!isStandalone && <StageFrame />}
      {!isStandalone && <DotGrid />}
      {!isStandalone && pathname !== '/' && <CornerGlow />}

      {isStandalone ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            background: '#ffffff',
            overflowX: 'hidden',
            overflowY: 'auto',
            zIndex: 10,
          }}
        >
          <Routes>
            <Route path="/signin" element={<SignInPage />} />
            <Route path="/signup" element={<Navigate to="/signin" replace />} />
            <Route path="/auth/signin" element={<Navigate to="/signin" replace />} />
            <Route path="/auth/signup" element={<Navigate to="/signin" replace />} />
            <Route path="/auth/verify" element={<VerifyLinkPage />} />
            <Route path="/dash/*" element={<RequireSession><DashboardPage /></RequireSession>} />
            <Route path="/dashboard" element={<Navigate to="/dash" replace />} />
            <Route path="/setup" element={<RequireSession><ProfileSetupPage /></RequireSession>} />
            <Route path="/r/:token" element={<ReplyPage />} />
          </Routes>
        </div>
      ) : isMobile ? (
        <div
          className="jj-mobile-root"
          style={{
            position: 'relative',
            width: '100%',
            minHeight: '100vh',
            background: '#f8f9fb',
            overflowX: 'hidden',
            overflowY: 'auto',
            boxSizing: 'border-box',
          }}
        >
          <Navbar />

          <div
            key={pathname}
            style={{
              width: '100%',
              minHeight: 'calc(100vh - 56px)',
              position: 'relative',
            }}
          >
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/how" element={<HowPage />} />
              <Route path="/boards" element={<BoardsPage />} />
              <Route path="/tailor" element={<TailorPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/faq" element={<FaqPage />} />
              <Route path="/waitlist" element={<WaitlistPage />} />
            </Routes>
          </div>
        </div>
      ) : (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 1186,
            height: 780,
            transform: `translate(-50%,-50%) scale(${scale})`,
            transformOrigin: '50% 50%',
          }}
        >
          <Navbar />

          <div key={pathname} style={{ position: 'absolute', inset: 0 }}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/how" element={<HowPage />} />
              <Route path="/boards" element={<BoardsPage />} />
              <Route path="/tailor" element={<TailorPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/faq" element={<FaqPage />} />
              <Route path="/waitlist" element={<WaitlistPage />} />
            </Routes>
          </div>
        </div>
      )}
    </>
  );
};

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[JAVI ErrorBoundary caught]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            fontFamily: "Montserrat, system-ui, sans-serif",
            background: '#ffffff',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              maxWidth: 440,
              padding: '32px 24px',
              borderRadius: 16,
              border: '1px solid #eaecf0',
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
            }}
          >
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#101828', margin: '0 0 8px' }}>
              We hit a quick bump
            </h2>
            <p style={{ fontSize: 13.5, color: '#667085', margin: '0 0 20px', lineHeight: 1.5 }}>
              The application encountered an unexpected state. You can reload the page or return to the home screen.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{
                  height: 40,
                  padding: '0 18px',
                  borderRadius: 8,
                  background: '#101828',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Reload Page
              </button>
              <a
                href="/"
                style={{
                  height: 40,
                  padding: '0 18px',
                  borderRadius: 8,
                  background: '#ffffff',
                  color: '#344054',
                  border: '1px solid #d0d5dd',
                  fontSize: 13.5,
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  textDecoration: 'none',
                }}
              >
                Go Home
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const App: FC = () => (
  <ErrorBoundary>
    <ProfileProvider>
      <AppContent />
    </ProfileProvider>
  </ErrorBoundary>
);

export default App;
