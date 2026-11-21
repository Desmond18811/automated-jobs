import { useEffect, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { authStateStorage, getRouteForStage } from '@/api';

export const DashboardPage: FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const stage = authStateStorage.getStage();
    // If onboarding is not completed, candidate must finish setup before viewing dashboard
    if (stage && stage !== 'completed') {
      const targetRoute = getRouteForStage(stage);
      navigate(targetRoute, { replace: true });
    }
  }, [navigate]);

  return <DashboardLayout />;
};

export default DashboardPage;
