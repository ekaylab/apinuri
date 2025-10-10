import { Elysia, t, type Context } from 'elysia';
import { apis, apiEndpoints } from '@/models/api';
import { eq, and } from 'drizzle-orm';
import type { DB } from '@/lib/db';

type AppContext = Context & {
  db: DB;
  config: {
    NODE_ENV: string;
    BASE_URL: string;
    HOME_URL: string;
    DATABASE_URL: string;
    GITHUB_CLIENT_ID: string;
    GITHUB_CLIENT_SECRET: string;
  };
  user: any | null;
  session: any | null;
};

const EndpointSchema = t.Object({
  path: t.String({ description: 'Endpoint path (e.g., "/forecast" or "/weather/{city}")' }),
  method: t.Union([
    t.Literal('GET'),
    t.Literal('POST'),
    t.Literal('PUT'),
    t.Literal('DELETE'),
    t.Literal('PATCH'),
  ], { description: 'HTTP method' }),
  name: t.String({ description: 'Endpoint name (e.g., "Get Weather Forecast")' }),
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
      description: 'Custom headers to include when proxying (e.g., auth tokens)',
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

export const apiRoutes = new Elysia({ prefix: '/api' })
  // Register new API (requires authentication)
  .post(
    '/register',
    async (ctx) => {
      const { body, user, db, config, set } = ctx as unknown as AppContext;
      if (!user) {
        set.status = 401;
        throw new Error('Authentication required');
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
        throw new Error('API with this slug already exists');
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
    async (ctx) => {
      const { params, body, user, db, config, set } = ctx as unknown as AppContext;
      if (!user) {
        set.status = 401;
        throw new Error('Authentication required');
      }

      const { apiId } = params;

      // Check if API exists and belongs to user
      const api = await db.query.apis.findFirst({
        where: eq(apis.id, apiId),
      });

      if (!api) {
        throw new Error('API not found');
      }

      if (api.user_id !== user.id) {
        throw new Error('You do not own this API');
      }

      const bodyData = body as any;
      const [updatedApi] = await db
        .update(apis)
        .set({ ...bodyData, updated_at: new Date() })
        .where(eq(apis.id, apiId))
        .returning();

      if (!updatedApi) {
        throw new Error('API not found');
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
    async (ctx) => {
      const { params, user, db, set } = ctx as unknown as AppContext;
      if (!user) {
        set.status = 401;
        throw new Error('Authentication required');
      }

      const { apiId } = params;

      // Check if API exists and belongs to user
      const api = await db.query.apis.findFirst({
        where: eq(apis.id, apiId),
      });

      if (!api) {
        throw new Error('API not found');
      }

      if (api.user_id !== user.id) {
        throw new Error('You do not own this API');
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

  // List all public APIs (no auth required)
  .get(
    '',
    async (ctx) => {
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
    async (ctx) => {
      const { params, db, config } = ctx as unknown as AppContext;
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
        throw new Error('API not found');
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
  );