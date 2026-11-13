import IORedis from 'ioredis';
import { env } from '../config/env';

// BullMQ requires maxRetriesPerRequest: null on the shared connection.
export const redis = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
