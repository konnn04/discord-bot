import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import { getPlayerManager } from '../../services/music/player-manager';

const leave: ActionCommand = {
  name: 'leave',
  description: 'Rời kênh thoại và xóa queue',
  category: 'music',

  async execute(ctx: ContextAdapter) {
    const guildId = ctx.guildId;
    if (!guildId) return;

    const pm = getPlayerManager();
    if (!pm.isConnected(guildId)) {
      await ctx.reply('❌ Bot không ở trong kênh thoại nào.');
      return;
    }

    pm.leave(guildId);
    await ctx.reply('👋 Đã rời kênh thoại.');
  },
};

export default leave;
