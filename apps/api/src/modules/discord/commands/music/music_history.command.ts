import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import { EmbedBuilder } from 'discord.js';
import { formatDuration } from '../../services/music/utils';
import { paginate } from '../../utils/pagination';

const musicHistory: ActionCommand = {
  name: 'music_history',
  description: 'Xem lịch sử nghe nhạc và thống kê',
  category: 'music',
  optionalArgs: [
    {
      name: 'user',
      description: 'Xem lịch sử của người khác (mặc định: bạn)',
      type: 'USER',
      required: false,
    },
  ],

  async execute(ctx: ContextAdapter, deps?: any) {
    const guildId = ctx.guildId;
    if (!guildId) {
      await ctx.reply('❌ Lệnh này chỉ dùng trong server.');
      return;
    }

    await ctx.defer();

    const prisma = deps?.prisma;
    if (!prisma) {
      await ctx.editReply('❌ Database chưa sẵn sàng.');
      return;
    }

    const targetUser = ctx.getOption('user', 'user');
    const discordId = targetUser?.id || ctx.userId;
    const displayName = targetUser?.username || ctx.author.username;

    try {
      // Fetch recent history (all, to paginate)
      const recent = await prisma.musicHistory.findMany({
        where: { discordId, guildId },
        orderBy: { playedAt: 'desc' },
      });

      // Aggregate stats
      const stats = await prisma.musicHistory.aggregate({
        where: { discordId, guildId },
        _count: { id: true },
        _sum: { duration: true },
      });

      const totalTracks = stats._count.id || 0;
      const totalSeconds = stats._sum.duration || 0;

      // Top 5 most played artists
      const topArtists = await prisma.musicHistory.groupBy({
        by: ['artist'],
        where: { discordId, guildId },
        _count: { artist: true },
        orderBy: { _count: { artist: 'desc' } },
        take: 5,
      });

      // Build pagination
      const pages: EmbedBuilder[] = [];
      const itemsPerPage = 10;
      const totalPages = Math.ceil(recent.length / itemsPerPage) || 1;

      for (let p = 0; p < totalPages; p++) {
        const pageEmbed = new EmbedBuilder()
          .setColor(0x7c3aed)
          .setTitle(`🎵 Lịch sử nghe nhạc — ${displayName}`)
          .setTimestamp();

        // Only add stats and top artists to the first page
        if (p === 0) {
          pageEmbed.addFields({
            name: '📊 Thống kê',
            value:
              `🎶 Tổng số bài: **${totalTracks}**\n` +
              `⏱ Tổng thời gian: **${formatDuration(totalSeconds)}**\n` +
              `📅 Trung bình: **${totalTracks > 0 ? formatDuration(Math.floor(totalSeconds / totalTracks)) : '0:00'}** / bài`,
          });

          if (topArtists.length > 0) {
            const artistList = topArtists
              .map(
                (a: any, i: number) =>
                  `${i + 1}. **${a.artist}** (${a._count.artist} bài)`,
              )
              .join('\n');
            pageEmbed.addFields({
              name: '🎤 Nghệ sĩ yêu thích (Top 5)',
              value: artistList,
            });
          }
        }

        const chunk = recent.slice(p * itemsPerPage, (p + 1) * itemsPerPage);
        if (chunk.length > 0) {
          const recentList = chunk
            .map((r: any, i: number) => {
              const globalIdx = p * itemsPerPage + i + 1;
              const timeAgo = getTimeAgo(r.playedAt);
              const title =
                r.title.length > 35 ? r.title.slice(0, 32) + '...' : r.title;
              return `${globalIdx}. **${title}** — ${r.artist} (${timeAgo})`;
            })
            .join('\n');
          pageEmbed.addFields({
            name: p === 0 ? '📋 Phát gần đây' : '📋 Lịch sử tiếp theo',
            value: recentList,
          });
        } else if (p === 0) {
          pageEmbed.setDescription('Chưa có lịch sử nghe nhạc nào.');
        }

        pages.push(pageEmbed);
      }

      const msgOrInteraction = await ctx.defer();
      await paginate(msgOrInteraction, pages, ctx.userId);
    } catch (error: any) {
      console.error('[music_history] Error:', error);
      await ctx.editReply(
        `❌ Lỗi: ${error.message || 'Không thể lấy lịch sử.'}`,
      );
    }
  },
};

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'vừa xong';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} phút trước`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} giờ trước`;
  return `${Math.floor(seconds / 86400)} ngày trước`;
}

export default musicHistory;
