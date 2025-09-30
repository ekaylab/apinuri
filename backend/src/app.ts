import fastify from 'fastify';
import Env from '@fastify/env';
import AutoLoad from '@fastify/autoload';
import path from 'path';
import { Type } from '@sinclair/typebox';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import fastifyStatic from '@fastify/static';
import * as process from 'node:process';

export default async function createServer() {
  console.log('NODE_ENV: ', process.env.NODE_ENV);

  const server = fastify({
    logger:
      process.env.NODE_ENV === 'development'
        ? {
            transport: {
              target: 'pino-pretty',
              options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname,reqId',
              },
            },
            level: 'debug',
          }
        : {
            base: null,
            level: 'info',
          },
    disableRequestLogging: true,
    ajv: {
      customOptions: {
        useDefaults: true,
        coerceTypes: true,
        removeAdditional: 'all',
      },
    },
  });

  server.addHook('onResponse', (request, reply, done) => {
    const logMessage = `${request.method} ${request.raw.url} ${reply.statusCode} ${request.headers['x-forwarded-for']} ${reply.elapsedTime.toFixed(2)}ms`;

    const relevantHeaders = {
      'user-agent': request.headers['user-agent'],
      'content-type': request.headers['content-type'],
      'x-vercel-id': request.headers['x-vercel-id'],
      'x-forwarded-for': request.headers['x-forwarded-for'],
      'x-real-ip': request.headers['x-real-ip'],
      'x-api-key': request.headers['x-api-key'] ? '[REDACTED]' : '[MISSING]',
      referer: request.headers['referer'],
      category: 'access',
    };

    if (reply.statusCode >= 500) {
      server.log.error({ logMessage, headers: relevantHeaders });
    } else if (reply.statusCode >= 400) {
      server.log.warn({ logMessage, headers: relevantHeaders });
    } else {
      server.log.info(logMessage);
    }

    done();
  });

  await server.register(Env, {
    confKey: 'config',
    schema: Type.Object({
      NODE_ENV: Type.String(),
      BASE_URL: Type.String({
        default:
          process.env.NODE_ENV === 'development'
            ? 'http://localhost:4000'
            : 'https://api.apinuri.com',
      }),
      HOME_URL: Type.String({
        default:
          process.env.NODE_ENV === 'development'
            ? 'http://localhost:3000'
            : 'https://apinuri.com',
      }),
      DATABASE_URL: Type.String(),
      REDISHOST: Type.String(),
      REDISPORT: Type.String(),
      REDIS_PASSWORD: Type.String(),
    }),
    dotenv: process.env.NODE_ENV !== 'production',
    data: process.env,
  });

  await server.register(fastifyStatic, {
    root: path.join(__dirname, '..', 'public'),
  });

  dayjs.extend(utc);
  dayjs.extend(timezone);

  await server.register(AutoLoad, {
    dir: path.join(__dirname, 'plugins'),
  });

  await server.register(AutoLoad, {
    dir: path.join(__dirname, 'routes'),
  });

  return server;
}
