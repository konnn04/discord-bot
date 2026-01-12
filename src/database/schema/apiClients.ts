import { pgTable, text, jsonb, timestamp, serial } from 'drizzle-orm/pg-core';

export const apiClients = pgTable('api_clients', {
  id: serial('id').primaryKey(),
  clientId: text('client_id').notNull().unique(),
  clientSecret: text('client_secret').notNull(), // Should be hashed in production
  name: text('name').notNull(),
  permissions: jsonb('permissions').notNull().default([]), // e.g. ['read_users', 'read_guilds']
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
