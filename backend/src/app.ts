import { Elysia } from 'elysia';
import { swagger } from '@elysiajs/swagger';
import { cors } from '@elysiajs/cors';
import { cookie } from '@elysiajs/cookie';
import { db } from './lib/db';
import { validateSession } from './lib/session';
import { authRoutes } from './routes/auth';
import { apiRoutes } from './routes/api';
import { keysRoutes } from './routes/keys';
import { proxyRoutes } from './routes/proxy';

// Configuration
const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  BASE_URL: process.env.BASE_URL ||
    (process.env.NODE_ENV === 'development'
      ? 'http://localhost:4000'
      : 'https://api.apinuri.com'),
  HOME_URL: process.env.HOME_URL ||
    (process.env.NODE_ENV === 'development'
      ? 'http://localhost:3000'
      : 'https://apinuri.com'),
  DATABASE_URL: process.env.DATABASE_URL!,
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID!,
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET!,
};

// Create Elysia app
export const app = new Elysia()
  .decorate('db', db)
  .decorate('config', config)
  .use(cookie())
  .use(cors({
    origin: config.HOME_URL,
    credentials: true,
  }))
  .use(swagger({
    documentation: {
      info: {
        title: 'Apinuri API',
        version: '1.0.0',
        description: 'API marketplace and proxy service',
      },
      tags: [
        { name: 'Auth', description: 'Authentication endpoints' },
        { name: 'APIs', description: 'API management endpoints' },
        { name: 'API Keys', description: 'API key management endpoints' },
        { name: 'Proxy', description: 'Proxy endpoints' },
      ],
    },
  }))
  // Auth middleware decorator
  .derive(async ({ cookie }) => {
    const sessionId = cookie.session;

    if (!sessionId) {
      return { user: null, session: null };
    }

    const { session, user } = await validateSession(sessionId);
    return { user, session };
  })
  // Request logging
  .onRequest(({ request, set }) => {
    const start = Date.now();
    set.headers['x-request-start'] = start.toString();
  })
  .onAfterResponse(({ request, set }) => {
    const start = parseInt(set.headers['x-request-start'] as string || '0');
    const duration = Date.now() - start;

    console.log(
      `${request.method} ${new URL(request.url).pathname} ${duration}ms`
    );
  })
  // Register routes
  .use(authRoutes)
  .use(apiRoutes)
  .use(keysRoutes)
  .use(proxyRoutes);