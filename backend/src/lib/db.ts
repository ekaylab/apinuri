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

  const maxRetries = 10;
  const retryDelay = 2000; // 2 seconds between retries

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
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
    } catch (e: any) {
      const isStartingUp = e?.message?.includes('starting up') || e?.code === '57P03';

      if (attempt < maxRetries) {
        console.log(`Database connection failed (attempt ${attempt}/${maxRetries}). Retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));

        // Clean up failed connection attempt
        if (postgresClient) {
          try {
            await postgresClient.end();
          } catch {}
          postgresClient = null;
        }
        dbInstance = null;
      } else {
        console.error('Failed to initialize database connection:', e);
        throw e;
      }
    }
  }

  throw new Error('Failed to connect to database after maximum retries');
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
