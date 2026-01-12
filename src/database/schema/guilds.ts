import { pgTable, varchar, timestamp, boolean, integer } from 'drizzle-orm/pg-core';
export const guilds = pgTable('guilds', {
  guildId: varchar('guild_id', { length: 20 }).primaryKey(),
  guildName: varchar('guild_name', { length: 100 }).notNull(),
  ownerId: varchar('owner_id', { length: 20 }).notNull(),
  memberCount: integer('member_count').default(0),
  isActive: boolean('is_active').default(true).notNull(),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
  leftAt: timestamp('left_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
export type Guild = typeof guilds.$inferSelect;
export type NewGuild = typeof guilds.$inferInsert;