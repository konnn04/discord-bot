/**
 * Checks tracked anime broadcast schedules every 30 minutes.
 * DMs users when a new episode has aired since last check.
 */
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { getAnimeApi } from './anime-api.client';
import type { Client } from 'discord.js';
import { EmbedBuilder } from 'discord.js';

@Injectable()
export class AnimeSchedulerService {
  private readonly logger = new Logger(AnimeSchedulerService.name);
  private discordClient: Client | null = null;

  constructor(private prisma: PrismaService) {}

  setClient(client: Client): void {
    this.discordClient = client;
  }

  @Cron('*/30 * * * *')
  async checkSchedule(): Promise<void> {
    if (!this.discordClient) return;

    const tracks = await this.prisma.client.animeTrack.findMany({
      where: { airingAt: { not: null } },
    });

    let notified = 0;
    const now = Math.floor(Date.now() / 1000);

    for (const track of tracks) {
      try {
        const schedule = await getAnimeApi().getBroadcastSchedule(
          track.animeId,
        );
        if (!schedule) continue;

        // Episode already aired?
        if (schedule.airingAt > now) continue;

        // Already notified for this episode?
        const alreadyNotified =
          await this.prisma.client.animeEpisodeNotified.findUnique({
            where: {
              userId_animeId_episode: {
                userId: track.userId,
                animeId: track.animeId,
                episode: schedule.episode,
              },
            },
          });
        if (alreadyNotified) continue;

        // DM the user
        const discordUser = await this.discordClient.users
          .fetch(track.userId)
          .catch(() => null);
        if (!discordUser) continue;

        const embed = new EmbedBuilder()
          .setColor(0x8b5cf6)
          .setTitle(`📺 Tập mới: ${track.title}`)
          .setDescription(`**Tập ${schedule.episode}** đã phát sóng!`)
          .setThumbnail(track.posterUrl)
          .setFooter({ text: 'Dùng /my_anime để quản lý danh sách theo dõi' });

        try {
          await discordUser.send({ embeds: [embed] });
        } catch {
          /* DMs closed */
          continue;
        }

        // Mark notified
        await this.prisma.client.animeEpisodeNotified.create({
          data: {
            userId: track.userId,
            animeId: track.animeId,
            episode: schedule.episode,
          },
        });

        // Update tracking record with new next episode
        const nextSchedule = await getAnimeApi().getBroadcastSchedule(
          track.animeId,
        );
        await this.prisma.client.animeTrack.update({
          where: {
            userId_animeId: { userId: track.userId, animeId: track.animeId },
          },
          data: {
            nextEpisode: nextSchedule?.episode ?? null,
            airingAt: nextSchedule
              ? new Date(nextSchedule.airingAt * 1000)
              : null,
          },
        });

        notified++;
      } catch (err: any) {
        this.logger.warn(
          `[Anime] Check failed for anime ${track.animeId}: ${err.message}`,
        );
      }
    }

    if (notified > 0) {
      this.logger.log(`[Anime] Notified ${notified} new episodes`);
    }
  }
}
