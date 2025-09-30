import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import assert from 'assert';
import { sql } from 'drizzle-orm';

const schema = {} as const;

export type DB = ReturnType<typeof drizzle<typeof schema>>;

async function db(fastify: FastifyInstance) {
  const { NODE_ENV, DATABASE_URL } = fastify.config;

  assert(DATABASE_URL, 'DATABASE_URL is required');

  fastify.log.info('Connecting to database');

  try {
    const queryClient = postgres(DATABASE_URL, {
      ssl: { rejectUnauthorized: false },
      connect_timeout: 10,
      max: NODE_ENV === 'production' ? 20 : 1,
    });
    const db = drizzle(queryClient, { schema });

    await db.execute(sql`select 1`);
    fastify.log.info('Connected to database successfully');

    fastify.decorate('db', db);

    fastify.addHook('onClose', (_instance, done) => {
      queryClient.end().then(() => {
        fastify.log.info('Database connection closed');
        done();
      });
    });
  } catch (e) {
    fastify.log.error({ e }, 'Failed to initialize database connection');
    throw e;
  }
}

export default fp(db, {
  name: 'db',
});
