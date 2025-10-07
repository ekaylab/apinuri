import Redis from 'ioredis';
import { scanAndDeleteKeys } from '@/utils/redis-helper';

let redisClient: Redis | null = null;

export async function initializeRedis(host: string, port: number, password?: string): Promise<Redis> {
  if (redisClient) return redisClient;

  const maxRetries = 10;
  const retryDelay = 2000; // 2 seconds between retries

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    redisClient = new Redis({
      host,
      port,
      password,
      lazyConnect: true,
    });

    try {
      await redisClient.connect();
      await redisClient.ping();
      console.log('Connected to Redis');
      return redisClient;
    } catch (error: any) {
      if (attempt < maxRetries) {
        console.log(`Redis connection failed (attempt ${attempt}/${maxRetries}). Retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));

        // Clean up failed connection attempt
        if (redisClient) {
          try {
            await redisClient.quit();
          } catch {}
          redisClient = null;
        }
      } else {
        console.error(`Redis connection test failed: ${error.message}`);
        throw error;
      }
    }
  }

  throw new Error('Failed to connect to Redis after maximum retries');
}

export function getRedis(): Redis {
  if (!redisClient) {
    throw new Error('Redis not initialized');
  }
  return redisClient;
}

export async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
    console.log('Redis connection closed');
    redisClient = null;
  }
}

export const redis = new Proxy({} as Redis, {
  get: (_target, prop) => {
    const instance = getRedis();
    return instance[prop as keyof Redis];
  }
});

export function redisScanAndDelete(pattern: string, batchSize = 100) {
  return scanAndDeleteKeys(getRedis(), pattern, batchSize);
}