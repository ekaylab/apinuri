import { Elysia } from 'elysia';
import { github, generateState, getGitHubUser, getGitHubUserEmail } from '@/lib/oauth';
import { createSession } from '@/lib/session';
import { users, userIdentities } from '@/models/user';
import { eq, and } from 'drizzle-orm';
import type { AppContext } from '@/types/context';

export const githubRoutes = new Elysia({ prefix: '/github' })
  // GitHub OAuth - Initiate
  .get('/', async (ctx) => {
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
  .get('/callback', async (ctx) => {
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
            refresh_token: tokens.hasRefreshToken() ? tokens.refreshToken() : null,
          })
          .where(
            and(
              eq(userIdentities.provider, 'github'),
              eq(userIdentities.provider_user_id, githubUser.id.toString())
            )
          );
      } else {
        // Check if user exists by email
        let existingUser = await db.query.users.findFirst({
          where: eq(users.email, email),
        });

        if (existingUser) {
          // User exists but no GitHub identity - link it
          await db.insert(userIdentities).values({
            user_id: existingUser.id,
            provider: 'github',
            provider_user_id: githubUser.id.toString(),
            access_token: tokens.accessToken(),
            refresh_token: tokens.hasRefreshToken() ? tokens.refreshToken() : null,
          });

          user = existingUser;
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
            refresh_token: tokens.hasRefreshToken() ? tokens.refreshToken() : null,
          });

          user = newUser;
        }
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
  });
