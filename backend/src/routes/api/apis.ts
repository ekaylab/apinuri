import { Elysia, t } from 'elysia';
import { apis, apiEndpoints } from '@/models/api';
import { eq, and } from 'drizzle-orm';
import type { AppContext } from '@/types/context';

const EndpointSchema = t.Object({
  path: t.String({
    description: 'Endpoint path (e.g., "/forecast" or "/weather/{city}")',
  }),
  method: t.Union(
    [
      t.Literal('GET'),
      t.Literal('POST'),
      t.Literal('PUT'),
      t.Literal('DELETE'),
      t.Literal('PATCH'),
    ],
    { description: 'HTTP method' }
  ),
  name: t.String({
    description: 'Endpoint name (e.g., "Get Weather Forecast")',
  }),
  description: t.Optional(t.String({ description: 'Endpoint description' })),
  parameters: t.Optional(t.Any({ description: 'JSON schema for parameters' })),
  response_example: t.Optional(t.Any({ description: 'Example response' })),
});

const RegisterApiBodySchema = t.Object({
  slug: t.String({
    description: 'URL-friendly identifier (e.g., "weather-api")',
    pattern: '^[a-z0-9-]+$',
  }),
  name: t.String({ description: 'API display name' }),
  description: t.Optional(t.String({ description: 'API description' })),
  base_url: t.String({
    description: 'Base URL of your API (e.g., "https://api.example.com")',
    format: 'uri',
  }),
  category: t.Optional(t.String({ description: 'API category' })),
  headers: t.Optional(
    t.Record(t.String(), t.String(), {
      description:
        'Custom headers to include when proxying (e.g., auth tokens)',
    })
  ),
  endpoints: t.Optional(
    t.Array(EndpointSchema, {
      description: 'List of API endpoints to register',
    })
  ),
});

const UpdateApiBodySchema = t.Partial(RegisterApiBodySchema);

const ApiParamsSchema = t.Object({
  apiId: t.String({ format: 'uuid' }),
});

const EndpointParamsSchema = t.Object({
  apiId: t.String({ format: 'uuid' }),
  endpointId: t.String({ format: 'uuid' }),
});

const AddEndpointBodySchema = EndpointSchema;
const UpdateEndpointBodySchema = t.Partial(EndpointSchema);

export const apisRoutes = new Elysia()
  // Register new API (requires authentication)
  .post(
    '/register',
    async ctx => {
      const { body, user, db, config, status } = ctx as AppContext;
      if (!user) {
        return status(401, { error: 'Authentication required' });
      }
      const bodyData = body as any;
      const {
        slug,
        name,
        description,
        base_url,
        category,
        headers,
        endpoints: endpointsList,
      } = bodyData;

      // Check if slug already exists for this user
      const existing = await db.query.apis.findFirst({
        where: and(eq(apis.user_id, user.id), eq(apis.slug, slug)),
      });

      if (existing) {
        return status(409, { error: 'API with this slug already exists' });
      }

      const [newApi] = await db
        .insert(apis)
        .values({
          user_id: user.id,
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
        await db.insert(apiEndpoints).values(
          endpointsList.map((endpoint: any) => ({
            api_id: newApi.id,
            ...endpoint,
            is_active: true,
          }))
        );
      }

      return {
        id: newApi.id,
        slug: newApi.slug,
        name: newApi.name,
        proxy_url: `${config.BASE_URL}/proxy/${newApi.slug}`,
        endpoints_count: endpointsList?.length || 0,
        message: 'API registered successfully',
      };
    },
    {
      body: RegisterApiBodySchema,
      detail: {
        tags: ['APIs'],
        summary: 'Register API',
        description: 'Register a new API to the marketplace',
      },
    }
  )

  // Update API
  .patch(
    '/:apiId',
    async ctx => {
      const { params, body, user, db, config, status } =
        ctx as unknown as AppContext;
      if (!user) {
        return status(401, { error: 'Authentication required' });
      }

      const { apiId } = params;

      // Check if API exists and belongs to user
      const api = await db.query.apis.findFirst({
        where: eq(apis.id, apiId),
      });

      if (!api) {
        return status(404, { error: 'API not found' });
      }

      if (api.user_id !== user.id) {
        return status(403, { error: 'You do not own this API' });
      }

      const bodyData = body as any;
      const [updatedApi] = await db
        .update(apis)
        .set({ ...bodyData, updated_at: new Date() })
        .where(eq(apis.id, apiId))
        .returning();

      if (!updatedApi) {
        return status(404, { error: 'API not found' });
      }

      return {
        ...updatedApi,
        proxy_url: `${config.BASE_URL}/proxy/${updatedApi.slug}`,
        message: 'API updated successfully',
      };
    },
    {
      params: ApiParamsSchema,
      body: UpdateApiBodySchema,
      detail: {
        tags: ['APIs'],
        summary: 'Update API',
        description: 'Update API details',
      },
    }
  )

  // Delete API
  .delete(
    '/:apiId',
    async ctx => {
      const { params, user, db, status } = ctx as unknown as AppContext;
      if (!user) {
        return status(401, { error: 'Authentication required' });
      }

      const { apiId } = params;

      // Check if API exists and belongs to user
      const api = await db.query.apis.findFirst({
        where: eq(apis.id, apiId),
      });

      if (!api) {
        return status(404, { error: 'API not found' });
      }

      if (api.user_id !== user.id) {
        return status(403, { error: 'You do not own this API' });
      }

      await db.delete(apis).where(eq(apis.id, apiId));

      return { message: 'API deleted successfully' };
    },
    {
      params: ApiParamsSchema,
      detail: {
        tags: ['APIs'],
        summary: 'Delete API',
        description: 'Delete API',
      },
    }
  )

  // Get user's APIs (requires authentication)
  .get(
    '/my-apis',
    async ctx => {
      const { user, db, config, status } = ctx as unknown as AppContext;

      if (!user) {
        return status(401, { error: 'Authentication required' });
      }

      const userApis = await db.query.apis.findMany({
        where: eq(apis.user_id, user.id),
        with: {
          endpoints: {
            where: eq(apiEndpoints.is_active, true),
          },
        },
        orderBy: (apis, { desc }) => [desc(apis.created_at)],
      });

      const apisWithProxyUrl = userApis.map((api: any) => ({
        ...api,
        proxy_url: `${config.BASE_URL}/proxy/${api.slug}`,
      }));

      return { apis: apisWithProxyUrl };
    },
    {
      detail: {
        tags: ['APIs'],
        summary: 'Get my APIs',
        description: 'Get all APIs owned by the authenticated user',
      },
    }
  )

  // List all public APIs (no auth required)
  .get(
    '',
    async ctx => {
      const { db, config } = ctx as unknown as AppContext;
      const publicApis = await db.query.apis.findMany({
        where: and(eq(apis.is_public, true), eq(apis.is_active, true)),
        columns: {
          id: true,
          slug: true,
          name: true,
          description: true,
          category: true,
          created_at: true,
        },
      });

      const apisWithProxyUrl = publicApis.map((api: any) => ({
        ...api,
        proxy_url: `${config.BASE_URL}/proxy/${api.slug}`,
      }));

      return { apis: apisWithProxyUrl };
    },
    {
      detail: {
        tags: ['APIs'],
        summary: 'List public APIs',
        description: 'Get all public APIs',
      },
    }
  )

  // Get single API details with endpoints (no auth required)
  .get(
    '/:apiId',
    async ctx => {
      const { params, db, config, status } = ctx as unknown as AppContext;
      const { apiId } = params;

      const api = await db.query.apis.findFirst({
        where: eq(apis.id, apiId),
        with: {
          endpoints: {
            where: eq(apiEndpoints.is_active, true),
          },
        },
      });

      if (!api) {
        return status(404, { error: 'API not found' });
      }

      return {
        ...api,
        proxy_url: `${config.BASE_URL}/proxy/${api.slug}`,
      };
    },
    {
      params: ApiParamsSchema,
      detail: {
        tags: ['APIs'],
        summary: 'Get API details',
        description: 'Get API details by ID including endpoints',
      },
    }
  )

  // Add a new endpoint to an API
  .post(
    '/:apiId/endpoints',
    async ctx => {
      const { params, body, user, db, status } = ctx as unknown as AppContext;
      if (!user) {
        return status(401, { error: 'Authentication required' });
      }

      const { apiId } = params;

      // Check if API exists and belongs to user
      const api = await db.query.apis.findFirst({
        where: eq(apis.id, apiId),
      });

      if (!api) {
        return status(404, { error: 'API not found' });
      }

      if (api.user_id !== user.id) {
        return status(403, { error: 'You do not own this API' });
      }

      const bodyData = body as any;
      const [newEndpoint] = await db
        .insert(apiEndpoints)
        .values({
          api_id: apiId,
          ...bodyData,
          is_active: true,
        })
        .returning();

      return {
        ...newEndpoint,
        message: 'Endpoint added successfully',
      };
    },
    {
      params: ApiParamsSchema,
      body: AddEndpointBodySchema,
      detail: {
        tags: ['APIs'],
        summary: 'Add endpoint to API',
        description: 'Add a new endpoint to an existing API',
      },
    }
  )

  // Update an endpoint
  .patch(
    '/:apiId/endpoints/:endpointId',
    async ctx => {
      const { params, body, user, db, status } = ctx as unknown as AppContext;
      if (!user) {
        return status(401, { error: 'Authentication required' });
      }

      const { apiId, endpointId } = params;

      // Check if API exists and belongs to user
      const api = await db.query.apis.findFirst({
        where: eq(apis.id, apiId),
      });

      if (!api) {
        return status(404, { error: 'API not found' });
      }

      if (api.user_id !== user.id) {
        return status(403, { error: 'You do not own this API' });
      }

      // Check if endpoint exists and belongs to this API
      const endpoint = await db.query.apiEndpoints.findFirst({
        where: and(
          eq(apiEndpoints.id, endpointId),
          eq(apiEndpoints.api_id, apiId)
        ),
      });

      if (!endpoint) {
        return status(404, { error: 'Endpoint not found' });
      }

      const bodyData = body as any;
      const [updatedEndpoint] = await db
        .update(apiEndpoints)
        .set({ ...bodyData, updated_at: new Date() })
        .where(eq(apiEndpoints.id, endpointId))
        .returning();

      return {
        ...updatedEndpoint,
        message: 'Endpoint updated successfully',
      };
    },
    {
      params: EndpointParamsSchema,
      body: UpdateEndpointBodySchema,
      detail: {
        tags: ['APIs'],
        summary: 'Update endpoint',
        description: 'Update an existing endpoint',
      },
    }
  )

  // Delete an endpoint
  .delete(
    '/:apiId/endpoints/:endpointId',
    async ctx => {
      const { params, user, db, status } = ctx as unknown as AppContext;
      if (!user) {
        return status(401, { error: 'Authentication required' });
      }

      const { apiId, endpointId } = params;

      // Check if API exists and belongs to user
      const api = await db.query.apis.findFirst({
        where: eq(apis.id, apiId),
      });

      if (!api) {
        return status(404, { error: 'API not found' });
      }

      if (api.user_id !== user.id) {
        return status(403, { error: 'You do not own this API' });
      }

      // Check if endpoint exists and belongs to this API
      const endpoint = await db.query.apiEndpoints.findFirst({
        where: and(
          eq(apiEndpoints.id, endpointId),
          eq(apiEndpoints.api_id, apiId)
        ),
      });

      if (!endpoint) {
        return status(404, { error: 'Endpoint not found' });
      }

      // Soft delete by setting is_active to false
      await db
        .update(apiEndpoints)
        .set({ is_active: false, updated_at: new Date() })
        .where(eq(apiEndpoints.id, endpointId));

      return { message: 'Endpoint deleted successfully' };
    },
    {
      params: EndpointParamsSchema,
      detail: {
        tags: ['APIs'],
        summary: 'Delete endpoint',
        description: 'Delete an endpoint from an API',
      },
    }
  );
