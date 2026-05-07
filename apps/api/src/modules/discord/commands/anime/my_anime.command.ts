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

const PAGE_SIZE = 10;
const STATUS_EMOJI: Record<string, string> = {
  RELEASING: '📺',
  FINISHED: '✅',
  NOT_YET_RELEASED: '⏳',
  CANCELLED: '🚫',
};

function listEmbed(
  animes: AnimeInfo[],
  page: number,
  totalPages: number,
  totalAnimes: number,
): EmbedBuilder {
  const lines = animes.map((a, i) => {
    const title = (a.title.romaji || a.title.english || 'Unknown').slice(0, 50);
    const star = a.averageScore ? ` ⭐${a.averageScore}%` : '';
    const status = STATUS_EMOJI[a.status] || '';
    const eps = a.episodes ? ` • ${a.episodes} eps` : '';
    const num = (page - 1) * PAGE_SIZE + i + 1;
    return `**${num}.** ${status} ${title}${star}${eps}`;
  });

  return new EmbedBuilder()
    .setColor(0x8b5cf6)
    .setTitle('📋 Anime đang theo dõi')
    .setDescription(lines.join('\n'))
    .setFooter({
      text: `Trang ${page}/${totalPages} • ${totalAnimes} anime • Chọn bên dưới để xem chi tiết`,
    });
}

function detailEmbed(anime: AnimeInfo, isFollowed: boolean): EmbedBuilder {
  const title = anime.title.romaji || anime.title.english || 'Unknown';
  const score = anime.averageScore ? `${anime.averageScore}%` : 'N/A';
  const genres = anime.genres.slice(0, 5).join(', ') || 'None';
  const status = anime.status
    ? `${STATUS_EMOJI[anime.status] || ''} ${anime.status}`
    : 'Unknown';
  const desc = anime.description
    ? anime.description.replace(/<[^>]+>/g, '').slice(0, 250) + '...'
    : 'Không có mô tả.';

  const embed = new EmbedBuilder()
    .setColor(isFollowed ? 0x10b981 : 0x8b5cf6)
    .setTitle(title)
    .setURL(anime.siteUrl)
    .setThumbnail(anime.coverImage.large)
    .setDescription(desc)
    .addFields(
      { name: '⭐ Điểm', value: score, inline: true },
      {
        name: '📼 Số tập',
        value: anime.episodes ? `${anime.episodes} tập` : 'Chưa rõ',
        inline: true,
      },
      { name: '📡 Trạng thái', value: status, inline: true },
      { name: '🏷️ Thể loại', value: genres, inline: false },
    );

  if (anime.nextAiringEpisode) {
    embed.addFields({
      name: '📡 Tập tiếp theo',
      value: `Ep ${anime.nextAiringEpisode.episode} — <t:${anime.nextAiringEpisode.airingAt}:R>`,
      inline: false,
    });
  }

  embed.setFooter({
    text: isFollowed ? '✅ Đang theo dõi' : 'Nhấn ❤️ để theo dõi',
  });
  return embed;
}

function pageButtons(
  page: number,
  totalPages: number,
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('myanime_first')
      .setEmoji('⏮️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 1),
    new ButtonBuilder()
      .setCustomId('myanime_prev')
      .setEmoji('◀️')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page <= 1),
    new ButtonBuilder()
      .setCustomId('myanime_next')
      .setEmoji('▶️')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page >= totalPages),
    new ButtonBuilder()
      .setCustomId('myanime_last')
      .setEmoji('⏭️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages),
  );
}

function selectMenu(
  pageAnimes: AnimeInfo[],
): ActionRowBuilder<StringSelectMenuBuilder> {
  const s = new StringSelectMenuBuilder()
    .setCustomId('myanime_select')
    .setPlaceholder('Chọn anime để xem chi tiết...');
  for (const a of pageAnimes) {
    const name = (a.title.romaji || a.title.english || 'Unknown').slice(0, 100);
    s.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(name)
        .setValue(String(a.id))
        .setDescription(`${a.status || '?'} • ${a.episodes || '?'} eps`),
    );
  }
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(s);
}

function detailButtons(
  animeId: number,
  isFollowed: boolean,
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`myanime_follow_${animeId}`)
      .setEmoji(isFollowed ? '💔' : '❤️')
      .setLabel(isFollowed ? 'Bỏ theo dõi' : 'Theo dõi')
      .setStyle(isFollowed ? ButtonStyle.Danger : ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('myanime_back')
      .setEmoji('🔙')
      .setLabel('Quay lại')
      .setStyle(ButtonStyle.Secondary),
  );
}

const myAnime: ActionCommand = {
  name: 'my_anime',
  description: 'Xem danh sách anime bạn đang theo dõi',
  category: 'anime',
  permission: PermissionLevel.EVERYONE,

  async execute(ctx: ContextAdapter, deps?: any) {
    const prisma = deps?.prisma as PrismaService | undefined;
    if (!prisma) {
      await ctx.reply('❌ Hệ thống chưa sẵn sàng.');
      return;
    }

    await ctx.defer();

    const tracks = await prisma.client.animeTrack.findMany({
      where: { userId: ctx.userId },
      orderBy: { addedAt: 'desc' },
    });

    if (tracks.length === 0) {
      await ctx.editReply(
        '📭 Bạn chưa theo dõi anime nào. Dùng `/anime` để bắt đầu!',
      );
      return;
    }

    // Batch-fetch all tracked anime in a single AniList call (id_in filter)
    const followedIds = [...new Set(tracks.map((t) => t.animeId))];
    const api = getAnimeApi();
    const animeMap = await api.getAnimeBatch(followedIds);

    // Build sorted list (preserve DB order)
    const animes: AnimeInfo[] = [];
    for (const t of tracks) {
      const info = animeMap.get(t.animeId);
      if (info) {
        animes.push(info);
      } else {
        // Fallback: use DB data
        animes.push({
          id: t.animeId,
          title: { romaji: t.title, english: null, native: null },
          coverImage: { large: t.posterUrl, medium: t.posterUrl },
          description: '',
          episodes: t.episodeCount,
          duration: null,
          status: t.nextEpisode ? 'RELEASING' : 'FINISHED',
          season: '',
          seasonYear: 0,
          format: '',
          genres: [],
          averageScore: null,
          nextAiringEpisode: t.airingAt
            ? {
                id: 0,
                episode: t.nextEpisode || 0,
                airingAt: Math.floor(t.airingAt.getTime() / 1000),
                timeUntilAiring: 0,
              }
            : null,
          siteUrl: `https://anilist.co/anime/${t.animeId}`,
        });
      }
    }

    const totalPages = Math.ceil(animes.length / PAGE_SIZE);
    const userId = ctx.userId;
    let currentPage = 1;
    let selectedAnimeId: number | null = null;
    let isFollowed = true;

    const pageSlice = () =>
      animes.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const buildEmbed = () => {
      if (selectedAnimeId) {
        const anime = animes.find((a) => a.id === selectedAnimeId);
        if (anime) return detailEmbed(anime, isFollowed);
      }
      return listEmbed(pageSlice(), currentPage, totalPages, animes.length);
    };

    const buildComponents = () => {
      if (selectedAnimeId !== null) {
        return [detailButtons(selectedAnimeId, isFollowed)];
      }
      return [selectMenu(pageSlice()), pageButtons(currentPage, totalPages)];
    };

    const msg = await ctx.editReply({
      embeds: [buildEmbed()],
      components: buildComponents(),
    });

    const attachCollector = (message: typeof msg) => {
      const col = message.createMessageComponentCollector({ time: 120_000 });

      col.on('collect', async (i) => {
        if (i.user.id !== userId) {
          await i.reply({
            content: '❌ Nút này không dành cho bạn.',
            flags: 64,
          });
          return;
        }

        const cid = i.customId;
        let changed = true;

        if (cid === 'myanime_first') {
          currentPage = 1;
          selectedAnimeId = null;
        } else if (cid === 'myanime_last') {
          currentPage = totalPages;
          selectedAnimeId = null;
        } else if (cid === 'myanime_prev') {
          currentPage--;
          selectedAnimeId = null;
        } else if (cid === 'myanime_next') {
          currentPage++;
          selectedAnimeId = null;
        } else if (cid === 'myanime_select') {
          selectedAnimeId = parseInt((i as any).values?.[0] || '', 10);
          isFollowed = true;
        } else if (cid.startsWith('myanime_follow_')) {
          const animeId = parseInt(cid.replace('myanime_follow_', ''), 10);
          const anime = animes.find((a) => a.id === animeId);
          if (!anime) {
            changed = false;
          } else {
            isFollowed = !isFollowed;
            if (isFollowed) {
              await prisma.client.animeTrack.upsert({
                where: { userId_animeId: { userId, animeId } },
                create: {
                  userId,
                  animeId,
                  title: anime.title.romaji || anime.title.english || 'Unknown',
                  posterUrl: anime.coverImage.large,
                  episodeCount: anime.episodes,
                  nextEpisode: anime.nextAiringEpisode?.episode ?? null,
                  airingAt: anime.nextAiringEpisode
                    ? new Date(anime.nextAiringEpisode.airingAt * 1000)
                    : null,
                },
                update: {
                  title: anime.title.romaji || anime.title.english || 'Unknown',
                  posterUrl: anime.coverImage.large,
                  episodeCount: anime.episodes,
                  nextEpisode: anime.nextAiringEpisode?.episode ?? null,
                  airingAt: anime.nextAiringEpisode
                    ? new Date(anime.nextAiringEpisode.airingAt * 1000)
                    : null,
                },
              });
            } else {
              await prisma.client.animeTrack.delete({
                where: { userId_animeId: { userId, animeId } },
              });
            }
          }
        } else if (cid === 'myanime_back') {
          selectedAnimeId = null;
        } else {
          changed = false;
        }

        if (changed) {
          await i.update({
            embeds: [buildEmbed()],
            components: buildComponents(),
          });
          col.stop();
          attachCollector(msg);
        }
      });

      col.on('end', async () => {
        try {
          await msg.edit({ components: [] }).catch(() => {});
        } catch {
          /* deleted */
        }
      });
    };

    attachCollector(msg);
  },
};

export default myAnime;
