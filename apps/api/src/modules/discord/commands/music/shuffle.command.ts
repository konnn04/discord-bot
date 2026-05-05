import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import { getQueueManager } from '../../services/music/queue-manager';
import { EmbedBuilder } from 'discord.js';

const shuffle: ActionCommand = {
  name: 'shuffle',
  description: 'Trộn ngẫu nhiên (xáo trộn) các bài hát còn lại trong Queue',
  category: 'music',

  async execute(ctx: ContextAdapter) {
    const guildId = ctx.guildId;
    if (!guildId) {
      await ctx.reply('❌ Lệnh này chỉ dùng trong server.');
      return;
    }

    const qm = getQueueManager();
    const success = qm.shuffle(guildId);

    if (!success) {
      await ctx.reply('❌ Không có đủ bài hát trong Queue để trộn.');
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x10b981)
      .setDescription('🔀 Đã trộn ngẫu nhiên các bài hát còn lại trong Queue!');

    await ctx.reply({ embeds: [embed] });
  },
};

export default shuffle;
