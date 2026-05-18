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

    const now = new Date();
    const tracks = await this.prisma.client.animeTrack.findMany({
      where: {
        airingAt: { lte: now },
      },
    });

    let notified = 0;

    for (const track of tracks) {
      try {
        const episodeToNotify = track.nextEpisode;
        if (!episodeToNotify) continue;

        const alreadyNotified =
          await this.prisma.client.animeEpisodeNotified.findUnique({
            where: {
              userId_animeId_episode: {
                userId: track.userId,
                animeId: track.animeId,
                episode: episodeToNotify,
              },
            },
          });

        if (!alreadyNotified) {
          // DM the user
          const discordUser = await this.discordClient.users
            .fetch(track.userId)
            .catch(() => null);

          if (discordUser) {
            const embed = new EmbedBuilder()
              .setColor(0x8b5cf6)
              .setTitle(`📺 Tập mới: ${track.title}`)
              .setDescription(`**Tập ${episodeToNotify}** đã phát sóng!`)
              .setThumbnail(track.posterUrl)
              .setFooter({
                text: 'Dùng /my_anime để quản lý danh sách theo dõi',
              });

            try {
              await discordUser.send({ embeds: [embed] });
              await this.prisma.client.animeEpisodeNotified.create({
                data: {
                  userId: track.userId,
                  animeId: track.animeId,
                  episode: episodeToNotify,
                },
              });
              notified++;
            } catch {
              /* DMs closed */
              continue;
            }
          } else {
            continue;
          }
        } else {
          continue;
        }

        // Fetch new schedule to update track
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

  /** Every 6 hours: check tracked anime. If status == FINISHED, unfollow + DM. */
  @Cron('0 */6 * * *')
  async autoUnfollowFinished(): Promise<void> {
    if (!this.discordClient) return;

    const tracks = await this.prisma.client.animeTrack.findMany({
      select: { userId: true, animeId: true, title: true },
      distinct: ['animeId'],
    });

    if (tracks.length === 0) return;

    // Get unique anime IDs and batch-check status
    const uniqueIds = [...new Set(tracks.map((t) => t.animeId))];
    let removed = 0;

    try {
      const animeMap = await getAnimeApi().getAnimeBatch(uniqueIds);

      for (const track of tracks) {
        const anime = animeMap.get(track.animeId);
        if (!anime || anime.status !== 'FINISHED') continue;

        await this.prisma.client.animeTrack
          .delete({
            where: {
              userId_animeId: {
                userId: track.userId,
                animeId: track.animeId,
              },
            },
          })
          .catch(() => {
            /* already deleted */
          });

        // DM user
        try {
          const user = await this.discordClient.users
            .fetch(track.userId)
            .catch(() => null);
          if (user) {
            await user.send(
              `✅ **${track.title}** đã kết thúc! Đã tự động bỏ theo dõi.`,
            );
          }
        } catch {
          /* DMs closed */
        }

        removed++;
      }
    } catch (err: any) {
      this.logger.warn(`[Anime] Auto-unfollow batch failed: ${err.message}`);
    }

    if (removed > 0) {
      this.logger.log(
        `[Anime] Auto-unfollowed ${removed} finished anime entries`,
      );
    }
  }
}
