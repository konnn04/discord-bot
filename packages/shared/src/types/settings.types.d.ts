export interface GlobalSettings {
    bot: {
        defaultPrefix: string;
        defaultLanguage: string;
        defaultCooldown: number;
    };
    xp: {
        defaultXpPerMessage: number;
        defaultXpPerVoiceMinute: number;
        defaultMessageCooldown: number;
        levelUpFormula: 'linear' | 'exponential';
        baseXpForLevelUp: number;
    };
    limits: {
        maxPrefixLength: number;
        maxWelcomeMessageLength: number;
    };
    michosgc: {
        cronInterval: number;
    };
    music: {
        maxQueueSize: number;
    };
}
export interface GuildSettings {
    guildId: string;
    prefix: string;
    language: string;
    features: {
        welcome: boolean;
        voiceWelcome: boolean;
        xpTracking: boolean;
        meetingTracking: boolean;
        moderation: boolean;
        tagMembersInVoice: boolean;
        dailyLeetCode: boolean;
        leetcodeContest: boolean;
    };
    welcome: {
        channelId: string | null;
        message: string | null;
        leaveChannelId: string | null;
        leaveMessage: string | null;
    };
    xp: {
        xpPerMessage: number;
        xpPerVoiceMinute: number;
        messageCooldown: number;
        levelUpNotification: boolean;
        levelUpChannelId: string | null;
        levelUpMessage: string | null;
        ignoredChannels: string[];
        ignoredRoles: string[];
    };
    voice: {
        channelTimeout: number;
    };
    moderation: {
        logChannelId: string | null;
    };
    michosgc: {
        enabled: boolean;
        channelId: string | null;
        roleCommon: string | null;
        roles: {
            genshin: string | null;
            hkrpg: string | null;
            honkai3rd: string | null;
            nap: string | null;
            tot: string | null;
        };
    };
    music: {
        defaultVolume: number;
        autoLeaveTimeout: number;
    };
    dailyLeetCode: {
        channelId: string | null;
    };
    leetcodeContest: {
        channelId: string | null;
    };
}
export declare const DEFAULT_GLOBAL_SETTINGS: GlobalSettings;
export declare function createDefaultGuildSettings(guildId: string): GuildSettings;
