import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import { getPlayerManager } from '../../services/music/player-manager';

const stop: ActionCommand = {
  name: 'stop',
  description: 'Dừng phát nhạc và xóa queue',
  category: 'music',

  async execute(ctx: ContextAdapter) {
    const guildId = ctx.guildId;
    if (!guildId) return;

    const pm = getPlayerManager();
    if (!pm.isConnected(guildId)) {
      await ctx.reply('❌ Bot không đang phát nhạc.');
      return;
    }

    pm.stop(guildId);
    await pm.deleteNowPlayingPublic(guildId);
    await ctx.reply('⏹️ Đã dừng phát nhạc và xóa queue.');
  },
};

export default stop;
