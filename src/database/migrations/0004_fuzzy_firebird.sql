CREATE TABLE "music_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"queue_data" jsonb DEFAULT '[]'::jsonb,
	"current_song_index" integer DEFAULT 0,
	"is_looping" boolean DEFAULT false,
	"volume" integer DEFAULT 100,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "music_queue_guild_id_unique" UNIQUE("guild_id")
);
