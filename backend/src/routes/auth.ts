import { Hono } from 'hono';
import { Strategy as GitHubStrategy } from 'passport-github2';
import {
  handleGithubCallback,
  createUserSession,
  destroyUserSession,
  requireAuth,
} from '@/middlewares/auth';

const auth = new Hono();

const HOME_URL =
  Deno.env.get('NODE_ENV') === 'development'
    ? 'http://localhost:3000'
    : 'https://apinuri.com';

// GitHub OAuth - initiate
auth.get('/github', async (c) => {
  const githubClientId = Deno.env.get('GITHUB_CLIENT_ID');
  const baseUrl =
    Deno.env.get('NODE_ENV') === 'development'
      ? 'http://localhost:4000'
      : 'https://api.apinuri.com';

  const redirectUri = `${baseUrl}/auth/github/callback`;
  const scope = 'user:email';
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${githubClientId}&redirect_uri=${redirectUri}&scope=${scope}`;

  return c.redirect(githubAuthUrl);
});

// GitHub OAuth - callback
auth.get('/github/callback', async (c) => {
  const code = c.req.query('code');
  const error = c.req.query('error');

  if (error || !code) {
    return c.redirect(`${HOME_URL}/login?error=github_auth_failed`);
  }

  try {
    const githubClientId = Deno.env.get('GITHUB_CLIENT_ID');
    const githubClientSecret = Deno.env.get('GITHUB_CLIENT_SECRET');
    const baseUrl =
      Deno.env.get('NODE_ENV') === 'development'
        ? 'http://localhost:4000'
        : 'https://api.apinuri.com';

    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: githubClientId,
        client_secret: githubClientSecret,
        code,
        redirect_uri: `${baseUrl}/auth/github/callback`,
      }),
    });

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return c.redirect(`${HOME_URL}/login?error=github_token_failed`);
    }

    // Get user profile
    const profileResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    const profile = await profileResponse.json();

    // Get user emails
    const emailsResponse = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    const emails = await emailsResponse.json();
    profile.emails = emails;

    // Handle the callback using existing logic
    const user = await handleGithubCallback(accessToken, '', profile);

    // Create session
    await createUserSession(c, user.id);

    return c.redirect(HOME_URL);
  } catch (err: any) {
    console.error('GitHub OAuth error:', err);
    return c.redirect(`${HOME_URL}/login?error=github_auth_failed`);
  }
});

// Logout
auth.post('/logout', async (c) => {
  await destroyUserSession(c);
  return c.json({ success: true });
});

// Get current user
auth.get('/me', requireAuth, async (c) => {
  const user = c.get('user');
  return c.json({ user });
});

export default auth;