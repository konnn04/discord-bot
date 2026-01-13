export interface Guild {
    id: string;
    name: string;
    icon: string | null;
    isAdmin: boolean;
    botInGuild: boolean;
}

export interface GuildDetail {
    guild: {
        id: string;
        name: string;
        icon: string | null;
        memberCount: number;
        isAdmin: boolean;
    };
    userStats: {
        xp: number;
        level: number;
        messageCount: number;
        voiceSeconds: number;
        rank: number;
    };
}

export interface GuildSettings {
    guildId: string;
    
    // General
    prefix: string;
    language: string;
    timezone: string;
    
    // Music
    musicDefaultVolume?: number;
    musicMaxQueueSize?: number;
    musicIdleTimeout?: number;
    musicDjRoleId?: string;
    
    // Modules
    levelingEnabled: boolean;
    levelUpChannelId?: string;
    xpRateMessage?: number;
    xpRateVoice?: number;
    
    // Metadata
    updatedAt: string;
}

export interface User {
    id: string;
    username: string;
    avatar: string | null;
    accessToken: string;
    isDeveloper?: boolean;
}

import type { Song } from './music.types';

export interface MusicState {
    playing: boolean;
    currentSong: Song | null;
    queue: Song[];
    volume: number;
    loop: boolean;
    position: number;
    paused?: boolean;
    guildName?: string;
    voiceChannelName?: string;
}
