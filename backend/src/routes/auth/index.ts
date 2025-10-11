import { Elysia } from 'elysia';
import { githubRoutes } from './github';
import { invalidateSession } from '@/lib/session';
import type { AppContext } from '@/types/context';

export const authRoutes = new Elysia({ prefix: '/auth' })
  .use(githubRoutes)

  // Logout
  .post('/logout', async (ctx) => {
    const { cookie } = ctx as unknown as AppContext;
    const sessionId = cookie.session?.value;

    if (sessionId && typeof sessionId === 'string') {
      await invalidateSession(sessionId);
      cookie.session.remove();
    }

    return { success: true };
  })

  // Get current user
  .get('/me', async (ctx) => {
    const { user } = ctx as unknown as AppContext;
    if (!user) {
      return { error: 'Not authenticated' };
    }

    return { user };
  }, {
    detail: {
      tags: ['Auth'],
      summary: 'Get current user',
      description: 'Get the currently authenticated user',
    },
  });