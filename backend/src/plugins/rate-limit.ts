import fp from 'fastify-plugin';
import RateLimit from '@fastify/rate-limit';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

async function rateLimit(fastify: FastifyInstance) {
  const { redis } = fastify;

  fastify.setErrorHandler(errorHandler);
  function errorHandler(error: any, request: FastifyRequest, reply: FastifyReply): void {
    if (reply.sent) {
      fastify.log.warn('Response already sent, skipping error handler');
      return;
    }

    if (error.statusCode === 429) {
      fastify.log.warn(
        { ip: request.ip, 'x-forwarded-for': request.headers['x-forwarded-for'] },
        'Rate limit exceeded',
      );
      reply.code(429).send({
        error: 'Too Many Requests',
        message: error.message,
      });
      return;
    }

    if (!reply.sent) {
      reply.send(error);
    }
  }

  await fastify.register(RateLimit, {
    allowList: function (request) {
      const headers = request.headers;
      const isVercelProcess = !!headers['x-vercel-id'] || headers['user-agent'] === 'node';
      const whitelistedIPs = ['127.0.0.1', '::1'];

      const isOAuthRoute =
        request.url.startsWith('/auth/signin');

      return whitelistedIPs.includes(request.ip) || isVercelProcess || isOAuthRoute;
    },
    keyGenerator: function (request) {
      const ip = request.headers['x-forwarded-for'] || request.headers['x-real-ip'];
      const path = request.url;
      return `${ip}:${path}`;
    },
    redis: redis,
    nameSpace: 'rate-limit:',
    timeWindow: '1 minute',
    max: 50,
  });
}

export default fp(rateLimit, {
  name: 'rateLimit',
  dependencies: ['redis'],
});
