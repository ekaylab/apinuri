import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Type } from '@sinclair/typebox';
import { apiEndpoints, apis } from '@/models/api';
import { eq } from 'drizzle-orm';

const EndpointSchema = Type.Object({
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

const RegisterApiBodySchema = Type.Object({
  slug: Type.String({
    description: 'URL-friendly identifier (e.g., "weather-api")',
    pattern: '^[a-z0-9-]+$',
  }),
  name: Type.String({ description: 'API display name' }),
  description: Type.Optional(Type.String({ description: 'API description' })),
  base_url: Type.String({
    description: 'Base URL of your API (e.g., "https://api.example.com")',
    format: 'uri',
  }),
  category: Type.Optional(Type.String({ description: 'API category' })),
  headers: Type.Optional(
    Type.Record(Type.String(), Type.String(), {
      description:
        'Custom headers to include when proxying (e.g., auth tokens)',
    })
  ),
  endpoints: Type.Optional(
    Type.Array(EndpointSchema, {
      description: 'List of API endpoints to register',
    })
  ),
});

const UpdateApiBodySchema = Type.Partial(RegisterApiBodySchema);

const ApiParamsSchema = Type.Object({
  apiId: Type.String({ format: 'uuid' }),
});

export default async function apisRoutes(fastify: FastifyInstance) {
  // Register new API (requires authentication in production)
  fastify.post(
    '/register',
    {
      schema: {
        description: 'Register a new API to the marketplace',
        tags: ['APIs'],
        summary: 'Register API',
        body: RegisterApiBodySchema,
      },
    },
    async (
      request: FastifyRequest<{ Body: typeof RegisterApiBodySchema.static }>,
      reply: FastifyReply
    ) => {
      try {
        // For MVP without login, use a temporary user_id
        // TODO: Replace with actual authenticated user
        const tempUserId = '00000000-0000-0000-0000-000000000000';

        const {
          slug,
          name,
          description,
          base_url,
          category,
          headers,
          endpoints: endpointsList,
        } = request.body;

        // Check if slug already exists for this user
        const existing = await fastify.db.query.apis.findFirst({
          where: (api, { eq, and }) =>
            and(eq(api.user_id, tempUserId), eq(api.slug, slug)),
        });

        if (existing) {
          return reply
            .code(400)
            .send({ error: 'API with this slug already exists' });
        }

        const [newApi] = await fastify.db
          .insert(apis)
          .values({
            user_id: tempUserId,
            slug,
            name,
            description,
            base_url,
            category,
            headers,
            is_active: true,
            is_public: true,
          })
          .returning();

        // Insert endpoints if provided
        if (endpointsList && endpointsList.length > 0) {
          await fastify.db.insert(apiEndpoints).values(
            endpointsList.map(endpoint => ({
              api_id: newApi.id,
              ...endpoint,
              is_active: true,
            }))
          );
        }

        reply.code(201).send({
          id: newApi.id,
          slug: newApi.slug,
          name: newApi.name,
          proxy_url: `${fastify.config.BASE_URL}/proxy/${newApi.slug}`,
          endpoints_count: endpointsList?.length || 0,
          message: 'API registered successfully',
        });
      } catch (error) {
        fastify.log.error({
          msg: 'Error registering API',
          error: error instanceof Error ? error.message : String(error),
        });
        reply.code(500).send({ error: 'Failed to register API' });
      }
    }
  );

  // List all public APIs
  fastify.get(
    '',
    {
      schema: {
        description: 'Get all public APIs',
        tags: ['APIs'],
        summary: 'List public APIs',
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const publicApis = await fastify.db.query.apis.findMany({
          where: (api, { eq, and }) =>
            and(eq(api.is_public, true), eq(api.is_active, true)),
          columns: {
            id: true,
            slug: true,
            name: true,
            description: true,
            category: true,
            created_at: true,
          },
        });

        const apisWithProxyUrl = publicApis.map(api => ({
          ...api,
          proxy_url: `${fastify.config.BASE_URL}/proxy/${api.slug}`,
        }));

        reply.send({ apis: apisWithProxyUrl });
      } catch (error) {
        fastify.log.error({
          msg: 'Error fetching APIs',
          error: error instanceof Error ? error.message : String(error),
        });
        reply.code(500).send({ error: 'Failed to fetch APIs' });
      }
    }
  );

  // Get single API details with endpoints
  fastify.get(
    '/:apiId',
    {
      schema: {
        description: 'Get API details by ID including endpoints',
        tags: ['APIs'],
        summary: 'Get API details',
        params: ApiParamsSchema,
      },
    },
    async (
      request: FastifyRequest<{ Params: typeof ApiParamsSchema.static }>,
      reply: FastifyReply
    ) => {
      try {
        const { apiId } = request.params;

        const api = await fastify.db.query.apis.findFirst({
          where: (api, { eq }) => eq(api.id, apiId),
          with: {
            endpoints: {
              where: (endpoint, { eq }) => eq(endpoint.is_active, true),
            },
          },
        });

        if (!api) {
          return reply.code(404).send({ error: 'API not found' });
        }

        reply.send({
          ...api,
          proxy_url: `${fastify.config.BASE_URL}/proxy/${api.slug}`,
        });
      } catch (error) {
        fastify.log.error({
          msg: 'Error fetching API',
          error: error instanceof Error ? error.message : String(error),
        });
        reply.code(500).send({ error: 'Failed to fetch API' });
      }
    }
  );

  // Update API
  fastify.patch(
    '/:apiId',
    {
      schema: {
        description: 'Update API details',
        tags: ['APIs'],
        summary: 'Update API',
        params: ApiParamsSchema,
        body: UpdateApiBodySchema,
      },
    },
    async (
      request: FastifyRequest<{
        Params: typeof ApiParamsSchema.static;
        Body: typeof UpdateApiBodySchema.static;
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { apiId } = request.params;
        const updates = request.body;

        const [updatedApi] = await fastify.db
          .update(apis)
          .set({ ...updates, updated_at: new Date() })
          .where(eq(apis.id, apiId))
          .returning();

        if (!updatedApi) {
          return reply.code(404).send({ error: 'API not found' });
        }

        reply.send({
          ...updatedApi,
          proxy_url: `${fastify.config.BASE_URL}/proxy/${updatedApi.slug}`,
          message: 'API updated successfully',
        });
      } catch (error) {
        fastify.log.error({
          msg: 'Error updating API',
          error: error instanceof Error ? error.message : String(error),
        });
        reply.code(500).send({ error: 'Failed to update API' });
      }
    }
  );

  // Delete API
  fastify.delete(
    '/:apiId',
    {
      schema: {
        description: 'Delete API',
        tags: ['APIs'],
        summary: 'Delete API',
        params: ApiParamsSchema,
      },
    },
    async (
      request: FastifyRequest<{ Params: typeof ApiParamsSchema.static }>,
      reply: FastifyReply
    ) => {
      try {
        const { apiId } = request.params;

        await fastify.db.delete(apis).where(eq(apis.id, apiId));

        reply.send({ message: 'API deleted successfully' });
      } catch (error) {
        fastify.log.error({
          msg: 'Error deleting API',
          error: error instanceof Error ? error.message : String(error),
        });
        reply.code(500).send({ error: 'Failed to delete API' });
      }
    }
  );
}
