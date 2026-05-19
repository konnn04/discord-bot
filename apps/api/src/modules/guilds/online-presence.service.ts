import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DiscordService } from '../discord/discord.service';
import { PrismaService } from '../prisma/prisma.service';

type RangeFilter = 'week' | 'month' | '90d';

@Injectable()
export class OnlinePresenceService {
  private readonly logger = new Logger(OnlinePresenceService.name);

  constructor(
    private discordService: DiscordService,
    private prisma: PrismaService,
  ) {}

  @Cron('*/15 * * * *')
  async collectOnlineCounts(): Promise<void> {
    if (!this.prisma.isConnected) return;

    const guilds = this.discordService.client.guilds.cache;
    const now = new Date();
    const records: {
      guildId: string;
      count: number;
      humanCount: number;
      recordedAt: Date;
    }[] = [];

    for (const [, guild] of guilds) {
      try {
        const members = guild.members.cache;
        const onlineMembers = members.filter(
          (m) =>
            m.presence?.status === 'online' ||
            m.presence?.status === 'idle' ||
            m.presence?.status === 'dnd',
        );
        const totalOnline = onlineMembers.size;
        const humanOnline = onlineMembers.filter((m) => !m.user.bot).size;

        records.push({
          guildId: guild.id,
          count: totalOnline,
          humanCount: humanOnline,
          recordedAt: now,
        });
      } catch {
        /* skip guild if error */
      }
    }

    if (records.length === 0) return;

    try {
      await this.prisma.client.onlinePresenceLog.createMany({ data: records });
      this.logger.log(`Recorded online presence for ${records.length} guilds`);
    } catch (error) {
      this.logger.error('Failed to record online presence', error);
    }
  }

  /**
   * Get online frequency data aggregated by hour for a guild.
   * @param range - 'week' | 'month' | '90d'
   */
  async getOnlineFrequency(
    guildId: string,
    range: RangeFilter = 'week',
  ): Promise<{ hour: number; count: number; humanCount: number }[]> {
    if (!this.prisma.isConnected) {
      return this.emptyHours();
    }

    const now = new Date();
    let since: Date;

    switch (range) {
      case 'week':
        since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        since = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
    }

    try {
      const records = await this.prisma.client.onlinePresenceLog.findMany({
        where: {
          guildId,
          recordedAt: { gte: since },
        },
        select: { count: true, humanCount: true, recordedAt: true },
      });

      if (records.length === 0) return this.emptyHours();

      const totalMap = new Map<number, number[]>();
      const humanMap = new Map<number, number[]>();
      for (let i = 0; i < 24; i++) {
        totalMap.set(i, []);
        humanMap.set(i, []);
      }

      for (const r of records) {
        const hour = r.recordedAt.getUTCHours();
        totalMap.get(hour)?.push(r.count);
        humanMap.get(hour)?.push(r.humanCount);
      }

      return Array.from({ length: 24 }, (_, hour) => {
        const totalValues = totalMap.get(hour) ?? [];
        const humanValues = humanMap.get(hour) ?? [];
        const avg = (vals: number[]) =>
          vals.length > 0
            ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
            : 0;
        return { hour, count: avg(totalValues), humanCount: avg(humanValues) };
      });
    } catch {
      return this.emptyHours();
    }
  }

  @Cron('0 3 * * *')
  async cleanOldRecords(): Promise<void> {
    if (!this.prisma.isConnected) return;
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    try {
      const deleted = await this.prisma.client.onlinePresenceLog.deleteMany({
        where: { recordedAt: { lt: cutoff } },
      });
      if (deleted.count > 0) {
        this.logger.log(`Cleaned ${deleted.count} old presence records`);
      }
    } catch (error) {
      this.logger.error('Failed to clean old presence records', error);
    }
  }

  private emptyHours(): { hour: number; count: number; humanCount: number }[] {
    return Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: 0,
      humanCount: 0,
    }));
  }
}
