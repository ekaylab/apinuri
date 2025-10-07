import { FastifyInstance } from 'fastify';
import Sensible from '@fastify/sensible';
import Cors from '@fastify/cors';
import Swagger from '@fastify/swagger';
import SwaggerUI from '@fastify/swagger-ui';
import UnderPressure from '@fastify/under-pressure';

const allowedOrigins = ['http://localhost:3000', 'https://apinuri.com'];

export default async function corePlugin(fastify: FastifyInstance) {
  await fastify.register(Sensible);

  await fastify.register(UnderPressure, {
    maxEventLoopDelay: 1000,
    maxHeapUsedBytes: 1000000000,
    maxRssBytes: 1000000000,
    maxEventLoopUtilization: 0.98,
  });

  await fastify.register(Cors, {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: [
      'Origin',
      'Cookie',
      'Set-Cookie',
      'X-Auth-Token',
      'X-CSRF-Token',
      'X-Requested-With',
      'Accept',
      'Accept-Version',
      'Content-Length',
      'Content-MD5',
      'Content-Type',
      'Date',
      'X-Api-Version',
      'X-Api-Key',
      'X-Source-URL',
    ],
    exposedHeaders: ['Set-Cookie'],
  });

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
      // securityDefinitions: {
      //   ApiKeyAuth: {
      //     type: 'apiKey',
      //     name: 'X-Api-Key',
      //     in: 'header',
      //   },
      // },
      // security: [{ ApiKeyAuth: [] }],
    },
  });

  if (fastify.config.NODE_ENV !== 'production') {
    await fastify.register(SwaggerUI, {
      routePrefix: '/docs',
    });
  }
}
