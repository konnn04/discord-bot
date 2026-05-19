import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DiscordService } from '../discord/discord.service';
import { getQueueManager } from '../discord/services/music/queue-manager';

export interface MusicStats {
  totalTracksPlayed: number;
  totalListeningHours: number;
  topListeners: {
    discordId: string;
    username: string;
    avatarUrl: string | null;
    trackCount: number;
    totalSeconds: number;
  }[];
  topTracks: {
    title: string;
    artist: string;
    playCount: number;
    totalSeconds: number;
  }[];
  currentlyPlaying: {
    title: string;
    artist: string;
    thumbnail: string;
    url: string;
    requestedBy: string;
  } | null;
}

const DISCORD_CDN = 'https://cdn.discordapp.com';

@Injectable()
export class MusicStatsService {
  private readonly logger = new Logger(MusicStatsService.name);

  constructor(
    private prisma: PrismaService,
    private discordService: DiscordService,
  ) {}

  async getStats(guildId: string): Promise<MusicStats> {
    const qm = getQueueManager();
    const current = qm.getCurrent(guildId);
    const currentlyPlaying = current
      ? {
          title: current.track.title,
          artist: current.track.artist,
          thumbnail: current.track.thumbnail,
          url: current.track.url,
          requestedBy: current.requestedBy,
        }
      : null;

    if (!this.prisma.isConnected) {
      return {
        totalTracksPlayed: 0,
        totalListeningHours: 0,
        topListeners: [],
        topTracks: [],
        currentlyPlaying,
      };
    }

    try {
      // Get all history for this guild
      const history = await this.prisma.client.musicHistory.findMany({
        where: { guildId },
        orderBy: { playedAt: 'desc' },
      });

      const totalTracksPlayed = history.length;
      const totalSeconds = history.reduce((sum, h) => sum + h.duration, 0);
      const totalListeningHours = Math.round((totalSeconds / 3600) * 100) / 100;

      // Aggregate by user
      const userMap = new Map<
        string,
        { trackCount: number; totalSeconds: number }
      >();
      for (const h of history) {
        const existing = userMap.get(h.discordId) ?? {
          trackCount: 0,
          totalSeconds: 0,
        };
        existing.trackCount++;
        existing.totalSeconds += h.duration;
        userMap.set(h.discordId, existing);
      }

      const guild = this.discordService.client.guilds.cache.get(guildId);

      const topListeners = Array.from(userMap.entries())
        .sort((a, b) => b[1].totalSeconds - a[1].totalSeconds)
        .slice(0, 10)
        .map(([discordId, data]) => {
          const isSnowflake = /^\d{17,20}$/.test(discordId);
          const member = isSnowflake
            ? guild?.members.cache.get(discordId)
            : undefined;
          const user = member?.user;
          const avatarHash = user?.avatar;
          const avatarUrl = avatarHash
            ? `${DISCORD_CDN}/avatars/${discordId}/${avatarHash}.${avatarHash.startsWith('a_') ? 'gif' : 'webp'}?size=256`
            : isSnowflake
              ? `${DISCORD_CDN}/embed/avatars/${(BigInt(discordId) >> 22n) % 6n}.png`
              : null;

          return {
            discordId,
            username: user?.username ?? member?.displayName ?? 'Unknown',
            avatarUrl: guild ? avatarUrl : null,
            trackCount: data.trackCount,
            totalSeconds: data.totalSeconds,
          };
        });

      // Aggregate by track
      const trackMap = new Map<
        string,
        {
          title: string;
          artist: string;
          playCount: number;
          totalSeconds: number;
        }
      >();
      const trackKey = (h: (typeof history)[0]) => `${h.title}::${h.artist}`;
      for (const h of history) {
        const key = trackKey(h);
        const existing = trackMap.get(key) ?? {
          title: h.title,
          artist: h.artist,
          playCount: 0,
          totalSeconds: 0,
        };
        existing.playCount++;
        existing.totalSeconds += h.duration;
        trackMap.set(key, existing);
      }

      const topTracks = Array.from(trackMap.values())
        .sort((a, b) => b.playCount - a.playCount)
        .slice(0, 10);

      return {
        totalTracksPlayed,
        totalListeningHours,
        topListeners,
        topTracks,
        currentlyPlaying,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get music stats for guild ${guildId}`,
        error,
      );
      return {
        totalTracksPlayed: 0,
        totalListeningHours: 0,
        topListeners: [],
        topTracks: [],
        currentlyPlaying,
      };
    }
  }
}
