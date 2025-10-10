import { Elysia } from 'elysia';
import { apisRoutes } from './apis';
import { keysRoutes } from './keys';

export const apiRoutes = new Elysia({ prefix: '/api' })
  .use(apisRoutes)
  .use(keysRoutes);