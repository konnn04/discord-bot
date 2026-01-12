CREATE TABLE "guilds" (
	"guild_id" varchar(20) PRIMARY KEY NOT NULL,
	"guild_name" varchar(100) NOT NULL,
	"owner_id" varchar(20) NOT NULL,
	"member_count" integer DEFAULT 0,
	"is_active" boolean DEFAULT true NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"left_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guild_settings" (
	"guild_id" varchar(20) PRIMARY KEY NOT NULL,
	"prefix" varchar(10) DEFAULT '!' NOT NULL,
	"language" varchar(10) DEFAULT 'en' NOT NULL,
	"timezone" varchar(50) DEFAULT 'UTC' NOT NULL,
	"music_default_volume" integer DEFAULT 50,
	"music_max_queue_size" integer DEFAULT 100,
	"music_dj_role_id" varchar(20),
	"mod_log_channel_id" varchar(20),
	"auto_role_id" varchar(20),
	"welcome_enabled" boolean DEFAULT false,
	"welcome_channel_id" varchar(20),
	"welcome_message" text,
	"custom_settings" jsonb,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"user_id" varchar(20) PRIMARY KEY NOT NULL,
	"username" varchar(32) NOT NULL,
	"rps_win_streak" integer DEFAULT 0,
	"rps_max_streak" integer DEFAULT 0,
	"rps_total_wins" integer DEFAULT 0,
	"rps_total_losses" integer DEFAULT 0,
	"rps_total_ties" integer DEFAULT 0,
	"commands_run" integer DEFAULT 0,
	"last_seen_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "guild_settings" ADD CONSTRAINT "guild_settings_guild_id_guilds_guild_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("guild_id") ON DELETE cascade ON UPDATE no action;