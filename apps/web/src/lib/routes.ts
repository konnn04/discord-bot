// ============================================================
// Route Path Constants
//   Dùng constants này thay vì hardcode string URL trong code
// ============================================================

export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  CALLBACK: "/callback",
  ADMIN: "/admin",
  ADMIN_DASHBOARD: (guildId: string) => `/admin/${guildId}/dashboard` as const,
  ADMIN_MEMBERS: (guildId: string) => `/admin/${guildId}/members` as const,
  ADMIN_SETTINGS: (guildId: string) => `/admin/${guildId}/settings` as const,
  MUSIC: (guildId: string) => `/music/${guildId}` as const,
} as const;

export const API_ROUTES = {
  AUTH_LOGIN: "/auth/login",
  AUTH_CALLBACK: "/auth/callback",
  AUTH_ME: "/auth/me",
  AUTH_GUILDS: "/auth/guilds",
  GUILDS: "/guilds",
  GUILD: (id: string) => `/guilds/${id}`,
  GUILD_STATS: (id: string) => `/guilds/${id}/stats`,
  GUILD_SETTINGS: (id: string) => `/guilds/${id}/settings`,
  GUILD_CHATBOT_CONFIG: (id: string) => `/guilds/${id}/chatbot-config`,
  GUILD_CHATBOT_MODELS: (id: string) => `/guilds/${id}/chatbot-models`,
  GUILD_CHATBOT_TEST: (id: string) => `/guilds/${id}/chatbot-test`,
  GUILD_CHANNELS: (id: string) => `/guilds/${id}/channels`,
  GUILD_ROLES: (id: string) => `/guilds/${id}/roles`,
  MEETING_REPORT: (id: string) => `/meetings/${id}`,
  GUILD_MEMBERS: (id: string) => `/guilds/${id}/members`,
  GUILD_MEMBER: (guildId: string, memberId: string) =>
    `/guilds/${guildId}/members/${memberId}`,
  GUILD_MEMBER_KICK: (guildId: string, memberId: string) =>
    `/guilds/${guildId}/members/${memberId}/kick`,
  GUILD_MEMBER_TIMEOUT: (guildId: string, memberId: string) =>
    `/guilds/${guildId}/members/${memberId}/timeout`,
  GUILD_CHARTS_MESSAGES: (id: string) => `/guilds/${id}/charts/messages`,
  GUILD_CHARTS_XP: (id: string) => `/guilds/${id}/charts/xp`,
  GUILD_CHARTS_XP_TOP: (id: string) => `/guilds/${id}/charts/xp/top`,
  GUILD_CHARTS_ONLINE: (id: string, range?: string) =>
    `/guilds/${id}/charts/online${range ? `?range=${range}` : ''}`,
  GUILD_MUSIC_STATS: (id: string) => `/guilds/${id}/music/stats`,
  GUILD_MEMORIES: (
    id: string,
    params?: { search?: string; page?: number; pageSize?: number; source?: string },
  ) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.page) q.set('page', String(params.page));
    if (params?.pageSize) q.set('pageSize', String(params.pageSize));
    if (params?.source && params.source !== 'all') q.set('source', params.source);
    const qs = q.toString();
    return `/guilds/${id}/memories${qs ? `?${qs}` : ''}`;
  },
  GUILD_MEMORY_STATS: (id: string) => `/guilds/${id}/memories/stats`,
  GUILD_MEMORY: (id: string, key: string) =>
    `/guilds/${id}/memories/${encodeURIComponent(key)}`,
  GUILD_MEMORY_TEST: (id: string) => `/guilds/${id}/memories/test-lookup`,

  MUSIC_STATE: (guildId: string) =>
    `/v1/discord/music/guilds/${guildId}/state`,
  MUSIC_PLAY: (guildId: string) =>
    `/v1/discord/music/guilds/${guildId}/play`,
  MUSIC_PAUSE: (guildId: string) =>
    `/v1/discord/music/guilds/${guildId}/pause`,
  MUSIC_RESUME: (guildId: string) =>
    `/v1/discord/music/guilds/${guildId}/resume`,
  MUSIC_SKIP: (guildId: string) =>
    `/v1/discord/music/guilds/${guildId}/skip`,
  MUSIC_PREV: (guildId: string) =>
    `/v1/discord/music/guilds/${guildId}/prev`,
  MUSIC_VOLUME: (guildId: string) =>
    `/v1/discord/music/guilds/${guildId}/volume`,
  MUSIC_LOOP: (guildId: string) =>
    `/v1/discord/music/guilds/${guildId}/loop`,
  MUSIC_SHUFFLE: (guildId: string) =>
    `/v1/discord/music/guilds/${guildId}/shuffle`,
  MUSIC_SEEK: (guildId: string) =>
    `/v1/discord/music/guilds/${guildId}/seek`,
  MUSIC_QUEUE: (guildId: string) =>
    `/v1/discord/music/guilds/${guildId}/queue`,
  MUSIC_QUEUE_REMOVE: (guildId: string, trackId: string) =>
    `/v1/discord/music/guilds/${guildId}/queue/${trackId}`,
  MUSIC_SEARCH: (guildId: string) =>
    `/v1/discord/music/guilds/${guildId}/search`,
  MUSIC_VOICE_STATUS: (guildId: string) =>
    `/v1/discord/music/guilds/${guildId}/voice-status`,
  MUSIC_JOIN: (guildId: string) =>
    `/v1/discord/music/guilds/${guildId}/join`,
  MUSIC_LYRICS: (guildId: string) =>
    `/v1/discord/music/guilds/${guildId}/lyrics`,
} as const;
