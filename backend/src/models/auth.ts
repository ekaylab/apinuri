import { pgTable, text, timestamp, varchar, uuid, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './user';

// Sessions table for storing user sessions (Fastify/Passport sessions)
export const sessions = pgTable('sessions', {
  sid: varchar('sid', { length: 255 }).primaryKey(),
  user_id: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  sess: text('sess').notNull(), // JSON stringified session data
  expire: timestamp('expire').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  expireIdx: index('session_expire_idx').on(table.expire),
  userIdIdx: index('session_user_id_idx').on(table.user_id),
}));

// Relations
export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.user_id],
    references: [users.id],
  }),
}));