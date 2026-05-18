/** Discord OAuth */
export const DISCORD_CDN = "https://cdn.discordapp.com";

/** Pagination */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** Music */
export const MUSIC_POLL_INTERVAL_MS = 5_000;
export const DEFAULT_VOLUME = 50;
export const VOLUME_MAX = 100;

/** Date / Time */
export const DATE_FORMAT = "dd/MM/yyyy";
export const DATETIME_FORMAT = "dd/MM/yyyy HH:mm";

/** Member status display */
export const STATUS_MAP: Record<string, { label: string; color: string }> = {
  online: { label: "Online", color: "bg-green-500" },
  idle: { label: "Idle", color: "bg-yellow-500" },
  dnd: { label: "Do Not Disturb", color: "bg-red-500" },
  offline: { label: "Offline", color: "bg-muted" },
} as const;

/** Permission flags (Discord bitfield) */
export const PERMISSIONS = {
  MANAGE_GUILD: 0x20,
  ADMINISTRATOR: 0x8,
} as const;

/** Loop modes for music */
export const LOOP_MODES = {
  NONE: "none",
  TRACK: "track",
  QUEUE: "queue",
} as const;

/** Discord bot invite URL base */
export const DISCORD_BOT_INVITE =
  "https://discord.com/oauth2/authorize?client_id=your_client_id&permissions=8&scope=bot";

/** GitHub repo URL */
export const GITHUB_REPO = "https://github.com/konnn04/discord-bot";
