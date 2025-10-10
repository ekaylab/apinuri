import { Elysia, type Context } from 'elysia';
import { apiKeys } from '@/models/auth';
import { and, eq, isNull, gt } from 'drizzle-orm';
import dayjs from 'dayjs';
import type { DB } from '@/lib/db';

type AppContext = Context & {
  db: DB;
  config: {
    NODE_ENV: string;
    BASE_URL: string;
    HOME_URL: string;
    DATABASE_URL: string;
    GITHUB_CLIENT_ID: string;
    GITHUB_CLIENT_SECRET: string;
  };
  user: any | null;
  session: any | null;
};

export const keysRoutes = new Elysia({ prefix: '/api/keys' })
  // Generate temporary API key for anonymous users
  .post(
    '/generate',
    async (ctx) => {
      const { request, db } = ctx as unknown as AppContext;
      const ipAddress = request.headers.get('x-forwarded-for') ||
                        request.headers.get('x-real-ip') ||
                        'unknown';

      // Check if IP already has an active temporary key
      const existingKey = await db.query.apiKeys.findFirst({
        where: and(
          eq(apiKeys.ip_address, ipAddress),
          isNull(apiKeys.user_id),
          eq(apiKeys.is_active, true),
          gt(apiKeys.expires_at, new Date())
        ),
      });

      if (existingKey) {
        return {
          key: existingKey.key,
          expires_at: existingKey.expires_at,
          message: 'Using existing API key',
        };
      }

      // Generate new API key using Bun's native crypto
      const key = `temp_${crypto.randomUUID().replace(/-/g, '')}`;
      const expiresAt = dayjs().add(7, 'days').toDate();

      const [newKey] = await db
        .insert(apiKeys)
        .values({
          key,
          ip_address: ipAddress,
          name: 'Temporary API Key',
          is_active: true,
          rate_limit: 100, // 100 requests per hour for temp keys
          expires_at: expiresAt,
        })
        .returning();

      return {
        key: newKey.key,
        expires_at: newKey.expires_at,
        rate_limit: newKey.rate_limit,
        message: 'API key generated successfully',
      };
    },
    {
      detail: {
        tags: ['API Keys'],
        summary: 'Generate temporary API key',
        description: 'Generate a temporary API key for anonymous users (based on IP address)',
      },
    }
  );