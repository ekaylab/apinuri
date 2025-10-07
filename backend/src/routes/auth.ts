import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fastifyPassport from '@fastify/passport';

export default async function authRoutes(fastify: FastifyInstance) {
  const { HOME_URL } = fastify.config;

  // GitHub OAuth
  fastify.get(
      '/auth/github',
      {
        preValidation: fastifyPassport.authenticate('github', {
          scope: ['user:email'],
        }),
      },
      async () => {}
  );

  fastify.get(
      '/auth/github/callback',
      {
        preValidation: fastifyPassport.authenticate('github', {
          successRedirect: HOME_URL,
          failureRedirect: `${HOME_URL}/login?error=github_auth_failed`,
        }),
      },
      async () => {}
  );

  // Logout
  fastify.post('/auth/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    request.logout();
    reply.send({ success: true });
  });

  // Get current user
  fastify.get('/auth/me', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.isAuthenticated()) {
      return reply.code(401).send({ error: 'Not authenticated' });
    }
    reply.send({ user: request.user });
  });
}