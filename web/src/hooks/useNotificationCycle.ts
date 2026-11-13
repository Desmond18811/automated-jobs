import { useEffect, useState } from 'react';

export function useNotificationCycle(count: number, ms = 2800) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((v) => (v + 1) % count), ms);
    return () => clearInterval(t);
  }, [count, ms]);
  return tick;
}
