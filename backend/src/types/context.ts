import type { Context } from 'elysia';
import type { DB } from '@/lib/db';

export type AppConfig = {
  NODE_ENV: string;
  BASE_URL: string;
  HOME_URL: string;
  DATABASE_URL: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
};

export type AppContext = Context & {
  db: DB;
  config: AppConfig;
  user: any | null;
  session: any | null;
};