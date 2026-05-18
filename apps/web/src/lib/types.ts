// Frontend types mirroring shared types + UI-specific types

export interface UserInfo {
  id: string;
  username: string;
  displayName: string;
  discriminator: string;
  avatar: string;
  guilds: GuildInfo[];
  isSuperAdmin: boolean;
}

export interface GuildInfo {
  id: string;
  name: string;
  icon: string;
  owner: boolean;
  permissions: string;
  memberCount?: number;
  onlineCount?: number;
  botCount?: number;
  roleCount?: number;
  channelCount?: number;
  createdAt?: string;
  description?: string;
}

export interface GuildMember {
  id: string;
  displayName: string;
  username: string;
  avatar: string;
  status: "online" | "idle" | "dnd" | "offline";
  activity?: string;
  joinedAt: string;
  roles: string[];
  roleNames: string[];
}

export interface GuildStats {
  totalMembers: number;
  onlineMembers: number;
  botMembers: number;
  roleCount: number;
  channelCount: number;
  createdAt: string;
}

export interface MessageChartData {
  month: string;
  count: number;
}

export interface XpChartData {
  month: string;
  xp: number;
}

export interface OnlineFrequencyData {
  hour: number;
  count: number;
}

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  duration: number;
  thumbnail: string;
  url: string;
  requestedBy: string;
}

export interface MusicPlayerState {
  isPlaying: boolean;
  isPaused: boolean;
  currentTrack: MusicTrack | null;
  position: number;
  volume: number;
  loop: "none" | "track" | "queue";
  shuffle: boolean;
}

export interface MusicQueue {
  tracks: MusicTrack[];
  history: MusicTrack[];
}

export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}

export interface SearchResult {
  tracks: MusicTrack[];
}

export interface VoiceStatus {
  connected: boolean;
  voiceChannelId: string | null;
  voiceChannelName: string | null;
}

export interface MusicSocketState {
  guildId: string;
  playerState: MusicPlayerState | null;
  queue: MusicTrack[];
  history: MusicTrack[];
  voiceChannelId: string | null;
  voiceChannelName: string | null;
}
