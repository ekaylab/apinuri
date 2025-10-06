import { Hono } from '@hono/hono';
import { cors } from '@hono/hono/middleware';
import { logger } from '@hono/hono/middleware'
import { sessionMiddleware } from '@/middlewares/auth';
import healthRoute from '@/routes/health';
import authRoute from '@/routes/auth';

const app = new Hono();

const HOME_URL =
  Deno.env.get('NODE_ENV') === 'development'
    ? 'http://localhost:3000'
    : 'https://apinuri.com';

app.use(logger());
app.use(
  '*',
  cors({
    origin: HOME_URL,
    credentials: true,
  })
);
app.use('*', sessionMiddleware);

// Routes
app.route('/health', healthRoute);
app.route('/auth', authRoute);

// Root route
app.get('/', (c) => {
  return c.json({
    message: 'Apinuri API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

export default app;