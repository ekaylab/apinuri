import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { and, eq } from 'drizzle-orm';
import { apiKeys } from '@/models/auth';

const WHITE_LISTED_ROUTES = ['/favicon.ico', '/docs', '/health'];

async function authorization(fastify: FastifyInstance) {
  const { NODE_ENV } = fastify.config;

  if (NODE_ENV === 'development') {
    return;
  }

  fastify.addHook(
    'preHandler',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (WHITE_LISTED_ROUTES.some(route => request.url.startsWith(route))) {
        return;
      }

      if (request.routeOptions.config.skipApiKey) {
        return;
      }

      const xApiKey = request.headers['x-api-key'];

      if (!xApiKey) {
        fastify.log.warn({
          msg: 'Missing API key',
          url: request.url,
          ip: request.ip,
          method: request.method,
          headers: {
            ...request.headers,
            'x-api-key': xApiKey ? '[REDACTED]' : '[MISSING]',
          },
        });
        return reply.code(401).send({ error: 'API key is required' });
      }

      try {
        const apiKey = await fastify.db.query.apiKeys.findFirst({
          where: and(
            eq(apiKeys.key, xApiKey as string),
            eq(apiKeys.is_active, true)
          ),
          columns: {
            key: true,
            allowed_routes: true,
            name: true,
          },
        });

        if (!apiKey) {
          fastify.log.warn({
            msg: 'Invalid API key',
            url: request.url,
            ip: request.ip,
            method: request.method,
            attemptedKey: xApiKey,
          });
          return reply.code(401).send({ error: 'Invalid API key' });
        }

        if (apiKey.allowed_routes && apiKey.allowed_routes.length > 0) {
          const isAllowed = apiKey.allowed_routes.some(route =>
            request.url.startsWith(route)
          );

          if (!isAllowed) {
            fastify.log.warn({
              msg: 'Route access forbidden',
              url: request.url,
              ip: request.ip,
              method: request.method,
              keyName: apiKey.name,
            });
            return reply
              .code(403)
              .send({ error: 'Access to this route is forbidden' });
          }
        }
      } catch (error) {
        fastify.log.error({
          msg: 'API key validation error',
          error: error instanceof Error ? error.message : String(error),
        });
        return reply.code(500).send({ error: 'Internal server error' });
      }
    }
  );
}

export default fp(authorization, {
  name: 'authorization',
});
