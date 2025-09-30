import { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';

export default async function controller(fastify: FastifyInstance) {
  fastify.get('', async function (_request, reply) {
    try {
      await fastify.db.execute(sql`SELECT 1`);

      try {
        await fastify.redis.ping();

        const memoryUsage = process.memoryUsage();
        const rssInMB = Math.round(memoryUsage.rss / 1024 / 1024);
        const heapUsedInMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);

        return reply.send({
          status: 'healthy',
          database: 'connected',
          redis: 'connected',
          rss: `${rssInMB}MB`,
          heapUsed: `${heapUsedInMB}MB`,
          timestamp: new Date().toISOString(),
        });
      } catch (redisError: any) {
        fastify.log.error({ err: redisError }, 'Health check failed: Redis connection error');
        return reply.code(503).send({
          status: 'unhealthy',
          database: 'connected',
          redis: 'disconnected',
          error: redisError.message,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (dbError: any) {
      fastify.log.error({ err: dbError }, 'Health check failed: Database connection error');
      return reply.code(503).send({
        status: 'unhealthy',
        database: 'disconnected',
        redis: 'unknown',
        error: dbError.message,
        timestamp: new Date().toISOString(),
      });
    }
  });
}
