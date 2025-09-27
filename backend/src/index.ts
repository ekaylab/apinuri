import fastify from 'fastify'

const server = fastify({
  logger: true
})

const start = async (): Promise<void> => {
  try {
    await server.listen({ port: 3000 })
    server.log.info('Server listening on http://localhost:3000')
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start()