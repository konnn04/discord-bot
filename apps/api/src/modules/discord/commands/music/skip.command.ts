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

    // Defer to avoid Discord's 3-second timeout for slash commands
    await ctx.defer();

    const n = (ctx.getOption('n', 'integer') as number) || 1;
    const next = qm.skip(guildId, n);

    if (next) {
      const result = await pm.playWithAutoSkip(guildId, ctx.client);

      if (result.success) {
        const nowPlaying = qm.getCurrent(guildId);
        const extraInfo =
          result.autoSkippedCount > 0
            ? ` (đã tự động bỏ qua ${result.autoSkippedCount} bài bị lỗi)`
            : '';
        await ctx.reply(
          `⏭️ Đã bỏ qua ${n} bài${extraInfo}. Đang phát: **${nowPlaying?.track.title || next.track.title}**`,
        );
      } else {
        pm.stop(guildId);
        await pm.deleteNowPlayingPublic(guildId);
        const extraInfo =
          result.autoSkippedCount > 0
            ? ` — đã tự động bỏ qua ${result.autoSkippedCount} bài bị lỗi`
            : '';
        await ctx.reply(
          `⚠️ Đã bỏ qua ${n} bài nhưng không thể phát bài tiếp theo${extraInfo}. Hết queue rồi!`,
        );
      }
    } else {
      pm.stop(guildId);
      await pm.deleteNowPlayingPublic(guildId);
      await ctx.reply(`⏭️ Đã bỏ qua ${n} bài. Hết queue rồi!`);
    }
  },
};

export default skip;
