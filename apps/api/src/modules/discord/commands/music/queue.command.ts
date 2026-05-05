import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import { EmbedBuilder } from 'discord.js';
import { getQueueManager } from '../../services/music/queue-manager';
import { formatDuration } from '../../services/music/utils';
import { paginate } from '../../utils/pagination';

const queue: ActionCommand = {
  name: 'queue',
  description: 'Xem danh sách bài hát trong queue',
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

    const totalPages = Math.ceil(totalTracks / 10) || 1;
    const pages: EmbedBuilder[] = [];
    const totalDur = formatDuration(qm.totalDuration(guildId));
    const volume = qm.getVolume(guildId);

    for (let p = 1; p <= totalPages; p++) {
      const result = qm.getPage(guildId, p);
      const lines = result.tracks.map((t, i) => {
        const globalIdx = (result.page - 1) * 10 + i;
        const prefix =
          globalIdx === result.currentIndex ? '▶' : `${globalIdx + 1}.`;
        const dur = formatDuration(t.track.duration);
        const name =
          t.track.title.length > 40
            ? t.track.title.slice(0, 37) + '...'
            : t.track.title;
        return `${prefix} **${name}** — ${t.track.artist || 'Không rõ'} (${dur})`;
      });

      const embed = new EmbedBuilder()
        .setColor(0x7c3aed)
        .setTitle(`📋 Queue — ${result.total} bài (${totalDur})`)
        .setDescription(lines.join('\n'))
        .setFooter({ text: `🔊 ${volume}%` });
      pages.push(embed);
    }

    let startPage = (ctx.getOption('page', 'integer') as number) || 1;
    if (startPage < 1) startPage = 1;
    if (startPage > totalPages) startPage = totalPages;

    const msgOrInteraction = await ctx.defer();
    await paginate(msgOrInteraction, pages, ctx.userId, 60000, startPage - 1);
  },
};

export default queue;
