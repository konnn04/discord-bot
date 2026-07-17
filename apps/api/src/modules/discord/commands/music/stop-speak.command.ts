import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import { getSpeakManager } from '../../services/speak/speak-manager';

const stopSpeak: ActionCommand = {
  name: 'stop_speak',
  description: 'Dừng đọc chat và rời kênh thoại',
  category: 'music',

  async execute(ctx: ContextAdapter) {
    if (!ctx.guildId) {
      await ctx.reply('❌ Lệnh này chỉ dùng được trong server.');
      return;
    }

    const stopped = getSpeakManager().stop(ctx.guildId);
    if (stopped) {
      await ctx.reply('🔇 Đã dừng đọc chat.');
    } else {
      await ctx.reply('ℹ️ Không có phiên đọc chat nào đang chạy.');
    }
  },
};

export default stopSpeak;
