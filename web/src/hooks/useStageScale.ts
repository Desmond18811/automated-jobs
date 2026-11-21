import { useEffect, useState } from 'react';

const STAGE_W = 1186;
const STAGE_H = 780;

export function useIsMobile(breakpoint = 900) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= breakpoint : false
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= breakpoint);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [breakpoint]);

  return isMobile;
}

export function useStageScale() {
  const compute = () => {
    if (typeof window === 'undefined') return 1;
    if (window.innerWidth <= 900) return 1;
    return Math.max(
      0.4,
      Math.min(
        (window.innerWidth - 24) / STAGE_W,
        (window.innerHeight - 24) / STAGE_H
      )
    );
  };

  const [scale, setScale] = useState(() => compute());

  useEffect(() => {
    const onResize = () => setScale(compute());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return scale;
}
