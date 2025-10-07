import 'fastify';
import type { DB } from '@/plugins/db';

declare module 'fastify' {
  interface FastifyContextConfig {
    skipApiKey?: boolean;
    requireAuth?: boolean;
  }

  interface FastifyInstance {
    config: {
      NODE_ENV: string;
      DATABASE_URL: string;
      BASE_URL: string;
      HOME_URL: string;
    };
    db: DB;
  }
}
