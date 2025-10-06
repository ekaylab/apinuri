import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import * as schema from '@/models';

export type DB = ReturnType<typeof drizzle<typeof schema>>;

let dbInstance: DB | null = null;
let postgresClient: ReturnType<typeof postgres> | null = null;

export async function initializeDatabase(databaseUrl: string, nodeEnv: string) {
  if (dbInstance) return dbInstance;

  console.log('Connecting to database');

  try {
    postgresClient = postgres(databaseUrl, {
      ssl: { rejectUnauthorized: false },
      connect_timeout: 10,
      max: nodeEnv === 'production' ? 20 : 1,
    });

    dbInstance = drizzle(postgresClient, { schema });

    await dbInstance.execute(sql`select 1`);
    console.log('Connected to database successfully');

    return dbInstance;
  } catch (e) {
    console.error('Failed to initialize database connection:', e);
    throw e;
  }
}

export function getDatabase(): DB {
  if (!dbInstance) {
    throw new Error('Database not initialized');
  }
  return dbInstance;
}

export const db = new Proxy({} as DB, {
  get: (_target, prop) => {
    const instance = getDatabase();
    return instance[prop as keyof DB];
  }
});

export async function closeDatabase() {
  if (postgresClient) {
    await postgresClient.end();
    console.log('Database connection closed');
    dbInstance = null;
    postgresClient = null;
  }
}
