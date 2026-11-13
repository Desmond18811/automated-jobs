import type { FC } from 'react';

export const DotGrid: FC = () => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      backgroundImage:
        'radial-gradient(rgba(90,90,140,.28) 1px,transparent 1.2px)',
      backgroundSize: '18px 18px',
      WebkitMaskImage:
        'radial-gradient(ellipse 75% 70% at 50% 45%,transparent 35%,#000 85%)',
      maskImage:
        'radial-gradient(ellipse 75% 70% at 50% 45%,transparent 35%,#000 85%)',
      pointerEvents: 'none',
      zIndex: 0,
    }}
  />
);

export const CornerGlow: FC = () => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      background:
        'radial-gradient(ellipse 34% 48% at 0% 100%,rgba(60,115,255,.30),rgba(60,115,255,0) 70%),radial-gradient(ellipse 34% 48% at 24% 100%,rgba(20,190,180,.26),rgba(20,190,180,0) 70%)',
      pointerEvents: 'none',
      zIndex: 0,
    }}
  />
);

export const StageFrame: FC = () => (
  <div
    style={{
      position: 'fixed',
      inset: 12,
      background: '#fff',
      border: '1px solid #e6e6ea',
      borderRadius: 22,
      overflow: 'hidden',
      pointerEvents: 'none',
      zIndex: 0,
    }}
  />
);
