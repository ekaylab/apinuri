import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { apiKeys } from './auth';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name'),
  avatar_url: text('avatar_url'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const userIdentities = pgTable(
  'user_identities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(), // 'google', 'github', etc.
    provider_user_id: text('provider_user_id').notNull(), // ID from OAuth provider
    access_token: text('access_token'), // Encrypted in production
    refresh_token: text('refresh_token'), // Encrypted in production
    expires_at: timestamp('expires_at'),
    profile: jsonb('profile'), // Store full OAuth profile if needed
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  table => ({
    providerUserIdIdx: uniqueIndex('provider_user_id_idx').on(
      table.provider,
      table.provider_user_id
    ),
  })
);

export const usersRelations = relations(users, ({ many }) => ({
  identities: many(userIdentities),
  apiKeys: many(apiKeys),
}));

export const userIdentitiesRelations = relations(userIdentities, ({ one }) => ({
  user: one(users, {
    fields: [userIdentities.user_id],
    references: [users.id],
  }),
}));
