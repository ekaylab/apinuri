import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import fastifyPassport from '@fastify/passport';
import fastifySession from '@fastify/session';
import Cookie from '@fastify/cookie';
import { Strategy as GitHubStrategy, Profile as GitHubProfile } from 'passport-github2';
import { and, eq } from 'drizzle-orm';
import { users, userIdentities, sessions } from '@/models';

async function auth(fastify: FastifyInstance) {
  const { NODE_ENV, BASE_URL } = fastify.config;

  const SESSION_SECRET = process.env.SESSION_SECRET || 'change-this-secret-in-production';
  const COOKIE_SECRET = process.env.COOKIE_SECRET || SESSION_SECRET;

  // Register cookie plugin
  await fastify.register(Cookie, {
    secret: COOKIE_SECRET,
  });

  const dbStore = {
    async set(sessionId: string, session: Record<string, any>, callback: (err: Error | null) => void) {
      try {
        const sessionData = JSON.stringify(session);
        const expireDate = new Date(Date.now() + (session.cookie?.maxAge || 3600000));

        // Extract user_id from session if available (Passport stores it)
        const userId = session.passport?.user || null;

        // Upsert session
        await fastify.db
          .insert(sessions)
          .values({
            sid: sessionId,
            user_id: userId,
            sess: sessionData,
            expire: expireDate,
            updated_at: new Date(),
          })
          .onConflictDoUpdate({
            target: sessions.sid,
            set: {
              sess: sessionData,
              user_id: userId,
              expire: expireDate,
              updated_at: new Date(),
            },
          });

        callback && callback(null);
      } catch (error) {
        callback && callback(error as Error);
      }
    },

    async get(
        sessionId: string,
        callback: (err: Error | null, session: Record<string, any> | null | undefined) => void,
    ) {
      try {
        const sessionRecord = await fastify.db.query.sessions.findFirst({
          where: eq(sessions.sid, sessionId),
        });

        if (!sessionRecord) {
          return callback(null, null);
        }

        // Check if session has expired
        if (sessionRecord.expire < new Date()) {
          // Delete expired session
          await fastify.db.delete(sessions).where(eq(sessions.sid, sessionId));
          return callback(null, null);
        }

        let parsedSession = null;
        try {
          parsedSession = JSON.parse(sessionRecord.sess);
        } catch (e) {
          return callback(e as Error, null);
        }

        callback && callback(null, parsedSession);
      } catch (error) {
        callback && callback(error as Error, null);
      }
    },

    async destroy(sessionId: string, callback: (err: Error | null) => void) {
      try {
        await fastify.db.delete(sessions).where(eq(sessions.sid, sessionId));
        callback && callback(null);
      } catch (error) {
        callback && callback(error as Error);
      }
    },
  };

  const COOKIE_DOMAIN = NODE_ENV === 'development' ? 'localhost' : '.apinuri.com';

  // Register session plugin with database store
  await fastify.register(fastifySession, {
    secret: SESSION_SECRET,
    store: dbStore,
    cookie: {
      path: '/',
      httpOnly: true,
      secure: 'auto',
      sameSite: NODE_ENV === 'production' ? 'none' : 'lax',
      domain: COOKIE_DOMAIN,
      maxAge: 60 * 60 * 1000 * 24 * 7, // 7 days
    },
    saveUninitialized: false,
    rolling: true,
  });

  // Register Passport
  await fastify.register(fastifyPassport.initialize());
  await fastify.register(fastifyPassport.secureSession());

  // Serialize user to session
  fastifyPassport.registerUserSerializer(async (user: any) => {
    return user.id;
  });

  // Deserialize user from session
  fastifyPassport.registerUserDeserializer(async (id: string) => {
    const user = await fastify.db.query.users.findFirst({
      where: eq(users.id, id),
    });
    return user || null;
  });

  // GitHub OAuth Strategy
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    fastifyPassport.use(
        'github',
        new GitHubStrategy(
            {
              clientID: process.env.GITHUB_CLIENT_ID,
              clientSecret: process.env.GITHUB_CLIENT_SECRET,
              callbackURL: `${BASE_URL}/auth/github/callback`,
            },
            async (accessToken: string, refreshToken: string, profile: GitHubProfile, done: any) => {
              try {
                // Check if this OAuth identity exists
                let identity = await fastify.db.query.userIdentities.findFirst({
                  where: and(
                      eq(userIdentities.provider, 'github'),
                      eq(userIdentities.provider_user_id, profile.id)
                  ),
                  with: { user: true },
                });

                if (identity) {
                  // Update tokens
                  await fastify.db
                      .update(userIdentities)
                      .set({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                        updated_at: new Date(),
                      })
                      .where(eq(userIdentities.id, identity.id));

                  return done(null, identity.user);
                }

                // Check if user with this email exists
                const email = profile.emails?.[0]?.value;
                if (!email) {
                  return done(new Error('No email provided by GitHub'));
                }

                let user = await fastify.db.query.users.findFirst({
                  where: eq(users.email, email),
                });

                if (!user) {
                  // Create new user
                  const [newUser] = await fastify.db
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
                await fastify.db.insert(userIdentities).values({
                  user_id: user.id,
                  provider: 'github',
                  provider_user_id: profile.id,
                  access_token: accessToken,
                  refresh_token: refreshToken,
                  profile: (profile as any)._json,
                });

                done(null, user);
              } catch (error) {
                done(error as Error);
              }
            }
        )
    );
  }

  fastify.log.info('Authentication plugin registered');
}

export default fp(auth, {
  name: 'auth',
  dependencies: ['db'],
});