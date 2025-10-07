import createServer from './app';

const FASTIFY_PORT = 4000;

const start = async (): Promise<void> => {
  try {
    const server = await createServer();
    await server.listen({ port: FASTIFY_PORT, host: '0.0.0.0' });
    server.log.info(
        `🚀 Fastify server running on http://localhost:${FASTIFY_PORT}`
    );
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();