import { pgTable, varchar, integer, timestamp, primaryKey } from 'drizzle-orm/pg-core';
import { guilds } from './guilds';

export const userGuildStats = pgTable('user_guild_stats', {
  // Composite Primary Key (userId + guildId)
  userId: varchar('user_id', { length: 20 }).notNull(),
  guildId: varchar('guild_id', { length: 20 })
    .notNull()
    .references(() => guilds.guildId, { onDelete: 'cascade' }),
  
  // Activity Stats
  messageCount: integer('message_count').default(0),
  voiceSeconds: integer('voice_seconds').default(0), 
  
  // Leveling
  xp: integer('xp').default(0),
  level: integer('level').default(0),
  
  // Cooldown tracking (Internal use)
  lastMessageAt: timestamp('last_message_at'), 
  lastVoiceUpdateAt: timestamp('last_voice_update_at'), 
  
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.userId, table.guildId] }),
  };
});

export type UserGuildStats = typeof userGuildStats.$inferSelect;
export type NewUserGuildStats = typeof userGuildStats.$inferInsert;
