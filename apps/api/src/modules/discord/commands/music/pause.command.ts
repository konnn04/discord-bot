import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import { getPlayerManager } from '../../services/music/player-manager';

const pause: ActionCommand = {
  name: 'pause',
  description: 'Tạm dừng / tiếp tục phát nhạc',
  category: 'music',

  async execute(ctx: ContextAdapter) {
    const guildId = ctx.guildId;
    if (!guildId) {
      await ctx.reply('❌ Lệnh này chỉ dùng được trong server.');
      return;
    }

    const pm = getPlayerManager();
    if (!pm.isConnected(guildId)) {
      await ctx.reply('❌ Bot không đang phát nhạc.');
      return;
    }

    if (pm.isPaused(guildId)) {
      pm.resume(guildId);
      await ctx.reply('▶️ Đã tiếp tục phát nhạc.');
    } else {
      pm.pause(guildId);
      await ctx.reply('⏸️ Đã tạm dừng nhạc.');
    }
  },
};

export default pause;
