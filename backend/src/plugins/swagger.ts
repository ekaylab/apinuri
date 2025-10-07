import fp from 'fastify-plugin';
import Swagger from '@fastify/swagger';
import SwaggerUI from '@fastify/swagger-ui';
import { FastifyInstance } from 'fastify';

async function swaggerGenerator(fastify: FastifyInstance) {
  await fastify.register(Swagger, {
    swagger: {
      info: {
        title: 'Smartel Backend',
        description: 'Smartel Core Backend',
        version: '0.1.0',
      },
      host: `localhost:${process.env.FASTIFY_PORT || 4000}`,
      schemes: ['http', 'https'],
      consumes: ['application/json'],
      produces: ['application/json', 'text/html'],
      securityDefinitions: {
        ApiKeyAuth: {
          type: 'apiKey',
          name: 'X-Api-Key',
          in: 'header',
        },
      },
      security: [{ ApiKeyAuth: [] }],
    },
  });

  if (fastify.config.NODE_ENV !== 'production') {
    await fastify.register(SwaggerUI, {
      routePrefix: '/docs',
    });
  }
}

export default fp(swaggerGenerator, {
  name: 'swaggerGenerator',
});
