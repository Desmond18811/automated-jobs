import type { FC } from 'react';
import { Hero } from '@/components/home/Hero';
import { OrbitArcs } from '@/components/home/OrbitArcs';
import { NotificationStack } from '@/components/home/NotificationStack';
import { BoardLogos } from '@/components/home/BoardLogos';

export const HomePage: FC = () => (
  <div data-screen-label="Home" style={{ position: 'absolute', inset: 0 }}>
    <Hero />
    <OrbitArcs />
    <NotificationStack />
    <BoardLogos />
  </div>
);
