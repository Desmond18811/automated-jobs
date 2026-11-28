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
      // Atlas over a slow network can take several seconds; too short a wait drops to the local store by mistake.
      serverSelectionTimeoutMS: 10_000,
    });
    logger.info('MongoDB Atlas connected successfully');
  } catch (err: any) {
    if (env.NODE_ENV === 'production') throw err;
    logger.warn(
      { reason: String(err?.message ?? err).slice(0, 160) },
      'MongoDB Atlas is not reachable (often: this IP is not on the Atlas allow-list). Using the local dev store in .data/memory.json until the next restart.',
    );
    // Stay on one store for the whole run: switching to Atlas mid-session would split users, sessions and
    // profiles between two databases, which looks like being signed out or losing your profile.
    activateMemoryDb();
  } finally {
    isConnecting = false;
  }
}

export async function disconnectDb(): Promise<void> {
  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
  }
}

