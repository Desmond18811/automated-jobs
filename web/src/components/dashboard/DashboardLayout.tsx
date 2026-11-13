import { useState, type FC } from 'react';
import { Sidebar, type DashboardTab } from './Sidebar';
import { TopBar } from './TopBar';
import { StatCards } from './StatCards';
import { NeedsYouCard } from './NeedsYouCard';
import { JaviTodayCard } from './JaviTodayCard';
import { NeedsYouView } from './views/NeedsYouView';
import { JobFeedView } from './views/JobFeedView';
import { DraftsView } from './views/DraftsView';
import { TrackerView } from './views/TrackerView';
import { CvProfileView } from './views/CvProfileView';
import { BusinessModeView } from './views/BusinessModeView';
import { SettingsView } from './views/SettingsView';
import { useUserProfile } from '@/context/ProfileContext';

export const DashboardLayout: FC = () => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('dashboard');
  const [auto, setAuto] = useState(true);
  const { profile } = useUserProfile();

  const todayStr = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  return (
    <div
      data-screen-label="Dashboard"
      style={{
        position: 'absolute',
        inset: 0,
        display: 'grid',
        gridTemplateColumns: '190px minmax(0, 1fr)',
        gridTemplateRows: '60px minmax(0, 1fr)',
        background: '#fff',
        overflow: 'hidden',
      }}
    >
      <TopBar onOpenSettings={() => setActiveTab('settings')} />
      <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />

      <main
        style={{
          position: 'relative',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          minWidth: 0,
          overflowY: 'auto',
          background: `
            radial-gradient(ellipse 42% 52% at 0% 100%, rgba(60, 115, 255, 0.16), rgba(60, 115, 255, 0) 70%),
            radial-gradient(ellipse 38% 48% at 26% 100%, rgba(20, 190, 180, 0.14), rgba(20, 190, 180, 0) 70%),
            #f8f9fb
          `,
        }}
      >
        {activeTab === 'dashboard' && (
          <>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 11, color: '#8a8a92' }}>{todayStr}</span>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-.5px' }}>
                  Good morning, {profile.firstName || 'Ada'}
                </h1>
              </div>
              <button
                type="button"
                onClick={() => setAuto(!auto)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#3a3a40',
                  background: '#fff',
                  border: '1px solid #e6e6ea',
                  borderRadius: 999,
                  padding: '5px 12px 5px 6px',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,.03)',
                  fontFamily: 'Montserrat, sans-serif',
                }}
              >
                <span
                  style={{
                    width: 26,
                    height: 15,
                    borderRadius: 999,
                    background: auto ? '#14b8a6' : '#d6d6dc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: auto ? 'flex-end' : 'flex-start',
                    padding: 2,
                    boxSizing: 'border-box',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span
                    style={{ width: 11, height: 11, borderRadius: '50%', background: '#fff', display: 'block' }}
                  />
                </span>
                {auto ? 'Auto-apply on' : 'Auto-apply paused'}
              </button>
            </div>

            {/* Stat Cards */}
            <StatCards />

            {/* 2-Column Main Section: Needs you & Javi today */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <NeedsYouCard onOpenQueue={() => setActiveTab('needs_you')} />
              <JaviTodayCard />
            </div>
          </>
        )}

        {activeTab === 'needs_you' && <NeedsYouView />}
        {activeTab === 'job_feed' && <JobFeedView />}
        {activeTab === 'drafts' && <DraftsView />}
        {activeTab === 'tracker' && <TrackerView />}
        {activeTab === 'cv_profile' && <CvProfileView />}
        {activeTab === 'business_mode' && <BusinessModeView />}
        {activeTab === 'settings' && <SettingsView />}
      </main>
    </div>
  );
};
