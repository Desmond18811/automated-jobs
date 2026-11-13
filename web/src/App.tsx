import type { FC } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { DotGrid, CornerGlow, StageFrame } from '@/components/layout/Background';
import { useStageScale } from '@/hooks/useStageScale';
import { ProfileProvider } from '@/context/ProfileContext';

import { HomePage } from '@/pages/HomePage';
import { HowPage } from '@/pages/HowPage';
import { BoardsPage } from '@/pages/BoardsPage';
import { TailorPage } from '@/pages/TailorPage';
import { PricingPage } from '@/pages/PricingPage';
import { FaqPage } from '@/pages/FaqPage';
import { SignInPage } from '@/pages/SignInPage';
import { SignUpPage } from '@/pages/SignUpPage';
import { WaitlistPage } from '@/pages/WaitlistPage';
import { ProfileSetupPage } from '@/pages/ProfileSetupPage';
import { DashboardPage } from '@/pages/DashboardPage';

const AppContent: FC = () => {
  const scale = useStageScale();
  const { pathname } = useLocation();
  const isDashboard = pathname === '/dash' || pathname === '/dashboard';

  return (
    <>
      <StageFrame />
      <DotGrid />
      {pathname !== '/' && !isDashboard && <CornerGlow />}

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
        {!isDashboard && <Navbar />}

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/how" element={<HowPage />} />
          <Route path="/boards" element={<BoardsPage />} />
          <Route path="/tailor" element={<TailorPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/waitlist" element={<WaitlistPage />} />
          <Route path="/dash" element={<DashboardPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/setup" element={<ProfileSetupPage />} />
        </Routes>
      </div>
    </>
  );
};

const App: FC = () => (
  <ProfileProvider>
    <AppContent />
  </ProfileProvider>
);

export default App;
