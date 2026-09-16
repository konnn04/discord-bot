import { Injectable, NotFoundException } from '@nestjs/common';
import { DiscordService } from '../discord/discord.service';
import { GuildSettingsService } from '../settings/guild-settings.service';
import { PermissionService } from '../discord/services/permission.service';
import { PrismaService } from '../prisma/prisma.service';
import { OnlinePresenceService } from './online-presence.service';
import { MusicStatsService, MusicStats } from './music-stats.service';
import {
  getGuildMemoryService,
  MEMORY_PROMPT_EXTRACTION_SYSTEM,
  parseMemoryPromptEntries,
} from '../discord/chatbot/memory.service';
import {
  parseAgentRouterModels,
  llmChat,
  isProviderConfigured,
  fetchProviderModels,
} from '../discord/chatbot/llm-client';
import type { GuildSettings } from 'shared/src/types/settings.types';
import { renderWelcomeCard } from '../discord/utils/welcome-card';

interface MemberCacheEntry {
  fetchedAt: number;
  members: Map<
    string,
    {
      id: string;
      displayName: string;
      username: string;
      avatar: string | null;
      status: string;
      activity: string | null;
      joinedAt: string | null;
      roles: string[];
      roleNames: string[];
    }
  >;
}
const MEMBER_CACHE_TTL_MS = 60_000; // 60s

@Injectable()
export class GuildsService {
  private memberCache = new Map<string, MemberCacheEntry>();
  constructor(
    private discordService: DiscordService,
    private guildSettings: GuildSettingsService,
    private permissionService: PermissionService,
    private prisma: PrismaService,
    private onlinePresence: OnlinePresenceService,
    private musicStats: MusicStatsService,
  ) {}

  /** Get all guilds the bot is in, optionally filtered by a user's guilds */
  getBotGuilds(userGuildIds?: string[]) {
    const botGuilds = this.discordService.client.guilds.cache;

    let guilds = botGuilds.map((guild) => ({
      id: guild.id,
      name: guild.name,
      icon: guild.iconURL({ size: 128 }),
      memberCount: guild.memberCount,
    }));

    // If user guild IDs are provided, filter to only guilds the user is also in
    if (userGuildIds) {
      const userSet = new Set(userGuildIds);
      guilds = guilds.filter((g) => userSet.has(g.id));
    }

    return guilds;
  }

  /** Get a specific guild by ID */
  getGuild(guildId: string) {
    const guild = this.discordService.client.guilds.cache.get(guildId);
    if (!guild) {
      throw new NotFoundException(`Guild ${guildId} not found`);
    }

    return {
      id: guild.id,
      name: guild.name,
      icon: guild.iconURL({ size: 256 }),
      memberCount: guild.memberCount,
      channels: guild.channels.cache.size,
      roles: guild.roles.cache.size,
      ownerId: guild.ownerId,
    };
  }

  getChannels(guildId: string): {
    id: string;
    name: string;
    type: number;
    parentId: string | null;
    position: number;
  }[] {
    const guild = this.discordService.client.guilds.cache.get(guildId);
    if (!guild) {
      throw new NotFoundException(`Guild ${guildId} not found`);
    }

    return guild.channels.cache
      .map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        parentId: c.parentId ?? null,
        position: 'position' in c ? (c.position ?? 0) : 0,
      }))
      .sort((a, b) => a.position - b.position);
  }

  /** List guild roles for settings dropdowns, highest first. Excludes @everyone. */
  getRoles(guildId: string) {
    const guild = this.discordService.client.guilds.cache.get(guildId);
    if (!guild) {
      throw new NotFoundException(`Guild ${guildId} not found`);
    }

    return guild.roles.cache
      .filter((r) => r.id !== guild.id) // drop @everyone (id === guild id)
      .map((r) => ({
        id: r.id,
        name: r.name,
        color: r.color,
        position: r.position,
        managed: r.managed,
      }))
      .sort((a, b) => b.position - a.position);
  }

  /** Get settings for a guild */
  getGuildSettings(guildId: string): GuildSettings {
    // Verify guild exists in bot cache
    if (!this.discordService.client.guilds.cache.has(guildId)) {
      throw new NotFoundException(`Guild ${guildId} not found`);
    }
    return this.guildSettings.get(guildId);
  }

  /** Update settings for a guild */
  updateGuildSettings(
    guildId: string,
    partial: Partial<GuildSettings>,
  ): GuildSettings {
    if (!this.discordService.client.guilds.cache.has(guildId)) {
      throw new NotFoundException(`Guild ${guildId} not found`);
    }
    return this.guildSettings.update(guildId, partial);
  }

  /** Get chatbot providers, models, and ENV defaults for the guild UI */
  async getChatbotConfig(guildId: string) {
    if (!this.discordService.client.guilds.cache.has(guildId)) {
      throw new NotFoundException(`Guild ${guildId} not found`);
    }
    const current = this.guildSettings.get(guildId).chatbot;
    const [agentRouterLiveModels, geminiLiveModels] = await Promise.all([
      fetchProviderModels('agentrouter', {
        apiKey: current.apiKey,
        baseUrl: current.baseUrl,
      }),
      fetchProviderModels('gemini'),
    ]);

    const envModels = parseAgentRouterModels();
    const agentRouterModels = Array.from(
      new Set([
        ...agentRouterLiveModels,
        'deepseek/deepseek-v4-flash:free',
        ...envModels,
      ]),
    );

    return {
      providers: [
        {
          id: 'agentrouter',
          name: 'OpenRouter (OpenAI Compatible)',
          desc: 'Cổng đa mô hình qua OpenRouter: DeepSeek, GPT, Claude, Llama...',
          hasSystemKey: Boolean(
            process.env.OPENROUTER_API_KEY || process.env.AGENTROUTER_API_KEY,
          ),
          defaultBaseUrl:
            process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api',
          models: agentRouterModels,
        },
        {
          id: 'gemini',
          name: 'Google Gemini',
          desc: 'Nhanh, thông minh, hỗ trợ function calling tốt.',
          hasSystemKey: Boolean(process.env.GEMINI_API_KEY),
          defaultBaseUrl: '',
          models: geminiLiveModels,
        },
        {
          id: 'deepseek',
          name: 'DeepSeek',
          desc: 'Suy luận mạnh mẽ, tương thích OpenAI chat completions.',
          hasSystemKey: Boolean(process.env.DEEPSEEK_API_KEY),
          defaultBaseUrl: 'https://api.deepseek.com',
          models: [
            process.env.DEEPSEEK_MODEL || 'deepseek-chat',
            'deepseek-reasoner',
          ],
        },
      ],
      systemDefaults: {
        provider:
          process.env.OPENROUTER_API_KEY || process.env.AGENTROUTER_API_KEY
            ? 'agentrouter'
            : 'gemini',
        agentrouterModel:
          agentRouterModels[0] || 'deepseek/deepseek-v4-flash:free',
        agentrouterBaseUrl:
          process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api',
      },
    };
  }

  /** Live fetch models for a specific provider & credentials */
  async fetchLiveModels(
    guildId: string,
    provider: 'gemini' | 'deepseek' | 'agentrouter',
    apiKey?: string,
    baseUrl?: string,
  ) {
    if (!this.discordService.client.guilds.cache.has(guildId)) {
      throw new NotFoundException(`Guild ${guildId} not found`);
    }
    const models = await fetchProviderModels(provider, { apiKey, baseUrl });
    return { provider, models };
  }

  /** Test AI completion / connection with current or preview configuration */
  async testChatbot(
    guildId: string,
    override?: {
      provider?: 'gemini' | 'deepseek' | 'agentrouter';
      model?: string;
      apiKey?: string;
      baseUrl?: string;
    },
  ) {
    if (!this.discordService.client.guilds.cache.has(guildId)) {
      throw new NotFoundException(`Guild ${guildId} not found`);
    }
    const current = this.guildSettings.get(guildId).chatbot;
    const provider = override?.provider || current.provider || 'gemini';
    const model = override?.model || current.model;
    const apiKey =
      override?.apiKey !== undefined ? override.apiKey : current.apiKey;
    const baseUrl =
      override?.baseUrl !== undefined ? override.baseUrl : current.baseUrl;

    const start = Date.now();
    try {
      const testContent =
        provider === 'agentrouter'
          ? 'Ping test. Please reply in one short sentence: "Connection successful! AI Chatbot is ready."'
          : 'Chào bạn! Hãy trả lời thật ngắn gọn (dưới 15 từ): "Kết nối thành công! FoxyBot đã sẵn sàng."';

      const result = await llmChat(
        provider,
        [
          {
            role: 'user',
            content: testContent,
          },
        ],
        [],
        { model, apiKey, baseUrl },
      );
      const latencyMs = Date.now() - start;
      return {
        success: true,
        reply: result.text || 'Kết nối thành công!',
        latencyMs,
        provider,
        model: model || '(mặc định)',
      };
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      return {
        success: false,
        error: err.message || 'Lỗi khi gọi API nhà cung cấp',
        latencyMs,
        provider,
        model: model || '(mặc định)',
      };
    }
  }

  /** Render a welcome card preview PNG for the settings UI (not persisted). */
  async renderWelcomeCardPreview(
    title: string,
    subtitle: string,
    avatarUrl?: string,
  ): Promise<string> {
    const png = await renderWelcomeCard({
      avatarUrl: avatarUrl || 'https://cdn.discordapp.com/embed/avatars/0.png',
      title,
      subtitle,
    });
    return `data:image/png;base64,${png.toString('base64')}`;
  }

  /** Check if a user can manage a specific guild */
  canManageGuild(userId: string, guildId: string): boolean {
    // Super admins can manage any guild
    if (this.permissionService.isSuperAdmin(userId)) return true;

    const guild = this.discordService.client.guilds.cache.get(guildId);
    if (!guild) return false;

    const member = guild.members.cache.get(userId);
    if (!member) return false;

    return (
      member.permissions.has('ManageGuild') ||
      member.permissions.has('Administrator')
    );
  }

  /** Get guild statistics */
  getGuildStats(guildId: string) {
    const guild = this.discordService.client.guilds.cache.get(guildId);
    if (!guild) throw new NotFoundException(`Guild ${guildId} not found`);

    const members = guild.members.cache;
    const bots = members.filter((m) => m.user.bot);
    const humans = members.filter((m) => !m.user.bot);
    const onlineHumans = humans.filter(
      (m) =>
        m.presence?.status === 'online' ||
        m.presence?.status === 'idle' ||
        m.presence?.status === 'dnd',
    ).size;
    const onlineBots = bots.filter(
      (m) =>
        m.presence?.status === 'online' ||
        m.presence?.status === 'idle' ||
        m.presence?.status === 'dnd',
    ).size;

    return {
      totalMembers: humans.size,
      onlineMembers: onlineHumans,
      botMembers: bots.size,
      onlineBots: onlineBots,
      roleCount: guild.roles.cache.size,
      channelCount: guild.channels.cache.size,
      createdAt: guild.createdAt?.toISOString() ?? null,
    };
  }

  /** Get paginated member list — cached for 60s to avoid Discord rate limits */
  async getMembers(
    guildId: string,
    page: number,
    pageSize: number,
    filter: 'all' | 'humans' | 'bots' | 'online',
    sort: 'joined' | 'status' = 'joined',
    search?: string,
  ): Promise<{
    members: Array<{
      id: string;
      displayName: string;
      username: string;
      avatar: string | null;
      status: string;
      activity: string | null;
      joinedAt: string | null;
      roles: string[];
      roleNames: string[];
    }>;
    total: number;
  }> {
    const guild = this.discordService.client.guilds.cache.get(guildId);
    if (!guild) throw new NotFoundException(`Guild ${guildId} not found`);

    const cached = this.memberCache.get(guildId);
    const now = Date.now();
    let memberList: MemberCacheEntry['members'];

    if (cached && now - cached.fetchedAt < MEMBER_CACHE_TTL_MS) {
      memberList = cached.members;
    } else {
      await guild.members.fetch();
      memberList = new Map();
      for (const m of guild.members.cache.values()) {
        memberList.set(m.id, {
          id: m.id,
          displayName: m.displayName,
          username: m.user.username,
          avatar: m.user.avatar,
          status: m.presence?.status ?? 'offline',
          activity: m.presence?.activities?.[0]?.name ?? null,
          joinedAt: m.joinedAt?.toISOString() ?? null,
          roles: m.roles.cache.map((r) => r.id),
          roleNames: m.roles.cache.map((r) => r.name),
        });
      }
      this.memberCache.set(guildId, { fetchedAt: now, members: memberList });
    }

    let members = Array.from(memberList.values());

    // Filter
    if (filter === 'humans') {
      members = members.filter((m) => {
        const gm = guild.members.cache.get(m.id);
        return gm ? !gm.user.bot : true;
      });
    } else if (filter === 'bots') {
      members = members.filter((m) => {
        const gm = guild.members.cache.get(m.id);
        return gm ? gm.user.bot : false;
      });
    } else if (filter === 'online') {
      members = members.filter(
        (m) =>
          m.status === 'online' || m.status === 'idle' || m.status === 'dnd',
      );
    }

    // Search
    if (search) {
      const q = search.toLowerCase();
      members = members.filter(
        (m) =>
          m.displayName.toLowerCase().includes(q) ||
          m.username.toLowerCase().includes(q) ||
          m.id.includes(q),
      );
    }

    // Sort
    if (sort === 'status') {
      const statusOrder: Record<string, number> = {
        online: 0,
        idle: 1,
        dnd: 2,
        offline: 3,
      };
      members.sort(
        (a, b) => (statusOrder[a.status] ?? 4) - (statusOrder[b.status] ?? 4),
      );
    } else {
      members.sort((a, b) =>
        (b.joinedAt ?? '').localeCompare(a.joinedAt ?? ''),
      );
    }

    const total = members.length;
    const offset = (page - 1) * pageSize;
    const paged = members.slice(offset, offset + pageSize);

    return { members: paged, total };
  }

  /** Get member detail — uses cached list, no extra Discord fetch */
  getMemberDetail(guildId: string, memberId: string) {
    const cached = this.memberCache.get(guildId);
    if (cached) {
      const m = cached.members.get(memberId);
      if (m) {
        return {
          joinedAt: m.joinedAt,
          roles: m.roleNames,
          activity: m.activity,
        };
      }
    }

    // Fallback: fetch from cache
    const guild = this.discordService.client.guilds.cache.get(guildId);
    if (!guild) throw new NotFoundException(`Guild ${guildId} not found`);

    const member = guild.members.cache.get(memberId);
    if (!member) throw new NotFoundException(`Member ${memberId} not found`);

    return {
      joinedAt: member.joinedAt?.toISOString() ?? null,
      roles: member.roles.cache.map((r) => r.name),
      activity: member.presence?.activities?.[0]?.name ?? null,
    };
  }

  /** Kick a member */
  async kickMember(guildId: string, memberId: string) {
    const guild = this.discordService.client.guilds.cache.get(guildId);
    if (!guild) throw new NotFoundException(`Guild ${guildId} not found`);

    const member = guild.members.cache.get(memberId);
    if (!member) throw new NotFoundException(`Member ${memberId} not found`);

    await member.kick('Kicked from web dashboard');
    return { success: true };
  }

  /** Timeout a member (minutes=0 or null removes timeout) */
  async timeoutMember(
    guildId: string,
    memberId: string,
    minutes: number | null,
  ) {
    const guild = this.discordService.client.guilds.cache.get(guildId);
    if (!guild) throw new NotFoundException(`Guild ${guildId} not found`);

    const member = guild.members.cache.get(memberId);
    if (!member) throw new NotFoundException(`Member ${memberId} not found`);

    if (!minutes || minutes <= 0) {
      await member.timeout(null, 'Timeout removed from web dashboard');
      return { success: true, message: 'Đã xóa timeout' };
    }

    await member.timeout(minutes * 60 * 1000, 'Timed out from web dashboard');
    return { success: true, message: `Đã timeout ${minutes} phút` };
  }

  /** Get message chart data (monthly) - count XP records per period as proxy for message activity */
  async getMessageChart(
    guildId: string,
  ): Promise<{ month: string; count: number }[]> {
    // Generate last 12 months
    const months: { month: string; count: number }[] = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({ month, count: 0 });
    }

    // Try to get real data from DB
    if (this.prisma.isConnected) {
      const records = await this.prisma.client.guildMemberXp.findMany({
        where: { guildId },
        select: { period: true },
      });

      // Count records per period
      const countMap = new Map<string, number>();
      for (const r of records) {
        countMap.set(r.period, (countMap.get(r.period) ?? 0) + 1);
      }

      // Merge into months
      for (const m of months) {
        m.count = countMap.get(m.month) ?? 0;
      }
    }

    return months;
  }

  /** Get XP chart data from GuildMemberXp */
  async getXpChart(guildId: string) {
    if (!this.prisma.isConnected) return [];

    const records = await this.prisma.client.guildMemberXp.findMany({
      where: { guildId },
      select: { period: true, xp: true },
    });

    // Aggregate XP by period (month)
    const periodMap = new Map<string, number>();
    for (const r of records) {
      periodMap.set(r.period, (periodMap.get(r.period) ?? 0) + r.xp);
    }

    // Sort and return last 12 periods
    return Array.from(periodMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, xp]) => ({ month, xp }));
  }

  /** Get online frequency by hour with range filter */
  getOnlineFrequency(
    guildId: string,
    range: 'week' | 'month' | '90d' = 'week',
  ): Promise<{ hour: number; count: number; humanCount: number }[]> {
    return this.onlinePresence.getOnlineFrequency(guildId, range);
  }

  /** Get top XP members (protected, bypasses rankApi setting) */
  async getTopMembers(
    guildId: string,
    period: string,
    limit: number = 10,
  ): Promise<
    {
      rank: number;
      userId: string;
      username: string;
      avatarUrl: string | null;
      xp: number;
    }[]
  > {
    if (!this.prisma.isConnected) return [];

    const parsedLimit = Math.min(Math.max(1, limit), 100);
    const isYear = /^\d{4}$/.test(period);

    // For a year period, GuildMemberXp stores one row per month (`YYYY-MM`).
    // We must aggregate per user, otherwise the same user appears once per
    // month — causing duplicate leaderboard entries and wrong ranking.
    let ranked: { userId: string; xp: number }[];
    if (isYear) {
      const grouped = await this.prisma.client.guildMemberXp.groupBy({
        by: ['userId'],
        where: { guildId, period: { startsWith: period } },
        _sum: { xp: true },
        orderBy: { _sum: { xp: 'desc' } },
        take: parsedLimit,
      });
      ranked = grouped.map((g: any) => ({
        userId: g.userId,
        xp: g._sum.xp ?? 0,
      }));
    } else {
      const records = await this.prisma.client.guildMemberXp.findMany({
        where: { guildId, period },
        orderBy: { xp: 'desc' },
        take: parsedLimit,
      });
      ranked = records.map((r: any) => ({ userId: r.userId, xp: r.xp }));
    }

    if (ranked.length === 0) return [];

    const users = await this.prisma.client.user.findMany({
      where: { id: { in: ranked.map((r) => r.userId) } },
      select: { id: true, discordId: true, username: true, avatar: true },
    });
    const userMap = new Map(users.map((u: any) => [u.id, u]));

    const DISCORD_CDN = 'https://cdn.discordapp.com';
    return ranked.map((r, i) => {
      const u: any = userMap.get(r.userId);
      return {
        rank: i + 1,
        userId: r.userId,
        username: u?.username ?? 'Unknown',
        avatarUrl:
          u?.discordId && u?.avatar
            ? `${DISCORD_CDN}/avatars/${u.discordId}/${u.avatar}.${u.avatar.startsWith('a_') ? 'gif' : 'webp'}?size=256`
            : null,
        xp: r.xp,
      };
    });
  }

  /** Get music statistics for a guild */
  getMusicStats(guildId: string): Promise<MusicStats> {
    return this.musicStats.getStats(guildId);
  }

  /** Get paginated memories for a guild */
  async getMemories(
    guildId: string,
    page = 1,
    pageSize = 20,
    search?: string,
    source?: 'all' | 'ai' | 'manual',
  ) {
    const memoryService = getGuildMemoryService(this.prisma);
    return memoryService.list(guildId, page, pageSize, search, source);
  }

  /** Get memory stats for a guild */
  async getMemoryStats(guildId: string) {
    const memoryService = getGuildMemoryService(this.prisma);
    return memoryService.getStats(guildId);
  }

  /** Add or update memory for a guild */
  async saveMemory(
    guildId: string,
    key: string,
    value: string,
    metadata?: any,
  ) {
    const memoryService = getGuildMemoryService(this.prisma);
    await memoryService.remember(guildId, key, value, metadata);
    return { success: true, key, value };
  }

  /** Delete a memory key for a guild */
  async deleteMemory(guildId: string, key: string) {
    const memoryService = getGuildMemoryService(this.prisma);
    const result = await memoryService.forget(guildId, key);
    return { success: result };
  }

  /** Test memory retrieval / simulator */
  async testMemoryLookup(guildId: string, text: string) {
    const memoryService = getGuildMemoryService(this.prisma);
    const memories = await memoryService.findRelevantMemories(
      guildId,
      text,
      [],
      8,
    );
    return { query: text, matched: memories };
  }

  /**
   * Extract memory facts from a free-text admin prompt via the guild's configured
   * chatbot LLM, then save each one — so admins can dictate memories instead of
   * filling the key/value form by hand.
   */
  async createMemoriesFromPrompt(
    guildId: string,
    prompt: string,
    author: string,
  ) {
    if (!this.discordService.client.guilds.cache.has(guildId)) {
      throw new NotFoundException(`Guild ${guildId} not found`);
    }

    const chatbot = this.guildSettings.get(guildId).chatbot;
    const provider = chatbot?.provider ?? 'gemini';
    if (!chatbot?.enabled || !isProviderConfigured(provider, chatbot.apiKey)) {
      return {
        reply:
          'Chatbot AI chưa được bật hoặc chưa cấu hình API key cho server này. ' +
          'Vào mục "Chatbot AI" để thiết lập trước khi dùng tính năng này.',
        created: [],
      };
    }

    try {
      const result = await llmChat(
        provider,
        [
          { role: 'system', content: MEMORY_PROMPT_EXTRACTION_SYSTEM },
          { role: 'user', content: prompt },
        ],
        [],
        {
          model: chatbot.model,
          apiKey: chatbot.apiKey,
          baseUrl: chatbot.baseUrl,
        },
      );

      const entries = parseMemoryPromptEntries(result.text);
      if (!entries.length) {
        return {
          reply:
            'Không trích xuất được sự thật cụ thể nào cần ghi nhớ từ nội dung này. ' +
            'Hãy thử diễn đạt rõ ràng hơn, ví dụ: "Nhớ rằng konnn là admin, thích lập trình".',
          created: [],
        };
      }

      const memoryService = getGuildMemoryService(this.prisma);
      for (const entry of entries) {
        await memoryService.remember(guildId, entry.key, entry.value, {
          source: 'manual',
          author,
          viaPrompt: true,
        });
      }

      const summary = entries
        .map((e) => `• **${e.key}**: ${e.value}`)
        .join('\n');
      return {
        reply: `Đã ghi nhớ ${entries.length} mục:\n${summary}`,
        created: entries,
      };
    } catch (err) {
      return {
        reply: `Lỗi khi xử lý qua AI: ${err instanceof Error ? err.message : String(err)}`,
        created: [],
      };
    }
  }
}
