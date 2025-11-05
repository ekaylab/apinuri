import { Elysia } from 'elysia';
import { apiRoutes } from './api';
import { proxyRoutes } from './proxy';

/**
 * Autoload all routes and combine them into a single Elysia instance
 */
export const routes = new Elysia()
  .use(apiRoutes)
  .use(proxyRoutes);

// Also export individual routes if needed
export { apiRoutes, proxyRoutes };