import { type FC } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Shell } from '@/components/talentspro/Shell';
import { Home } from '@/components/talentspro/Home';
import { Applications } from '@/components/talentspro/Applications';
import { Analytics } from '@/components/talentspro/Analytics';
import { Business } from '@/components/talentspro/Business';
import { TestLab } from '@/components/talentspro/TestLab';
import { Jobs } from '@/components/talentspro/Jobs';
import { ComingSoon, NotFound, ProfilePage } from '@/components/talentspro/Pages';

export const DashboardPage: FC = () => (
  <Routes>
    <Route element={<Shell />}>
      <Route index element={<Home />} />
      <Route path="applications" element={<Applications />} />
      <Route path="profile" element={<ProfilePage />} />
      <Route path="analytics" element={<Analytics />} />
      <Route path="calendar" element={<Navigate to="/dash?calendar=1" replace />} />
      <Route path="jobs" element={<Jobs />} />
      <Route path="saved" element={<Jobs saved />} />
      <Route path="messages" element={<ComingSoon page="messages" />} />
      <Route path="test" element={<TestLab />} />
      <Route path="business" element={<Business />} />
      <Route path="*" element={<NotFound home="/dash" />} />
    </Route>
  </Routes>
);

export default DashboardPage;
