import { pgTable, varchar, timestamp, integer, boolean } from 'drizzle-orm/pg-core';
export const users = pgTable('users', {
  userId: varchar('user_id', { length: 20 }).primaryKey(),
  username: varchar('username', { length: 32 }).notNull(),
  
  // RPS Game Stats
  rpsWinStreak: integer('rps_win_streak').default(0),
  rpsMaxStreak: integer('rps_max_streak').default(0),
  rpsTotalWins: integer('rps_total_wins').default(0),
  rpsTotalLosses: integer('rps_total_losses').default(0),
  rpsTotalTies: integer('rps_total_ties').default(0),
  
  // General Stats
  commandsRun: integer('commands_run').default(0),
  lastSeenAt: timestamp('last_seen_at'),
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;