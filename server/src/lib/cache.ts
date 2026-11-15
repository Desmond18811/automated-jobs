import { redis } from './redis';
import { logger } from './logger';

interface MemoryCacheEntry {
  val: string;
  expiresAt: number;
}

const memoryStore = new Map<string, MemoryCacheEntry>();

export async function cacheGet<T>(key: string): Promise<T | null> {
  // Try Redis only if connected and ready
  if (redis.status === 'ready') {
    try {
      const raw = await redis.get(key);
      if (raw) return JSON.parse(raw) as T;
    } catch {
      // Redis unavailable, fallback to in-memory store
    }
  }

  // Memory fallback
  const entry = memoryStore.get(key);
  if (entry) {
    if (Date.now() < entry.expiresAt) {
      try {
        return JSON.parse(entry.val) as T;
      } catch {
        return null;
      }
    }
    memoryStore.delete(key);
  }
  return null;
}

export async function cacheSet(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
  const serialized = JSON.stringify(value);
  if (redis.status === 'ready') {
    try {
      await redis.set(key, serialized, 'EX', ttlSeconds);
      return;
    } catch {
      // Memory store fallback
    }
  }

  memoryStore.set(key, {
    val: serialized,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

export async function cacheDel(key: string): Promise<void> {
  if (redis.status === 'ready') {
    try {
      await redis.del(key);
    } catch {
      // ignore
    }
  }
  memoryStore.delete(key);
}

export async function cacheDelPattern(pattern: string): Promise<void> {
  if (redis.status === 'ready') {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch {
      // ignore
    }
  }

  // memory store cleanup
  const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
  for (const k of memoryStore.keys()) {
    if (regex.test(k)) memoryStore.delete(k);
  }
}
