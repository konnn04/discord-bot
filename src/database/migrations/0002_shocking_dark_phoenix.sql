CREATE TABLE "user_guild_stats" (
	"user_id" varchar(20) NOT NULL,
	"guild_id" varchar(20) NOT NULL,
	"message_count" integer DEFAULT 0,
	"voice_seconds" integer DEFAULT 0,
	"xp" integer DEFAULT 0,
	"level" integer DEFAULT 0,
	"last_message_at" timestamp,
	"last_voice_update_at" timestamp,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_guild_stats_user_id_guild_id_pk" PRIMARY KEY("user_id","guild_id")
);
--> statement-breakpoint
ALTER TABLE "guild_settings" ADD COLUMN "leveling_enabled" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "guild_settings" ADD COLUMN "level_up_channel_id" varchar(20);--> statement-breakpoint
ALTER TABLE "guild_settings" ADD COLUMN "xp_rate_message" integer DEFAULT 20;--> statement-breakpoint
ALTER TABLE "guild_settings" ADD COLUMN "xp_rate_voice" integer DEFAULT 10;--> statement-breakpoint
ALTER TABLE "guild_settings" ADD COLUMN "cooldown_message" integer DEFAULT 60;--> statement-breakpoint
ALTER TABLE "user_guild_stats" ADD CONSTRAINT "user_guild_stats_guild_id_guilds_guild_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("guild_id") ON DELETE cascade ON UPDATE no action;