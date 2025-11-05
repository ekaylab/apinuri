import { pgTable, text, timestamp, uuid, boolean, integer, jsonb, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { apiKeys } from './auth';

// APIs table - registered APIs
export const apis = pgTable('apis', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id'), // nullable - no user ownership
  slug: text('slug').notNull().unique(), // URL-friendly identifier
  name: text('name').notNull(),
  description: text('description'),
  base_url: text('base_url').notNull(), // The actual API endpoint to proxy to
  category: text('category'), // e.g., 'weather', 'data', 'utilities'
  is_active: boolean('is_active').default(true).notNull(),
  is_public: boolean('is_public').default(true).notNull(), // Public = anyone can use
  headers: jsonb('headers'), // Custom headers for proxying (API keys, etc.)
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// API endpoints table - document each endpoint
export const apiEndpoints = pgTable('api_endpoints', {
  id: uuid('id').primaryKey().defaultRandom(),
  api_id: uuid('api_id').notNull().references(() => apis.id, { onDelete: 'cascade' }),
  path: text('path').notNull(), // e.g., "/forecast" or "/weather/{city}"
  method: text('method').notNull(), // GET, POST, PUT, DELETE, PATCH
  name: text('name').notNull(), // e.g., "Get Weather Forecast"
  description: text('description'),
  parameters: jsonb('parameters'), // JSON schema for path/query/body params
  response_example: jsonb('response_example'), // Example response
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  apiMethodPathIdx: uniqueIndex('api_method_path_idx').on(table.api_id, table.method, table.path),
}));

// API requests table - usage tracking
export const apiRequests = pgTable('api_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  api_id: uuid('api_id').notNull().references(() => apis.id, { onDelete: 'cascade' }),
  api_key_id: uuid('api_key_id').references(() => apiKeys.id, { onDelete: 'set null' }),
  endpoint_id: uuid('endpoint_id').references(() => apiEndpoints.id, { onDelete: 'set null' }),
  method: text('method').notNull(), // GET, POST, etc.
  path: text('path').notNull(), // Request path
  status_code: integer('status_code').notNull(),
  response_time_ms: integer('response_time_ms').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const apisRelations = relations(apis, ({ many }) => ({
  endpoints: many(apiEndpoints),
  requests: many(apiRequests),
}));

export const apiEndpointsRelations = relations(apiEndpoints, ({ one }) => ({
  api: one(apis, {
    fields: [apiEndpoints.api_id],
    references: [apis.id],
  }),
}));

export const apiRequestsRelations = relations(apiRequests, ({ one }) => ({
  api: one(apis, {
    fields: [apiRequests.api_id],
    references: [apis.id],
  }),
  apiKey: one(apiKeys, {
    fields: [apiRequests.api_key_id],
    references: [apiKeys.id],
  }),
  endpoint: one(apiEndpoints, {
    fields: [apiRequests.endpoint_id],
    references: [apiEndpoints.id],
  }),
}));