import { SQL } from 'bun';
import { drizzle, type BunSQLDatabase } from 'drizzle-orm/bun-sql';
import * as schema from '@/models';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

const client = new SQL(DATABASE_URL);

export const db = drizzle({ client, schema });
export type DB = BunSQLDatabase<typeof schema>;