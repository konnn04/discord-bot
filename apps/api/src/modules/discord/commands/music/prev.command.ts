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

    await pm.play(guildId, ctx.client);
    await ctx.reply(
      `⏮️ Đang phát lại: **${prevTrack.track.title}** — ${prevTrack.track.artist}`,
    );
  },
};

export default prev;
