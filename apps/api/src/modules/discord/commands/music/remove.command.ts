import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import { getQueueManager } from '../../services/music/queue-manager';
import { getPlayerManager } from '../../services/music/player-manager';

const remove: ActionCommand = {
  name: 'remove',
  description: 'Xóa bài khỏi hàng chờ theo vị trí',
  category: 'music',
  optionalArgs: [
    {
      name: 'position',
      description:
        'Vị trí bài trong hàng chờ (1 = bài kế tiếp, 2 = bài sau đó...)',
      type: 'INTEGER',
      required: true,
      minValue: 1,
      maxValue: 500,
    },
  ],

  async execute(ctx: ContextAdapter) {
    const guildId = ctx.guildId;
    if (!guildId) return;

    const pm = getPlayerManager();
    const qm = getQueueManager();

    if (!pm.isPlaying(guildId)) {
      await ctx.reply('❌ Không có bài nào đang phát.');
      return;
    }

    const queue = qm.get(guildId);
    if (!queue || queue.tracks.length <= 1) {
      await ctx.reply('❌ Hàng chờ trống, không có gì để xóa.');
      return;
    }

    const position = (ctx.getOption('position', 'integer') as number) || 1;
    const removed = qm.removeTrack(guildId, position);

    if (!removed) {
      await ctx.reply(`❌ Không tìm thấy bài ở vị trí **#${position}**.`);
      return;
    }

    await ctx.reply(
      `🗑️ Đã xóa **${removed.track.title}** (vị trí #${position}) khỏi hàng chờ.`,
    );
  },
};

export default remove;
