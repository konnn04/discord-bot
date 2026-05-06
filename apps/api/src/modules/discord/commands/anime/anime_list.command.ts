import { PermissionLevel } from 'shared/src/types/discord.types';
import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import { getAnimeApi, AnimeInfo } from '../../services/anime-api.client';
import type { PrismaService } from '../../../prisma/prisma.service';
import {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
} from 'discord.js';

const PAGE_SIZE = 5;
const STATUS_EMOJI: Record<string, string> = {
  RELEASING: '📺',
  FINISHED: '✅',
  NOT_YET_RELEASED: '⏳',
};

function seasonLabel(): string {
  const m = new Date().getMonth();
  const y = new Date().getFullYear();
  if (m <= 2) return `Winter ${y}`;
  if (m <= 5) return `Spring ${y}`;
  if (m <= 8) return `Summer ${y}`;
  return `Fall ${y}`;
}

function listEmbed(
  animes: AnimeInfo[],
  page: number,
  totalPages: number,
): EmbedBuilder {
  const lines = animes.map((a, i) => {
    const title = (a.title.romaji || a.title.english || 'Unknown').slice(0, 50);
    const star = a.averageScore ? ` ⭐${a.averageScore}%` : '';
    const status = STATUS_EMOJI[a.status] || '';
    const num = (page - 1) * PAGE_SIZE + i + 1;
    return `**${num}.** ${status} ${title}${star}`;
  });

  return new EmbedBuilder()
    .setColor(0x8b5cf6)
    .setTitle(`📺 Anime mùa ${seasonLabel()}`)
    .setDescription(lines.join('\n'))
    .setFooter({
      text: `Trang ${page}/${totalPages} • Chọn anime bên dưới để xem chi tiết`,
    });
}

function detailEmbed(anime: AnimeInfo, isFollowed: boolean): EmbedBuilder {
  const title = anime.title.romaji || anime.title.english || 'Unknown';
  const score = anime.averageScore ? `${anime.averageScore}%` : 'N/A';
  const genres = anime.genres.slice(0, 4).join(', ') || 'None';
  const status = anime.status
    ? `${STATUS_EMOJI[anime.status] || ''} ${anime.status}`
    : 'Unknown';
  const desc = anime.description
    ? anime.description.replace(/<[^>]+>/g, '').slice(0, 200) + '...'
    : 'Không có mô tả.';

  const embed = new EmbedBuilder()
    .setColor(isFollowed ? 0x10b981 : 0x8b5cf6)
    .setTitle(title)
    .setURL(anime.siteUrl)
    .setThumbnail(anime.coverImage.large)
    .setDescription(desc)
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

  embed.setFooter({
    text: isFollowed ? '✅ Đang theo dõi' : 'Nhấn nút để theo dõi',
  });
  return embed;
}

function pageButtons(
  page: number,
  totalPages: number,
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('anime_page_first')
      .setEmoji('⏮️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 1),
    new ButtonBuilder()
      .setCustomId('anime_page_prev')
      .setEmoji('◀️')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page <= 1),
    new ButtonBuilder()
      .setCustomId('anime_page_next')
      .setEmoji('▶️')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page >= totalPages),
    new ButtonBuilder()
      .setCustomId('anime_page_last')
      .setEmoji('⏭️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages),
  );
}

function detailButtons(
  selectedAnimeId: number,
  isFollowed: boolean,
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`anime_follow_${selectedAnimeId}`)
      .setEmoji(isFollowed ? '💔' : '❤️')
      .setLabel(isFollowed ? 'Bỏ theo dõi' : 'Theo dõi')
      .setStyle(isFollowed ? ButtonStyle.Danger : ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('anime_back')
      .setEmoji('🔙')
      .setLabel('Quay lại')
      .setStyle(ButtonStyle.Secondary),
  );
}

function selectMenu(
  pageAnimes: AnimeInfo[],
): ActionRowBuilder<StringSelectMenuBuilder> {
  const s = new StringSelectMenuBuilder()
    .setCustomId('anime_select')
    .setPlaceholder('Chọn anime để xem chi tiết...');
  for (const a of pageAnimes) {
    const name = (a.title.romaji || a.title.english || 'Unknown').slice(0, 100);
    s.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(name)
        .setValue(String(a.id))
        .setDescription(`${a.status} • ${a.episodes || '?'} eps`),
    );
  }
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(s);
}

const animeList: ActionCommand = {
  name: 'anime',
  description: 'Duyệt danh sách anime theo mùa và theo dõi',
  category: 'anime',
  permission: PermissionLevel.EVERYONE,

  async execute(ctx: ContextAdapter, deps?: any) {
    await ctx.defer();

    try {
      const api = getAnimeApi();
      const MAX_PAGES = 5;
      const allAnimes: AnimeInfo[] = [];

      for (let p = 1; p <= MAX_PAGES; p++) {
        const batch = await api.getSeasonal(p, PAGE_SIZE);
        if (batch.length === 0) break;
        allAnimes.push(...batch);
      }

      if (allAnimes.length === 0) {
        await ctx.editReply('📭 Không có anime nào mùa này.');
        return;
      }

      const totalPages = Math.ceil(allAnimes.length / PAGE_SIZE);
      const userId = ctx.userId;
      let currentPage = 1;
      let selectedAnimeId: number | null = null;
      let isFollowed = false;

      const pageSlice = () =>
        allAnimes.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

      const buildEmbed = () => {
        if (selectedAnimeId) {
          const anime = allAnimes.find((a) => a.id === selectedAnimeId);
          if (anime) return detailEmbed(anime, isFollowed);
        }
        return listEmbed(pageSlice(), currentPage, totalPages);
      };

      const buildComponents = () => {
        const rows: ActionRowBuilder<any>[] = [
          selectMenu(pageSlice()),
          pageButtons(currentPage, totalPages),
        ];
        if (selectedAnimeId) {
          rows.push(detailButtons(selectedAnimeId, isFollowed));
        }
        return rows;
      };

      const msg = await ctx.editReply({
        embeds: [buildEmbed()],
        components: buildComponents(),
      });

      const collector = msg.createMessageComponentCollector({ time: 180_000 });

      collector.on('collect', async (i) => {
        if (i.user.id !== userId) {
          await i.reply({
            content: '❌ Menu này không dành cho bạn.',
            flags: 64,
          });
          return;
        }

        const prisma = deps?.prisma as PrismaService | undefined;

        if (i.isButton()) {
          switch (i.customId) {
            case 'anime_page_first':
              currentPage = 1;
              break;
            case 'anime_page_prev':
              currentPage = Math.max(1, currentPage - 1);
              break;
            case 'anime_page_next':
              currentPage = Math.min(totalPages, currentPage + 1);
              break;
            case 'anime_page_last':
              currentPage = totalPages;
              break;
            case 'anime_back':
              selectedAnimeId = null;
              break;
            default:
              if (
                i.customId.startsWith('anime_follow_') &&
                prisma &&
                selectedAnimeId
              ) {
                const anime = allAnimes.find((a) => a.id === selectedAnimeId);
                if (!anime) return;

                const existing = await prisma.client.animeTrack.findUnique({
                  where: {
                    userId_animeId: { userId, animeId: selectedAnimeId },
                  },
                });

                if (existing) {
                  await prisma.client.animeTrack.delete({
                    where: {
                      userId_animeId: { userId, animeId: selectedAnimeId },
                    },
                  });
                  isFollowed = false;
                } else {
                  await prisma.client.animeTrack.create({
                    data: {
                      userId,
                      animeId: selectedAnimeId,
                      title:
                        anime.title.romaji || anime.title.english || 'Unknown',
                      posterUrl: anime.coverImage.medium,
                      episodeCount: anime.episodes,
                      nextEpisode: anime.nextAiringEpisode?.episode ?? null,
                      airingAt: anime.nextAiringEpisode
                        ? new Date(anime.nextAiringEpisode.airingAt * 1000)
                        : null,
                    },
                  });
                  isFollowed = true;
                }
              }
          }
          await i.update({
            embeds: [buildEmbed()],
            components: buildComponents(),
          });
          return;
        }

        if (i.isStringSelectMenu() && i.customId === 'anime_select') {
          selectedAnimeId = parseInt(i.values[0], 10);
          if (prisma) {
            const existing = await prisma.client.animeTrack.findUnique({
              where: { userId_animeId: { userId, animeId: selectedAnimeId } },
            });
            isFollowed = !!existing;
          }
          await i.update({
            embeds: [buildEmbed()],
            components: buildComponents(),
          });
        }
      });

      collector.on('end', async () => {
        try {
          await msg.edit({ components: [] });
        } catch {
          /* deleted */
        }
      });
    } catch (err: any) {
      await ctx.editReply(`❌ Lỗi: ${err.message || 'Không thể tải anime.'}`);
    }
  },
};

export default animeList;
