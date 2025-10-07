import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import healthRoute from '@/routes/health';
import authRoute from '@/routes/auth';
import { sessionMiddleware } from '@/middlewares/auth';

const app = new Hono();

const HOME_URL =
  process.env.NODE_ENV === 'development'
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