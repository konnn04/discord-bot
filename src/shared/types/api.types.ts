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

export interface MusicState {
    playing: boolean;
    currentSong: any | null; // Refine type later
    queue: any[];
    volume: number;
    loop: boolean;
    position: number;
}
