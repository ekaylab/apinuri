import { FastifyInstance } from 'fastify';
import { Type, Static } from '@sinclair/typebox';
import { apiEndpoints } from '@/models/api';
import { eq } from 'drizzle-orm';

const EndpointBodySchema = Type.Object({
  path: Type.String({
    description: 'Endpoint path (e.g., "/forecast" or "/weather/{city}")',
  }),
  method: Type.String({
    description: 'HTTP method',
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  }),
  name: Type.String({
    description: 'Endpoint name (e.g., "Get Weather Forecast")',
  }),
  description: Type.Optional(
    Type.String({ description: 'Endpoint description' })
  ),
  parameters: Type.Optional(
    Type.Any({ description: 'JSON schema for parameters' })
  ),
  response_example: Type.Optional(
    Type.Any({ description: 'Example response' })
  ),
});

const UpdateEndpointBodySchema = Type.Partial(EndpointBodySchema);

const EndpointParamsSchema = Type.Object({
  apiId: Type.String({ format: 'uuid' }),
  endpointId: Type.String({ format: 'uuid' }),
});

const ApiIdParamsSchema = Type.Object({
  apiId: Type.String({ format: 'uuid' }),
});

export default async function endpointsRoutes(fastify: FastifyInstance) {
  // Add new endpoint to an API
  fastify.post<{
    Params: Static<typeof ApiIdParamsSchema>;
    Body: Static<typeof EndpointBodySchema>;
  }>(
    '/:apiId/endpoints',
    {
      schema: {
        description: 'Add a new endpoint to an API',
        tags: ['Endpoints'],
        summary: 'Add endpoint',
        params: ApiIdParamsSchema,
        body: EndpointBodySchema,
      },
    },
    async (request, reply) => {
      try {
        const { apiId } = request.params;
        const endpointData = request.body;

        const [newEndpoint] = await fastify.db
          .insert(apiEndpoints)
          .values({
            api_id: apiId,
            ...endpointData,
            is_active: true,
          })
          .returning();

        reply.code(201).send({
          ...newEndpoint,
          message: 'Endpoint added successfully',
        });
      } catch (error) {
        fastify.log.error({
          msg: 'Error adding endpoint',
          error: error instanceof Error ? error.message : String(error),
        });
        reply.code(500).send({ error: 'Failed to add endpoint' });
      }
    }
  );

  // Get all endpoints for an API
  fastify.get<{ Params: Static<typeof ApiIdParamsSchema> }>(
    '/:apiId/endpoints',
    {
      schema: {
        description: 'Get all endpoints for an API',
        tags: ['Endpoints'],
        summary: 'List API endpoints',
        params: ApiIdParamsSchema,
      },
    },
    async (request, reply) => {
      try {
        const { apiId } = request.params;

        const endpoints = await fastify.db.query.apiEndpoints.findMany({
          where: (endpoint, { eq, and }) =>
            and(eq(endpoint.api_id, apiId), eq(endpoint.is_active, true)),
        });

        reply.send({ endpoints });
      } catch (error) {
        fastify.log.error({
          msg: 'Error fetching endpoints',
          error: error instanceof Error ? error.message : String(error),
        });
        reply.code(500).send({ error: 'Failed to fetch endpoints' });
      }
    }
  );

  // Update endpoint
  fastify.patch<{
    Params: Static<typeof EndpointParamsSchema>;
    Body: Static<typeof UpdateEndpointBodySchema>;
  }>(
    '/:apiId/endpoints/:endpointId',
    {
      schema: {
        description: 'Update an endpoint',
        tags: ['Endpoints'],
        summary: 'Update endpoint',
        params: EndpointParamsSchema,
        body: UpdateEndpointBodySchema,
      },
    },
    async (request, reply) => {
      try {
        const { endpointId } = request.params;
        const updates = request.body;

        const [updatedEndpoint] = await fastify.db
          .update(apiEndpoints)
          .set({ ...updates, updated_at: new Date() })
          .where(eq(apiEndpoints.id, endpointId))
          .returning();

        if (!updatedEndpoint) {
          return reply.code(404).send({ error: 'Endpoint not found' });
        }

        reply.send({
          ...updatedEndpoint,
          message: 'Endpoint updated successfully',
        });
      } catch (error) {
        fastify.log.error({
          msg: 'Error updating endpoint',
          error: error instanceof Error ? error.message : String(error),
        });
        reply.code(500).send({ error: 'Failed to update endpoint' });
      }
    }
  );

  // Delete endpoint
  fastify.delete<{ Params: Static<typeof EndpointParamsSchema> }>(
    '/:apiId/endpoints/:endpointId',
    {
      schema: {
        description: 'Delete an endpoint',
        tags: ['Endpoints'],
        summary: 'Delete endpoint',
        params: EndpointParamsSchema,
      },
    },
    async (request, reply) => {
      try {
        const { endpointId } = request.params;

        await fastify.db
          .delete(apiEndpoints)
          .where(eq(apiEndpoints.id, endpointId));

        reply.send({ message: 'Endpoint deleted successfully' });
      } catch (error) {
        fastify.log.error({
          msg: 'Error deleting endpoint',
          error: error instanceof Error ? error.message : String(error),
        });
        reply.code(500).send({ error: 'Failed to delete endpoint' });
      }
    }
  );
}
