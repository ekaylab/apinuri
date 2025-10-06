import { RedisClient } from 'redis';
import { scanAndDeleteKeys } from '@/utils/redis-helper';

let redisClient: RedisWrapper | null = null;

export class RedisWrapper {
  constructor(private client: RedisClient) {}

  async get(key: string): Promise<string | null> {
    const result = await this.client.sendCommand(['GET', key]);
    return result as string | null;
  }

  async set(key: string, value: string, expiryMs?: number): Promise<string> {
    const args = ['SET', key, value];
    if (expiryMs) {
      args.push('PX', expiryMs.toString());
    }
    const result = await this.client.sendCommand(args);
    return result as string;
  }

  async del(...keys: string[]): Promise<number> {
    const result = await this.client.sendCommand(['DEL', ...keys]);
    return result as number;
  }

  async exists(...keys: string[]): Promise<number> {
    const result = await this.client.sendCommand(['EXISTS', ...keys]);
    return result as number;
  }

  async hget(key: string, field: string): Promise<string | null> {
    const result = await this.client.sendCommand(['HGET', key, field]);
    return result as string | null;
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    const result = await this.client.sendCommand(['HSET', key, field, value]);
    return result as number;
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    const result = await this.client.sendCommand(['HGETALL', key]);
    const arr = result as string[];
    const obj: Record<string, string> = {};
    for (let i = 0; i < arr.length; i += 2) {
      obj[arr[i]] = arr[i + 1];
    }
    return obj;
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    const result = await this.client.sendCommand(['HDEL', key, ...fields]);
    return result as number;
  }

  async publish(channel: string, message: string): Promise<number> {
    const result = await this.client.sendCommand(['PUBLISH', channel, message]);
    return result as number;
  }

  async subscribe(...channels: string[]): Promise<void> {
    await this.client.sendCommand(['SUBSCRIBE', ...channels]);
  }

  async unsubscribe(...channels: string[]): Promise<void> {
    await this.client.sendCommand(['UNSUBSCRIBE', ...channels]);
  }

  async scan(cursor: string, pattern: string, count: number): Promise<[string, string[]]> {
    const result = await this.client.sendCommand([
      'SCAN',
      cursor,
      'MATCH',
      pattern,
      'COUNT',
      count.toString(),
    ]);
    const arr = result as [string, string[]];
    return arr;
  }

  async unlink(...keys: string[]): Promise<number> {
    const result = await this.client.sendCommand(['UNLINK', ...keys]);
    return result as number;
  }

  async ping(): Promise<string> {
    const result = await this.client.sendCommand(['PING']);
    return result as string;
  }

  getClient(): RedisClient {
    return this.client;
  }
}

export async function initializeRedis(host: string, port: number): Promise<RedisWrapper> {
  if (redisClient) return redisClient;

  const conn = await Deno.connect({ hostname: host, port });
  const client = new RedisClient(conn);

  try {
    await client.sendCommand(['PING']);
    console.log('Connected to Redis');
    redisClient = new RedisWrapper(client);
    return redisClient;
  } catch (error: any) {
    console.error(`Redis connection test failed: ${error.message}`);
    throw error;
  }
}

export function getRedis(): RedisWrapper {
  if (!redisClient) {
    throw new Error('Redis not initialized');
  }
  return redisClient;
}

export async function closeRedis() {
  if (redisClient) {
    redisClient.getClient()[Symbol.dispose]();
    console.log('Redis connection closed');
    redisClient = null;
  }
}

export function redisScanAndDelete(pattern: string, batchSize = 100) {
  return scanAndDeleteKeys(getRedis(), pattern, batchSize);
}