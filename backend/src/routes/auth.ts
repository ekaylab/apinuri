import { Elysia, type Context } from 'elysia';
import { github, generateState, getGitHubUser, getGitHubUserEmail } from '@/lib/oauth';
import { createSession, invalidateSession } from '@/lib/session';
import { users, userIdentities } from '@/models/user';
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

export const authRoutes = new Elysia({ prefix: '/auth' })
  // GitHub OAuth - Initiate
  .get('/github', async (ctx) => {
    const { cookie, redirect, config } = ctx as unknown as AppContext;
    const state = generateState();
    const url = await github.createAuthorizationURL(state, ['user:email']);

    // Store state in cookie for verification
    cookie.oauth_state.value = state;
    cookie.oauth_state.httpOnly = true;
    cookie.oauth_state.secure = config.NODE_ENV === 'production';
    cookie.oauth_state.maxAge = 60 * 10; // 10 minutes
    cookie.oauth_state.path = '/';

    return redirect(url.toString());
  })

  // GitHub OAuth - Callback
  .get('/github/callback', async (ctx) => {
    const { query, cookie, redirect, db, config } = ctx as unknown as AppContext;
    const { code, state } = query as { code?: string; state?: string };
    const storedState = cookie.oauth_state.value;

    // Validate state (CSRF protection)
    if (!code || !state || !storedState || state !== storedState) {
      return redirect(`${config.HOME_URL}/login?error=invalid_state`);
    }

    try {
      // Exchange code for tokens
      const tokens = await github.validateAuthorizationCode(code);
      const githubUser = await getGitHubUser(tokens.accessToken());

      // Get email if not public
      let email = githubUser.email;
      if (!email) {
        email = await getGitHubUserEmail(tokens.accessToken());
      }

      if (!email) {
        return redirect(`${config.HOME_URL}/login?error=no_email`);
      }

      // Find or create user identity
      let identity = await db.query.userIdentities.findFirst({
        where: and(
          eq(userIdentities.provider, 'github'),
          eq(userIdentities.provider_user_id, githubUser.id.toString())
        ),
        with: { user: true },
      });

      let user;

      if (identity) {
        // Existing user - update tokens
        user = identity.user;
        await db
          .update(userIdentities)
          .set({
            access_token: tokens.accessToken(),
            refresh_token: tokens.refreshToken(),
          })
          .where(
            and(
              eq(userIdentities.provider, 'github'),
              eq(userIdentities.provider_user_id, githubUser.id.toString())
            )
          );
      } else {
        // New user - create user and identity
        const [newUser] = await db
          .insert(users)
          .values({
            email,
            name: githubUser.name,
            avatar_url: githubUser.avatar_url,
          })
          .returning();

        await db.insert(userIdentities).values({
          user_id: newUser.id,
          provider: 'github',
          provider_user_id: githubUser.id.toString(),
          access_token: tokens.accessToken(),
          refresh_token: tokens.refreshToken(),
        });

        user = newUser;
      }

      // Create session
      const sessionId = await createSession(user.id);

      // Set session cookie
      cookie.session.value = sessionId;
      cookie.session.httpOnly = true;
      cookie.session.secure = config.NODE_ENV === 'production';
      cookie.session.maxAge = 60 * 60 * 24 * 30; // 30 days
      cookie.session.path = '/';

      // Clear oauth state
      cookie.oauth_state.remove();

      return redirect(config.HOME_URL);
    } catch (error) {
      console.error('GitHub OAuth error:', error);
      return redirect(`${config.HOME_URL}/login?error=github_auth_failed`);
    }
  })

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