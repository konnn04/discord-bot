import { pgTable, varchar, jsonb, timestamp, boolean, text, integer } from 'drizzle-orm/pg-core';
import { guilds } from './guilds';
export const guildSettings = pgTable('guild_settings', {
  guildId: varchar('guild_id', { length: 20 })
    .primaryKey()
    .references(() => guilds.guildId, { onDelete: 'cascade' }),
  
  // General Settings
  prefix: varchar('prefix', { length: 10 }).default('f!').notNull(),
  language: varchar('language', { length: 10 }).default('en').notNull(),
  timezone: varchar('timezone', { length: 50 }).default('UTC').notNull(),
  
  // Music Settings
  musicDefaultVolume: integer('music_default_volume').default(50),
  musicMaxQueueSize: integer('music_max_queue_size').default(100),
  musicIdleTimeout: integer('music_idle_timeout').default(180), 
  musicDjRoleId: varchar('music_dj_role_id', { length: 20 }),
  
  // Moderation Settings
  modLogChannelId: varchar('mod_log_channel_id', { length: 20 }),
  autoRoleId: varchar('auto_role_id', { length: 20 }),
  
  // Welcome Settings
  welcomeEnabled: boolean('welcome_enabled').default(false),
  welcomeChannelId: varchar('welcome_channel_id', { length: 20 }),
  welcomeMessage: text('welcome_message'),

  // Leveling Settings
  levelingEnabled: boolean('leveling_enabled').default(true),
  levelUpChannelId: varchar('level_up_channel_id', { length: 20 }), 
  xpRateMessage: integer('xp_rate_message').default(20), 
  xpRateVoice: integer('xp_rate_voice').default(10), 
  cooldownMessage: integer('cooldown_message').default(60), 
  
  // Advanced/Custom Settings (JSONB for flexibility)
  customSettings: jsonb('custom_settings').$type<Record<string, any>>(),
  
  // Metadata
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
export type GuildSettings = typeof guildSettings.$inferSelect;
export type NewGuildSettings = typeof guildSettings.$inferInsert;