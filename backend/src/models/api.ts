import { pgTable, text, timestamp, uuid, boolean, integer, jsonb, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './user';

// APIs table - user-registered APIs
export const apis = pgTable('apis', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  slug: text('slug').notNull(), // URL-friendly identifier
  name: text('name').notNull(),
  description: text('description'),
  base_url: text('base_url').notNull(), // The actual API endpoint to proxy to
  category: text('category'), // e.g., 'weather', 'data', 'utilities'
  is_active: boolean('is_active').default(true).notNull(),
  is_public: boolean('is_public').default(true).notNull(), // Public = anyone can use
  headers: jsonb('headers'), // Custom headers for proxying (API keys, etc.)
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userSlugIdx: uniqueIndex('user_slug_idx').on(table.user_id, table.slug),
}));

// API requests table - usage tracking
export const apiRequests = pgTable('api_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  api_id: uuid('api_id').notNull().references(() => apis.id, { onDelete: 'cascade' }),
  method: text('method').notNull(), // GET, POST, etc.
  path: text('path').notNull(), // Request path
  status_code: integer('status_code').notNull(),
  response_time_ms: integer('response_time_ms').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const apisRelations = relations(apis, ({ one, many }) => ({
  user: one(users, {
    fields: [apis.user_id],
    references: [users.id],
  }),
  requests: many(apiRequests),
}));

export const apiRequestsRelations = relations(apiRequests, ({ one }) => ({
  api: one(apis, {
    fields: [apiRequests.api_id],
    references: [apis.id],
  }),
}));