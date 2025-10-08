import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { apiRequests } from '@/models/api';
import { apiKeys } from '@/models/auth';
import { and, eq } from 'drizzle-orm';

export default async function proxyRoutes(fastify: FastifyInstance) {
  // Proxy requests to registered APIs
  fastify.all(
    '/proxy/:slug/*',
    {
      schema: {
        description: 'Proxy requests to registered external APIs',
        tags: ['Proxy'],
        summary: 'Proxy API request',
        hide: true, // Hide from docs since it's dynamic
      },
    },
    async (request: FastifyRequest<{
      Params: { slug: string; '*': string }
    }>, reply: FastifyReply) => {
      const startTime = Date.now();

      try {
        // Validate API key
        const xApiKey = request.headers['x-api-key'];

        if (!xApiKey) {
          return reply.code(401).send({
            error: 'API key is required',
            message: 'Include your API key in the x-api-key header. Generate one at POST /api/keys/generate'
          });
        }

        const apiKey = await fastify.db.query.apiKeys.findFirst({
          where: and(
            eq(apiKeys.key, xApiKey as string),
            eq(apiKeys.is_active, true)
          ),
        });

        if (!apiKey) {
          return reply.code(401).send({ error: 'Invalid API key' });
        }

        // Check if API key has expired
        if (apiKey.expires_at && apiKey.expires_at < new Date()) {
          return reply.code(401).send({
            error: 'API key has expired',
            message: 'Generate a new API key at POST /api/keys/generate'
          });
        }

        const { slug } = request.params;
        const path = request.params['*'] || '';
        const requestPath = `/${path}`;

        // Find the registered API with endpoints
        const api = await fastify.db.query.apis.findFirst({
          where: (api, { eq, and }) => and(
            eq(api.slug, slug),
            eq(api.is_active, true)
          ),
          with: {
            endpoints: {
              where: (endpoint, { eq }) => eq(endpoint.is_active, true),
            },
          },
        });

        if (!api) {
          return reply.code(404).send({ error: 'API not found' });
        }

        // Find matching endpoint (if endpoints are registered)
        let matchedEndpoint = null;
        if (api.endpoints && api.endpoints.length > 0) {
          matchedEndpoint = api.endpoints.find(endpoint => {
            // Match both method and path
            const methodMatches = endpoint.method === request.method;
            // Simple path matching - can be enhanced with path parameters
            const pathMatches = endpoint.path === requestPath ||
                               endpoint.path === `/${path}` ||
                               endpoint.path === path;
            return methodMatches && pathMatches;
          });

          // If endpoints are defined but no match found, reject the request
          if (!matchedEndpoint) {
            return reply.code(404).send({
              error: 'Endpoint not found',
              message: `${request.method} ${requestPath} is not available for this API`
            });
          }
        }

        // Build the full URL
        const targetUrl = `${api.base_url}/${path}`;
        const queryString = new URL(request.url, 'http://localhost').search;
        const fullUrl = targetUrl + queryString;

        // Prepare headers
        const headers: Record<string, string> = {
          'user-agent': 'apinuri-proxy/1.0',
          'x-forwarded-for': request.ip,
        };

        // Add custom headers from API config
        if (api.headers) {
          Object.assign(headers, api.headers);
        }

        // Forward content-type if present
        if (request.headers['content-type']) {
          headers['content-type'] = request.headers['content-type'];
        }

        // Make the proxied request
        const response = await fetch(fullUrl, {
          method: request.method,
          headers,
          body: ['GET', 'HEAD'].includes(request.method) ? undefined : JSON.stringify(request.body),
        });

        const responseTime = Date.now() - startTime;

        // Track usage (async, don't wait)
        fastify.db
          .insert(apiRequests)
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
            fastify.log.error({
              msg: 'Error tracking API request',
              error: err instanceof Error ? err.message : String(err),
            });
          });

        // Get response body
        const contentType = response.headers.get('content-type');
        let responseBody;

        if (contentType?.includes('application/json')) {
          responseBody = await response.json();
        } else {
          responseBody = await response.text();
        }

        // Forward the response
        reply
          .code(response.status)
          .headers({
            'content-type': contentType || 'application/json',
            'x-response-time': `${responseTime}ms`,
          })
          .send(responseBody);

      } catch (error) {
        const responseTime = Date.now() - startTime;

        fastify.log.error({
          msg: 'Proxy request failed',
          error: error instanceof Error ? error.message : String(error),
          responseTime,
        });

        reply.code(500).send({
          error: 'Proxy request failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );
}