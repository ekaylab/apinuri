import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { apiKeys } from '@/models/auth';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';

export default async function apiKeysRoutes(fastify: FastifyInstance) {
  // Generate temporary API key for anonymous users
  fastify.post(
    '/generate',
    {
      config: {
        skipApiKey: true, // Don't require API key to generate one
      },
      schema: {
        description:
          'Generate a temporary API key for anonymous users (based on IP address)',
        tags: ['API Keys'],
        summary: 'Generate temporary API key',
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const ipAddress = request.ip;

        // Check if IP already has an active temporary key
        const existingKey = await fastify.db.query.apiKeys.findFirst({
          where: (keys, { eq, and, isNull, gt }) =>
            and(
              eq(keys.ip_address, ipAddress),
              isNull(keys.user_id),
              eq(keys.is_active, true),
              gt(keys.expires_at, new Date())
            ),
        });

        if (existingKey) {
          return reply.send({
            key: existingKey.key,
            expires_at: existingKey.expires_at,
            message: 'Using existing API key',
          });
        }

        // Generate new API key
        const key = `temp_${uuidv4().replace(/-/g, '')}`;
        const expiresAt = dayjs().add(7, 'days').toDate();

        const [newKey] = await fastify.db
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

        reply.send({
          key: newKey.key,
          expires_at: newKey.expires_at,
          rate_limit: newKey.rate_limit,
          message: 'API key generated successfully',
        });
      } catch (error) {
        fastify.log.error({
          msg: 'Error generating API key',
          error: error instanceof Error ? error.message : String(error),
        });
        reply.code(500).send({ error: 'Failed to generate API key' });
      }
    }
  );
}
