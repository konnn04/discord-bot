import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import { getQueueManager } from '../../services/music/queue-manager';
import { getPlayerManager } from '../../services/music/player-manager';

const prev: ActionCommand = {
  name: 'prev',
  description: 'Phát lại bài trước đó',
  category: 'music',

  async execute(ctx: ContextAdapter) {
    const guildId = ctx.guildId;
    if (!guildId) return;

    const pm = getPlayerManager();
    const qm = getQueueManager();

    if (!pm.isConnected(guildId)) {
      await ctx.reply('❌ Bot không đang phát nhạc.');
      return;
    }

    const prevTrack = qm.prev(guildId);
    if (!prevTrack) {
      await ctx.reply('❌ Không có bài trước đó.');
      return;
    }

    // Defer to avoid Discord's 3-second timeout for slash commands
    await ctx.defer();

    const result = await pm.playWithAutoSkip(guildId, ctx.client);

    if (result.success) {
      const current = qm.getCurrent(guildId);
      await ctx.reply(
        `⏮️ Đang phát: **${current?.track.title || prevTrack.track.title}** — ${current?.track.artist || prevTrack.track.artist}`,
      );
    } else {
      pm.stop(guildId);
      await pm.deleteNowPlayingPublic(guildId);
      await ctx.reply(
        `⚠️ Không thể phát bài trước đó${result.autoSkippedCount > 0 ? ` (đã tự động bỏ qua ${result.autoSkippedCount} bài lỗi)` : ''}.`,
      );
    }
  },
};

export default prev;
