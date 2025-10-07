import Redis from 'ioredis';
import { scanAndDeleteKeys } from '@/utils/redis-helper';

let redisClient: Redis | null = null;

export async function initializeRedis(host: string, port: number, password?: string): Promise<Redis> {
  if (redisClient) return redisClient;

  console.log(`Attempting to connect to Redis at ${host}:${port}`);

  const maxRetries = 10;
  const retryDelay = 2000; // 2 seconds between retries

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    redisClient = new Redis({
      host,
      port,
      password,
      lazyConnect: true,
      enableOfflineQueue: false,
    });

    // Add error handler to catch connection errors
    redisClient.on('error', (err) => {
      console.error('Redis connection error:', err.message);
    });

    try {
      await redisClient.connect();
      await redisClient.ping();
      console.log('Connected to Redis successfully');
      return redisClient;
    } catch (error: any) {
      console.error(`Redis connection attempt ${attempt} failed:`, error.message, error.code);

      if (attempt < maxRetries) {
        console.log(`Retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));

        // Clean up failed connection attempt
        if (redisClient) {
          try {
            await redisClient.quit();
          } catch {}
          redisClient = null;
        }
      } else {
        console.error(`Redis connection test failed after ${maxRetries} attempts`);
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