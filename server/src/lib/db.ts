import mongoose from 'mongoose';
import { env } from '../config/env';
import { logger } from './logger';
import { activateMemoryDb } from './memoryDb';

let isConnecting = false;

export async function connectDb(): Promise<void> {
  if (mongoose.connection.readyState === 1 || isConnecting) return;
  isConnecting = true;
  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: 2500,
    });
    logger.info('MongoDB Atlas connected successfully');
  } catch (err: any) {
    logger.warn(
      'MongoDB Atlas connection failed or IP not whitelisted. Activating in-memory store for offline & dev reliability.',
    );
    activateMemoryDb();

    // Retry Atlas in background without blocking requests
    setTimeout(() => {
      isConnecting = false;
      connectDb().catch(() => {});
    }, 30_000);
  } finally {
    isConnecting = false;
  }
}

export async function disconnectDb(): Promise<void> {
  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
  }
}

