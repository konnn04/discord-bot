import { PermissionLevel } from 'shared/src/types/discord.types';
import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import { getAnimeApi, AnimeInfo } from '../../services/anime-api.client';
import type { PrismaService } from '../../../prisma/prisma.service';
import {
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
  ComponentType,
} from 'discord.js';

const STATUS_EMOJI: Record<string, string> = {
  RELEASING: '📺',
  FINISHED: '✅',
  NOT_YET_RELEASED: '⏳',
};

function buildAnimeEmbed(anime: AnimeInfo, extra?: string): EmbedBuilder {
  const title = anime.title.romaji || anime.title.english || 'Unknown';
  const score = anime.averageScore ? `${anime.averageScore}%` : 'N/A';
  const genres = anime.genres.slice(0, 4).join(', ') || 'None';
  const status = anime.status
    ? `${STATUS_EMOJI[anime.status] || ''} ${anime.status}`
    : 'Unknown';

  const embed = new EmbedBuilder()
    .setColor(0x8b5cf6)
    .setTitle(title)
    .setURL(anime.siteUrl)
    .setThumbnail(anime.coverImage.large)
    .addFields(
      { name: 'Điểm', value: score, inline: true },
      {
        name: 'Số tập',
        value: anime.episodes ? `${anime.episodes} tập` : 'Chưa rõ',
        inline: true,
      },
      { name: 'Trạng thái', value: status, inline: true },
      { name: 'Thể loại', value: genres, inline: false },
    );

  if (anime.nextAiringEpisode) {
    embed.addFields({
      name: '📡 Tập tiếp theo',
      value: `Ep ${anime.nextAiringEpisode.episode} — <t:${anime.nextAiringEpisode.airingAt}:R>`,
      inline: false,
    });
  }

  if (extra) embed.setFooter({ text: extra });
  return embed;
}

const animeList: ActionCommand = {
  name: 'anime',
  description: 'Xem danh sách anime hot mùa này và theo dõi',
  category: 'anime',
  permission: PermissionLevel.EVERYONE,

  async execute(ctx: ContextAdapter, deps?: any) {
    await ctx.defer();

    try {
      const api = getAnimeApi();
      const animes = await api.getSeasonal(1, 25);

      if (animes.length === 0) {
        await ctx.editReply('📭 Không có anime nào mùa này.');
        return;
      }

      const select = new StringSelectMenuBuilder()
        .setCustomId('anime_track')
        .setPlaceholder('Chọn anime để xem chi tiết / theo dõi...')
        .addOptions(
          animes.slice(0, 25).map((a) => {
            const name = (a.title.romaji || a.title.english || 'Unknown').slice(
              0,
              100,
            );
            return new StringSelectMenuOptionBuilder()
              .setLabel(name)
              .setValue(String(a.id))
              .setDescription(`${a.status} • ${a.episodes || '?'} eps`);
          }),
        );

      const msg = await ctx.editReply({
        embeds: [buildAnimeEmbed(animes[0], 'Dùng menu để chọn anime ⬇️')],
        components: [
          new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select),
        ],
      });

      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 120_000,
      });

      collector.on('collect', async (i) => {
        if (i.user.id !== ctx.userId) {
          await i.reply({
            content: '❌ Menu này không dành cho bạn.',
            flags: 64,
          });
          return;
        }

        const animeId = parseInt(i.values[0], 10);
        const anime = animes.find((a) => a.id === animeId);
        if (!anime) return;

        const prisma = deps?.prisma as PrismaService | undefined;
        let footer: string;

        if (prisma) {
          const existing = await prisma.client.animeTrack.findUnique({
            where: { userId_animeId: { userId: ctx.userId, animeId } },
          });

          if (existing) {
            await prisma.client.animeTrack.delete({
              where: { userId_animeId: { userId: ctx.userId, animeId } },
            });
            footer = '❌ Đã bỏ theo dõi';
          } else {
            await prisma.client.animeTrack.create({
              data: {
                userId: ctx.userId,
                animeId,
                title: anime.title.romaji || anime.title.english || 'Unknown',
                posterUrl: anime.coverImage.medium,
                episodeCount: anime.episodes,
                nextEpisode: anime.nextAiringEpisode?.episode ?? null,
                airingAt: anime.nextAiringEpisode
                  ? new Date(anime.nextAiringEpisode.airingAt * 1000)
                  : null,
              },
            });
            footer = '✅ Đã theo dõi — bot sẽ DM khi có tập mới';
          }
        } else {
          footer = '📺 Xem trên AniList';
        }

        await i.update({
          embeds: [buildAnimeEmbed(anime, footer)],
          components: [
            new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
              select,
            ),
          ],
        });
      });

      collector.on('end', async () => {
        try {
          await msg.edit({ components: [] });
        } catch {
          /* message deleted */
        }
      });
    } catch (err: any) {
      await ctx.editReply(`❌ Lỗi: ${err.message || 'Không thể tải anime.'}`);
    }
  },
};

export default animeList;
