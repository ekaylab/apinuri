import { Elysia } from 'elysia';
import { apiKeys } from '@/models/auth';
import { and, eq, isNull, gt } from 'drizzle-orm';
import dayjs from 'dayjs';
import type { AppContext } from '@/types/context';

export const keysRoutes = new Elysia().post(
  '/generate',
  async ctx => {
    const { request, db } = ctx as unknown as AppContext;

    // Get IP address with proper fallbacks for local/direct requests
    // @ts-ignore - Bun Request has ip property
    const directIP = request.ip;
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      directIP ||
      '127.0.0.1';

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
      description:
        'Generate a temporary API key for anonymous users (based on IP address)',
    },
  }
);
