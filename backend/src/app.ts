import { Elysia } from 'elysia';
import { swagger } from '@elysiajs/swagger';
import { cors } from '@elysiajs/cors';
import { routes } from '@/routes';
import { db } from '@/lib/db';

export const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  BASE_URL:
    process.env.NODE_ENV === 'development'
      ? 'http://localhost:4000'
      : 'https://api.apinuri.com',
  HOME_URL:
    process.env.NODE_ENV === 'development'
      ? 'http://localhost:3000'
      : 'https://apinuri.com',
  DATABASE_URL: process.env.DATABASE_URL!,
};

export const app = new Elysia()
  .decorate('db', db)
  .decorate('config', config)
  .use(
    cors({
      origin: config.HOME_URL,
      credentials: true,
    })
  )
  .use(
    swagger({
      path: '/docs',
      documentation: {
        info: {
          title: 'Apinuri API',
          version: '1.0.0',
          description: 'API marketplace and proxy service',
        },
        tags: [
          { name: 'APIs', description: 'API management endpoints' },
          { name: 'API Keys', description: 'API key management endpoints' },
          { name: 'Proxy', description: 'Proxy endpoints' },
        ],
      },
    })
  )
  .onRequest(({ request, set }) => {
    const start = Date.now();
    set.headers['x-request-start'] = start.toString();
  })
  .onAfterResponse(({ request, set }) => {
    const start = parseInt((set.headers['x-request-start'] as string) || '0');
    const duration = Date.now() - start;

    console.log(
      `${request.method} ${new URL(request.url).pathname} ${duration}ms`
    );
  })
  .onError(({ request, error, code, set }) => {
    const start = parseInt((set.headers['x-request-start'] as string) || '0');
    const duration = Date.now() - start;
    const pathname = new URL(request.url).pathname;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error(
      `${request.method} ${pathname} ${set.status || 500} ${duration}ms - Error: ${errorMessage || code}`
    );

    // Return structured error response
    return {
      error: code,
      message: errorMessage || 'Internal server error',
      path: pathname,
    };
  })
  .use(routes);
