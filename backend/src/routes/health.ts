import { FastifyInstance } from 'fastify';

export default async function health(fastify: FastifyInstance) {
  fastify.get('/health', async () => {
    return { status: 'ok' };
  });
}