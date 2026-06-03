import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import { EmbedBuilder } from 'discord.js';
import { getQueueManager } from '../../services/music/queue-manager';
import { formatDuration } from '../../services/music/utils';
import { paginate } from '../../utils/pagination';
import { PAGE_SIZE } from '../../constants';

function buildRemainingEmbeds(guildId: string): {
  pages: EmbedBuilder[];
  totalPages: number;
} {
  const qm = getQueueManager();
  const volume = qm.getVolume(guildId);
  const pages: EmbedBuilder[] = [];

  // First, gather all remaining data
  const firstPage = qm.getRemainingPage(guildId, 1);
  const { currentTrack, totalRemaining, totalRemainingDuration } = firstPage;
  const totalPages = Math.ceil(totalRemaining / PAGE_SIZE) || 0;

  if (totalPages === 0) {
    // No remaining tracks — show just current track
    const embed = new EmbedBuilder().setColor(0x7c3aed);

    if (currentTrack) {
      const dur = formatDuration(currentTrack.track.duration);
      embed.setTitle('📋 Queue');
      embed.setDescription(
        `**▶ Đang phát:** ${currentTrack.track.title} — ${currentTrack.track.artist || 'Không rõ'} (${dur})\n\n` +
          '─'.repeat(20) +
          '\n📭 Không còn bài nào trong queue.',
      );
      embed.setFooter({
        text: `🔊 ${volume}% • Yêu cầu bởi ${currentTrack.requestedBy}`,
      });
    } else {
      embed.setDescription(
        '📋 Queue đang trống. Dùng `/play` để thêm bài nhé!',
      );
    }
    pages.push(embed);
    return { pages, totalPages: 1 };
  }

  // Build pages
  const remainingDuration = formatDuration(totalRemainingDuration);

  for (let p = 1; p <= totalPages; p++) {
    const { currentTrack: cur, tracks } = qm.getRemainingPage(guildId, p);

    const headerLines: string[] = [];
    if (cur) {
      const dur = formatDuration(cur.track.duration);
      headerLines.push(
        `**▶ ${cur.track.title}** — ${cur.track.artist || 'Không rõ'} (${dur})`,
      );
      headerLines.push('─'.repeat(20));
    }

    const trackLines = tracks.map((t, i) => {
      const globalNum = (p - 1) * PAGE_SIZE + i + 1;
      const dur = formatDuration(t.track.duration);
      const name =
        t.track.title.length > 40
          ? t.track.title.slice(0, 37) + '...'
          : t.track.title;
      return `**${globalNum}.** ${name} — ${t.track.artist || 'Không rõ'} (${dur})`;
    });

    const embed = new EmbedBuilder()
      .setColor(0x7c3aed)
      .setTitle(`📋 Queue — còn ${totalRemaining} bài (${remainingDuration})`)
      .setDescription([...headerLines, ...trackLines].join('\n'))
      .setFooter({
        text: `🔊 ${volume}% • Trang ${p}/${totalPages}`,
      });

    if (cur) {
      embed.setFooter({
        text: `🔊 ${volume}% • Trang ${p}/${totalPages} • Đang phát: ${cur.track.title.slice(0, 30)}`,
      });
    }

    pages.push(embed);
  }

  return { pages, totalPages };
}

const queue: ActionCommand = {
  name: 'queue',
  description: 'Xem danh sách bài hát đang chờ',
  category: 'music',
  optionalArgs: [
    {
      name: 'page',
      description: 'Số trang (mặc định: 1)',
      type: 'INTEGER',
      required: false,
      minValue: 1,
    },
  ],

  async execute(ctx: ContextAdapter) {
    const guildId = ctx.guildId;
    if (!guildId) return;

    const qm = getQueueManager();
    const totalTracks = qm.get(guildId)?.tracks.length || 0;
    if (totalTracks === 0) {
      await ctx.reply('📋 Queue đang trống. Dùng `/play` để thêm bài nhé!');
      return;
    }

    const { pages, totalPages } = buildRemainingEmbeds(guildId);

    let startPage = (ctx.getOption('page', 'integer') as number) || 1;
    if (startPage < 1) startPage = 1;
    if (startPage > totalPages) startPage = totalPages;

    const msgOrInteraction = await ctx.defer();
    await paginate(msgOrInteraction, pages, ctx.userId, 60000, startPage - 1);
  },
};

export default queue;
