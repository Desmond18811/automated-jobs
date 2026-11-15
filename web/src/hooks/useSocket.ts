import { useEffect } from 'react';
import { connectSocket, disconnectSocket, socketEvents } from '@/lib/socket';

export interface UseSocketOptions {
  onApplicationUpdated?: (app: any) => void;
  onTaskNew?: (task: any) => void;
  onTaskUpdated?: (task: any) => void;
  onNotificationNew?: (notification: any) => void;
  onStatsRefresh?: (data: any) => void;
}

export function useSocket(options: UseSocketOptions = {}) {
  useEffect(() => {
    const socket = connectSocket();

    const unsubApp = options.onApplicationUpdated
      ? socketEvents.onApplicationUpdated(options.onApplicationUpdated)
      : undefined;

    const unsubTaskNew = options.onTaskNew
      ? socketEvents.onTaskNew(options.onTaskNew)
      : undefined;

    const unsubTaskUpdated = options.onTaskUpdated
      ? socketEvents.onTaskUpdated(options.onTaskUpdated)
      : undefined;

    const unsubNotif = options.onNotificationNew
      ? socketEvents.onNotificationNew(options.onNotificationNew)
      : undefined;

    const unsubStats = options.onStatsRefresh
      ? socketEvents.onStatsRefresh(options.onStatsRefresh)
      : undefined;

    return () => {
      unsubApp?.();
      unsubTaskNew?.();
      unsubTaskUpdated?.();
      unsubNotif?.();
      unsubStats?.();
    };
  }, [
    options.onApplicationUpdated,
    options.onTaskNew,
    options.onTaskUpdated,
    options.onNotificationNew,
    options.onStatsRefresh,
  ]);
}
