export interface GuildInfo {
  id: string;
  name: string;
  icon: string | null;
  memberCount: number;
  isManageable: boolean;
}

export interface UserInfo {
  id: string;
  username: string;
  avatar: string | null;
  guilds: GuildInfo[];
}

export interface AuthTokenPayload {
  sub: string; 
  username: string;
  avatar: string | null;
  accessToken: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface GuildChannelInfo {
  id: string;
  name: string;
  type: number; 
  parentId: string | null;
  position: number;
}

export interface MeetingReportParticipant {
  userId: string;
  displayName: string;
  tag: string;
  totalDuration: number; 
  sessions: { joinedAt: number; leftAt: number | null }[];
}

export interface MeetingReport {
  id: string;
  guildId: string;
  voiceChannelId: string;
  channelName: string;
  initiatorId: string;
  startTime: string; // ISO
  endTime: string; // ISO
  participants: MeetingReportParticipant[];
  createdAt: string; // ISO
}

export interface GuildRoleInfo {
  id: string;
  name: string;
  color: number; // decimal color, 0 = no color
  position: number;
  managed: boolean;
}
