import { useEffect, useState } from 'react';

const STAGE_W = 1186;
const STAGE_H = 780;

export function useStageScale() {
  const compute = () =>
    Math.max(
      0.4,
      Math.min(
        (window.innerWidth - 24) / STAGE_W,
        (window.innerHeight - 24) / STAGE_H
      )
    );

  const [scale, setScale] = useState(() => compute());

  useEffect(() => {
    const onResize = () => setScale(compute());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return scale;
}
