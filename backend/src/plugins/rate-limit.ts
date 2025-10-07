import fp from 'fastify-plugin';
import RateLimit from '@fastify/rate-limit';
import { FastifyInstance } from 'fastify';

async function rateLimit(fastify: FastifyInstance) {
  fastify.setErrorHandler(errorHandler);
  function errorHandler(error: any, request: any, reply: any) {
    if (reply.sent) {
      fastify.log.warn('Response already sent, skipping error handler');
      return;
    }

    if (error.statusCode === 429) {
      fastify.log.warn(
        {
          ip: request.ip,
          'x-forwarded-for': request.headers['x-forwarded-for'],
        },
        'Rate limit exceeded'
      );
      return reply.code(429).send({
        error: 'Too Many Requests',
        message: error.message,
      });
    }

    if (!reply.sent) {
      reply.send(error);
    }
  }

  await fastify.register(RateLimit, {
    allowList: function (request) {
      const headers = request.headers;
      const isVercelProcess =
        !!headers['x-vercel-id'] || headers['user-agent'] === 'node';
      const whitelistedIPs = ['127.0.0.1', '::1'];

      const isOAuthRoute =
        request.url.startsWith('/auth/kakao') ||
        request.url.startsWith('/auth/naver') ||
        request.url.startsWith(
          '/mysmartel/additional-service/getSubscribedServices'
        ) ||
        request.url.startsWith('/auth/signin');

      return (
        whitelistedIPs.includes(request.ip) || isVercelProcess || isOAuthRoute
      );
    },
    keyGenerator: function (request) {
      const apiKey = request.headers['x-api-key'];
      const ip =
        request.headers['x-forwarded-for'] || request.headers['x-real-ip'] || request.ip;

      // Use API key if available, otherwise use IP
      return apiKey ? `apikey:${apiKey}` : `ip:${ip}`;
    },
    nameSpace: 'rate-limit:',
    timeWindow: '1 minute',
    max: 50,
  });
}

export default fp(rateLimit, {
  name: 'rateLimit',
});
