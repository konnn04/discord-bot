import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GuildSettingsService } from '../settings/guild-settings.service';

const DISCORD_CDN = 'https://cdn.discordapp.com';

export interface RankEntry {
  rank: number;
  userId: string;
  username: string;
  avatarUrl: string | null;
  decorationUrl: string | null;
  xp: number;
}

interface CacheEntry {
  data: RankEntry[];
  timestamp: number;
}

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

@Injectable()
export class RankApiService {
  private cache = new Map<string, CacheEntry>();

  constructor(
    private prisma: PrismaService,
    private guildSettings: GuildSettingsService,
  ) {}

  /**
   * Get top members by XP for a guild.
   * @param period - "YYYY-MM" for month or "YYYY" for year
   * @param limit  - max results (default 20, max 100)
   */
  async getTopMembers(
    guildId: string,
    period: string,
    limit: number = DEFAULT_LIMIT,
  ): Promise<{ enabled: boolean; members?: RankEntry[]; message?: string }> {
    const settings = this.guildSettings.get(guildId);
    if (!settings?.rankApi?.enabled) {
      return {
        enabled: false,
        message: 'Rank API is not enabled for this guild',
      };
    }

    const take = Math.min(Math.max(1, limit), MAX_LIMIT);

    const cacheKey = `${guildId}:${period}:${take}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return { enabled: true, members: cached.data };
    }

    if (!this.prisma.isConnected) {
      return { enabled: true, members: [] };
    }

    // Build where clause: exact match for month (YYYY-MM) or year (YYYY)
    const isYear = /^\d{4}$/.test(period);
    const where: any = isYear
      ? { guildId, period: { startsWith: period } }
      : { guildId, period };

    const records = await this.prisma.client.guildMemberXp.findMany({
      where,
      orderBy: { xp: 'desc' },
      take,
      include: {
        user: {
          select: { discordId: true, username: true, avatar: true },
        },
      },
    });

    const members: RankEntry[] = records.map((r: any, i: number) => ({
      rank: i + 1,
      userId: r.userId,
      username: r.user?.username ?? 'Unknown',
      avatarUrl: this.buildAvatarUrl(r.user?.discordId, r.user?.avatar),
      decorationUrl: null, // requires Discord API call, not available from DB
      xp: r.xp,
    }));

    this.cache.set(cacheKey, { data: members, timestamp: Date.now() });
    this.cleanCache();

    return { enabled: true, members };
  }

  private buildAvatarUrl(
    discordId: string | undefined,
    avatarHash: string | null,
  ): string | null {
    if (!discordId) return null;
    if (avatarHash) {
      const ext = avatarHash.startsWith('a_') ? 'gif' : 'webp';
      return `${DISCORD_CDN}/avatars/${discordId}/${avatarHash}.${ext}?size=512`;
    }
    // Default avatar based on discriminator
    const idx = (BigInt(discordId) >> 22n) % 6n;
    return `${DISCORD_CDN}/embed/avatars/${idx}.png`;
  }

  private cleanCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > CACHE_TTL_MS * 2) {
        this.cache.delete(key);
      }
    }
  }
}
