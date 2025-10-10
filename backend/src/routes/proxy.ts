import { Elysia, t } from 'elysia';
import { apiRequests } from '@/models/api';
import { apiKeys } from '@/models/auth';
import { and, eq } from 'drizzle-orm';
import type { AppContext } from '@/types/context';

export const proxyRoutes = new Elysia()
  // Proxy requests to registered APIs
  .all(
    '/proxy/:slug/*',
    async (ctx) => {
      const { params, request, db, set } = ctx as unknown as AppContext;
      const startTime = Date.now();

      try {
        // Validate API key
        const xApiKey = request.headers.get('x-api-key');

        if (!xApiKey) {
          set.status = 401;
          return {
            error: 'API key is required',
            message: 'Include your API key in the x-api-key header. Generate one at POST /api/keys/generate',
          };
        }

        const apiKey = await db.query.apiKeys.findFirst({
          where: and(
            eq(apiKeys.key, xApiKey),
            eq(apiKeys.is_active, true)
          ),
        });

        if (!apiKey) {
          set.status = 401;
          return { error: 'Invalid API key' };
        }

        // Check if API key has expired
        if (apiKey.expires_at && apiKey.expires_at < new Date()) {
          set.status = 401;
          return {
            error: 'API key has expired',
            message: 'Generate a new API key at POST /api/keys/generate',
          };
        }

        const { slug } = params;
        const url = new URL(request.url);
        const path = url.pathname.replace(`/proxy/${slug}/`, '');
        const requestPath = `/${path}`;

        // Find the registered API with endpoints
        const api = await db.query.apis.findFirst({
          where: (apis, { eq, and }) => and(
            eq(apis.slug, slug),
            eq(apis.is_active, true)
          ),
          with: {
            endpoints: {
              where: (endpoints, { eq }) => eq(endpoints.is_active, true),
            },
          },
        });

        if (!api) {
          set.status = 404;
          return { error: 'API not found' };
        }

        // Find matching endpoint (if endpoints are registered)
        let matchedEndpoint = null;
        if (api.endpoints && api.endpoints.length > 0) {
          matchedEndpoint = api.endpoints.find(endpoint => {
            const methodMatches = endpoint.method === request.method;
            const pathMatches =
              endpoint.path === requestPath ||
              endpoint.path === `/${path}` ||
              endpoint.path === path;
            return methodMatches && pathMatches;
          });

          // If endpoints are defined but no match found, reject the request
          if (!matchedEndpoint) {
            set.status = 404;
            return {
              error: 'Endpoint not found',
              message: `${request.method} ${requestPath} is not available for this API`,
            };
          }
        }

        // Build the full URL
        const targetUrl = `${api.base_url}/${path}`;
        const queryString = url.search;
        const fullUrl = targetUrl + queryString;

        // Prepare headers
        const headers: Record<string, string> = {
          'user-agent': 'apinuri-proxy/1.0',
          'x-forwarded-for': request.headers.get('x-forwarded-for') ||
                             request.headers.get('x-real-ip') ||
                             'unknown',
        };

        // Add custom headers from API config
        if (api.headers) {
          Object.assign(headers, api.headers);
        }

        // Forward content-type if present
        const contentType = request.headers.get('content-type');
        if (contentType) {
          headers['content-type'] = contentType;
        }

        // Get request body
        let body: string | undefined;
        if (!['GET', 'HEAD'].includes(request.method)) {
          body = JSON.stringify(await request.json());
        }

        // Make the proxied request
        const response = await fetch(fullUrl, {
          method: request.method,
          headers,
          body,
        });

        const responseTime = Date.now() - startTime;

        // Track usage (async, don't wait)
        const ipAddress = request.headers.get('x-forwarded-for') ||
                         request.headers.get('x-real-ip') ||
                         'unknown';

        db.insert(apiRequests)
          .values({
            api_id: api.id,
            api_key_id: apiKey.id,
            endpoint_id: matchedEndpoint?.id || null,
            method: request.method,
            path: `/${path}${queryString}`,
            status_code: response.status,
            response_time_ms: responseTime,
          })
          .catch(err => {
            console.error('Error tracking API request:', err);
          });

        // Get response body
        const responseContentType = response.headers.get('content-type');
        let responseBody;

        if (responseContentType?.includes('application/json')) {
          responseBody = await response.json();
        } else {
          responseBody = await response.text();
        }

        // Set response headers
        set.status = response.status;
        set.headers['content-type'] = responseContentType || 'application/json';
        set.headers['x-response-time'] = `${responseTime}ms`;

        return responseBody;
      } catch (error) {
        const responseTime = Date.now() - startTime;

        console.error('Proxy request failed:', error);

        set.status = 500;
        return {
          error: 'Proxy request failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    {
      params: t.Object({
        slug: t.String(),
        '*': t.String(),
      }),
      detail: {
        tags: ['Proxy'],
        summary: 'Proxy API request',
        description: 'Proxy requests to registered external APIs',
        hide: true,
      },
    }
  );