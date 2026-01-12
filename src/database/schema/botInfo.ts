import { pgTable, text, jsonb, timestamp, serial } from 'drizzle-orm/pg-core';

export const botInfo = pgTable('bot_info', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(), // e.g., 'rpc_status', 'general_info'
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
