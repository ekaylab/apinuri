import { db } from './db';
import { sessions } from '@/models/auth';
import { eq } from 'drizzle-orm';

const SESSION_EXPIRY_DAYS = 30;

// Generate a secure session ID using Bun's native crypto
export function generateSessionId(): string {
  return crypto.randomUUID();
}

// Create a new session for a user
export async function createSession(userId: string): Promise<string> {
  const sessionId = generateSessionId();
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await db.insert(sessions).values({
    id: sessionId,
    user_id: userId,
    expires_at: expiresAt,
  });

  return sessionId;
}

// Validate and retrieve session
export async function validateSession(sessionId: string) {
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
    with: {
      user: true,
    },
  });

  if (!session) {
    return { session: null, user: null };
  }

  // Check if session is expired
  if (session.expires_at < new Date()) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    return { session: null, user: null };
  }

  // Refresh session if it's more than halfway to expiration
  const halfwayToExpiry = new Date(session.expires_at.getTime() - (SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000) / 2);
  if (new Date() > halfwayToExpiry) {
    const newExpiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    await db
      .update(sessions)
      .set({ expires_at: newExpiresAt })
      .where(eq(sessions.id, sessionId));
    session.expires_at = newExpiresAt;
  }

  return { session, user: session.user };
}

// Invalidate (delete) a session
export async function invalidateSession(sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

// Delete all sessions for a user
export async function invalidateUserSessions(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.user_id, userId));
}