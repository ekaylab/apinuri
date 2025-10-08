import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fastifyPassport from '@fastify/passport';

export default async function authRoutes(fastify: FastifyInstance) {
  const { HOME_URL } = fastify.config;

  // GitHub OAuth
  fastify.get(
    '/github',
    {
      schema: {
        hide: true,
      },
      preValidation: fastifyPassport.authenticate('github', {
        scope: ['user:email'],
      }),
    },
    async () => {}
  );

  fastify.get(
    '/github/callback',
    {
      schema: {
        hide: true,
      },
      preValidation: fastifyPassport.authenticate('github', {
        successRedirect: HOME_URL,
        failureRedirect: `${HOME_URL}/login?error=github_auth_failed`,
      }),
    },
    async () => {}
  );

  // Logout
  fastify.post(
    '/logout',
    async (request: FastifyRequest, reply: FastifyReply) => {
      request.logout();
      reply.send({ success: true });
    }
  );

  // Get current user
  fastify.get('/me', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.isAuthenticated()) {
      return reply.code(401).send({ error: 'Not authenticated' });
    }
    reply.send({ user: request.user });
  });
}
