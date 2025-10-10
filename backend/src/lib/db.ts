import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '@/models';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

const queryClient = postgres(DATABASE_URL, {
  ssl: { rejectUnauthorized: false },
  connect_timeout: 10,
  max: process.env.NODE_ENV === 'production' ? 20 : 1,
});

export const db = drizzle(queryClient, { schema });
export type DB = typeof db;