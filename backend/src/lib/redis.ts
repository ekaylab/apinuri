import Redis from 'ioredis';
import { scanAndDeleteKeys } from '@/utils/redis-helper';

let redisClient: Redis | null = null;

export async function initializeRedis(host: string, port: number): Promise<Redis> {
  if (redisClient) return redisClient;

  redisClient = new Redis({
    host,
    port,
    lazyConnect: true,
  });

  try {
    await redisClient.connect();
    await redisClient.ping();
    console.log('Connected to Redis');
    return redisClient;
  } catch (error: any) {
    console.error(`Redis connection test failed: ${error.message}`);
    throw error;
  }
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

export function redisScanAndDelete(pattern: string, batchSize = 100) {
  return scanAndDeleteKeys(getRedis(), pattern, batchSize);
}