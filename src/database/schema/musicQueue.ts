import { pgTable, text, serial, jsonb, integer, boolean, timestamp } from 'drizzle-orm/pg-core';

export const musicQueue = pgTable('music_queue', {
  id: serial('id').primaryKey(),
  guildId: text('guild_id').notNull().unique(),
  queueData: jsonb('queue_data').default([]), // List of songs
  currentSongIndex: integer('current_song_index').default(0),
  isLooping: boolean('is_looping').default(false),
  volume: integer('volume').default(100),
  updatedAt: timestamp('updated_at').defaultNow(),
});
