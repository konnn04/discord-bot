import { Injectable, NotFoundException } from '@nestjs/common';
import { DiscordService } from '../discord/discord.service';
import { GuildSettingsService } from '../settings/guild-settings.service';
import { PermissionService } from '../discord/services/permission.service';
import { PrismaService } from '../prisma/prisma.service';
import { OnlinePresenceService } from './online-presence.service';
import { MusicStatsService, MusicStats } from './music-stats.service';
import type { GuildSettings } from 'shared/src/types/settings.types';

/** TTL cache for member lists — avoids spamming Discord API on every pagination request */
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
    const online = members.filter((m) => m.presence?.status === 'online').size;
    const bots = members.filter((m) => m.user.bot).size;
    const humans = members.size - bots;

    return {
      totalMembers: humans,
      onlineMembers: online,
      botMembers: bots,
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

  /** Timeout a member */
  async timeoutMember(guildId: string, memberId: string, minutes: number) {
    const guild = this.discordService.client.guilds.cache.get(guildId);
    if (!guild) throw new NotFoundException(`Guild ${guildId} not found`);

    const member = guild.members.cache.get(memberId);
    if (!member) throw new NotFoundException(`Member ${memberId} not found`);

    await member.timeout(minutes * 60 * 1000, 'Timed out from web dashboard');
    return { success: true };
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
  ): Promise<{ hour: number; count: number }[]> {
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

    const where = /^\d{4}$/.test(period)
      ? { guildId, period: { startsWith: period } }
      : { guildId, period };

    const records = await this.prisma.client.guildMemberXp.findMany({
      where,
      orderBy: { xp: 'desc' },
      take: Math.min(Math.max(1, limit), 100),
      include: {
        user: {
          select: { discordId: true, username: true, avatar: true },
        },
      },
    });

    const DISCORD_CDN = 'https://cdn.discordapp.com';
    return records.map((r: any, i: number) => ({
      rank: i + 1,
      userId: r.userId,
      username: r.user?.username ?? 'Unknown',
      avatarUrl:
        r.user?.discordId && r.user?.avatar
          ? `${DISCORD_CDN}/avatars/${r.user.discordId}/${r.user.avatar}.${r.user.avatar.startsWith('a_') ? 'gif' : 'webp'}?size=256`
          : null,
      xp: r.xp,
    }));
  }

  /** Get music statistics for a guild */
  getMusicStats(guildId: string): Promise<MusicStats> {
    return this.musicStats.getStats(guildId);
  }
}
