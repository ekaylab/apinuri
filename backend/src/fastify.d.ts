import 'fastify';
import {DB} from '@/plugins/db';
import Redis from 'ioredis';

interface User {
  id: string;
  main_email: string;
  name?: string;
  user_type: string;
  adminInfo?: UserAdminInfo;
  identities?: any[];
}

declare module 'fastify' {
  interface FastifyContextConfig {
    skipApiKey?: boolean;
    requireAuth?: boolean;
  }

  interface PassportUser extends User {}

  interface FastifyRequest {
    user?: User;
    login: (user: User, callback: (err: Error) => void) => void;
    logout: () => void;
    isAuthenticated: () => boolean;
    isUnauthenticated: () => boolean;
  }

  interface FastifyInstance {
    config: {
      NODE_ENV: string;
      HOME_URL: string;
      BASE_URL: string;
      DATABASE_URL: string;
      REDIS_URL: string;
    };
    redis: Redis;
    redisScanAndDelete: (pattern: string, batchSize?: number) => Promise<number>;
    db: DB;
  }
}
