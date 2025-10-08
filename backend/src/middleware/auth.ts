import { FastifyReply, FastifyRequest } from 'fastify';

export const authMiddleware = {
  async requireAuth(request: FastifyRequest, reply: FastifyReply) {
    if (!request.isAuthenticated()) {
      return reply.code(401).send({
        error: 'Authentication required',
        message: 'You must be logged in to perform this action',
      });
    }
  },
};
