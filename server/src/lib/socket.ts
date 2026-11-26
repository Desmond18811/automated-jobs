/**
 * J.A.V.I Real-time Socket.IO Server
 * Manages authenticated WebSocket connections, user rooms, and live event dispatches
 * for real-time application updates, "Needs you" queue tasks, notifications, and stats.
 */

import http from 'node:http';
import { Server, type Socket } from 'socket.io';
import { verifyAccessToken } from '../middleware/auth';
import { env } from '../config/env';
import { logger } from './logger';

export interface AuthenticatedSocket extends Socket {
  data: {
    userId?: string;
  };
}

let io: Server | null = null;

export function initSocketServer(httpServer: http.Server): Server {
  io = new Server(httpServer, {
    cors: {
      origin: (requestOrigin, callback) => {
        if (!requestOrigin) return callback(null, true);
        const allowed = [env.APP_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'];
        if (
          allowed.includes(requestOrigin) ||
          requestOrigin.includes('ngrok') ||
          requestOrigin.startsWith('http://localhost:') ||
          requestOrigin.startsWith('http://127.0.0.1:')
        ) {
          return callback(null, true);
        }
        return callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 30000,
    pingInterval: 25000,
  });

  // Authentication Middleware for WebSocket Connections
  io.use((socket: AuthenticatedSocket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '') ?? '');

      const claims = token ? verifyAccessToken(token) : undefined;
      if (!claims) return next(new Error('unauthorized'));
      socket.data.userId = claims.sub;
      next();
    } catch (err: any) {
      logger.warn({ err: err?.message }, 'Socket.IO handshake authentication failed');
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.data.userId;
    if (userId) {
      const userRoom = `user:${userId}`;
      socket.join(userRoom);
      logger.info({ socketId: socket.id, userId }, `Socket connected and joined room: ${userRoom}`);
    } else {
      logger.info({ socketId: socket.id }, 'Anonymous socket connected');
    }

    // Ping / Heartbeat
    socket.on('ping', () => {
      socket.emit('pong', { time: Date.now() });
    });

    socket.on('disconnect', (reason) => {
      logger.info({ socketId: socket.id, reason }, 'Socket disconnected');
    });
  });

  logger.info('Socket.IO real-time server initialized ⚡');
  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.IO has not been initialized yet. Call initSocketServer(httpServer) first.');
  }
  return io;
}

/**
 * Emit event to a specific user's connected clients across all tabs
 */
export function emitToUser(userId: string, event: string, data: any): void {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
}

/**
 * Broadcast when an application changes state (drafted, sent, replied, interview)
 */
export function broadcastApplicationUpdate(userId: string, application: any): void {
  emitToUser(userId, 'application:updated', application);
  // Also push updated dashboard stats
  emitToUser(userId, 'stats:refresh', { timestamp: new Date() });
}

/**
 * Broadcast when a "Needs you" queue task is created or answered
 */
export function broadcastTaskEvent(userId: string, action: 'new' | 'updated' | 'resolved', task: any): void {
  emitToUser(userId, `task:${action}`, task);
  emitToUser(userId, 'tasks:refresh', { action, taskId: task?.id || task?._id });
}

/**
 * Broadcast a real-time notification to the user
 */
export function broadcastNotification(userId: string, notification: any): void {
  emitToUser(userId, 'notification:new', notification);
}

/**
 * Broadcast live stats update
 */
export function broadcastStatsUpdate(userId: string, stats: any): void {
  emitToUser(userId, 'stats:updated', stats);
}
