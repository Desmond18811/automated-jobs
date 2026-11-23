import { type FC } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { HomeScreen } from '@/components/dashboard/screens/HomeScreen';
import { NeedsYouScreen } from '@/components/dashboard/screens/NeedsYouScreen';
import { JobFeedScreen } from '@/components/dashboard/screens/JobFeedScreen';
import { DraftsScreen } from '@/components/dashboard/screens/DraftsScreen';
import { TrackerScreen } from '@/components/dashboard/screens/TrackerScreen';
import { CvProfileScreen } from '@/components/dashboard/screens/CvProfileScreen';
import { BusinessScreen } from '@/components/dashboard/screens/BusinessScreen';
import { AskScreen } from '@/components/dashboard/screens/AskScreen';
import { SettingsScreen } from '@/components/dashboard/screens/SettingsScreen';

export const DashboardPage: FC = () => {
  return (
    <Routes>
      <Route element={<DashboardShell />}>
        <Route index element={<HomeScreen />} />
        <Route path="needs-you" element={<NeedsYouScreen />} />
        <Route path="jobs" element={<JobFeedScreen />} />
        <Route path="drafts" element={<DraftsScreen />} />
        <Route path="tracker" element={<TrackerScreen />} />
        <Route path="profile" element={<CvProfileScreen />} />
        <Route path="business" element={<BusinessScreen />} />
        <Route path="ask" element={<AskScreen />} />
        <Route path="settings" element={<SettingsScreen />} />
        <Route path="*" element={<Navigate to="/dash" replace />} />
      </Route>
    </Routes>
  );
};

export default DashboardPage;
