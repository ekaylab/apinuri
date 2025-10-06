import app from './app.ts';
import { initializeDatabase } from '@/lib/db';
import { initializeRedis } from '@/lib/redis';

const PORT = 4000;

// Initialize connections
const databaseUrl = Deno.env.get('DATABASE_URL');
const redisUrl = Deno.env.get('REDIS_URL');
const nodeEnv = Deno.env.get('NODE_ENV') || 'development';

if (!databaseUrl) {
  console.error('DATABASE_URL environment variable is required');
  Deno.exit(1);
}

if (!redisUrl) {
  console.error('REDIS_URL environment variable is required');
  Deno.exit(1);
}

try {
  // Parse Redis URL
  const redisUrlObj = new URL(redisUrl);
  const redisHost = redisUrlObj.hostname;
  const redisPort = parseInt(redisUrlObj.port || '6379', 10);

  // Initialize database and Redis
  await initializeDatabase(databaseUrl, nodeEnv);
  await initializeRedis(redisHost, redisPort);

  console.log(`🚀 Hono server running on http://localhost:${PORT}`);
  console.log(`Environment: ${nodeEnv}`);

  Deno.serve({
    fetch: app.fetch,
    port: PORT,
    hostname: '0.0.0.0',
  });
} catch (err) {
  console.error('Failed to start server:', err);
  Deno.exit(1);
}