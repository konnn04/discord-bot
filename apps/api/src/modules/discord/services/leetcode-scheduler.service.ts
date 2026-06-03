/**
 * Scheduled delivery of LeetCode Daily & Contest notifications.
 *
 * Daily:  8:00 AM VN (UTC+7) → @Cron('0 1 * * *') UTC
 * Contest: 5:00 PM VN (UTC+7) → @Cron('0 10 * * *') UTC
 */
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { GuildSettingsService } from '../../settings/guild-settings.service';
import {
  getLeetcodeApi,
  LeetcodeDaily,
  LeetcodeContest,
} from './leetcode-api.client';
import type { Client, TextChannel } from 'discord.js';
import {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} from 'discord.js';
import { LEETCODE_BASE, DIFF_COLORS } from '../constants';

@Injectable()
export class LeetcodeSchedulerService {
  private readonly logger = new Logger(LeetcodeSchedulerService.name);
  private discordClient: Client | null = null;

  constructor(
    private prisma: PrismaService,
    private guildSettings: GuildSettingsService,
  ) {}

  setClient(client: Client): void {
    this.discordClient = client;
  }

  // ── Daily: 8AM VN = 1:00 UTC ──────────────────────────────────

  @Cron('0 1 * * *')
  async sendDaily(): Promise<void> {
    if (!this.discordClient) return;

    let daily: LeetcodeDaily;
    try {
      daily = await getLeetcodeApi().getDaily();
    } catch (err: any) {
      this.logger.error(`[LeetCode Daily] Fetch failed: ${err.message}`);
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const embed = this.buildDailyEmbed(daily);
    const buttons = this.buildLinkButton(daily.link);

    // Send to guild channels
    for (const [, guild] of this.discordClient.guilds.cache) {
      const settings = this.guildSettings.get(guild.id);
      if (!settings.features.dailyLeetCode || !settings.dailyLeetCode.channelId)
        continue;

      // Prevent duplicate sends for the same date
      const alreadySent = await this.prisma.client.leetcodeDailySent.findUnique(
        {
          where: { guildId_date: { guildId: guild.id, date: today } },
        },
      );
      if (alreadySent) continue;

      try {
        const ch = guild.channels.cache.get(
          settings.dailyLeetCode.channelId,
        ) as TextChannel | undefined;
        if (ch) {
          await ch.send({ embeds: [embed], components: [buttons] });
          await this.prisma.client.leetcodeDailySent.create({
            data: { guildId: guild.id, date: today },
          });
        }
      } catch (err: any) {
        this.logger.warn(
          `[LeetCode Daily] Failed to send to guild ${guild.id}: ${err.message}`,
        );
      }
    }

    // Send to users who opted in for DM
    const dmUsers = await this.prisma.client.user.findMany({
      where: { leetcodeDailyDm: true },
    });
    for (const user of dmUsers) {
      const alreadySent =
        await this.prisma.client.leetcodeDailySentUser.findUnique({
          where: { userId_date: { userId: user.discordId, date: today } },
        });
      if (alreadySent) continue;

      try {
        const discordUser = await this.discordClient.users
          .fetch(user.discordId)
          .catch(() => null);
        if (discordUser) {
          await discordUser.send({
            embeds: [embed],
            components: [buttons],
          });
          await this.prisma.client.leetcodeDailySentUser.create({
            data: { userId: user.discordId, date: today },
          });
        }
      } catch {
        /* DMs closed — skip */
      }
    }

    this.logger.log(`[LeetCode Daily] Sent for ${today}`);
  }

  // ── Contest: 5PM VN = 10:00 UTC ───────────────────────────────

  @Cron('0 10 * * *')
  async sendContests(): Promise<void> {
    if (!this.discordClient) return;

    let contests: LeetcodeContest[];
    try {
      const res = await getLeetcodeApi().getContests();
      contests = res.topTwoContests || [];
    } catch (err: any) {
      this.logger.error(`[LeetCode Contest] Fetch failed: ${err.message}`);
      return;
    }

    for (const contest of contests) {
      // Already notified?
      const exists = await this.prisma.client.leetcodeContestSent.findUnique({
        where: { slug: contest.titleSlug },
      });
      if (exists) continue;

      const embed = this.buildContestEmbed(contest);

      // Notify guild channels
      for (const [, guild] of this.discordClient.guilds.cache) {
        const settings = this.guildSettings.get(guild.id);
        if (
          !settings.features.leetcodeContest ||
          !settings.leetcodeContest.channelId
        )
          continue;

        try {
          const ch = guild.channels.cache.get(
            settings.leetcodeContest.channelId,
          ) as TextChannel | undefined;
          if (ch) {
            await ch.send({ embeds: [embed] });
            await this.prisma.client.leetcodeContestSent.create({
              data: { slug: contest.titleSlug, guildId: guild.id },
            });
          }
        } catch (err: any) {
          this.logger.warn(
            `[LeetCode Contest] Failed guild ${guild.id}: ${err.message}`,
          );
        }
      }

      // Notify DM users
      const dmUsers = await this.prisma.client.user.findMany({
        where: { leetcodeContestDm: true },
      });
      for (const user of dmUsers) {
        try {
          const discordUser = await this.discordClient.users
            .fetch(user.discordId)
            .catch(() => null);
          if (discordUser) {
            await discordUser.send({ embeds: [embed] });
            await this.prisma.client.leetcodeContestSent.create({
              data: { slug: contest.titleSlug, userId: user.discordId },
            });
          }
        } catch {
          /* DMs closed */
        }
      }
    }

    if (contests.length > 0) {
      this.logger.log(
        `[LeetCode Contest] Notified ${contests.length} contests`,
      );
    }
  }

  // ── Embed builders ────────────────────────────────────────────

  private buildDailyEmbed(daily: LeetcodeDaily): EmbedBuilder {
    const q = daily.question;
    const color = DIFF_COLORS[q.difficulty] || 0x7c3aed;
    const topics = q.topicTags.map((t) => t.name).join(', ') || 'None';
    const acRate = q.acRate.toFixed(1);

    return new EmbedBuilder()
      .setColor(color)
      .setTitle(`📋 LeetCode Daily: ${q.questionFrontendId}. ${q.title}`)
      .setURL(`${LEETCODE_BASE}${daily.link}`)
      .addFields(
        {
          name: 'Độ khó',
          value: `\`${q.difficulty}\``,
          inline: true,
        },
        { name: 'AC Rate', value: `${acRate}%`, inline: true },
        { name: 'Topics', value: topics, inline: false },
      )
      .setFooter({ text: `📅 ${daily.date}` })
      .setTimestamp();
  }

  private buildContestEmbed(contest: LeetcodeContest): EmbedBuilder {
    const startStr = `<t:${contest.startTime}:F>`;
    const endStr = `<t:${contest.startTime + contest.duration}:R>`;

    return new EmbedBuilder()
      .setColor(0xf59e0b)
      .setTitle(`🏆 ${contest.title}`)
      .setURL(`${LEETCODE_BASE}/contest/${contest.titleSlug}`)
      .addFields(
        { name: 'Bắt đầu', value: startStr, inline: true },
        {
          name: 'Thời lượng',
          value: `${Math.floor(contest.duration / 60)} phút`,
          inline: true,
        },
        {
          name: 'Kết thúc',
          value: endStr,
          inline: false,
        },
      )
      .setFooter({ text: 'LeetCode Contest sắp diễn ra!' })
      .setTimestamp();
  }

  private buildLinkButton(link: string): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel('Mở trên LeetCode')
        .setURL(`${LEETCODE_BASE}${link}`)
        .setStyle(ButtonStyle.Link),
    );
  }
}
