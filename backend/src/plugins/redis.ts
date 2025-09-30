import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import fastifyRedis from '@fastify/redis';
import { scanAndDeleteKeys } from '@/utils/redis-helper';
import assert from 'assert';

async function redis(fastify: FastifyInstance) {
  const REDIS_URL = fastify.config.REDIS_URL;

  assert(REDIS_URL, 'REDIS_URL is required');

  fastify.register(fastifyRedis, {
    url: REDIS_URL + '?family=0',
    connectTimeout: 10000,
    tls: {
      rejectUnauthorized: false,
    },
    retryStrategy: (times) => {
      if (times > 10) return null;
      return Math.min(times * 100, 3000);
    },
  });

  fastify.decorate('redisScanAndDelete', (pattern: string, batchSize = 100) =>
    scanAndDeleteKeys(fastify.redis, pattern, batchSize),
  );

  fastify.addHook('onReady', async () => {
    try {
      await fastify.redis.ping();
      fastify.log.info('connected to Redis');
    } catch (error: any) {
      fastify.log.error(`Redis connection test failed: ${error.message}`);
      throw error;
    }
  });
}

export default fp(redis, {
  name: 'redis',
});
