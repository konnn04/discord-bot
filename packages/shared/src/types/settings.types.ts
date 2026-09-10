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
    embed?: WelcomeEmbedConfig;
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

  // Giftcode notifications — one surface covering both the HoYoverse API-polled
  // games (michosgc) and the web-scraped games (giftcode-crawler). Each game
  // is fetched by its own backend mechanism, but the settings, channel, and
  // send format are unified: pick a channel, a tag mode, and which games to
  // receive notifications for.
  giftcode: {
    enabled: boolean;
    channelId: string | null;
    // 'common': tag one shared role for every game's codes.
    // 'perGame': tag a separate role per game.
    mode: 'common' | 'perGame';
    roleCommon: string | null; // used when mode = 'common'
    roles: Record<string, string | null>; // gameId -> roleId, used when mode = 'perGame'
    games: string[]; // ids from GIFTCODE_GAMES the guild wants notifications for
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
    provider: 'gemini' | 'deepseek' | 'agentrouter';
    model?: string;
    apiKey?: string;
    baseUrl?: string;
    allowedTools: string[]; // ids from CHATBOT_TOOLS
    readImages?: boolean; // Tự động đọc và phân tích hình ảnh đính kèm (Vision)
    compressImages?: boolean; // Tự động nén và tối ưu kích thước ảnh trước khi gửi đến AI
  };
}

export type LlmProviderType = 'gemini' | 'deepseek' | 'agentrouter';

export const LLM_PROVIDERS = [
  {
    id: 'gemini',
    label: 'Google Gemini',
    desc: 'Nhanh, thông minh, hỗ trợ function calling tốt.',
    defaultModel: 'gemini-flash-lite-latest',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    desc: 'Suy luận mạnh mẽ, tương thích OpenAI chat completions.',
    defaultModel: 'deepseek-chat',
  },
  {
    id: 'agentrouter',
    label: 'OpenRouter (OpenAI Compatible)',
    desc: 'Cổng đa mô hình qua OpenRouter: DeepSeek, GPT, Claude, Llama...',
    defaultModel: 'deepseek/deepseek-v4-flash:free',
  },
] as const;

export interface WelcomeEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface WelcomeEmbedConfig {
  title?: string | null;
  titleUrl?: string | null;
  description?: string | null;
  color?: string | null; // e.g. #5865F2
  authorName?: string | null;
  authorIconUrl?: string | null;
  authorUrl?: string | null;
  thumbnailUrl?: string | null;
  useMemberAvatarAsThumbnail?: boolean;
  imageUrl?: string | null;
  footerText?: string | null;
  footerIconUrl?: string | null;
  timestamp?: boolean;
  fields?: WelcomeEmbedField[];
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
    description: 'Tra cứu giftcode mới nhất của mọi game được hỗ trợ (HoYoverse, WuWa, Arknights, NTE...).',
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
    id: 'get_chat_history',
    label: 'Lịch sử trò chuyện',
    description: 'Đọc 10-200 tin nhắn gần nhất trong kênh chat để tóm tắt hoặc nối tiếp câu chuyện.',
    risky: false,
  },
  {
    id: 'search_memory',
    label: 'Tìm kiếm ký ức server',
    description: 'Tra cứu thông tin/ký ức đã ghi nhớ về người hoặc chủ đề trong server này.',
    risky: false,
  },
  {
    id: 'get_voice_members',
    label: 'Xem người trong phòng voice',
    description: 'Lấy danh sách người đang trong kênh thoại.',
    risky: false,
  },
  {
    id: 'move_voice_members',
    label: 'Di chuyển thành viên voice',
    description: 'Chuyển thành viên trong phòng voice sang kênh thoại khác.',
    risky: true,
  },
  {
    id: 'change_nickname',
    label: 'Đổi biệt danh',
    description: 'Thay đổi biệt danh của thành viên trong server.',
    risky: true,
  },
  {
    id: 'get_user_activity',
    label: 'Xem trạng thái / activity',
    description: 'Xem trạng thái online, game đang chơi hoặc bài hát Spotify của thành viên.',
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
  {
    id: 'read_web_page',
    label: 'Đọc trang web',
    description:
      'Đọc và tóm tắt nội dung một trang web khi người dùng gửi kèm link cụ thể.',
    risky: false,
  },
];

/** Metadata for a game the giftcode system supports (rendered in the UI). */
export interface GiftcodeGameMeta {
  id: string;
  label: string;
}

/**
 * All games the giftcode system covers — both the HoYoverse API-polled games
 * (michosgc backend) and the web-scraped games (giftcode-crawler backend).
 * Each guild picks which of these to receive notifications for; the fetch
 * mechanism per game is an internal backend detail (see HOYOVERSE_GAME_IDS).
 */
export const GIFTCODE_GAMES: GiftcodeGameMeta[] = [
  { id: 'genshin', label: 'Genshin Impact' },
  { id: 'hkrpg', label: 'Honkai: Star Rail' },
  { id: 'honkai3rd', label: 'Honkai Impact 3rd' },
  { id: 'nap', label: 'Zenless Zone Zero' },
  { id: 'tot', label: 'Tears of Themis' },
  { id: 'nte', label: 'Neverness to Everness' },
  { id: 'wuwa', label: 'Wuthering Waves' },
  { id: 'endfield', label: 'Arknights: Endfield' },
  { id: 'arknights', label: 'Arknights' },
  { id: 'wwm', label: 'Where Winds Meet' },
];

/** Games fetched via the HoYoverse codes API (michosgc backend) — the rest are scraped. */
export const HOYOVERSE_GAME_IDS = [
  'genshin',
  'hkrpg',
  'honkai3rd',
  'nap',
  'tot',
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
  const procEnv =
    typeof globalThis !== 'undefined'
      ? (globalThis as any).process?.env
      : undefined;

  const envHasAgentRouter = Boolean(
    procEnv?.OPENROUTER_API_KEY || procEnv?.AGENTROUTER_API_KEY,
  );

  let defaultModel = 'gemini-flash-lite-latest';
  const defaultBaseUrl =
    procEnv?.OPENROUTER_BASE_URL || 'https://openrouter.ai/api';

  if (procEnv?.OPENROUTER_MODEL) {
    let rawList: string[] = [];
    try {
      const parsed = JSON.parse(
        procEnv.OPENROUTER_MODEL.replace(/'/g, '"'),
      );
      if (Array.isArray(parsed)) {
        rawList = parsed.map((s) => String(s).trim()).filter(Boolean);
      }
    } catch {
      rawList = procEnv.OPENROUTER_MODEL.replace(/[\[\]'"]/g, '')
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean);
    }
    if (rawList.length > 0) {
      defaultModel = rawList[0];
    }
  } else if (envHasAgentRouter) {
    defaultModel = 'deepseek/deepseek-v4-flash:free';
  } else if (procEnv?.GEMINI_MODEL) {
    defaultModel = procEnv.GEMINI_MODEL;
  }

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
      embed: {
        title: '🎉 Thành viên mới gia nhập!',
        titleUrl: null,
        description: 'Chào mừng {user.mention} đã đến với **{server}**!\nChúc bạn có những giây phút vui vẻ cùng mọi người.',
        color: '#5865F2',
        authorName: '{server}',
        authorIconUrl: null,
        authorUrl: null,
        thumbnailUrl: null,
        useMemberAvatarAsThumbnail: true,
        imageUrl: null,
        footerText: 'Thành viên thứ #{memberCount}',
        footerIconUrl: null,
        timestamp: true,
        fields: [],
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
    giftcode: {
      enabled: false,
      channelId: null,
      mode: 'common',
      roleCommon: null,
      roles: {},
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
      provider: envHasAgentRouter ? 'agentrouter' : 'gemini',
      model: defaultModel,
      baseUrl: defaultBaseUrl,
      apiKey: '',
      // Safe, read-only + music tools enabled by default; risky ones opt-in.
      allowedTools: ['get_giftcode', 'guild_info', 'play_music'],
      readImages: true,
      compressImages: true,
    },
  };
}
