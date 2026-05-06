/**
 * Settings type definitions for the JSON-based configuration system
 */

/** Global settings — applies to the entire bot */
export interface GlobalSettings {
  bot: {
    defaultPrefix: string;
    defaultLanguage: string;
    defaultCooldown: number; // ms
  };
  xp: {
    defaultXpPerMessage: number;
    defaultXpPerVoiceMinute: number;
    defaultMessageCooldown: number; // Cooldown in seconds before gaining XP from another message
    levelUpFormula: 'linear' | 'exponential';
    baseXpForLevelUp: number;
  };
  limits: {
    maxPrefixLength: number;
    maxWelcomeMessageLength: number;
  };
  michosgc: {
    cronInterval: number; // in minutes
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
  };

  // Welcome configuration
  welcome: {
    channelId: string | null;
    message: string | null;     // Supports {user}, {server}, {memberCount} placeholders
    leaveChannelId: string | null;
    leaveMessage: string | null;
  };

  // XP / Leveling (per-guild overrides)
  xp: {
    xpPerMessage: number;
    xpPerVoiceMinute: number;
    messageCooldown: number; // Cooldown in seconds
    levelUpNotification: boolean; // Enable/disable level up messages
    levelUpChannelId: string | null;
    levelUpMessage: string | null; // Supports {user}, {level} placeholders
    ignoredChannels: string[];
    ignoredRoles: string[];
  };

  // Voice channel settings
  voice: {
    channelTimeout: number; // seconds — auto-disconnect AFK
  };

  // Moderation
  moderation: {
    logChannelId: string | null;
  };

  // Michosgc Settings
  michosgc: {
    enabled: boolean;
    channelId: string | null;
    roleCommon: string | null; // Tagged for all games
    roles: {
      genshin: string | null;
      hkrpg: string | null;
      honkai3rd: string | null;
      nap: string | null;
      tot: string | null;
    };
  };

  // Music Settings
  music: {
    defaultVolume: number;
    autoLeaveTimeout: number; // seconds
  };
}

/** Default global settings */
export const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  bot: {
    defaultPrefix: 'f!',
    defaultLanguage: 'vi',
    defaultCooldown: 3000,
  },
  xp: {
    defaultXpPerMessage: 15,
    defaultXpPerVoiceMinute: 10,
    defaultMessageCooldown: 60,
    levelUpFormula: 'exponential',
    baseXpForLevelUp: 100,
  },
  limits: {
    maxPrefixLength: 5,
    maxWelcomeMessageLength: 2000,
  },
  michosgc: {
    cronInterval: 15, // 15 minutes
  },
  music: {
    maxQueueSize: 500,
  },
};

/** Default guild settings factory */
export function createDefaultGuildSettings(guildId: string): GuildSettings {
  return {
    guildId,
    prefix: 'f!',
    language: 'vi',
    features: {
      welcome: false,
      voiceWelcome: false,
      xpTracking: true,
      meetingTracking: false,
      moderation: false,
      tagMembersInVoice: false,
    },
    welcome: {
      channelId: null,
      message: '👋 Chào mừng {user} đến với **{server}**! Bạn là thành viên thứ #{memberCount}.',
      leaveChannelId: null,
      leaveMessage: null,
    },
    xp: {
      xpPerMessage: 15,
      xpPerVoiceMinute: 10,
      messageCooldown: 60,
      levelUpNotification: false,
      levelUpChannelId: null,
      levelUpMessage: '🎉 Chúc mừng {user} đã đạt level **{level}**!',
      ignoredChannels: [],
      ignoredRoles: [],
    },
    voice: {
      channelTimeout: 300,
    },
    moderation: {
      logChannelId: null,
    },
    michosgc: {
      enabled: false,
      channelId: null,
      roleCommon: null,
      roles: {
        genshin: null,
        hkrpg: null,
        honkai3rd: null,
        nap: null,
        tot: null,
      },
    },
    music: {
      defaultVolume: 80,
      autoLeaveTimeout: 120, // 2 minutes
    },
  };
}
