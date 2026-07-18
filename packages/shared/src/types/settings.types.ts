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
    dailyLeetCode: boolean;
    leetcodeContest: boolean;
  };

  // Welcome configuration
  welcome: {
    channelId: string | null;
    // How the welcome is rendered: plain text, a rich embed, or a generated
    // image card. Defaults to 'canvas'.
    type: 'text' | 'embed' | 'canvas';
    message: string | null;     // Supports {user}, {server}, {memberCount} placeholders
    // Canvas card text — supports {user}, {displayName}, {server}, {memberCount}.
    card: {
      title: string | null;
      subtitle: string | null;
    };
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

  // Michosgc Settings (giftcode notification)
  michosgc: {
    enabled: boolean;
    channelId: string | null;
    // 'common': tag one shared role for every giftcode.
    // 'perGame': tag a separate role per game.
    mode: 'common' | 'perGame';
    roleCommon: string | null; // Tagged for all games
    roles: {
      genshin: string | null;
      hkrpg: string | null;
      honkai3rd: string | null;
      nap: string | null;
      tot: string | null;
    };
  };

  giftcodeCrawl: {
    enabled: boolean;
    channelId: string | null;
    roleId: string | null; // optional — codes are sent with or without a tag
    games: string[]; // ids from GIFTCODE_CRAWL_GAMES
  };

  // Music Settings
  music: {
    defaultVolume: number;
    autoLeaveTimeout: number; // seconds
  };

  // LeetCode Settings
  dailyLeetCode: {
    channelId: string | null;
  };

  leetcodeContest: {
    channelId: string | null;
  };

  rankApi: {
    enabled: boolean;
  };

  // Role Rank — award a single role when a member reaches a level (non-stack).
  roleRank: {
    enabled: boolean;
    // Each rule maps a level threshold to a role. When a member's level crosses
    // a threshold, they receive that rule's role and lose the other rank roles.
    rules: { level: number; roleId: string }[];
  };

  // AI Chatbot — replies when mentioned. Tools it may call are whitelisted here
  // so it can never run something dangerous (e.g. kick) unless explicitly allowed.
  chatbot: {
    enabled: boolean;
    provider: 'gemini' | 'deepseek';
    allowedTools: string[]; // ids from CHATBOT_TOOLS
  };
}

/** Metadata for a tool the chatbot can be permitted to use (rendered in the UI). */
export interface ChatbotToolMeta {
  id: string;
  label: string;
  description: string;
  /** Higher-impact tools that change server state — off by default. */
  risky: boolean;
}

/** Registry of tools the chatbot can call, gated per-guild by allowedTools. */
export const CHATBOT_TOOLS: ChatbotToolMeta[] = [
  {
    id: 'get_giftcode',
    label: 'Lấy giftcode',
    description: 'Tra cứu giftcode mới nhất của các game HoYoverse.',
    risky: false,
  },
  {
    id: 'crawl_giftcode',
    label: 'Cào giftcode (game khác)',
    description:
      'Cào giftcode ngay cho game chưa có API (NTE, Wuthering Waves, Arknights...).',
    risky: false,
  },
  {
    id: 'guild_info',
    label: 'Thông tin server',
    description: 'Đọc thông tin cơ bản của server (tên, số thành viên...).',
    risky: false,
  },
  {
    id: 'list_members',
    label: 'Danh sách thành viên',
    description: 'Liệt kê thành viên trong server.',
    risky: false,
  },
  {
    id: 'member_info',
    label: 'Chi tiết thành viên',
    description: 'Xem thông tin chi tiết của một thành viên.',
    risky: false,
  },
  {
    id: 'play_music',
    label: 'Phát nhạc',
    description: 'Phát/thêm nhạc vào hàng chờ theo từ khoá hoặc link.',
    risky: false,
  },
  {
    id: 'skip_music',
    label: 'Bỏ qua bài',
    description: 'Bỏ qua bài đang phát, sang bài kế tiếp.',
    risky: false,
  },
  {
    id: 'pause_music',
    label: 'Tạm dừng nhạc',
    description: 'Tạm dừng bài đang phát.',
    risky: false,
  },
  {
    id: 'resume_music',
    label: 'Tiếp tục nhạc',
    description: 'Tiếp tục phát bài đang tạm dừng.',
    risky: false,
  },
  {
    id: 'stop_music',
    label: 'Dừng nhạc',
    description: 'Dừng nhạc và xoá hàng chờ.',
    risky: false,
  },
  {
    id: 'now_playing',
    label: 'Bài đang phát',
    description: 'Xem bài nhạc đang phát.',
    risky: false,
  },
  {
    id: 'rename_voice_channel',
    label: 'Đổi tên kênh thoại',
    description: 'Đổi tên kênh thoại đang phát.',
    risky: true,
  },
  {
    id: 'set_voice_bitrate',
    label: 'Đổi bitrate/region kênh thoại',
    description: 'Thay đổi băng thông/region của kênh thoại đang phát.',
    risky: true,
  },
];

/** Metadata for a game the giftcode crawler supports (rendered in the UI). */
export interface GiftcodeCrawlGameMeta {
  id: string;
  label: string;
}

/**
 * Games scraped by the giftcode crawler — i.e. NOT covered by the michosgc
 * HoYoverse API. Gated per-guild by GuildSettings.giftcodeCrawl.games.
 */
export const GIFTCODE_CRAWL_GAMES: GiftcodeCrawlGameMeta[] = [
  { id: 'nte', label: 'Neverness to Everness' },
  { id: 'wuwa', label: 'Wuthering Waves' },
  { id: 'endfield', label: 'Arknights: Endfield' },
  { id: 'arknights', label: 'Arknights' },
  { id: 'wwm', label: 'Where Winds Meet' },
];

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
      dailyLeetCode: false,
      leetcodeContest: false,
    },
    welcome: {
      channelId: null,
      type: 'canvas',
      message: '👋 Chào mừng {user} đến với **{server}**! Bạn là thành viên thứ #{memberCount}.',
      card: {
        title: 'Chào mừng {displayName}!',
        subtitle: 'Thành viên thứ #{memberCount} của {server}',
      },
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
      mode: 'common',
      roleCommon: null,
      roles: {
        genshin: null,
        hkrpg: null,
        honkai3rd: null,
        nap: null,
        tot: null,
      },
    },
    giftcodeCrawl: {
      enabled: false,
      channelId: null,
      roleId: null,
      games: [],
    },
    music: {
      defaultVolume: 80,
      autoLeaveTimeout: 120, // 2 minutes
    },
    dailyLeetCode: {
      channelId: null,
    },
    leetcodeContest: {
      channelId: null,
    },
    rankApi: {
      enabled: false,
    },
    roleRank: {
      enabled: false,
      rules: [],
    },
    chatbot: {
      enabled: false,
      provider: 'gemini',
      // Safe, read-only + music tools enabled by default; risky ones opt-in.
      allowedTools: ['get_giftcode', 'guild_info', 'play_music'],
    },
  };
}
