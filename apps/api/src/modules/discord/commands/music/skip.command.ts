import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import { getQueueManager } from '../../services/music/queue-manager';
import { getPlayerManager } from '../../services/music/player-manager';

const skip: ActionCommand = {
  name: 'skip',
  description: 'Bỏ qua bài hiện tại (hoặc N bài)',
  category: 'music',
  optionalArgs: [
    {
      name: 'n',
      description: 'Số bài muốn bỏ qua (mặc định: 1)',
      type: 'INTEGER',
      required: false,
      minValue: 1,
      maxValue: 50,
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

    const n = (ctx.getOption('n', 'integer') as number) || 1;
    const next = qm.skip(guildId, n);

    if (next) {
      await pm.play(guildId, ctx.client);
      await ctx.reply(
        `⏭️ Đã bỏ qua ${n} bài. Đang phát: **${next.track.title}**`,
      );
    } else {
      pm.stop(guildId);
      await ctx.reply(`⏭️ Đã bỏ qua ${n} bài. Hết queue rồi!`);
    }
  },
};

export default skip;
