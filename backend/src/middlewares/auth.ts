import {Profile as GitHubProfile} from 'passport-github2';
import {and, eq} from 'drizzle-orm';
import {userIdentities, users} from '@/models';
import {getDatabase} from '@/lib/db';
import {getRedis} from '@/lib/redis';
import type {Context, MiddlewareHandler} from 'hono';
import {deleteCookie, getCookie, setCookie} from 'hono/cookie';
import {v4 as uuidv4} from 'uuid';

const SESSION_SECRET = process.env.SESSION_SECRET || 'change-this-secret-in-production';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

interface SessionData {
  userId?: string;
  cookie?: {
    maxAge: number;
  };
}

// Session management functions
async function setSession(sessionId: string, session: SessionData) {
  const redis = getRedis();
  const maxAgeSeconds = Math.ceil((session.cookie?.maxAge || 3600000) / 1000);
  await redis.set(`auth:session:${sessionId}`, JSON.stringify(session), 'EX', maxAgeSeconds);
}

async function getSession(sessionId: string): Promise<SessionData | null> {
  const redis = getRedis();
  const sessionData = await redis.get(`auth:session:${sessionId}`);
  return sessionData ? JSON.parse(sessionData) : null;
}

async function destroySession(sessionId: string) {
  const redis = getRedis();
  await redis.unlink(`auth:session:${sessionId}`);
}

// Session middleware
export const sessionMiddleware: MiddlewareHandler = async (c, next) => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const sessionId = getCookie(c, 'sessionId');

  if (sessionId) {
    const session = await getSession(sessionId);
    if (session?.userId) {
      const db = getDatabase();
      const user = await db.query.users.findFirst({
        where: eq(users.id, session.userId),
      });
      if (user) {
        c.set('user', user);
      }
    }
  }

  await next();

  // Refresh session cookie on response
  const currentSessionId = getCookie(c, 'sessionId');
  if (currentSessionId) {
    const cookieDomain = nodeEnv === 'development' ? 'localhost' : '.apinuri.com';
    setCookie(c, 'sessionId', currentSessionId, {
      path: '/',
      httpOnly: true,
      secure: nodeEnv === 'production',
      sameSite: nodeEnv === 'production' ? 'None' : 'Lax',
      domain: cookieDomain,
      maxAge: SESSION_MAX_AGE,
    });
  }
};

// GitHub OAuth handler
export async function handleGithubCallback(
  accessToken: string,
  refreshToken: string,
  profile: GitHubProfile
) {
  const db = getDatabase();

  // Check if this OAuth identity exists
  let identity = await db.query.userIdentities.findFirst({
    where: and(
      eq(userIdentities.provider, 'github'),
      eq(userIdentities.provider_user_id, profile.id)
    ),
    with: { user: true },
  });

  if (identity) {
    // Update tokens
    await db
      .update(userIdentities)
      .set({
        access_token: accessToken,
        refresh_token: refreshToken,
        updated_at: new Date(),
      })
      .where(eq(userIdentities.id, identity.id));

    return identity.user;
  }

  // Check if user with this email exists
  const email = profile.emails?.[0]?.value;
  if (!email) {
    throw new Error('No email provided by GitHub');
  }

  let user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    // Create new user
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        name: profile.displayName || profile.username,
        avatar_url: profile.photos?.[0]?.value,
      })
      .returning();
    user = newUser;
  }

  // Link this OAuth identity to the user
  await db.insert(userIdentities).values({
    user_id: user.id,
    provider: 'github',
    provider_user_id: profile.id,
    access_token: accessToken,
    refresh_token: refreshToken,
    profile: (profile as any)._json,
  });

  return user;
}

// Create session for user
export async function createUserSession(c: Context, userId: string) {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const sessionId = uuidv4();

  await setSession(sessionId, {
    userId,
    cookie: { maxAge: SESSION_MAX_AGE * 1000 },
  });

  const cookieDomain = nodeEnv === 'development' ? 'localhost' : '.apinuri.com';
  setCookie(c, 'sessionId', sessionId, {
    path: '/',
    httpOnly: true,
    secure: nodeEnv === 'production',
    sameSite: nodeEnv === 'production' ? 'None' : 'Lax',
    domain: cookieDomain,
    maxAge: SESSION_MAX_AGE,
  });
}

// Destroy user session
export async function destroyUserSession(c: Context) {
  const sessionId = getCookie(c, 'sessionId');
  if (sessionId) {
    await destroySession(sessionId);
    deleteCookie(c, 'sessionId');
  }
}

// Auth guard middleware
export const requireAuth: MiddlewareHandler = async (c, next) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  await next();
};