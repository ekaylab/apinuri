import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import fastifyRedis from '@fastify/redis';
import { scanAndDeleteKeys } from '@/utils/redis-helper';
import assert from 'assert';

async function redis(fastify: FastifyInstance) {
  const REDIS_HOST = fastify.config.REDISHOST;
  const REDIS_PORT = fastify.config.REDISPORT;
  const REDIS_PASSWORD = fastify.config.REDISPASSWORD;

  assert(REDIS_HOST, 'REDIS_HOST is required');
  assert(REDIS_PASSWORD, 'REDIS_PASSWORD is required');

  fastify.log.info(`Redis confighost:${REDIS_HOST}`);
  fastify.log.info(`Redis configport:${REDIS_PORT}`);
  fastify.log.info(`Redis configpw:${REDIS_PASSWORD}`);

  fastify.register(fastifyRedis, {
    host: REDIS_HOST,
    port: parseInt(REDIS_PORT || '6379'),
    password: REDIS_PASSWORD,
    family: 0,
    connectTimeout: 10000,
    retryStrategy: times => {
      if (times > 10) return null;
      return Math.min(times * 100, 3000);
    },
  });

  fastify.decorate('redisScanAndDelete', (pattern: string, batchSize = 100) =>
    scanAndDeleteKeys(fastify.redis, pattern, batchSize)
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
