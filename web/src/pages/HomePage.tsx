import type { FC } from 'react';
import { Hero } from '@/components/home/Hero';
import { OrbitArcs } from '@/components/home/OrbitArcs';
import { NotificationStack } from '@/components/home/NotificationStack';
import { BoardLogos } from '@/components/home/BoardLogos';
import { useIsMobile } from '@/hooks/useStageScale';

export const HomePage: FC = () => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div
        data-screen-label="Home"
        className="jj-page-fade"
        style={{
          position: 'relative',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          overflowX: 'hidden',
          paddingBottom: 40,
        }}
      >
        <Hero />
        <NotificationStack />
        <BoardLogos />
      </div>
    );
  }

  return (
    <div data-screen-label="Home" style={{ position: 'absolute', inset: 0 }}>
      <Hero />
      <OrbitArcs />
      <NotificationStack />
      <BoardLogos />
    </div>
  );
};
