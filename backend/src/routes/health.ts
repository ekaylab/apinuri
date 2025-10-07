import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { redis } from '@/lib/redis';

const health = new Hono();

health.get('/', async (c) => {
  try {
    await db.execute(sql`SELECT 1`);

    try {
      await redis.ping();

      const memoryUsage = process.memoryUsage();
      const rssInMB = Math.round(memoryUsage.rss / 1024 / 1024);
      const heapUsedInMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);

      return c.json({
        status: 'healthy',
        database: 'connected',
        redis: 'connected',
        rss: `${rssInMB}MB`,
        heapUsed: `${heapUsedInMB}MB`,
        timestamp: new Date().toISOString(),
      });
    } catch (redisError: any) {
      console.error('Health check failed: Redis connection error', redisError);
      return c.json(
        {
          status: 'unhealthy',
          database: 'connected',
          redis: 'disconnected',
          error: redisError.message,
          timestamp: new Date().toISOString(),
        },
        503
      );
    }
  } catch (dbError: any) {
    console.error('Health check failed: Database connection error', dbError);
    return c.json(
      {
        status: 'unhealthy',
        database: 'disconnected',
        redis: 'unknown',
        error: dbError.message,
        timestamp: new Date().toISOString(),
      },
      503
    );
  }
});

export default health;