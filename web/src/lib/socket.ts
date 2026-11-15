/**
 * J.A.V.I Frontend Socket.IO Client
 * Manages WebSocket connection, authenticated handshake with JWT,
 * and subscriptions for real-time application events, "Needs you" queue items, and notifications.
 */

import { io, Socket } from 'socket.io-client';
import { tokenStorage } from '@/api';

let socket: Socket | null = null;

// Determine socket server URL (uses Vite proxy or direct base URL)
const SOCKET_URL = import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL.replace(/\/api\/?$/, '')
  : (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000');

export function getSocket(): Socket {
  if (!socket) {
    return connectSocket();
  }
  return socket;
}

export function connectSocket(): Socket {
  if (socket?.connected) {
    return socket;
  }

  const token = tokenStorage.get();

  socket = io(SOCKET_URL, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    withCredentials: true,
    auth: {
      token: token || undefined,
    },
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected to J.A.V.I Real-time Socket Server (id:', socket?.id, ')');
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected from J.A.V.I Socket Server:', reason);
  });

  socket.on('connect_error', (err) => {
    console.warn('Socket connection warning:', err.message);
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Update socket authorization token if refreshed or user re-authenticates
 */
export function updateSocketAuth(newToken?: string): void {
  const token = newToken || tokenStorage.get();
  if (socket) {
    socket.auth = { token: token || undefined };
    if (!socket.connected) {
      socket.connect();
    }
  }
}

/**
 * Event Subscriptions Helper
 */
export const socketEvents = {
  /** Listen for application state changes */
  onApplicationUpdated: (callback: (app: any) => void) => {
    const s = getSocket();
    s.on('application:updated', callback);
    return () => {
      s.off('application:updated', callback);
    };
  },

  /** Listen for newly created "Needs you" tasks */
  onTaskNew: (callback: (task: any) => void) => {
    const s = getSocket();
    s.on('task:new', callback);
    return () => {
      s.off('task:new', callback);
    };
  },

  /** Listen for task updates or resolution */
  onTaskUpdated: (callback: (task: any) => void) => {
    const s = getSocket();
    s.on('task:updated', callback);
    return () => {
      s.off('task:updated', callback);
    };
  },

  /** Listen for new in-app notifications */
  onNotificationNew: (callback: (notification: any) => void) => {
    const s = getSocket();
    s.on('notification:new', callback);
    return () => {
      s.off('notification:new', callback);
    };
  },

  /** Listen for signal to refresh dashboard stats */
  onStatsRefresh: (callback: (data: any) => void) => {
    const s = getSocket();
    s.on('stats:refresh', callback);
    s.on('stats:updated', callback);
    return () => {
      s.off('stats:refresh', callback);
      s.off('stats:updated', callback);
    };
  },
};

export default getSocket;
