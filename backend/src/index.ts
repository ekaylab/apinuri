import app from './app';
import { initializeDatabase } from '@/lib/db';
import { initializeRedis } from '@/lib/redis';

const PORT = 4000;

// Initialize connections
const databaseUrl = process.env.DATABASE_URL;
const redisUrl = process.env.REDIS_URL;
const nodeEnv = process.env.NODE_ENV || 'development';

if (!databaseUrl) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

if (!redisUrl) {
  console.error('REDIS_URL environment variable is required');
  process.exit(1);
}

try {
  // Parse Redis URL
  const redisUrlObj = new URL(redisUrl);
  const redisHost = redisUrlObj.hostname;
  const redisPort = parseInt(redisUrlObj.port || '6379', 10);
  const redisPassword = redisUrlObj.password || undefined;

  // Initialize database and Redis
  await initializeDatabase(databaseUrl, nodeEnv);
  await initializeRedis(redisHost, redisPort, redisPassword);

  console.log(`🚀 Hono server running on http://localhost:${PORT}`);
  console.log(`Environment: ${nodeEnv}`);

  Bun.serve({
    fetch: app.fetch,
    port: PORT,
    hostname: '0.0.0.0',
  });
} catch (err) {
  console.error('Failed to start server:', err);
  process.exit(1);
}