import { pgTable, text, timestamp, varchar, uuid, index, integer, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './user';

// Sessions table for custom session management
export const sessions = pgTable('sessions', {
  id: varchar('id', { length: 255 }).primaryKey(),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
}, (table) => ({
  expireIdx: index('session_expire_idx').on(table.expires_at),
  userIdIdx: index('session_user_id_idx').on(table.user_id),
}));

// API Keys table for API access control
export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: varchar('key', { length: 64 }).unique().notNull(),
  user_id: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }), // nullable - null for anonymous users
  ip_address: varchar('ip_address', { length: 45 }), // nullable - tracked for anonymous users
  name: varchar('name', { length: 255 }),
  is_active: boolean('is_active').default(true).notNull(),
  allowed_routes: text('allowed_routes').array(), // null = all routes allowed
  rate_limit: integer('rate_limit').default(100), // requests per hour
  expires_at: timestamp('expires_at'), // null = never expires (typically for logged-in users)
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  keyIdx: index('api_key_idx').on(table.key),
  ipIdx: index('api_key_ip_idx').on(table.ip_address),
  userIdx: index('api_key_user_idx').on(table.user_id),
}));

// Relations
export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.user_id],
    references: [users.id],
  }),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, {
    fields: [apiKeys.user_id],
    references: [users.id],
  }),
}));